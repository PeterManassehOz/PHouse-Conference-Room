const { getChatHistory, postChatMessage } = require('../controllers/chat.controller');

router.get('/:id/chat', userAuthMiddleware, getChatHistory);
router.post('/:id/chat', userAuthMiddleware, postChatMessage);
