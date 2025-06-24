const express = require('express');
const {
  scheduleMeeting,
  getMyMeetings,
  getInvites,
  respondInvite,
  getUpcoming,
  deleteMeeting,
  startMeeting,
  joinMeeting,
  getMeeting,
  leaveMeeting
} = require('../controllers/meeting.controller');

const { getChatHistory, deleteChatMessage, updateChatMessage, postChatFile } =
  require('../controllers/chatMessage.controller');

const { userAuthMiddleware } = require('../middleware/userAuthMiddleware');
const router = express.Router();

// All of these start with '/' (no leading/trailing space), and any “:id” or “:messageId” 
// is immediately followed by a valid identifier—so Path-to-RegExp won’t throw “Missing parameter name.”
router.post('/schedule', userAuthMiddleware, scheduleMeeting);
router.get('/my-meetings', userAuthMiddleware, getMyMeetings);
router.get('/invites', userAuthMiddleware, getInvites);
router.put('/respond', userAuthMiddleware, respondInvite);
router.get('/upcoming', userAuthMiddleware, getUpcoming);
router.delete('/:id', userAuthMiddleware, deleteMeeting);
router.post('/start', userAuthMiddleware, startMeeting);
router.post('/:id/join', userAuthMiddleware, joinMeeting);
router.get('/:id/chat', userAuthMiddleware, getChatHistory);
router.delete('/chat/:messageId', userAuthMiddleware, deleteChatMessage);
router.put('/chat/:messageId', userAuthMiddleware, updateChatMessage);
router.post('/:id/chat/file', userAuthMiddleware, postChatFile);
router.get('/:id', userAuthMiddleware, getMeeting);
router.post('/:id/leave', userAuthMiddleware, leaveMeeting);

module.exports = router;
