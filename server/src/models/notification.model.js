// models/notification.model.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting' },
  message: { type: String, required: true },
  link: { type: String }, // Optional link (e.g., meeting link)
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});



module.exports = mongoose.model('Notification', notificationSchema);
