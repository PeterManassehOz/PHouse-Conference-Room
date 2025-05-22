// 1️⃣ Global exception handlers — place these first!
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  // Optionally: clean up, then exit or let a process manager restart you
  // process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Optionally: clean up, then exit or let a process manager restart you
  // process.exit(1);
});


const express = require('express');
const app = express();
const mongoose = require('mongoose');
require('dotenv').config();
const cors = require('cors');
const port = process.env.PORT;
const path = require("path");
const morgan = require('morgan');
const { createWriteStream } = require('fs');
const accessLogStream = createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });
const http = require('http');
const { initializeSocket } = require('./socket'); 






app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For form data (text fields)
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'], // Corrected the protocol
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(morgan('dev'));
app.use(morgan('combined', { stream: accessLogStream }));

app.use('/uploads', express.static(path.join(__dirname, 'src/uploads'))); // Serve static files from the uploads directory

const authRoutes = require('./src/routes/auth.route');
const userRoutes = require('./src/routes/users.route');
const videoRoutes = require('./src/routes/video.route');
const meetingRoutes = require('./src/routes/meeting.route');
const notificationRoutes = require('./src/routes/notification.route');


app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/recordings', videoRoutes);
app.use('/meetings', meetingRoutes);
app.use('/notifications', notificationRoutes);

async function main() {
  await mongoose.connect(process.env.DB_URL);
  console.log('Connected to DB');

  app.get('/', (req, res) => {
    res.send('PHouse Conference Room server is running!');
  });
}

main().then(() => console.log('Connected to DB')).catch(err => console.log(err));

const server = http.createServer(app); 
initializeSocket(server);

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});