const { Server } = require('socket.io');

let io;

function initializeSocket(server) {
  io = new Server(server, {
    cors: { origin: ['http://localhost:5173', 'http://localhost:5174'], methods: ['GET', 'POST'] }
  });

  io.on('connection', socket => {
    console.log('Client connected:', socket.id);

    // Allow a client to join its meeting rooms
    socket.on('join-meeting-room', ({ meetingId }) => {
      socket.join(meetingId);
    });

    socket.on('send-message', async ({ meetingId, text, userId, username }) => {
    // 1) Persist to DB
    const ChatMessage = require('./models/chatMessage.model');
    const msg = await ChatMessage.create({ meetingId, user: userId, text });
    // 2) enrich with sender name
    msg.user = { _id: userId, username };
    // 3) Broadcast
    io.to(meetingId).emit('receive-message', msg);
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





/*
// server/socket.js
const { Server } = require('socket.io');
const ChatMessage = require('./src/models/chatMessage.model');

let io;

function initializeSocket(server) {
  io = new Server(server, {
    cors: { origin: ['http://localhost:5173', 'http://localhost:5174'], methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join-meeting-room', ({ meetingId }) => {
      socket.join(meetingId);
      console.log(`Client ${socket.id} joined room: ${meetingId}`);
    });

    socket.on('send-message', async ({ meetingId, text, userId, username, image, tempId }) => {
      try {
        // 1) Persist to DB
        const msg = await ChatMessage.create({ meetingId, user: userId, text });
        await msg.populate('user', 'username image'); // Populate user with username and image
        const populatedMsg = msg.toObject();
        // 2) Enrich with sender data and tempId
        populatedMsg.user = { _id: userId, username, image }; // Ensure image is included
        populatedMsg.tempId = tempId; // Pass tempId for optimistic update matching
        // 3) Broadcast
        io.to(meetingId).emit('receive-message', populatedMsg);
      } catch (err) {
        console.error('Error saving message:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}

function getIO() {
  if (!io) {
    throw new Error('Socket.io is not initialized');
  }
  return io;
}

module.exports = { initializeSocket, getIO };
*/