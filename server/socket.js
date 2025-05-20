// server/socket.js
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
