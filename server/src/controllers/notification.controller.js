// controllers/notification.controller.js
const Notification = require('../models/notification.model');

// GET  /notifications?unread=true
exports.getNotifications = async (req, res) => {
  try {
    const filter = { user: req.user._id };
    if (req.query.unread === 'true') filter.read = false;

    const notes = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.json(notes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// POST /notifications/:id/read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const note = await Notification.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { read: true },
      { new: true }
    );
    if (!note) return res.status(404).json({ message: 'Notification not found' });
    res.json(note);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
