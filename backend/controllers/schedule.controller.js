const Schedule = require('../models/Schedule.model');
const Faculty = require('../models/Faculty.model');
const Subject = require('../models/Subject.model');
const Room = require('../models/Room.model');
const { validationResult } = require('express-validator');

// @desc    Get all schedules
// @route   GET /api/schedules
// @access  Private
exports.getAllSchedules = async (req, res) => {
  try {
    const { 
      academicYear, 
      semester, 
      program, 
      yearLevel,
      status,
      faculty,
      search
    } = req.query;

    // Build query
    let query = { isActive: true }; // Only show active schedules

    // ROLE-BASED FILTERING
    // Students: Only see schedules for their program, year level, and section
    if (req.user.role === 'student') {
      query.program = req.user.program;
      query.yearLevel = req.user.yearLevel;
      query.section = req.user.section;
      // Override any query params that students shouldn't be able to change
    }
    // Faculty: Only see schedules where they are assigned (handled by separate endpoint)
    // For general viewing, faculty can see all schedules (to coordinate with students)
    // Program Managers: Filter by their assigned program (handled by programAccess middleware)
    // Admin & Scheduling Officers: See all schedules
    else {
      // Apply filters from query params for authorized users
      if (academicYear) query.academicYear = academicYear;
      if (semester) query.semester = parseInt(semester);
      if (program) query.program = program;
      if (yearLevel) query.yearLevel = parseInt(yearLevel);
      if (status) query.status = status;
      if (faculty) query.faculty = faculty;

      if (search) {
        query.$or = [
          { sectionCode: { $regex: search, $options: 'i' } },
          { section: { $regex: search, $options: 'i' } }
        ];
      }
    }

    const schedules = await Schedule.find(query)
      .populate('subject', 'subjectCode subjectName units')
      .populate('faculty', 'employeeId')
      .populate({
        path: 'faculty',
        populate: {
          path: 'user',
          select: 'firstName lastName'
        }
      })
      .sort({ program: 1, yearLevel: 1, section: 1 });

    res.status(200).json({
      success: true,
      count: schedules.length,
      data: schedules
    });

  } catch (error) {
    console.error('Get all schedules error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching schedules',
      error: error.message
    });
  }
};

// @desc    Get schedule by ID
// @route   GET /api/schedules/:id
// @access  Private
exports.getScheduleById = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
      .populate('subject')
      .populate({
        path: 'faculty',
        populate: {
          path: 'user',
          select: 'firstName lastName middleName email'
        }
      })
      .populate('classSpace');

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    res.status(200).json({
      success: true,
      data: schedule
    });

  } catch (error) {
    console.error('Get schedule by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching schedule',
      error: error.message
    });
  }
};

// @desc    Create new schedule
// @route   POST /api/schedules
// @access  Private/Admin
exports.createSchedule = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      academicYear,
      semester,
      program,
      yearLevel,
      section,
      sectionCode,
      subject,
      faculty,
      room,
      timeSlots,
      maxStudents
    } = req.body;

    // Verify subject exists
    const subjectExists = await Subject.findById(subject);
    if (!subjectExists) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }

    // Verify faculty exists
    const facultyExists = await Faculty.findById(faculty);
    if (!facultyExists) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found'
      });
    }

    // Check for conflicts
    const conflicts = await checkScheduleConflicts({
      faculty,
      room,
      timeSlots,
      academicYear,
      semester
    });

    if (conflicts.hasConflict) {
      return res.status(400).json({
        success: false,
        message: 'Schedule conflicts detected',
        conflicts: conflicts.details
      });
    }

    // Create schedule
    const schedule = await Schedule.create({
      academicYear,
      semester,
      program,
      yearLevel,
      section,
      sectionCode,
      subject,
      faculty,
      room,
      timeSlots,
      maxStudents: maxStudents || 40,
      generatedBy: 'manual'
    });

    // Update faculty load
    const subjectUnits = subjectExists.units;
    await Faculty.findByIdAndUpdate(faculty, {
      $inc: { currentLoad: subjectUnits }
    });

    await schedule.populate([
      { path: 'subject', select: 'subjectCode subjectName units' },
      { path: 'faculty', populate: { path: 'user', select: 'firstName lastName' } }
    ]);

    res.status(201).json({
      success: true,
      message: 'Schedule created successfully',
      data: schedule
    });

  } catch (error) {
    console.error('Create schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating schedule',
      error: error.message
    });
  }
};

// @desc    Update schedule
// @route   PUT /api/schedules/:id
// @access  Private/Admin
exports.updateSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    const {
      faculty,
      room,
      timeSlots,
      maxStudents,
      status,
      notes
    } = req.body;

    // If changing faculty or time slots, check for conflicts
    if ((faculty && faculty !== schedule.faculty.toString()) || timeSlots) {
      const conflicts = await checkScheduleConflicts({
        faculty: faculty || schedule.faculty,
        room: room || schedule.room,
        timeSlots: timeSlots || schedule.timeSlots,
        academicYear: schedule.academicYear,
        semester: schedule.semester,
        excludeScheduleId: schedule._id
      });

      if (conflicts.hasConflict) {
        return res.status(400).json({
          success: false,
          message: 'Schedule conflicts detected',
          conflicts: conflicts.details
        });
      }
    }

    // Update faculty load if faculty changed
    if (faculty && faculty !== schedule.faculty.toString()) {
      const subjectData = await Subject.findById(schedule.subject);
      const units = subjectData.units;

      // Decrease old faculty load
      await Faculty.findByIdAndUpdate(schedule.faculty, {
        $inc: { currentLoad: -units }
      });

      // Increase new faculty load
      await Faculty.findByIdAndUpdate(faculty, {
        $inc: { currentLoad: units }
      });

      schedule.faculty = faculty;
    }

    // Update other fields
    if (room) schedule.room = room;
    if (timeSlots) schedule.timeSlots = timeSlots;
    if (maxStudents !== undefined) schedule.maxStudents = maxStudents;
    if (status) schedule.status = status;
    if (notes !== undefined) schedule.notes = notes;

    await schedule.save();
    await schedule.populate([
      { path: 'subject', select: 'subjectCode subjectName units' },
      { path: 'faculty', populate: { path: 'user', select: 'firstName lastName' } }
    ]);

    res.status(200).json({
      success: true,
      message: 'Schedule updated successfully',
      data: schedule
    });

  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating schedule',
      error: error.message
    });
  }
};

// @desc    Delete schedule
// @route   DELETE /api/schedules/:id
// @access  Private/Admin
exports.deleteSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
      .populate('subject', 'units');

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    // Decrease faculty load
    await Faculty.findByIdAndUpdate(schedule.faculty, {
      $inc: { currentLoad: -schedule.subject.units }
    });

    // Soft delete
    schedule.isActive = false;
    await schedule.save();

    res.status(200).json({
      success: true,
      message: 'Schedule deleted successfully'
    });

  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting schedule',
      error: error.message
    });
  }
};

// Helper function to check schedule conflicts
async function checkScheduleConflicts({
  faculty,
  room,
  timeSlots,
  academicYear,
  semester,
  excludeScheduleId = null
}) {
  const conflicts = {
    hasConflict: false,
    details: []
  };

  // Build base query
  let query = {
    academicYear,
    semester,
    isActive: true
  };

  if (excludeScheduleId) {
    query._id = { $ne: excludeScheduleId };
  }

  // Get all schedules for the same semester
  const existingSchedules = await Schedule.find(query)
    .populate('faculty', 'employeeId')
    .populate({
      path: 'faculty',
      populate: { path: 'user', select: 'firstName lastName' }
    });

  // Check each time slot for conflicts
  for (const newSlot of timeSlots) {
    for (const existingSchedule of existingSchedules) {
      for (const existingSlot of existingSchedule.timeSlots) {
        // Same day check
        if (newSlot.day === existingSlot.day) {
          const hasTimeOverlap = checkTimeOverlap(
            newSlot.startTime,
            newSlot.endTime,
            existingSlot.startTime,
            existingSlot.endTime
          );

          if (hasTimeOverlap) {
            // Faculty conflict
            if (faculty && existingSchedule.faculty._id.toString() === faculty.toString()) {
              conflicts.hasConflict = true;
              conflicts.details.push({
                type: 'faculty',
                message: `Faculty ${existingSchedule.faculty.user.firstName} ${existingSchedule.faculty.user.lastName} is already scheduled`,
                day: newSlot.day,
                time: `${existingSlot.startTime} - ${existingSlot.endTime}`,
                conflictingSchedule: existingSchedule.sectionCode
              });
            }

            // Room conflict
            if (room && existingSchedule.room === room) {
              conflicts.hasConflict = true;
              conflicts.details.push({
                type: 'room',
                message: `Room ${room} is already occupied`,
                day: newSlot.day,
                time: `${existingSlot.startTime} - ${existingSlot.endTime}`,
                conflictingSchedule: existingSchedule.sectionCode
              });
            }
          }
        }
      }
    }
  }

  return conflicts;
}

// Helper function to check time overlap
function checkTimeOverlap(start1, end1, start2, end2) {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);

  return (s1 < e2 && e1 > s2);
}

// Helper function to convert time string to minutes
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// @desc    Get schedules by program and year
// @route   GET /api/schedules/program/:program/:yearLevel
// @access  Private
exports.getSchedulesByProgramAndYear = async (req, res) => {
  try {
    const { program, yearLevel } = req.params;
    const { academicYear, semester } = req.query;

    const query = {
      program,
      yearLevel: parseInt(yearLevel),
      isActive: true
    };

    // STUDENT FILTERING: Students can only see their own section
    if (req.user.role === 'student') {
      // Verify the requested program and year match the student's
      if (program !== req.user.program || parseInt(yearLevel) !== req.user.yearLevel) {
        return res.status(403).json({
          success: false,
          message: 'You can only view schedules for your program and year level'
        });
      }
      query.section = req.user.section;
    }

    if (academicYear) query.academicYear = academicYear;
    if (semester) query.semester = parseInt(semester);

    const schedules = await Schedule.find(query)
      .populate('subject', 'subjectCode subjectName units')
      .populate({
        path: 'faculty',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .sort({ section: 1 });

    res.status(200).json({
      success: true,
      count: schedules.length,
      data: schedules
    });

  } catch (error) {
    console.error('Get schedules by program error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching schedules',
      error: error.message
    });
  }
};

// @desc    Get faculty schedule
// @route   GET /api/schedules/faculty/:facultyId
// @access  Private
exports.getFacultySchedule = async (req, res) => {
  try {
    const { facultyId } = req.params;
    const { academicYear, semester } = req.query;

    const query = {
      faculty: facultyId,
      isActive: true
    };

    if (academicYear) query.academicYear = academicYear;
    if (semester) query.semester = parseInt(semester);

    const schedules = await Schedule.find(query)
      .populate('subject', 'subjectCode subjectName units')
      .sort({ 'timeSlots.day': 1 });

    res.status(200).json({
      success: true,
      count: schedules.length,
      data: schedules
    });

  } catch (error) {
    console.error('Get faculty schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching faculty schedule',
      error: error.message
    });
  }
};

// @desc    Check for conflicts
// @route   POST /api/schedules/check-conflicts
// @access  Private
exports.checkConflicts = async (req, res) => {
  try {
    const { faculty, room, timeSlots, academicYear, semester, program, yearLevel } = req.body;

    // Check if this is a batch check (by program/year) or single schedule check
    if (program && semester && academicYear && !timeSlots) {
      // Batch conflict check for all schedules in program/year/semester
      const query = {
        semester,
        academicYear,
        isActive: true
      };
      
      if (program) query.program = program;
      if (yearLevel) query.yearLevel = yearLevel;
      
      const schedules = await Schedule.find(query)
        .populate('faculty', 'employeeId')
        .populate({ path: 'faculty', populate: { path: 'user', select: 'firstName lastName' } });

      const allConflicts = [];

      // Check each pair of schedules for conflicts
      for (let i = 0; i < schedules.length; i++) {
        for (let j = i + 1; j < schedules.length; j++) {
          const schedule1 = schedules[i];
          const schedule2 = schedules[j];

          // Check for conflicts between these two schedules
          for (const slot1 of schedule1.timeSlots) {
            for (const slot2 of schedule2.timeSlots) {
              if (slot1.day === slot2.day) {
                const overlap = checkTimeOverlap(
                  slot1.startTime,
                  slot1.endTime,
                  slot2.startTime,
                  slot2.endTime
                );

                if (overlap) {
                  // Faculty conflict
                  if (schedule1.faculty && schedule2.faculty &&
                      schedule1.faculty._id.toString() === schedule2.faculty._id.toString()) {
                    allConflicts.push({
                      type: 'faculty',
                      message: `Faculty ${schedule1.faculty.user?.firstName || ''} ${schedule1.faculty.user?.lastName || ''} has overlapping classes`,
                      day: slot1.day,
                      time: `${slot1.startTime} - ${slot1.endTime}`,
                      schedule1: schedule1.sectionCode,
                      schedule2: schedule2.sectionCode
                    });
                  }

                  // Room conflict
                  if (schedule1.room && schedule2.room && schedule1.room === schedule2.room) {
                    allConflicts.push({
                      type: 'room',
                      message: `Room ${schedule1.room} is double-booked`,
                      day: slot1.day,
                      time: `${slot1.startTime} - ${slot1.endTime}`,
                      schedule1: schedule1.sectionCode,
                      schedule2: schedule2.sectionCode
                    });
                  }
                }
              }
            }
          }
        }
      }

      return res.status(200).json({
        success: true,
        hasConflict: allConflicts.length > 0,
        conflicts: allConflicts
      });
    }

    // Single schedule conflict check (original behavior)
    // Validate required fields for single mode
    if (!timeSlots || !Array.isArray(timeSlots) || timeSlots.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'timeSlots array is required for single schedule conflict check'
      });
    }

    const conflicts = await checkScheduleConflicts({
      faculty,
      room,
      timeSlots,
      academicYear,
      semester
    });

    res.status(200).json({
      success: true,
      hasConflict: conflicts.hasConflict,
      conflicts: conflicts.details
    });

  } catch (error) {
    console.error('Check conflicts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking conflicts',
      error: error.message
    });
  }
};

// @desc    Publish schedule
// @route   PUT /api/schedules/:id/publish
// @access  Private/Admin
exports.publishSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    schedule.status = 'published';
    await schedule.save();

    res.status(200).json({
      success: true,
      message: 'Schedule published successfully',
      data: schedule
    });

  } catch (error) {
    console.error('Publish schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Error publishing schedule',
      error: error.message
    });
  }
};

// @desc    Batch publish schedules (publish all for a program/year/semester)
// @route   POST /api/schedules/publish
// @access  Private/Admin
exports.batchPublishSchedules = async (req, res) => {
  try {
    const { program, yearLevel, semester, academicYear } = req.body;

    if (!program || !yearLevel || !semester || !academicYear) {
      return res.status(400).json({
        success: false,
        message: 'Program, year level, semester, and academic year are required'
      });
    }

    // Update all matching schedules to published
    const result = await Schedule.updateMany(
      {
        program,
        yearLevel,
        semester,
        academicYear,
        isActive: true
      },
      {
        $set: { status: 'published' }
      }
    );

    res.status(200).json({
      success: true,
      message: `Published ${result.modifiedCount} schedule(s) successfully`,
      count: result.modifiedCount
    });

  } catch (error) {
    console.error('Batch publish error:', error);
    res.status(500).json({
      success: false,
      message: 'Error publishing schedules',
      error: error.message
    });
  }
};

// @desc    Generate schedule automatically
// @route   POST /api/schedules/generate
// @access  Private/Admin
exports.generateSchedule = async (req, res) => {
  try {
    const { 
      academicYear, 
      semester, 
      program, 
      yearLevel, 
      section,            // Single section identifier (e.g., 'A', 'B', 'C')
      method = 'greedy',  // 'greedy' or 'ortools'
      shift = 'Day',      // 'Day' or 'Night'
      timeLimit = 60      // seconds for OR-Tools
    } = req.body;

    if (!academicYear || !semester || !program || !yearLevel || !section) {
      return res.status(400).json({
        success: false,
        message: 'Academic year, semester, program, year level, and section are required'
      });
    }

    let result;

    // Choose generation method
    if (method === 'ortools') {
      // Use Google OR-Tools constraint solver
      const { generateWithORTools } = require('../services/ortoolsBridge.service');
      
      result = await generateWithORTools({
        academicYear,
        semester,
        program,
        yearLevel,
        section,
        shift,
        timeLimit
      });

      // If OR-Tools succeeded, save the schedules
      if (result.success && result.schedules) {
        const savedSchedules = [];
        const errors = [];

        for (const scheduleData of result.schedules) {
          try {
            const schedule = await Schedule.create(scheduleData);
            savedSchedules.push(schedule);

            // Update faculty load
            if (scheduleData.faculty) {
              const subject = await Subject.findById(scheduleData.subject);
              if (subject) {
                await Faculty.findByIdAndUpdate(scheduleData.faculty, {
                  $inc: { currentLoad: subject.units }
                });
              }
            }
          } catch (error) {
            errors.push({
              subject: scheduleData.metadata?.subjectCode || 'Unknown',
              error: error.message
            });
          }
        }

        result.savedSchedules = savedSchedules;
        result.saveErrors = errors;
      }

    } else {
      // Use greedy algorithm
      const { generateScheduleForProgram } = require('../services/scheduleGenerator.service');

      result = await generateScheduleForProgram({
        academicYear,
        semester,
        program,
        yearLevel,
        section
      });
    }

    res.status(200).json({
      success: result.success,
      message: result.message || (result.success ? 'Schedule generated successfully' : 'Schedule generation failed'),
      method: method === 'ortools' ? 'Google OR-Tools CP-SAT' : 'Greedy Algorithm',
      data: result
    });

  } catch (error) {
    console.error('Generate schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating schedule',
      error: error.message
    });
  }
};

// @desc    Check OR-Tools availability
// @route   GET /api/schedules/ortools-status
// @access  Private/Admin
exports.checkORToolsStatus = async (req, res) => {
  try {
    const { checkORToolsAvailability } = require('../services/ortoolsBridge.service');
    
    const status = await checkORToolsAvailability();
    
    res.status(200).json({
      success: true,
      ortools: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking OR-Tools status',
      error: error.message
    });
  }
};
