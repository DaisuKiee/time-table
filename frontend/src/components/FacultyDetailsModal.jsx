import React from 'react';
import { X, User, Mail, Phone, Award, BookOpen, TrendingUp, Calendar, Edit2 } from 'lucide-react';

const FacultyDetailsModal = ({ faculty, onClose, onEdit }) => {
  if (!faculty) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-16 w-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <User size={32} className="text-white" />
                </div>
                <div className="ml-4">
                  <h3 className="text-2xl font-bold text-white">
                    {faculty.user?.firstName} {faculty.user?.lastName}
                  </h3>
                  <p className="text-blue-100 mt-1">{faculty.employeeId}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <TrendingUp className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {faculty.currentLoad || 0} hrs
                </p>
                <p className="text-xs text-gray-600">Current Load</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <Award className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {faculty.qualifications?.length || 0}
                </p>
                <p className="text-xs text-gray-600">Qualifications</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <BookOpen className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {faculty.teachingHistory?.length || 0}
                </p>
                <p className="text-xs text-gray-600">Courses Taught</p>
              </div>
            </div>

            {/* Basic Information */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User size={20} className="mr-2" />
                Basic Information
              </h4>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center">
                  <Mail size={16} className="text-gray-400 mr-3" />
                  <span className="text-sm text-gray-600">Email:</span>
                  <span className="text-sm text-gray-900 ml-2">{faculty.user?.email}</span>
                </div>
                <div className="flex items-center">
                  <Award size={16} className="text-gray-400 mr-3" />
                  <span className="text-sm text-gray-600">Max Load:</span>
                  <span className="text-sm text-gray-900 ml-2">{faculty.maxLoad} hours/week</span>
                </div>
                <div className="flex items-center">
                  <TrendingUp size={16} className="text-gray-400 mr-3" />
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                    faculty.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {faculty.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            {/* Workload Progress */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <TrendingUp size={20} className="mr-2" />
                Workload Status
              </h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">
                    {faculty.currentLoad || 0} / {faculty.maxLoad} hours
                  </span>
                  <span className={`text-sm font-semibold ${
                    (faculty.currentLoad || 0) > faculty.maxLoad
                      ? 'text-red-600'
                      : (faculty.currentLoad || 0) / faculty.maxLoad > 0.8
                      ? 'text-orange-600'
                      : 'text-green-600'
                  }`}>
                    {Math.round(((faculty.currentLoad || 0) / faculty.maxLoad) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      (faculty.currentLoad || 0) > faculty.maxLoad
                        ? 'bg-red-600'
                        : (faculty.currentLoad || 0) / faculty.maxLoad > 0.8
                        ? 'bg-orange-600'
                        : 'bg-green-600'
                    }`}
                    style={{
                      width: `${Math.min(
                        ((faculty.currentLoad || 0) / faculty.maxLoad) * 100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
                {(faculty.currentLoad || 0) > faculty.maxLoad && (
                  <p className="text-xs text-red-600 mt-2">
                    ⚠️ Overloaded by {(faculty.currentLoad || 0) - faculty.maxLoad} hours
                  </p>
                )}
              </div>
            </div>

            {/* Specializations */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <BookOpen size={20} className="mr-2" />
                Areas of Specialization
              </h4>
              {faculty.specialization && faculty.specialization.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {faculty.specialization.map((spec, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium bg-purple-100 text-purple-800"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No specializations listed</p>
              )}
            </div>

            {/* Qualifications */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Award size={20} className="mr-2" />
                Educational Qualifications
              </h4>
              {faculty.qualifications && faculty.qualifications.length > 0 ? (
                <div className="space-y-3">
                  {faculty.qualifications.map((qual, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{qual.degree}</p>
                          <p className="text-sm text-gray-600">{qual.field}</p>
                          <p className="text-sm text-gray-500">{qual.institution}</p>
                        </div>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                          {qual.yearObtained}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No qualifications recorded</p>
              )}
            </div>

            {/* Teaching History */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar size={20} className="mr-2" />
                Teaching History
              </h4>
              {faculty.teachingHistory && faculty.teachingHistory.length > 0 ? (
                <div className="space-y-2">
                  {faculty.teachingHistory.slice(0, 5).map((history, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center">
                        <BookOpen size={16} className="text-gray-400 mr-3" />
                        <span className="text-sm text-gray-900">
                          {history.subject?.subjectName || 'Unknown Subject'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {history.academicYear} - Sem {history.semester}
                      </span>
                    </div>
                  ))}
                  {faculty.teachingHistory.length > 5 && (
                    <p className="text-xs text-gray-500 text-center pt-2">
                      +{faculty.teachingHistory.length - 5} more courses
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No teaching history recorded</p>
              )}
            </div>

            {/* Preferred Schedule */}
            {faculty.preferredSchedule && Object.keys(faculty.preferredSchedule).length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Calendar size={20} className="mr-2" />
                  Preferred Schedule
                </h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="text-sm text-gray-600 whitespace-pre-wrap">
                    {JSON.stringify(faculty.preferredSchedule, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
            >
              Close
            </button>
            <button
              onClick={onEdit}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Edit2 size={18} className="mr-2" />
              Edit Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyDetailsModal;
