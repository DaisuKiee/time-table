const { 
  importFromExcel, 
  generateTemplate,
  importStudents,
  importFaculty,
  importSubjects 
} = require('../services/excelImporter.service');

// @desc    Import data from Excel file
// @route   POST /api/import/excel
// @access  Private (Admin, Scheduling Officer)
exports.importExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an Excel file'
      });
    }

    const fileBuffer = req.file.buffer;
    const results = await importFromExcel(fileBuffer);

    // Calculate totals
    let totalSuccess = 0;
    let totalFailed = 0;

    Object.values(results).forEach(result => {
      if (result.success) totalSuccess += result.success.length;
      if (result.failed) totalFailed += result.failed.length;
    });

    res.status(200).json({
      success: true,
      message: `Import completed: ${totalSuccess} succeeded, ${totalFailed} failed`,
      data: results
    });
  } catch (error) {
    console.error('Excel import error:', error);
    res.status(500).json({
      success: false,
      message: 'Error importing Excel file',
      error: error.message
    });
  }
};

// @desc    Import students from Excel
// @route   POST /api/import/students
// @access  Private (Admin, Scheduling Officer)
exports.importStudentsExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an Excel file'
      });
    }

    const XLSX = require('xlsx');
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false });

    const results = await importStudents(data);

    res.status(200).json({
      success: true,
      message: `Imported ${results.success.length} students. ${results.failed.length} failed.`,
      data: results
    });
  } catch (error) {
    console.error('Import students error:', error);
    res.status(500).json({
      success: false,
      message: 'Error importing students',
      error: error.message
    });
  }
};

// @desc    Import faculty from Excel
// @route   POST /api/import/faculty
// @access  Private (Admin, Scheduling Officer)
exports.importFacultyExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an Excel file'
      });
    }

    const XLSX = require('xlsx');
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false });

    const results = await importFaculty(data);

    res.status(200).json({
      success: true,
      message: `Imported ${results.success.length} faculty. ${results.failed.length} failed.`,
      data: results
    });
  } catch (error) {
    console.error('Import faculty error:', error);
    res.status(500).json({
      success: false,
      message: 'Error importing faculty',
      error: error.message
    });
  }
};

// @desc    Import subjects from Excel
// @route   POST /api/import/subjects
// @access  Private (Admin, Scheduling Officer)
exports.importSubjectsExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an Excel file'
      });
    }

    const XLSX = require('xlsx');
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false });

    const results = await importSubjects(data);

    res.status(200).json({
      success: true,
      message: `Imported ${results.success.length} subjects. ${results.failed.length} failed.`,
      data: results
    });
  } catch (error) {
    console.error('Import subjects error:', error);
    res.status(500).json({
      success: false,
      message: 'Error importing subjects',
      error: error.message
    });
  }
};

// @desc    Download Excel template
// @route   GET /api/import/template/:type
// @access  Private
exports.downloadTemplate = async (req, res) => {
  try {
    const { type } = req.params;
    const validTypes = ['students', 'faculty', 'subjects'];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid template type. Valid types: ${validTypes.join(', ')}`
      });
    }

    const buffer = generateTemplate(type);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${type}_template.xlsx`);
    res.send(buffer);
  } catch (error) {
    console.error('Download template error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating template',
      error: error.message
    });
  }
};

module.exports = exports;
