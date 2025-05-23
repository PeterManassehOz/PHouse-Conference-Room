const { generateTokenPassword, verifyPasswordAndGenerateToken } = require('../utils/generateTokenPassword');
const User = require('../models/users.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendEmailOtp, checkEmailOtp } = require("../services/otp.service");
const transporter = require('../config/nodemailer');



const registerUser = async (req, res) => {
  try {
    const { firstname, lastname, email, password, confirmPassword, stateCode, gender } = req.body;

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (!/^[A-Z]{2,3}$/.test(stateCode)) {
      return res.status(400).json({ message: "Invalid state code" });
    }

    if (!['M', 'F'].includes(gender)) {
      return res.status(400).json({ message: "Gender must be 'M' or 'F'" });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already in use" });

    const year = new Date().getFullYear().toString().slice(-2); // e.g. "24"
    const stateYearPrefix = `${stateCode}${year}-${gender}`;

    // Count how many users already have this prefix
    const similarUsersCount = await User.countDocuments({
      phcode: { $regex: `^${stateYearPrefix}` },
    });

    const paddedIndex = String(similarUsersCount + 1).padStart(4, '0'); // e.g. "0001"

    const phcode = `${stateYearPrefix}${paddedIndex}`; // e.g. "ABJ24-M0001"

    const user = new User({
      firstname,
      lastname,
      email,
      phcode,
      gender,
      stateCode,
      emailVerified: false,
    });

    const { hashedPassword } = await generateTokenPassword(user, password);
    user.password = hashedPassword;
    await user.save();

    res.status(201).json({
      message: "Registered! Please verify your email.",
      needsVerification: true,
      nextStep: "verifyEmail",
      email: user.email,
      phcode: user.phcode,
      user,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};



const loginUser = async (req, res) => {
  try {
    const { phcode, password } = req.body;

    const user = await User.findOne({ phcode: phcode.toUpperCase() });
    if (!user) return res.status(400).json({ message: "Invalid phcode or password" });

     const { token } = await verifyPasswordAndGenerateToken(user, password);

    return res.status(200).json({
     message: "Login successful",
     token,
     user,
     email: user.email,
     phcode: user.phcode,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};



// =========================
// Verify Email OTP
// =========================
const verifyEmailOtp = async (req, res) => {
  const { email, emailOtp } = req.body;
  try {
    const user = await checkEmailOtp(email, emailOtp);
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.status(200).json({ message: "Email verified!", token, user });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// =========================
// Resend Email OTP
// =========================
const resendEmailOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    await sendEmailOtp(email);
    res.status(200).json({ message: "OTP sent to email." });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};




const resetUserPassword = async (req, res) => {
    try {
        const { phcode, password, confirmPassword } = req.body;
        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }

        const user = await User.findOne({ phcode });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const { hashedPassword } = await generateTokenPassword(user, password);
        user.password = hashedPassword;
        await user.save();

        res.status(200).json({ message: "Password reset successfully" });
 
    } catch (error) {
        return res.status(500).json({ message: "Server Error" });
    }
};



// 🔹 Request Password Reset (Generate Token)
const forgotPassword = async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });
  
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
  
      // Generate Reset Token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex"); // Hash the token
      const resetTokenExpires = Date.now() + 3600000; // Token expires in 1 hour
  
      // Store token in user model
      user.resetToken = hashedToken;
      user.resetTokenExpires = resetTokenExpires;
      await user.save();
  
      // Send email with reset link
      const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "Password Reset Request",
        html: `
          <p>You requested a password reset.</p>
          <p>Click the link below to reset your password:</p>
          <a href="${resetUrl}">${resetUrl}</a>
          <p>This link is valid for 1 hour.</p>
        `,
      };
  
      await transporter.sendMail(mailOptions);
      return res.status(200).json({ message: "Password reset email sent" });
    } catch (error) {
      console.error("Forgot Password Error:", error);
      return res.status(500).json({ message: "Server Error" });
    }
  };

// 🔹 Reset Password Using Token
const resetPasswordWithToken = async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;
    const { token } = req.params; // Extract token from URL

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // Hash the token before searching in DB
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find user with valid reset token
    const user = await User.findOne({
      resetToken: hashedToken,
      resetTokenExpires: { $gt: Date.now() }, // Check if token is still valid
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Clear reset token fields
    user.resetToken = null;
    user.resetTokenExpires = null;
    await user.save();

    return res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset Password Error:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};




const forgotPHCode = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User with this email does not exist' });

    const mailOptions = {
      from: process.env.EMAIL_USER, // Make sure this is set in your .env
      to: user.email,
      subject: 'Your PHCode',
      text: `Hello ${user.firstname},\n\nYour PHCode is: ${user.phcode}\n\nPlease keep it secure.`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'PHCode has been sent to your email' });
  } catch (err) {
    console.error('Error sending PHCode email:', err);
    res.status(500).json({ message: 'Failed to send PHCode. Please try again later.' });
  }
};


module.exports = { registerUser, loginUser, resetUserPassword, forgotPassword, resetPasswordWithToken, verifyEmailOtp, resendEmailOtp, forgotPHCode };