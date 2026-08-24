const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const multer = require('multer');
const path = require('path');
const {
  getAllClassSpaces,
  getClassSpaceById,
  createClassSpace,
  updateClassSpace,
  deleteClassSpace,
  postAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  uploadMaterial,
  deleteMaterial,
  enrollStudent,
  unenrollStudent,
  getClassSpaceByCode,
  getMyClassSpaces
} = require('../controllers/classSpace.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_PATH || './uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 // 10MB default
  },
  fileFilter: (req, file, cb) => {
    // Allow common document types
    const allowedTypes = /pdf|doc|docx|ppt|pptx|xls|xlsx|txt|zip|rar/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Invalid file type. Only documents are allowed.'));
  }
});

// All routes require authentication
router.use(protect);

// Public class space routes (authenticated users)
router.get('/', getAllClassSpaces);
router.get('/my-classes', getMyClassSpaces);
router.get('/code/:sectionCode', getClassSpaceByCode);
router.get('/:id', getClassSpaceById);

// Student enrollment
router.post('/:id/enroll', enrollStudent);
router.post('/:id/unenroll', unenrollStudent);

// Admin/Program Manager routes
router.post('/', authorize('admin', 'scheduling_officer', 'program_manager'), createClassSpace);
router.put('/:id', authorize('admin', 'scheduling_officer', 'program_manager', 'faculty'), updateClassSpace);
router.delete('/:id', authorize('admin'), deleteClassSpace);

// Announcement routes (Faculty and Program Managers can post to their classes)
router.post('/:id/announcements', authorize('admin', 'scheduling_officer', 'program_manager', 'faculty'), 
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('content').trim().notEmpty().withMessage('Content is required')
  ],
  postAnnouncement
);
router.put('/:id/announcements/:announcementId', authorize('admin', 'scheduling_officer', 'program_manager', 'faculty'), updateAnnouncement);
router.delete('/:id/announcements/:announcementId', authorize('admin', 'scheduling_officer', 'program_manager', 'faculty'), deleteAnnouncement);

// Material routes (Faculty and Program Managers can upload to their classes)
router.post('/:id/materials', authorize('admin', 'scheduling_officer', 'program_manager', 'faculty'),
  upload.single('file'),
  uploadMaterial
);
router.delete('/:id/materials/:materialId', authorize('admin', 'scheduling_officer', 'program_manager', 'faculty'), deleteMaterial);

module.exports = router;
