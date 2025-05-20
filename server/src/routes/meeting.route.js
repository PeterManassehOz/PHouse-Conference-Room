const express = require('express');
const { scheduleMeeting, getMyMeetings, getInvites, respondInvite, getUpcoming, deleteMeeting, startMeeting, joinMeeting } = require('../controllers/meeting.controller');
const router = express.Router();
const { userAuthMiddleware } = require('../middleware/userAuthMiddleware');

router.post('/meetings', userAuthMiddleware, scheduleMeeting);
router.get('/meetings', userAuthMiddleware, getMyMeetings);
router.get    ('/invites',  userAuthMiddleware, getInvites);
router.put    ('/respond', userAuthMiddleware, respondInvite);
router.get    ('/upcoming', userAuthMiddleware, getUpcoming);
router.delete('/:id',  userAuthMiddleware, deleteMeeting);
router.post( '/start',userAuthMiddleware,startMeeting);
router.post('/:id/join', userAuthMiddleware, joinMeeting);

module.exports = router;
