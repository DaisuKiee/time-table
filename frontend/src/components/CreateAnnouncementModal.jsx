import React, { useState, useEffect } from 'react';
import { classSpaceAPI } from '../services/api';
import toast from 'react-hot-toast';
import { X, Bell, Pin } from 'lucide-react';

const CreateAnnouncementModal = ({ classSpaceId, announcement, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    isPinned: false
  });

  const isEdit = !!announcement;

  useEffect(() => {
    if (announcement) {
      setFormData({
        title: announcement.title || '',
        content: announcement.content || '',
        isPinned: announcement.isPinned || false
      });
    }
  }, [announcement]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEdit) {
        await classSpaceAPI.updateAnnouncement(classSpaceId, announcement._id, formData);
        toast.success('Announcement updated successfully');
      } else {
        await classSpaceAPI.postAnnouncement(classSpaceId, formData);
        toast.success('Announcement posted successfully');
      }
      onClose(true);
    } catch (error) {
      console.error('Submit announcement error:', error);
      const message = error.response?.data?.message || 'Operation failed';
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
          <div className="bg-blue-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Bell className="text-white mr-3" size={24} />
                <h3 className="text-lg font-medium text-white">
                  {isEdit ? 'Edit Announcement' : 'Create Announcement'}
                </h3>
              </div>
              <button onClick={() => onClose(false)} className="text-white hover:text-gray-200">
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-4">
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
                  placeholder="Enter announcement title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content *
                </label>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  required
                  rows={8}
                  placeholder="Write your announcement here..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.content.length} characters
                </p>
              </div>

              {/* Pin Option */}
              <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="isPinned"
                  name="isPinned"
                  checked={formData.isPinned}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isPinned" className="ml-3 flex items-center cursor-pointer">
                  <Pin size={16} className="text-gray-600 mr-2" />
                  <div>
                    <span className="text-sm font-medium text-gray-900">Pin this announcement</span>
                    <p className="text-xs text-gray-500">Pinned announcements appear at the top</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => onClose(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : isEdit ? 'Update Announcement' : 'Post Announcement'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateAnnouncementModal;
