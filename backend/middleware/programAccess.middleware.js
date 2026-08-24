/**
 * Program Access Control Middleware
 * 
 * Ensures that program managers can only access data from their assigned program.
 * Admins have unrestricted access to all programs.
 * 
 * Usage:
 *   router.use(checkProgramAccess('Schedule'));
 */

const mongoose = require('mongoose');

/**
 * Check if user has access to program-specific resources
 * 
 * @param {String} resourceModel - Name of the mongoose model (e.g., 'Schedule', 'Subject', 'Student')
 * @returns {Function} Express middleware function
 */
const checkProgramAccess = (resourceModel) => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      // Admin has access to everything
      if (user.role === 'admin') {
        return next();
      }

      // Scheduling officers (legacy) maintain full access during transition
      if (user.role === 'scheduling_officer') {
        return next();
      }

      // Program manager - enforce program restrictions
      if (user.role === 'program_manager') {
        // Validate that user has a program assigned
        if (!user.program) {
          return res.status(403).json({
            error: 'Access denied',
            message: 'Program managers must have an assigned program'
          });
        }

        // For GET requests - add program filter to query
        if (req.method === 'GET') {
          // If fetching a specific resource by ID
          if (req.params.id) {
            const Model = mongoose.model(resourceModel);
            const resource = await Model.findById(req.params.id);

            if (!resource) {
              return res.status(404).json({ 
                error: 'Resource not found' 
              });
            }

            // Check if resource has a program field and if it matches
            if (resource.program && resource.program !== user.program) {
              return res.status(403).json({
                error: 'Access denied',
                message: `You can only access ${user.program} resources`,
                resource: {
                  type: resourceModel,
                  program: resource.program
                },
                userProgram: user.program
              });
            }
          } else {
            // For list queries, inject program filter
            req.query.program = user.program;
          }
        }

        // For POST/PUT/PATCH - validate and enforce program
        if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
          // If program is specified in body and doesn't match, deny
          if (req.body.program && req.body.program !== user.program) {
            return res.status(403).json({
              error: 'Access denied',
              message: `You can only create/modify ${user.program} resources`,
              attempted: req.body.program,
              allowed: user.program
            });
          }

          // For UPDATE operations, verify existing resource
          if (req.params.id && ['PUT', 'PATCH'].includes(req.method)) {
            const Model = mongoose.model(resourceModel);
            const resource = await Model.findById(req.params.id);

            if (!resource) {
              return res.status(404).json({ 
                error: 'Resource not found' 
              });
            }

            if (resource.program && resource.program !== user.program) {
              return res.status(403).json({
                error: 'Access denied',
                message: `You can only modify ${user.program} resources`,
                resource: {
                  type: resourceModel,
                  program: resource.program
                },
                userProgram: user.program
              });
            }
          }

          // Auto-set program for create/update
          req.body.program = user.program;
        }

        // For DELETE - verify resource belongs to user's program
        if (req.method === 'DELETE' && req.params.id) {
          const Model = mongoose.model(resourceModel);
          const resource = await Model.findById(req.params.id);

          if (!resource) {
            return res.status(404).json({ 
              error: 'Resource not found' 
            });
          }

          if (resource.program && resource.program !== user.program) {
            return res.status(403).json({
              error: 'Access denied',
              message: `You can only delete ${user.program} resources`,
              resource: {
                type: resourceModel,
                program: resource.program
              },
              userProgram: user.program
            });
          }
        }
      }

      // Faculty and students have their own access patterns (handled in controllers)
      next();
    } catch (error) {
      console.error('Program access middleware error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Error checking program access'
      });
    }
  };
};

/**
 * Middleware specifically for faculty access
 * Faculty can view resources across programs if they teach them
 */
const checkFacultyAccess = async (req, res, next) => {
  try {
    const user = req.user;

    // Admin has full access
    if (user.role === 'admin') {
      return next();
    }

    // Faculty can only access their own schedules
    if (user.role === 'faculty') {
      if (req.method === 'GET') {
        // Add faculty filter for schedule queries
        if (user.facultyProfile) {
          req.query.faculty = user.facultyProfile;
        }
      } else {
        // Faculty cannot create/edit/delete schedules
        return res.status(403).json({
          error: 'Access denied',
          message: 'Faculty members cannot modify schedules'
        });
      }
    }

    next();
  } catch (error) {
    console.error('Faculty access middleware error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Error checking faculty access'
    });
  }
};

/**
 * Middleware for student access
 * Students can only view their enrolled classes
 */
const checkStudentAccess = async (req, res, next) => {
  try {
    const user = req.user;

    // Admin has full access
    if (user.role === 'admin') {
      return next();
    }

    // Students have read-only access to their data
    if (user.role === 'student') {
      if (req.method !== 'GET') {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Students have read-only access'
        });
      }
      // Student-specific filtering is handled in controllers
    }

    next();
  } catch (error) {
    console.error('Student access middleware error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Error checking student access'
    });
  }
};

module.exports = {
  checkProgramAccess,
  checkFacultyAccess,
  checkStudentAccess
};
