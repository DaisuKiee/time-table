const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  getRoomsByType,
  getAvailableRooms,
  getRoomStats
} = require('../controllers/room.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Validation middleware
const createRoomValidation = [
  body('roomCode')
    .trim()
    .notEmpty()
    .withMessage('Room code is required'),
  body('roomName')
    .trim()
    .notEmpty()
    .withMessage('Room name is required'),
  body('building')
    .trim()
    .notEmpty()
    .withMessage('Building is required'),
  body('floor')
    .isInt({ min: 1 })
    .withMessage('Floor must be a positive number'),
  body('roomType')
    .isIn(['Lecture Room', 'Laboratory', 'Computer Lab', 'Workshop', 'Auditorium', 'Conference Room'])
    .withMessage('Invalid room type'),
  body('capacity')
    .isInt({ min: 1, max: 200 })
    .withMessage('Capacity must be between 1 and 200')
];

// All routes require authentication
router.use(protect);

// Public room routes (all authenticated users)
router.get('/', getAllRooms);
router.get('/stats', getRoomStats);
router.get('/type/:roomType', getRoomsByType);
router.get('/available/:capacity', getAvailableRooms);
router.get('/:id', getRoomById);

// Admin/Scheduling Officer/Program Manager only routes
router.post('/', authorize('admin', 'scheduling_officer', 'program_manager'), createRoomValidation, createRoom);
router.put('/:id', authorize('admin', 'scheduling_officer', 'program_manager'), updateRoom);
router.delete('/:id', authorize('admin'), deleteRoom);

module.exports = router;
