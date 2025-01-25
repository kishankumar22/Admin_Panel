import { useState } from 'react';
import Breadcrumb from '../components/Breadcrumbs/Breadcrumb';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { toast, ToastContainer } from 'react-toastify';

const Addnotifications = () => {
  const [addNotification, setAddNotification] = useState<string>(''); // Notification message
  const [inputType, setInputType] = useState<'url' | 'file'>('url'); // Input type: URL or File
  const [url, setUrl] = useState<string>(''); // URL input
  const [file, setFile] = useState<File | null>(null); // File input
  const [isUploading, setIsUploading] = useState<boolean>(false); // Track file upload status
  const [isValidUrl, setIsValidUrl] = useState<boolean>(true); // Validate URL input
  const [editingId, setEditingId] = useState<number | null>(null); // Tracks the notification being edited

  const { user } = useAuth();
  const { notifications, addNotification: addNotificationContext, editNotification, deleteNotification } =
    useNotifications();

  const userId = user?.user_id;
  const createdBy = user?.name || 'admin';

  // Validate URL format
  const validateUrl = (url: string) => {
    const urlRegex = /^(https?:\/\/[^\s/$.?#].[^\s]*)$/i; // Regex for valid URLs
    return urlRegex.test(url);
  };

  // Handle URL input change with validation
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    setUrl(value);
    setIsValidUrl(validateUrl(value));
  };

  const handleAddNotification = async () => {
    if (!addNotification) {
      toast.error('Please enter a notification message');
      return;
    }

    if (!userId || !createdBy) {
            toast.error('User data is missing. Please log in again.');
      return;
    }

    if (inputType === 'url' && (!url || !isValidUrl)) {
      toast.error('Please enter a notification message');
      return;
    }

    if (inputType === 'file' && !file) {
      toast.success('Please select a file.');
      return;
    }

    const formData = new FormData();
    formData.append('notification_message', addNotification);
    formData.append('user_id', String(userId));
    formData.append('created_by', createdBy);

    if (inputType === 'url') {
      formData.append('url', url);
    } else if (inputType === 'file' && file) {
      setIsUploading(true);
      formData.append('file', file);
    }

    try {
      await addNotificationContext(formData); // Call the context function
      setAddNotification('');
      setUrl('');
      setFile(null);
      toast.success('Notification added successfully!');
    } catch (error) {
      toast.error('Failed to add notification');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteNotification = async (id: number) => {
    try {
      await deleteNotification(id);
      toast.success('Notification deleted successfully!');
    } catch (error) {
      toast.success('Failed to delete notification');
    }
  };

  const handleEditNotification = (notification: any) => {
    setEditingId(notification.notification_id);
    setAddNotification(notification.notification_message);
    setUrl(notification.notification_url || '');
    setInputType(notification.notification_url ? 'url' : 'file');
  };

  const handleSaveNotification = async (id: number) => {
    const formData = new FormData();
    formData.append('notification_message', addNotification);

    if (inputType === 'url') {
      formData.append('url', url);
    } else if (inputType === 'file' && file) {
      formData.append('file', file);
    }

    try {
      await editNotification(id, formData);
      setEditingId(null);
      setAddNotification('');
      setUrl('');
      setFile(null);
      toast.success('Notification updated successfully!');
    } catch (error) {
      toast.error('Failed to update notification');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setAddNotification('');
    setUrl('');
    setFile(null);
  };

  return (
    <><ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
      <Breadcrumb pageName="Add Notification" />

      <div className="flex items-center space-x-2 p-2 bg-gray-100 rounded-lg shadow-md">
        <input
          type="text"
          className="flex-1 p-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter notification"
          value={addNotification}
          onChange={(e) => setAddNotification(e.target.value)}
        />
        <select
          className="p-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={inputType}
          onChange={(e) => setInputType(e.target.value as 'url' | 'file')}
        >
          <option value="url">URL</option>
          <option value="file">File</option>
        </select>

        {inputType === 'url' && (
          <input
            type="text"
            className={`w-48 p-1 border ${
              isValidUrl ? 'border-gray-300' : 'border-red-500'
            } rounded-md focus:outline-none focus:ring-2 ${
              isValidUrl ? 'focus:ring-blue-500' : 'focus:ring-red-500'
            }`}
            placeholder="(e.g., https://example.com)"
            value={url}
            onChange={handleUrlChange}
          />
        )}

        {inputType === 'file' && (
          <input
            type="file"
            className="w-48 p-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        )}

        {editingId ? (
          <>
            <button
              className="px-3 py-1 text-white bg-green-500 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-300"
              onClick={() => handleSaveNotification(editingId)}
              disabled={isUploading || (inputType === 'url' && !isValidUrl)}
            >
              Save
            </button>
            <button
              className="px-3 py-1 text-white bg-red-500 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-300"
              onClick={handleCancelEdit}
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            className="px-3 py-1 text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-300 disabled:cursor-not-allowed"
            onClick={handleAddNotification}
            disabled={isUploading || (inputType === 'url' && !isValidUrl)}
          >
            {isUploading ? 'Uploading...' : 'Add Notification'}
          </button>
        )}
      </div>

      <div className="mt-6 p-4 bg-white rounded-lg shadow-md">
        <h2 className="text-sm font-bold text-cyan-900 mb-2">Notifications</h2>
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-1 px-2 border-b text-left text-gray-600 text-xs">ID</th>
              <th className="py-1 px-2 border-b text-left text-gray-600 text-xs">Message</th>
              <th className="py-1 px-2 border-b text-left text-gray-600 text-xs">URL</th>
              <th className="py-1 px-2 border-b text-left text-gray-600 text-xs">Created By</th>
              <th className="py-1 px-12 border-b text-left text-gray-600 text-xs">Created on</th>
              <th className="py-1 px-2 border-b text-left text-gray-600 text-xs">Modify by</th>
              <th className="py-1 px-2 border-b text-left text-gray-600 text-xs">Modify On</th>
              <th className="py-1 px-12 border-b text-left text-gray-600 text-xs">Action</th>
            </tr>
          </thead>
          <tbody>
            {notifications.map((notification) => (
              <tr key={notification.notification_id} className="hover:bg-gray-100">
                <td className="py-1 px-2 border-b text-black-2 text-xs">{notification.notification_id}</td>
                <td className="py-1 px-2 border-b text-black-2 text-xs">{notification.notification_message}</td>
                <td className="py-1 px-2 border-b text-black-2 text-xs">
                  {notification.notification_url ? (
                    <a
                      href={notification.notification_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline text-xs"
                    >
                      Open Link
                    </a>
                  ) : (
                    'No URL'
                  )}
                </td>
                <td className="py-1 px-2 border-b text-black-2 text-xs">{notification.created_by}</td>
                <td className="py-1 px-2 border-b text-black-2 text-xs">
                    {new Date(notification.created_on).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'numeric', // 'short' for abbreviated month names
                      day: 'numeric',
                      hour:'numeric',
                      minute:'2-digit',
                      second:'numeric'
                    })}
                </td>
                <td className="py-1 px-2 border-b text-black-2 text-xs">{notification.modify_by}</td>
                <td className="py-1 px-2 border-b text-black-2 text-xs">{notification.modify_on}</td>
                <td className="py-1 px-2 border-b text-black-2 text-xs">
                  <button
                    className={`text-white w-16 bg-green-500 px-2 py-1 rounded hover:bg-green-600 text-xs mr-1 ${
                      editingId ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    onClick={() => handleEditNotification(notification)}
                    disabled={editingId !== null}
                  >
                    {editingId === notification.notification_id ? 'Editing...' : 'Edit'}
                  </button>
                  <button
                    className={`text-white w-16 bg-red-500 px-2 py-1 rounded hover:bg-red-600 text-xs ${
                      editingId ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    onClick={() => handleDeleteNotification(notification.notification_id)}
                    disabled={editingId !== null}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default Addnotifications;
