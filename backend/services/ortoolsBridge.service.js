/**
 * OR-Tools Bridge Service
 * 
 * This service bridges Node.js with Python OR-Tools implementation
 * Handles data transformation and process communication
 */

const { spawn } = require('child_process');
const path = require('path');
const Subject = require('../models/Subject.model');
const Faculty = require('../models/Faculty.model');
const Room = require('../models/Room.model');

/**
 * Generate schedule using Google OR-Tools constraint solver
 * @param {Object} params - Generation parameters
 * @returns {Promise<Object>} Optimization results
 */
async function generateWithORTools(params) {
  const {
    academicYear,
    semester,
    program,
    yearLevel,
    sections = 1,
    timeLimit = 60, // seconds
    shift = 'Day' // Day or Night
  } = params;

  try {
    // Step 1: Fetch data from database
    const [subjects, faculty, rooms] = await Promise.all([
      Subject.find({
        program,
        yearLevel,
        semester,
        isActive: true
      }).lean(),
      Faculty.find({ isActive: true })
        .populate('user', 'firstName lastName')
        .lean(),
      Room.find({ isActive: true }).lean()
    ]);

    if (subjects.length === 0) {
      throw new Error('No subjects found for the specified criteria');
    }

    if (faculty.length === 0) {
      throw new Error('No faculty available');
    }

    if (rooms.length === 0) {
      throw new Error('No rooms available');
    }

    // Step 2: Prepare data for Python optimizer
    const pythonInput = preparePythonInput({
      subjects,
      faculty,
      rooms,
      sections,
      timeLimit,
      shift,
      academicYear,
      semester,
      program,
      yearLevel
    });

    // Step 3: Call Python optimizer
    const optimizerResult = await callPythonOptimizer(pythonInput, timeLimit + 10);

    // Step 4: Transform result to our schedule format
    const schedules = transformOptimizedSchedule(
      optimizerResult,
      { academicYear, semester, program, yearLevel }
    );

    return {
      success: true,
      method: 'OR-Tools CP-SAT',
      status: optimizerResult.status,
      schedules,
      statistics: {
        totalSubjects: subjects.length,
        scheduledSubjects: optimizerResult.statistics?.subjects_scheduled || 0,
        solverTime: optimizerResult.statistics?.solver_time || 0,
        sections: sections
      }
    };

  } catch (error) {
    console.error('OR-Tools generation error:', error);
    return {
      success: false,
      method: 'OR-Tools CP-SAT',
      error: error.message,
      schedules: [],
      statistics: {}
    };
  }
}

/**
 * Prepare data in format expected by Python optimizer
 */
function preparePythonInput(data) {
  const { subjects, faculty, rooms, sections, timeLimit, shift, academicYear, semester, program, yearLevel } = data;

  // Prepare subjects
  const preparedSubjects = subjects.map(subj => ({
    _id: subj._id.toString(),
    subject_code: subj.subjectCode,
    subject_name: subj.subjectName,
    units: subj.units,
    lecture_hours: subj.lectureHours || 0,
    lab_hours: subj.labHours || 0,
    required_qualifications: subj.requiredQualifications || [],
    program: subj.program,
    year_level: subj.yearLevel
  }));

  // Prepare faculty
  const preparedFaculty = faculty.map(fac => ({
    _id: fac._id.toString(),
    employee_id: fac.employeeId,
    name: `${fac.user?.firstName || ''} ${fac.user?.lastName || ''}`.trim(),
    user_id: fac.user?._id?.toString(),
    specializations: fac.specializations || [],
    max_teaching_load: fac.maxTeachingLoad || 24,
    current_load: fac.currentLoad || 0,
    qualifications: (fac.qualifications || []).map(q => ({
      degree: q.degree,
      field: q.field
    }))
  }));

  // Prepare rooms
  const preparedRooms = rooms.map(room => ({
    _id: room._id.toString(),
    room_code: room.roomCode,
    room_number: room.roomNumber,
    room_type: room.roomType,
    capacity: room.capacity,
    building: room.building || 'Main',
    facilities: room.facilities || []
  }));

  // Define time slots based on shift
  const time_slots = shift === 'Night' 
    ? generateNightTimeSlots()
    : generateDayTimeSlots();

  return {
    subjects: preparedSubjects,
    faculty: preparedFaculty,
    rooms: preparedRooms,
    sections,
    time_limit: timeLimit,
    shift,
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    time_slots,
    parameters: {
      academic_year: academicYear,
      semester,
      program,
      year_level: yearLevel
    }
  };
}

/**
 * Generate day shift time slots (7 AM - 4 PM)
 */
function generateDayTimeSlots() {
  return [
    { start: '07:00', end: '08:00' },
    { start: '08:00', end: '09:00' },
    { start: '09:00', end: '10:00' },
    { start: '10:00', end: '11:00' },
    { start: '11:00', end: '12:00' },
    { start: '12:00', end: '13:00' }, // Lunch break
    { start: '13:00', end: '14:00' },
    { start: '14:00', end: '15:00' },
    { start: '15:00', end: '16:00' }
  ];
}

/**
 * Generate night shift time slots (4 PM - 10 PM)
 */
function generateNightTimeSlots() {
  return [
    { start: '16:00', end: '17:00' },
    { start: '17:00', end: '18:00' },
    { start: '18:00', end: '19:00' },
    { start: '19:00', end: '20:00' },
    { start: '20:00', end: '21:00' },
    { start: '21:00', end: '22:00' }
  ];
}

/**
 * Call Python optimizer via subprocess
 */
function callPythonOptimizer(inputData, timeoutSeconds) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '../python/ortools_scheduler.py');
    const pythonProcess = spawn('python', [pythonScript]);

    let outputData = '';
    let errorData = '';

    // Set timeout
    const timeout = setTimeout(() => {
      pythonProcess.kill();
      reject(new Error('Python optimizer timed out'));
    }, timeoutSeconds * 1000);

    // Collect output
    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });

    // Collect errors
    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    // Handle completion
    pythonProcess.on('close', (code) => {
      clearTimeout(timeout);

      if (code !== 0) {
        reject(new Error(`Python process exited with code ${code}: ${errorData}`));
        return;
      }

      try {
        const result = JSON.parse(outputData);
        resolve(result);
      } catch (error) {
        reject(new Error(`Failed to parse Python output: ${error.message}\nOutput: ${outputData}`));
      }
    });

    // Send input data
    pythonProcess.stdin.write(JSON.stringify(inputData));
    pythonProcess.stdin.end();
  });
}

/**
 * Transform optimized schedule from Python format to our database format
 */
function transformOptimizedSchedule(optimizerResult, params) {
  if (!optimizerResult.success || !optimizerResult.schedules) {
    return [];
  }

  const { academicYear, semester, program, yearLevel } = params;

  return optimizerResult.schedules.map(schedule => {
    const sectionCode = `${program}-${yearLevel}${schedule.section}-${semester}-${academicYear}`;

    return {
      academicYear,
      semester,
      program,
      yearLevel,
      section: schedule.section,
      sectionCode,
      subject: schedule.subject._id,
      faculty: schedule.faculty?._id || null,
      room: schedule.room?.room_code || null,
      timeSlots: schedule.time_slots.map(slot => ({
        day: slot.day,
        startTime: slot.start_time,
        endTime: slot.end_time
      })),
      maxStudents: schedule.room?.capacity || 40,
      status: 'draft',
      generatedBy: 'ortools_cps at_solver',
      metadata: {
        subjectCode: schedule.subject.subject_code,
        subjectName: schedule.subject.subject_name,
        facultyName: schedule.faculty?.name || 'Unassigned',
        roomNumber: schedule.room?.room_number || 'TBA'
      }
    };
  });
}

/**
 * Check if OR-Tools is available
 */
async function checkORToolsAvailability() {
  try {
    const pythonScript = path.join(__dirname, '../python/ortools_scheduler.py');
    const testProcess = spawn('python', ['-c', 'import ortools.sat.python.cp_model; print("OK")']);

    return new Promise((resolve) => {
      let output = '';
      testProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      testProcess.on('close', (code) => {
        resolve({
          available: code === 0 && output.includes('OK'),
          pythonFound: code !== null,
          scriptPath: pythonScript
        });
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        testProcess.kill();
        resolve({ available: false, pythonFound: false, scriptPath: pythonScript });
      }, 5000);
    });
  } catch (error) {
    return {
      available: false,
      error: error.message
    };
  }
}

/**
 * Preview schedule using Google OR-Tools (doesn't save to DB)
 * @param {Object} params - Generation parameters
 * @returns {Promise<Object>} Preview of optimization results
 */
async function previewWithORTools(params) {
  // For now, return a message that OR-Tools preview is not implemented yet
  // In production, this would call the Python script and return results without saving
  return {
    success: false,
    message: 'OR-Tools preview is not yet implemented. Please use greedy algorithm for preview.',
    preview: {
      schedules: [],
      failed: [],
      conflicts: [],
      statistics: {
        totalSubjects: 0,
        scheduledSubjects: 0,
        failedSubjects: 0,
        conflictsDetected: 0
      }
    }
  };
}

module.exports = {
  generateWithORTools,
  previewWithORTools,
  checkORToolsAvailability
};
