import React, { useState } from 'react';
import { scheduleAPI } from '../services/api';
import toast from 'react-hot-toast';
import { X, Wand2, Loader, CheckCircle, AlertTriangle, Calendar } from 'lucide-react';

const PROGRAMS = ['BSIT', 'BSHM', 'BIT-ET', 'BIT-CT', 'BIT-AT', 'BSFI', 'BSIE'];
const YEAR_LEVELS = [1, 2, 3, 4];
const SEMESTERS = [1, 2];

const GenerateScheduleModal = ({ onClose }) => {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState(null);
  const [ortoolsStatus, setOrtoolsStatus] = useState(null);
  const [formData, setFormData] = useState({
    program: 'BSIT',
    yearLevel: 1,
    semester: 1,
    academicYear: '2024-2025',
    section: 'A', // Single section - not creating, just selecting
    method: 'greedy', // 'greedy' or 'ortools'
    shift: 'Day', // 'Day' or 'Night'
    timeLimit: 60 // seconds for OR-Tools
  });

  // Check OR-Tools availability on mount
  React.useEffect(() => {
    checkOrtoolsAvailability();
  }, []);

  const checkOrtoolsAvailability = async () => {
    try {
      const response = await scheduleAPI.checkORToolsStatus();
      setOrtoolsStatus(response.data.ortools);
    } catch (error) {
      console.error('Failed to check OR-Tools status:', error);
      setOrtoolsStatus({ available: false });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: ['timeLimit'].includes(name) ? parseInt(value) || 1 : value
    });
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenerating(true);
    setGenerationResult(null);

    try {
      const generateData = {
        ...formData,
        yearLevel: parseInt(formData.yearLevel),
        semester: parseInt(formData.semester),
        section: formData.section, // Single section identifier
        timeLimit: parseInt(formData.timeLimit)
      };

      const response = await scheduleAPI.generate(generateData);
      
      if (response.data.success) {
        setGenerationResult({
          success: true,
          message: response.data.message,
          method: response.data.method,
          data: response.data.data
        });
        toast.success(`Schedule generated successfully using ${response.data.method}!`);
      } else {
        setGenerationResult({
          success: false,
          message: response.data.message,
          method: response.data.method,
          data: null
        });
        toast.error(response.data.message || 'Failed to generate schedule');
      }
    } catch (error) {
      console.error('Generate error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to generate schedule';
      setGenerationResult({
        success: false,
        message: errorMessage,
        data: null
      });
      toast.error(errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  const handleClose = () => {
    // If generation was successful, refresh the parent
    if (generationResult?.success) {
      onClose(true);
    } else {
      onClose(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'partial':
        return 'text-orange-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={20} className="text-green-600" />;
      case 'partial':
        return <AlertTriangle size={20} className="text-orange-600" />;
      case 'failed':
        return <AlertTriangle size={20} className="text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={handleClose}
        ></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          {/* Header */}
          <div className="bg-purple-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Wand2 className="text-white mr-3" size={24} />
                <h3 className="text-lg font-medium text-white">
                  AI-Powered Schedule Generator
                </h3>
              </div>
              <button onClick={handleClose} className="text-white hover:text-gray-200">
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleGenerate} className="p-6">
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                Generate an optimized schedule using AI recommendations. The system will automatically
                assign faculty, rooms, and time slots based on qualifications, availability, and workload.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Program */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Program *
                  </label>
                  <select
                    name="program"
                    value={formData.program}
                    onChange={handleChange}
                    required
                    disabled={generating}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                  >
                    {PROGRAMS.map(prog => (
                      <option key={prog} value={prog}>{prog}</option>
                    ))}
                  </select>
                </div>

                {/* Year Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year Level *
                  </label>
                  <select
                    name="yearLevel"
                    value={formData.yearLevel}
                    onChange={handleChange}
                    required
                    disabled={generating}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                  >
                    {YEAR_LEVELS.map(year => (
                      <option key={year} value={year}>Year {year}</option>
                    ))}
                  </select>
                </div>

                {/* Semester */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Semester *
                  </label>
                  <select
                    name="semester"
                    value={formData.semester}
                    onChange={handleChange}
                    required
                    disabled={generating}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                  >
                    {SEMESTERS.map(sem => (
                      <option key={sem} value={sem}>Semester {sem}</option>
                    ))}
                  </select>
                </div>

                {/* Academic Year */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Academic Year *
                  </label>
                  <input
                    type="text"
                    name="academicYear"
                    value={formData.academicYear}
                    onChange={handleChange}
                    required
                    disabled={generating}
                    placeholder="e.g., 2024-2025"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                  />
                </div>

                {/* Section Identifier */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Section *
                  </label>
                  <select
                    name="section"
                    value={formData.section}
                    onChange={handleChange}
                    required
                    disabled={generating}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                  >
                    {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(section => (
                      <option key={section} value={section}>Section {section}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Select the existing section to generate schedule for
                  </p>
                </div>
              </div>

              {/* Advanced Options */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
                  <Wand2 size={18} className="mr-2 text-purple-600" />
                  Advanced Options
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Generation Method */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Generation Method
                    </label>
                    <select
                      name="method"
                      value={formData.method}
                      onChange={handleChange}
                      disabled={generating}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                    >
                      <option value="greedy">Greedy Algorithm (Fast)</option>
                      <option value="ortools" disabled={!ortoolsStatus?.available}>
                        Google OR-Tools (Optimal) {!ortoolsStatus?.available && '- Not Available'}
                      </option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.method === 'greedy' ? (
                        'Fast algorithm, good results for most cases'
                      ) : (
                        'Advanced constraint solver, finds optimal solutions'
                      )}
                    </p>
                  </div>

                  {/* Shift */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Shift
                    </label>
                    <select
                      name="shift"
                      value={formData.shift}
                      onChange={handleChange}
                      disabled={generating}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                    >
                      <option value="Day">Day (7 AM - 4 PM)</option>
                      <option value="Night">Night (4 PM - 10 PM)</option>
                    </select>
                  </div>

                  {/* Time Limit (OR-Tools only) */}
                  {formData.method === 'ortools' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Optimization Time Limit (seconds)
                      </label>
                      <input
                        type="number"
                        name="timeLimit"
                        value={formData.timeLimit}
                        onChange={handleChange}
                        disabled={generating}
                        min="10"
                        max="300"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Higher values may find better solutions but take longer (10-300 seconds)
                      </p>
                    </div>
                  )}
                </div>

                {/* OR-Tools Status */}
                {ortoolsStatus && (
                  <div className={`mt-4 p-3 rounded-lg ${
                    ortoolsStatus.available 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-yellow-50 border border-yellow-200'
                  }`}>
                    <p className="text-sm flex items-center">
                      {ortoolsStatus.available ? (
                        <>
                          <CheckCircle size={16} className="text-green-600 mr-2" />
                          <span className="text-green-800">
                            Google OR-Tools is available and ready
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle size={16} className="text-yellow-600 mr-2" />
                          <span className="text-yellow-800">
                            Google OR-Tools is not installed. Install with: pip install ortools
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Generation Result */}
            {generationResult && (
              <div className={`mb-6 p-4 rounded-lg ${
                generationResult.success 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    {generationResult.success ? (
                      <CheckCircle className="text-green-600" size={24} />
                    ) : (
                      <AlertTriangle className="text-red-600" size={24} />
                    )}
                  </div>
                  <div className="ml-3 flex-1">
                    <h4 className={`text-sm font-semibold mb-1 ${
                      generationResult.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {generationResult.method || 'Generation'} Result
                    </h4>
                    <p className={`text-sm ${
                      generationResult.success ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {generationResult.message}
                    </p>
                    <h4 className={`text-sm font-semibold ${
                      generationResult.success ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {generationResult.success ? 'Generation Successful' : 'Generation Failed'}
                    </h4>
                    <p className={`text-sm mt-1 ${
                      generationResult.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {generationResult.message}
                    </p>

                    {/* Display detailed results if available */}
                    {generationResult.data && Array.isArray(generationResult.data) && (
                      <div className="mt-3 space-y-2">
                        {generationResult.data.map((result, idx) => (
                          <div key={idx} className="bg-white rounded-md p-3 border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center">
                                {getStatusIcon(result.status)}
                                <span className="ml-2 font-medium text-gray-900">
                                  {result.section}
                                </span>
                              </div>
                              <span className={`text-xs font-semibold uppercase ${getStatusColor(result.status)}`}>
                                {result.status}
                              </span>
                            </div>
                            {result.message && (
                              <p className="text-xs text-gray-600">{result.message}</p>
                            )}
                            {result.created > 0 && (
                              <p className="text-xs text-green-600 mt-1">
                                ✓ {result.created} schedule{result.created !== 1 ? 's' : ''} created
                              </p>
                            )}
                            {result.failed > 0 && (
                              <p className="text-xs text-red-600 mt-1">
                                ✗ {result.failed} schedule{result.failed !== 1 ? 's' : ''} failed
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Loading State */}
            {generating && (
              <div className="mb-6 p-6 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex flex-col items-center justify-center">
                  <div className="relative">
                    <Loader className="animate-spin text-purple-600" size={48} />
                    <Wand2 className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-purple-600" size={24} />
                  </div>
                  <p className="mt-4 text-sm font-medium text-purple-900">
                    Generating schedule with AI...
                  </p>
                  <p className="text-xs text-purple-700 mt-1">
                    This may take a few moments
                  </p>
                </div>
              </div>
            )}

            {/* AI Info Box */}
            {!generating && !generationResult && (
              <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h4 className="text-sm font-semibold text-purple-900 mb-2">
                  How AI Generation Works
                </h4>
                <ul className="text-xs text-purple-800 space-y-1">
                  <li>• Analyzes faculty qualifications and specializations</li>
                  <li>• Balances teaching workload across faculty members</li>
                  <li>• Assigns appropriate rooms based on subject type and capacity</li>
                  <li>• Optimizes time slots to avoid conflicts</li>
                  <li>• Considers faculty availability and preferences</li>
                  <li>• Ensures curriculum requirements are met</li>
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={generating}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {generationResult?.success ? 'Close' : 'Cancel'}
              </button>
              {!generationResult?.success && (
                <button
                  type="submit"
                  disabled={generating}
                  className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <Loader className="animate-spin mr-2" size={18} />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 size={18} className="mr-2" />
                      Generate Schedule
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default GenerateScheduleModal;
