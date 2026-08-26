const ClassSpace = require('../models/ClassSpace.model');
const Schedule = require('../models/Schedule.model');
const User = require('../models/User.model');
const { validationResult } = require('express-validator');
const fs = require('fs').promises;
const path = require('path');

// @desc    Get all class spaces
// @route   GET /api/classSpaces
// @access  Private
exports.getAllClassSpaces = async (req, res) => {
  try {
    const { academicYear, semester, program, isActive } = req.query;

    // Build query
    let query = {};
    
    const scheduleQuery = {};
    if (academicYear) scheduleQuery.academicYear = academicYear;
    if (semester) scheduleQuery.semester = parseInt(semester);
    if (program) scheduleQuery.program = program;

    // Get schedules matching criteria
    const schedules = await Schedule.find(scheduleQuery).select('_id');
    if (Object.keys(scheduleQuery).length > 0) {
      query.schedule = { $in: schedules.map(s => s._id) };
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const classSpaces = await ClassSpace.find(query)
      .populate({
        path: 'schedule',
        populate: [
          { path: 'subject', select: 'subjectCode subjectName units' },
          { path: 'faculty', populate: { path: 'user', select: 'firstName lastName' } }
        ]
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: classSpaces.length,
      data: classSpaces
    });

  } catch (error) {
    console.error('Get all class spaces error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching class spaces',
      error: error.message
    });
  }
};

// @desc    Get class space by ID
// @route   GET /api/classSpaces/:id
// @access  Private
exports.getClassSpaceById = async (req, res) => {
  try {
    const classSpace = await ClassSpace.findById(req.params.id)
      .populate({
        path: 'schedule',
        populate: [
          { path: 'subject', select: 'subjectCode subjectName units description' },
          { path: 'faculty', populate: { path: 'user', select: 'firstName lastName email' } }
        ]
      })
      .populate('announcements.postedBy', 'firstName lastName')
      .populate('materials.uploadedBy', 'firstName lastName')
      .populate('enrolledStudents.student', 'firstName lastName email');

    if (!classSpace) {
      return res.status(404).json({
        success: false,
        message: 'Class space not found'
      });
    }

    res.status(200).json({
      success: true,
      data: classSpace
    });

  } catch (error) {
    console.error('Get class space error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching class space',
      error: error.message
    });
  }
};

// @desc    Create class space
// @route   POST /api/classSpaces
// @access  Private/Admin
exports.createClassSpace = async (req, res) => {
  try {
    const { scheduleId, sectionCode } = req.body;

    if (!scheduleId || !sectionCode) {
      return res.status(400).json({
        success: false,
        message: 'Schedule ID and section code are required'
      });
    }

    // Check if schedule exists
    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    // Check if class space already exists for this schedule
    const existing = await ClassSpace.findOne({ schedule: scheduleId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Class space already exists for this schedule'
      });
    }

    // Create class space
    const classSpace = new ClassSpace({
      schedule: scheduleId,
      sectionCode,
      announcements: [],
      materials: [],
      enrolledStudents: []
    });

    // Generate unique enrollment code
    let isUnique = false;
    while (!isUnique) {
      const candidate = ClassSpace.generateEnrollmentCode();
      const existing = await ClassSpace.findOne({ enrollmentCode: candidate });
      if (!existing) {
        classSpace.enrollmentCode = candidate;
        isUnique = true;
      }
    }

    await classSpace.save();

    // Link class space to schedule
    schedule.classSpace = classSpace._id;
    await schedule.save();

    await classSpace.populate({
      path: 'schedule',
      populate: [
        { path: 'subject', select: 'subjectCode subjectName' },
        { path: 'faculty', populate: { path: 'user', select: 'firstName lastName' } }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Class space created successfully',
      data: classSpace
    });

  } catch (error) {
    console.error('Create class space error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating class space',
      error: error.message
    });
  }
};

// @desc    Update class space
// @route   PUT /api/classSpaces/:id
// @access  Private/Admin/Faculty
exports.updateClassSpace = async (req, res) => {
  try {
    const classSpace = await ClassSpace.findById(req.params.id)
      .populate('schedule');

    if (!classSpace) {
      return res.status(404).json({
        success: false,
        message: 'Class space not found'
      });
    }

    // Faculty can only update their own class spaces
    if (req.user.role === 'faculty') {
      const schedule = await Schedule.findById(classSpace.schedule).populate('faculty');
      if (schedule.faculty.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this class space'
        });
      }
    }

    const { isActive } = req.body;
    if (isActive !== undefined) classSpace.isActive = isActive;

    await classSpace.save();

    res.status(200).json({
      success: true,
      message: 'Class space updated successfully',
      data: classSpace
    });

  } catch (error) {
    console.error('Update class space error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating class space',
      error: error.message
    });
  }
};

// @desc    Delete class space
// @route   DELETE /api/classSpaces/:id
// @access  Private/Admin
exports.deleteClassSpace = async (req, res) => {
  try {
    const classSpace = await ClassSpace.findById(req.params.id);

    if (!classSpace) {
      return res.status(404).json({
        success: false,
        message: 'Class space not found'
      });
    }

    classSpace.isActive = false;
    await classSpace.save();

    res.status(200).json({
      success: true,
      message: 'Class space deleted successfully'
    });

  } catch (error) {
    console.error('Delete class space error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting class space',
      error: error.message
    });
  }
};

// @desc    Post announcement
// @route   POST /api/classSpaces/:id/announcements
// @access  Private/Faculty
exports.postAnnouncement = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { title, content, isPinned } = req.body;

    const classSpace = await ClassSpace.findById(req.params.id);
    if (!classSpace) {
      return res.status(404).json({
        success: false,
        message: 'Class space not found'
      });
    }

    // Add announcement
    classSpace.announcements.push({
      title,
      content,
      postedBy: req.user._id,
      isPinned: isPinned || false,
      createdAt: new Date()
    });

    await classSpace.save();
    await classSpace.populate('announcements.postedBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Announcement posted successfully',
      data: classSpace.announcements[classSpace.announcements.length - 1]
    });

  } catch (error) {
    console.error('Post announcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Error posting announcement',
      error: error.message
    });
  }
};

// @desc    Update announcement
// @route   PUT /api/classSpaces/:id/announcements/:announcementId
// @access  Private/Faculty
exports.updateAnnouncement = async (req, res) => {
  try {
    const { title, content, isPinned } = req.body;

    const classSpace = await ClassSpace.findById(req.params.id);
    if (!classSpace) {
      return res.status(404).json({
        success: false,
        message: 'Class space not found'
      });
    }

    const announcement = classSpace.announcements.id(req.params.announcementId);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Only author can edit
    if (announcement.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to edit this announcement'
      });
    }

    if (title) announcement.title = title;
    if (content) announcement.content = content;
    if (isPinned !== undefined) announcement.isPinned = isPinned;

    await classSpace.save();

    res.status(200).json({
      success: true,
      message: 'Announcement updated successfully',
      data: announcement
    });

  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating announcement',
      error: error.message
    });
  }
};

// @desc    Delete announcement
// @route   DELETE /api/classSpaces/:id/announcements/:announcementId
// @access  Private/Faculty
exports.deleteAnnouncement = async (req, res) => {
  try {
    const classSpace = await ClassSpace.findById(req.params.id);
    if (!classSpace) {
      return res.status(404).json({
        success: false,
        message: 'Class space not found'
      });
    }

    const announcement = classSpace.announcements.id(req.params.announcementId);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Only author can delete
    if (announcement.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this announcement'
      });
    }

    announcement.remove();
    await classSpace.save();

    res.status(200).json({
      success: true,
      message: 'Announcement deleted successfully'
    });

  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting announcement',
      error: error.message
    });
  }
};

// @desc    Upload material
// @route   POST /api/classSpaces/:id/materials
// @access  Private/Faculty
exports.uploadMaterial = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    const { title, description } = req.body;

    const classSpace = await ClassSpace.findById(req.params.id);
    if (!classSpace) {
      return res.status(404).json({
        success: false,
        message: 'Class space not found'
      });
    }

    // Add material
    classSpace.materials.push({
      title: title || req.file.originalname,
      description: description || '',
      fileUrl: `/uploads/${req.file.filename}`,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      uploadedBy: req.user._id,
      uploadedAt: new Date()
    });

    await classSpace.save();
    await classSpace.populate('materials.uploadedBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Material uploaded successfully',
      data: classSpace.materials[classSpace.materials.length - 1]
    });

  } catch (error) {
    console.error('Upload material error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading material',
      error: error.message
    });
  }
};

// @desc    Delete material
// @route   DELETE /api/classSpaces/:id/materials/:materialId
// @access  Private/Faculty
exports.deleteMaterial = async (req, res) => {
  try {
    const classSpace = await ClassSpace.findById(req.params.id);
    if (!classSpace) {
      return res.status(404).json({
        success: false,
        message: 'Class space not found'
      });
    }

    const material = classSpace.materials.id(req.params.materialId);
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    // Only uploader can delete
    if (material.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this material'
      });
    }

    // Delete file from disk
    try {
      const filePath = path.join(__dirname, '..', material.fileUrl);
      await fs.unlink(filePath);
    } catch (fileError) {
      console.warn('Could not delete file:', fileError.message);
    }

    material.remove();
    await classSpace.save();

    res.status(200).json({
      success: true,
      message: 'Material deleted successfully'
    });

  } catch (error) {
    console.error('Delete material error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting material',
      error: error.message
    });
  }
};

// @desc    Enroll student in class
// @route   POST /api/classSpaces/:id/enroll
// @access  Private
exports.enrollStudent = async (req, res) => {
  try {
    const classSpace = await ClassSpace.findById(req.params.id);
    if (!classSpace) {
      return res.status(404).json({
        success: false,
        message: 'Class space not found'
      });
    }

    // Check if student already enrolled
    const alreadyEnrolled = classSpace.enrolledStudents.some(
      enrollment => enrollment.student.toString() === req.user._id.toString()
    );

    if (alreadyEnrolled) {
      return res.status(400).json({
        success: false,
        message: 'Already enrolled in this class'
      });
    }

    // Check class capacity
    const schedule = await Schedule.findById(classSpace.schedule);
    if (schedule && schedule.enrolledStudents >= schedule.maxStudents) {
      return res.status(400).json({
        success: false,
        message: 'Class is full'
      });
    }

    // Enroll student
    classSpace.enrolledStudents.push({
      student: req.user._id,
      enrolledAt: new Date(),
      isRegular: req.body.isRegular !== false
    });

    // Update schedule enrollment count if schedule exists
    if (schedule) {
      schedule.enrolledStudents += 1;
      await schedule.save();
    }

    await classSpace.save();

    res.status(200).json({
      success: true,
      message: 'Enrolled successfully',
      data: classSpace
    });

  } catch (error) {
    console.error('Enroll student error:', error);
    res.status(500).json({
      success: false,
      message: 'Error enrolling student',
      error: error.message
    });
  }
};

// @desc    Unenroll student from class
// @route   POST /api/classSpaces/:id/unenroll
// @access  Private
exports.unenrollStudent = async (req, res) => {
  try {
    const classSpace = await ClassSpace.findById(req.params.id);
    if (!classSpace) {
      return res.status(404).json({
        success: false,
        message: 'Class space not found'
      });
    }

    // Find enrollment
    const enrollmentIndex = classSpace.enrolledStudents.findIndex(
      enrollment => enrollment.student.toString() === req.user._id.toString()
    );

    if (enrollmentIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'Not enrolled in this class'
      });
    }

    // Remove enrollment
    classSpace.enrolledStudents.splice(enrollmentIndex, 1);

    // Update schedule enrollment count if schedule exists
    const schedule = await Schedule.findById(classSpace.schedule);
    if (schedule && schedule.enrolledStudents > 0) {
      schedule.enrolledStudents -= 1;
      await schedule.save();
    }

    await classSpace.save();

    res.status(200).json({
      success: true,
      message: 'Unenrolled successfully'
    });

  } catch (error) {
    console.error('Unenroll student error:', error);
    res.status(500).json({
      success: false,
      message: 'Error unenrolling student',
      error: error.message
    });
  }
};

// @desc    Get class space by enrollment code
// @route   GET /api/classSpaces/code/:enrollmentCode
// @access  Private
exports.getClassSpaceByCode = async (req, res) => {
  try {
    const code = req.params.enrollmentCode.toUpperCase().trim();

    const classSpace = await ClassSpace.findOne({ 
      enrollmentCode: code,
      isActive: true 
    })
    .populate({
      path: 'schedule',
      populate: [
        { path: 'subject', select: 'subjectCode subjectName units' },
        { path: 'faculty', populate: { path: 'user', select: 'firstName lastName' } }
      ]
    });

    if (!classSpace) {
      return res.status(404).json({
        success: false,
        message: 'Invalid enrollment code. Please check the code and try again.'
      });
    }

    res.status(200).json({
      success: true,
      data: classSpace
    });

  } catch (error) {
    console.error('Get class space by code error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching class space',
      error: error.message
    });
  }
};

// @desc    Get my class spaces (student/faculty)
// @route   GET /api/classSpaces/my-classes
// @access  Private
exports.getMyClassSpaces = async (req, res) => {
  try {
    let classSpaces;

    if (req.user.role === 'faculty') {
      // Faculty: get all class spaces for their schedules
      const schedules = await Schedule.find({
        faculty: req.user.facultyProfile,
        isActive: true
      });

      classSpaces = await ClassSpace.find({
        schedule: { $in: schedules.map(s => s._id) },
        isActive: true
      })
      .populate({
        path: 'schedule',
        populate: [
          { path: 'subject', select: 'subjectCode subjectName units' },
          { path: 'faculty', populate: { path: 'user', select: 'firstName lastName profilePicture' } }
        ]
      });

    } else if (req.user.role === 'student') {
      const Student = require('../models/Student.model');
      const student = await Student.findOne({ user: req.user._id });

      if (!student || !student.sectionCode) {
        // Student hasn't enrolled in a section yet
        return res.status(200).json({
          success: true,
          count: 0,
          data: [],
          enrolled: false
        });
      }

      // Find all published schedules for this student's section
      const schedules = await Schedule.find({
        sectionCode: student.sectionCode,
        isActive: true
      });

      // Get or create ClassSpaces for each schedule
      classSpaces = [];
      for (const schedule of schedules) {
        let cs = await ClassSpace.findOne({ schedule: schedule._id });
        if (!cs) {
          // Auto-create ClassSpace if it doesn't exist yet
          cs = await ClassSpace.create({
            schedule: schedule._id,
            sectionCode: schedule.sectionCode + '-' + schedule._id.toString().slice(-4),
            announcements: [],
            materials: [],
            enrolledStudents: [],
            isActive: true
          });
        }
        await cs.populate({
          path: 'schedule',
          populate: [
            { path: 'subject', select: 'subjectCode subjectName units' },
            { path: 'faculty', populate: { path: 'user', select: 'firstName lastName profilePicture' } }
          ]
        });
        classSpaces.push(cs);
      }

      // Also include the section-level ClassSpace (schedule: null)
      const sectionCS = await ClassSpace.findOne({ 
        sectionCode: student.sectionCode, 
        schedule: null,
        isActive: true
      });
      if (sectionCS) {
        classSpaces.unshift(sectionCS);
      }

    } else {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    res.status(200).json({
      success: true,
      count: classSpaces.length,
      data: classSpaces
    });

  } catch (error) {
    console.error('Get my classes error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching class spaces',
      error: error.message
    });
  }
};

// @desc    Enroll student by section enrollment code
// @route   POST /api/classSpaces/enroll-by-code
// @access  Private (students only)
exports.enrollByCode = async (req, res) => {
  try {
    const { enrollmentCode } = req.body;

    if (!enrollmentCode) {
      return res.status(400).json({
        success: false,
        message: 'Enrollment code is required'
      });
    }

    const Section = require('../models/Section.model');
    const Student = require('../models/Student.model');

    // 1. Find the section with this enrollment code
    const section = await Section.findOne({
      enrollmentCode: enrollmentCode.toUpperCase().trim(),
      isActive: true
    }).populate({
      path: 'adviser',
      populate: { path: 'user', select: 'firstName lastName' }
    });

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Invalid enrollment code. Please check and try again.'
      });
    }

    // 2. Find the student profile
    const student = await Student.findOne({ user: req.user._id });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    // 3. Check if already enrolled in this section
    if (student.sectionCode === section.sectionCode) {
      return res.status(400).json({
        success: false,
        message: `You are already enrolled in section ${section.sectionCode}`
      });
    }

    // 4. Check capacity
    if (section.currentStudents >= section.maxStudents) {
      return res.status(400).json({
        success: false,
        message: 'This section is already full'
      });
    }

    // 5. Set student's sectionCode and update enrollment info from the section
    student.sectionCode = section.sectionCode;
    student.enrollmentStatus = 'enrolled';
    student.academicYear = section.academicYear;
    student.semester = section.semester;
    await student.save();

    // 6. Increment section's currentStudents count
    await Section.findByIdAndUpdate(section._id, { $inc: { currentStudents: 1 } });

    res.status(200).json({
      success: true,
      message: `Successfully enrolled in ${section.sectionCode}`,
      data: {
        sectionCode: section.sectionCode,
        program: section.program,
        yearLevel: section.yearLevel,
        shift: section.shift,
        academicYear: section.academicYear,
        semester: section.semester,
        adviser: section.adviser?.user
          ? `${section.adviser.user.firstName} ${section.adviser.user.lastName}`
          : null
      }
    });

  } catch (error) {
    console.error('Enroll by code error:', error);
    res.status(500).json({
      success: false,
      message: 'Error enrolling in section',
      error: error.message
    });
  }
};
