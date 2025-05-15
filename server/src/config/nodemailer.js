const nodemailer = require('nodemailer');
require('dotenv').config();

// you can drive these from .env
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST   || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT   || 465,
  secure: process.env.EMAIL_SECURE === 'true' || true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

module.exports = transporter;
