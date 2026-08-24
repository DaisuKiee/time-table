import React, { useState } from 'react';
import { classSpaceAPI } from '../services/api';
import toast from 'react-hot-toast';
import { X, UserPlus, Key, AlertCircle, CheckCircle } from 'lucide-react';

const EnrollModal = ({ onClose }) => {
  const [loading, setLoading] = useState(false);
  const [sectionCode, setSectionCode] = useState('');
  const [enrollmentResult, setEnrollmentResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setEnrollmentResult(null);

    try {
      // Get class space by section code
      const response = await classSpaceAPI.getByCode(sectionCode.trim());
      const classSpace = response.data.data;

      if (!classSpace) {
        toast.error('Invalid section code');
        setLoading(false);
        return;
      }

      // Enroll in the class
      await classSpaceAPI.enroll(classSpace._id, {
        isRegular: true // You can add a checkbox for this if needed
      });

      setEnrollmentResult({
        success: true,
        classSpace: classSpace
      });

      toast.success('Successfully enrolled!');
      
      // Close and refresh after 2 seconds
      setTimeout(() => {
        onClose('reload');
      }, 2000);
      
    } catch (error) {
      console.error('Enrollment error:', error);
      const message = error.response?.data?.message || 'Enrollment failed';
      
      setEnrollmentResult({
        success: false,
        message: message
      });
      
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={() => onClose(false)}
        ></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
          {/* Header */}
          <div className="bg-blue-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <UserPlus className="text-white mr-3" size={24} />
                <h3 className="text-lg font-medium text-white">Enroll in Class</h3>
              </div>
              <button onClick={() => onClose(false)} className="text-white hover:text-gray-200">
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            {!enrollmentResult && (
              <>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Section Code *
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-2.5 text-gray-400" size={20} />
                    <input
                      type="text"
                      value={sectionCode}
                      onChange={(e) => setSectionCode(e.target.value.toUpperCase())}
                      required
                      placeholder="e.g., BSIT-2A-S1-2024"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 uppercase"
                      disabled={loading}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Enter the section code provided by your instructor
                  </p>
                </div>

                {/* Info Box */}
                <div className="flex items-start p-4 bg-blue-50 rounded-lg mb-6">
                  <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5 mr-3" size={20} />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-1">How to find your section code</p>
                    <ul className="text-xs space-y-1 text-blue-800">
                      <li>• Check your class schedule for the section code</li>
                      <li>• Ask your instructor for the code</li>
                      <li>• Look for announcements from the department</li>
                      <li>• Format: PROGRAM-YEAR-SECTION-SEMESTER-YEAR</li>
                    </ul>
                  </div>
                </div>
              </>
            )}

            {/* Success Result */}
            {enrollmentResult?.success && (
              <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-start">
                  <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5 mr-3" size={24} />
                  <div>
                    <h4 className="font-semibold text-green-900 mb-2">
                      Successfully Enrolled!
                    </h4>
                    <p className="text-sm text-green-800 mb-3">
                      You have been enrolled in:
                    </p>
                    <div className="bg-white p-3 rounded border border-green-200">
                      <p className="font-medium text-gray-900">
                        {enrollmentResult.classSpace.schedule?.subject?.subjectCode}
                      </p>
                      <p className="text-sm text-gray-600">
                        {enrollmentResult.classSpace.schedule?.subject?.subjectName}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Section: {enrollmentResult.classSpace.sectionCode}
                      </p>
                    </div>
                    <p className="text-xs text-green-800 mt-3">
                      Redirecting to class space...
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Result */}
            {enrollmentResult?.success === false && (
              <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-start">
                  <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5 mr-3" size={24} />
                  <div>
                    <h4 className="font-semibold text-red-900 mb-1">
                      Enrollment Failed
                    </h4>
                    <p className="text-sm text-red-800">
                      {enrollmentResult.message}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            {!enrollmentResult?.success && (
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => onClose(false)}
                  disabled={loading}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !sectionCode.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Enrolling...' : 'Enroll'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default EnrollModal;
