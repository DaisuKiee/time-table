const mongoose = require('mongoose');

const ScheduleSchema = new mongoose.Schema({
  academicYear: {
    type: String,
    required: [true, 'Academic year is required'],
    trim: true
  },
  semester: {
    type: Number,
    required: [true, 'Semester is required'],
    enum: [1, 2]
  },
  program: {
    type: String,
    required: [true, 'Program is required'],
    enum: ['BSIT', 'BSHM', 'BIT-ET', 'BIT-CT', 'BIT-AT', 'BSFI', 'BSIE']
  },
  yearLevel: {
    type: Number,
    required: [true, 'Year level is required'],
    min: 1,
    max: 4
  },
  section: {
    type: String,
    required: [true, 'Section is required'],
    trim: true
  },
  sectionCode: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  shift: {
    type: String,
    required: [true, 'Shift/Schedule type is required'],
    enum: ['Day', 'Night'],
    default: 'Day'
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
    required: true
  },
  room: {
    type: String,
    required: [true, 'Room is required'],
    trim: true
  },
  timeSlots: [{
    day: {
      type: String,
      required: true,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    },
    startTime: {
      type: String,
      required: true
    },
    endTime: {
      type: String,
      required: true
    }
  }],
  maxStudents: {
    type: Number,
    default: 40,
    min: 1
  },
  enrolledStudents: {
    type: Number,
    default: 0,
    min: 0
  },
  classSpace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClassSpace'
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  generatedBy: {
    type: String,
    enum: ['manual', 'ai', 'constraint_solver'],
    default: 'manual'
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for faster queries
ScheduleSchema.index({ academicYear: 1, semester: 1, program: 1 });
ScheduleSchema.index({ sectionCode: 1 });
ScheduleSchema.index({ faculty: 1 });
ScheduleSchema.index({ subject: 1 });

module.exports = mongoose.model('Schedule', ScheduleSchema);
