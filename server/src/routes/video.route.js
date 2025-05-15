const express = require('express');
const multer = require('multer');
const { uploadVideo, listVideos, streamVideo } = require('../controllers/video.controller');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post(
  '/videos',
  upload.single('recording'),
  uploadVideo
);

router.get('/videos', listVideos);
router.get('/videos/:id/stream', streamVideo);

module.exports = router;
