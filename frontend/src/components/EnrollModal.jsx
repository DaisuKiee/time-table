import React, { useState } from 'react';
import { classSpaceAPI } from '../services/api';
import toast from 'react-hot-toast';
import { X, UserPlus, Key, AlertCircle, CheckCircle, BookOpen, Users, Calendar } from 'lucide-react';

const EnrollModal = ({ onClose }) => {
  const [loading, setLoading] = useState(false);
  const [enrollmentCode, setEnrollmentCode] = useState('');
  const [result, setResult] = useState(null); // { success, section }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!enrollmentCode.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await classSpaceAPI.enrollByCode(enrollmentCode.trim());
      const section = response.data.data;

      setResult({ success: true, section });
      toast.success(`Enrolled in ${section.sectionCode}!`);

      // Reload class spaces after short delay
      setTimeout(() => onClose('reload'), 2000);

    } catch (error) {
      const message = error.response?.data?.message || 'Enrollment failed';
      setResult({ success: false, message });
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => onClose(false)}
      />

      <div className="relative bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white">Join a Class</h3>
          </div>
          <button
            onClick={() => onClose(false)}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Success state */}
          {result?.success ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-green-900 dark:text-green-100">
                    Successfully Enrolled!
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-0.5">
                    You are now part of this section
                  </p>
                </div>
              </div>

              {/* Section info card */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <span className="font-bold text-gray-900 dark:text-white text-lg">
                    {result.section.sectionCode}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Program</p>
                    <p className="font-medium text-gray-900 dark:text-white">{result.section.program}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Year Level</p>
                    <p className="font-medium text-gray-900 dark:text-white">Year {result.section.yearLevel}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Academic Year</p>
                    <p className="font-medium text-gray-900 dark:text-white">{result.section.academicYear}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Semester</p>
                    <p className="font-medium text-gray-900 dark:text-white">Sem {result.section.semester}</p>
                  </div>
                  {result.section.adviser && (
                    <div className="col-span-2">
                      <p className="text-gray-500 dark:text-gray-400 text-xs">Adviser</p>
                      <p className="font-medium text-gray-900 dark:text-white">{result.section.adviser}</p>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs text-gray-500 text-center">
                Redirecting to your classes...
              </p>
            </div>

          ) : (
            /* Input form */
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Section Enrollment Code
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={enrollmentCode}
                    onChange={(e) => {
                      setEnrollmentCode(e.target.value.toUpperCase());
                      setResult(null);
                    }}
                    placeholder="e.g. K3P9X7M2"
                    maxLength={8}
                    required
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-mono text-lg tracking-widest text-center uppercase transition-all"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 text-center">
                  8-character code provided by your program manager
                </p>
              </div>

              {/* Error message */}
              {result?.success === false && (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-300">{result.message}</p>
                </div>
              )}

              {/* Info box */}
              <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
                  <p className="font-semibold">What happens when you join?</p>
                  <ul className="space-y-0.5 text-blue-700 dark:text-blue-400">
                    <li>• Your section (year, semester, adviser) is automatically set</li>
                    <li>• All subjects for your section appear as class spaces</li>
                    <li>• You can view announcements and materials from teachers</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => onClose(false)}
                  disabled={loading}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || enrollmentCode.length < 8}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Join Section
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnrollModal;
