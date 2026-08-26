import React, { useState, useEffect, useCallback } from 'react';
import { facultyAPI, scheduleAPI, subjectAPI, roomAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  BookOpen, GripVertical, Clock, X, Save, RefreshCw,
  Plus, Trash2, AlertCircle, Undo2, Redo2, Search,
  User, MapPin, ChevronDown, CheckCircle
} from 'lucide-react';
import EditScheduleModal from './EditScheduleModal';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const ALL_TIME_SLOTS = [
  { time: '07:00-08:00', isLunch: false },
  { time: '08:00-09:00', isLunch: false },
  { time: '09:00-10:00', isLunch: false },
  { time: '10:00-11:00', isLunch: false },
  { time: '11:00-12:00', isLunch: false },
  { time: '12:00-13:00', isLunch: true },
  { time: '13:00-14:00', isLunch: false },
  { time: '14:00-15:00', isLunch: false },
  { time: '15:00-16:00', isLunch: false },
  { time: '16:00-17:00', isLunch: false },
  { time: '17:00-18:00', isLunch: false },
  { time: '18:00-19:00', isLunch: false },
  { time: '19:00-20:00', isLunch: false },
  { time: '20:00-21:00', isLunch: false },
  { time: '21:00-22:00', isLunch: false },
];

// Format "07:00" → "7:00 AM"
const fmtTime = (t) => {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
};

const SUBJECT_COLORS = [
  { bg: 'bg-blue-600', light: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-700', text: 'text-blue-700 dark:text-blue-300' },
  { bg: 'bg-purple-600', light: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-700', text: 'text-purple-700 dark:text-purple-300' },
  { bg: 'bg-teal-600', light: 'bg-teal-50 dark:bg-teal-900/20', border: 'border-teal-200 dark:border-teal-700', text: 'text-teal-700 dark:text-teal-300' },
  { bg: 'bg-rose-600', light: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-200 dark:border-rose-700', text: 'text-rose-700 dark:text-rose-300' },
  { bg: 'bg-orange-500', light: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-700', text: 'text-orange-700 dark:text-orange-300' },
  { bg: 'bg-indigo-600', light: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-700', text: 'text-indigo-700 dark:text-indigo-300' },
  { bg: 'bg-emerald-600', light: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-700', text: 'text-emerald-700 dark:text-emerald-300' },
  { bg: 'bg-pink-600', light: 'bg-pink-50 dark:bg-pink-900/20', border: 'border-pink-200 dark:border-pink-700', text: 'text-pink-700 dark:text-pink-300' },
  { bg: 'bg-cyan-600', light: 'bg-cyan-50 dark:bg-cyan-900/20', border: 'border-cyan-200 dark:border-cyan-700', text: 'text-cyan-700 dark:text-cyan-300' },
  { bg: 'bg-amber-600', light: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-700', text: 'text-amber-700 dark:text-amber-300' },
];

const getSubjectColor = (subjectCode) => {
  if (!subjectCode) return SUBJECT_COLORS[0];
  let hash = 0;
  for (let i = 0; i < subjectCode.length; i++) hash = subjectCode.charCodeAt(i) + ((hash << 5) - hash);
  return SUBJECT_COLORS[Math.abs(hash) % SUBJECT_COLORS.length];
};

const ScheduleBuilder = ({
  filters,
  subjects: propSubjects,
  sections: propSections,
  faculty: propFaculty,
  rooms: propRooms,
  selectedSection,
  onAssignmentChange
}) => {
  const [subjects, setSubjects] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [timetableGrid, setTimetableGrid] = useState({});
  const [draggedSubject, setDraggedSubject] = useState(null);
  const [hoveredCells, setHoveredCells] = useState([]);
  const [pendingSchedules, setPendingSchedules] = useState([]);
  const [selectedHours, setSelectedHours] = useState(1);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [editingSavedSchedule, setEditingSavedSchedule] = useState(null);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [resizingSchedule, setResizingSchedule] = useState(null);
  const [resizeStartY, setResizeStartY] = useState(0);
  const [resizeStartHeight, setResizeStartHeight] = useState(0);

  const TIME_SLOTS = filters.shift === 'Night'
    ? ALL_TIME_SLOTS.filter(s => parseInt(s.time) >= 16)
    : filters.shift === 'Day'
    ? ALL_TIME_SLOTS.filter(s => parseInt(s.time) <= 15)
    : ALL_TIME_SLOTS;

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => { loadData(); }, [filters]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'Z')) { e.preventDefault(); handleRedo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [historyIndex, history]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.program) params.program = filters.program;
      if (filters.yearLevel) params.yearLevel = filters.yearLevel;
      if (filters.semester) params.semester = filters.semester;
      if (filters.academicYear) params.academicYear = filters.academicYear;
      if (filters.shift) params.shift = filters.shift;

      console.log('Loading schedule data with filters:', params);

      if (propSubjects && propFaculty && propRooms) {
        setSubjects(propSubjects);
        setFaculty(propFaculty);
        setRooms(propRooms);
        const res = await scheduleAPI.getAll(params);
        console.log('Loaded schedules:', res.data.data?.length || 0);
        buildGrid(res.data.data || []);
      } else {
        const [subRes, facRes, roomRes, schedRes] = await Promise.all([
          subjectAPI.getAll(params),
          facultyAPI.getAll(),
          roomAPI.getAll(),
          scheduleAPI.getAll(params),
        ]);
        setSubjects(subRes.data.data || []);
        setFaculty(facRes.data.data || []);
        setRooms(roomRes.data.data || []);
        console.log('Loaded schedules:', schedRes.data.data?.length || 0);
        buildGrid(schedRes.data.data || []);
      }
    } catch (err) {
      console.error('Load data error:', err);
      toast.error('Failed to load schedule data');
    } finally {
      setLoading(false);
    }
  };

  const buildGrid = (schedules) => {
    const grid = {};
    schedules.forEach(s => {
      (s.timeSlots || []).forEach(slot => {
        // Only store by START time (first hour) - rowSpan will handle display
        const key = `${slot.day}-${slot.startTime}`;
        if (!grid[key]) grid[key] = [];
        grid[key].push(s);
      });
    });
    setTimetableGrid(grid);
  };

  // ── History ────────────────────────────────────────────────────────────────
  const pushHistory = (schedules) => {
    const next = history.slice(0, historyIndex + 1);
    next.push(JSON.parse(JSON.stringify(schedules)));
    setHistory(next);
    setHistoryIndex(next.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setPendingSchedules(JSON.parse(JSON.stringify(history[historyIndex - 1])));
      setHistoryIndex(historyIndex - 1);
    } else toast('Nothing to undo');
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setPendingSchedules(JSON.parse(JSON.stringify(history[historyIndex + 1])));
      setHistoryIndex(historyIndex + 1);
    } else toast('Nothing to redo');
  };

  // ── Drag ───────────────────────────────────────────────────────────────────
  const handleSubjectDragStart = (e, subject) => {
    setDraggedSubject(subject);
    e.dataTransfer.effectAllowed = 'copy';
    // Start with 1 hour - user can resize after dropping
    setSelectedHours(1);
  };

  const handleDragEnd = () => {
    setDraggedSubject(null);
    setHoveredCells([]);
  };

  // ── Resize ─────────────────────────────────────────────────────────────────
  const handleResizeStart = (e, ps) => {
    e.stopPropagation();
    e.preventDefault();
    setResizingSchedule(ps.tempId);
    setResizeStartY(e.clientY);
    setResizeStartHeight(getDurationHours(ps));
  };

  const handleResizeMove = (e) => {
    if (!resizingSchedule) return;
    e.preventDefault();

    const deltaY = e.clientY - resizeStartY;
    const cellHeight = 56; // Height of one hour slot
    const hoursDelta = Math.round(deltaY / cellHeight);
    const newHours = Math.max(1, resizeStartHeight + hoursDelta);

    // Update the pending schedule
    const ps = pendingSchedules.find(p => p.tempId === resizingSchedule);
    if (!ps || !ps.timeSlots[0]) return;

    const [startH, startM] = ps.timeSlots[0].startTime.split(':').map(Number);
    const endH = startH + newHours;
    const endM = startM;

    // Check if new duration is valid
    if (endH > 22 || (endH === 22 && endM > 0)) return; // Don't go past 10 PM

    // Check for lunch conflicts
    const day = ps.timeSlots[0].day;
    let hasLunchConflict = false;
    for (let h = startH; h < endH; h++) {
      const slot = TIME_SLOTS.find(s => s.time.startsWith(`${String(h).padStart(2, '0')}:`));
      if (slot?.isLunch) {
        hasLunchConflict = true;
        break;
      }
    }

    if (hasLunchConflict) return;

    // Check for schedule conflicts
    let hasConflict = false;
    for (let h = startH; h < endH; h++) {
      const slotStart = `${String(h).padStart(2, '0')}:00`;
      const slotEnd = `${String(h + 1).padStart(2, '0')}:00`;
      const existingSchedules = timetableGrid[`${day}-${slotStart}-${slotEnd}`] || [];
      const otherPending = pendingSchedules.filter(p => 
        p.tempId !== resizingSchedule && 
        p.timeSlots[0]?.day === day
      );

      if (existingSchedules.length > 0 || otherPending.some(op => {
        const [opStartH] = op.timeSlots[0].startTime.split(':').map(Number);
        const [opEndH] = op.timeSlots[0].endTime.split(':').map(Number);
        return h >= opStartH && h < opEndH;
      })) {
        hasConflict = true;
        break;
      }
    }

    if (hasConflict) return;

    // Update the schedule
    setPendingSchedules(prev => prev.map(p => {
      if (p.tempId !== resizingSchedule) return p;
      return {
        ...p,
        timeSlots: [{
          ...p.timeSlots[0],
          endTime: `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
        }]
      };
    }));
  };

  const handleResizeEnd = () => {
    setResizingSchedule(null);
    setResizeStartY(0);
    setResizeStartHeight(0);
  };

  // Add resize event listeners
  useEffect(() => {
    if (resizingSchedule) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
      return () => {
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [resizingSchedule, resizeStartY, resizeStartHeight, pendingSchedules]);

  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; };

  const handleDragEnter = (e, day, slotIndex) => {
    e.preventDefault();
    const cells = [];
    for (let i = 0; i < selectedHours; i++) {
      const t = TIME_SLOTS[slotIndex + i];
      if (t && !t.isLunch) cells.push(`${day}-${t.time}`);
    }
    setHoveredCells(cells);
  };

  const handleDrop = (e, day, slotIndex) => {
    e.preventDefault();
    setHoveredCells([]);

    // If dragging a pending card back to subject panel
    const pendingId = e.dataTransfer.getData('pendingId');
    if (pendingId) {
      removePending(parseInt(pendingId));
      return;
    }

    if (!draggedSubject) return;
    
    if (!filters.program || !filters.yearLevel || !filters.semester) {
      // More specific message for missing section
      if (filters.program && (!filters.yearLevel || !filters.shift)) {
        toast.error('Please select a section first from the dropdown above');
      } else {
        toast.error('Select Program, Year Level and Semester first');
      }
      return;
    }

    const startSlot = TIME_SLOTS[slotIndex];
    if (!startSlot || startSlot.isLunch) {
      toast.error('Cannot drop on lunch break');
      return;
    }

    const startTime = startSlot.time.split('-')[0];
    let endTime = startSlot.time.split('-')[1];

    for (let i = 0; i < selectedHours; i++) {
      const t = TIME_SLOTS[slotIndex + i];
      if (!t) { toast.error('Not enough time slots'); return; }
      if (t.isLunch) { toast.error('Cannot schedule through lunch break'); return; }

      const key = `${day}-${t.time}`;
      const existConflict = timetableGrid[`${day}-${t.time.split('-')[0]}-${t.time.split('-')[1]}`]?.length > 0;
      const pendConflict = pendingSchedules.some(ps => {
        const sl = ps.timeSlots[0];
        if (!sl || sl.day !== day) return false;
        const [sh, sm] = sl.startTime.split(':').map(Number);
        const [eh, em] = sl.endTime.split(':').map(Number);
        const [th, tm] = t.time.split('-')[0].split(':').map(Number);
        return (th * 60 + tm) >= (sh * 60 + sm) && (th * 60 + tm) < (eh * 60 + em);
      });

      if (existConflict || pendConflict) {
        toast.error(`Conflict at ${day} ${t.time.split('-')[0]}`);
        return;
      }
      endTime = t.time.split('-')[1];
    }

    const newSchedule = {
      tempId: Date.now(),
      subject: draggedSubject._id,
      subjectData: draggedSubject,
      faculty: null,
      room: null,
      program: filters.program,
      yearLevel: selectedSection?.yearLevel || filters.yearLevel,
      section: selectedSection?.sectionLetter || 'A',
      sectionCode: selectedSection?.sectionCode || null,
      shift: selectedSection?.shift || filters.shift || 'Day',
      semester: selectedSection?.semester || filters.semester,
      academicYear: filters.academicYear,
      timeSlots: [{ day, startTime, endTime, type: 'Lecture' }],
      maxStudents: selectedSection?.maxStudents || 40,
      isPublished: false,
    };

    const next = [...pendingSchedules, newSchedule];
    setPendingSchedules(next);
    pushHistory(next);
    toast.success(`Added ${draggedSubject.subjectCode} (${selectedHours}h) — assign faculty & room`);
  };

  const removePending = (tempId) => {
    const next = pendingSchedules.filter(s => s.tempId !== tempId);
    setPendingSchedules(next);
    pushHistory(next);
  };

  const updatePending = (tempId, field, value) => {
    setPendingSchedules(prev => prev.map(s => {
      if (s.tempId === tempId) {
        const updated = { ...s, [field]: value };
        // Also update editingSchedule if it's the same schedule
        if (editingSchedule?.tempId === tempId) {
          setEditingSchedule(updated);
        }
        return updated;
      }
      return s;
    }));
  };

  const updateSaved = (scheduleId, field, value) => {
    // Update the editingSavedSchedule state
    if (editingSavedSchedule?._id === scheduleId) {
      setEditingSavedSchedule(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleEditSavedSchedule = (schedule) => {
    // Convert saved schedule to editable format
    const editable = {
      ...schedule,
      subject: schedule.subject?._id || schedule.subject,
      subjectData: schedule.subject,
      faculty: schedule.faculty?._id || schedule.faculty,
      room: schedule.room?._id || schedule.room,
    };
    setEditingSavedSchedule(editable);
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSaveAll = async () => {
    if (!pendingSchedules.length) return;
    const invalid = pendingSchedules.filter(s => !s.faculty || !s.room);
    if (invalid.length) {
      toast.error(`${invalid.length} schedule(s) still missing faculty or room`);
      return;
    }
    setSaving(true);
    try {
      for (const p of pendingSchedules) {
        await scheduleAPI.create({
          subject: p.subject,
          faculty: p.faculty,
          room: p.room,
          program: p.program,
          yearLevel: p.yearLevel,
          section: p.section,
          sectionCode: p.sectionCode,
          shift: p.shift,
          semester: p.semester,
          academicYear: p.academicYear,
          timeSlots: p.timeSlots,
          maxStudents: p.maxStudents,
          isPublished: p.isPublished,
        });
      }
      toast.success(`Saved ${pendingSchedules.length} schedule(s)`);
      setPendingSchedules([]);
      loadData();
      onAssignmentChange?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save schedules');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOne = async (schedule) => {
    if (!schedule.faculty || !schedule.room) {
      toast.error('Assign faculty and room before saving');
      return;
    }
    setSaving(true);
    try {
      await scheduleAPI.create({
        subject: schedule.subject,
        faculty: schedule.faculty,
        room: schedule.room,
        program: schedule.program,
        yearLevel: schedule.yearLevel,
        section: schedule.section,
        sectionCode: schedule.sectionCode,
        shift: schedule.shift,
        semester: schedule.semester,
        academicYear: schedule.academicYear,
        timeSlots: schedule.timeSlots,
        maxStudents: schedule.maxStudents,
        isPublished: schedule.isPublished,
      });
      toast.success('Schedule saved');
      removePending(schedule.tempId);
      setEditingSchedule(null);
      loadData();
      onAssignmentChange?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSaved = async (schedule) => {
    if (!schedule.faculty || !schedule.room) {
      toast.error('Faculty and room are required');
      return;
    }
    setSaving(true);
    try {
      const updateData = {
        faculty: schedule.faculty,
        room: schedule.room,
        timeSlots: schedule.timeSlots,
        maxStudents: schedule.maxStudents,
      };
      
      console.log('Updating schedule:', schedule._id, updateData);
      
      await scheduleAPI.update(schedule._id, updateData);
      toast.success('Schedule updated');
      setEditingSavedSchedule(null);
      
      // Wait a bit for the database to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Reload the data to show the updated schedule
      await loadData();
      onAssignmentChange?.();
    } catch (err) {
      console.error('Update error:', err);
      toast.error(err.response?.data?.message || 'Failed to update schedule');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSaved = async (scheduleId) => {
    if (!window.confirm('Delete this schedule? This cannot be undone.')) return;
    setSaving(true);
    try {
      await scheduleAPI.delete(scheduleId);
      toast.success('Schedule deleted');
      setEditingSavedSchedule(null);
      loadData();
      onAssignmentChange?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete schedule');
    } finally {
      setSaving(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getCellSchedules = (day, slot) => {
    const startTime = slot.time.split('-')[0];
    return timetableGrid[`${day}-${startTime}`] || [];
  };

  const getPendingForCell = (day, slot) => {
    const [startH, startM] = slot.time.split('-')[0].split(':').map(Number);
    const slotStart = startH * 60 + startM;
    return pendingSchedules.filter(ps => {
      const sl = ps.timeSlots[0];
      if (!sl || sl.day !== day) return false;
      const [sh, sm] = sl.startTime.split(':').map(Number);
      return sh * 60 + sm === slotStart;
    });
  };

  const isMiddleCell = (day, slot) => {
    const [h, m] = slot.time.split('-')[0].split(':').map(Number);
    const cur = h * 60 + m;
    
    // Check pending schedules
    const pendingMiddle = pendingSchedules.some(ps => {
      const sl = ps.timeSlots[0];
      if (!sl || sl.day !== day) return false;
      const [sh, sm] = sl.startTime.split(':').map(Number);
      const [eh, em] = sl.endTime.split(':').map(Number);
      return cur > (sh * 60 + sm) && cur < (eh * 60 + em);
    });
    
    if (pendingMiddle) return true;
    
    // Check saved schedules - iterate through all grid entries
    for (const key in timetableGrid) {
      const schedules = timetableGrid[key];
      for (const sched of schedules) {
        if (!sched.timeSlots || !sched.timeSlots[0]) continue;
        const sl = sched.timeSlots[0];
        if (sl.day !== day) continue;
        
        const [sh, sm] = sl.startTime.split(':').map(Number);
        const [eh, em] = sl.endTime.split(':').map(Number);
        const schedStart = sh * 60 + sm;
        const schedEnd = eh * 60 + em;
        
        // If current cell is after start but before end, it's a middle cell
        if (cur > schedStart && cur < schedEnd) {
          return true;
        }
      }
    }
    
    return false;
  };

  const getDurationHours = (ps) => {
    if (!ps.timeSlots?.[0]) return 1;
    const [sh, sm] = ps.timeSlots[0].startTime.split(':').map(Number);
    const [eh, em] = ps.timeSlots[0].endTime.split(':').map(Number);
    return Math.max(1, Math.ceil(((eh * 60 + em) - (sh * 60 + sm)) / 60));
  };

  const pendingCount = pendingSchedules.length;
  const readyCount = pendingSchedules.filter(s => s.faculty && s.room).length;
  const filteredSubjects = subjects.filter(s =>
    `${s.subjectCode} ${s.subjectName}`.toLowerCase().includes(subjectSearch.toLowerCase())
  );

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading && !subjects.length) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Loading schedule builder...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Top action bar ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 px-5 py-4 shadow-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Schedule Builder</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Drag subjects onto time slots · Click a card to assign faculty &amp; room
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Duration info - shows recommended hours */}
            {draggedSubject && (
              <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                  Starts: <strong>1h</strong>
                </span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400">
                  (Recommended: {(draggedSubject.lectureHours || 0) + (draggedSubject.labHours || 0)}h · Resize after drop)
                </span>
              </div>
            )}

            {/* Undo/Redo */}
            <button onClick={handleUndo} disabled={historyIndex <= 0}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
              title="Undo (Ctrl+Z)">
              <Undo2 className="w-4 h-4" />
            </button>
            <button onClick={handleRedo} disabled={historyIndex >= history.length - 1}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
              title="Redo (Ctrl+Y)">
              <Redo2 className="w-4 h-4" />
            </button>

            {pendingCount > 0 && (
              <>
                <button
                  onClick={() => { if (window.confirm(`Discard ${pendingCount} pending schedule(s)?`)) { setPendingSchedules([]); }}}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
                >
                  <X className="w-4 h-4" />
                  Discard ({pendingCount})
                </button>
                <button
                  onClick={handleSaveAll}
                  disabled={saving || readyCount !== pendingCount}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-60"
                  title={readyCount !== pendingCount ? `${pendingCount - readyCount} still need faculty/room` : ''}
                >
                  {saving
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <Save className="w-4 h-4" />}
                  Save All ({readyCount}/{pendingCount})
                </button>
              </>
            )}

            <button onClick={loadData} disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 mt-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-100 border border-blue-300" />Existing</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-amber-100 border border-amber-400" />Pending (needs faculty/room)</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-green-100 border-2 border-green-400" />Drop target</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-gray-200" />Lunch break</div>
          <div className="flex items-center gap-1.5 ml-auto text-gray-400"><kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] border border-gray-200 dark:border-gray-600">Ctrl+Z</kbd>Undo &nbsp;<kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] border border-gray-200 dark:border-gray-600">Ctrl+Y</kbd>Redo</div>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="flex gap-4 items-start">

        {/* Subject sidebar */}
        <div className="w-60 flex-shrink-0">
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden sticky top-4"
            onDragOver={e => { e.preventDefault(); }}
            onDrop={e => {
              e.preventDefault();
              const pendingId = e.dataTransfer.getData('pendingId');
              if (pendingId) { removePending(parseInt(pendingId)); toast('Removed from grid'); }
            }}
          >
            <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-gray-900 dark:text-white text-sm">
                  Subjects ({filteredSubjects.length})
                </span>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search subjects..."
                  value={subjectSearch}
                  onChange={e => setSubjectSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="p-2 max-h-[calc(100vh-340px)] overflow-y-auto space-y-1.5">
              {filteredSubjects.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">No subjects found</p>
                  {!filters.program && <p className="text-xs text-gray-400 mt-1">Select a program first</p>}
                </div>
              ) : filteredSubjects.map(subject => {
                const color = getSubjectColor(subject.subjectCode);
                const pendingForThis = pendingSchedules.filter(p => p.subject === subject._id).length;
                
                // Count how many times this subject is already in the grid (saved schedules)
                const scheduledCount = Object.values(timetableGrid).flat().filter(s => s.subject?._id === subject._id).length;
                
                // Total scheduled times = saved + pending
                const totalScheduled = scheduledCount + pendingForThis;
                
                // Check if limit reached (units = number of times it should be scheduled)
                const isLimitReached = totalScheduled >= subject.units;
                
                const isDragging = draggedSubject?._id === subject._id;

                return (
                  <div
                    key={subject._id}
                    draggable={!isLimitReached}
                    onDragStart={e => {
                      if (isLimitReached) {
                        e.preventDefault();
                        toast.error(`${subject.subjectCode} has reached its limit (${subject.units} units)`);
                        return;
                      }
                      handleSubjectDragStart(e, subject);
                    }}
                    onDragEnd={handleDragEnd}
                    className={`rounded-xl overflow-hidden border transition-all select-none ${
                      isLimitReached
                        ? 'opacity-40 cursor-not-allowed border-gray-300 dark:border-gray-600'
                        : isDragging
                        ? 'opacity-40 scale-95 border-blue-300 cursor-grab active:cursor-grabbing'
                        : `${color.border} hover:shadow-md hover:scale-[1.01] cursor-grab active:cursor-grabbing`
                    }`}
                  >
                    {/* Color top stripe */}
                    <div className={`${color.bg} px-3 py-1.5 flex items-center gap-2 ${isLimitReached ? 'opacity-60' : ''}`}>
                      <GripVertical className="w-3.5 h-3.5 text-white/70 flex-shrink-0" />
                      <span className="text-white text-xs font-bold truncate flex-1">{subject.subjectCode}</span>
                      {totalScheduled > 0 && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          isLimitReached
                            ? 'bg-red-500/80 text-white'
                            : 'bg-white/30 text-white'
                        }`}>
                          {totalScheduled}/{subject.units}
                        </span>
                      )}
                    </div>
                    {/* Subject info */}
                    <div className={`${color.light} px-3 py-2 ${isLimitReached ? 'opacity-60' : ''}`}>
                      <p className={`text-[11px] font-medium ${color.text} line-clamp-2 leading-tight`}>
                        {subject.subjectName}
                      </p>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          {subject.units} units · {(subject.lectureHours || 0) + (subject.labHours || 0)}h/wk
                          {subject.lectureHours > 0 && subject.labHours > 0 && ` (${subject.lectureHours}L+${subject.labHours}Lab)`}
                        </p>
                        {isLimitReached && (
                          <span className="text-[9px] text-red-600 dark:text-red-400 font-semibold uppercase">Full</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* Drop zone hint at bottom */}
              <div className="mt-2 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-400">Drag a card here to remove it from the grid</p>
              </div>
            </div>
          </div>
        </div>

        {/* Timetable grid */}
        <div className="flex-1 min-w-0">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: '760px' }}>
                <thead>
                  <tr>
                    <th className="w-24 px-3 py-3 text-left bg-gray-50 dark:bg-gray-700 border-b border-r border-gray-200 dark:border-gray-600">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Time</span>
                    </th>
                    {DAYS.map(day => (
                      <th key={day} className="px-2 py-3 text-center bg-gray-50 dark:bg-gray-700 border-b border-r border-gray-200 dark:border-gray-600 last:border-r-0">
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                          {day.substring(0, 3)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIME_SLOTS.map((slot, slotIndex) => {
                    if (slot.isLunch) {
                      return (
                        <tr key={slot.time}>
                          <td colSpan={DAYS.length + 1}
                            className="px-3 py-1.5 text-center text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border-b border-gray-200 dark:border-gray-600">
                            🍽 Lunch Break — 12:00 PM – 1:00 PM
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={slot.time} className={slotIndex % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/40 dark:bg-gray-750'}>
                        {/* Time label */}
                        <td className="px-3 py-2 border-b border-r border-gray-100 dark:border-gray-700 align-middle">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                              {fmtTime(slot.time.split('-')[0])}
                            </span>
                          </div>
                        </td>

                        {/* Day cells */}
                        {DAYS.map(day => {
                          if (isMiddleCell(day, slot)) {
                            return null; // Spanned by rowSpan above
                          }

                          const existingSchedules = getCellSchedules(day, slot);
                          const pendingHere = getPendingForCell(day, slot);
                          const cellKey = `${day}-${slot.time}`;
                          const isHovered = hoveredCells.includes(cellKey);
                          const isDragging = !!draggedSubject;
                          const isEmpty = existingSchedules.length === 0 && pendingHere.length === 0;

                          // Calculate rowSpan for both saved and pending schedules
                          let cellRowSpan = 1;
                          
                          // Check if any saved schedule starts at this cell and spans multiple hours
                          if (existingSchedules.length > 0) {
                            const maxDuration = Math.max(...existingSchedules.map(sched => {
                              if (!sched.timeSlots || !sched.timeSlots[0]) return 1;
                              const sl = sched.timeSlots[0];
                              const [sh, sm] = sl.startTime.split(':').map(Number);
                              const [eh, em] = sl.endTime.split(':').map(Number);
                              return Math.max(1, Math.ceil(((eh * 60 + em) - (sh * 60 + sm)) / 60));
                            }));
                            cellRowSpan = Math.max(cellRowSpan, maxDuration);
                          }
                          
                          // Check pending schedules
                          if (pendingHere.length > 0) {
                            const pendingDuration = getDurationHours(pendingHere[0]);
                            cellRowSpan = Math.max(cellRowSpan, pendingDuration);
                          }

                          return (
                            <td
                              key={day}
                              rowSpan={cellRowSpan}
                              onDragOver={handleDragOver}
                              onDragEnter={e => handleDragEnter(e, day, slotIndex)}
                              onDragLeave={() => setHoveredCells([])}
                              onDrop={e => handleDrop(e, day, slotIndex)}
                              className={`px-1.5 py-1.5 border-b border-r border-gray-100 dark:border-gray-700 last:border-r-0 align-top transition-colors ${
                                isHovered
                                  ? 'bg-green-50 dark:bg-green-900/20 ring-2 ring-inset ring-green-400'
                                  : isDragging && isEmpty
                                  ? 'hover:bg-gray-50/80 dark:hover:bg-gray-700/50'
                                  : ''
                              }`}
                              style={{ minWidth: '110px', minHeight: '56px' }}
                              title={isDragging && !isEmpty ? 'Cell is occupied. Remove existing schedule first before dropping here.' : ''}
                            >
                              {/* Existing schedules - NOW EDITABLE */}
                              {existingSchedules.map((sched, i) => {
                                const code = sched.subject?.subjectCode;
                                const color = getSubjectColor(code);
                                
                                // Calculate duration for saved schedule
                                let duration = 1;
                                if (sched.timeSlots && sched.timeSlots[0]) {
                                  const sl = sched.timeSlots[0];
                                  const [sh, sm] = sl.startTime.split(':').map(Number);
                                  const [eh, em] = sl.endTime.split(':').map(Number);
                                  duration = Math.max(1, Math.ceil(((eh * 60 + em) - (sh * 60 + sm)) / 60));
                                }
                                
                                return (
                                  <div 
                                    key={i} 
                                    onClick={() => handleEditSavedSchedule(sched)}
                                    className={`rounded-lg overflow-hidden mb-1 last:mb-0 border ${color.border} cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all group`}
                                    style={{ minHeight: duration > 1 ? `${duration * 56 - 8}px` : 'auto' }}
                                  >
                                    <div className={`${color.bg} px-2 py-1 flex items-center justify-between`}>
                                      <p className="text-white text-[11px] font-bold truncate">{code || '—'}</p>
                                      <span className="text-white/70 text-[9px] opacity-0 group-hover:opacity-100 transition-opacity">Click to edit</span>
                                    </div>
                                    <div className={`${color.light} px-2 py-1`}>
                                      <p className={`${color.text} text-[10px] font-medium truncate`}>
                                        {sched.faculty?.user ? `${sched.faculty.user.firstName} ${sched.faculty.user.lastName}` : <span className="italic text-gray-400">No faculty</span>}
                                      </p>
                                      <p className="text-gray-400 text-[10px] truncate">{sched.section} · {sched.room?.roomCode || sched.room?.roomNumber || 'TBA'}</p>
                                      {duration > 1 && (
                                        <p className="text-gray-500 text-[9px] mt-1">
                                          <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                                          {duration}h
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Pending schedules */}
                              {pendingHere.map((ps, i) => {
                                const code = ps.subjectData?.subjectCode;
                                const color = getSubjectColor(code);
                                const hours = getDurationHours(ps);
                                const isReady = !!ps.faculty && !!ps.room;

                                return (
                                  <div
                                    key={i}
                                    draggable
                                    onDragStart={e => {
                                      e.dataTransfer.effectAllowed = 'move';
                                      e.dataTransfer.setData('pendingId', ps.tempId.toString());
                                    }}
                                    onClick={() => setEditingSchedule(ps)}
                                    className={`rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition-all border-2 relative group ${
                                      isReady ? 'border-green-400' : 'border-amber-400'
                                    } ${resizingSchedule === ps.tempId ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                                    style={{ minHeight: `${hours * 56 - 8}px`, cursor: resizingSchedule === ps.tempId ? 'ns-resize' : 'pointer' }}
                                  >
                                    {/* Top stripe */}
                                    <div className={`${color.bg} px-2 py-1.5 flex items-start justify-between gap-1`}>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-white text-[11px] font-bold truncate">{code}</p>
                                        <p className="text-white/70 text-[10px] truncate">{ps.subjectData?.subjectName}</p>
                                      </div>
                                      <button
                                        onClick={e => { e.stopPropagation(); removePending(ps.tempId); }}
                                        className="text-white/70 hover:text-white transition-colors flex-shrink-0 mt-0.5"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                    {/* Body */}
                                    <div className={`${isReady ? 'bg-green-50 dark:bg-green-900/20' : 'bg-amber-50 dark:bg-amber-900/20'} px-2 py-1.5 flex-1`}>
                                      <div className={`flex items-center gap-1 text-[10px] ${isReady ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'} font-medium mb-1`}>
                                        {isReady ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                        {isReady ? 'Ready to save' : 'Tap to assign'}
                                      </div>
                                      {ps.faculty && (
                                        <p className="text-[10px] text-gray-700 dark:text-gray-300 flex items-center gap-1 truncate">
                                          <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                          {typeof ps.faculty === 'object'
                                            ? `${ps.faculty?.user?.firstName} ${ps.faculty?.user?.lastName}`
                                            : faculty.find(f => f._id === ps.faculty)?.user
                                              ? `${faculty.find(f => f._id === ps.faculty).user.firstName} ${faculty.find(f => f._id === ps.faculty).user.lastName}`
                                              : 'Assigned'}
                                        </p>
                                      )}
                                      {ps.room && (
                                        <p className="text-[10px] text-gray-700 dark:text-gray-300 flex items-center gap-1 truncate">
                                          <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                          {typeof ps.room === 'object' ? ps.room?.roomNumber : rooms.find(r => r._id === ps.room)?.roomNumber || ps.room}
                                        </p>
                                      )}
                                      <p className="text-[10px] text-gray-500 mt-0.5">{hours}h · {ps.timeSlots[0]?.startTime}–{ps.timeSlots[0]?.endTime}</p>
                                    </div>
                                    
                                    {/* Resize Handle */}
                                    <div
                                      onMouseDown={e => handleResizeStart(e, ps)}
                                      className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center bg-gradient-to-t from-gray-900/20 to-transparent"
                                      title="Drag to resize"
                                    >
                                      <div className="w-12 h-1 bg-gray-400 dark:bg-gray-500 rounded-full" />
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Empty cell drop hint */}
                              {isEmpty && isDragging && !isHovered && (
                                <div className="h-12 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg flex items-center justify-center opacity-40">
                                  <span className="text-[10px] text-gray-400">drop</span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending summary */}
          {pendingCount > 0 && (
            <div className={`mt-4 rounded-2xl border p-4 ${
              readyCount === pendingCount
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {readyCount === pendingCount
                    ? <CheckCircle className="w-4 h-4 text-green-600" />
                    : <AlertCircle className="w-4 h-4 text-amber-600" />}
                  <span className={`text-sm font-bold ${readyCount === pendingCount ? 'text-green-900 dark:text-green-100' : 'text-amber-900 dark:text-amber-100'}`}>
                    {readyCount === pendingCount
                      ? `All ${pendingCount} schedule(s) ready to save`
                      : `${pendingCount - readyCount} of ${pendingCount} still need faculty/room`}
                  </span>
                </div>
                <button
                  onClick={handleSaveAll}
                  disabled={saving || readyCount !== pendingCount}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {saving ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save All
                </button>
              </div>
              <div className="space-y-1.5">
                {pendingSchedules.map((ps, i) => {
                  const isReady = !!ps.faculty && !!ps.room;
                  const code = ps.subjectData?.subjectCode;
                  const color = getSubjectColor(code);
                  return (
                    <div key={i} className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${isReady ? 'bg-green-100/60 dark:bg-green-900/20' : 'bg-amber-100/60 dark:bg-amber-900/20'}`}>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${color.bg}`} />
                      <span className="font-semibold text-gray-900 dark:text-white">{code}</span>
                      <span className="text-gray-500 text-xs">· {ps.timeSlots[0]?.day} {ps.timeSlots[0]?.startTime}–{ps.timeSlots[0]?.endTime}</span>
                      {isReady
                        ? <CheckCircle className="w-3.5 h-3.5 text-green-600 ml-auto" />
                        : <span className="text-amber-600 text-xs ml-auto">needs {!ps.faculty ? 'faculty' : ''}{!ps.faculty && !ps.room ? ' + ' : ''}{!ps.room ? 'room' : ''}</span>
                      }
                      <button onClick={() => setEditingSchedule(ps)} className="text-blue-600 text-xs hover:underline">Edit</button>
                      <button onClick={() => removePending(ps.tempId)} className="text-gray-400 hover:text-red-500 transition-colors"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit modal for pending schedules */}
      {editingSchedule && (
        <EditScheduleModal
          schedule={editingSchedule}
          faculty={faculty}
          rooms={rooms}
          onUpdate={updatePending}
          onClose={() => setEditingSchedule(null)}
          onSave={() => handleSaveOne(editingSchedule)}
        />
      )}

      {/* Edit modal for saved schedules */}
      {editingSavedSchedule && (
        <EditScheduleModal
          schedule={editingSavedSchedule}
          faculty={faculty}
          rooms={rooms}
          onUpdate={(id, field, value) => updateSaved(id, field, value)}
          onClose={() => setEditingSavedSchedule(null)}
          onSave={() => handleUpdateSaved(editingSavedSchedule)}
          onDelete={() => handleDeleteSaved(editingSavedSchedule._id)}
          isSaved={true}
        />
      )}
    </div>
  );
};

export default ScheduleBuilder;
