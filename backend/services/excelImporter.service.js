/**
 * Excel Importer Service
 * 
 * Handles importing data from Excel files (.xlsx, .xls)
 * Supports: Students, Faculty, Subjects, Schedules
 */

const XLSX = require('xlsx');
const Student = require('../models/Student.model');
const Faculty = require('../models/Faculty.model');
const Subject = require('../models/Subject.model');
const User = require('../models/User.model');
const Schedule = require('../models/Schedule.model');

/**
 * Parse Excel file from buffer
 * @param {Buffer} fileBuffer - Excel file buffer
 * @returns {Object} Parsed data by sheets
 */
function parseExcelFile(fileBuffer) {
  try {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const result = {};

    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { 
        raw: false,
        defval: null 
      });
      result[sheetName] = data;
    });

    return result;
  } catch (error) {
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
}

/**
 * Import students from Excel
 * @param {Array} data - Array of student objects from Excel
 * @returns {Object} Import results
 */
async function importStudents(data) {
  const results = { success: [], failed: [] };

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNumber = i + 2; // +2 for header row and 1-indexed

    try {
      // Validate required fields
      if (!row.studentId || !row.email || !row.firstName || !row.lastName || !row.program) {
        results.failed.push({
          row: rowNumber,
          studentId: row.studentId || 'N/A',
          error: 'Missing required fields'
        });
        continue;
      }

      // Check if student already exists
      const existing = await Student.findOne({ studentId: row.studentId });
      if (existing) {
        results.failed.push({
          row: rowNumber,
          studentId: row.studentId,
          error: 'Student ID already exists'
        });
        continue;
      }

      // Check if email already exists
      const existingUser = await User.findOne({ email: row.email });
      if (existingUser) {
        results.failed.push({
          row: rowNumber,
          studentId: row.studentId,
          error: 'Email already registered'
        });
        continue;
      }

      // Create user account
      const user = await User.create({
        email: row.email,
        password: row.password || 'student123',
        firstName: row.firstName,
        lastName: row.lastName,
        middleName: row.middleName || '',
        role: 'student',
        studentId: row.studentId,
        program: row.program,
        yearLevel: parseInt(row.yearLevel) || 1,
        section: row.section || 'A'
      });

      // Create student profile
      const student = await Student.create({
        user: user._id,
        studentId: row.studentId,
        program: row.program,
        yearLevel: parseInt(row.yearLevel) || 1,
        section: row.section || 'A',
        studentType: row.studentType || 'regular',
        academicYear: row.academicYear || '2024-2025',
        semester: parseInt(row.semester) || 1,
        contactNumber: row.contactNumber,
        address: row.address ? {
          street: row.address,
          city: row.city,
          province: row.province
        } : undefined,
        enrollmentStatus: 'enrolled'
      });

      results.success.push({
        row: rowNumber,
        studentId: row.studentId,
        name: `${row.firstName} ${row.lastName}`
      });
    } catch (error) {
      results.failed.push({
        row: rowNumber,
        studentId: row.studentId || 'N/A',
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Import faculty from Excel
 * @param {Array} data - Array of faculty objects from Excel
 * @returns {Object} Import results
 */
async function importFaculty(data) {
  const results = { success: [], failed: [] };

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNumber = i + 2;

    try {
      // Validate required fields
      if (!row.employeeId || !row.email || !row.firstName || !row.lastName) {
        results.failed.push({
          row: rowNumber,
          employeeId: row.employeeId || 'N/A',
          error: 'Missing required fields'
        });
        continue;
      }

      // Check if faculty already exists
      const existing = await Faculty.findOne({ employeeId: row.employeeId });
      if (existing) {
        results.failed.push({
          row: rowNumber,
          employeeId: row.employeeId,
          error: 'Employee ID already exists'
        });
        continue;
      }

      // Check if email already exists
      const existingUser = await User.findOne({ email: row.email });
      if (existingUser) {
        results.failed.push({
          row: rowNumber,
          employeeId: row.employeeId,
          error: 'Email already registered'
        });
        continue;
      }

      // Create user account
      const user = await User.create({
        email: row.email,
        password: row.password || 'faculty123',
        firstName: row.firstName,
        lastName: row.lastName,
        middleName: row.middleName || '',
        role: 'faculty'
      });

      // Parse specializations (comma-separated)
      const specializations = row.specializations 
        ? row.specializations.split(',').map(s => s.trim())
        : [];

      // Create faculty profile
      const faculty = await Faculty.create({
        user: user._id,
        employeeId: row.employeeId,
        department: row.department || 'CoTE',
        position: row.position || 'Instructor',
        specializations,
        maxTeachingLoad: parseInt(row.maxTeachingLoad) || 24,
        currentLoad: 0,
        contactNumber: row.contactNumber,
        officeLocation: row.officeLocation
      });

      results.success.push({
        row: rowNumber,
        employeeId: row.employeeId,
        name: `${row.firstName} ${row.lastName}`
      });
    } catch (error) {
      results.failed.push({
        row: rowNumber,
        employeeId: row.employeeId || 'N/A',
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Import subjects from Excel
 * @param {Array} data - Array of subject objects from Excel
 * @returns {Object} Import results
 */
async function importSubjects(data) {
  const results = { success: [], failed: [] };

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNumber = i + 2;

    try {
      // Validate required fields
      if (!row.subjectCode || !row.subjectName || !row.program || !row.yearLevel) {
        results.failed.push({
          row: rowNumber,
          subjectCode: row.subjectCode || 'N/A',
          error: 'Missing required fields'
        });
        continue;
      }

      // Check if subject already exists
      const existing = await Subject.findOne({ 
        subjectCode: row.subjectCode,
        program: row.program,
        yearLevel: parseInt(row.yearLevel)
      });
      
      if (existing) {
        results.failed.push({
          row: rowNumber,
          subjectCode: row.subjectCode,
          error: 'Subject already exists for this program/year'
        });
        continue;
      }

      // Parse required qualifications
      const requiredQualifications = row.requiredQualifications
        ? row.requiredQualifications.split(',').map(q => q.trim())
        : [];

      // Create subject
      const subject = await Subject.create({
        subjectCode: row.subjectCode,
        subjectName: row.subjectName,
        program: row.program,
        yearLevel: parseInt(row.yearLevel),
        semester: parseInt(row.semester) || 1,
        units: parseInt(row.units) || 3,
        lectureHours: parseInt(row.lectureHours) || 3,
        labHours: parseInt(row.labHours) || 0,
        requiredQualifications,
        description: row.description
      });

      results.success.push({
        row: rowNumber,
        subjectCode: row.subjectCode,
        name: row.subjectName
      });
    } catch (error) {
      results.failed.push({
        row: rowNumber,
        subjectCode: row.subjectCode || 'N/A',
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Generate Excel template for download
 * @param {String} type - Type of template (students, faculty, subjects)
 * @returns {Buffer} Excel file buffer
 */
function generateTemplate(type) {
  let data = [];
  let sheetName = '';

  switch (type) {
    case 'students':
      sheetName = 'Students';
      data = [
        {
          studentId: '2024-00001',
          email: 'juan.delacruz@ctu.edu.ph',
          password: 'student123',
          firstName: 'Juan',
          lastName: 'Dela Cruz',
          middleName: 'Santos',
          program: 'BSIT',
          yearLevel: 1,
          section: 'A',
          studentType: 'regular',
          academicYear: '2024-2025',
          semester: 1,
          contactNumber: '09123456789',
          address: '123 Main St',
          city: 'Daanbantayan',
          province: 'Cebu'
        }
      ];
      break;

    case 'faculty':
      sheetName = 'Faculty';
      data = [
        {
          employeeId: 'FAC-001',
          email: 'faculty@ctu.edu.ph',
          password: 'faculty123',
          firstName: 'Maria',
          lastName: 'Garcia',
          middleName: 'Lopez',
          department: 'CoTE',
          position: 'Instructor',
          specializations: 'Programming, Database',
          maxTeachingLoad: 24,
          contactNumber: '09123456789',
          officeLocation: 'Room 201'
        }
      ];
      break;

    case 'subjects':
      sheetName = 'Subjects';
      data = [
        {
          subjectCode: 'PROG101',
          subjectName: 'Introduction to Programming',
          program: 'BSIT',
          yearLevel: 1,
          semester: 1,
          units: 3,
          lectureHours: 3,
          labHours: 0,
          requiredQualifications: 'Programming, Computer Science',
          description: 'Basic programming concepts'
        }
      ];
      break;

    default:
      throw new Error('Invalid template type');
  }

  // Create workbook
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Generate buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
}

/**
 * Main import function - auto-detects type from sheet names
 * @param {Buffer} fileBuffer - Excel file buffer
 * @returns {Object} Import results for all sheets
 */
async function importFromExcel(fileBuffer) {
  const parsedData = parseExcelFile(fileBuffer);
  const results = {};

  for (const [sheetName, data] of Object.entries(parsedData)) {
    const lowerSheetName = sheetName.toLowerCase();

    if (lowerSheetName.includes('student')) {
      results.students = await importStudents(data);
    } else if (lowerSheetName.includes('faculty')) {
      results.faculty = await importFaculty(data);
    } else if (lowerSheetName.includes('subject')) {
      results.subjects = await importSubjects(data);
    } else {
      results[sheetName] = {
        skipped: true,
        message: `Unknown sheet type: ${sheetName}`
      };
    }
  }

  return results;
}

module.exports = {
  parseExcelFile,
  importStudents,
  importFaculty,
  importSubjects,
  importFromExcel,
  generateTemplate
};
