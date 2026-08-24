import React, { useState, useEffect } from 'react';
import { facultyAPI, scheduleAPI, subjectAPI, roomAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Book, User, GripVertical, Clock, X, Save, RefreshCw, Plus, Trash2, AlertCircle, Undo2, Redo2 } from 'lucide-react';
import EditScheduleModal from './EditScheduleModal';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Convert 24-hour time range to 12-hour format
const formatTime12Hour = (timeRange) => {
  const [start, end] = timeRange.split('-');
  
  const format = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };
  
  return `${format(start)} - ${format(end)}`;
};

// All time slots with lunch break marked
const ALL_TIME_SLOTS = [
  { time: '07:00-08:00', isLunch: false },
  { time: '08:00-09:00', isLunch: false },
  { time: '09:00-10:00', isLunch: false },
  { time: '10:00-11:00', isLunch: false },
  { time: '11:00-12:00', isLunch: false },
  { time: '12:00-13:00', isLunch: true },  // LUNCH BREAK
  { time: '13:00-14:00', isLunch: false },
  { time: '14:00-15:00', isLunch: false },
  { time: '15:00-16:00', isLunch: false },
  { time: '16:00-17:00', isLunch: false },
  { time: '17:00-18:00', isLunch: false },
  { time: '18:00-19:00', isLunch: false },
  { time: '19:00-20:00', isLunch: false },
  { time: '20:00-21:00', isLunch: false },
  { time: '21:00-22:00', isLunch: false }
];

const ScheduleBuilder = ({ filters, subjects: propSubjects, sections: propSections, faculty: propFaculty, rooms: propRooms, onAssignmentChange }) => {
  const [subjects, setSubjects] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timetableGrid, setTimetableGrid] = useState({});
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragType, setDragType] = useState(null); // 'subject' or 'faculty'
  const [hoveredCells, setHoveredCells] = useState([]);
  const [pendingSchedules, setPendingSchedules] = useState([]);
  const [selectedHours, setSelectedHours] = useState(1);
  const [resizingSchedule, setResizingSchedule] = useState(null);
  const [resizeStartY, setResizeStartY] = useState(0);
  const [resizeOriginalHours, setResizeOriginalHours] = useState(0);
  const [editingSchedule, setEditingSchedule] = useState(null);
  
  // Undo/Redo state
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Filter time slots based on shift
  const TIME_SLOTS = filters.shift === 'Night' 
    ? ALL_TIME_SLOTS.filter(slot => {
        const hour = parseInt(slot.time.split(':')[0]);
        return hour >= 16;
      })
    : filters.shift === 'Day'
    ? ALL_TIME_SLOTS.filter(slot => {
        const hour = parseInt(slot.time.split(':')[0]);
        return hour >= 7 && hour < 16;
      })
    : ALL_TIME_SLOTS;

  useEffect(() => {
    loadData();
  }, [filters]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Z for Undo
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl+Y or Ctrl+Shift+Z for Redo
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'Z')) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);

  // Save state to history
  const saveToHistory = (schedules) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(schedules)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Undo function
  const handleUndo = () => {
    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1];
      setPendingSchedules(JSON.parse(JSON.stringify(previousState)));
      setHistoryIndex(historyIndex - 1);
      toast.success('Undone');
    } else {
      toast('Nothing to undo');
    }
  };

  // Redo function
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setPendingSchedules(JSON.parse(JSON.stringify(nextState)));
      setHistoryIndex(historyIndex + 1);
      toast.success('Redone');
    } else {
      toast('Nothing to redo');
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Use props data if available for subjects, faculty, rooms
      if (propSubjects && propFaculty && propRooms) {
        setSubjects(propSubjects);
        setFaculty(propFaculty);
        setRooms(propRooms);
        
        // Only load schedules from API
        const params = {};
        if (filters.program) params.program = filters.program;
        if (filters.yearLevel) params.yearLevel = filters.yearLevel;
        if (filters.semester) params.semester = filters.semester;
        if (filters.academicYear) params.academicYear = filters.academicYear;
        if (filters.shift) params.shift = filters.shift;
        
        const schedulesRes = await scheduleAPI.getAll(params);
        buildTimetableGrid(schedulesRes.data.data || []);
      } else {
        // Load all data from API if props not available
        const params = {};
        if (filters.program) params.program = filters.program;
        if (filters.yearLevel) params.yearLevel = filters.yearLevel;
        if (filters.semester) params.semester = filters.semester;
        if (filters.academicYear) params.academicYear = filters.academicYear;
        if (filters.shift) params.shift = filters.shift;

        const [subjectsRes, facultyRes, roomsRes, schedulesRes] = await Promise.all([
          subjectAPI.getAll(params),  // Pass filters to subject API
          facultyAPI.getAll(),
          roomAPI.getAll(),
          scheduleAPI.getAll(params)
        ]);

        setSubjects(subjectsRes.data.data || []);
        setFaculty(facultyRes.data.data || []);
        setRooms(roomsRes.data.data || []);
        buildTimetableGrid(schedulesRes.data.data || []);
      }
    } catch (error) {
      console.error('Load data error:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const buildTimetableGrid = (schedules) => {
    const grid = {};
    
    schedules.forEach(schedule => {
      if (schedule.timeSlots && schedule.timeSlots.length > 0) {
        schedule.timeSlots.forEach(slot => {
          const key = `${slot.day}-${slot.startTime}-${slot.endTime}`;
          if (!grid[key]) {
            grid[key] = [];
          }
          grid[key].push({
            id: schedule._id,
            subject: schedule.subject,
            faculty: schedule.faculty,
            room: schedule.room,
            section: schedule.section,
            type: slot.type
          });
        });
      }
    });
    
    setTimetableGrid(grid);
  };

  // Handle dragging subjects
  const handleSubjectDragStart = (e, subject) => {
    setDraggedItem(subject);
    setDragType('subject');
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.5';
    
    // Always start with 1 hour when dragging
    setSelectedHours(1);
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    setDraggedItem(null);
    setDragType(null);
    setHoveredCells([]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e, day, timeSlot, slotIndex) => {
    e.preventDefault();
    
    // Calculate which cells to highlight based on selected hours
    const hoveredCellsList = [];
    for (let i = 0; i < selectedHours; i++) {
      const targetIndex = slotIndex + i;
      if (targetIndex < TIME_SLOTS.length) {
        const targetSlot = TIME_SLOTS[targetIndex];
        if (!targetSlot.isLunch) {
          hoveredCellsList.push(`${day}-${targetSlot.time}`);
        }
      }
    }
    setHoveredCells(hoveredCellsList);
  };

  const handleDragLeave = () => {
    // Don't clear immediately to allow smooth transition between cells
  };

  const handleDrop = async (e, day, startTimeSlot, slotIndex) => {
    e.preventDefault();
    setHoveredCells([]);

    if (!draggedItem) return;

    // Check if required filters are set
    if (!filters.program || !filters.yearLevel || !filters.semester) {
      toast.error('Please select Program, Year Level, and Semester first');
      return;
    }

    // Check lunch break
    const [startHour] = startTimeSlot.split('-')[0].split(':').map(Number);
    if (startHour === 12) {
      toast.error('Cannot schedule during lunch break (12:00-13:00)');
      return;
    }

    // Calculate end time based on selected hours
    // Create ONE time slot that spans the full duration
    const startTime = startTimeSlot.split('-')[0];
    let endTime = startTimeSlot.split('-')[1];
    
    // Validate that all required time slots are available and not lunch
    // Also check for conflicts with existing schedules
    for (let i = 0; i < selectedHours; i++) {
      const targetIndex = slotIndex + i;
      if (targetIndex >= TIME_SLOTS.length) {
        toast.error('Not enough time slots available');
        return;
      }
      
      const targetSlot = TIME_SLOTS[targetIndex];
      if (targetSlot.isLunch) {
        toast.error('Cannot schedule through lunch break');
        return;
      }
      
      // Check for conflicts in this time slot
      const slotKey = `${day}-${targetSlot.time}`;
      const existingSchedules = timetableGrid[slotKey] || [];
      const pendingInSlot = pendingSchedules.filter(sched => {
        const firstSlot = sched.timeSlots[0];
        if (!firstSlot || firstSlot.day !== day) return false;
        
        const [schedStartH, schedStartM] = firstSlot.startTime.split(':').map(Number);
        const [schedEndH, schedEndM] = firstSlot.endTime.split(':').map(Number);
        const [slotStartH, slotStartM] = targetSlot.time.split('-')[0].split(':').map(Number);
        const [slotEndH, slotEndM] = targetSlot.time.split('-')[1].split(':').map(Number);
        
        const schedStartMin = schedStartH * 60 + schedStartM;
        const schedEndMin = schedEndH * 60 + schedEndM;
        const slotStartMin = slotStartH * 60 + slotStartM;
        const slotEndMin = slotEndH * 60 + slotEndM;
        
        // Check if there's any overlap
        return (schedStartMin < slotEndMin && schedEndMin > slotStartMin);
      });
      
      if (existingSchedules.length > 0 || pendingInSlot.length > 0) {
        toast.error(`Time slot conflict detected at ${day} ${targetSlot.time.split('-')[0]}`);
        return;
      }
      
      // Get the end time from the last slot
      endTime = targetSlot.time.split('-')[1];
    }
    
    // Create a SINGLE time slot for the full duration
    const timeSlots = [{
      day: day,
      startTime: startTime,
      endTime: endTime,
      type: 'Lecture'
    }];

    // Create pending schedule
    const newSchedule = {
      tempId: Date.now(),
      subject: dragType === 'subject' ? draggedItem._id : null,
      subjectData: dragType === 'subject' ? draggedItem : null,
      faculty: null,
      room: null,
      program: filters.program,
      yearLevel: filters.yearLevel,
      section: 'A', // Default, can be edited
      shift: filters.shift || 'Day',
      semester: filters.semester,
      academicYear: filters.academicYear,
      timeSlots: timeSlots,
      maxStudents: 40,
      isPublished: false
    };

    setPendingSchedules(prev => [...prev, newSchedule]);
    saveToHistory([...pendingSchedules, newSchedule]);
    toast.success(`Added ${draggedItem.subjectCode} (${selectedHours}h) - Select faculty and room`);
  };

  const updatePendingSchedule = (tempId, field, value) => {
    setPendingSchedules(prev => 
      prev.map(sched => 
        sched.tempId === tempId 
          ? { ...sched, [field]: value }
          : sched
      )
    );
  };

  const removePendingSchedule = (tempId) => {
    const newSchedules = pendingSchedules.filter(s => s.tempId !== tempId);
    setPendingSchedules(newSchedules);
    saveToHistory(newSchedules);
    toast('Schedule removed from pending');
  };

  // Handle resize start
  const handleResizeStart = (e, schedule, day, startTimeSlot) => {
    e.stopPropagation();
    e.preventDefault();
    
    setResizingSchedule({ ...schedule, day, startTimeSlot });
    setResizeStartY(e.clientY);
    setResizeOriginalHours(schedule.timeSlots.length);
    
    // Add global mouse move and up listeners
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  // Handle resize move
  const handleResizeMove = (e) => {
    if (!resizingSchedule) return;
    
    e.preventDefault();
    const deltaY = e.clientY - resizeStartY;
    const cellHeight = 80; // Cell height in pixels
    const hoursDelta = Math.round(deltaY / cellHeight);
    const newHours = Math.max(1, Math.min(5, resizeOriginalHours + hoursDelta)); // Min 1, max 5 hours
    
    // Visual feedback - highlight cells
    const schedule = resizingSchedule;
    const startSlotIndex = TIME_SLOTS.findIndex(slot => 
      slot.time.split('-')[0] === schedule.startTimeSlot.split('-')[0]
    );
    
    if (startSlotIndex !== -1) {
      const highlightCells = [];
      for (let i = 0; i < newHours; i++) {
        const targetIndex = startSlotIndex + i;
        if (targetIndex < TIME_SLOTS.length && !TIME_SLOTS[targetIndex].isLunch) {
          highlightCells.push(`${schedule.day}-${TIME_SLOTS[targetIndex].time}`);
        }
      }
      setHoveredCells(highlightCells);
    }
  };

  // Handle resize end
  const handleResizeEnd = (e) => {
    if (!resizingSchedule) return;
    
    e.preventDefault();
    
    // Calculate new duration
    const deltaY = e.clientY - resizeStartY;
    const cellHeight = 80;
    const hoursDelta = Math.round(deltaY / cellHeight);
    const newHours = Math.max(1, Math.min(5, resizeOriginalHours + hoursDelta));
    
    // Find the schedule in pending
    const schedule = resizingSchedule;
    const startSlotIndex = TIME_SLOTS.findIndex(slot => 
      slot.time.split('-')[0] === schedule.startTimeSlot.split('-')[0]
    );
    
    if (startSlotIndex !== -1 && newHours !== schedule.timeSlots.length) {
      // Validate new time slots and get start/end times
      let startTime = '';
      let endTime = '';
      let isValid = true;
      
      for (let i = 0; i < newHours; i++) {
        const targetIndex = startSlotIndex + i;
        if (targetIndex >= TIME_SLOTS.length) {
          isValid = false;
          toast.error('Not enough time slots available');
          break;
        }
        
        const targetSlot = TIME_SLOTS[targetIndex];
        if (targetSlot.isLunch) {
          isValid = false;
          toast.error('Cannot resize through lunch break');
          break;
        }
        
        // Get start time from first slot, end time from last slot
        if (i === 0) {
          startTime = targetSlot.time.split('-')[0];
        }
        endTime = targetSlot.time.split('-')[1];
      }
      
      if (isValid) {
        // Create a SINGLE time slot for the full duration
        const newTimeSlots = [{
          day: schedule.day,
          startTime: startTime,
          endTime: endTime,
          type: 'Lecture'
        }];
        
        // Update the pending schedule
        setPendingSchedules(prev => 
          prev.map(s => 
            s.tempId === schedule.tempId 
              ? { ...s, timeSlots: newTimeSlots }
              : s
          )
        );
        toast.success(`Resized to ${newHours} hour${newHours > 1 ? 's' : ''}`);
      }
    }
    
    // Cleanup
    setResizingSchedule(null);
    setResizeStartY(0);
    setResizeOriginalHours(0);
    setHoveredCells([]);
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  };

  const handleSaveAll = async () => {
    if (pendingSchedules.length === 0) {
      toast('No pending schedules to save');
      return;
    }

    // Validate all pending schedules
    const invalid = pendingSchedules.filter(s => !s.subject || !s.faculty || !s.room);
    if (invalid.length > 0) {
      toast.error(`${invalid.length} schedule(s) missing subject, faculty, or room`);
      return;
    }

    try {
      setLoading(true);
      
      // Create all schedules
      for (const pending of pendingSchedules) {
        const scheduleData = {
          subject: pending.subject,
          faculty: pending.faculty,
          room: pending.room,
          program: pending.program,
          yearLevel: pending.yearLevel,
          section: pending.section,
          shift: pending.shift,
          semester: pending.semester,
          academicYear: pending.academicYear,
          timeSlots: pending.timeSlots,
          maxStudents: pending.maxStudents,
          isPublished: pending.isPublished
        };

        await scheduleAPI.create(scheduleData);
      }

      toast.success(`Created ${pendingSchedules.length} schedule(s) successfully`);
      setPendingSchedules([]);
      loadData();
      
      if (onAssignmentChange) {
        onAssignmentChange();
      }
    } catch (error) {
      console.error('Save schedules error:', error);
      const message = error.response?.data?.message || 'Failed to save schedules';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscardAll = () => {
    if (window.confirm(`Discard ${pendingSchedules.length} pending schedule(s)?`)) {
      setPendingSchedules([]);
      toast('All pending schedules discarded');
    }
  };

  const handleCardClick = (schedule) => {
    if (schedule.isPending) {
      setEditingSchedule(schedule);
    }
  };

  const handleSaveFromModal = async () => {
    if (!editingSchedule) return;

    // Validate
    if (!editingSchedule.faculty || !editingSchedule.room) {
      toast.error('Please assign faculty and room');
      return;
    }

    try {
      setLoading(true);
      
      const scheduleData = {
        subject: editingSchedule.subject,
        faculty: editingSchedule.faculty,
        room: editingSchedule.room,
        program: editingSchedule.program,
        yearLevel: editingSchedule.yearLevel,
        section: editingSchedule.section,
        shift: editingSchedule.shift,
        semester: editingSchedule.semester,
        academicYear: editingSchedule.academicYear,
        timeSlots: editingSchedule.timeSlots,
        maxStudents: editingSchedule.maxStudents,
        isPublished: editingSchedule.isPublished
      };

      await scheduleAPI.create(scheduleData);
      
      toast.success('Schedule saved successfully');
      
      // Remove from pending
      setPendingSchedules(prev => prev.filter(s => s.tempId !== editingSchedule.tempId));
      setEditingSchedule(null);
      loadData();
      
      if (onAssignmentChange) {
        onAssignmentChange();
      }
    } catch (error) {
      console.error('Save schedule error:', error);
      const message = error.response?.data?.message || 'Failed to save schedule';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const getCellContent = (day, timeSlot) => {
    // Check timetable grid for existing schedules
    const key = `${day}-${timeSlot}`;
    const existing = timetableGrid[key] || [];

    // Check pending schedules - only show on FIRST slot
    const pending = pendingSchedules.filter(sched => {
      const firstSlot = sched.timeSlots[0];
      return firstSlot && 
        firstSlot.day === day && 
        firstSlot.startTime === timeSlot.split('-')[0];
    });

    return [...existing, ...pending.map(p => ({ ...p, isPending: true }))];
  };

  const getScheduleHeight = (schedule) => {
    // Calculate hours based on start and end time of the SINGLE time slot
    if (!schedule.timeSlots || schedule.timeSlots.length === 0) return 1;
    
    const slot = schedule.timeSlots[0];
    const [startHour, startMin] = slot.startTime.split(':').map(Number);
    const [endHour, endMin] = slot.endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const durationHours = Math.ceil((endMinutes - startMinutes) / 60);
    
    return durationHours;
  };

  const isScheduleMiddleCell = (day, timeSlot) => {
    // Check if this cell is in the middle of a multi-hour pending schedule
    const currentTime = timeSlot.split('-')[0];
    const [currentHour, currentMin] = currentTime.split(':').map(Number);
    const currentMinutes = currentHour * 60 + currentMin;
    
    return pendingSchedules.some(sched => {
      if (!sched.timeSlots || sched.timeSlots.length === 0) return false;
      
      const slot = sched.timeSlots[0];
      if (slot.day !== day) return false;
      
      const [startHour, startMin] = slot.startTime.split(':').map(Number);
      const [endHour, endMin] = slot.endTime.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      
      // This cell is a middle cell if:
      // - Current time is AFTER start time
      // - Current time is BEFORE end time
      return currentMinutes > startMinutes && currentMinutes < endMinutes;
    });
  };

  const getSubjectScheduleCount = (subjectId) => {
    return pendingSchedules.filter(s => s.subject === subjectId).length;
  };

  if (loading && subjects.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center dark:bg-gray-800">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto dark:border-blue-400"></div>
        <p className="text-gray-600 mt-4 dark:text-gray-400">Loading schedule builder...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-4 dark:bg-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Schedule Builder</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Drag subjects to time slots (starts at 1 hour). Resize by dragging edges. Drag back to subject list to remove.
            </p>
          </div>
          <div className="flex gap-2 items-center">
            {/* Hour selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Duration:</label>
              <select
                value={selectedHours}
                onChange={(e) => setSelectedHours(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                title="Schedules start at 1 hour. Adjust before dropping or resize after."
              >
                <option value={1}>1 Hour</option>
                <option value={2}>2 Hours</option>
                <option value={3}>3 Hours</option>
                <option value={4}>4 Hours</option>
                <option value={5}>5 Hours</option>
              </select>
              <span className="text-xs text-gray-500">
                (Starts at 1h, resize after drop)
              </span>
            </div>

            {pendingSchedules.length > 0 && (
              <>
                <button
                  onClick={handleDiscardAll}
                  className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  <X size={18} className="mr-2" />
                  Discard ({pendingSchedules.length})
                </button>
                <button
                  onClick={handleSaveAll}
                  disabled={loading}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <Save size={18} className="mr-2" />
                  Save All ({pendingSchedules.length})
                </button>
              </>
            )}
            
            {/* Undo/Redo Buttons */}
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={18} className="mr-2" />
              Undo
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 size={18} className="mr-2" />
              Redo
            </button>
            
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
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded mr-2 dark:bg-blue-900 dark:border-blue-700"></div>
            <span className="text-gray-700 dark:text-gray-300">Existing Schedule</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-yellow-100 border border-yellow-400 rounded mr-2 dark:bg-yellow-900 dark:border-yellow-700"></div>
            <span className="text-gray-700 dark:text-gray-300">Pending (Needs Faculty/Room)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-200 border-2 border-green-500 rounded mr-2 dark:bg-green-800 dark:border-green-600"></div>
            <span className="text-gray-700 dark:text-gray-300">Drop Zone (Hover)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-300 rounded mr-2 dark:bg-gray-600"></div>
            <span className="text-gray-700 dark:text-gray-300">Lunch Break (12:00-1:00 PM)</span>
          </div>
        </div>

        {/* Instructions */}
        {pendingSchedules.length === 0 && (
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 dark:bg-blue-900 dark:border-blue-700">
            <div className="flex items-start">
              <AlertCircle size={18} className="text-blue-600 mt-0.5 mr-2 dark:text-blue-400" />
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <strong>How to use:</strong>
                <ol className="list-decimal ml-4 mt-1 space-y-1">
                  <li>Drag a subject to any time slot (starts at 1 hour)</li>
                  <li>Resize by dragging the bottom edge (1-5 hours)</li>
                  <li>Click the card to assign faculty and room</li>
                  <li>Drag card back to subject list to remove</li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Subject List - Draggable */}
        <div className="lg:col-span-1">
          <div 
            className="bg-white rounded-lg shadow p-4 sticky top-4 dark:bg-gray-800"
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(e) => {
              e.preventDefault();
              // Check if dragging a schedule card back
              const scheduleId = e.dataTransfer.getData('scheduleId');
              if (scheduleId) {
                removePendingSchedule(parseInt(scheduleId));
                toast.success('Schedule removed');
              }
            }}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center dark:text-gray-100">
              <Book size={20} className="mr-2" />
              Subjects
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(Drag schedules here to remove)</span>
            </h3>
            <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
              {subjects.map((subject) => {
                const scheduleCount = getSubjectScheduleCount(subject._id);
                const totalHours = subject.lectureHours + subject.labHours;
                
                return (
                  <div
                    key={subject._id}
                    draggable
                    onDragStart={(e) => handleSubjectDragStart(e, subject)}
                    onDragEnd={handleDragEnd}
                    className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg cursor-move hover:from-blue-100 hover:to-blue-200 hover:border-blue-300 transition-all"
                  >
                    <div className="flex items-center flex-1">
                      <GripVertical size={16} className="text-gray-400 mr-2" />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 text-sm">
                          {subject.subjectCode}
                        </div>
                        <div className="text-xs text-gray-600 truncate">
                          {subject.subjectName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {subject.units} units • {totalHours}hrs/week
                        </div>
                        {subject.lectureHours > 0 && subject.labHours > 0 && (
                          <div className="text-xs text-blue-600 mt-1">
                            {subject.lectureHours}L + {subject.labHours}Lab
                          </div>
                        )}
                      </div>
                    </div>
                    {scheduleCount > 0 && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-semibold">
                        {scheduleCount} pending
                      </span>
                    )}
                  </div>
                );
              })}
              {subjects.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No subjects available for {filters.program} Year {filters.yearLevel} Semester {filters.semester}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Timetable Grid */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                    Time
                  </th>
                  {DAYS.map(day => (
                    <th
                      key={day}
                      className="w-28 px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {TIME_SLOTS.map((slot, slotIndex) => (
                  <tr key={slot.time}>
                    <td className={`px-4 py-2 text-sm font-medium sticky left-0 z-10 border-r ${
                      slot.isLunch ? 'bg-gray-300 text-gray-600' : 'bg-white text-gray-700'
                    }`}>
                      <div className="flex items-center">
                        <Clock size={14} className="mr-1 text-gray-400" />
                        {formatTime12Hour(slot.time)}
                        {slot.isLunch && <span className="ml-2 text-xs">🍽️</span>}
                      </div>
                    </td>
                    {DAYS.map(day => {
                      const cellKey = `${day}-${slot.time}`;
                      const isHovered = hoveredCells.includes(cellKey);
                      const cellContent = getCellContent(day, slot.time);
                      const hasContent = cellContent.length > 0;
                      const isMiddleCell = isScheduleMiddleCell(day, slot.time);

                      // Check if this cell should be hidden (part of multi-hour block above)
                      if (isMiddleCell) {
                        return <td key={day} className="hidden"></td>;
                      }

                      return (
                        <td
                          key={day}
                          onDragOver={handleDragOver}
                          onDragEnter={(e) => handleDragEnter(e, day, slot.time, slotIndex)}
                          onDrop={(e) => handleDrop(e, day, slot.time.split('-')[0], slotIndex)}
                          rowSpan={hasContent && cellContent[0]?.isPending ? getScheduleHeight(cellContent[0]) : 1}
                          className={`px-1 py-3 text-sm align-top transition-all relative ${
                            slot.isLunch
                              ? 'bg-gray-300 cursor-not-allowed'
                              : isHovered
                              ? 'bg-green-200 border-2 border-green-500'
                              : hasContent
                              ? 'bg-gray-50'
                              : 'bg-white hover:bg-gray-50'
                          }`}
                        >
                          {!slot.isLunch && (
                            <div className="min-h-[80px] h-full flex justify-center items-stretch">
                              {cellContent.map((item, idx) => {
                                const height = getScheduleHeight(item);
                                const startTime = item.timeSlots?.[0]?.startTime || '';
                                const endTime = item.timeSlots?.[item.timeSlots.length - 1]?.endTime || '';
                                
                                return (
                                  <div
                                    key={idx}
                                    draggable={item.isPending}
                                    onDragStart={(e) => {
                                      if (item.isPending) {
                                        e.dataTransfer.effectAllowed = 'move';
                                        e.dataTransfer.setData('scheduleId', item.tempId.toString());
                                        e.currentTarget.style.opacity = '0.5';
                                      }
                                    }}
                                    onDragEnd={(e) => {
                                      e.currentTarget.style.opacity = '1';
                                    }}
                                    onClick={() => handleCardClick(item)}
                                    className={`text-xs p-4 rounded mb-1 relative flex flex-col justify-between max-w-[200px] w-full transition-all ${
                                      item.isPending
                                        ? 'bg-yellow-100 border-2 border-yellow-400 cursor-move hover:bg-yellow-200 hover:border-yellow-500'
                                        : 'bg-blue-50 border border-blue-200'
                                    }`}
                                    style={{ minHeight: `${height * 140 - 10}px` }}
                                    title={item.isPending ? 'Click to edit | Drag to subject list to remove | Drag edges to resize' : ''}
                                  >
                                    <div>
                                      <div className="font-bold text-2xl text-gray-900 mb-3">
                                        {item.subjectData?.subjectCode || item.subject?.subjectCode || 'N/A'}
                                      </div>
                                      <div className="text-gray-700 text-base mb-3 leading-relaxed">
                                        {item.subjectData?.subjectName || item.subject?.subjectName || ''}
                                      </div>
                                      <div className="text-gray-600 text-sm flex items-center gap-2 mb-3">
                                        <User size={14} />
                                        {item.faculty?.user?.firstName} {item.faculty?.user?.lastName || 'Unassigned'}
                                      </div>
                                      <div className="text-gray-600 text-sm flex items-center gap-2 mb-3">
                                        <Clock size={14} />
                                        {startTime} - {endTime}
                                      </div>
                                      <div className="text-gray-500 text-sm mb-3">
                                        Room: {item.room?.roomNumber || 'No Room'}
                                      </div>
                                      {item.isPending && (
                                        <div className="text-yellow-700 text-sm font-bold mt-4 bg-yellow-200 px-3 py-2 rounded">
                                          {height}h • ⚠️ Pending
                                        </div>
                                      )}
                                    </div>
                                    
                                    {item.isPending && (
                                      <>
                                        {/* Resize handle */}
                                        <div
                                          onMouseDown={(e) => handleResizeStart(e, item, day, slot.time.split('-')[0])}
                                          className="absolute bottom-0 left-0 right-0 h-3 bg-yellow-400 cursor-ns-resize hover:bg-yellow-500 transition-colors flex items-center justify-center rounded-b"
                                          title="Drag to resize"
                                        >
                                          <div className="w-10 h-1 bg-yellow-700 rounded-full"></div>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
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

      {/* Edit Schedule Modal */}
      {editingSchedule && (
        <EditScheduleModal
          schedule={editingSchedule}
          faculty={faculty}
          rooms={rooms}
          onUpdate={updatePendingSchedule}
          onClose={() => setEditingSchedule(null)}
          onSave={handleSaveFromModal}
        />
      )}
    </div>
  );
};

export default ScheduleBuilder;
