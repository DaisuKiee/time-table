const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  roomCode: {
    type: String,
    required: [true, 'Room code is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  roomName: {
    type: String,
    required: [true, 'Room name is required'],
    trim: true
  },
  building: {
    type: String,
    required: [true, 'Building is required'],
    trim: true
  },
  floor: {
    type: Number,
    required: true,
    min: 1
  },
  roomType: {
    type: String,
    required: [true, 'Room type is required'],
    enum: ['Lecture Room', 'Laboratory', 'Computer Lab', 'Workshop', 'Auditorium', 'Conference Room'],
  },
  capacity: {
    type: Number,
    required: [true, 'Capacity is required'],
    min: 1,
    max: 200
  },
  facilities: [{
    type: String,
    trim: true
  }],
  equipment: [{
    name: String,
    quantity: Number,
    condition: {
      type: String,
      enum: ['Excellent', 'Good', 'Fair', 'Poor', 'Broken'],
      default: 'Good'
    }
  }],
  isAirconditioned: {
    type: Boolean,
    default: false
  },
  hasProjector: {
    type: Boolean,
    default: false
  },
  hasWhiteboard: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  unavailableTimeSlots: [{
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    },
    startTime: String,
    endTime: String,
    reason: String
  }],
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for faster queries
RoomSchema.index({ building: 1, floor: 1 });
RoomSchema.index({ roomType: 1 });

module.exports = mongoose.model('Room', RoomSchema);
