const { Server } = require('socket.io');
const Meeting = require('./src/models/meeting.model');
const ChatMessage = require('./src/models/chatMessage.model');

let io;

function initializeSocket(server) {
  io = new Server(server, {
    cors: {
      origin: ['http://localhost:5173', 'http://localhost:5174'],
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', socket => {
    console.log('Client connected:', socket.id);

    // Allow a client to join its meeting rooms
    socket.on('join-meeting-room', ({ meetingId }) => {
      socket.join(meetingId);
    });

    socket.on('send-message', async ({ meetingId, text, userId, username, tempId }) => {
      try {
        const msg = await ChatMessage.create({ meetingId, user: userId, text, username });
        await msg.populate('user', 'username image');

        const out = {
          ...msg.toObject(),
          tempId,
        };

        io.to(meetingId).emit('receive-message', out);
      } catch (err) {
        console.error('❌ [socket.js] Error in send-message:', err);
        socket.emit('error-sending-message', { message: 'Failed to send message' });
      }
    });

    socket.on('react-to-meeting', async ({ meetingId, userId, emoji }) => {
      console.log('🔥 [socket.js] SERVER GOT react-to-meeting:', { meetingId, userId, emoji });

      try {
        const result = await Meeting.findByIdAndUpdate(
          meetingId,
          { $push: { reactions: { user: userId, emoji } } },
          { new: true }
        );

        console.log('✅ [socket.js] reaction persisted, new reactions count:', result.reactions.length);

        io.to(meetingId).emit('meeting-reaction', { userId, emoji, timestamp: Date.now() });
      } catch (err) {
        console.error('❌ [socket.js] Error in react-to-meeting:', err);
        socket.emit('error-meeting-reaction', { message: 'Failed to react to meeting' });
      }
    });

    socket.on('react-to-message', async ({ messageId, userId, emoji }) => {
      try {
        const msg = await ChatMessage.findByIdAndUpdate(
          messageId,
          { $push: { reactions: { user: userId, emoji } } },
          { new: true }
        )
          .populate('reactions.user', 'username image')
          .populate('user', 'username image');

        io.to(msg.meetingId.toString()).emit('message-reaction', msg);
      } catch (err) {
        console.error('❌ [socket.js] Error in react-to-message:', err);
        socket.emit('error-message-reaction', { message: 'Failed to react to message' });
      }
    });

    socket.on('leave-meeting-room', ({ meetingId }) => {
      socket.leave(meetingId);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}

// Getter for io after initialization
function getIO() {
  if (!io) {
    throw new Error("Socket.io is not initialized");
  }
  return io;
}

module.exports = { initializeSocket, getIO };



