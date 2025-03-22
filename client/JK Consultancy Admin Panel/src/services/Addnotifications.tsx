
import { useEffect, useState } from 'react';
import Breadcrumb from '../components/Breadcrumbs/Breadcrumb';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { toast } from 'react-toastify';
import { HiOutlineExclamationCircle } from "react-icons/hi";
import { Button, Modal } from "flowbite-react";
import { MdNotificationAdd,MdEditNotifications,MdDelete   } from "react-icons/md";
import { usePermissions } from '../context/PermissionsContext';
import { useLocation } from 'react-router-dom';


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

  const {
    fetchRoles,
    fetchPages,
    fetchPermissions,
    roles,
    pages,
    permissions,
  } = usePermissions();

  // Use useEffect to fetch data when the component mounts
  useEffect(() => {
    const fetchData = async () => {
      await fetchRoles();
      await fetchPages();
      await fetchPermissions();
    };

    fetchData();
  }, [fetchRoles, fetchPages, fetchPermissions]);

// Empty dependency array means this runs once when the component mounts

  const { user } = useAuth();
  const { addNotification: addNotificationContext, editNotification, deleteNotification, searchNotifications } = useNotifications();

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
    if (addNotification.length > 100) {
      toast.error('Notification message cannot exceed 100 characters');
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
      if (addNotification.length > 100) {
        toast.error('Notification message cannot exceed 100 characters');
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

  const [searchQuery, setSearchQuery] = useState<string>('');
  const filteredNotifications = searchNotifications(searchQuery);


    // Permission checks
    // Use useLocation to get the current path
     const location = useLocation();
   const currentPageName = location.pathname.split('/').pop(); 
   console.log("currentPageName :", currentPageName);
   
   // Permissions and roles
   // Prefixing currentPageName with '/' to match the database format
   const prefixedPageUrl = `/${currentPageName}`;
   const pageId = pages.find(page => page.pageUrl === prefixedPageUrl)?.pageId;
    
    const roleId=roles.find(role=>role.role_id===user?.roleId)?.role_id;
    // console.log(roleId)
    const userPermissions = permissions.find(perm => perm.pageId === pageId && roleId===user?.roleId);
    const canCreate = userPermissions?.canCreate ?? false;
    const canUpdate = userPermissions?.canUpdate ?? false;
    const canDelete = userPermissions?.canDelete ?? false;
    // const canRead = userPermissions?.canRead ?? false;   
          // console.log('User Role ID:', user?.roleId);
          // console.log('Page ID:', pageId);
          // console.log('Permissions:', permissions);
          // console.log('User Permissions:', userPermissions);
          // console.log('Permission Values:', { canCreate, canUpdate, canDelete, canRead });
       
  return (
    <>
      <Breadcrumb pageName="Add Notification" />
      {/* Add Notification Button */}
      <div className="flex items-center justify-between space-x-2 p-2 mb-3 bg-gray-100 rounded-lg shadow-md dark:bg-meta-4">
        {/* Search Input */}
        <input
          type="search"
          className='py-1 px-3 bg-white border border-gray-300 rounded-md text-sm w-80 placeholder:text-[.8rem] focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 dark:bg-gray-600'
          placeholder='Search Message here...'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)} // Update search query state
        />
        <button
          className={`px-4 py-1  hover:scale-105 flex text-sm text-white bg-blue-500 rounded-md hover:bg-blue-600 transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue- 400 ${!canCreate ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={canCreate ? openAddModal : () => toast.error('Access Denied')}
        ><MdNotificationAdd className='mt-0.5 mr-1'/>
          Add Notification
        </button>
      </div>

      {/* Add Notification Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 flex ml-50 items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 h-auto dark:bg-meta-4 rounded-lg shadow-lg w-96">
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

            {inputType === 'url' && (
              <>
                <p className='font-semibold'>Notification url</p>
                <input
                  type="text"
                  className={`w-full p-2 mb-4 border dark:bg-meta-4 ${isValidUrl ? 'border-gray-300' : 'border-red-500'} rounded-md focus:outline-none focus:ring-2 ${isValidUrl ? 'focus:ring-blue-500' : 'focus:ring-red-500'}`}
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
                className={`px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 ${isUploading || (inputType === 'url' && !isValidUrl) ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={canCreate ? handleAddNotification : () => toast.error('Access Denied')}
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
        <div className="fixed inset-0 flex ml-50 items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg dark:bg-meta-4 shadow-lg w-96">
            <h3 className="mb-1 text-center bg-slate-300 rounded-md text-lg font-bold dark:text-meta-5 p-1 text-blue-800">Edit Notification</h3>

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
                  className={`w-full p-2 mb-4 border dark:bg-meta-4 ${isValidUrl ? 'border-gray-300' : 'border-red-500'} rounded-md focus:outline-none focus:ring-2 ${isValidUrl ? 'focus:ring-blue-500' : 'focus:ring-red-500'}`}
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
                className={`px-4 py-2 text-white bg-green-500 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-300 ${isUpdating || (inputType === 'url' && !isValidUrl) ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={canUpdate ? handleSaveNotification : () => toast.error('Access Denied')}
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
      <Modal className='ml-50 mt-10 pt-40 bg-black ' show={openDeleteModal} size="md" onClose={() => setOpenDeleteModal(false)} popup>
        <Modal.Header />
        <Modal.Body>
          <div className="text-center">
            <HiOutlineExclamationCircle className="mx-auto mb-4 h-14 w-14 text-gray-400 dark:text-gray-200" />
            <h3 className="mb-5 text-lg font-normal text-gray-900 dark:text-gray-400">
              Are you sure you want to delete this notification?
            </h3>
            <div className="flex justify-center text-white gap-4">
              <Button color="failure" className='bg-red-700' onClick={canDelete ? handleDeleteNotification : () => toast.error('Access Denied')}>
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
      <div className="mt-2 p-3 bg-white dark:bg-meta-4 rounded-lg shadow-md">
        <h2 className="text-xs font-bold text-cyan-900 text-center dark:text-meta-5 mb-2">Notifications</h2>
        <table className="min-w-full bg-white border border-gray-300 dark:bg-meta-4 text-xs">
          <thead className="bg-gray-200 dark:bg-gray-900">
            <tr>
              <th className="py-1 px-2 border-b text-left text-gray-600 dark:text-white font-semibold">ID</th>
              <th className="py-1 px-2 border-b text-left text-gray-600 dark:text-white font-semibold">Message</th>
              <th className="py-1 px-2 border-b text-left text-gray-600 dark:text-white font-semibold">URL</th>
              <th className="py-1 px-2 border-b text-left text-gray-600 dark:text-white font-semibold">Created By</th>
              <th className="py-1 px-2 border-b text-left text-gray-600 dark:text-white font-semibold">Created On</th>
              <th className="py-1 px -2 border-b text-left text-gray-600 dark:text-white font-semibold">Modified By</th>
              <th className="py-1 px-2 border-b text-left text-gray-600 dark:text-white font-semibold">Modified On</th>
              <th className="py-1 px-2 border-b text-left text-gray-600 dark:text-white font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notification) => (
                <tr key={notification.notification_id} className="hover:bg-gray-100 dark:hover:bg-gray-600 transition duration-150">
                  <td className="py-1 px-2 border-b text-black dark:text-white">{notification.notification_id}</td>
                  <td className="py-1 px-2 border-b text-black dark:text-white">{notification.notification_message}</td>
                  <td className="py-1 px-2 border-b text-black dark:text-white">
                    {notification.notification_url ? (
                      <a href={notification.notification_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                        Open Link
                      </a>
                    ) : (
                      'No URL'
                    )}
                  </td>
                  <td className="py-1 px-2 border-b text-black dark:text-white">{notification.created_by}</td>
                  <td className="py-1 px-2 border-b text-black dark:text-white">{formatDate(notification.created_on)}</td>
                  <td className="py-1 px-2 border-b text-black dark:text-white">{notification.modify_by ? notification.modify_by:'N/A'}</td>
                  <td className="py-1 px-2 border-b text-black dark:text-white">
                    {notification.modify_on ? formatDate(notification.modify_on) : 'N/A'}
                  </td>
                  <td className="py-1 px-2 border-b">
                    <div className="flex space-x-1">
                      <button
                        className={`flex hover:scale-105 text-white text-xs bg-green-500 px-2 py-1 rounded hover:bg-green-600 transition duration-150 ${!canUpdate ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={canUpdate ? () => openEditModal(notification) : () => toast.error('Access Denied')}
                      >
                        <MdEditNotifications  className='mt-0.5 mr-1' />
                        Edit
                      </button>
                      <button
                        className={`flex hover:scale-105 text-white text-xs bg-red-500 px-2 py-1 rounded hover:bg-red-600 transition duration-150 ${!canDelete ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={canDelete ? () => {
                          setNotificationIdToDelete(notification.notification_id);
                          setOpenDeleteModal(true);
                        } : () => toast.error('Access Denied')}
                      >
                         <MdDelete   className='mt-0.5 mr-1 ' />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="py-2 px-2 border-b text-center text-gray-600 dark:text-white text-xs">
                  Not Found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default Addnotifications;
