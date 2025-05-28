// middleware/uploadChatFileMiddleware.js
const multer = require('multer');
const path = require('path');

// storage engine (unchanged)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); 
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});

// new file filter
const fileFilter = (req, file, cb) => {
  // allowed MIME types
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/pdf',                                          // PDF
    'application/msword',                                       // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/epub+zip'                                      // EPUB
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Only JPEG, PNG, JPG, PDF, DOC, DOCX & EPUB files are allowed'
      ),
      false
    );
  }
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }  // optional: 20 MB limit
});
