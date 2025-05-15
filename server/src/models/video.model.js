const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  roomId:      { type: String, required: true },
  driveFileId: { type: String, required: true },
  mimeType:    { type: String, required: true },
  size:        { type: Number, required: true },
  createdAt:   { type: Date,   default: Date.now },
});

const Video =  mongoose.model('Video', videoSchema);

module.exports = Video;