const express = require('express');
const { scheduleMeeting, getMyMeetings, getInvites, respondInvite, getUpcoming, deleteMeeting, startMeeting, joinMeeting } = require('../controllers/meeting.controller');
const router = express.Router();
const { userAuthMiddleware } = require('../middleware/userAuthMiddleware');
const { getChatHistory, postChatMessage, deleteChatMessage, updateChatMessage } = require('../controllers/chatMessage.controller');

router.post('/meetings', userAuthMiddleware, scheduleMeeting);
router.get('/meetings', userAuthMiddleware, getMyMeetings);
router.get    ('/invites',  userAuthMiddleware, getInvites);
router.put    ('/respond', userAuthMiddleware, respondInvite);
router.get    ('/upcoming', userAuthMiddleware, getUpcoming);
router.delete('/:id',  userAuthMiddleware, deleteMeeting);
router.post( '/start',userAuthMiddleware,startMeeting);
router.post('/:id/join', userAuthMiddleware, joinMeeting);
router.get('/:id/chat', userAuthMiddleware, getChatHistory);
router.post('/:id/chat', userAuthMiddleware, postChatMessage);
router.delete('/chat/:messageId', userAuthMiddleware, deleteChatMessage);
router.put('/chat/:messageId', userAuthMiddleware, updateChatMessage);

module.exports = router;
