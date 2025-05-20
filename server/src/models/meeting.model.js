// models/meeting.model.js
const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status:  { type: String, enum: ['Pending','Accepted','Declined'], default: 'Pending' },
  updatedAt: { type: Date, default: Date.now }
});

const meetingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  date: { type: Date,   required: true },
  participants: [participantSchema],
  link: { type: String }, 
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Meeting', meetingSchema);
