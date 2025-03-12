import { useState, useRef, useEffect } from 'react';
import Breadcrumb from '../components/Breadcrumbs/Breadcrumb';
import { useAuth } from '../context/AuthContext';
import { useBanner } from '../context/BannerContext';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { HiOutlineExclamationCircle } from "react-icons/hi";
import { Button, Modal } from "flowbite-react";
import axiosInstance from '../config';

const AddBanner: React.FC = () => {
  const [file, setFile] = useState<File | undefined>(undefined);
  const [bannerName, setBannerName] = useState<string>('');
  const [bannerPosition, setBannerPosition] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const [addBannerModel, setAddBannerModel] = useState<boolean>(false);
  const [openDeleteModal, setOpenDeleteModal] = useState<boolean>(false);
  const [bannerIdToDelete, setBannerIdToDelete] = useState<number | null>(null);
  const { banners, uploadBanner, deleteBanner, updateBanner, toggleVisibility } = useBanner();
  const { user } = useAuth();
  const createdBy = user?.name || 'admin';
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  interface Permission {
    roleId: number;
    pageId: number;
    canCreate: boolean;
    canRead: boolean;
    canUpdate: boolean;
    canDelete: boolean;
  }
  const [permissions, setPermissions] = useState<Permission[]>([]);

  const fetchPermissions = async () => {
    try {
      const response = await axiosInstance.get('/permissions'); // Adjust the axios instance if needed
      setPermissions(response.data);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []); // Empty dependency array means this runs once when the component mounts


  // Permissions (Replace with actual permissions from your context)
  const canCreate = true; // Example: Replace with user?.permissions?.canCreate
  const canUpdate = false; // Example: Replace with user?.permissions?.canUpdate
  const canDelete = true; // Example: Replace with user?.permissions?.canDelete

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    } else {
      setFile(undefined);
    }
  };

  const handleBannerNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBannerName(e.target.value);
  };

  const handlePositionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBannerPosition(e.target.value);
  };

  const handleUpload = async () => {
    if (!canCreate) {
      toast.error('Access Denied: You do not have permission to create banners.');
      return;
    }

    if (!file || !bannerName || !bannerPosition) {
      toast.error('Please provide file, banner name, and position');
      return;
    }
    if (bannerName.length > 150) {
      toast.error('Banner name cannot exceed 150 characters');
      return;
    }

    setIsUploading(true);
    await uploadBanner(file, bannerName, bannerPosition, createdBy);
    resetForm();
    setIsUploading(false);
    setAddBannerModel(false);
  };

  const handleDelete = async () => {
    if (!canDelete) {
      toast.error('Access Denied: You do not have permission to delete banners.');
      return;
    }

    if (bannerIdToDelete !== null) {
      await deleteBanner(bannerIdToDelete);
      setOpenDeleteModal(false);
      setBannerIdToDelete(null);
    }
  };

  const handleEdit = (banner: any) => {
    if (!canUpdate) {
      toast.error('Access Denied: You do not have permission to update banners.');
      return;
    }

    setEditingBanner(banner);
    setBannerName(banner.bannerName);
    setBannerPosition(banner.bannerPosition.toString());
    setFile(undefined); // Reset file to allow new file selection
  };

  const handleUpdate = async () => {
    if (!canUpdate) {
      toast.error('Access Denied: You do not have permission to update banners.');
      return;
    }

    if (!editingBanner) return;

    if (!bannerName || !bannerPosition) {
      toast.error('Please provide banner name and position');
      return;
    }
    if (bannerName.length > 150) {
      toast.error('Banner name cannot exceed 150 characters');
      return;
    }

    await updateBanner(editingBanner.id, bannerName, bannerPosition, file, user?.name);
    resetForm();
  };

  const resetForm = () => {
    setEditingBanner(null);
    setBannerName('');
    setBannerPosition('');
    setFile(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addBanner = () => {
    if (!canCreate) {
      toast.error('Access Denied: You do not have permission to create banners.');
      return;
    }

    setAddBannerModel(true);
  };

  const addBannerCancel = () => {
    setAddBannerModel(false);
  };

  const handleToggleVisibility = async (id: number) => {
    if (!canUpdate) {
      toast.error('Access Denied: You do not have permission to update banners.');
      return;
    }

    await toggleVisibility(id, user?.name || 'admin');
  };

  const [searchQuery, setSearchQuery] = useState('');
  // Filter banners based on the search query
  const filteredBanners = banners.filter(banner =>
    banner.bannerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(banner.bannerPosition).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Breadcrumb pageName="Add Banner" />
      <div className="flex items-center justify-between p-2 mb-3 bg-gray-100 dark:bg-gray-700 rounded-lg shadow-md">
        {/* Search Input */}
        <input
          type="search"
          className='py-1 px-3 bg-white border border-gray-300 placeholder:text-[.8rem] rounded-md text-sm w-80 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200'
          placeholder='Search Banner by name and position here...'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)} // Update search query state
        />
       
        <button
          className={`ml-2 px-4 py-1 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 ${!canCreate ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={canCreate ? addBanner : () => toast.error('Access Denied: You do not have permission to create banners.')}
        >
          Upload Banner
        </button>
      </div>

      <div className="mt-6 p-3 bg-white rounded-lg shadow-md dark:bg-gray-700">
        <h2 className="text-sm font-bold text-center p-2 text-cyan-900 dark:text-meta-5">Banners List</h2>
        <div className="grid grid-cols-3 gap-4">
          {filteredBanners.length > 0 ? (
            filteredBanners.map((banner) => (
              <div key={banner.id} className="p-2 border rounded overflow-hidden dark:bg-meta-4">
                <img
                  src={banner.bannerUrl}
                  alt={banner.bannerName}
                  className="w-full h-32 object-fit"
                  style={{ opacity: banner.IsVisible ? 1 : 0.3 }}
                />
                <div className="text-sm mt-1 text-gray-500 dark:text-gray-400">
                  <div className="font-medium">Position: {banner.bannerPosition}</div>
                  <div className="font-medium ">
                    <p>Banner Name: <span className="font-medium"></span>{banner.bannerName}</p>
                    <p>
                      <span className="font-medium">Created On:</span>
                      {banner.created_on ? new Date(banner.created_on).toLocaleDateString() : 'N/A'}
                    </p>
                    <p><span className="font-medium">Created By:</span> {banner.created_by}</p>
                    <p><span className="font-medium">Modified By:</span> {banner.modify_by || 'N/A'}</p>
                    <p>
                      <span className="font-medium">Modified On:</span>
                      {banner.modify_on ? new Date(banner.modify_on).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex justify-center gap-2 mt-1">
                  <button
                    className={`w-20 p-1 text-sm font-normal bg-green-500 text-white rounded-md hover:bg-green-600 ${!canUpdate || editingBanner?.id === banner.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={canUpdate ? () => handleEdit(banner) : () => toast.error('Access Denied: You do not have permission to update banners.')}
                    disabled={!canUpdate || editingBanner?.id === banner.id}
                  >
                    {editingBanner?.id === banner.id ? 'Editing...' : 'Edit'}
                  </button>
                  <button
                    className={`w-14 text-sm rounded-md ${!canDelete || editingBanner?.id === banner.id ? "opacity-50 cursor-not-allowed bg-gray-400 text-gray-700" : "bg-red-500 text-white hover:bg-red-600"}`}
                    onClick={canDelete ? () => {
                      setBannerIdToDelete(banner.id);
                      setOpenDeleteModal(true);
                    } : () => toast.error('Access Denied: You do not have permission to delete banners.')}
                    disabled={!canDelete || editingBanner?.id === banner.id}
                  >
                    Delete
                  </button>
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={banner.IsVisible}
                      onChange={canUpdate ? () => handleToggleVisibility(banner.id) : () => toast.error('Access Denied: You do not have permission to update banners.')}
                      className="sr-only peer"
                      disabled={!canUpdate}
                    />
                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600"></div>
                    <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                      IsVisible
                    </span>
                  </label>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 text-center text-gray-500 dark:text-gray-400">
              Not Found
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingBanner && (
        <div
          id="edit-modal"
          tabIndex={-1}
          className="fixed inset-0 z-50 ml-70 flex items-center justify-center bg-black bg-opacity-50"
        >
          <div className="relative p-4 w-full max-w-md max-h-full bg-white dark:text-meta-2 dark:bg-gray-700 rounded-lg shadow-md">
            <h3 className="mb-1 text-center bg-slate-300 mr-4 rounded-md text-lg font-bold dark:text-meta-5 text-blue-800">Edit Banner</h3>
            <p className='font-semibold p-1 '>File</p>
            <input
              type="file"
              ref={fileInputRef}
              className="flex-1 p-2 border w-full border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={handleFileChange}
            />
            <p className='font-semibold p-1'>Banner Name</p>
            <input
              type="text"
              className="flex-1 p-2 w-full mt-1 border dark:bg-meta-4 border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Banner Name"
              onChange={handleBannerNameChange}
              value={bannerName}
            />
            <p className='font-semibold p-1'>Banner Position</p>
            <input
              type="number"
              className="flex-1 p-2 w-full mt-1 border dark:bg-meta-4 border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Banner position"
              onChange={handlePositionChange}
              value={bannerPosition}
            />
            <div className="flex justify-space-x-4 mt-4">
              <button
                onClick={handleUpdate}
                className={`px-4 py-2 text-white bg-green-500 rounded-lg hover:bg-green-600 ${isUploading ? 'bg-gray-400 cursor-not-allowed' : ''}`}
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

      {/* Add Banner Modal */}
      {addBannerModel && (
        <div
          id="add-modal"
          tabIndex={-1}
          className="fixed inset-0 z-50 ml-70 flex items-center justify-center  bg-black bg-opacity-50"
        >
          <div className="relative p-4 w-full max-w-md max-h-full  bg-white dark:bg-gray-500  dark:text-meta-2  dark:text-opacity-70 rounded-lg shadow-md">
            <h3 className="mb-1 text-center bg-slate-300 p-1 rounded-md text-lg font-bold dark:text-meta-5 text-blue-800">Add banner</h3>
            <p className="font-semibold p-1">File</p>
            <input
              type="file"
              ref={fileInputRef}
              className="flex-1 p-2 border dark:bg-meta-4 border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
              onChange={handleFileChange}
            />
            <div className="flex space-x-2 mt-2 dark:text-gray-400">
              <div className="flex-1">
                <p className="font-semibold p-1">Banner Name</p>
                <input
                  type="text"
                  className="w-full p-2 border dark:bg-meta-4 border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Banner Name"
                  onChange={handleBannerNameChange}
                  value={bannerName}
                />
              </div>
              <div className="w-1/3">
                <p className="font-semibold p-1">Banner Position</p>
                <input
                  type="number"
                  className="w-full p-2 border dark:bg-meta-4 border-gray-300 dark:border-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Position"
                  onChange={handlePositionChange}
                  value={bannerPosition}
                />
              </div>
            </div>
            <div className="flex justify-between mt-4">
              <button
                className={`px-4 py-2 w-48 text-white bg-blue-500 rounded-md ${isUploading ? 'bg-gray-400 cursor-not-allowed' : 'hover:bg-blue-600'}`}
                onClick={handleUpload}
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload File'}
              </button>
              <button
                onClick={addBannerCancel}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal className='ml-80 mt-60 bg-gray-3' show={openDeleteModal} size="md" onClose={() => setOpenDeleteModal(false)} popup>
        <Modal.Header />
        <Modal.Body>
          <div className="text-center">
            <HiOutlineExclamationCircle className="mx-auto mb-4 h-14 w-14 text-gray-400 dark:text-gray-200" />
            <h3 className="mb-5 text-lg font-normal text-gray-900 dark:text-gray-400">
              Are you sure you want to delete this banner?
            </h3>
            <div className="flex justify-center text-white gap-4">
              <Button color="failure" className='bg-red-700' onClick={() => handleDelete()}>
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

export default AddBanner;