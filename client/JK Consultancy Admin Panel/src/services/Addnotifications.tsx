import { useState } from 'react';
import Breadcrumb from '../components/Breadcrumbs/Breadcrumb';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { toast } from 'react-toastify';
import { HiOutlineExclamationCircle } from "react-icons/hi";
import { Button, Modal } from "flowbite-react";


const Addnotifications = () => {
  const [addNotification, setAddNotification] = useState<string>(''); // Notification message
  const [inputType, setInputType] = useState<'url' | 'file' | 'select'>('select'); // Input type: URL, File, or Select
  const [url, setUrl] = useState<string>(''); // URL input
  const [file, setFile] = useState<File | null>(null); // File input
  const [isUploading, setIsUploading] = useState<boolean>(false); // Track file upload status
  const [isValidUrl, setIsValidUrl] = useState<boolean>(true); // Validate URL input
  const [editingId, setEditingId] = useState<number | null>(null); // Tracks the notification being edited
  const [isUpdating, setIsUpdating] = useState<boolean>(false); // Track if updating
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false); // Add modal visibility
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false); // Edit modal visibility
  const [openDeleteModal, setOpenDeleteModal] = useState<boolean>(false); // Delete modal visibility
  const [notificationIdToDelete, setNotificationIdToDelete] = useState<number | null>(null); // ID of notification to delete

  const { user } = useAuth();
  const { notifications, addNotification: addNotificationContext, editNotification, deleteNotification } =
    useNotifications();

  const userId = user?.user_id;
  const createdBy = user?.name || 'admin';
  const modify_by = user?.name; // Get modify_by from user context

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

  // Open Add Modal
  const openAddModal = () => {
    setIsAddModalOpen(true);
  };

  // Close Add Modal
  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setAddNotification('');
    setUrl('');
    setFile(null);
    setInputType('select'); // Reset input type to default
  };

  // Open Edit Modal and prefill data
  const openEditModal = (notification: any) => {
    setEditingId(notification.notification_id);
    setAddNotification(notification.notification_message);
    setUrl(notification.notification_url || '');
    setInputType(notification.notification_url ? 'url' : 'file');
    setIsEditModalOpen(true);
  };

  // Close Edit Modal
  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingId(null);
    setAddNotification('');
    setUrl('');
    setFile(null);
  };

  // Handle Add Notification
  const handleAddNotification = async () => {
    if (!addNotification) {
      toast.error('Please enter a notification message');
      return;
    }
    if(addNotification.length>100){
      toast.error('notification message cannot exceed 100 characters');
      return;
    }

    if (!userId || !createdBy) {
      toast.error('User  data is missing. Please log in again.');
      return;
    }

    if (inputType === 'url' && (!url || !isValidUrl)) {
      toast.error('Please enter a valid URL');
      return;
    }

    if (inputType === 'file' && !file) {
      toast.error('Please select a file.');
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
      toast.success('Notification added successfully!');
      closeAddModal();
    } catch (error) {
      toast.error('Failed to add notification');
    } finally {
      setIsUploading(false);
    }
  };

  

  // Handle Save Notification (Edit)
  const handleSaveNotification = async () => {
    if (!editingId) return;

    setIsUpdating(true); // Set updating state to true
    const formData = new FormData();
    formData.append('notification_message', addNotification);
    formData.append('modify_by', modify_by || 'admin'); // Add modify_by to formData

    if (inputType === 'url') {
      formData.append('url', url);
    } else if (inputType === 'file' && file) {
      formData.append('file', file);
    }

    try {
      await editNotification(editingId, formData);
      if(addNotification.length>50){
        toast.error('notification message cannot exceed 100 characters');
        return;
      }
      toast.success('Notification updated successfully!');
      closeEditModal();
    } catch (error) {
      toast.error('Failed to update notification');
    } finally {
      setIsUpdating(false); // Reset updating state
    }
  };

  // Handle Delete Notification
  const handleDeleteNotification = async () => {
    if (notificationIdToDelete === null) return;

    try {
      await deleteNotification(notificationIdToDelete);
      toast.success('Notification deleted successfully!');
      setOpenDeleteModal(false); // Close the modal after deletion
      setNotificationIdToDelete(null); // Reset the ID
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  // Function to format date as DD-MM-YYYY
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  return (
    <>
   
      <Breadcrumb pageName="Add Notification" />

      {/* Add Notification Button */}
      <div className="flex items-center justify-end space-x-2 p-1.5 bg-gray-100 rounded-lg shadow-md dark:bg-meta-4">
        <button
          className="px-4 py-2  text-white bg-blue-500 rounded -md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
          onClick={openAddModal}
        >
          Add Notification
        </button>
      </div>

      {/* Add Notification Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 flex  ml-70 items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 h-auto dark:bg-meta-4 rounded-lg shadow-lg w-96">
            {/* <h2 className="text-lg font-bold mb-4 dark:text-meta-5"></h2> */}
            <h3 className="mb-1 text-center bg-slate-300 p-1 rounded-md text-lg font-bold dark:text-meta-5 text-blue-800">Add Notification</h3>

            <p className='font-semibold'>Notification Message</p>
            <input
              type="text"
              className="w-full p-2 dark:bg-meta-4 mb-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter notification"
              value={addNotification}
              onChange={(e) => setAddNotification(e.target.value)}
            />
             <p className='font-semibold'>Notification type</p>
            <select
              className="w-full p-2 mb-4 border dark:bg-meta-4 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={inputType}
              onChange={(e) => setInputType(e.target.value as 'url' | 'file')}
            >
           <option value="select">---Select---</option>
              <option value="url">URL</option>
              <option value="file">File</option>
            </select>
  
            {inputType === 'url' && (<>
      
               <p className='font-semibold'>Notification url</p>
              <input
                type="text"
                className={`w-full p-2 mb-4 border dark:bg-meta-4 ${
                  isValidUrl ? 'border-gray-300' : 'border-red-500'
                } rounded-md focus:outline-none focus:ring-2 ${
                  isValidUrl ? 'focus:ring-blue-500' : 'focus:ring-red-500'
                }`}
                placeholder="(e.g., https://example.com)"
                value={url}
                onChange={handleUrlChange}
              />
                    </>
            )}

            {inputType === 'file' && (
              <>
               <p className='font-semibold'>Notification file</p>
              <input
                type="file"
                className="w-full p-2 mb-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
             </>
            )}

            <div className="flex justify-end space-x-2">
              <button
                className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
                onClick={handleAddNotification}
                disabled={isUploading || (inputType === 'url' && !isValidUrl)}
              >
                {isUploading ? 'Uploading...' : 'Add'}
              </button>
              <button
                className="px-4 py-2 text-white bg-gray-500 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
                onClick={closeAddModal}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Notification Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 flex ml-70 items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg dark:bg-meta-4 shadow-lg w-96">
            {/* <h2 className="text-lg font-bold mb-4 dark:text-meta-5">Edit Notification</h2> */}
            <h3 className="mb-1 text-center bg-slate-300  rounded-md text-lg font-bold dark:text-meta-5 p-1 text-blue-800">Edit Notification</h3>

            <p className='font-semibold'>Notification Message</p>
            <input
              type="text"
              className="w-full p-2 mb-4 border dark:bg-meta-4 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter notification"
              value={addNotification}
              onChange={(e) => setAddNotification(e.target.value)}
            />
             <p className='font-semibold'>Notification type</p>
            <select
              className="w-full p-2 mb-4 border dark:bg-meta-4 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={inputType}
              onChange={(e) => setInputType(e.target.value as 'url' | 'file')}
            >
              <option value="url">URL</option>
              <option value="file">File</option>
            </select>

            {inputType === 'url' && (
              <>
               <p className='font-semibold'>Notification url</p>
              <input
                type="text"
                className={`w-full p-2 mb-4 border dark:bg-meta-4 ${
                  isValidUrl ? 'border-gray-300' : 'border-red-500'
                } rounded-md focus:outline-none focus:ring-2 ${
                  isValidUrl ? 'focus:ring-blue-500' : 'focus:ring-red-500'
                }`}
                placeholder="(e.g., https://example.com)"
                value={url}
                onChange={handleUrlChange}
              />
                    </>
            )}

            {inputType === 'file' && (
              <> <p className='font-semibold'>Notification file</p>
              <input
                type="file"
                className="w-full p-2 mb-4 border border-gray-300 rounded -md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
             </>
            )}

            <div className="flex justify-end space-x-2">
              <button
                className="px-4 py-2 text-white bg-green-500 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-300"
                onClick={handleSaveNotification}
                disabled={isUpdating || (inputType === 'url' && !isValidUrl)}
              >
                {isUpdating ? 'Updating...' : 'Save'}
              </button>
              <button
                className="px-4 py-2 text-white bg-gray-500 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
                onClick={closeEditModal}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal className='ml-60 mt-40 bg-gray-3 ' show={openDeleteModal} size="md" onClose={() => setOpenDeleteModal(false)} popup>
        <Modal.Header />
        <Modal.Body>
          <div className="text-center">
            <HiOutlineExclamationCircle className="mx-auto mb-4 h-14 w-14 text-gray-400 dark:text-gray-200" />
            <h3 className="mb-5 text-lg font-normal text-gray-900 dark:text-gray-400">
              Are you sure you want to delete this notification?
            </h3>
            <div className="flex justify-center text-white gap-4">
              <Button color="failure" className='bg-red-700' onClick={handleDeleteNotification}>
                {"Yes, I'm sure"}
              </Button>
              <Button color="gray" onClick={() => setOpenDeleteModal(false)}>
                No, cancel
              </Button>
            </div>
          </div>
        </Modal.Body>
      </Modal>

      {/* Notifications Table */}
      <div className="mt-6 p-4 bg-white dark:bg-meta-4   rounded-lg shadow-md">
        <h2 className="text-sm font-bold text-cyan-900 text-center dark:text-meta-5 mb-2">Notifications</h2>
     <table className="min-w-full bg-white border border-gray-400 dark:bg-meta-4">
  <thead className="bg-gray-300 dark:bg-gray-900">
    <tr>
      <th className="py-2 px-3 border-b text-left text-gray-600 dark:text-white dark:text-opacity-50 text-xs font-semibold">ID</th>
      <th className="py-2 px-3 border-b text-left text-gray-600 dark:text-white dark:text-opacity-50 text-xs font-semibold">Message</th>
      <th className="py-2 px-3 border-b text-left text-gray-600 dark:text-white dark:text-opacity-50 text-xs font-semibold">URL</th>
      <th className="py-2 px-3 border-b text-left text-gray-600 dark:text-white dark:text-opacity-50 text-xs font-semibold">Created By</th>
      <th className="py-2 px-3 border-b text-left text-gray-600 dark:text-white dark:text-opacity-50 text-xs font-semibold">Created On</th>
      <th className="py-2 px-3 border-b text-left text-gray-600 dark:text-white dark:text-opacity-50 text-xs font-semibold">Modified By</th>
      <th className="py-2 px-3 border-b text-left text-gray-600 dark:text-white dark:text-opacity-50 text-xs font-semibold">Modified On</th>
      <th className="py-2 px-3 border-b text-left pl-16 text-gray-600 dark:text-white dark:text-opacity-50 text-xs font-semibold">Action</th>
    </tr>
  </thead>
  <tbody>
    {notifications.map((notification) => (
      <tr key={notification.notification_id} className="font-normal hover:bg-gray-100 dark:hover:bg-gray-600 transition duration-200">
        <td className="py-2 px-3 border-b text-black dark:text-opacity-50 dark:text-white text-xs">{notification.notification_id}</td>
        <td className="py-2 px-3 border-b text-black dark:text-opacity-50 dark:text-white text-xs">{notification.notification_message}</td>
        <td className="py-2 px-3 border-b text-black dark:text-opacity-50 text-xs">
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
        <td className="py-2 px-3 border-b text-black dark:text-opacity-50 dark:text-white text-xs">{notification.created_by}</td>
        <td className="py-2 px-3 border-b text-black dark:text-opacity-50 dark:text-white text-xs">
          {formatDate(notification.created_on)}
        </td>
        <td className="py-2 px-3 border-b text-black dark:text-opacity-50 dark:text-white text-xs">{notification.modify_by}</td>
        <td className="py-2 px-3 border-b text-black dark:text-opacity-50 dark:text-white text-xs">
          {notification.modify_on ? formatDate(notification.modify_on) : 'N/A'}
        </td>
        <td className="py-2 px-3 border-b text-xs">
          <button
            className="text-white w-16 bg-green-500 px-2 py-1 rounded hover:bg-green-600 transition duration-200"
            onClick={() => openEditModal(notification)}
          >
            Edit
          </button>
          <button
            className="text-white w-16 bg-red-500 ml-2 px-2 py-1 rounded hover:bg-red-600 transition duration-200"
            onClick={() => {
              setNotificationIdToDelete(notification.notification_id);
              setOpenDeleteModal(true);
            }}
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