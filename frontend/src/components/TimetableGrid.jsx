import React from 'react';
import { Clock, Utensils } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// All time slots in 24-hour format
const ALL_TIME_SLOTS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
  '19:00', '20:00', '21:00'
];

// Convert 24-hour time to 12-hour format with AM/PM
const formatTime12Hour = (time24) => {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// Get time range label (e.g., "7:00 AM - 8:00 AM")
const getTimeRangeLabel = (startTime) => {
  const [hours] = startTime.split(':').map(Number);
  const endHour = hours + 1;
  const endTime = `${endHour.toString().padStart(2, '0')}:00`;
  return `${formatTime12Hour(startTime)} - ${formatTime12Hour(endTime)}`;
};

// Check if time slot is lunch break (12:00 PM - 1:00 PM)
const isLunchBreak = (time) => {
  return time === '12:00';
};

const TimetableGrid = ({ schedules, onScheduleClick, canEdit, viewMode = 'week', shift = 'all' }) => {
  // Filter time slots based on shift
  const getFilteredTimeSlots = () => {
    if (shift === 'Day') {
      // Day shift: 7 AM - 4 PM (07:00 - 16:00)
      return ALL_TIME_SLOTS.filter(time => {
        const hour = parseInt(time.split(':')[0]);
        return hour >= 7 && hour < 16;
      });
    } else if (shift === 'Night') {
      // Night shift: 4 PM - 10 PM (16:00 - 22:00)
      return ALL_TIME_SLOTS.filter(time => {
        const hour = parseInt(time.split(':')[0]);
        return hour >= 16 && hour <= 21;
      });
    }
    // All shifts
    return ALL_TIME_SLOTS;
  };

  const TIME_SLOTS = getFilteredTimeSlots();

  // Group schedules by day and time
  const getSchedulesForSlot = (day, timeSlot) => {
    return schedules.filter(schedule => {
      if (!schedule.timeSlots || schedule.timeSlots.length === 0) return false;
      
      return schedule.timeSlots.some(slot => {
        if (slot.day !== day) return false;
        
        // Check if this time slot falls within the schedule's time range
        const slotTime = timeSlot + ':00';
        const startTime = slot.startTime;
        const endTime = slot.endTime;
        
        // Convert times to minutes for comparison
        const toMinutes = (time) => {
          const [hours, minutes] = time.split(':').map(Number);
          return hours * 60 + (minutes || 0);
        };
        
        const slotMinutes = toMinutes(slotTime);
        const startMinutes = toMinutes(startTime);
        const endMinutes = toMinutes(endTime);
        
        return slotMinutes >= startMinutes && slotMinutes < endMinutes;
      });
    });
  };

  // Calculate row span for a schedule
  const getRowSpan = (schedule, day, startTime) => {
    const slot = schedule.timeSlots?.find(s => s.day === day);
    if (!slot) return 1;
    
    const toMinutes = (time) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + (minutes || 0);
    };
    
    const duration = toMinutes(slot.endTime) - toMinutes(slot.startTime);
    return Math.ceil(duration / 60); // Convert minutes to hours
  };

  // Check if this cell should be hidden (part of a multi-hour block above)
  const shouldHideCell = (day, timeSlot) => {
    const timeIndex = TIME_SLOTS.indexOf(timeSlot);
    if (timeIndex === 0) return false;
    
    // Check if any schedule from previous slots extends into this one
    for (let i = timeIndex - 1; i >= 0; i--) {
      const prevTimeSlot = TIME_SLOTS[i];
      const schedulesInPrevSlot = getSchedulesForSlot(day, prevTimeSlot);
      
      for (const schedule of schedulesInPrevSlot) {
        const slot = schedule.timeSlots?.find(s => s.day === day);
        if (!slot) continue;
        
        const toMinutes = (time) => {
          const [hours, minutes] = time.split(':').map(Number);
          return hours * 60 + (minutes || 0);
        };
        
        const currentTimeMinutes = toMinutes(timeSlot + ':00');
        const endMinutes = toMinutes(slot.endTime);
        
        if (currentTimeMinutes < endMinutes && prevTimeSlot + ':00' === slot.startTime) {
          return true;
        }
      }
    }
    
    return false;
  };

  // Render based on view mode
  if (viewMode === 'day') {
    // Day view: Show one day at a time (for now, show Monday)
    const selectedDay = 'Monday';
    
    return (
      <div className="overflow-x-auto">
        <div className="min-w-full">
          <div className="bg-gray-50 border-b-2 border-gray-300 p-4 text-center dark:bg-gray-800 dark:border-gray-600">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedDay}</h2>
          </div>
          
          <div className="space-y-2 p-4 dark:bg-gray-900">
            {TIME_SLOTS.map((time) => {
              // Check if this is lunch break
              if (isLunchBreak(time)) {
                return (
                  <div key={time} className="flex gap-4 min-h-[80px] bg-yellow-50 border-2 border-yellow-300 rounded-lg dark:bg-yellow-900 dark:border-yellow-600">
                    <div className="w-24 flex-shrink-0 text-sm font-medium text-yellow-800 flex items-center px-2 dark:text-yellow-100">
                      <Utensils size={14} className="mr-1" />
                      {getTimeRangeLabel(time)}
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-lg font-bold text-yellow-800 dark:text-yellow-100">🍽️ LUNCH BREAK</p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-200">12:00 PM - 1:00 PM</p>
                      </div>
                    </div>
                  </div>
                );
              }

              const schedules = getSchedulesForSlot(selectedDay, time);
              
              return (
                <div key={time} className="flex gap-4 min-h-[80px]">
                  <div className="w-24 flex-shrink-0 text-sm font-medium text-gray-600 flex items-center dark:text-gray-300">
                    <Clock size={14} className="mr-1" />
                    {getTimeRangeLabel(time)}
                  </div>
                  <div className="flex-1 grid grid-cols-1 gap-2">
                    {schedules.map((schedule, idx) => (
                      <div
                        key={`${schedule._id}-${idx}`}
                        onClick={() => canEdit && onScheduleClick(schedule)}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          schedule.status === 'published'
                            ? 'bg-green-50 border-green-500 hover:bg-green-100 dark:bg-green-900 dark:border-green-400 dark:hover:bg-green-800'
                            : 'bg-orange-50 border-orange-500 hover:bg-orange-100 dark:bg-orange-900 dark:border-orange-400 dark:hover:bg-orange-800'
                        }`}
                      >
                        <div className="font-bold text-sm dark:text-gray-100">{schedule.subject?.subjectCode || 'N/A'}</div>
                        <div className="text-xs text-gray-600 mt-1 dark:text-gray-300">{schedule.subject?.subjectName}</div>
                        <div className="text-xs text-gray-500 mt-1 dark:text-gray-400">
                          👨‍🏫 {schedule.faculty?.user?.firstName} {schedule.faculty?.user?.lastName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          🏫 {schedule.room || 'TBA'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTime12Hour(schedule.timeSlots?.[0]?.startTime || '00:00')} - {formatTime12Hour(schedule.timeSlots?.[0]?.endTime || '00:00')}
                        </div>
                      </div>
                    ))}
                    {schedules.length === 0 && (
                      <div className="text-gray-400 text-sm italic p-3 dark:text-gray-500">No classes scheduled</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Week view: Standard timetable grid
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th className="border border-gray-300 bg-gray-100 p-3 w-24 sticky left-0 z-10 dark:bg-gray-800 dark:border-gray-600">
              <Clock size={16} className="mx-auto dark:text-gray-300" />
            </th>
            {DAYS.map(day => (
              <th
                key={day}
                className="border border-gray-300 bg-gray-100 p-3 text-sm font-semibold text-gray-700 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TIME_SLOTS.map((time, timeIndex) => {
            // Check if this is lunch break (12:00 PM - 1:00 PM)
            if (isLunchBreak(time)) {
              return (
                <tr key={time} className="bg-yellow-50 dark:bg-yellow-900">
                  <td className="border border-gray-300 bg-yellow-100 p-2 text-sm font-medium text-yellow-800 text-center sticky left-0 z-10 dark:bg-yellow-800 dark:border-gray-600 dark:text-yellow-100">
                    <div className="flex flex-col items-center">
                      <Utensils size={16} className="mb-1" />
                      <span className="text-xs">{getTimeRangeLabel(time)}</span>
                    </div>
                  </td>
                  <td colSpan={7} className="border border-yellow-300 p-4 text-center dark:border-yellow-600">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-2xl">🍽️</span>
                      <div>
                        <p className="text-lg font-bold text-yellow-800 dark:text-yellow-100">LUNCH BREAK</p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-200">12:00 PM - 1:00 PM</p>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            }

            return (
              <tr key={time}>
                <td className="border border-gray-300 bg-gray-50 p-2 text-xs font-medium text-gray-600 text-center sticky left-0 z-10 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300">
                  {getTimeRangeLabel(time)}
                </td>
                {DAYS.map(day => {
                  if (shouldHideCell(day, time)) {
                    return null; // Cell is hidden (part of multi-hour block above)
                  }
                  
                  const schedulesInSlot = getSchedulesForSlot(day, time);
                  const firstSchedule = schedulesInSlot[0];
                  const rowSpan = firstSchedule ? getRowSpan(firstSchedule, day, time) : 1;
                  
                  return (
                    <td
                      key={day}
                      rowSpan={rowSpan}
                      className="border border-gray-300 p-2 align-top min-h-[80px] bg-white hover:bg-gray-50 dark:bg-gray-900 dark:border-gray-600 dark:hover:bg-gray-800"
                    >
                      {schedulesInSlot.length > 0 ? (
                        <div className="space-y-2">
                          {schedulesInSlot.map((schedule, idx) => (
                            <div
                              key={`${schedule._id}-${idx}`}
                              onClick={() => canEdit && onScheduleClick(schedule)}
                              className={`p-2 rounded-md border-l-4 cursor-pointer transition-all text-xs ${
                                schedule.status === 'published'
                                  ? 'bg-green-50 border-green-500 hover:bg-green-100 dark:bg-green-900 dark:border-green-400 dark:hover:bg-green-800'
                                  : 'bg-orange-50 border-orange-500 hover:bg-orange-100 dark:bg-orange-900 dark:border-orange-400 dark:hover:bg-orange-800'
                              }`}
                            >
                              <div className="font-bold dark:text-gray-100">{schedule.subject?.subjectCode || 'N/A'}</div>
                              <div className="text-gray-600 truncate dark:text-gray-300">{schedule.subject?.subjectName}</div>
                              <div className="text-gray-500 mt-1 dark:text-gray-400">
                                👨‍🏫 {schedule.faculty?.user?.firstName} {schedule.faculty?.user?.lastName}
                              </div>
                              <div className="text-gray-500 dark:text-gray-400">
                                🏫 {schedule.room || 'TBA'}
                              </div>
                              <div className="text-gray-500 font-medium mt-1 dark:text-gray-400">
                                {formatTime12Hour(schedule.timeSlots?.find(s => s.day === day)?.startTime || '00:00')} - 
                                {formatTime12Hour(schedule.timeSlots?.find(s => s.day === day)?.endTime || '00:00')}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-300 text-xs text-center py-4 dark:text-gray-600">-</div>
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
  );
};

export default TimetableGrid;
