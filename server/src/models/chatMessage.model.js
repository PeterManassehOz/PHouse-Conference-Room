const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', required: true },
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  text:      { type: String,                                  required: true },
  createdAt: { type: Date,     default: Date.now }
});

module.exports = mongoose.model('ChatMessage', chatSchema);
