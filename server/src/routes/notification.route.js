const express = require('express');
const { getNotifications, markAsRead } = require('../controllers/notification.controller');
const router = express.Router();
const { userAuthMiddleware } = require('../middleware/userAuthMiddleware');

router.get('/', userAuthMiddleware, getNotifications);
router.put('/:id/read', userAuthMiddleware, markAsRead);

module.exports = router;