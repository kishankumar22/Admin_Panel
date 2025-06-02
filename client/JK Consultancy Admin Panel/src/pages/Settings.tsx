import React, { useState, useEffect } from 'react';
import Breadcrumb from '../components/Breadcrumbs/Breadcrumb';
import userThree from '../images/user/user-03.png';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../config';
import { toast } from 'react-toastify';
import { FaSpinner, FaUser, FaPhone, FaEnvelope, FaUserTag, FaUserCircle, FaTimes } from 'react-icons/fa';

interface Role {
  role_id: number;
  name: string;
}

interface User {
  user_id: number;
  name: string;
  email: string;
  mobileNo: string;
  roleId: number;
  profile_pic_url: string | null;
}

const Settings = () => {
  const { user: authUser, setUser } = useAuth();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isEditingPhoto, setIsEditingPhoto] = useState(false);
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(userThree);
  const [roles, setRoles] = useState<Role[]>([]);
  const [userRoleName, setUserRoleName] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const fetchUserDataAndRoles = async () => {
      try {
        const usersResponse = await axiosInstance.get('/getusers');
        if (usersResponse.data.success && authUser) {
          const foundUser = usersResponse.data.users.find(
            (u: User) => u.user_id === authUser.user_id
          );
          if (foundUser) {
            setCurrentUser(foundUser);
            setFullName(foundUser.name);
            setPhoneNumber(foundUser.mobileNo);
            setPreviewUrl(foundUser.profile_pic_url || "https://static.vecteezy.com/system/resources/previews/024/983/914/non_2x/simple-user-default-icon-free-png.png");
          }
        }

        const rolesResponse = await axiosInstance.get('/getrole');
        if (rolesResponse.data.success) {
          setRoles(rolesResponse.data.role);
          if (authUser) {
            const role = rolesResponse.data.role.find(
              (r: Role) => r.role_id === authUser.roleId
            );
            setUserRoleName(role ? role.name : 'Unknown Role');
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to fetch user data');
      }
    };

    if (authUser) {
      fetchUserDataAndRoles();
    }
  }, [authUser]);

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !currentUser) return;

    try {
      const formData = new FormData();
      formData.append('name', fullName);
      formData.append('email', currentUser.email);
      formData.append('mobileNo', String(phoneNumber));
      formData.append('roleId', currentUser.roleId.toString());
      formData.append('modify_by', currentUser.name || 'admin');

      const response = await axiosInstance.put(
        `/users/${currentUser.user_id}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      if (response.data.user) {
        setUser(response.data.user);
        setCurrentUser(response.data.user);
        setIsEditingInfo(false);
        toast.success('Personal information updated successfully!');
        
        const usersResponse = await axiosInstance.get('/getusers');
        if (usersResponse.data.success) {
          const updatedUser = usersResponse.data.users.find(
            (u: User) => u.user_id === currentUser.user_id
          );
          if (updatedUser) {
            setCurrentUser(updatedUser);
          }
        }
      }
    } catch (err) {
      let errorMessage = 'Failed to update personal information.';
      if (err instanceof Error) errorMessage = err.message;
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const axiosError = err as { response: { data: { message?: string } } };
        errorMessage = axiosError.response?.data?.message || errorMessage;
      }
      toast.error(errorMessage);
    }
  };

  const handlePhotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !currentUser || !profilePic) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('name', currentUser.name);
      formData.append('email', currentUser.email);
      formData.append('mobileNo', String(currentUser.mobileNo));
      formData.append('roleId', currentUser.roleId.toString());
      formData.append('modify_by', currentUser.name || 'admin');
      formData.append('profilePic', profilePic);

      const response = await axiosInstance.put(
        `/users/${currentUser.user_id}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      if (response.data.user) {
        setUser(response.data.user);
        setCurrentUser(response.data.user);
        setPreviewUrl(response.data.user.profile_pic_url || userThree);
        setProfilePic(null);
        setIsEditingPhoto(false);
        toast.success('Profile picture updated successfully!');
        
        const usersResponse = await axiosInstance.get('/getusers');
        if (usersResponse.data.success) {
          const updatedUser = usersResponse.data.users.find(
            (u: User) => u.user_id === currentUser.user_id
          );
          if (updatedUser) {
            setCurrentUser(updatedUser);
          }
        }
      }
    } catch (err) {
      let errorMessage = 'Failed to update profile picture.';
      if (err instanceof Error) errorMessage = err.message;
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const axiosError = err as { response: { data: { message?: string } } };
        errorMessage = axiosError.response?.data?.message || errorMessage;
      }
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfilePic(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleInfoCancel = () => {
    if (currentUser) {
      setFullName(currentUser.name);
      setPhoneNumber(currentUser.mobileNo);
    }
    setIsEditingInfo(false);
  };

  const handlePhotoCancel = () => {
    setProfilePic(null);
    setPreviewUrl(currentUser?.profile_pic_url || userThree);
    setIsEditingPhoto(false);
  };

  return (
    <div className="max-w-8xl mx-8 my-4">
      <Breadcrumb pageName="Settings" />
      <div className="grid grid-cols-5 gap-8">
        <div className="col-span-5 xl:col-span-3">
          <div className="rounded-lg border border-stroke bg-white shadow-lg dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke py-4 px-7 dark:border-strokedark flex items-center gap-2">
              <FaUser className="text-blue-500" />
              <h3 className="font-bold text-xl text-blue-800 dark:text-blue-300 text-shadow-md">
                Personal Information
              </h3>
            </div>
            <div className="p-7">
              <form onSubmit={handleInfoSubmit}>
                <div className="mb-5.5 flex flex-col gap-5.5 sm:flex-row">
                  <div className="w-full sm:w-1/2">
                    <label
                      className="mb-3 block text-sm font-medium text-blue-800 dark:text-blue-300 text-shadow-sm"
                      htmlFor="fullName"
                    >
                      Full Name
                    </label>
                    <div className="relative">
                      <span className="absolute left-4.5 top-4">
                        <FaUser className="text-blue-500 dark:text-blue-300" />
                      </span>
                      <input
                        className={`w-full rounded-lg border border-stroke bg-gray-50 py-3 pl-11.5 pr-4.5 text-blue-800 focus:border-blue-500 focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-blue-300 dark:focus:border-blue-500 ${
                          !isEditingInfo ? 'bg-gray-100 cursor-not-allowed' : ''
                        }`}
                        type="text"
                        name="fullName"
                        id="fullName"
                        placeholder="Enter your full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        disabled={!isEditingInfo}
                        required
                      />
                    </div>
                  </div>
                  <div className="w-full sm:w-1/2">
                    <label
                      className="mb-3 block text-sm font-medium text-blue-800 dark:text-blue-300 text-shadow-sm"
                      htmlFor="phoneNumber"
                    >
                      Phone Number
                    </label>
                    <div className="relative">
                      <span className="absolute left-4.5 top-4">
                        <FaPhone className="text-blue-500 dark:text-blue-300" />
                      </span>
                      <input
                        className={`w-full rounded-lg border border-stroke bg-gray-50 py-3 pl-11.5 pr-4.5 text-blue-800 focus:border-blue-500 focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-blue-300 dark:focus:border-blue-500 ${
                          !isEditingInfo ? 'bg-gray-100 cursor-not-allowed' : ''
                        }`}
                        type="text"
                        name="phoneNumber"
                        id="phoneNumber"
                        placeholder="Enter your phone number"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        disabled={!isEditingInfo}
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="mb-5.5">
                  <label
                    className="mb-3 block text-sm font-medium text-blue-800 dark:text-blue-300 text-shadow-sm"
                    htmlFor="emailAddress"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="absolute left-4.5 top-4">
                      <FaEnvelope className="text-blue-500 dark:text-blue-300" />
                    </span>
                    <input
                      className="w-full rounded-lg border border-stroke bg-gray-200 py-3 pl-11.5 pr-4.5 text-blue-800 focus:border-blue-500 focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-blue-300 dark:focus:border-blue-500 cursor-not-allowed"
                      type="email"
                      name="emailAddress"
                      id="emailAddress"
                      placeholder="Enter your email address"
                      value={currentUser?.email || ''}
                      disabled
                    />
                  </div>
                </div>
                <div className="mb-5.5">
                  <label
                    className="mb-3 block text-sm font-medium text-blue-800 dark:text-blue-300 text-shadow-sm"
                    htmlFor="Username"
                  >
                    User Role
                  </label>
                  <div className="relative">
                    <span className="absolute left-4.5 top-4">
                      <FaUserTag className="text-blue-500 dark:text-blue-300" />
                    </span>
                    <input
                      className="w-full rounded-lg border border-stroke bg-gray-200 py-3 pl-11.5 pr-4.5 text-blue-800 focus:border-blue-500 focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-blue-300 dark:focus:border-blue-500 cursor-not-allowed"
                      type="text"
                      name="Username"
                      id="Username"
                      placeholder="User Role"
                      value={userRoleName}
                      disabled
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-4.5">
                  {isEditingInfo ? (
                    <>
                      <button
                        className="flex items-center gap-2 justify-center rounded-lg border border-stroke py-2 px-6 font-medium text-red-600 hover:bg-red-100 dark:border-strokedark dark:text-red-400 dark:hover:bg-red-900 transition"
                        type="button"
                        onClick={handleInfoCancel}
                      >
                        <FaTimes className="text-red-600 dark:text-red-400" />
                        Cancel
                      </button>
                      <button
                        className="flex justify-center rounded-lg bg-blue-600 py-2 px-6 font-medium text-white hover:bg-blue-700 transition"
                        type="submit"
                      >
                        Save
                      </button>
                    </>
                  ) : (
                    <button
                      className="flex justify-center rounded-lg bg-blue-600 py-2 px-6 font-medium text-white hover:bg-blue-700 transition"
                      type="button"
                      onClick={() => setIsEditingInfo(true)}
                    >
                      Edit
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
        <div className="col-span-5 xl:col-span-2">
          <div className="rounded-lg border border-stroke bg-white shadow-lg dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke py-4 px-7 dark:border-strokedark flex items-center gap-2">
              <FaUserCircle className="text-blue-500" />
              <h3 className="font-bold text-xl text-blue-800 dark:text-blue-300 text-shadow-md">
                Profile Picture
              </h3>
            </div>
            <div className="p-7 flex flex-col items-center ">
              <div className="mb-4 hover:scale-105">
                <div className="h-40 w-40 rounded-full overflow-hidden ring-2 ring-blue-200 dark:ring-blue-700">
                  <img
                    src={previewUrl}
                    alt="User"
                    className="h-full w-full rounded-full object-cover p-0.5 bg-black "
                    title={`User Profile : ${currentUser?.name || "Unknown"}`}
                  />
                </div>
              </div>
              <div className="mb-4">
                <span className="flex gap-2.5 justify-center mt-2">
                  {isEditingPhoto ? (
                    <>
                      <button
                        className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 transition"
                        type="button"
                        onClick={handlePhotoCancel}
                      >
                        <FaTimes className="text-red-600" />
                        Cancel
                      </button>
                      {profilePic && (
                        <button
                          className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 hover:text-green-700 transition"
                          type="submit"
                          form="photoForm"
                          disabled={isUploading}
                        >
                          {isUploading && <FaSpinner className="animate-spin text-green-600" />}
                          {isUploading ? 'Uploading...' : 'Update Photo'}
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-700 transition"
                      type="button"
                      onClick={() => setIsEditingPhoto(true)}
                    >
                      <FaUserCircle className="text-blue-600" />
                      Update Photo
                    </button>
                  )}
                </span>
              </div>
              {isEditingPhoto && (
                <form id="photoForm" onSubmit={handlePhotoSubmit} className="w-full">
                  <input
                    type="file"
                    accept="image/*"
                    className="w-full rounded-lg border border-stroke bg-gray-50 py-3 px-4.5 text-blue-800 focus:border-blue-500 focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-blue-300 dark:focus:border-blue-500"
                    onChange={handleFileChange}
                  />
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;