// utils/otp.js
const bcrypt = require('bcryptjs');

/**
 * Generate a random numeric OTP of given length.
 * @param {number} length 
 * @returns {string}
 */
function generateOTP(length = 6) {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
}

/**
 * Hashes the OTP using bcrypt.
 * @param {string} plainOtp 
 * @returns {Promise<string>}
 */
async function hashOtp(plainOtp) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainOtp, salt);
}

/**
 * Verifies a plain OTP against its bcrypt hash.
 * @param {string} plainOtp 
 * @param {string} hashedOtp 
 * @returns {Promise<boolean>}
 */
async function verifyOtp(plainOtp, hashedOtp) {
  return bcrypt.compare(plainOtp, hashedOtp);
}

module.exports = { generateOTP, hashOtp, verifyOtp };
