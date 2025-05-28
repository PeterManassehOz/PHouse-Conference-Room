const mongoose = require('mongoose');
const { Schema } = mongoose;

const participantSchema = new Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status:    { type: String, enum: ['Pending','Accepted','Declined'], default: 'Pending' },
  updatedAt: { type: Date, default: Date.now }
}, { _id: false });

const reactionSchema = new Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  emoji:     { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const meetingSchema = new Schema({
  title:        { type: String, required: true },
  description:  { type: String },
  date:         { type: Date, required: true },
  participants: [participantSchema],
  link:         { type: String },
  hostId:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reactions:    [reactionSchema],
  createdBy:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });


module.exports = mongoose.model('Meeting', meetingSchema);
