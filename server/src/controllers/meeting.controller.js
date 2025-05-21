const mongoose = require('mongoose');
const Meeting = require('../models/meeting.model');
const User = require('../models/users.model');
const Notification = require('../models/notification.model');
const { getIO } = require('../../socket');
const transporter = require('../config/nodemailer');

// Helper: Schedule a callback at an absolute timestamp
function scheduleTimeout(ts, fn) {
  const delay = ts - Date.now();
  if (delay <= 0) return;
  setTimeout(fn, delay);
}

// Helper function to create notifications
async function createNotification(userId, meetingId, message, link) {
  return Notification.create({
    user: userId,
    meetingId,
    message,
    link
  });
}

// Function to notify both host and invitees
async function notifyParticipants(meeting, message, link) {
  const notificationPromises = [];

  // Notify the host with the host link
  const hostLink = `${link}?hostId=${meeting.hostId}`;
  console.log(`[Host Notification] Host Link: ${hostLink}`);
  notificationPromises.push(
    createNotification(meeting.hostId, meeting._id, message, hostLink)
  );

  // Notify all participants without the host flag
  meeting.participants.forEach((participant) => {
    const participantLink = `${link}`;
    console.log(`[Participant Notification] Participant Link: ${participantLink}`);
    notificationPromises.push(
      createNotification(participant.user, meeting._id, message, participantLink)
    );
  });

  try {
    await Promise.all(notificationPromises);
  } catch (err) {
    console.error('Failed to notify participants:', err);
  }
}


// Function to schedule notifications
function scheduleNotification(meeting) {
  const ms24h = 24 * 60 * 60 * 1000;
  const startTs = new Date(meeting.date).getTime();
  const liveLink = `${meeting.link}`; // Base link without hostId

  // 24-hour reminder
  scheduleTimeout(startTs - ms24h, async () => {
    console.log(`[Notification] 24-hour reminder for meeting ${meeting._id}`);
    await notifyParticipants(
      meeting,
      `Your meeting "${meeting.title}" starts in 24 hours.`,
      liveLink
    );
  });

  // Go-live notification
  scheduleTimeout(startTs, async () => {
    console.log(`[Notification] Go-live for meeting ${meeting._id}`);
    await notifyParticipants(meeting, `Meeting "${meeting.title}" is now live!`, liveLink);

    try {
      const io = getIO(); // ✅ Safely get the initialized io instance
      io.to(meeting._id.toString()).emit('meeting-notification', {
        meetingId: meeting._id,
        link: liveLink,
        message: `Meeting "${meeting.title}" is now live!`
      });
    } catch (err) {
      console.error('Socket.IO is not initialized:', err.message);
    }
  });
}



// controllers/meeting.controller.js
exports.startMeeting = async (req, res) => {
  try {
    // 1) Create a meeting with date=now and no participants
    const meeting = await Meeting.create({
      title:      req.body.title     || 'Instant Meeting',
      description:req.body.description || '',
      date:       new Date(),                 // start immediately
      participants: [],                       // nobody invited yet
      createdBy:  req.user._id,
      hostId:     req.user._id
    });

    // 2) Build front‑end link
    const apiHost     = `${req.protocol}://${req.get('host')}`;
    const frontend    = apiHost.replace(/:\d+$/, ':5173');
    meeting.link      = `${frontend}/room/${meeting._id}`;

    await meeting.save();

    // 3) (Optional) Notify via socket that host has started
    const io = getIO();
    io.to(meeting._id.toString()).emit('meeting-started', {
      meetingId: meeting._id,
      link:      meeting.link,
      message:   `Meeting "${meeting.title}" has started!`
    });

    // 4) Return minimal payload
    return res.status(201).json({
      meetingId: meeting._id,
      hostId:    meeting.hostId,
      link:      meeting.link,
      title:     meeting.title
    });
  } catch (err) {
    console.error('Error in startMeeting:', err);
    return res.status(500).json({ message: err.message });
  }
};



// controllers/meeting.controller.js
exports.joinMeeting = async (req, res) => {
  try {
    const meetingId = req.params.id;
    const userId    = req.user._id;

    // 1) Find meeting
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

    // 2) If user not already a participant, add them as “Accepted”
    const already = meeting.participants.some(p => p.user.equals(userId));
    if (!already) {
      meeting.participants.push({ user: userId, status: 'Accepted' });
      await meeting.save();
    }

    // 3) Return the updated meeting (or at least the participants array)
    res.json({ meetingId, participants: meeting.participants });
  } catch (err) {
    console.error('Error in joinMeeting:', err);
    res.status(500).json({ message: err.message });
  }
};



// Create Meeting Controller (Option A)
exports.scheduleMeeting = async (req, res) => {
  try {
    let { title, description, date, participants } = req.body;
    if (!Array.isArray(participants)) participants = [participants];

    // 1. Lookup users by their emails
    const users = await User.find({
      email: { $in: participants.map(e => e.toLowerCase()) }
    }).select('_id email');

    const foundEmails = users.map(u => u.email.toLowerCase());
    const missing = participants.filter(e => !foundEmails.includes(e.toLowerCase()));
    if (missing.length) {
      return res.status(400).json({
        message: `These emails are not registered: ${missing.join(', ')}`
      });
    }

    // 2. Format participants for the meeting
    const formattedParticipants = users.map(u => ({
      user: u._id,
      status: 'Pending'
    }));

    // 3. Create the meeting without the link first
    const meeting = await Meeting.create({
      title,
      description,
      date,
      participants: formattedParticipants,
      createdBy: req.user._id,
      hostId: req.user._id
    });

    // 4. Build the front-end room URL using the saved meeting ID
    const apiHost = `${req.protocol}://${req.get('host')}`; // e.g., "http://localhost:5000"
    const frontendHost = apiHost.replace(/:\d+$/, ':5173'); // swap port to front-end port
    meeting.link = `${frontendHost}/room/${meeting._id}`;

    // 5. Save the meeting again with the link
    await meeting.save();

    // 6. Schedule notifications
    scheduleNotification(meeting);

     // build an invite‑page URL for the email
     // (this points at your Home → Invite pane)
    const inviteUrl = `${frontendHost}/?view=invites`;

    // 7. Send email invites to each participant
      const mailPromises = users
      .filter(u => u.emailNotifications)  // ← only those opted in
      .map(u => transporter.sendMail({
          from: process.env.EMAIL_USER,
          to:   u.email,
          subject: `Invite: ${meeting.title}`,
           html: `
          <p>Hi ${meeting.u},</p>
          <p>You’ve been invited to a meeting titled "<strong>${meeting.title}</strong>" on ${new Date(meeting.date).toLocaleString()}.</p>
          <p>
            <a href="${inviteUrl}">
              Click here to view & accept your invitation
            </a>
          </p>
        `
      }));

     await Promise.all(mailPromises);


    // 8. Respond with the full meeting document
    return res.status(201).json(meeting);
  } catch (err) {
    console.error('Error in createMeeting:', err);
    return res.status(500).json({ message: err.message });
  }
};


// Get only meetings where the user is the creator OR is listed as a participant
exports.getMyMeetings = async (req, res) => {
  try {
    const userId = req.user._id;
    const meetings = await Meeting.find({
      $or: [
        { createdBy:    userId },
         { participants: { $elemMatch: { user: userId } } }
      ]
    }).sort({ date: 1 });
    res.status(200).json(meetings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// Update participant status (Accept/Decline)
exports.updateInviteStatus = async (req, res) => {
  try {
    const { meetingId, status } = req.body;
    const userId = req.user._id;

    const meeting = await Meeting.findOneAndUpdate(
      { _id: meetingId, "participants.user": userId },
      {
        $set: {
          "participants.$.status": status,
          "participants.$.updatedAt": new Date()
        }
      },
      { new: true }
    )
    .populate('createdBy', 'email')
    .populate('participants.user', 'email');

    if (!meeting) {
      return res.status(404).json({ message: "Meeting or user not found" });
    }

    res.json(meeting);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// 2️⃣ Get pending invites for this user
exports.getInvites = async (req, res) => {
  try {
    const userId = req.user._id;
    const invites = await Meeting.find({
      'participants.user': userId,
      'participants.status': 'Pending'
    })
    .populate('createdBy', 'name email')
    .sort({ date: 1 });
    res.json(invites);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// 3️⃣ Respond to an invite
exports.respondInvite = async (req, res) => {
  try {
    const { meetingId, status } = req.body;
    const userId = req.user._id;
    const meeting = await Meeting.findOneAndUpdate(
      { _id: meetingId, 'participants.user': userId },
      { $set: { 'participants.$.status': status } },
      { new: true }
    );
    if (!meeting) return res.status(404).json({ message: 'Invite not found' });
    res.json(meeting);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// 4️⃣ Get upcoming meetings for this user (created or accepted)
exports.getUpcoming = async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const meetings = await Meeting.find({
      date: { $gte: now },
      $or: [
        { createdBy: userId },
        { participants: { $elemMatch: { user: userId, status: 'Accepted' } } }
      ]
    })
    .populate([
      { path: 'createdBy',    select: 'name email' },
      { path: 'participants.user', select: 'email' }
    ]) 
    .sort({ date: 1 });
    res.json(meetings);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};


exports.deleteMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    // only creator may delete
    const meeting = await Meeting.findOneAndDelete({
      _id:        id,
      createdBy:  req.user._id
    });
    if (!meeting) {
      return res.status(404).json({ message: 'Not found or unauthorized' });
    }
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};