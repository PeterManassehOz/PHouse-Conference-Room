// server/index.js

// 1) Exception handlers
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// 2) Standard imports
const express = require('express');
const app = express();
const mongoose = require('mongoose');
require('dotenv').config();
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const { createWriteStream } = require('fs');
const { initializeSocket } = require('./socket');
const { createMediasoupWorkers } = require('./src/utils/mediasoupServer');

// 3) CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://p-house-conference-room.vercel.app',
  ];
  if (allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// 4) Logging, parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(morgan('combined', {
  stream: createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' })
}));
app.use('/uploads', express.static(path.join(__dirname, 'src/uploads')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 5) Routes
function safeRequireAndUse(basePath, routePath) {
  try {
    console.log('Trying to require:', routePath);
    const routes = require(routePath);
    console.log('Successfully required:', routePath);
    app.use(basePath, routes);
  } catch (err) {
    console.error(`❌ Error loading route from ${routePath}:`, err.message);
    console.error(err.stack);
  }
}
safeRequireAndUse('/auth', './src/routes/auth.route');
safeRequireAndUse('/users', './src/routes/users.route');
safeRequireAndUse('/recordings', './src/routes/video.route');
safeRequireAndUse('/meetings', './src/routes/meeting.route');
safeRequireAndUse('/notifications', './src/routes/notification.route');

// 6) Healthcheck
app.get('/', (_req, res) => res.send('PHouse Conference Room server is running!'));

// 7) MongoDB & Server Init
async function main() {
  await mongoose.connect(process.env.DB_URL);
  console.log('✔️ Connected to DB');
}

main()
  .then(() => {
    createMediasoupWorkers().then(() => {
      const server = app.listen(process.env.PORT, () => {
        console.log(`🚀 Server is listening on port ${process.env.PORT}`);
      });

      initializeSocket(server);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to connect to DB:', err);
  });
