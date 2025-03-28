// src/components/AddImportantLinks.tsx
import React, { useState, useEffect } from 'react';
import Breadcrumb from '../components/Breadcrumbs/Breadcrumb';
import { useAuth } from '../context/AuthContext';
import { useImportantLinks } from '../context/ImportantLinksContext';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Button, Modal } from "flowbite-react";
import { HiOutlineExclamationCircle } from "react-icons/hi";
import { FaEdit } from 'react-icons/fa';
import { MdAddLink, MdDelete } from 'react-icons/md';
import { usePermissions } from '../context/PermissionsContext';
import { useLocation } from 'react-router-dom';

const AddImportantLinks: React.FC = () => {
  const [linkName, setLinkName] = useState<string>('');
  const [linksUrl, setLinksUrl] = useState<string>('');
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPosition, setLogoPosition] = useState<number | ''>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [editingLink, setEditingLink] = useState<any>(null);
  const [addLinkModel, setAddLinkModel] = useState<boolean>(false);
  const [deleteLinkId, setDeleteLinkId] = useState<number | null>(null);
  const [openDeleteModal, setOpenDeleteModal] = useState<boolean>(false);
  const [isValidUrl, setIsValidUrl] = useState<boolean>(true); // State for URL validation
  const { user } = useAuth();
  const { links, uploadLink, deleteLink, updateLink, toggleVisibility, fetchLinks } = useImportantLinks();
  const created_by = user?.name || 'admin'; // Default to 'admin' if user?.name is undefined


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
  }, []);

  // Permissions and roles
   // Use useLocation to get the current path
    const location = useLocation();
  const currentPageName = location.pathname.split('/').pop(); 
  // console.log("currentPageName :", currentPageName);
  
  // Permissions and roles
  // Prefixing currentPageName with '/' to match the database format
  const prefixedPageUrl = `/${currentPageName}`;
  const pageId = pages.find(page => page.pageUrl === prefixedPageUrl)?.pageId;
  const roleId = roles.find(role => role.role_id === user?.roleId)?.role_id;
  const userPermissions = permissions.find(perm => perm.pageId === pageId && roleId === user?.roleId);
  const canCreate = userPermissions?.canCreate ?? false;
  const canUpdate = userPermissions?.canUpdate ?? false;
  const canDelete = userPermissions?.canDelete ?? false;
  const canRead = userPermissions?.canRead ?? false;

  // console.log('User Role ID:', user?.roleId);
  // console.log('Page ID:', pageId);
  // console.log('Permissions:', permissions);
  // console.log('User Permissions:', userPermissions);
  // console.log('Permission Values:', { canCreate, canUpdate, canDelete, canRead });

  // Fetch links when the component mounts
  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  // Handle input changes
  const handleLinkNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLinkName(e.target.value);
  };

  const handleLinksUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setLinksUrl(url);
    setIsValidUrl(isValidUrlFormat(url)); // Validate URL format
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setLogo(e.target.files[0]);
    } else {
      setLogo(null);
    }
  };

  const handleLogoPositionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoPosition(Number(e.target.value));
  };

  // URL validation function
  const isValidUrlFormat = (url: string) => {
    const pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
      '((([a-z0-9\\-]+\\.)+[a-z]{2,})|' + // domain name
      'localhost|' + // localhost
      '\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}|' + // IP address
      '\\[?[a-f0-9]*:[a-f0-9:%.~+\\-]*\\]?)' + // IPv6
      '(\\:\\d+)?(\\/[-a-z0-9+&@#/%=~_|\\?\\.:,]*)*' + // path
      '$', 'i'); // fragment locator
    return !!pattern.test(url);
  };

  // Handle upload of a new link
  const handleUpload = async () => {
    if (!linkName || !linksUrl || logoPosition === '') {
      toast.error('Please provide link name, URL, and logo position');
      return;
    }
    if (linkName.length > 180) {
      toast.error('Link name cannot exceed 180 characters');
      return;
    }
    if (linksUrl.length > 180) {
      toast.error('Link URL cannot exceed 180 characters');
      return;
    }
    if (!isValidUrl) {
      toast.error('Please provide a valid URL');
      return;
    }
    setIsUploading(true);
    await uploadLink(linkName, linksUrl, created_by, logo, logoPosition, true); // Set isVisible to true
    resetForm();
    setIsUploading(false);
    setAddLinkModel(false);
  };

  // Handle deletion of a link
  const handleDelete = async () => {
    if (deleteLinkId !== null) {
      await deleteLink(deleteLinkId);
      setOpenDeleteModal(false);
      setDeleteLinkId(null);
    }
  };

  // Handle editing of a link
  const handleEdit = (link: any) => {
    setEditingLink(link);
    setLinkName(link.logoName);
    setLinksUrl(link.linksUrl);
    setLogo(null);
    setLogoPosition(link.logoPosition || '');
  };

  // Handle updating of a link
  const handleUpdate = async () => {
    if (!editingLink) 
      return;

    if (!linkName || !linksUrl || logoPosition === '') {
      toast.error('Please provide link name, URL, and logo position');
      return;
    }
    if (linkName.length > 180) {
      toast.error('Link name cannot exceed 180 characters');
      return;
    }
    if (linksUrl.length > 180) {
      toast.error('Link URL cannot exceed 180 characters');
      return;
    }
    if (!isValidUrl) {
      toast.error('Please provide a valid URL');
      return;
    }

    await updateLink(editingLink.id, linkName, linksUrl, created_by, logo, logoPosition); // Use 'admin' as default
    toast.success("post updated sucessfully")
    resetForm();
  };

  // Reset the form
  const resetForm = () => {
    setEditingLink(null);
    setLinkName('');
    setLinksUrl('');
    setLogo(null);
    setLogoPosition('');
    setIsValidUrl(true); // Reset URL validation state
  };

  // Open the add link modal
  const addLink = () => {
    setAddLinkModel(true);
  };

  // Close the add link modal
  const addLinkCancel = () => {
    setAddLinkModel(false);
  };

  // Toggle visibility of a link
  const handleToggleVisibility = async (id: number, currentVisibility: boolean) => {
    const modifyBy = user?.name || 'admin'; // Default to 'admin' if user?.name is undefined
    await toggleVisibility(id, modifyBy, !currentVisibility); // Invert the current visibility
  };

  // Open delete confirmation modal
  const openDeleteConfirmation = (id: number) => {
    setDeleteLinkId(id);
    setOpenDeleteModal(true);
  };
  const [searchQuery, setSearchQuery] = useState('');
 
  const filteredLinks = links.filter(link =>
    link.logoName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(link.logoPosition).toLowerCase().includes(searchQuery.toLowerCase()) 
  );


  return (
    <>
      <Breadcrumb pageName="Add Important Links" />

      {/* Add Link Button */}
      <div className="flex items-center justify-between space-x-2 p-2 mb-4 dark:bg-meta-4 bg-gray-100 rounded-lg shadow-md">
  {/* Search Input */}
  <input
    type="search"
    className='py-1 px-3 bg-white border border-gray-300 rounded-md text-sm w-80 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 placeholder:text-[.8rem]'
    placeholder='Search  link  by name and position here...'
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)} // Update search query state
  />
  
  <button
  className={`px-1 py-1 w-28 flex justify-center gap-2 items-center text-sm text-white rounded-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 ${canCreate ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-400 cursor-not-allowed'}`}
  onClick={canCreate ? addLink : () => toast.error('Access Denied: You do not have permission to create links.')}
  disabled={!canCreate}
><MdAddLink />
  Add Link
</button>
</div>
      {/* Uploaded Links Section */}
      <div className="grid grid-cols-3 gap-4 dark:bg-meta-4">
        {filteredLinks.length > 0 ? (
          filteredLinks.map((link) => (
            <div key={link.id} className="p-2 border dark:text-white dark:font-normal dark:text-opacity-50 rounded overflow-hidden">
              <div className="text-sm p-1 mt-1">
                <img src={link.LOGOUrl} alt={link.logoName} className="w-24 h-24 object-fit"
                  style={{ opacity: link.IsVisible ? 1 : 0.3 }} />
              </div>
              <div className="font-normal">
                <p className="text-sm">
                  <span className="font-bold">Link Name: </span> {link.logoName}
                </p>
                <p className="text-sm">
                  <span className="font-bold">Link URL: </span> {link.linksUrl}
                </p>
                <p className="text-sm">
                  <span className="font-bold">Logo Position:</span> {link.logoPosition || 'N/A'}
                </p>
                <p className="text-sm">
                  <span className="font-bold">Created On:</span>
                  {link.created_on ? new Date(link.created_on).toLocaleDateString() : 'N/A'}
                </p>
                <p className="text-sm">
                  <span className="font-bold">Created By:</span> {link.created_by}
                </p>
                <p className="text-sm">
                  <span className="font-bold">Modified By:</span> {link.modify_by || 'N/A'}
                </p>
                <p className="text-sm">
                  <span className="font-bold">Modified On:</span>
                  {link.modify_on ? new Date(link.modify_on).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div className="flex justify-center gap-2 mt-1">
              <button
  className={`w-20 p-1 flex justify-center items-center gap-1 text-sm font-normal bg-green-500 text-white rounded-md hover:bg-green-600 ${!canUpdate || editingLink?.id === link.id ? 'opacity-50 cursor-not-allowed' : ''}`}
  onClick={canUpdate ? () => handleEdit(link) : () => toast.error('Access Denied: You do not have permission to edit links.')}
  disabled={!canUpdate && editingLink?.id === link.id}
><FaEdit />
  {editingLink?.id === link.id ? 'Editing...' : 'Edit'}
</button>
<button
    className={`w-20 flex justify-center items-center gap-1 text-sm rounded-md ${!canDelete || editingLink?.id === link.id ? 'bg-gray-400 text-gray-700 cursor-not-allowed' : 'bg-red-500 text-white hover:bg-red-600'}`}
    onClick={canDelete ? () => openDeleteConfirmation(link.id) : () => toast.error('Access Denied: You do not have permission to delete links.')}
    disabled={!canDelete && editingLink?.id === link.id}
  > <MdDelete />
    Delete
  </button>
  <label className="inline-flex items-center cursor-pointer">
    <input
      type="checkbox"
      checked={link.IsVisible}
      onChange={canRead ? () => handleToggleVisibility(link.id,link.isVisible) : () => toast.error('Access Denied: You do not have permission to update links.')}
      className="sr-only peer"
      disabled={!canRead}
    />
    <div className={`relative w-10 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 ${!canRead ? 'opacity-50 cursor-not-allowed' : 'peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600'}`}>
      <div className={`absolute top-0 left-0 w-5 h-5 bg-white border border-gray-300 rounded-full transition-transform duration-200 ease-in-out ${link.IsVisible ? 'translate-x-5' : ''}`}></div>
    </div>
    <span className={`ms-3 text-sm font-medium ${!canRead ? 'text-gray-400' : 'text-gray-900 dark:text-gray-300'}`}>
      IsVisible
    </span>
  </label>
              </div>
            </div>
          ))
        ) : (
          <p>No links found</p>
        )}
      </div>


      {/* Edit Modal */}
      {editingLink && (
        <div
          id="edit-modal"
          tabIndex={-1}
          className="fixed inset-0 z-50 ml-50 flex items-center justify-center bg-black bg-opacity-50"
        >
          <div className="relative p-4 w-full max-w-md max-h-full bg-white rounded-lg dark:bg-meta-4 shadow-md">
            {/* <h3 className="mb-1 text-lg font-bold dark:text-meta-5 text-gray-500">Edit Link</h3> */}
            <h3 className="mb-1 text-center bg-slate-300 mr-4 rounded-md text-lg font-bold dark:text-meta-5 text-blue-800">Edit Link</h3>

            <p className="font-semibold p-1">Link  Name</p>
            <input
              type="text"
              className="flex-1 p-2 w-100 mt-1 border dark:bg-meta-4 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Link Name"
              onChange={handleLinkNameChange}
              value={linkName}
            />
            <p className="font-semibold p-1">Link URL</p>
            <input
              type="text"
              className={`flex-1 p-2 w-100 mt-1 border dark:bg-meta-4 border-gray-300 rounded-md focus:outline-none focus:ring-2 ${
                isValidUrl ? 'border-gray-300' : 'border-red-500'
              } focus:ring-2 ${isValidUrl ? 'focus:ring-blue-500' : 'focus:ring-red-500'}`}
              placeholder="(e.g., https://example.com)"
              onChange={handleLinksUrlChange}
              value={linksUrl}
            />
            <p className="font-semibold p-1">Logo</p>
            <input
              type="file"
              className="flex-1 p-2 w-100 border dark:bg-meta-4 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={handleLogoChange}
            />
            <p className="font-semibold p-1">Logo Position</p>
            <input
              type="number"
              className="flex-1 p-2 w-100 mt-1 border dark:bg-meta-4 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Logo Position"
              onChange={handleLogoPositionChange}
              value={logoPosition}
            />
            <div className="flex justify-space-x-4 mt-4">
              <button
                onClick={handleUpdate}
                className={`px-4 py-2 text-white  bg-green-500 rounded-lg hover:bg-green-600 ${isUploading ? 'bg-gray-400 cursor-not-allowed' : ''}`}
                disabled={isUploading}
              >
                {isUploading ? 'Updating...' : 'Save Changes'}
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 mx-4 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Link Modal */}
      {addLinkModel && (
        <div
          id="add-modal"
          tabIndex={-1}
          className="fixed inset-0 z-50 ml-50 flex items-center justify-center bg-black bg-opacity-50"
        >
          <div className="relative p-4 w-full max-w-md max-h-full dark:bg-meta-4 bg-white rounded-lg shadow-md">
            <h3 className="mb-1 text-center bg-slate-300 mr-4 rounded-md text-lg font-bold dark:text-meta-5 text-blue-800">Add Link</h3>
            <p className="font-semibold p-1">Link Name</p>
            <input
              type="text"
              className="flex-1 p-2 w-100 dark:bg-meta-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 "
              onChange={handleLinkNameChange}
              value={linkName}
              placeholder='Enter Link Name'
            />
            <p className="font-semibold p-1">Link URL</p>
            <input
              type="text"
              className={`flex-1 w-100 p-2 border dark:bg-meta-4 border-gray-300 rounded-md focus:outline-none focus:ring-2 ${
                isValidUrl ? 'border-gray-300' : 'border-red-500'
              } focus:ring-2 ${isValidUrl ? 'focus:ring-blue-500' : 'focus:ring-red-500'}`}
              onChange={handleLinksUrlChange}
              value={linksUrl}
              placeholder='Enter Link URL'
            />
            <p className="font-semibold p-1">Logo</p>
            <input
              type="file"
              className="flex-1 p-2 border dark:bg-meta-4 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-100"
              onChange={handleLogoChange}
            />
            <p className="font-semibold p-1">Logo Position</p>
            <input
              type="number"
              placeholder='Enter Logo Position'
              className="flex-1 w-100 p-2 border dark:bg-meta-4 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={handleLogoPositionChange}
              value={logoPosition}
            />
            <div className="flex justify-between mt-4">
              <button
                className={`px-4 py-2 w-48 text-white bg-blue-500 rounded-md ${isUploading ? 'bg-gray-400 cursor-not-allowed' : 'hover:bg-blue-600'}`}
                onClick={handleUpload}
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload Link'}
              </button>
              <button
                onClick={addLinkCancel}
                className="px-4 py-2 text-gray-700 mr-4 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal className='ml-50  pt-40 bg-black ' show={openDeleteModal} size="md" onClose={() => setOpenDeleteModal(false)} popup>
        <Modal.Header />
        <Modal.Body>
          <div className="text-center">
            <HiOutlineExclamationCircle className="mx-auto mb-4 h-14 w-14 text-gray-400 dark:text-gray-200" />
            <h3 className="mb-5 text-lg font-normal text-gray-900 dark:text-gray-400">
              Are you sure you want to delete this link?
            </h3>
            <div className="flex justify-center text-white gap-4">
              <Button color="failure" className='bg-red-700' onClick={handleDelete}>
                {"Yes, I'm sure"}
              </Button>
              <Button color="gray" onClick={() => setOpenDeleteModal(false)}>
                No, cancel
              </Button>
            </div>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default AddImportantLinks;