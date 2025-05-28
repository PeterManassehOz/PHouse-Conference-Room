const ChatMessage = require('../models/chatMessage.model');
const upload = require('../middleware/uploadChatImageFileMiddleware');
const path = require('path');
const fsPromises = require('fs').promises;


// POST /meetings/:id/chat
exports.postChatMessage = async (req, res) => {
  const { id: meetingId } = req.params;
  const { text } = req.body;
  const userId = req.user._id;

  const newMessage = await ChatMessage.create({
    meetingId,
    user: userId,
    text
  });

  await newMessage.populate('user', 'username image');
  res.status(201).json(newMessage);
};


exports.getChatHistory = async (req, res) => {
  const { id: meetingId } = req.params;
  const msgs = await ChatMessage
    .find({ meetingId })
    .sort('createdAt')
    .populate('user', 'username image');
  res.json(msgs);
};

// DELETE /meetings/chat/:messageId
exports.deleteChatMessage = async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id;

  const message = await ChatMessage.findById(messageId);
  if (!message) return res.status(404).json({ error: 'Message not found' });

  if (!message.user.equals(userId)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
 console.log(`User ${userId} is trying to delete message ${messageId}`);

 if (message.deleted) {
  return res.status(400).json({ error: 'Already deleted' });
 }
  
if (message.fileUrl) {
  const filePath = path.join(__dirname, '../../uploads', path.basename(message.fileUrl));
  console.log('Checking file at:', filePath);
  try {
    await fsPromises.access(filePath);
    await fsPromises.unlink(filePath);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.warn('File already deleted:', filePath);
    } else {
      console.error('Error deleting file:', filePath, err);
    }
  }
}


  await ChatMessage.findByIdAndDelete(messageId);
  res.json({ message: 'Deleted successfully' });
};

// PUT /meetings/chat/:messageId
exports.updateChatMessage = async (req, res) => {
  const { messageId } = req.params;
  const { text } = req.body;
  const userId = req.user._id;

  const message = await ChatMessage.findById(messageId);
  if (!message) return res.status(404).json({ error: 'Message not found' });

  // Check if within 20 mins
  const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000);
  if (message.createdAt < twentyMinsAgo) {
    return res.status(403).json({ error: 'Edit window has expired' });
  }

  if (!message.user.equals(userId)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  message.text = text;
  await message.save();
  await message.populate('user', 'username image');

  res.json(message);
};



// in controllers/chat.controller.js
exports.postChatFile = [
  upload.single('file'),
  async (req, res) => {
    const { id: meetingId } = req.params;
    const userId = req.user._id;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const fileUrl  = `/uploads/${req.file.filename}`;
    const fileName = req.file.originalname;

    const newMessage = await ChatMessage.create({
      meetingId,
      user:     userId,
      text:     '',        // no actual text
      fileUrl,
      fileName
    });
    await newMessage.populate('user', 'username image');
    res.status(201).json(newMessage);
  }
];
