// controllers/chat.controller.js
const ChatMessage = require('../models/chatMessage.model');


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
