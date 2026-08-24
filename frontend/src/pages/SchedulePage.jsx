import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { scheduleAPI, subjectAPI, sectionAPI, facultyAPI, roomAPI } from '../services/api';
import toast from 'react-hot-toast';
import { 
  Calendar as CalendarIcon, Plus, Download, Search, X,
  Wand2, AlertTriangle, CheckCircle, FileText, Grid, Users,
  Clock, BookOpen, School, List, MapPin,
  Edit2, Trash2
} from 'lucide-react';
import ScheduleModal from '../components/ScheduleModal';
import GenerateScheduleModal from '../components/GenerateScheduleModal';
import ConflictWarning from '../components/ConflictWarning';
import FacultyDragDrop from '../components/FacultyDragDrop';
import ScheduleBuilder from '../components/ScheduleBuilder';
import TimetableGrid from '../components/TimetableGrid';
import { exportToCSV, exportToOfficialPDF, exportToPrintableHTML, exportWeeklyTimetable } from '../utils/scheduleExport';
import { useAuth } from '../context/AuthContext';

const PROGRAMS = ['BSIT', 'BSHM', 'BIT-ET', 'BIT-CT', 'BIT-AT', 'BSFI', 'BSIE'];
const YEAR_LEVELS = [1, 2, 3, 4];
const SEMESTERS = [1, 2];
const SHIFTS = ['Day', 'Night'];

const SchedulePage = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    program: '',
    yearLevel: '',
    semester: 1,
    shift: '',
    academicYear: '2024-2025'
  });
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [modalMode, setModalMode] = useState('create');
  const [conflicts, setConflicts] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0,
    conflicts: 0
  });
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showConflictWarning, setShowConflictWarning] = useState(false);
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar', 'list', 'builder', 'dragdrop'
  const [timetableView, setTimetableView] = useState('week'); // 'week', 'day'

  // Permission checks
  const canEditSchedules = user?.role === 'admin' || user?.role === 'scheduling_officer' || user?.role === 'program_manager';
  const isStudent = user?.role === 'student';
  const isProgramManager = user?.role === 'program_manager';

  // Auto-set filters based on user role
  useEffect(() => {
    if (isStudent && user) {
      setFilters({
        program: user.program || '',
        yearLevel: user.yearLevel || '',
        semester: user.semester || 1,
        shift: user.shift || '',
        academicYear: user.academicYear || '2024-2025'
      });
    } else if (isProgramManager && user?.program) {
      setFilters(prev => ({ ...prev, program: user.program }));
    }
  }, [isStudent, isProgramManager, user]);

  useEffect(() => {
    loadAllData();
  }, [filters]);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadSchedules(),
      loadSubjects(),
      loadSections(),
      loadFaculty(),
      loadRooms()
    ]);
    setLoading(false);
  };

  const loadSchedules = async () => {
    try {
      const params = { isActive: true };
      if (filters.program) params.program = filters.program;
      if (filters.yearLevel) params.yearLevel = filters.yearLevel;
      if (filters.semester) params.semester = filters.semester;
      if (filters.shift) params.shift = filters.shift;
      if (filters.academicYear) params.academicYear = filters.academicYear;

      const response = await scheduleAPI.getAll(params);
      const scheduleData = response.data.data || [];
      setSchedules(scheduleData);
      calculateStats(scheduleData);
    } catch (error) {
      console.error('Load schedules error:', error);
      toast.error('Failed to load schedules');
    }
  };

  const loadSubjects = async () => {
    try {
      const params = { isActive: true };
      if (filters.program) params.program = filters.program;
      if (filters.yearLevel) params.yearLevel = filters.yearLevel;
      if (filters.semester) params.semester = filters.semester;
      
      const response = await subjectAPI.getAll(params);
      setSubjects(response.data.data || []);
    } catch (error) {
      console.error('Load subjects error:', error);
    }
  };

  const loadSections = async () => {
    try {
      const response = await sectionAPI.getAll();
      let sectionData = response.data.data || [];
      
      if (filters.program) {
        sectionData = sectionData.filter(s => s.program === filters.program);
      }
      if (filters.yearLevel) {
        sectionData = sectionData.filter(s => s.yearLevel === parseInt(filters.yearLevel));
      }
      
      setSections(sectionData);
    } catch (error) {
      console.error('Load sections error:', error);
    }
  };

  const loadFaculty = async () => {
    try {
      const response = await facultyAPI.getAll({ isActive: true });
      setFaculty(response.data.data || []);
    } catch (error) {
      console.error('Load faculty error:', error);
    }
  };

  const loadRooms = async () => {
    try {
      const response = await roomAPI.getAll({ isActive: true });
      setRooms(response.data.data || []);
    } catch (error) {
      console.error('Load rooms error:', error);
    }
  };

  const calculateStats = (scheduleData) => {
    const published = scheduleData.filter(s => s.isPublished || s.status === 'active').length;
    const draft = scheduleData.filter(s => !s.isPublished && s.status === 'draft').length;
    
    setStats({
      total: scheduleData.length,
      published,
      draft,
      conflicts: conflicts.length
    });
  };

  const handleCreate = () => {
    setSelectedSchedule(null);
    setModalMode('create');
    setShowScheduleModal(true);
  };

  const handleGenerate = () => {
    setShowGenerateModal(true);
  };

  const handleEdit = (schedule) => {
    if (!canEditSchedules) {
      toast.info('View-only mode. Only administrators can edit schedules.');
      return;
    }
    setSelectedSchedule(schedule);
    setModalMode('edit');
    setShowScheduleModal(true);
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm('Are you sure you want to delete this schedule?');
    if (!confirmed) return;

    try {
      await scheduleAPI.delete(id);
      toast.success('Schedule deleted successfully');
      loadAllData();
    } catch (error) {
      console.error('Delete error:', error);
      
      if (error.response?.status === 403) {
        const errorMessage = error.response?.data?.message;
        if (errorMessage?.includes('program')) {
          toast.error(errorMessage);
        } else {
          toast.error('You do not have permission to delete this schedule');
        }
      } else {
        toast.error(error.response?.data?.message || 'Failed to delete schedule');
      }
    }
  };

  const handlePublish = async () => {
    try {
      const publishData = {
        program: filters.program,
        yearLevel: filters.yearLevel,
        semester: filters.semester,
        academicYear: filters.academicYear
      };

      await scheduleAPI.publish(publishData);
      toast.success('Schedule published successfully');
      loadAllData();
    } catch (error) {
      console.error('Publish error:', error);
      toast.error(error.response?.data?.message || 'Failed to publish schedule');
    }
  };

  const handleCheckConflicts = async () => {
    try {
      const conflictData = {
        program: filters.program,
        yearLevel: filters.yearLevel,
        semester: filters.semester,
        academicYear: filters.academicYear
      };

      const response = await scheduleAPI.checkConflicts(conflictData);
      const foundConflicts = response.data.conflicts || [];
      setConflicts(foundConflicts);
      setShowConflictWarning(true);

      if (foundConflicts.length === 0) {
        toast.success('No conflicts found!');
      } else {
        toast.error(`Found ${foundConflicts.length} conflicts`);
      }
    } catch (error) {
      console.error('Check conflicts error:', error);
      toast.error('Failed to check conflicts');
    }
  };

  const handleExport = (format) => {
    setShowExportMenu(false);
    
    if (schedules.length === 0) {
      toast.error('No schedules to export');
      return;
    }

    const filename = `schedule_${filters.program || 'all'}_${filters.academicYear || 'current'}`;
    
    try {
      switch (format) {
        case 'csv':
          exportToCSV(schedules, `${filename}.csv`);
          toast.success('Exported to CSV');
          break;
        case 'official':
          exportToOfficialPDF(schedules, filters);
          toast.success('Opening official schedule format');
          break;
        case 'pdf':
          exportToPrintableHTML(schedules, filters);
          toast.success('Opening print preview');
          break;
        case 'timetable':
          exportWeeklyTimetable(schedules, filters);
          toast.success('Opening timetable view');
          break;
        default:
          toast.error('Unknown export format');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export schedule');
    }
  };

  const handleModalClose = (shouldRefresh) => {
    setShowScheduleModal(false);
    setShowGenerateModal(false);
    setSelectedSchedule(null);
    if (shouldRefresh) {
      loadAllData();
    }
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    if (!isProgramManager) {
      setFilters({
        program: '',
        yearLevel: '',
        semester: 1,
        shift: '',
        academicYear: '2024-2025'
      });
    }
  };

  // Filter schedules based on search
  const filteredSchedules = schedules.filter((schedule) => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      schedule.subject?.subjectCode?.toLowerCase().includes(searchLower) ||
      schedule.subject?.subjectName?.toLowerCase().includes(searchLower) ||
      schedule.section?.toLowerCase().includes(searchLower) ||
      schedule.faculty?.user?.firstName?.toLowerCase().includes(searchLower) ||
      schedule.faculty?.user?.lastName?.toLowerCase().includes(searchLower) ||
      schedule.room?.roomCode?.toLowerCase().includes(searchLower) ||
      schedule.room?.roomName?.toLowerCase().includes(searchLower)
    );
  });

  const hasActiveFilters = searchTerm || filters.program || filters.yearLevel || filters.shift;
  const hasFilters = filters.program || filters.yearLevel;

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Schedule Management
            </h1>
            <div className="flex gap-2">
              {canEditSchedules && (
                <>
                  <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-md hover:shadow-lg text-sm"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="hidden sm:inline">Add Schedule</span>
                  </button>
                  <button
                    onClick={handleGenerate}
                    className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-md hover:shadow-lg text-sm"
                  >
                    <Wand2 className="w-5 h-5" />
                    <span className="hidden sm:inline">Generate</span>
                  </button>
                </>
              )}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors shadow-md hover:shadow-lg text-sm"
                >
                  <Download className="w-5 h-5" />
                  <span className="hidden sm:inline">Export</span>
                </button>
                
                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-10 dark:bg-gray-800 dark:border-gray-700">
                    <button
                      onClick={() => handleExport('official')}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      <FileText size={16} className="mr-3" />
                      Official Schedule (PDF)
                    </button>
                    <button
                      onClick={() => handleExport('csv')}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      <FileText size={16} className="mr-3" />
                      Export to CSV
                    </button>
                    <button
                      onClick={() => handleExport('timetable')}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      <Grid size={16} className="mr-3" />
                      Weekly Timetable
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
            {canEditSchedules ? 'Manage class schedules and timetables' : 'View class schedules'}
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          <div className="bg-blue-600 text-white rounded-xl p-4 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <CalendarIcon className="w-5 h-5 opacity-80" />
              <span className="text-xs font-medium opacity-80">TOTAL</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold">{stats.total}</div>
            <div className="text-xs opacity-80 mt-1">Schedules</div>
          </div>

          <div className="bg-green-600 text-white rounded-xl p-4 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-5 h-5 opacity-80" />
              <span className="text-xs font-medium opacity-80">PUBLISHED</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold">{stats.published}</div>
            <div className="text-xs opacity-80 mt-1">Active</div>
          </div>

          <div className="bg-orange-600 text-white rounded-xl p-4 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-5 h-5 opacity-80" />
              <span className="text-xs font-medium opacity-80">DRAFT</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold">{stats.draft}</div>
            <div className="text-xs opacity-80 mt-1">Pending</div>
          </div>

          <div className="bg-red-600 text-white rounded-xl p-4 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-5 h-5 opacity-80" />
              <span className="text-xs font-medium opacity-80">CONFLICTS</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold">{stats.conflicts}</div>
            <div className="text-xs opacity-80 mt-1">Issues</div>
          </div>
        </div>

        {/* Search and Filters */}
        {!isStudent && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6 shadow-sm">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by subject, faculty, room, or section..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-all"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <select
                  value={filters.program}
                  onChange={(e) => setFilters({ ...filters, program: e.target.value })}
                  disabled={isProgramManager}
                  className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  {isProgramManager ? (
                    <option value={user.program}>{user.program}</option>
                  ) : (
                    <>
                      <option value="">All Programs</option>
                      {PROGRAMS.map(prog => (
                        <option key={prog} value={prog}>{prog}</option>
                      ))}
                    </>
                  )}
                </select>

                <select
                  value={filters.yearLevel}
                  onChange={(e) => setFilters({ ...filters, yearLevel: e.target.value })}
                  className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm transition-all"
                >
                  <option value="">All Years</option>
                  {YEAR_LEVELS.map(year => (
                    <option key={year} value={year}>Year {year}</option>
                  ))}
                </select>

                <select
                  value={filters.semester}
                  onChange={(e) => setFilters({ ...filters, semester: parseInt(e.target.value) })}
                  className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm transition-all"
                >
                  {SEMESTERS.map(sem => (
                    <option key={sem} value={sem}>Sem {sem}</option>
                  ))}
                </select>

                <select
                  value={filters.shift}
                  onChange={(e) => setFilters({ ...filters, shift: e.target.value })}
                  className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm transition-all"
                >
                  <option value="">All Shifts</option>
                  {SHIFTS.map(shift => (
                    <option key={shift} value={shift}>{shift}</option>
                  ))}
                </select>

                {/* View Toggle */}
                <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('calendar')}
                    className={`px-3 py-2 transition-colors ${
                      viewMode === 'calendar' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                    title="Calendar View"
                  >
                    <CalendarIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-2 border-l border-gray-300 dark:border-gray-600 transition-colors ${
                      viewMode === 'list' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                    title="List View"
                  >
                    <List className="w-5 h-5" />
                  </button>
                  {canEditSchedules && (
                    <>
                      <button
                        onClick={() => setViewMode('builder')}
                        className={`px-3 py-2 border-l border-gray-300 dark:border-gray-600 transition-colors ${
                          viewMode === 'builder' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                        title="Schedule Builder"
                      >
                        <Grid className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setViewMode('dragdrop')}
                        className={`px-3 py-2 border-l border-gray-300 dark:border-gray-600 transition-colors ${
                          viewMode === 'dragdrop' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                        title="Faculty Assignment"
                      >
                        <Users className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Active Filters */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400">Active filters:</span>
                <div className="flex flex-wrap gap-2">
                  {searchTerm && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-md">
                      Search: {searchTerm}
                      <X 
                        className="w-3 h-3 cursor-pointer hover:text-blue-900 dark:hover:text-blue-100" 
                        onClick={() => setSearchTerm('')}
                      />
                    </span>
                  )}
                  {filters.program && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-md">
                      Program: {filters.program}
                      {!isProgramManager && (
                        <X 
                          className="w-3 h-3 cursor-pointer hover:text-blue-900 dark:hover:text-blue-100" 
                          onClick={() => setFilters({...filters, program: ''})}
                        />
                      )}
                    </span>
                  )}
                  {filters.yearLevel && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-md">
                      Year {filters.yearLevel}
                      <X 
                        className="w-3 h-3 cursor-pointer hover:text-blue-900 dark:hover:text-blue-100" 
                        onClick={() => setFilters({...filters, yearLevel: ''})}
                      />
                    </span>
                  )}
                  {filters.shift && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-md">
                      {filters.shift} Shift
                      <X 
                        className="w-3 h-3 cursor-pointer hover:text-blue-900 dark:hover:text-blue-100" 
                        onClick={() => setFilters({...filters, shift: ''})}
                      />
                    </span>
                  )}
                  <button
                    onClick={clearAllFilters}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline"
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {canEditSchedules && hasFilters && (
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleCheckConflicts}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
                >
                  <AlertTriangle size={18} />
                  Check Conflicts
                </button>
                <button
                  onClick={handlePublish}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  <CheckCircle size={18} />
                  Publish Schedule
                </button>
              </div>
            )}
          </div>
        )}

        {/* Student View Notice */}
        {isStudent && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-4 dark:bg-blue-900 dark:border-blue-700">
            <div className="flex items-start">
              <CalendarIcon className="text-blue-600 mt-0.5 mr-3 dark:text-blue-400" size={20} />
              <div>
                <h3 className="text-sm font-semibold text-blue-900 mb-1 dark:text-blue-100">
                  Your Class Schedule
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Showing schedules for {user?.program || 'your program'} - Year {user?.yearLevel || 'N/A'} - Section {user?.section || 'N/A'}
                  {user?.shift && ` - ${user.shift} Shift`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Conflicts Alert */}
        {conflicts.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 dark:bg-red-900 dark:border-red-700">
            <div className="flex items-start">
              <AlertTriangle className="text-red-600 mt-0.5 mr-3 dark:text-red-400" size={20} />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-900 mb-2 dark:text-red-100">
                  {conflicts.length} Conflict{conflicts.length !== 1 ? 's' : ''} Found
                </h3>
                <ul className="text-sm text-red-800 space-y-1 dark:text-red-200">
                  {conflicts.slice(0, 5).map((conflict, idx) => (
                    <li key={idx}>• {conflict.message || conflict.type}</li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => setConflicts([])}
                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-16 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400 text-lg">Loading schedules...</p>
          </div>
        ) : viewMode === 'builder' ? (
          <ScheduleBuilder 
            filters={filters}
            subjects={subjects}
            sections={sections}
            faculty={faculty}
            rooms={rooms}
            onAssignmentChange={loadAllData}
          />
        ) : viewMode === 'dragdrop' ? (
          <FacultyDragDrop 
            filters={filters}
            faculty={faculty}
            onAssignmentChange={loadAllData}
          />
        ) : viewMode === 'list' ? (
          /* LIST VIEW */
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            {filteredSchedules.length === 0 ? (
              <div className="p-16 text-center">
                <CalendarIcon className="w-20 h-20 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No schedules found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {searchTerm || hasActiveFilters
                    ? 'Try adjusting your search or filter criteria'
                    : 'Get started by creating your first schedule'
                  }
                </p>
                {canEditSchedules && !searchTerm && !hasActiveFilters && (
                  <button
                    onClick={handleCreate}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors inline-flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Add First Schedule
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Subject
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Section
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Faculty
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Room
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Schedule
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      {canEditSchedules && (
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredSchedules.map((schedule) => (
                      <tr 
                        key={schedule._id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center">
                            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2 flex-shrink-0" />
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {schedule.subject?.subjectCode || 'N/A'}
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                                {schedule.subject?.subjectName || ''}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <School className="w-4 h-4 text-purple-600 dark:text-purple-400 mr-2" />
                            <span className="text-sm text-gray-900 dark:text-white">
                              {schedule.section || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {schedule.faculty ? 
                              `${schedule.faculty.user?.firstName || ''} ${schedule.faculty.user?.lastName || ''}`.trim() || 'N/A'
                              : 'N/A'
                            }
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 text-green-600 dark:text-green-400 mr-2" />
                            <span className="text-sm text-gray-900 dark:text-white">
                              {schedule.room?.roomCode || schedule.room?.roomNumber || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-gray-900 dark:text-white space-y-1">
                            {schedule.timeSlots && schedule.timeSlots.length > 0 ? (
                              schedule.timeSlots.slice(0, 2).map((ts, idx) => (
                                <div key={idx} className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-gray-400" />
                                  <span>{ts.day}: {ts.startTime} - {ts.endTime}</span>
                                </div>
                              ))
                            ) : (
                              <span className="text-gray-400">No time slots</span>
                            )}
                            {schedule.timeSlots && schedule.timeSlots.length > 2 && (
                              <div className="text-xs text-gray-500">
                                +{schedule.timeSlots.length - 2} more
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            schedule.isPublished || schedule.status === 'active'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                              : 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                          }`}>
                            {schedule.isPublished || schedule.status === 'active' ? 'Published' : 'Draft'}
                          </span>
                        </td>
                        {canEditSchedules && (
                          <td className="px-4 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEdit(schedule)}
                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(schedule._id)}
                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* CALENDAR VIEW */
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            {/* Week/Day Toggle */}
            <div className="flex justify-end gap-2 mb-4">
              <button
                onClick={() => setTimetableView('week')}
                className={`px-4 py-2 rounded-lg transition-colors text-sm ${
                  timetableView === 'week'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Week View
              </button>
              <button
                onClick={() => setTimetableView('day')}
                className={`px-4 py-2 rounded-lg transition-colors text-sm ${
                  timetableView === 'day'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Day View
              </button>
            </div>

            <TimetableGrid
              schedules={filteredSchedules}
              onScheduleClick={handleEdit}
              canEdit={canEditSchedules}
              viewMode={timetableView}
              shift={filters.shift || 'all'}
            />

            {/* Legend */}
            <div className="mt-4 flex items-center gap-4 text-sm">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                <span className="text-gray-700 dark:text-gray-300">Published</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-orange-500 rounded mr-2"></div>
                <span className="text-gray-700 dark:text-gray-300">Draft</span>
              </div>
            </div>
          </div>
        )}

        {/* View Mode Info */}
        {(viewMode === 'builder' || viewMode === 'dragdrop') && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 dark:bg-blue-900 dark:border-blue-700">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              {viewMode === 'builder' && '📚 Schedule Builder: Drag subjects to time slots, select duration (1-3 hours), then assign faculty and rooms'}
              {viewMode === 'dragdrop' && '👨‍🏫 Faculty Assignment: Drag faculty members to existing schedule slots to reassign them'}
            </p>
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <ScheduleModal
          mode={modalMode}
          schedule={selectedSchedule}
          subjects={subjects}
          sections={sections}
          faculty={faculty}
          rooms={rooms}
          onClose={handleModalClose}
          onDelete={handleDelete}
        />
      )}

      {/* Generate Modal */}
      {showGenerateModal && (
        <GenerateScheduleModal
          onClose={handleModalClose}
        />
      )}

      {/* Conflict Warning */}
      {showConflictWarning && conflicts.length > 0 && (
        <ConflictWarning
          conflicts={conflicts}
          onDismiss={() => setShowConflictWarning(false)}
        />
      )}
    </Layout>
  );
};

export default SchedulePage;
