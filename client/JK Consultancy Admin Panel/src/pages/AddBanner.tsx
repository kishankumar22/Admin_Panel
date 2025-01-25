import { useState, useEffect, useRef } from 'react';
import Breadcrumb from '../components/Breadcrumbs/Breadcrumb';
import { useAuth } from '../context/AuthContext'; // Import the useAuth hook
import axiosInstance from '../config';
import { toast, ToastContainer } from 'react-toastify'; // Import Toastify
import 'react-toastify/dist/ReactToastify.css'; // Import Toastify CSS

// Define the type for a banner
interface Banner {
  bannerUrl: string | undefined;
  id: number;
  bannerName: string;
  bannerURL: string;
}

const AddBanner: React.FC = () => {
  const [file, setFile] = useState<File | null>(null); // File state
  const [bannerName, setBannerName] = useState<string>(''); // Banner name state
  const [banners, setBanners] = useState<Banner[]>([]); // Array of banners
  const [isUploading, setIsUploading] = useState<boolean>(false); // State to manage upload button
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null); // State to track banner being edited
  const { user } = useAuth();
  const createdBy = user?.name || 'admin';

  // Create a ref for the file input
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  // Handle banner name change
  const handleBannerNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBannerName(e.target.value);
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!file || !bannerName) {
      toast.error('Please provide a file and banner name');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('bannerName', bannerName);
    formData.append('created_by', createdBy);

    setIsUploading(true);
    try {
      await axiosInstance.post('/api/banner/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Banner uploaded successfully!');
      fetchBanners(); // Refresh banner list

      setFile(null); // Clear file state
      setBannerName(''); // Clear banner name
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Clear the file input field
      }
    } catch (error) {
      console.error(error);
      toast.error('Error uploading banner');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle edit mode
  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setBannerName(banner.bannerName);
  };

  // Handle cancel editing
  const handleCancelEdit = () => {
    setEditingBanner(null);
    setBannerName('');
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle update banner
  const handleUpdate = async () => {
    if (!bannerName) {
      toast.error('Please provide a banner name');
      return;
    }

    const formData = new FormData();
    formData.append('file', file as Blob); // Append file if available
    formData.append('bannerName', bannerName);

    setIsUploading(true); // Start uploading
    try {
      await axiosInstance.put(`/api/banner/update/${editingBanner?.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Banner updated successfully!');
      fetchBanners(); // Refresh banner list
      setEditingBanner(null);
      setBannerName('');
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error(error);
      toast.error('Error updating banner');
    } finally {
      setIsUploading(false); // Stop uploading
    }
  };

  // Handle delete banner
  const handleDelete = async (id: number) => {
    try {
      await axiosInstance.delete(`/api/banner/delete/${id}`);
      toast.success('Banner deleted successfully!');
      fetchBanners(); // Refresh banner list
    } catch (error) {
      console.error(error);
      toast.error('Error deleting banner');
    }
  };

  // Fetch banners from backend
  const fetchBanners = async () => {
    try {
      const res = await axiosInstance.get<Banner[]>('/api/banner/banners');
      setBanners(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Error fetching banners');
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  return (
    <>
      {/* Toast Container */}
      <ToastContainer position="top-right" autoClose={2000} hideProgressBar={false} />

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
        {!editingBanner ? (
          <button
            className={`px-4 py-2 text-white bg-blue-500 rounded-md ${
              isUploading ? "bg-gray-400 cursor-not-allowed" : "hover:bg-blue-600"
            }`}
            onClick={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? "Uploading..." : "Upload File"}
          </button>
        ) : (
          <>
            <button
              className={`px-4 py-2 rounded-md ${
                isUploading
                  ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                  : "bg-green-500 text-white hover:bg-green-600"
              }`}
              onClick={handleUpdate}
              disabled={isUploading}
            >
              {isUploading ? "Uploading..." : "Save Changes"}
            </button>
            <button
              className="px-4 py-2 text-white bg-red-500 rounded-md hover:bg-red-600"
              onClick={handleCancelEdit}
            >
              Cancel
            </button>
          </>
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
              <p className="mt-2 text-center bg-gray-200 rounded-md text-black font-medium p-2">
                {banner.bannerName}
              </p>
              <div className="flex justify-center gap-2 mt-2">
  {/* Edit Button */}
  <button
    className={`w-14 text-sm rounded-sm ${
      editingBanner && editingBanner.id === banner.id
        ? "bg-gray-400 text-gray-700 cursor-not-allowed"
        : "bg-green-500 text-white hover:bg-green-600"
    }`}
    onClick={() => handleEdit(banner)}
    disabled={editingBanner?.id === banner.id || false}
  >
    {editingBanner && editingBanner.id === banner.id ? "Editing..." : "Edit"}
  </button>

  {/* Delete Button */}
  <button
    className={`w-14 text-sm p-1 rounded-sm ${
      editingBanner && editingBanner.id === banner.id
        ? "bg-gray-400 text-gray-700 cursor-not-allowed"
        : "bg-red-500 text-white hover:bg-red-600"
    }`}
    onClick={() => handleDelete(banner.id)}
    disabled={editingBanner?.id === banner.id || false}
  >
    Delete
  </button>
</div>

            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default AddBanner;
