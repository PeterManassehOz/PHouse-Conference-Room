const { Server } = require('socket.io');
const Meeting = require('./src/models/meeting.model');
const ChatMessage = require('./src/models/chatMessage.model');

let io;

function initializeSocket(server) {
  const userSocketMap = new Map();
  const userNameMap = new Map();

  console.log('Initializing Socket.io...');
  io = new Server(server, {
    cors: {
      origin: ['http://localhost:5173', 'http://localhost:5174'],
      methods: ['GET', 'POST']
    }
  });

  function forwardToUser(eventName, { roomId, to, ...payload }) {
    const targetSocket = userSocketMap.get(to);
    if (targetSocket) {
      io.to(targetSocket).emit(eventName, payload);
    }
  }

  io.on('connection', socket => {
    console.log('Client connected:', socket.id);

    socket.on('join-meeting-room', ({ meetingId, userId, username }) => {
      console.log('← join-meeting-room', { meetingId, userId, username });
      if (!userId || !username) {
        console.warn('⚠️ Ignoring invalid join:', { meetingId, userId, username });
        return;
      }

      userSocketMap.set(userId, socket.id);
      userNameMap.set(userId, username);
      socket.join(meetingId);

      socket.to(meetingId).emit('user-joined-meeting', {
        userId,
        username,
        timestamp: Date.now()
      });

      const existing = [];
      for (const [otherId, sid] of userSocketMap.entries()) {
        if (otherId === userId) continue;
        const s = io.sockets.sockets.get(sid);
        if (s && s.rooms.has(meetingId)) {
          existing.push({
            userId: otherId,
            username: userNameMap.get(otherId)
          });
        }
      }

      socket.emit('existing-peers', existing);
      console.log('→ server → existing-peers:', existing);
    });

    // 🧠 WebRTC signaling logic – placed here for relevance
    socket.on('offer', data => {
      console.log('← offer', data);
      forwardToUser('offer', data);
    });

    socket.on('answer', data => {
      console.log('← answer', data);
      forwardToUser('answer', data);
    });

    socket.on('ice-candidate', data => {
      console.log('← ice-candidate', data);
      forwardToUser('ice-candidate', data);
    });

    socket.on('get-peers', async (meetingId) => {
      const members = Array.from(userSocketMap.entries())
        .filter(([uid, sid]) => sid !== socket.id && io.sockets.sockets.get(sid)?.rooms.has(meetingId))
        .map(([uid]) => uid);
      socket.emit('existing-peers', members);
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
          [
            {
              $set: {
                reactions: {
                  $concatArrays: [
                    {
                      $filter: {
                        input: '$reactions',
                        cond: { $ne: ['$$this.user', userId] }
                      }
                    },
                    [{ user: userId, emoji }]
                  ]
                }
              }
            }
          ],
          { new: true }
        )
        .populate('reactions.user', 'username image')
        .populate('user', 'username image');

        if (!msg) return;
        io.to(msg.meetingId.toString()).emit('message-reaction', msg);
      } catch (err) {
        console.error('❌ [socket.js] Error in react-to-message:', err);
        socket.emit('error-message-reaction', { message: 'Failed to react to message' });
      }
    });

    socket.on('leave-meeting-room', ({ meetingId, userId, username }) => {
      socket.leave(meetingId);

      io.to(meetingId).emit('user-left-meeting', {
        userId,
        username,
        timestamp: Date.now()
      });
    });

    socket.on('disconnect', () => {
      for (const [userId, sid] of userSocketMap) {
        if (sid === socket.id) {
          userSocketMap.delete(userId);
          userNameMap.delete(userId);
          break;
        }
      }
      console.log('Client disconnected:', socket.id);
    });
  });
}

function getIO() {
  if (!io) {
    throw new Error("Socket.io is not initialized");
  }
  return io;
}

module.exports = { initializeSocket, getIO };

