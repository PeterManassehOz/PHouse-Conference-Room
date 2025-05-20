const User = require('../models/users.model');
const path = require('path'); // Import path module if not already imported
const jwt = require('jsonwebtoken');
const Meeting      = require('../models/meeting.model');
const Notification = require('../models/notification.model');
const Video        = require('../models/video.model');
const { google }   = require('googleapis');



// ———————— Google Drive setup ————————
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, '../../credentials.json'),
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});
const drive = google.drive({ version: 'v3', auth });



// @desc Get user profile
// @route GET /api/users/profile
// @access Private
exports.getUserProfile = async (req, res) => {
    const user = await User.findById(req.user.id).select('-password');

    if (user) {
        res.json(user);
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

// @desc Update user profile
// @route PUT /api/users/profile
// @access Private
exports.updateUserProfile = async (req, res) => {
    const user = await User.findById(req.user.id);

    if (user) {
        user.username = req.body.username || user.username;
        user.bio = req.body.bio || user.bio;
        user.phone = req.body.phone || user.phone;

        if (req.file) {
            user.image = req.file.path.replace(/\\/g, "/");
        }

        user.profileCompleted = true;
        await user.save();

        const token = jwt.sign(
            { id: user._id, isAdmin: user.isAdmin },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            message: 'Profile updated successfully',
            token, // Send token back in the response
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};



exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('_id name email');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Delete logged‑in user and all related data
// @route   DELETE /api/users/me
// @access  Private
exports.deleteUser = async (req, res) => {
  const userId = req.user.id;

  try {
    // 1) Remove meetings they created
    await Meeting.deleteMany({ createdBy: userId });

    // 2) Pull them out of any participant lists
    await Meeting.updateMany(
      { 'participants.user': userId },
      { $pull: { participants: { user: userId } } }
    );

    // 3) Wipe their notifications
    await Notification.deleteMany({ user: userId });

    // 4) Fetch all their videos → delete from Drive one by one
    const videos = await Video.find({ userId });
    await Promise.all(videos.map(async vid => {
      try {
        await drive.files.delete({ fileId: vid.driveFileId });
      } catch (err) {
        console.warn(`Could not delete Drive file ${vid.driveFileId}:`, err.message);
      }
    }));

    // 5) Remove video docs
    await Video.deleteMany({ userId });

    // 6) Finally delete the user record
    await User.findByIdAndDelete(userId);

    res.json({ message: 'Account, meetings, notifications, and videos deleted.' });
  } catch (err) {
    console.error('deleteUser error:', err);
    res.status(500).json({ message: 'Server error—could not delete account.' });
  }
};