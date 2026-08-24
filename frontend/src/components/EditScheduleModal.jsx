import React from 'react';
import { X, Save, User, MapPin, Users } from 'lucide-react';

const EditScheduleModal = ({ schedule, faculty, rooms, onUpdate, onClose, onSave }) => {
  if (!schedule) return null;

  const handleFieldChange = (field, value) => {
    onUpdate(schedule.tempId, field, value);
  };

  const handleSave = () => {
    // Validate required fields
    if (!schedule.faculty || !schedule.room) {
      return; // Button will be disabled anyway
    }
    onSave();
  };

  const height = schedule.timeSlots?.length || 1;
  const startTime = schedule.timeSlots?.[0]?.startTime || '';
  const endTime = schedule.timeSlots?.[schedule.timeSlots.length - 1]?.endTime || '';
  const day = schedule.timeSlots?.[0]?.day || '';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Edit Schedule</h2>
            <p className="text-sm text-gray-600 mt-1 dark:text-gray-400">
              {schedule.subjectData?.subjectCode} - {schedule.subjectData?.subjectName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors dark:text-gray-500 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Schedule Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-900 dark:border-blue-700">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1 dark:text-gray-400">Day & Time</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {day} • {startTime} - {endTime}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1 dark:text-gray-400">Duration</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{height} hour{height > 1 ? 's' : ''}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1 dark:text-gray-400">Units</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{schedule.subjectData?.units || 0} units</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1 dark:text-gray-400">Hours/Week</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {(schedule.subjectData?.lectureHours || 0) + (schedule.subjectData?.labHours || 0)}hrs
                </p>
              </div>
            </div>
          </div>

          {/* Faculty Selection */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
              <User size={16} className="mr-2" />
              Faculty <span className="text-red-500 ml-1">*</span>
            </label>
            <select
              value={schedule.faculty || ''}
              onChange={(e) => handleFieldChange('faculty', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
            >
              <option value="">Select faculty...</option>
              {faculty.filter(f => f.isActive && f.user).map(fac => (
                <option key={fac._id} value={fac._id}>
                  {fac.user.firstName} {fac.user.lastName} - {fac.department}
                </option>
              ))}
            </select>
            {!schedule.faculty && (
              <p className="text-xs text-red-600 mt-1 dark:text-red-400">Faculty is required</p>
            )}
          </div>

          {/* Room Selection */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
              <MapPin size={16} className="mr-2" />
              Room <span className="text-red-500 ml-1">*</span>
            </label>
            <select
              value={schedule.room || ''}
              onChange={(e) => handleFieldChange('room', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
            >
              <option value="">Select room...</option>
              {rooms.map(room => (
                <option key={room._id} value={room._id}>
                  {room.roomNumber} - {room.building} (Capacity: {room.capacity})
                </option>
              ))}
            </select>
            {!schedule.room && (
              <p className="text-xs text-red-600 mt-1 dark:text-red-400">Room is required</p>
            )}
          </div>

          {/* Section Input */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
              <Users size={16} className="mr-2" />
              Section
            </label>
            <input
              type="text"
              value={schedule.section || 'A'}
              onChange={(e) => handleFieldChange('section', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
              placeholder="e.g., A, B, C"
              maxLength={5}
            />
          </div>

          {/* Max Students */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block dark:text-gray-300">
              Maximum Students
            </label>
            <input
              type="number"
              value={schedule.maxStudents || 40}
              onChange={(e) => handleFieldChange('maxStudents', parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
              min={1}
              max={200}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!schedule.faculty || !schedule.room}
            className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            <Save size={18} className="mr-2" />
            Save Schedule
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditScheduleModal;
