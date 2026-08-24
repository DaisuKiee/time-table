import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { classSpaceAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { 
  BookOpen, Bell, FileText, Users, Plus, Upload, 
  UserPlus, Search, Filter, Download, Trash2, Pin,
  Calendar, Clock, User, X, Edit2
} from 'lucide-react';
import CreateAnnouncementModal from '../components/CreateAnnouncementModal';
import UploadMaterialModal from '../components/UploadMaterialModal';
import EnrollModal from '../components/EnrollModal';

const ClassSpacePage = () => {
  const { user } = useAuth();
  const [classSpaces, setClassSpaces] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('announcements');
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const isFaculty = user?.role === 'faculty';
  const isStudent = user?.role === 'student';
  const isAdmin = user?.role === 'admin' || user?.role === 'scheduling_officer';

  useEffect(() => {
    loadClassSpaces();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      refreshSelectedClass();
    }
  }, [activeTab]);

  const loadClassSpaces = async () => {
    try {
      setLoading(true);
      let response;
      
      if (isStudent) {
        // Students see only their enrolled classes
        response = await classSpaceAPI.getMyClasses();
      } else {
        // Faculty and admin see all classes
        response = await classSpaceAPI.getAll();
      }

      const spaces = response.data.data || [];
      setClassSpaces(spaces);
      
      if (spaces.length > 0 && !selectedClass) {
        setSelectedClass(spaces[0]);
      }
    } catch (error) {
      console.error('Load class spaces error:', error);
      toast.error('Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  const refreshSelectedClass = async () => {
    if (!selectedClass) return;
    
    try {
      const response = await classSpaceAPI.getById(selectedClass._id);
      setSelectedClass(response.data.data);
      
      // Update in list
      setClassSpaces(prev => 
        prev.map(cs => cs._id === selectedClass._id ? response.data.data : cs)
      );
    } catch (error) {
      console.error('Refresh class error:', error);
    }
  };

  const handleCreateAnnouncement = () => {
    setEditingAnnouncement(null);
    setShowAnnouncementModal(true);
  };

  const handleEditAnnouncement = (announcement) => {
    setEditingAnnouncement(announcement);
    setShowAnnouncementModal(true);
  };

  const handleDeleteAnnouncement = async (announcementId) => {
    if (!window.confirm('Delete this announcement?')) return;

    try {
      await classSpaceAPI.deleteAnnouncement(selectedClass._id, announcementId);
      toast.success('Announcement deleted');
      refreshSelectedClass();
    } catch (error) {
      console.error('Delete announcement error:', error);
      toast.error('Failed to delete announcement');
    }
  };

  const handleDeleteMaterial = async (materialId) => {
    if (!window.confirm('Delete this material?')) return;

    try {
      await classSpaceAPI.deleteMaterial(selectedClass._id, materialId);
      toast.success('Material deleted');
      refreshSelectedClass();
    } catch (error) {
      console.error('Delete material error:', error);
      toast.error('Failed to delete material');
    }
  };

  const handleEnroll = () => {
    setShowEnrollModal(true);
  };

  const handleModalClose = (shouldRefresh) => {
    setShowAnnouncementModal(false);
    setShowMaterialModal(false);
    setShowEnrollModal(false);
    setEditingAnnouncement(null);
    
    if (shouldRefresh) {
      refreshSelectedClass();
      if (shouldRefresh === 'reload') {
        loadClassSpaces();
      }
    }
  };

  const filteredClasses = classSpaces.filter(cs => {
    const searchLower = searchTerm.toLowerCase();
    const subjectCode = cs.schedule?.subject?.subjectCode || '';
    const subjectName = cs.schedule?.subject?.subjectName || '';
    const sectionCode = cs.sectionCode || '';
    
    return subjectCode.toLowerCase().includes(searchLower) ||
           subjectName.toLowerCase().includes(searchLower) ||
           sectionCode.toLowerCase().includes(searchLower);
  });

  // Sort announcements: pinned first, then by date
  const sortedAnnouncements = selectedClass?.announcements 
    ? [...selectedClass.announcements].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      })
    : [];

  const sortedMaterials = selectedClass?.materials
    ? [...selectedClass.materials].sort((a, b) => 
        new Date(b.uploadedAt) - new Date(a.uploadedAt)
      )
    : [];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (classSpaces.length === 0) {
    return (
      <Layout>
        <div className="text-center py-12">
          <BookOpen size={64} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Classes Yet</h2>
          <p className="text-gray-600 mb-6">
            {isStudent 
              ? 'Enroll in classes to get started'
              : 'Class spaces will appear here once schedules are published'}
          </p>
          {isStudent && (
            <button
              onClick={handleEnroll}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <UserPlus className="inline mr-2" size={20} />
              Enroll in Class
            </button>
          )}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar - Class List */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-3">My Classes</h2>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search classes..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Enroll Button for Students */}
            {isStudent && (
              <button
                onClick={handleEnroll}
                className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center text-sm"
              >
                <UserPlus size={16} className="mr-2" />
                Enroll in Class
              </button>
            )}
          </div>

          {/* Class List */}
          <div className="flex-1 overflow-y-auto">
            {filteredClasses.map((cs) => (
              <div
                key={cs._id}
                onClick={() => setSelectedClass(cs)}
                className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedClass?._id === cs._id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-semibold text-gray-900 text-sm">
                    {cs.schedule?.subject?.subjectCode}
                  </h3>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {cs.sectionCode}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-2 line-clamp-1">
                  {cs.schedule?.subject?.subjectName}
                </p>
                <div className="flex items-center text-xs text-gray-500">
                  <User size={12} className="mr-1" />
                  {cs.schedule?.faculty?.user?.firstName} {cs.schedule?.faculty?.user?.lastName}
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                  <span className="flex items-center">
                    <Bell size={12} className="mr-1" />
                    {cs.announcements?.length || 0}
                  </span>
                  <span className="flex items-center">
                    <FileText size={12} className="mr-1" />
                    {cs.materials?.length || 0}
                  </span>
                  <span className="flex items-center">
                    <Users size={12} className="mr-1" />
                    {cs.enrolledStudents?.length || 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {selectedClass && (
            <>
              {/* Header */}
              <div className="bg-white border-b border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-2xl font-bold text-gray-900">
                        {selectedClass.schedule?.subject?.subjectCode}
                      </h1>
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        {selectedClass.sectionCode}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-3">
                      {selectedClass.schedule?.subject?.subjectName}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center">
                        <User size={16} className="mr-1" />
                        {selectedClass.schedule?.faculty?.user?.firstName}{' '}
                        {selectedClass.schedule?.faculty?.user?.lastName}
                      </span>
                      <span className="flex items-center">
                        <Users size={16} className="mr-1" />
                        {selectedClass.enrolledStudents?.length || 0} students
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {(isFaculty || isAdmin) && (
                    <div className="flex gap-2">
                      {activeTab === 'announcements' && (
                        <button
                          onClick={handleCreateAnnouncement}
                          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          <Plus size={18} className="mr-2" />
                          New Announcement
                        </button>
                      )}
                      {activeTab === 'materials' && (
                        <button
                          onClick={() => setShowMaterialModal(true)}
                          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          <Upload size={18} className="mr-2" />
                          Upload Material
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mt-4 border-b border-gray-200">
                  <button
                    onClick={() => setActiveTab('announcements')}
                    className={`flex items-center px-4 py-2 border-b-2 transition-colors ${
                      activeTab === 'announcements'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Bell size={18} className="mr-2" />
                    Announcements
                    <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">
                      {sortedAnnouncements.length}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab('materials')}
                    className={`flex items-center px-4 py-2 border-b-2 transition-colors ${
                      activeTab === 'materials'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <FileText size={18} className="mr-2" />
                    Materials
                    <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">
                      {sortedMaterials.length}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab('students')}
                    className={`flex items-center px-4 py-2 border-b-2 transition-colors ${
                      activeTab === 'students'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Users size={18} className="mr-2" />
                    Students
                    <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">
                      {selectedClass.enrolledStudents?.length || 0}
                    </span>
                  </button>
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Announcements Tab */}
                {activeTab === 'announcements' && (
                  <div className="space-y-4">
                    {sortedAnnouncements.length === 0 ? (
                      <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                        <Bell size={48} className="mx-auto text-gray-400 mb-3" />
                        <p className="text-gray-600">No announcements yet</p>
                      </div>
                    ) : (
                      sortedAnnouncements.map((announcement) => (
                        <div
                          key={announcement._id}
                          className={`bg-white rounded-lg shadow-sm border ${
                            announcement.isPinned ? 'border-blue-300 border-2' : 'border-gray-200'
                          } p-6`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {announcement.isPinned && (
                                  <Pin size={16} className="text-blue-600" />
                                )}
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {announcement.title}
                                </h3>
                              </div>
                              <div className="flex items-center text-sm text-gray-500 gap-3">
                                <span className="flex items-center">
                                  <User size={14} className="mr-1" />
                                  {announcement.postedBy?.firstName} {announcement.postedBy?.lastName}
                                </span>
                                <span className="flex items-center">
                                  <Clock size={14} className="mr-1" />
                                  {new Date(announcement.createdAt).toLocaleDateString()} at{' '}
                                  {new Date(announcement.createdAt).toLocaleTimeString()}
                                </span>
                              </div>
                            </div>
                            {(isFaculty || isAdmin) && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditAnnouncement(announcement)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteAnnouncement(announcement._id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            )}
                          </div>
                          <p className="text-gray-700 whitespace-pre-wrap">{announcement.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Materials Tab */}
                {activeTab === 'materials' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sortedMaterials.length === 0 ? (
                      <div className="col-span-full text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                        <FileText size={48} className="mx-auto text-gray-400 mb-3" />
                        <p className="text-gray-600">No materials uploaded yet</p>
                      </div>
                    ) : (
                      sortedMaterials.map((material) => (
                        <div
                          key={material._id}
                          className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <FileText className="text-blue-600 flex-shrink-0" size={24} />
                            {(isFaculty || isAdmin) && (
                              <button
                                onClick={() => handleDeleteMaterial(material._id)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                          <h4 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                            {material.title}
                          </h4>
                          {material.description && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                              {material.description}
                            </p>
                          )}
                          <div className="text-xs text-gray-500 mb-3">
                            <p className="truncate">{material.fileName}</p>
                            <p>
                              {(material.fileSize / 1024).toFixed(2)} KB •{' '}
                              {new Date(material.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <a
                            href={material.fileUrl}
                            download
                            className="flex items-center justify-center w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                          >
                            <Download size={16} className="mr-2" />
                            Download
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Students Tab */}
                {activeTab === 'students' && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Student Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Email
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Enrolled
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {selectedClass.enrolledStudents?.length === 0 ? (
                            <tr>
                              <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                                No students enrolled yet
                              </td>
                            </tr>
                          ) : (
                            selectedClass.enrolledStudents?.map((enrollment) => (
                              <tr key={enrollment._id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="font-medium text-gray-900">
                                    {enrollment.student?.firstName} {enrollment.student?.lastName}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                  {enrollment.student?.email}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span
                                    className={`px-2 py-1 text-xs rounded-full ${
                                      enrollment.isRegular
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-orange-100 text-orange-800'
                                    }`}
                                  >
                                    {enrollment.isRegular ? 'Regular' : 'Irregular'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                  {new Date(enrollment.enrolledAt).toLocaleDateString()}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAnnouncementModal && (
        <CreateAnnouncementModal
          classSpaceId={selectedClass._id}
          announcement={editingAnnouncement}
          onClose={handleModalClose}
        />
      )}

      {showMaterialModal && (
        <UploadMaterialModal
          classSpaceId={selectedClass._id}
          onClose={handleModalClose}
        />
      )}

      {showEnrollModal && (
        <EnrollModal
          onClose={handleModalClose}
        />
      )}
    </Layout>
  );
};

export default ClassSpacePage;
