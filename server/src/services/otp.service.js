// services/otp.service.js
const User = require('../models/users.model');
const { generateOTP, hashOtp, verifyOtp } = require('../utils/otp');
const transporter = require('../config/nodemailer');

// — EMAIL OTP — 
async function sendEmailOtp(email) {
  const otpPlain = generateOTP(6);
  const otpHash  = await hashOtp(otpPlain);
  const expires  = Date.now() + 10 * 60 * 1000; // 10m

  const user = await User.findOne({ email });
  if (!user) throw new Error('User not found.');

  user.emailOtp        = otpHash;
  user.emailOtpExpires = new Date(expires);
  await user.save();

  await transporter.sendMail({
    to: email,
    subject: 'Your verification code',
    text: `Your one-time code is ${otpPlain}. It expires in 10 minutes.`,
  });
}

async function checkEmailOtp(email, emailOtp) {
  const user = await User.findOne({ email });
  if (!user) throw new Error('User not found.');
  if (!user.emailOtp || user.emailOtpExpires < Date.now()) throw new Error('OTP expired');

  const valid = await verifyOtp(emailOtp, user.emailOtp);
  if (!valid) throw new Error('Invalid OTP');

  user.emailVerified     = true;
  user.emailOtp          = undefined;
  user.emailOtpExpires   = undefined;
  await user.save();
  return user;
}

module.exports = {
  sendEmailOtp, checkEmailOtp,
};
