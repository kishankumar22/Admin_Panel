// src/components/AddGallery.tsx
import { useState, useRef, useEffect } from 'react';
import Breadcrumb from '../components/Breadcrumbs/Breadcrumb';
import { useAuth } from '../context/AuthContext';
import { useGallery } from '../context/GalleryContext';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { HiOutlineExclamationCircle } from "react-icons/hi";
import { Button, Modal } from "flowbite-react";
import { MdDelete } from 'react-icons/md';
import { FaArrowLeft, FaArrowRight, FaEdit,  FaUpload } from 'react-icons/fa';
import { usePermissions } from '../context/PermissionsContext';
import { useLocation } from 'react-router-dom';

const AddGallery: React.FC = () => {
  const [file, setFile] = useState<File | undefined>(undefined);
  const [galleryName, setGalleryName] = useState<string>('');
  const [galleryPosition, setGalleryPosition] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [editingGallery, setEditingGallery] = useState<any>(null);
  const [AddGalleryModel, setAddGalleryModel] = useState<boolean>(false);
  const [openDeleteModal, setOpenDeleteModal] = useState<boolean>(false);
  const [galleryIdToDelete, setGalleryIdToDelete] = useState<number | null>(null);
  const { user } = useAuth();
  const createdBy = user?.name || 'admin';
  const { galleries, uploadGallery, deleteGallery, updateGallery, toggleVisibility } = useGallery();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
    // const roleId = roles.find(role => role.role_id === user?.roleId)?.role_id;
  const userPermissions = permissions.find(perm => perm.pageId === pageId && perm.roleId === user?.roleId);
 const loggedroleId = user?.roleId;
// Set default permissions based on role ID
const defaultPermission = loggedroleId === 2;

// Use provided permissions if available, otherwise fall back to defaultPermission
const canCreate = userPermissions?.canCreate ?? defaultPermission;
const canUpdate = userPermissions?.canUpdate ?? defaultPermission;
const canDelete = userPermissions?.canDelete ?? defaultPermission;
const canRead   = userPermissions?.canRead   ?? defaultPermission;

  // console.log('User Role ID:', user?.roleId);
  // console.log('Page ID:', pageId);
  // console.log('Permissions:', permissions);
  // console.log('User Permissions:', userPermissions);
  // console.log('Permission Values:', { canCreate, canUpdate, canDelete, canRead });


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    } else {
      setFile(undefined);
    }
  };


  const handleGalleryNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (galleryName.length > 100) {
      toast.error('Gallery name cannot exceed 100 characters');
      return;
    }

    setGalleryName(e.target.value);
  };

  const handlePositionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGalleryPosition(e.target.value);
  };

  const handleUpload = async () => {
    if (!file || !galleryName || !galleryPosition) {
      toast.error('Please provide file, gallery name, and position');
      return;
    }
    setIsUploading(true);
    await uploadGallery(file, galleryName, galleryPosition, createdBy);
    resetForm();
    setIsUploading(false);
    setAddGalleryModel(false);
  };

  const handleDelete = async (id: number) => {
    await deleteGallery(id);
    setOpenDeleteModal(false);
    setGalleryIdToDelete(null);
  };

  const handleEdit = (gallery: any) => {
    setEditingGallery(gallery);
    setGalleryName(gallery.galleryName);
    setGalleryPosition(gallery.galleryPosition.toString());
    setFile(undefined);
  };

  const handleUpdate = async () => {
    if (!editingGallery) return;

    if (!galleryName || !galleryPosition) {
      toast.error('Please provide gallery name and position');
      return;
    }
    if (galleryName.length > 100) {
      toast.error('Gallery name cannot exceed 100 characters');
      return;
    }

    await updateGallery(editingGallery.id, galleryName, galleryPosition, file, user?.name);
    resetForm();
  };

  const resetForm = () => {
    setEditingGallery(null);
    setGalleryName('');
    setGalleryPosition('');
    setFile(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addGallery = () => {
    setAddGalleryModel(true);
  };

  const addGalleryCancel = () => {
    setAddGalleryModel(false);
  };

  const handleToggleVisibility = async (id: number) => {
    await toggleVisibility(id, user?.name || 'admin');
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // Adjust this based on how many items you want to display per page
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter galleries based on the search query
  const filteredGalleries = galleries.filter(gallery =>
    gallery.galleryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(gallery.galleryPosition).toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Get current items to display based on pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredGalleries.slice(indexOfFirstItem, indexOfLastItem);
  
  // Total pages for pagination
  const totalPages = Math.ceil(filteredGalleries.length / itemsPerPage);
  
  const handlePageChange = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };
  
  
  return (
    <>
      <Breadcrumb pageName="Add Gallery" />
      <div className="flex items-center justify-between space-x-2 p-2 dark:bg-meta-4 bg-gray-100 rounded-lg shadow-md">
      <div className="flex items-center">
  
        <input
          type="search"
          className='p-1 bg-white border border-gray-300 rounded-md placeholder:text-[.8rem] text-sm w-80 focus:outline-none focus:ring-4 focus:ring-blue-500 transition duration-200'
          placeholder='Search gallery pic by name and position here...'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)} // Update search query state
        />
      </div>
      <button
        className={`ml-2 px-4 py-1 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 ${!canCreate ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={canCreate ? addGallery : () => toast.error('Access Denied: You do not have permission to create banners.')}
      >
        <FaUpload className="inline-block mr-1" /> {/* Upload Icon */}
        Upload Gallery
      </button>
    </div>
      {/* Gallery List */}
      <div className="mt-6 p-3 bg-white dark:bg-meta-4 rounded-lg shadow-md">
    <h2 className="text-sm font-bold text-cyan-900 text-center dark:text-meta-5 mb-2">Uploaded Galleries</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {currentItems.length > 0 ? (
        currentItems.map((gallery) => (
          <div key={gallery.id} className="p-2 border rounded overflow-hidden">
            <img
              src={gallery.galleryUrl}
              alt={gallery.galleryName}
              className="w-full h-32 object-cover"
              style={{ opacity: gallery.IsVisible ? 1 : 0.3 }}
            />
            <div className="text-sm mt-1">
              <b className="font-bold">Position: {gallery.galleryPosition}</b>
            </div>
            <div className="text-sm">
              <p className='font-bold'>Gallery Name: <b className='font-normal'>{gallery.galleryName}</b></p>
              <p>
                <span className="font-bold">Created On:</span>
                {gallery.created_on ? new Date(gallery.created_on).toLocaleDateString() : 'N/A'}
              </p>
              <p><span className="font-bold">Created By:</span> {gallery.created_by}</p>
              <p><span className="font-bold">Modified By:</span> {gallery.modify_by || 'N/A'}</p>
              <p>
                <span className="font-bold">Modified On:</span>
                {gallery.modify_on ? new Date(gallery.modify_on).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div className="flex justify-center gap-2 mt-1">
              <button
                className={`w-20 p-1 flex justify-center items-center gap-1.5 text-sm font-normal bg-green-500 text-white rounded-md hover:bg-green-600 ${!canUpdate || editingGallery?.id === gallery.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={canUpdate ? () => handleEdit(gallery) : () => toast.error('Access Denied: You do not have permission to update galleries.')}
                disabled={!canUpdate && editingGallery?.id === gallery.id}
              >
                <FaEdit />
                {editingGallery?.id === gallery.id ? 'Editing...' : 'Edit'}
              </button>
              <button
                className={`w-20 flex justify-center items-center gap-1.5 text-sm rounded-md ${!canDelete || editingGallery?.id === gallery.id ? "opacity-50 cursor-not-allowed bg-gray-400 text-gray-700" : "bg-red-500 text-white hover:bg-red-600"}`}
                onClick={canDelete ? () => {
                  setGalleryIdToDelete(gallery.id);
                  setOpenDeleteModal(true);
                } : () => toast.error('Access Denied: You do not have permission to delete galleries.')}
                disabled={!canDelete && editingGallery?.id === gallery.id}
              >
                <MdDelete />
                Delete
              </button>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={gallery.IsVisible}
                  onClick={canRead ? () => handleToggleVisibility(gallery.id) : () => toast.error('Access Denied: You do not have permission to update galleries.')}
                  className="sr-only peer"
                />
                <div className={`relative w-10 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 ${!canRead ? 'opacity-50 cursor-not-allowed' : 'peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600'}`}>
                  <div className={`absolute top-0 left-0 w-5 h-5 bg-white border border-gray-300 rounded-full transition-transform duration-200 ease-in-out ${gallery.IsVisible ? 'translate-x-5' : ''}`}></div>
                </div>
                <span className={`ms-3 text-sm font-medium ${!canRead ? 'text-gray-400' : 'text-gray-900 dark:text-gray-300'}`}>
                  IsVisible
                </span>
              </label>
            </div>
          </div>
        ))
      ) : (
        <p>No galleries found</p>
      )}
    </div>

    {/* Pagination Controls */}
    <div className="flex justify-center mt-4 items-center gap-2">
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        className={`px-3 py-1 rounded-md flex items-center gap-1 ${currentPage === 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
        disabled={currentPage === 1}
      >
        <FaArrowLeft /> Prev
      </button>

      {Array.from({ length: totalPages }, (_, index) => (
        <button
          key={index + 1}
          onClick={() => handlePageChange(index + 1)}
          className={`px-3 py-1 rounded-md ${currentPage === index + 1 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        >
          {index + 1}
        </button>
      ))}

      <button
        onClick={() => handlePageChange(currentPage + 1)}
        className={`px-3 py-1 rounded-md flex items-center gap-1 ${currentPage === totalPages ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
        disabled={currentPage === totalPages}
      >
        Next <FaArrowRight />
      </button>
    </div>
  </div>

      {/* Edit Modal */}
      {editingGallery && (
        <div
          id="edit-modal"
          tabIndex={-1}
          className="fixed inset-0 z-999 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4"
        >
          <div className="relative p-4 w-full max-w-sm bg-white dark:bg-meta-4 rounded-lg shadow-md">
            {/* Title */}
            <h3 className="mb-2 focus:ring-4 focus:ring-green-300  text-center bg-slate-300 p-2 rounded-md text-lg font-bold dark:text-meta-5 text-blue-800">
              Edit Gallery
            </h3>

            {/* Form Fields */}
            <div className="space-y-3">
              <div>
                <p className="font-semibold">File</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  onChange={handleFileChange}
                />
              </div>

              <div>
                <p className="font-semibold">Gallery Name</p>
                <input
                  type="text"
                  className="w-full p-2 border dark:bg-meta-4 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="Gallery Name"
                  onChange={handleGalleryNameChange}
                  value={galleryName}
                />
              </div>

              <div>
                <p className="font-semibold">Gallery Position</p>
                <input
                  type="number"
                  className="w-full p-2 border dark:bg-meta-4 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="Gallery Position"
                  onChange={handlePositionChange}
                  value={galleryPosition}
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-between mt-4">
              <button
                onClick={handleUpdate}
                className={`px-4 py-2 text-white bg-green-500 rounded-md ${isUploading ? 'bg-gray-400 cursor-not-allowed' : 'hover:bg-green-600'}`}
                disabled={isUploading}
              >
                {isUploading ? 'Updating...' : 'Save Changes'}
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Add Gallery Modal */}
      {AddGalleryModel && (
        <div
          id="add-modal"
          tabIndex={-1}
          className="fixed inset-0 z-999 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4"
        >
          <div className="relative p-4 w-full max-w-sm bg-white dark:bg-meta-4 rounded-lg shadow-md">
            {/* Title */}
            <h3 className="mb-2 text-center bg-slate-300 p-2 rounded-md text-lg font-bold dark:text-meta-5 text-blue-800">
              Add Gallery
            </h3>

            {/* Form Fields */}
            <div className="space-y-3">
              <div>
                <p className="font-semibold">File</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  onChange={handleFileChange}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <p className="font-semibold">Gallery Name</p>
                  <input
                    type="text"
                    className="w-full p-2 border dark:bg-meta-4 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="Gallery Name"
                    onChange={handleGalleryNameChange}
                    value={galleryName}
                  />
                </div>
                <div>
                  <p className="font-semibold">Position</p>
                  <input
                    type="number"
                    className="w-full p-2 border dark:bg-meta-4 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="#"
                    onChange={handlePositionChange}
                    value={galleryPosition}
                  />
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-between mt-4">
              <button
                className={`px-4 py-2 w-48 text-white bg-blue-500 rounded-md ${isUploading ? 'bg-gray-400 cursor-not-allowed' : 'hover:bg-blue-600'}`}
                onClick={handleUpload}
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload File'}
              </button>
              <button
                onClick={addGalleryCancel}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Delete Confirmation Modal */}
      <Modal
        show={openDeleteModal}
        size="md"
        onClose={() => setOpenDeleteModal(false)}
        popup
        className="fixed inset-0  pt-70 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
      >
        <Modal.Header />
        <Modal.Body>
          <div className="text-center">
            <HiOutlineExclamationCircle className="mx-auto mb-4 h-14 w-14 text-gray-400 dark:text-gray-200" />
            <h3 className="mb-5 text-lg font-medium text-gray-900 dark:text-gray-300">
              Are you sure you want to delete this gallery?
            </h3>
            <div className="flex justify-center gap-4">
              <Button
                color="failure"
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition"
                onClick={() => galleryIdToDelete && handleDelete(galleryIdToDelete)}
              >
                {"Yes, I'm sure"}
              </Button>
              <Button
                color="gray"
                className="bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded-md transition dark:bg-gray-600 dark:hover:bg-gray-700 dark:text-white"
                onClick={() => setOpenDeleteModal(false)}
              >
                No, cancel
              </Button>
            </div>
          </div>
        </Modal.Body>
      </Modal>

    </>
  );
};

export default AddGallery;