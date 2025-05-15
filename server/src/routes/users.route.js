const express = require('express');
const { getUserProfile, updateUserProfile } = require('../controllers/users.controller');
const { userAuthMiddleware } = require('../middleware/userAuthMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.get('/profile', userAuthMiddleware, getUserProfile);
router.put('/profile', userAuthMiddleware, upload.single('image'), updateUserProfile);

module.exports = router;
