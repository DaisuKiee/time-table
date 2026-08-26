import React, { useState, useCallback, useEffect } from 'react';
import { scheduleAPI, sectionAPI } from '../services/api';
import toast from 'react-hot-toast';
import { X, Wand2, Loader, CheckCircle, AlertTriangle, Calendar, Sparkles } from 'lucide-react';

const PROGRAMS = ['BSIT', 'BSHM', 'BIT-ET', 'BIT-CT', 'BIT-AT', 'BSFI', 'BSIE'];
const YEAR_LEVELS = [1, 2, 3, 4];
const SEMESTERS = [1, 2];

const GenerateScheduleModal = ({ onClose }) => {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [ortoolsStatus, setOrtoolsStatus] = useState(null);
  const [availableSections, setAvailableSections] = useState([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const [formData, setFormData] = useState({
    section: '', // Section ID
    method: 'greedy', // 'greedy' or 'ortools'
    timeLimit: 60, // seconds for OR-Tools
    useAIRecommendations: true // Use AI RAG for faculty recommendations
  });

  // Check OR-Tools availability on mount
  useEffect(() => {
    checkOrtoolsAvailability();
  }, []);

  const fetchAvailableSections = useCallback(async () => {
    setLoadingSections(true);
    console.log('=== FETCHING ALL SECTIONS ===');
    
    try {
      const response = await sectionAPI.getAll();
      
      console.log('Sections response:', response.data);
      
      if (response.data.success) {
        setAvailableSections(response.data.data || []);
        console.log('Available sections:', response.data.data);
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
      setAvailableSections([]);
    } finally {
      setLoadingSections(false);
      console.log('=== SECTIONS FETCH COMPLETE ===');
    }
  }, []);

  // Fetch sections on mount
  useEffect(() => {
    fetchAvailableSections();
  }, [fetchAvailableSections]);

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

  const handleAIToggle = () => {
    setFormData(prev => ({
      ...prev,
      useAIRecommendations: !prev.useAIRecommendations
    }));
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    
    console.log('=== GENERATE SCHEDULE PREVIEW CLICKED ===');
    console.log('Form Data:', formData);
    
    if (!formData.section) {
      console.error('No section selected!');
      toast.error('Please select a section');
      return;
    }

    // Find the selected section to get its details
    const selectedSection = availableSections.find(s => s._id === formData.section);
    if (!selectedSection) {
      toast.error('Selected section not found');
      return;
    }

    setGenerating(true);
    setPreviewData(null);

    try {
      const generateData = {
        program: selectedSection.program,
        yearLevel: parseInt(selectedSection.yearLevel),
        semester: parseInt(selectedSection.semester),
        shift: selectedSection.shift,
        section: selectedSection.sectionLetter,
        academicYear: selectedSection.academicYear,
        method: formData.method,
        timeLimit: parseInt(formData.timeLimit),
        useAIRecommendations: formData.useAIRecommendations
      };

      console.log('Sending preview request:', generateData);
      const response = await scheduleAPI.preview(generateData);
      console.log('Preview response:', response.data);
      
      if (response.data.success) {
        setPreviewData({
          success: true,
          message: response.data.message,
          method: response.data.method,
          methodNote: response.data.data.methodNote || response.data.data.preview?.methodNote,
          aiUsed: response.data.aiUsed || formData.useAIRecommendations,
          preview: response.data.data.preview || response.data.data,
          sectionInfo: selectedSection
        });
        
        // Show note if OR-Tools fell back to greedy
        if (response.data.data.methodNote) {
          toast.success(response.data.data.methodNote, { duration: 5000 });
        } else {
          toast.success('Schedule preview generated successfully!');
        }
      } else {
        setPreviewData({
          success: false,
          message: response.data.message,
          method: response.data.method
        });
        toast.error(response.data.message || 'Failed to generate preview');
      }
    } catch (error) {
      console.error('=== GENERATE PREVIEW ERROR ===');
      console.error('Error object:', error);
      console.error('Error response:', error.response);
      
      const errorMessage = error.response?.data?.message || 'Failed to generate preview';
      setPreviewData({
        success: false,
        message: errorMessage
      });
      toast.error(errorMessage);
    } finally {
      setGenerating(false);
      console.log('=== GENERATE PREVIEW COMPLETED ===');
    }
  };

  const handleSaveSchedules = async () => {
    if (!previewData || !previewData.preview || !previewData.preview.schedules) {
      toast.error('No schedules to save');
      return;
    }

    setSaving(true);

    try {
      console.log('Saving schedules:', previewData.preview.schedules);
      const response = await scheduleAPI.savePreview({
        schedules: previewData.preview.schedules
      });

      if (response.data.success) {
        toast.success(`Successfully saved ${response.data.saved} schedule(s)!`);
        onClose(true); // Refresh parent
      } else {
        toast.error(response.data.message || 'Failed to save schedules');
      }
    } catch (error) {
      console.error('Save schedules error:', error);
      toast.error(error.response?.data?.message || 'Failed to save schedules');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    // If schedules were saved, refresh the parent
    if (previewData?.success && !previewData.preview) {
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

              <div className="grid grid-cols-1 gap-4">
                {/* Section Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Section *
                  </label>
                  <select
                    name="section"
                    value={formData.section}
                    onChange={handleChange}
                    required
                    disabled={generating || loadingSections}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                  >
                    <option value="">-- Select a Section --</option>
                    {availableSections.map(section => (
                      <option key={section._id} value={section._id}>
                        {section.sectionCode} ({section.program} - Year {section.yearLevel} - {section.shift}) - {section.currentStudents || 0}/{section.maxStudents} students
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {loadingSections ? 'Loading sections...' : `${availableSections.length} section${availableSections.length !== 1 ? 's' : ''} available`}
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
                  {/* AI Recommendations Toggle */}
                  <div className="md:col-span-2 p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Sparkles size={20} className="text-purple-600 mr-2" />
                        <div>
                          <h5 className="text-sm font-semibold text-purple-900">
                            AI-Powered Faculty Recommendations
                          </h5>
                          <p className="text-xs text-purple-700 mt-1">
                            Uses RAG to match faculty expertise with subjects (Gemini 2.5 Flash)
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleAIToggle}
                        disabled={generating}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 ${
                          formData.useAIRecommendations ? 'bg-purple-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            formData.useAIRecommendations ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

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

            {/* Preview Results */}
            {previewData && previewData.success && previewData.preview && (
              <div className="mb-6 max-h-96 overflow-y-auto">
                {/* Preview Header */}
                <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200 sticky top-0 z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-purple-900">
                          Schedule Preview - {previewData.sectionInfo?.sectionCode}
                        </h4>
                        {previewData.aiUsed && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-200 text-purple-900">
                            <Sparkles size={12} className="mr-1" />
                            AI-Powered
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-purple-700">
                        {previewData.preview.statistics.scheduledSubjects} of {previewData.preview.statistics.totalSubjects} subjects scheduled successfully
                      </p>
                      {previewData.methodNote && (
                        <p className="text-xs text-purple-600 mt-1 italic">
                          {previewData.methodNote}
                        </p>
                      )}
                    </div>
                    <CheckCircle className="text-purple-600" size={24} />
                  </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-xs text-green-600 font-medium">Scheduled</p>
                    <p className="text-2xl font-bold text-green-700">
                      {previewData.preview.statistics.scheduledSubjects}
                    </p>
                  </div>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs text-red-600 font-medium">Failed</p>
                    <p className="text-2xl font-bold text-red-700">
                      {previewData.preview.statistics.failedSubjects}
                    </p>
                  </div>
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-xs text-orange-600 font-medium">Conflicts</p>
                    <p className="text-2xl font-bold text-orange-700">
                      {previewData.preview.statistics.conflictsDetected}
                    </p>
                  </div>
                </div>

                {/* Scheduled Subjects */}
                {previewData.preview.schedules && previewData.preview.schedules.length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-sm font-semibold text-gray-900 mb-2">
                      ✓ Scheduled Subjects ({previewData.preview.schedules.length})
                    </h5>
                    <div className="space-y-2">
                      {previewData.preview.schedules.map((schedule, idx) => (
                        <div key={idx} className="bg-white rounded-lg p-3 border border-gray-200 hover:border-purple-300 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-gray-900">
                                  {schedule.metadata.subjectCode}
                                </span>
                                <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                                  {schedule.metadata.units} units
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 mb-1">
                                {schedule.metadata.subjectName}
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-gray-500">Faculty:</span>
                              <span className="ml-1 text-gray-900 font-medium">
                                {schedule.metadata.facultyName}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Room:</span>
                              <span className="ml-1 text-gray-900 font-medium">
                                {schedule.metadata.roomName} (Cap: {schedule.metadata.roomCapacity})
                              </span>
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {schedule.timeSlots.map((slot, slotIdx) => (
                              <span key={slotIdx} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                                {slot.day} {slot.startTime}-{slot.endTime}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Failed Subjects */}
                {previewData.preview.failed && previewData.preview.failed.length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-sm font-semibold text-red-700 mb-2">
                      ✗ Failed Subjects ({previewData.preview.failed.length})
                    </h5>
                    <div className="space-y-2">
                      {previewData.preview.failed.map((fail, idx) => (
                        <div key={idx} className="bg-red-50 rounded-lg p-3 border border-red-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-semibold text-red-900">{fail.subject}</span>
                              {fail.subjectName && (
                                <span className="text-sm text-red-700 ml-2">- {fail.subjectName}</span>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-red-600 mt-1">{fail.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Conflicts */}
                {previewData.preview.conflicts && previewData.preview.conflicts.length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-sm font-semibold text-orange-700 mb-2">
                      ⚠ Conflicts Detected ({previewData.preview.conflicts.length})
                    </h5>
                    <div className="space-y-2">
                      {previewData.preview.conflicts.map((conflict, idx) => (
                        <div key={idx} className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-semibold text-orange-900">{conflict.subject}</span>
                              {conflict.subjectName && (
                                <span className="text-sm text-orange-700 ml-2">- {conflict.subjectName}</span>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-orange-600 mt-1">{conflict.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Failed Generation */}
            {previewData && !previewData.success && (
              <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200">
                <div className="flex items-start">
                  <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={24} />
                  <div className="ml-3 flex-1">
                    <h4 className="text-sm font-semibold text-red-800 mb-1">
                      Generation Failed
                    </h4>
                    <p className="text-sm text-red-700">
                      {previewData.message}
                    </p>
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
                    Generating schedule preview...
                  </p>
                  <p className="text-xs text-purple-700 mt-1">
                    This may take a few moments
                  </p>
                </div>
              </div>
            )}

            {/* AI Info Box */}
            {!generating && !previewData && (
              <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h4 className="text-sm font-semibold text-purple-900 mb-2 flex items-center">
                  <Sparkles size={16} className="mr-2" />
                  How AI Generation Works
                </h4>
                <ul className="text-xs text-purple-800 space-y-1">
                  {formData.useAIRecommendations && (
                    <>
                      <li>• <strong>RAG-Powered Matching:</strong> Analyzes faculty teaching history and subject expertise</li>
                      <li>• <strong>Experience Scoring:</strong> Prioritizes faculty with most years teaching specific subjects</li>
                      <li>• <strong>Smart Recommendations:</strong> Shows match percentages based on qualifications and experience</li>
                    </>
                  )}
                  <li>• Balances teaching workload across faculty members</li>
                  <li>• Assigns appropriate rooms based on subject type and capacity</li>
                  <li>• Optimizes time slots to avoid conflicts</li>
                  <li>• Considers faculty availability and preferences</li>
                  <li>• Ensures curriculum requirements are met</li>
                  <li className="text-purple-900 font-medium mt-2">• <strong>Preview First:</strong> Review and approve before saving to database</li>
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={generating || saving}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {previewData?.success && previewData.preview ? 'Cancel' : 'Close'}
              </button>
              
              {/* Preview Button - Shows when no preview yet */}
              {!previewData && (
                <button
                  type="submit"
                  disabled={generating || !formData.section}
                  className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? (
                    <>
                      <Loader className="animate-spin mr-2" size={18} />
                      Generating Preview...
                    </>
                  ) : (
                    <>
                      <Wand2 size={18} className="mr-2" />
                      Generate Preview
                    </>
                  )}
                </button>
              )}

              {/* Save Button - Shows when preview is ready */}
              {previewData?.success && previewData.preview && previewData.preview.schedules?.length > 0 && (
                <button
                  type="button"
                  onClick={handleSaveSchedules}
                  disabled={saving}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader className="animate-spin mr-2" size={18} />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} className="mr-2" />
                      Save {previewData.preview.schedules.length} Schedule{previewData.preview.schedules.length !== 1 ? 's' : ''}
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
