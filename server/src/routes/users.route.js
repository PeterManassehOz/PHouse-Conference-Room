const express = require('express');
const { getUserProfile, updateUserProfile, getAllUsers, deleteUser, getUserSettings, updateUserSettings } = require('../controllers/users.controller');
const { userAuthMiddleware } = require('../middleware/userAuthMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.get('/profile', userAuthMiddleware, getUserProfile);
router.put('/profile', userAuthMiddleware, upload.single('image'), updateUserProfile);
router.get('/users', userAuthMiddleware, getAllUsers);
router.delete('/me', userAuthMiddleware, deleteUser);
router.get('/me/settings',   userAuthMiddleware, getUserSettings);
router.put('/me/settings',   userAuthMiddleware, updateUserSettings);

module.exports = router;
