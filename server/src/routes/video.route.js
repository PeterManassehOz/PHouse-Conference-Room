const express = require('express');
const multer = require('multer');
const { uploadVideo, listVideos, streamVideo } = require('../controllers/video.controller');
const { userAuthMiddleware } = require('../middleware/userAuthMiddleware');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post(
  '/videos', userAuthMiddleware,
  upload.single('recording'),
  uploadVideo
);

router.get('/videos', userAuthMiddleware, listVideos);
router.get('/videos/:id/stream', userAuthMiddleware, streamVideo);

module.exports = router;
