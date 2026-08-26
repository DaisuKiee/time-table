import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { classSpaceAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  BookOpen, Bell, FileText, Users, Plus, Upload,
  UserPlus, Search, Download, Trash2, Pin,
  User, X, Edit2, ChevronLeft,
  TrendingUp, MessageSquare, MoreVertical, FolderOpen, Image
} from 'lucide-react';
import CreateAnnouncementModal from '../components/CreateAnnouncementModal';
import UploadMaterialModal from '../components/UploadMaterialModal';
import EnrollModal from '../components/EnrollModal';

// Card header colors — cycles through for variety like Google Classroom
const CARD_COLORS = [
  'bg-blue-600',
  'bg-green-700',
  'bg-purple-700',
  'bg-teal-700',
  'bg-red-700',
  'bg-orange-600',
  'bg-indigo-700',
  'bg-pink-700',
  'bg-cyan-700',
  'bg-emerald-700',
];

const ClassSpacePage = () => {
  const { user } = useAuth();
  const [classSpaces, setClassSpaces] = useState([]);
  const [notEnrolled, setNotEnrolled] = useState(false); // student has no sectionCode yet
  const [selectedClass, setSelectedClass] = useState(null); // null = grid view
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stream');
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const isFaculty = user?.role === 'faculty';
  const isStudent = user?.role === 'student';
  const isAdmin = user?.role === 'admin' || user?.role === 'scheduling_officer';
  const isManager = user?.role === 'program_manager';
  const isManagerOrAdmin = isAdmin || isManager;
  const canManage = isFaculty || isManagerOrAdmin;

  useEffect(() => {
    loadClassSpaces();
  }, []);

  const loadClassSpaces = async () => {
    try {
      setLoading(true);
      const response = isStudent
        ? await classSpaceAPI.getMyClasses()
        : await classSpaceAPI.getAll();

      // enrolled: false means student exists but has no sectionCode yet
      if (response.data.enrolled === false) {
        setNotEnrolled(true);
        setClassSpaces([]);
      } else {
        setNotEnrolled(false);
        setClassSpaces(response.data.data || []);
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
      const updated = response.data.data;
      setSelectedClass(updated);
      setClassSpaces(prev => prev.map(cs => cs._id === updated._id ? updated : cs));
    } catch (error) {
      console.error('Refresh class error:', error);
    }
  };

  const handleModalClose = (shouldRefresh) => {
    setShowAnnouncementModal(false);
    setShowMaterialModal(false);
    setShowEnrollModal(false);
    setEditingAnnouncement(null);
    if (shouldRefresh === 'reload') loadClassSpaces();
    else if (shouldRefresh) refreshSelectedClass();
  };

  const handleDeleteAnnouncement = async (announcementId) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await classSpaceAPI.deleteAnnouncement(selectedClass._id, announcementId);
      toast.success('Announcement deleted');
      refreshSelectedClass();
    } catch {
      toast.error('Failed to delete announcement');
    }
  };

  const handleDeleteMaterial = async (materialId) => {
    if (!window.confirm('Delete this material?')) return;
    try {
      await classSpaceAPI.deleteMaterial(selectedClass._id, materialId);
      toast.success('Material deleted');
      refreshSelectedClass();
    } catch {
      toast.error('Failed to delete material');
    }
  };

  const filteredClasses = classSpaces.filter(cs => {
    const q = searchTerm.toLowerCase();
    return (
      (cs.schedule?.subject?.subjectCode || '').toLowerCase().includes(q) ||
      (cs.schedule?.subject?.subjectName || '').toLowerCase().includes(q) ||
      (cs.sectionCode || '').toLowerCase().includes(q)
    );
  });

  const sortedAnnouncements = selectedClass?.announcements
    ? [...selectedClass.announcements].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      })
    : [];

  const sortedMaterials = selectedClass?.materials
    ? [...selectedClass.materials].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
    : [];

  const streamItems = [];
  if (selectedClass) {
    sortedAnnouncements.forEach(ann =>
      streamItems.push({ type: 'announcement', data: ann, timestamp: new Date(ann.createdAt) })
    );
    sortedMaterials.forEach(mat =>
      streamItems.push({ type: 'material', data: mat, timestamp: new Date(mat.uploadedAt) })
    );
    streamItems.sort((a, b) => b.timestamp - a.timestamp);
  }

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading classes...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // ─── Detail view (class selected) ─────────────────────────────────────────
  if (selectedClass) {
    const colorIndex = classSpaces.indexOf(selectedClass) % CARD_COLORS.length;
    const headerColor = CARD_COLORS[colorIndex];
    const subjectCode = selectedClass.schedule?.subject?.subjectCode || selectedClass.sectionCode;
    const subjectName = selectedClass.schedule?.subject?.subjectName || '';
    const facultyName = selectedClass.schedule?.faculty?.user
      ? `${selectedClass.schedule.faculty.user.firstName} ${selectedClass.schedule.faculty.user.lastName}`
      : null;

    return (
      <Layout>
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
          {/* Top bar */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center gap-4">
            <button
              onClick={() => { setSelectedClass(null); setActiveTab('stream'); }}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="font-medium">All Classes</span>
            </button>
            <div className="text-gray-300 dark:text-gray-600">|</div>
            <span className="font-semibold text-gray-900 dark:text-white">{subjectCode}</span>
          </div>

          <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
            {/* Class header banner */}
            <div className={`${headerColor} rounded-2xl p-8 text-white relative overflow-hidden`}>
              <div className="relative z-10">
                <p className="text-sm font-medium opacity-80 mb-1">{selectedClass.sectionCode}</p>
                <h1 className="text-3xl font-bold mb-1">{subjectCode}</h1>
                {subjectName && <p className="text-lg opacity-90">{subjectName}</p>}
                {facultyName && (
                  <p className="text-sm opacity-75 mt-2">{facultyName}</p>
                )}
              </div>
              <div className="absolute right-6 bottom-6 opacity-10">
                <BookOpen className="w-32 h-32" />
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
              <div className="flex border-b border-gray-200 dark:border-gray-700">
                {[
                  { key: 'stream', label: 'Stream', icon: TrendingUp, count: streamItems.length },
                  { key: 'materials', label: 'Classwork', icon: FileText, count: sortedMaterials.length },
                  { key: 'people', label: 'People', icon: Users, count: selectedClass.enrolledStudents?.length || 0 },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 font-medium text-sm transition-all ${
                      activeTab === tab.key
                        ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                    <span className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full text-xs">
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="p-6">
                {/* ── Stream Tab ── */}
                {activeTab === 'stream' && (
                  <div className="space-y-4">
                    {canManage && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => { setEditingAnnouncement(null); setShowAnnouncementModal(true); }}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all"
                        >
                          <MessageSquare className="w-5 h-5" />
                          Announce
                        </button>
                        <button
                          onClick={() => setShowMaterialModal(true)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-all"
                        >
                          <Upload className="w-5 h-5" />
                          Upload Material
                        </button>
                      </div>
                    )}

                    {streamItems.length === 0 ? (
                      <div className="text-center py-16">
                        <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400">Nothing posted yet</p>
                      </div>
                    ) : (
                      streamItems.map((item, i) => (
                        <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                          {item.type === 'announcement' ? (
                            <div className="p-5">
                              {item.data.isPinned && (
                                <div className="flex items-center gap-1 text-blue-600 text-xs font-semibold mb-2">
                                  <Pin className="w-3 h-3" /> Pinned
                                </div>
                              )}
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 flex-1">
                                  <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                                    <Bell className="w-4 h-4 text-blue-600" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1 text-sm text-gray-500">
                                      <span className="font-medium text-gray-900 dark:text-white">
                                        {item.data.postedBy?.firstName} {item.data.postedBy?.lastName}
                                      </span>
                                      · {new Date(item.data.createdAt).toLocaleDateString()}
                                    </div>
                                    <p className="font-semibold text-gray-900 dark:text-white mb-1">{item.data.title}</p>
                                    <p className="text-gray-600 dark:text-gray-300 text-sm whitespace-pre-wrap">{item.data.content}</p>
                                  </div>
                                </div>
                                {canManage && (
                                  <div className="flex gap-1">
                                    <button onClick={() => { setEditingAnnouncement(item.data); setShowAnnouncementModal(true); }} className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors">
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDeleteAnnouncement(item.data._id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="p-5 flex items-start gap-4">
                              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-xl flex items-center justify-center flex-shrink-0">
                                <FileText className="w-5 h-5 text-green-600" />
                              </div>
                              <div className="flex-1">
                                <div className="text-xs text-gray-500 mb-1">
                                  Material · {new Date(item.data.uploadedAt).toLocaleDateString()}
                                </div>
                                <p className="font-semibold text-gray-900 dark:text-white mb-1">{item.data.title}</p>
                                {item.data.description && (
                                  <p className="text-sm text-gray-500 mb-2">{item.data.description}</p>
                                )}
                                <div className="flex items-center gap-3">
                                  <a href={item.data.fileUrl} download className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors">
                                    <Download className="w-3.5 h-3.5" /> Download
                                  </a>
                                  <span className="text-xs text-gray-400">{(item.data.fileSize / 1024).toFixed(1)} KB</span>
                                  {canManage && (
                                    <button onClick={() => handleDeleteMaterial(item.data._id)} className="ml-auto p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* ── Classwork Tab ── */}
                {activeTab === 'materials' && (
                  <div>
                    {canManage && (
                      <button
                        onClick={() => setShowMaterialModal(true)}
                        className="w-full mb-5 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-all"
                      >
                        <Upload className="w-5 h-5" /> Upload Material
                      </button>
                    )}
                    {sortedMaterials.length === 0 ? (
                      <div className="text-center py-12">
                        <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No materials yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {sortedMaterials.map((mat, i) => (
                          <div key={i} className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-xl flex items-center justify-center flex-shrink-0">
                              <FileText className="w-5 h-5 text-green-600" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 dark:text-white">{mat.title}</p>
                              <p className="text-xs text-gray-500">{(mat.fileSize / 1024).toFixed(1)} KB · {new Date(mat.uploadedAt).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <a href={mat.fileUrl} download className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900 rounded-lg transition-colors">
                                <Download className="w-4 h-4" />
                              </a>
                              {canManage && (
                                <button onClick={() => handleDeleteMaterial(mat._id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── People Tab ── */}
                {activeTab === 'people' && (
                  <div className="space-y-4">
                    {/* Instructor */}
                    {facultyName && (
                      <div>
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Instructor</h3>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                              {selectedClass.schedule.faculty.user.firstName?.[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{facultyName}</p>
                            <p className="text-xs text-gray-500">Instructor</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Students */}
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        Students ({selectedClass.enrolledStudents?.length || 0})
                      </h3>
                      {(selectedClass.enrolledStudents?.length || 0) === 0 ? (
                        <div className="text-center py-8">
                          <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500 text-sm">No students enrolled yet</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {selectedClass.enrolledStudents.map((enr, i) => {
                            const s = enr.student || enr;
                            const firstName = s?.firstName || '?';
                            const lastName = s?.lastName || '';
                            return (
                              <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                <div className="w-9 h-9 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                                  <span className="text-gray-700 dark:text-gray-300 font-semibold text-sm">
                                    {firstName[0]}{lastName[0]}
                                  </span>
                                </div>
                                <span className="text-gray-900 dark:text-white text-sm font-medium">
                                  {firstName} {lastName}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

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
      </Layout>
    );
  }

  // ─── Grid view (no class selected) ────────────────────────────────────────
  return (
    <Layout>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isStudent ? 'My Classes' : 'Class Spaces'}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {filteredClasses.length} {filteredClasses.length === 1 ? 'class' : 'classes'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search classes..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
              />
            </div>
            {/* Students who haven't enrolled yet see a Join button */}
            {isStudent && notEnrolled && (
              <button
                onClick={() => setShowEnrollModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                Join Section
              </button>
            )}
          </div>
        </div>

        {/* Empty state */}
        {filteredClasses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
              <BookOpen className="w-10 h-10 text-blue-600" />
            </div>

            {isStudent && notEnrolled ? (
              /* Student has not joined any section yet */
              <>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  You haven't joined a section yet
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
                  Enter the enrollment code from your program manager to join your section. Your subjects will appear automatically.
                </p>
                <button
                  onClick={() => setShowEnrollModal(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
                >
                  <UserPlus className="w-5 h-5" />
                  Enter Enrollment Code
                </button>
              </>
            ) : isStudent && !notEnrolled ? (
              /* Student is enrolled in a section but no schedules published yet */
              <>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  No subjects published yet
                </h2>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                  You're enrolled in your section. Your subjects will appear here once the schedule is published by your administrator.
                </p>
              </>
            ) : searchTerm ? (
              <>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No classes match your search</h2>
                <p className="text-gray-500 dark:text-gray-400">Try a different search term.</p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No class spaces yet</h2>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                  Class spaces are created automatically when sections are added.
                </p>
              </>
            )}
          </div>
        ) : (
          /* Google Classroom-style card grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredClasses.map((cs, index) => {
              const color = CARD_COLORS[index % CARD_COLORS.length];
              const subjectCode = cs.schedule?.subject?.subjectCode || cs.sectionCode;
              const subjectName = cs.schedule?.subject?.subjectName || 'No schedule linked';
              const facultyUser = cs.schedule?.faculty?.user;
              const facultyName = facultyUser
                ? `${facultyUser.firstName} ${facultyUser.lastName}`
                : null;
              const initials = facultyUser
                ? `${facultyUser.firstName?.[0] || ''}${facultyUser.lastName?.[0] || ''}`
                : null;

              return (
                <div
                  key={cs._id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow cursor-pointer overflow-hidden flex flex-col"
                  onClick={() => { setSelectedClass(cs); setActiveTab('stream'); }}
                >
                  {/* Colored header */}
                  <div className={`${color} p-5 relative h-28 flex flex-col justify-between`}>
                    <div>
                      <h3 className="text-white font-bold text-base leading-tight line-clamp-2">
                        {cs.schedule?.subject?.subjectName || subjectCode}
                      </h3>
                      <p className="text-white/80 text-xs mt-0.5">{cs.sectionCode}</p>
                      {facultyName && (
                        <p className="text-white/70 text-xs mt-0.5 truncate">{facultyName}</p>
                      )}
                    </div>
                    {/* Instructor avatar — bottom right */}
                    {initials ? (
                      <div className="absolute bottom-3 right-3 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center border-2 border-white/40">
                        <span className="text-white font-bold text-sm">{initials}</span>
                      </div>
                    ) : (
                      <div className="absolute bottom-3 right-3 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center border-2 border-white/40">
                        <User className="w-5 h-5 text-white/70" />
                      </div>
                    )}
                  </div>

                  {/* Subject code below header */}
                  <div className="px-4 py-3 flex-1">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{subjectCode}</p>
                    {cs.schedule?.subject?.subjectName && subjectCode !== cs.schedule.subject.subjectName && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">{subjectName}</p>
                    )}
                  </div>

                  {/* Bottom action bar — like Google Classroom */}
                  <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-gray-400">
                      <button
                        onClick={e => { e.stopPropagation(); setSelectedClass(cs); setActiveTab('people'); }}
                        className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
                        title="People"
                      >
                        <Users className="w-4 h-4" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setSelectedClass(cs); setActiveTab('materials'); }}
                        className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
                        title="Materials"
                      >
                        <FolderOpen className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Bell className="w-3 h-3" />
                        {cs.announcements?.length || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {cs.materials?.length || 0}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showEnrollModal && (
        <EnrollModal onClose={handleModalClose} />
      )}
    </Layout>
  );
};

export default ClassSpacePage;
