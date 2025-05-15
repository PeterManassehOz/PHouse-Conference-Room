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
const Grid = require('gridfs-stream');





let gfs;
module.exports = { app, gfs };





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

app.use(express.json());
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/recordings', videoRoutes);

async function main() {
  await mongoose.connect(process.env.DB_URL);
  console.log('Connected to DB');


  const conn = mongoose.connection;
  conn.once('open', () => {
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('recordings');
  });


  app.get('/', (req, res) => {
    res.send('PHouse Conference Room server is running!');
  });
}

main().then(() => console.log('Connected to DB')).catch(err => console.log(err));

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
