import React, { useState, useEffect } from 'react';
import { facultyAPI, scheduleAPI, subjectAPI } from '../services/api';
import toast from 'react-hot-toast';
import { User, GripVertical, Calendar, Clock, X, Save, RefreshCw } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Time slots based on shift
const DAY_TIME_SLOTS = [
  '07:00-08:00', '08:00-09:00', '09:00-10:00', '10:00-11:00',
  '11:00-12:00', '12:00-13:00', '13:00-14:00', '14:00-15:00', '15:00-16:00'
];

const NIGHT_TIME_SLOTS = [
  '16:00-17:00', '17:00-18:00', '18:00-19:00', '19:00-20:00',
  '20:00-21:00', '21:00-22:00'
];

const FacultyDragDrop = ({ filters, onAssignmentChange }) => {
  const [faculty, setFaculty] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedFaculty, setDraggedFaculty] = useState(null);
  const [timetableGrid, setTimetableGrid] = useState({});
  const [hoveredCell, setHoveredCell] = useState(null);
  const [pendingChanges, setPendingChanges] = useState([]);

  // Determine which time slots to use based on shift filter
  const TIME_SLOTS = filters.shift === 'Night' ? NIGHT_TIME_SLOTS : 
                     filters.shift === 'Day' ? DAY_TIME_SLOTS :
                     [...DAY_TIME_SLOTS, ...NIGHT_TIME_SLOTS];

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Build query params
      const params = {};
      if (filters.program) params.program = filters.program;
      if (filters.yearLevel) params.yearLevel = filters.yearLevel;
      if (filters.semester) params.semester = filters.semester;
      if (filters.academicYear) params.academicYear = filters.academicYear;

      const [facultyRes, schedulesRes, subjectsRes] = await Promise.all([
        facultyAPI.getAll(),
        scheduleAPI.getAll(params),
        subjectAPI.getAll()
      ]);

      setFaculty(facultyRes.data.data || []);
      setSchedules(schedulesRes.data.data || []);
      setSubjects(subjectsRes.data.data || []);
      buildTimetableGrid(schedulesRes.data.data || []);
    } catch (error) {
      console.error('Load data error:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const buildTimetableGrid = (scheduleData) => {
    const grid = {};
    
    scheduleData.forEach(schedule => {
      if (schedule.timeSlots && schedule.timeSlots.length > 0) {
        schedule.timeSlots.forEach(slot => {
          const key = `${slot.day}-${slot.startTime}-${slot.endTime}`;
          if (!grid[key]) {
            grid[key] = [];
          }
          grid[key].push({
            scheduleId: schedule._id,
            schedule: schedule,
            slot: slot
          });
        });
      }
    });
    
    setTimetableGrid(grid);
  };

  const handleDragStart = (e, facultyMember) => {
    setDraggedFaculty(facultyMember);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    setDraggedFaculty(null);
    setHoveredCell(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e, day, timeSlot) => {
    e.preventDefault();
    setHoveredCell(`${day}-${timeSlot}`);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setHoveredCell(null);
  };

  const handleDrop = async (e, day, timeSlot) => {
    e.preventDefault();
    setHoveredCell(null);

    if (!draggedFaculty) return;

    const [startTime, endTime] = timeSlot.split('-');
    const key = `${day}-${startTime}-${endTime}`;
    const cellSchedules = timetableGrid[key] || [];

    if (cellSchedules.length === 0) {
      toast.error('No schedule entry exists for this time slot. Create a schedule first.');
      return;
    }

    // If multiple schedules exist in this slot, use the first one or show a picker
    const targetSchedule = cellSchedules[0].schedule;

    // Check if faculty is already assigned
    if (targetSchedule.faculty?._id === draggedFaculty._id) {
      toast('Faculty already assigned to this schedule');
      return;
    }

    // Add to pending changes
    const change = {
      scheduleId: targetSchedule._id,
      facultyId: draggedFaculty._id,
      facultyName: `${draggedFaculty.user?.firstName} ${draggedFaculty.user?.lastName}`,
      subject: targetSchedule.subject?.subjectCode || 'N/A',
      day: day,
      time: timeSlot,
      previousFacultyId: targetSchedule.faculty?._id
    };

    setPendingChanges(prev => {
      // Remove any existing change for this schedule
      const filtered = prev.filter(c => c.scheduleId !== targetSchedule._id);
      return [...filtered, change];
    });

    // Update local state immediately for visual feedback
    const updatedSchedules = schedules.map(s => {
      if (s._id === targetSchedule._id) {
        return { ...s, faculty: draggedFaculty };
      }
      return s;
    });
    setSchedules(updatedSchedules);
    buildTimetableGrid(updatedSchedules);

    toast.success(`Assigned ${change.facultyName} (pending save)`);
  };

  const handleSaveChanges = async () => {
    if (pendingChanges.length === 0) {
      toast('No changes to save');
      return;
    }

    try {
      setLoading(true);
      
      // Save each change
      for (const change of pendingChanges) {
        await scheduleAPI.update(change.scheduleId, {
          faculty: change.facultyId
        });
      }

      toast.success(`Saved ${pendingChanges.length} faculty assignment(s)`);
      setPendingChanges([]);
      loadData(); // Reload to get fresh data
      
      if (onAssignmentChange) {
        onAssignmentChange();
      }
    } catch (error) {
      console.error('Save changes error:', error);
      toast.error('Failed to save some assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleDiscardChanges = () => {
    if (window.confirm('Discard all pending changes?')) {
      setPendingChanges([]);
      loadData(); // Reload original data
      toast('Changes discarded');
    }
  };

  const getCellContent = (day, timeSlot) => {
    const [startTime, endTime] = timeSlot.split('-');
    const key = `${day}-${startTime}-${endTime}`;
    const cellSchedules = timetableGrid[key] || [];

    if (cellSchedules.length === 0) return null;

    return cellSchedules.map((item, idx) => {
      const schedule = item.schedule;
      const isPending = pendingChanges.some(c => c.scheduleId === schedule._id);
      
      return (
        <div
          key={idx}
          className={`text-xs p-2 rounded mb-1 ${
            isPending 
              ? 'bg-yellow-100 border border-yellow-400' 
              : 'bg-blue-50 border border-blue-200'
          }`}
        >
          <div className="font-semibold text-gray-900">
            {schedule.subject?.subjectCode || 'N/A'}
          </div>
          <div className="text-gray-600">
            {schedule.faculty?.user?.firstName} {schedule.faculty?.user?.lastName || 'Unassigned'}
          </div>
          <div className="text-gray-500 text-[10px]">
            {schedule.section} - {schedule.room?.roomNumber || 'TBA'}
          </div>
          {isPending && (
            <div className="text-yellow-700 text-[10px] font-semibold mt-1">
              ⚠️ Pending
            </div>
          )}
        </div>
      );
    });
  };

  const getFacultyScheduleCount = (facultyId) => {
    return schedules.filter(s => s.faculty?._id === facultyId).length;
  };

  if (loading && schedules.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Actions */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Drag & Drop Faculty Assignment</h2>
            <p className="text-sm text-gray-600">Drag faculty members to schedule slots to assign them</p>
          </div>
          <div className="flex gap-2">
            {pendingChanges.length > 0 && (
              <>
                <button
                  onClick={handleDiscardChanges}
                  className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  <X size={18} className="mr-2" />
                  Discard ({pendingChanges.length})
                </button>
                <button
                  onClick={handleSaveChanges}
                  disabled={loading}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <Save size={18} className="mr-2" />
                  Save Changes ({pendingChanges.length})
                </button>
              </>
            )}
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw size={18} className="mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-100 border border-blue-200 rounded mr-2"></div>
            <span className="text-gray-700">Assigned</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-yellow-100 border border-yellow-400 rounded mr-2"></div>
            <span className="text-gray-700">Pending Save</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-100 border-2 border-green-400 rounded mr-2"></div>
            <span className="text-gray-700">Drop Zone (hover)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Faculty List - Draggable */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-4 sticky top-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User size={20} className="mr-2" />
              Available Faculty
            </h3>
            <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
              {faculty.filter(f => f.isActive && f.user).map((fac) => {
                const scheduleCount = getFacultyScheduleCount(fac._id);
                return (
                  <div
                    key={fac._id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, fac)}
                    onDragEnd={handleDragEnd}
                    className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-move hover:bg-gray-100 hover:border-purple-300 transition-all"
                  >
                    <div className="flex items-center flex-1">
                      <GripVertical size={16} className="text-gray-400 mr-2" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-sm">
                          {fac.user.firstName} {fac.user.lastName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {fac.employeeId}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-semibold">
                      {scheduleCount}
                    </span>
                  </div>
                );
              })}
              {faculty.filter(f => f.isActive && f.user).length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No faculty available</p>
              )}
            </div>
          </div>
        </div>

        {/* Timetable Grid - Drop Zones */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                    Time
                  </th>
                  {DAYS.map(day => (
                    <th
                      key={day}
                      className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {TIME_SLOTS.map((timeSlot) => (
                  <tr key={timeSlot}>
                    <td className="px-4 py-2 text-sm font-medium text-gray-700 sticky left-0 bg-white z-10 border-r">
                      <div className="flex items-center">
                        <Clock size={14} className="mr-1 text-gray-400" />
                        {timeSlot}
                      </div>
                    </td>
                    {DAYS.map(day => {
                      const cellKey = `${day}-${timeSlot}`;
                      const isHovered = hoveredCell === cellKey;
                      const cellContent = getCellContent(day, timeSlot);
                      const hasContent = cellContent !== null;

                      return (
                        <td
                          key={day}
                          onDragOver={handleDragOver}
                          onDragEnter={(e) => handleDragEnter(e, day, timeSlot)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, day, timeSlot)}
                          className={`px-2 py-2 text-sm align-top transition-all ${
                            isHovered
                              ? 'bg-green-100 border-2 border-green-400'
                              : hasContent
                              ? 'bg-gray-50'
                              : 'bg-white'
                          }`}
                        >
                          <div className="min-h-[60px]">
                            {cellContent}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pending Changes Summary */}
      {pendingChanges.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-yellow-900 mb-2">
            Pending Changes ({pendingChanges.length})
          </h3>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {pendingChanges.map((change, idx) => (
              <div key={idx} className="text-sm text-yellow-800">
                • {change.subject} ({change.day} {change.time}) → {change.facultyName}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyDragDrop;
