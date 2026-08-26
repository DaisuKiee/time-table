import React, { useState } from 'react';
import { X, Save, User, MapPin, Users, BookOpen, Clock, Calendar, CheckCircle, AlertCircle, Sparkles, Star, TrendingUp, Loader, School, Info, Trash2 } from 'lucide-react';

const SUBJECT_COLORS = [
  'bg-blue-600', 'bg-purple-600', 'bg-teal-600', 'bg-rose-600',
  'bg-orange-500', 'bg-indigo-600', 'bg-emerald-600', 'bg-pink-600',
  'bg-cyan-600', 'bg-amber-600',
];

const getSubjectColor = (code) => {
  if (!code) return SUBJECT_COLORS[0];
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
  return SUBJECT_COLORS[Math.abs(hash) % SUBJECT_COLORS.length];
};

const fmtTime = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
};

const EditScheduleModal = ({ schedule, faculty, rooms, onUpdate, onClose, onSave, onDelete, isSaved = false }) => {
  const [facultyScores, setFacultyScores] = useState({});
  const [loadingScores, setLoadingScores] = useState(false);
  
  if (!schedule) return null;

  // Use _id for saved schedules, tempId for pending
  const scheduleId = isSaved ? schedule._id : schedule.tempId;

  // Debug: Check if schedule has identifier
  React.useEffect(() => {
    console.log('EditScheduleModal opened with schedule:', {
      id: scheduleId,
      isSaved,
      subject: schedule.subject,
      faculty: schedule.faculty,
      room: schedule.room,
    });
  }, []);

  // Fetch AI scores when modal opens
  React.useEffect(() => {
    const fetchFacultyScores = async () => {
      if (!schedule.subject) return;
      
      setLoadingScores(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/ai/recommend-faculty', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            subjectId: schedule.subject,
            subjectCode: schedule.subjectData?.subjectCode,
            subjectName: schedule.subjectData?.subjectName,
          }),
        });

        const data = await response.json();
        
        if (data.success && data.recommendations) {
          // Create a map of faculty ID to match percentage
          const scores = {};
          const maxScore = data.recommendations[0]?.score || 1;
          
          data.recommendations.forEach(rec => {
            // Safely access faculty ID
            const facultyId = rec.faculty?._id || rec.faculty;
            if (!facultyId) return; // Skip if no valid ID
            
            // Calculate percentage based on score relative to best score
            const percentage = Math.round((rec.score / maxScore) * 100);
            scores[facultyId] = {
              percentage,
              experienceYears: rec.subjectExperience || 0,
            };
          });
          
          setFacultyScores(scores);
        }
      } catch (error) {
        console.error('Error fetching faculty scores:', error);
        // Silently fail - dropdown will work without scores
      } finally {
        setLoadingScores(false);
      }
    };

    fetchFacultyScores();
  }, [schedule.subject, schedule.subjectData]);

  const code = schedule.subjectData?.subjectCode;
  const headerColor = getSubjectColor(code);
  const day = schedule.timeSlots?.[0]?.day || '';
  const startTime = schedule.timeSlots?.[0]?.startTime || '';
  const endTime = schedule.timeSlots?.[schedule.timeSlots.length - 1]?.endTime || '';

  // Calculate duration in hours
  const getDuration = () => {
    if (!startTime || !endTime) return 1;
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    return Math.max(1, Math.ceil(((eh * 60 + em) - (sh * 60 + sm)) / 60));
  };
  const duration = getDuration();
  const isReady = !!schedule.faculty && !!schedule.room;

    // Sort faculty by AI score (highest first)
  const sortedFaculty = React.useMemo(() => {
    return [...faculty]
      .filter(f => f.isActive && f.user)
      .sort((a, b) => {
        const scoreA = facultyScores[a._id]?.percentage || 0;
        const scoreB = facultyScores[b._id]?.percentage || 0;
        return scoreB - scoreA; // Highest score first
      });
  }, [faculty, facultyScores]);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">

          {/* ── Color header ── */}
          <div className={`${headerColor} px-6 py-5 flex-shrink-0`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-white/70 text-xs font-medium uppercase tracking-wide mb-1">
                  Assign Faculty &amp; Room
                </p>
                <h2 className="text-xl font-bold text-white truncate">{code || 'Schedule'}</h2>
                <p className="text-white/80 text-sm mt-0.5 line-clamp-1">
                  {schedule.subjectData?.subjectName}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white/70 hover:text-white transition-colors flex-shrink-0 mt-0.5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick info pills */}
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 text-white text-xs font-medium">
                <Calendar className="w-3 h-3" />
                {day}
              </div>
              <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 text-white text-xs font-medium">
                <Clock className="w-3 h-3" />
                {fmtTime(startTime)} – {fmtTime(endTime)}
              </div>
              <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 text-white text-xs font-medium">
                <BookOpen className="w-3 h-3" />
                {duration}h · {schedule.subjectData?.units || 0} units
              </div>
            </div>
          </div>

          {/* ── Status bar ── */}
          <div className={`px-6 py-2.5 flex items-center gap-2 text-sm flex-shrink-0 ${
            isReady
              ? 'bg-green-50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-800'
              : 'bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800'
          }`}>
            {isReady
              ? <><CheckCircle className="w-4 h-4 text-green-600" /><span className="text-green-700 dark:text-green-300 font-medium">Ready to save</span></>
              : <><AlertCircle className="w-4 h-4 text-amber-600" /><span className="text-amber-700 dark:text-amber-300 font-medium">
                  Assign {!schedule.faculty ? 'faculty' : ''}{!schedule.faculty && !schedule.room ? ' and ' : ''}{!schedule.room ? 'room' : ''} to continue
                </span></>
            }
          </div>

          {/* ── Scrollable body ── */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">

            {/* Faculty */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                <User className="w-4 h-4 text-blue-600" />
                Faculty <span className="text-red-500">*</span>
                {loadingScores && (
                  <span className="text-xs text-purple-600 flex items-center gap-1">
                    <Loader className="w-3 h-3 animate-spin" />
                    AI analyzing...
                  </span>
                )}
              </label>
              <select
                value={typeof schedule.faculty === 'object' ? schedule.faculty?._id || '' : schedule.faculty || ''}
                onChange={e => {
                  console.log('Faculty changed:', e.target.value);
                  onUpdate(scheduleId, 'faculty', e.target.value);
                }}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-all ${
                  schedule.faculty
                    ? 'border-green-300 dark:border-green-600'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <option value="">Select faculty member...</option>
                {sortedFaculty.map(fac => {
                  const score = facultyScores[fac._id];
                  const hasExperience = score && score.experienceYears > 0;
                  const percentage = score?.percentage || 0;
                  
                  return (
                    <option key={fac._id} value={fac._id}>
                      {percentage > 0 ? `⭐ ${percentage}% ` : ''}
                      {fac.user.firstName} {fac.user.lastName}
                      {hasExperience ? ` (${score.experienceYears}y exp)` : ''}
                      {fac.department ? ` — ${fac.department}` : ''}
                      {fac.employeeId ? ` [${fac.employeeId}]` : ''}
                    </option>
                  );
                })}
              </select>
              {!schedule.faculty && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Faculty is required
                </p>
              )}
              {Object.keys(facultyScores).length > 0 && (
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI-ranked by teaching experience • ⭐ = Best match • (Xy exp) = Years teaching this subject
                </p>
              )}
            </div>

            {/* Room */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                Room <span className="text-red-500">*</span>
              </label>
              <select
                value={typeof schedule.room === 'object' ? schedule.room?._id || '' : schedule.room || ''}
                onChange={e => {
                  console.log('Room changed:', e.target.value);
                  onUpdate(scheduleId, 'room', e.target.value);
                }}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-all ${
                  schedule.room
                    ? 'border-green-300 dark:border-green-600'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <option value="">Select room...</option>
                {rooms.map(room => (
                  <option key={room._id} value={room._id}>
                    {room.roomCode || room.roomNumber} — {room.roomName || room.building}
                    {room.capacity ? ` (cap. ${room.capacity})` : ''}
                  </option>
                ))}
              </select>
              {!schedule.room && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Room is required
                </p>
              )}
            </div>

            {/* Section + Max students in a row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  Section
                </label>
                <input
                  type="text"
                  value={schedule.sectionCode || `${schedule.program}-${schedule.yearLevel}${schedule.section}`}
                  readOnly
                  disabled
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                  placeholder="Section code"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Fetched from selected section</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Max Students
                </label>
                <input
                  type="number"
                  value={schedule.maxStudents || 40}
                  readOnly
                  disabled
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">From section data</p>
              </div>
            </div>

            {/* Additional Section Details (Read-only) */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <School className="w-4 h-4 text-purple-600" />
                Section Details
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Program:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">{schedule.program}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Year Level:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">Year {schedule.yearLevel}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Semester:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">Semester {schedule.semester}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Shift:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">{schedule.shift}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500 dark:text-gray-400">Academic Year:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">{schedule.academicYear}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 flex items-center gap-1">
                <Info className="w-3 h-3" />
                These values are inherited from the selected section and cannot be edited here
              </p>
            </div>

          </div>

          {/* ── Footer ── */}
          <div className="flex-shrink-0 px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              {isSaved && onDelete && (
                <button
                  onClick={() => {
                    if (window.confirm('Delete this schedule? This cannot be undone.')) {
                      onDelete();
                    }
                  }}
                  className="px-4 py-2.5 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-300 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 font-medium text-sm transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 font-medium text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  console.log('Save button clicked', {
                    schedule,
                    isReady,
                    faculty: schedule.faculty,
                    room: schedule.room
                  });
                  onSave();
                }}
                disabled={!isReady}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {isSaved ? 'Update' : 'Save'} &amp; Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditScheduleModal;
