const { google } = require('googleapis');
const Video = require('../models/video.model');
const fs = require('fs');
const path = require('path');


//const credsPath = path.join(__dirname, '../../credentials.json');
//console.log('Looking for credentials at:', credsPath);

// initialize Google auth
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, '../../credentials.json'),
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});
const drive = google.drive({ version: 'v3', auth });

const uploadVideo = async (req, res) => {
  try {
    // multer has written the file to req.file.path
    const { path: filePath, mimetype, size } = req.file;
    const { roomId } = req.body;

    // upload to Drive
    const driveRes = await drive.files.create({
      requestBody: {
        name: `meeting_${roomId}_${Date.now()}`,
        mimeType: mimetype,
      },
      media: {
        mimeType: mimetype,
        body: fs.createReadStream(filePath),
      },
    });

    // save metadata to Mongo
    const videoDoc = await Video.create({
      roomId,
      driveFileId: driveRes.data.id,
      mimeType: mimetype,
      size,
      userId: req.user._id,
    });

    // clean up tmp file
    fs.unlinkSync(filePath);

    res.json(videoDoc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed' });
  }
};


// ◾ New: List all recordings’ metadata
const listVideos = async (req, res) => {
  try {
    const videos = await Video.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(videos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch recordings' });
  }
};

// ◾ New: Stream a recording’s binary from Drive
const streamVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video || !video.userId.equals(req.user._id)) {
      return res.status(404).json({ error: 'Not found or access denied' });
    }
    res.setHeader('Content-Type', video.mimeType);
    const driveRes = await drive.files.get(
      { fileId: video.driveFileId, alt: 'media' },
      { responseType: 'stream' }
    );
    driveRes.data.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Stream failed' });
  }
};


module.exports = { uploadVideo, listVideos, streamVideo };