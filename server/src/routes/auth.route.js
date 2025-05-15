const express = require('express');
const {  resetUserPassword, forgotPassword, resetPasswordWithToken, registerUser, loginUser, verifyEmailOtp, resendEmailOtp } = require('../controllers/auth.controller');

const router = express.Router();

router.post('/signup', registerUser);
router.post('/login', loginUser);
router.post('/verify-email-otp', verifyEmailOtp);
router.post('/resend-email-otp', resendEmailOtp);
router.post('/reset-password', resetUserPassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPasswordWithToken);


module.exports = router;
