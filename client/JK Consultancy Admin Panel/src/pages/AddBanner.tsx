import { useState, useRef } from 'react';
import Breadcrumb from '../components/Breadcrumbs/Breadcrumb';
import { useAuth } from '../context/AuthContext';
import { useBanner } from '../context/BannerContext';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AddBanner: React.FC = () => {
  const [file, setFile] = useState<File | undefined>(undefined);
  const [bannerName, setBannerName] = useState<string>('');
  const [bannerPosition, setBannerPosition] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [changeImageModal, setChangeImageModal] = useState<boolean>(false);
  const [conflictingBannerId, setConflictingBannerId] = useState<number | null>(null);
  const [selectedBannerId, setSelectedBannerId] = useState<number | null>(null);
  const { user } = useAuth();
  const { banners, uploadBanner, deleteBanner, updateBanner, swapImage } = useBanner();
  const createdBy = user?.name || 'admin';
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    } else {
      setFile(undefined); // Set to undefined if no file is selected
    }
  };

  const handleBannerNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBannerName(e.target.value);
  };

  const handlePositionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBannerPosition(e.target.value);
  };

  const handleUpload = async () => {
    if (!file || !bannerName || !bannerPosition) {
      toast.error('Please provide file, banner name, and position');
      return;
    }
    if(bannerPosition==="0"){
      alert("values shuld be greater then one or equal")
    }

    // Check for conflicting banner position
    const conflictingBanner = banners.find(
      (banner) => banner.bannerPosition === parseInt(bannerPosition)
    );

    if (conflictingBanner) {
      setConflictingBannerId(conflictingBanner.id);
      setIsModalOpen(true); // Open confirmation modal
      return;
    }

    setIsUploading(true);
    await uploadBanner(file, bannerName, bannerPosition, createdBy);
    resetForm();
    setIsUploading(false);
  };

  const handleDelete = async (id: number) => {
    await deleteBanner(id);
  };

  const confirmDeleteAndUpload = async () => {
    if (conflictingBannerId) {
      await handleDelete(conflictingBannerId);
      setIsModalOpen(false);
      if (editingBanner) {
        handleUpdate(); // Ensure handleUpdate can handle undefined file
      } else if (file) {
        handleUpload(); // Only call handleUpload if file is defined
      }
    }
  };

  const handleEdit = (banner: any) => {
    setEditingBanner(banner);
    setBannerName(banner.bannerName);
    setBannerPosition(banner.bannerPosition.toString());
    setFile(undefined);
    setIsModalOpen(true); // Open the edit modal
  };

  const handleUpdate = async () => {
    if (!editingBanner) return;

    if (!bannerName || !bannerPosition) {
      toast.error('Please provide banner name and position');
      return;
    }

    const conflictingBanner = banners.find(
      (banner) =>
        banner.bannerPosition === parseInt(bannerPosition) &&
        banner.id !== editingBanner.id
    );

    if (conflictingBanner) {
      setConflictingBannerId(conflictingBanner.id);
      setIsModalOpen(true);
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
    setIsModalOpen(false); // Close the modal
  };

  const changeImage = (bannerId: number) => {
    setSelectedBannerId(bannerId);
    setChangeImageModal(true);
  };

  const handleSwapImage = async (newBannerId: number) => {
    if (selectedBannerId) {
      await swapImage(selectedBannerId, newBannerId);
      setChangeImageModal(false);
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString('en-GB');
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />

      <Breadcrumb pageName="Add Banner" />
      <div className="flex items-center space-x-2 p-1.5 bg-gray-100 rounded-lg shadow-md">
        <input
          type="file"
          ref={fileInputRef}
          className="flex-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={handleFileChange}
        />
        <input
          type="text"
          className="flex-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Banner Name"
          onChange={handleBannerNameChange}
          value={bannerName}
        />
        <input
          type="number"
          className="w-24 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Position"
          onChange={handlePositionChange}
          value={bannerPosition}
          disabled={!!editingBanner}
        />
        {editingBanner ? (
          <>
            <button
              className={`px-4 py-2 text-white bg-green-500 rounded-md ${isUploading ? 'bg-gray-400 cursor-not-allowed' : 'hover:bg-green-600'}`}
              onClick={handleUpdate}
              disabled={isUploading}
            >
              {isUploading ? 'Uploading...' : 'Save Changes'}
            </button>
            <button
              className="px-4 py-2 text-white bg-gray-500 rounded-md hover:bg-gray-600"
              onClick={resetForm}
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            className={`px-4 py-2 text-white bg-blue-500 rounded-md ${isUploading ? 'bg-gray-400 cursor-not-allowed' : 'hover:bg-blue-600'}`}
            onClick={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? 'Uploading...' : 'Upload File'}
          </button>
        )}
      </div>

      <div className="mt-6 p-3 bg-white rounded-lg shadow-md">
        <h2 className="text-lg text-green-700 mb-2 font-bold">Uploaded Banners</h2>
        <div className="grid grid-cols-3 gap-4">
          {banners.map((banner) => (
            <div key={banner.id} className="p-2 border rounded overflow-hidden">
              <img
                src={banner.bannerUrl}
                alt={banner.bannerName}
                className="w-full h-32 object-cover"
              />
              <p className="mt-1 text-center bg-gray-200 rounded-md text-black font-medium p-2">
                <button className='ml-8 font-normal rounded-sm' onClick={() => changeImage(banner.id)}>Change Image Position</button>
              </p>
              <div className="text-sm mt-1 text-gray-500 ">
                <b className="font-bold ">Position: {banner.bannerPosition}</b>
              </div>
              <div className="text-sm text-gray-700 ">
              <p className='font-bold'>Banner Name : <b className='font-normal'>{banner.bannerName}</b> </p>
                <p><span className="font-bold">Created On:</span> {formatDate(banner.created_on)}</p>
                <p><span className="font-bold">Created By:</span> {banner.created_by}</p>
                <p><span className="font-bold">Modified By:</span> {banner.modify_by || 'N/A'}</p>
                <p><span className="font-bold">Modified On:</span> {formatDate(banner.modify_on)}</p>
              </div>

              <div className="flex justify-center gap-2 mt-1">
                <button
                  className={`w-20 p-1 text-sm font-normal bg-green-500 text-white rounded-sm hover:bg-green-600 ${editingBanner?.id === banner.id ? 'cursor-not-allowed' : ''}`}
                  onClick={() => handleEdit(banner)}
                  disabled={editingBanner?.id === banner.id}
                >
                  {editingBanner?.id === banner.id ? 'Editing...' : 'Edit'}
                </button>
                <button
                  className={`w-14 text-sm rounded-sm ${editingBanner?.id === banner.id ? "bg-gray-400 text-gray-700 cursor-not-allowed" : "bg-red-500 text-white hover:bg-red-600"}`}
                  onClick={() => handleDelete(banner.id)}
                  disabled={editingBanner?.id === banner.id}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <div
          id="popup-modal"
          tabIndex={-1}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
        >
          <div className="relative p-4 w-full max-w-md max-h-full bg-white rounded-lg shadow-md">
            <h3 className="mb-5 text-lg font-normal text-gray-500">
              Are you sure you want to delete the existing banner with this position?
            </h3>
            <div className="flex justify-end space-x-4">
              <button
                onClick={confirmDeleteAndUpload}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-800"
              >
                Yes, I'm sure
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                No, cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {changeImageModal && (
        <div
          id="popup-modal"
          tabIndex={-1}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
        >
          <div className="mt-20 p-3 w-1/2 bg-white rounded-lg shadow-md">
            <h2 className="text-lg text-green-700 mb-2 font-bold">Change Image Position</h2>
            <button
              onClick={() => setChangeImageModal(false)}
              className="p-2 my-3 text-red-700 bg-gray-300 rounded-lg hover:bg-gray-300"
            >
              Cancel Image Change
            </button>
            <div className="grid grid-cols-3 gap-4">
              {banners.map((banner) => (
                <div key={banner.id} className="p-2 border rounded overflow-hidden">
                  <img
                    src={banner.bannerUrl}
                    alt={banner.bannerName}
                    className="w-full h-32 object-cover"
                  />
                  <div className="text-sm text-center text-gray-600 ">
                    <button
                      className={`mt-2 p-2 text-center bg-gray-200 rounded-sm ${selectedBannerId === banner.id ? 'cursor-not-allowed' : ''}`}
                      onClick={() => handleSwapImage(banner.id)}
                      disabled={selectedBannerId === banner.id}
                    >
                      From this Image
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingBanner && (
        <div
          id="edit-modal"
          tabIndex={-1}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
        >
          <div className="relative p-4 w-full max-w-md max-h-full bg-white rounded-lg shadow-md">
            <h3 className="mb-5 text-lg font-bold text-gray-500">Edit Banner</h3>
            <p className='font-semibold p-1 '>File</p>
            <input
              type="file"
              ref={fileInputRef}
              className="flex-1 p-2 border w-full border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={handleFileChange}
            />
            <p className='font-semibold p-1'>BannerName</p>
            <input
              type="text"
              className="flex-1 p-2 w-full  mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Banner Name"
              onChange={handleBannerNameChange}
              value={bannerName}
            />
       
            <div className="flex justify-center space-x-4 mt-4">
              <button
                onClick={handleUpdate}
                className={`px-4 py-2 text-white bg-green-500 rounded-lg hover:bg-green-600 ${isUploading ? 'bg-gray-400 cursor-not-allowed' : ''}`}
                disabled={isUploading}
              >
                {isUploading ? 'Updating...' : 'Save Changes'}
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AddBanner;