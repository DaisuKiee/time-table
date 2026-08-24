import React, { useState, useRef } from 'react';
import { classSpaceAPI } from '../services/api';
import toast from 'react-hot-toast';
import { X, Upload, File, AlertCircle } from 'lucide-react';

const UploadMaterialModal = ({ classSpaceId, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  });
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    validateAndSetFile(file);
  };

  const validateAndSetFile = (file) => {
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    
    // Auto-fill title if empty
    if (!formData.title) {
      const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
      setFormData(prev => ({ ...prev, title: fileName }));
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    validateAndSetFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('file', selectedFile);
      formDataToSend.append('title', formData.title);
      if (formData.description) {
        formDataToSend.append('description', formData.description);
      }

      await classSpaceAPI.uploadMaterial(classSpaceId, formDataToSend);
      toast.success('Material uploaded successfully');
      onClose(true);
    } catch (error) {
      console.error('Upload material error:', error);
      const message = error.response?.data?.message || 'Upload failed';
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

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Header */}
          <div className="bg-green-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Upload className="text-white mr-3" size={24} />
                <h3 className="text-lg font-medium text-white">Upload Course Material</h3>
              </div>
              <button onClick={() => onClose(false)} className="text-white hover:text-gray-200">
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-4">
              {/* File Upload Area */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  File *
                </label>
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <File className="text-green-600" size={32} />
                      <div className="text-left">
                        <p className="font-medium text-gray-900">{selectedFile.name}</p>
                        <p className="text-sm text-gray-500">
                          {(selectedFile.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto text-gray-400 mb-3" size={48} />
                      <p className="text-gray-700 mb-2">
                        Drag and drop your file here, or
                      </p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Browse Files
                      </button>
                      <p className="text-xs text-gray-500 mt-3">
                        Supported formats: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, ZIP
                      </p>
                      <p className="text-xs text-gray-500">Maximum file size: 10MB</p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip"
                />
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  maxLength={200}
                  placeholder="e.g., Lecture 5 - Data Structures"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Brief description of the material..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 resize-none"
                />
              </div>

              {/* Info Box */}
              <div className="flex items-start p-4 bg-blue-50 rounded-lg">
                <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5 mr-3" size={20} />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">File Upload Guidelines</p>
                  <ul className="text-xs space-y-1 text-blue-800">
                    <li>• Ensure the file name is descriptive</li>
                    <li>• Check that the file is virus-free</li>
                    <li>• Compress large files before uploading</li>
                    <li>• Students will be able to download this file</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-3">
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
                disabled={loading || !selectedFile}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Uploading...' : 'Upload Material'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UploadMaterialModal;
