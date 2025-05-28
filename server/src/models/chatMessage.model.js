// models/chatMessage.model.js
const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  emoji:     { type: String, required: true },
  createdAt: { type: Date,   default: Date.now }
});

const chatSchema = new mongoose.Schema({
  meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', required: true },
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },

  // Either text *or* fileUrl (or both) must exist
  text:    { 
    type: String,
    required: function() { return !this.fileUrl; }  // only required if no file
  },

  fileUrl: { type: String },       // <— new
  fileName:{ type: String },       // <— optional, but useful

  reactions: [reactionSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ChatMessage', chatSchema);
