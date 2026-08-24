/**
 * Schedule Generator Service
 * 
 * This service handles automated schedule generation using constraint satisfaction
 * It will integrate with Google OR-Tools via Python bridge for complex optimization
 * 
 * For now, implements a greedy algorithm as a foundation
 * Will be enhanced with OR-Tools in the next phase
 */

const Subject = require('../models/Subject.model');
const Faculty = require('../models/Faculty.model');
const Room = require('../models/Room.model');
const Schedule = require('../models/Schedule.model');

/**
 * Generate schedule for a program and year level
 * @param {Object} params - Generation parameters
 * @returns {Object} Generated schedules and statistics
 */
async function generateScheduleForProgram(params) {
  const {
    academicYear,
    semester,
    program,
    yearLevel,
    section,  // Single section identifier (e.g., 'A', 'B', 'C')
    shift = 'Day'  // Default to Day shift if not specified
  } = params;

  const results = {
    success: [],
    failed: [],
    conflicts: [],
    statistics: {
      totalSubjects: 0,
      scheduledSubjects: 0,
      failedSubjects: 0,
      conflictsDetected: 0
    }
  };

  try {
    // Step 1: Get all subjects for this program/year/semester
    const subjects = await Subject.find({
      program,
      yearLevel,
      semester,
      isActive: true
    }).populate('prerequisites');

    results.statistics.totalSubjects = subjects.length;

    if (subjects.length === 0) {
      return {
        success: false,
        message: 'No subjects found for this program/year/semester',
        results
      };
    }

    // Step 2: Get available faculty and rooms
    const availableFaculty = await Faculty.find({ isActive: true })
      .populate('user', 'firstName lastName');
    
    const availableRooms = await Room.find({ isActive: true });

    // Step 3: Define time slots (typical university schedule)
    const timeSlots = generateTimeSlots();

    // Step 4: Generate schedule for the specified section
    const sectionCode = `${program}-${yearLevel}${section}-${semester}-${academicYear}`;

    let dayIndex = 0;
    let slotIndex = 0;

    for (const subject of subjects) {
        try {
          // Find suitable faculty
          const suitableFaculty = findSuitableFaculty(
            subject,
            availableFaculty
          );

          if (!suitableFaculty) {
            results.failed.push({
              subject: subject.subjectCode,
              reason: 'No suitable faculty found'
            });
            results.statistics.failedSubjects++;
            continue;
          }

          // Find suitable room
          const suitableRoom = findSuitableRoom(
            subject,
            availableRooms
          );

          if (!suitableRoom) {
            results.failed.push({
              subject: subject.subjectCode,
              reason: 'No suitable room found'
            });
            results.statistics.failedSubjects++;
            continue;
          }

          // Calculate required time slots based on lecture + lab hours
          const totalHours = subject.lectureHours + subject.labHours;
          const slotsNeeded = Math.ceil(totalHours / 1.5); // 1.5 hours per slot

          // Assign time slots
          const assignedSlots = [];
          for (let i = 0; i < slotsNeeded; i++) {
            if (slotIndex >= timeSlots.length) {
              dayIndex++;
              slotIndex = 0;
            }

            if (dayIndex >= 6) { // Max 6 days (Mon-Sat)
              results.failed.push({
                subject: subject.subjectCode,
                reason: 'Not enough time slots available'
              });
              break;
            }

            const slot = timeSlots[slotIndex];
            assignedSlots.push({
              day: getDayName(dayIndex),
              startTime: slot.startTime,
              endTime: slot.endTime
            });

            slotIndex++;
          }

          if (assignedSlots.length < slotsNeeded) {
            results.statistics.failedSubjects++;
            continue;
          }

          // Create schedule entry
          const scheduleData = {
            academicYear,
            semester,
            program,
            yearLevel,
            section: section,
            sectionCode,
            shift,  // Add shift field
            subject: subject._id,
            faculty: suitableFaculty._id,
            room: suitableRoom.roomCode,
            timeSlots: assignedSlots,
            maxStudents: suitableRoom.capacity,
            status: 'draft',
            isActive: true,  // Explicitly set to active
            generatedBy: 'constraint_solver'
          };

          // Check for conflicts before creating
          const hasConflict = await checkConflictsBeforeCreation(scheduleData);
          
          if (hasConflict) {
            results.conflicts.push({
              subject: subject.subjectCode,
              reason: 'Time slot conflict detected'
            });
            results.statistics.conflictsDetected++;
            continue;
          }

          // Create schedule
          const schedule = await Schedule.create(scheduleData);

          // Update faculty load
          await Faculty.findByIdAndUpdate(suitableFaculty._id, {
            $inc: { currentLoad: subject.units }
          });

          results.success.push({
            scheduleId: schedule._id,
            subject: subject.subjectCode,
            faculty: `${suitableFaculty.user.firstName} ${suitableFaculty.user.lastName}`,
            room: suitableRoom.roomCode,
            timeSlots: assignedSlots
          });

          results.statistics.scheduledSubjects++;

        } catch (error) {
          results.failed.push({
            subject: subject.subjectCode,
            reason: error.message
          });
          results.statistics.failedSubjects++;
        }
      }

    return {
      success: true,
      message: 'Schedule generation completed',
      results
    };

  } catch (error) {
    console.error('Schedule generation error:', error);
    throw error;
  }
}

// Helper: Find suitable faculty for a subject
function findSuitableFaculty(subject, facultyList) {
  // Filter faculty who:
  // 1. Have required qualifications
  // 2. Have available teaching load
  // 3. Are not overloaded
  
  const suitable = facultyList.filter(f => {
    // Check if has required qualifications
    const hasQualification = subject.requiredQualifications.length === 0 ||
      subject.requiredQualifications.some(req =>
        f.specializations.includes(req) ||
        f.qualifications.some(q => q.field.includes(req))
      );

    // Check if has available load
    const hasAvailableLoad = f.currentLoad < f.maxTeachingLoad;

    return hasQualification && hasAvailableLoad;
  });

  // Sort by current load (assign to faculty with lowest load first)
  suitable.sort((a, b) => a.currentLoad - b.currentLoad);

  return suitable[0] || null;
}

// Helper: Find suitable room for a subject
function findSuitableRoom(subject, roomList) {
  // Determine room type needed
  let preferredType = 'Lecture Room';
  if (subject.labHours > 0) {
    if (subject.subjectName.toLowerCase().includes('computer')) {
      preferredType = 'Computer Lab';
    } else {
      preferredType = 'Laboratory';
    }
  }

  // Filter rooms by type
  const suitable = roomList.filter(r => r.roomType === preferredType);

  // Sort by capacity (smallest suitable room)
  suitable.sort((a, b) => a.capacity - b.capacity);

  return suitable[0] || roomList[0];
}

// Helper: Generate standard time slots
function generateTimeSlots() {
  return [
    { startTime: '07:00', endTime: '08:30' },
    { startTime: '08:30', endTime: '10:00' },
    { startTime: '10:00', endTime: '11:30' },
    { startTime: '11:30', endTime: '13:00' },
    { startTime: '13:00', endTime: '14:30' },
    { startTime: '14:30', endTime: '16:00' },
    { startTime: '16:00', endTime: '17:30' },
    { startTime: '17:30', endTime: '19:00' }
  ];
}

// Helper: Get day name from index
function getDayName(index) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[index] || 'Monday';
}

// Helper: Check conflicts before creating schedule
async function checkConflictsBeforeCreation(scheduleData) {
  const { faculty, room, timeSlots, academicYear, semester } = scheduleData;

  const existingSchedules = await Schedule.find({
    academicYear,
    semester,
    isActive: true,
    $or: [
      { faculty },
      { room }
    ]
  });

  for (const existing of existingSchedules) {
    for (const newSlot of timeSlots) {
      for (const existingSlot of existing.timeSlots) {
        if (newSlot.day === existingSlot.day) {
          const overlap = checkTimeOverlap(
            newSlot.startTime,
            newSlot.endTime,
            existingSlot.startTime,
            existingSlot.endTime
          );
          if (overlap) return true;
        }
      }
    }
  }

  return false;
}

// Helper: Check time overlap
function checkTimeOverlap(start1, end1, start2, end2) {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);
  return (s1 < e2 && e1 > s2);
}

// Helper: Convert time to minutes
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

module.exports = {
  generateScheduleForProgram
};
