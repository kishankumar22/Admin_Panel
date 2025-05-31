import React, { useState, useEffect } from 'react';
import Breadcrumb from '../components/Breadcrumbs/Breadcrumb';
import userThree from '../images/user/user-03.png';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../config';
import { toast } from 'react-toastify';

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
  // Add other user properties as needed
}

const Settings = () => {
  const { user: authUser, setUser } = useAuth();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // State for personal info editing
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // State for photo editing
  const [isEditingPhoto, setIsEditingPhoto] = useState(false);
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(userThree);

  // State for roles
  const [roles, setRoles] = useState<Role[]>([]);
  const [userRoleName, setUserRoleName] = useState<string>('');

  // Fetch current user data and roles
  useEffect(() => {
    const fetchUserDataAndRoles = async () => {
      try {
        // Fetch all users
        const usersResponse = await axiosInstance.get('/getusers');
        
        if (usersResponse.data.success && authUser) {
          // Find the current user in the response
          const foundUser = usersResponse.data.users.find(
            (u: User) => u.user_id === authUser.user_id
          );
          
          if (foundUser) {
            setCurrentUser(foundUser);
            setFullName(foundUser.name);
            setPhoneNumber(foundUser.mobileNo);
            setPreviewUrl(foundUser.profile_pic_url ||"https://static.vecteezy.com/system/resources/previews/024/983/914/non_2x/simple-user-default-icon-free-png.png" );
          }
        }

        // Fetch roles
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

  // Handle personal info update
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
        // Update both auth context and local state
        setUser(response.data.user);
        setCurrentUser(response.data.user);
        setIsEditingInfo(false);
        toast.success('Personal information updated successfully!');
        
        // Fetch fresh user data to ensure we have the latest
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

  // Handle photo update
  const handlePhotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !currentUser || !profilePic) return;

    try {
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
        // Update both auth context and local state
        setUser(response.data.user);
        setCurrentUser(response.data.user);
        setPreviewUrl(response.data.user.profile_pic_url || userThree);
        setProfilePic(null);
        setIsEditingPhoto(false);
        toast.success('Profile picture updated successfully!');
        
        // Fetch fresh user data to ensure we have the latest
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
    }
  };

  // Handle file selection for profile picture
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfilePic(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // Handle cancel for personal info
  const handleInfoCancel = () => {
    if (currentUser) {
      setFullName(currentUser.name);
      setPhoneNumber(currentUser.mobileNo);
    }
    setIsEditingInfo(false);
  };

  // Handle cancel for photo
  const handlePhotoCancel = () => {
    setProfilePic(null);
    setPreviewUrl(currentUser?.profile_pic_url || userThree);
    setIsEditingPhoto(false);
  };

  return (
    <>
      <div className="max-w-8xl mx-8">
        <Breadcrumb pageName="Settings" />
        <div className="grid grid-cols-5 gap-8">
          <div className="col-span-5 xl:col-span-3">
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke py-4 px-7 dark:border-strokedark">
                <h3 className="font-bold text-black dark:text-white">
                  Personal Information
                </h3>
              </div>
              <div className="p-7">
                <form onSubmit={handleInfoSubmit}>
                  <div className="mb-5.5 flex flex-col gap-5.5 sm:flex-row">
                    <div className="w-full sm:w-1/2">
                      <label
                        className="mb-3 block text-sm font-medium text-black dark:text-white"
                        htmlFor="fullName"
                      >
                        Full Name
                      </label>
                      <div className="relative">
                        <span className="absolute left-4.5 top-4">
                          <svg
                            className="fill-current"
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <g opacity="0.8">
                              <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M3.72039 12.887C4.50179 12.1056 5.5616 11.6666 6.66667 11.6666H13.3333C14.4384 11.6666 15.4982 12.1056 16.2796 12.887C17.061 13.6684 17.5 14.7282 17.5 15.8333V17.5C17.5 17.9602 17.1269 18.3333 16.6667 18.3333C16.2064 18.3333 15.8333 17.9602 15.8333 17.5V15.8333C15.8333 15.1703 15.5699 14.5344 15.1011 14.0655C14.6323 13.5967 13.9964 13.3333 13.3333 13.3333H6.66667C6.00363 13.3333 5.36774 13.5967 4.8989 14.0655C4.43006 14.5344 4.16667 15.1703 4.16667 15.8333V17.5C4.16667 17.9602 3.79357 18.3333 3.33333 18.3333C2.8731 18.3333 2.5 17.9602 2.5 17.5V15.8333C2.5 14.7282 2.93899 13.6684 3.72039 12.887Z"
                                fill=""
                              />
                              <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M9.99967 3.33329C8.61896 3.33329 7.49967 4.45258 7.49967 5.83329C7.49967 7.214 8.61896 8.33329 9.99967 8.33329C11.3804 8.33329 12.4997 7.214 12.4997 5.83329C12.4997 4.45258 11.3804 3.33329 9.99967 3.33329ZM5.83301 5.83329C5.83301 3.53211 7.69849 1.66663 9.99967 1.66663C12.3009 1.66663 14.1663 3.53211 14.1663 5.83329C14.1663 8.13448 12.3009 9.99996 9.99967 9.99996C7.69849 9.99996 5.83301 8.13448 5.83301 5.83329Z"
                                fill=""
                              />
                            </g>
                          </svg>
                        </span>
                        <input
                          className={`w-full rounded border border-stroke bg-gray py-3 pl-11.5 pr-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary ${
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
                        className="mb-3 block text-sm font-medium text-black dark:text-white"
                        htmlFor="phoneNumber"
                      >
                        Phone Number
                      </label>
                      <input
                        className={`w-full rounded border border-stroke bg-gray py-3 px-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary ${
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

                  <div className="mb-5.5">
                    <label
                      className="mb-3 block text-sm font-medium text-black dark:text-white"
                      htmlFor="emailAddress"
                    >
                      Email Address
                    </label>
                    <div className="relative">
                      <span className="absolute left-4.5 top-4">
                        <svg
                          className="fill-current"
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <g opacity="0.8">
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M3.33301 4.16667C2.87658 4.16667 2.49967 4.54357 2.49967 5V15C2.49967 15.4564 2.87658 15.8333 3.33301 15.8333H16.6663C17.1228 15.8333 17.4997 15.4564 17.4997 15V5C17.4997 4.54357 17.1228 4.16667 16.6663 4.16667H3.33301ZM0.833008 5C0.833008 3.6231 1.9561 2.5 3.33301 2.5H16.6663C18.0432 2.5 19.1663 3.6231 19.1663 5V15C19.1663 16.3769 18.0432 17.5 16.6663 17.5H3.33301C1.9561 17.5 0.833008 16.3769 0.833008 15V5Z"
                              fill=""
                            />
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M0.983719 4.52215C1.24765 4.1451 1.76726 4.05341 2.1443 4.31734L9.99975 9.81615L17.8552 4.31734C18.2322 4.05341 18.7518 4.1451 19.0158 4.52215C19.2797 4.89919 19.188 5.4188 18.811 5.68272L10.4776 11.5161C10.1907 11.7169 9.80879 11.7169 9.52186 11.5161L1.18853 5.68272C0.811486 5.4188 0.719791 4.89919 0.983719 4.52215Z"
                              fill=""
                            />
                          </g>
                        </svg>
                      </span>
                      <input
                        className="w-full rounded border border-stroke bg-gray py-3 pl-11.5 pr-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary bg-gray-300 cursor-not-allowed"
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
                      className="mb-3 block text-sm font-medium text-black dark:text-white"
                      htmlFor="Username"
                    >
                      User Role
                    </label>
                    <input
                      className="w-full rounded border tex bg-gray-300 border-stroke py-3 px-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary cursor-not-allowed"
                      type="text"
                      name="Username"
                      id="Username"
                      placeholder="User Role"
                      value={userRoleName}
                      disabled
                    />
                  </div>

                  <div className="flex justify-end gap-4.5">
                    {isEditingInfo ? (
                      <>
                        <button
                          className="flex justify-center rounded border border-stroke py-2 px-6 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white"
                          type="button"
                          onClick={handleInfoCancel}
                        >
                          Cancel
                        </button>
                        <button
                          className="flex justify-center rounded bg-primary py-2 px-6 font-medium text-gray hover:bg-opacity-90"
                          type="submit"
                        >
                          Save
                        </button>
                      </>
                    ) : (
                      <button
                        className="flex justify-center rounded bg-primary py-2 px-6 font-medium text-gray hover:bg-opacity-90"
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
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke py-4 px-7 dark:border-strokedark">
                <h3 className="font-bold text-black dark:text-white">
                  Profile Picture
                </h3>
              </div>
              <div className="p-7 flex flex-col items-center">
                <div className="mb-4">
                  <div className="h-54 w-54 rounded-full">
                    <img
                      src={previewUrl}
                      alt="User"
                      className="h-full w-full rounded-full object-cover"
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <span className="flex gap-2.5 justify-center mt-2">
                    {isEditingPhoto ? (
                      <>
                        <button
                          className="text-sm px-4 py-2 rounded-md bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 transition"
                          type="button"
                          onClick={handlePhotoCancel}
                        >
                          Cancel
                        </button>
                        {profilePic && (
                          <button
                            className="text-sm px-4 py-2 rounded-md bg-green-100 text-green-600 hover:bg-green-200 hover:text-green-700 transition"
                            type="submit"
                            form="photoForm"
                          >
                            Save
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        className="text-sm px-4 py-2 rounded-md bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-700 transition"
                        type="button"
                        onClick={() => setIsEditingPhoto(true)}
                      >
                        Edit your photo
                      </button>
                    )}
                  </span>
                </div>

                {isEditingPhoto && (
                  <form id="photoForm" onSubmit={handlePhotoSubmit} className="w-full">
                    <input
                      type="file"
                      accept="image/*"
                      className="w-full rounded border border-stroke bg-gray py-3 px-4.5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                      onChange={handleFileChange}
                    />
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Settings;