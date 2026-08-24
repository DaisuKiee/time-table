import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { facultyAPI } from '../services/api';
import toast from 'react-hot-toast';
import { 
  Plus, Search, Edit2, Trash2, Eye, X,
  User, Mail, Phone, BookOpen, Award, FileText,
  Users, UserCheck, TrendingUp, AlertCircle,
  Grid3x3, List
} from 'lucide-react';
import FacultyModal from '../components/FacultyModal';
import FacultyDetailsModal from '../components/FacultyDetailsModal';
import ExcelImportModal from '../components/ExcelImportModal';

const FacultyPage = () => {
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecialization, setFilterSpecialization] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showExcelImportModal, setShowExcelImportModal] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'

  useEffect(() => {
    loadFaculty();
  }, []);

  const loadFaculty = async () => {
    try {
      setLoading(true);
      // Only load active faculty (excluding soft-deleted ones)
      const response = await facultyAPI.getAll({ isActive: true });
      setFaculty(response.data.data || []);
    } catch (error) {
      console.error('Load faculty error:', error);
      toast.error('Failed to load faculty');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedFaculty(null);
    setModalMode('create');
    setShowModal(true);
  };

  const handleEdit = (facultyMember) => {
    setSelectedFaculty(facultyMember);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleView = (facultyMember) => {
    setSelectedFaculty(facultyMember);
    setShowDetailsModal(true);
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm('Are you sure you want to delete this faculty member?');
    if (!confirmed) return;

    try {
      await facultyAPI.delete(id);
      toast.success('Faculty member deleted successfully');
      loadFaculty();
    } catch (error) {
      console.error('Delete error:', error);
      
      // Show specific error message from backend
      if (error.response?.status === 403) {
        toast.error(error.response?.data?.message || 'You do not have permission to delete this faculty member');
      } else {
        toast.error(error.response?.data?.message || 'Failed to delete faculty member');
      }
    }
  };

  const handleModalClose = (shouldRefresh) => {
    setShowModal(false);
    setSelectedFaculty(null);
    if (shouldRefresh) {
      loadFaculty();
    }
  };

  const handleExcelImportComplete = () => {
    setShowExcelImportModal(false);
    loadFaculty();
  };

  // Filter faculty based on search and specialization
  const filteredFaculty = faculty.filter((f) => {
    const matchesSearch = 
      f.user?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.user?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSpecialization = 
      !filterSpecialization || 
      f.specialization?.some(s => s.toLowerCase().includes(filterSpecialization.toLowerCase()));
    
    return matchesSearch && matchesSpecialization;
  });

  // Get unique specializations for filter
  const allSpecializations = [...new Set(faculty.flatMap(f => f.specialization || []))];

  const hasActiveFilters = searchTerm || filterSpecialization;

  // Calculate statistics
  const stats = {
    total: faculty.length,
    active: faculty.filter(f => f.isActive).length,
    avgLoad: faculty.length > 0 
      ? Math.round(faculty.reduce((sum, f) => sum + (f.currentLoad || 0), 0) / faculty.length)
      : 0,
    overloaded: faculty.filter(f => (f.currentLoad || 0) > f.maxLoad).length
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Faculty Management
            </h1>
            <div className="flex gap-2">
              <button
                onClick={() => setShowExcelImportModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-md hover:shadow-lg text-sm"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Excel</span>
              </button>
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors shadow-md hover:shadow-lg text-sm"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Add Faculty</span>
              </button>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
            Manage faculty profiles, qualifications, and workload
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          <div className="bg-teal-600 text-white rounded-xl p-4 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 opacity-80" />
              <span className="text-xs font-medium opacity-80">TOTAL</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold">{stats.total}</div>
            <div className="text-xs opacity-80 mt-1">Faculty Members</div>
          </div>

          <div className="bg-green-600 text-white rounded-xl p-4 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <UserCheck className="w-5 h-5 opacity-80" />
              <span className="text-xs font-medium opacity-80">ACTIVE</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold">{stats.active}</div>
            <div className="text-xs opacity-80 mt-1">Active Faculty</div>
          </div>

          <div className="bg-blue-600 text-white rounded-xl p-4 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 opacity-80" />
              <span className="text-xs font-medium opacity-80">AVG LOAD</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold">{stats.avgLoad}</div>
            <div className="text-xs opacity-80 mt-1">Hours/Week</div>
          </div>

          <div className="bg-red-600 text-white rounded-xl p-4 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="w-5 h-5 opacity-80" />
              <span className="text-xs font-medium opacity-80">OVERLOAD</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold">{stats.overloaded}</div>
            <div className="text-xs opacity-80 mt-1">Over Capacity</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, email, or employee ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-all"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <select
                value={filterSpecialization}
                onChange={(e) => setFilterSpecialization(e.target.value)}
                className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm transition-all"
              >
                <option value="">All Specializations</option>
                {allSpecializations.map((spec) => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>

              {/* View Toggle */}
              <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-2 transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-teal-600 text-white' 
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                  title="Grid View"
                >
                  <Grid3x3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 border-l border-gray-300 dark:border-gray-600 transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-teal-600 text-white' 
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                  title="List View"
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-600 dark:text-gray-400">Active filters:</span>
              <div className="flex flex-wrap gap-2">
                {searchTerm && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 text-xs rounded-md">
                    Search: {searchTerm}
                    <X 
                      className="w-3 h-3 cursor-pointer hover:text-teal-900 dark:hover:text-teal-100" 
                      onClick={() => setSearchTerm('')}
                    />
                  </span>
                )}
                {filterSpecialization && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 text-xs rounded-md">
                    Specialization: {filterSpecialization}
                    <X 
                      className="w-3 h-3 cursor-pointer hover:text-teal-900 dark:hover:text-teal-100" 
                      onClick={() => setFilterSpecialization('')}
                    />
                  </span>
                )}
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterSpecialization('');
                  }}
                  className="text-xs text-red-600 dark:text-red-400 hover:underline"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}
        </div>
        {/* Faculty List */}
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-teal-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400 text-lg">Loading faculty...</p>
          </div>
        ) : filteredFaculty.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
            <Users className="w-20 h-20 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {faculty.length === 0 ? 'No faculty members yet' : 'No faculty found'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {faculty.length === 0 
                ? 'Get started by adding your first faculty member'
                : 'Try adjusting your search or filter criteria'
              }
            </p>
            {faculty.length === 0 && (
              <button
                onClick={handleCreate}
                className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add First Faculty
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFaculty.map((facultyMember) => (
              <div
                key={facultyMember._id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-xl hover:border-teal-300 dark:hover:border-teal-700 transition-all duration-200 transform hover:-translate-y-1"
              >
                {/* Faculty Header */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex-shrink-0">
                    <div className="h-14 w-14 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center ring-2 ring-teal-200 dark:ring-teal-800">
                      <User className="w-7 h-7 text-teal-600 dark:text-teal-400" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 dark:text-white text-base truncate">
                      {facultyMember.user?.firstName} {facultyMember.user?.lastName}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {facultyMember.user?.email}
                    </p>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300 text-xs font-bold rounded">
                      {facultyMember.employeeId}
                    </span>
                  </div>
                </div>

                {/* Specializations */}
                {facultyMember.specialization && facultyMember.specialization.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {facultyMember.specialization.slice(0, 3).map((spec, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
                        >
                          {spec}
                        </span>
                      ))}
                      {facultyMember.specialization.length > 3 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300">
                          +{facultyMember.specialization.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Workload Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-gray-600 dark:text-gray-400 font-medium">Workload</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {facultyMember.currentLoad || 0} / {facultyMember.maxLoad} hrs
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        (facultyMember.currentLoad || 0) > facultyMember.maxLoad
                          ? 'bg-red-600'
                          : ((facultyMember.currentLoad || 0) / facultyMember.maxLoad) > 0.8
                          ? 'bg-orange-500'
                          : 'bg-green-600'
                      }`}
                      style={{ width: `${Math.min(((facultyMember.currentLoad || 0) / facultyMember.maxLoad) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Status Badge */}
                <div className="mb-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      facultyMember.isActive
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                    }`}
                  >
                    {facultyMember.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => handleView(facultyMember)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-sm hover:shadow-md font-medium"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button
                    onClick={() => handleEdit(facultyMember)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-all shadow-sm hover:shadow-md font-medium"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(facultyMember._id)}
                    className="px-3 py-2.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all shadow-sm hover:shadow-md font-medium"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Faculty
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Employee ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Specialization
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Workload
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredFaculty.map((facultyMember) => (
                    <tr 
                      key={facultyMember._id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-teal-100 dark:bg-teal-900 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {facultyMember.user?.firstName} {facultyMember.user?.lastName}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                              <Mail className="w-3 h-3 mr-1" />
                              {facultyMember.user?.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300 text-xs font-bold rounded">
                          {facultyMember.employeeId}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1">
                          {facultyMember.specialization?.slice(0, 2).map((spec, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
                            >
                              {spec}
                            </span>
                          ))}
                          {facultyMember.specialization?.length > 2 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300">
                              +{facultyMember.specialization.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-1 min-w-[120px]">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-gray-600 dark:text-gray-400">
                                {facultyMember.currentLoad || 0} / {facultyMember.maxLoad} hrs
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  (facultyMember.currentLoad || 0) > facultyMember.maxLoad
                                    ? 'bg-red-600'
                                    : ((facultyMember.currentLoad || 0) / facultyMember.maxLoad) > 0.8
                                    ? 'bg-orange-500'
                                    : 'bg-green-600'
                                }`}
                                style={{
                                  width: `${Math.min(
                                    ((facultyMember.currentLoad || 0) / facultyMember.maxLoad) * 100,
                                    100
                                  )}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            facultyMember.isActive
                              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                              : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                          }`}
                        >
                          {facultyMember.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleView(facultyMember)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(facultyMember)}
                            className="p-2 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(facultyMember._id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <FacultyModal
          mode={modalMode}
          faculty={selectedFaculty}
          onClose={handleModalClose}
        />
      )}

      {/* Details Modal */}
      {showDetailsModal && (
        <FacultyDetailsModal
          faculty={selectedFaculty}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedFaculty(null);
          }}
          onEdit={() => {
            setShowDetailsModal(false);
            handleEdit(selectedFaculty);
          }}
        />
      )}

      {/* Excel Import Modal */}
      {showExcelImportModal && (
        <ExcelImportModal
          type="faculty"
          onClose={() => setShowExcelImportModal(false)}
          onComplete={handleExcelImportComplete}
        />
      )}
    </Layout>
  );
};

export default FacultyPage;
