const express = require('express');
const { getNotifications, markAsRead } = require('../controllers/notification.controller');
const { userAuthMiddleware } = require('../middleware/userAuthMiddleware');

const router = express.Router();

router.get('/', userAuthMiddleware, getNotifications);
router.put('/:id/read', userAuthMiddleware, markAsRead);

module.exports = router;
