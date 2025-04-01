import React, { useState, useEffect } from 'react';
import axiosInstance from '../config';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FaEdit, FaKey } from 'react-icons/fa';
import { MdDelete } from 'react-icons/md';

interface User {
  user_id: number;
  name: string;
  email: string;
  mobileNo: string;
  roleId: string;
  created_by: string;
}
interface Role {
  name: string;
  role_id: number;
}

const AddUser: React.FC = () => {
  const { user: loggedInUser } = useAuth();
  const createdBy = loggedInUser?.name || 'admin';
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isChangePassModalOpen, setIsChangePassModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<string>('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userIdToDelete, setUserIdToDelete] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPassword, setShowPassword] = useState(false); // For Add User modal
  const [showOldPassword, setShowOldPassword] = useState(false); // For Change Password modal
  const [showNewPassword, setShowNewPassword] = useState(false); // For Change Password modal
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // For Change Password modal

  const handleOpenDeleteModal = (userId: number) => {
    setUserIdToDelete(userId);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await axiosInstance.delete(`/users/${userIdToDelete}`);
      toast.success('User deleted successfully!');
      fetchUsers();
    } catch (err) {
      let errorMessage = 'Failed to delete user. Please try again.';
      if (err instanceof Error) errorMessage = err.message;
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const axiosError = err as { response: { data: { message?: string } } };
        errorMessage = axiosError.response?.data?.message || errorMessage;
      }
      console.error('Error deleting user:', errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsDeleteModalOpen(false);
      setUserIdToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false);
    setUserIdToDelete(null);
  };

  const handleChangePass = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (newPassword !== confirmPassword) {
      toast.error('New password and confirm password do not match');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await axiosInstance.put('/change-password',
        {
          email: selectedEmail,
          oldPassword,
          newPassword,
          confirmPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      toast.success(response.data.message);
      setIsChangePassModalOpen(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSelectedEmail('');
    } catch (error) {
      toast.error('Failed to change password');
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const [user, setUser] = useState({
    name: '',
    email: '',
    mobileNo: '',
    password: '',
    roleId: '',
    created_by: createdBy,
  });

  useEffect(() => {
    fetchUsers();
    fetchroles();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axiosInstance.get('/getusers');
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchroles = async () => {
    try {
      const response = await axiosInstance.get('/getrole');
      setRoles(response.data.role);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setUser((prevUser) => ({ ...prevUser, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = { ...user, created_by: createdBy };
    await axiosInstance.post('/users', payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      toast.success('User added successfully!');
      setUser({ name: '', email: '', mobileNo: '', password: '', roleId: '', created_by: createdBy });
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      let errorMessage = 'Failed to add user. Please try again.';
      if (err instanceof Error) errorMessage = err.message;
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const axiosError = err as { response: { data: { message?: string } } };
        errorMessage = axiosError.response?.data?.message || errorMessage;
      }
      console.error('Error adding user:', errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsSubmitting(true);
    try {
      const payload = { ...editingUser, modify_by: loggedInUser?.name || 'admin' };
       await axiosInstance.put(`/users/${editingUser.user_id}`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      toast.success('User updated successfully!');
      setIsEditModalOpen(false);
      fetchUsers();
    } catch (err) {
      let errorMessage = 'Failed to update user. Please try again.';
      if (err instanceof Error) errorMessage = err.message;
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const axiosError = err as { response: { data: { message?: string } } };
        errorMessage = axiosError.response?.data?.message || errorMessage;
      }
      console.error('Error updating user:', errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChangePassModal = (email: string) => {
    setSelectedEmail(email);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setIsChangePassModalOpen(true);
  };

  const [selectedRole, setSelectedRole] = useState('');
  // const [selectedEmail, setSelectedEmail] = useState('');
  const [selectedMobile, setSelectedMobile] = useState('');
  // const [searchQuery, setSearchQuery] = useState('');
  
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.mobileNo.includes(searchQuery);
  
    const matchesRole = selectedRole ? user.roleId.toString() === selectedRole : true;
    const matchesEmail = selectedEmail ? user.email === selectedEmail : true;
    const matchesMobile = selectedMobile ? user.mobileNo === selectedMobile : true;
  
    return matchesSearch && matchesRole && matchesEmail && matchesMobile;
  });
  
  // ✅ Function to Clear All Filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedRole('');
    setSelectedEmail('');
    setSelectedMobile('');
  };
  return (
    <div className="p-4">
    {/* Search & Filter Section */}
{/* Search & Filter Section */}
<div className="flex flex-wrap justify-between items-center gap-2 p-2 mb-3 bg-gray-100 rounded-lg shadow-md dark:bg-meta-4">
  
  {/* Search Input */}
  <input
    type="search"
    className="p-1 bg-gray-100 border rounded-md text-sm w-full sm:w-48 focus:outline-none focus:ring-4 focus:ring-blue-500 transition duration-200"
    placeholder="Search Name, Email, Mobile..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
  />

  {/* Role Filter */}
  <select
    className="p-1 border rounded-md text-sm w-full sm:w-auto focus:outline-none focus:ring-4 focus:ring-blue-500 transition duration-200"
    value={selectedRole}
    onChange={(e) => setSelectedRole(e.target.value)}
  >
    <option value="">All Roles</option>
    {roles.map((role) => (
      <option key={role.role_id} value={role.role_id}>{role.name}</option>
    ))}
  </select>

  {/* Email Filter */}
  <select
    className="p-1 border rounded-md text-sm w-full sm:w-auto focus:outline-none focus:ring-4 focus:ring-blue-500 transition duration-200"
    value={selectedEmail}
    onChange={(e) => setSelectedEmail(e.target.value)}
  >
    <option value="">All Emails</option>
    {Array.from(new Set(users.map(u => u.email))).map(email => (
      <option key={email} value={email}>{email}</option>
    ))}
  </select>

  {/* Mobile Filter */}
  <select
    className="p-1 border rounded-md text-sm w-full sm:w-auto focus:outline-none focus:ring-4 focus:ring-blue-500 transition duration-200"
    value={selectedMobile}
    onChange={(e) => setSelectedMobile(e.target.value)}
  >
    <option value="">All Mobile Numbers</option>
    {Array.from(new Set(users.map(u => u.mobileNo))).map(mobile => (
      <option key={mobile} value={mobile}>{mobile}</option>
    ))}
  </select>

  {/* Clear Filters Button */}
  <button
  className="px-3 py-1 text-white bg-red-500 hover:bg-red-600 rounded-md transition duration-200 w-full sm:w-auto focus:outline-none focus:ring-4 focus:ring-red-700"
  onClick={clearFilters}
>
  Clear Filters
</button>

  {/* Add User Button */}
  {loggedInUser ?.roleId !== Number('3') && (
    <button
      onClick={() => setIsModalOpen(true)}
      className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 transition-colors duration-200 w-full sm:w-auto focus:outline-none focus:ring-4 focus:ring-blue-500"
    >
      Add User
    </button>
  )}
</div>

{/* User List Table */}
<div className="mt-4 overflow-x-auto">
  <h2 className="text-lg font-bold mb-2">User List</h2>
  {filteredUsers.length > 0 ? (
    <div className="w-full overflow-x-auto">
      <table className="min-w-full text-sm bg-white border dark:bg-gray-600 border-gray-300">
        <thead>
          <tr className="bg-gray-200 h-8 text-gray-600 dark:bg-gray-300 text-left">
            <th className="py-2 px-2 border-b">#</th>
            <th className="py-2 px-2 border-b">Name</th>
            <th className="py-2 px-2 border-b">Email</th>
            <th className="py-2 px-2 border-b">Mobile</th>
            <th className="py-2 px-2 border-b">Role</th>
            <th className="py-2 px-2 border-b">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.map((user, index) => (
            <tr key={user.user_id} className="hover:bg-gray-100 dark:hover:bg-gray-500">
              <td className="py-2 px-2 border-b">{index + 1}</td>
              <td className="py-2 px-2 border-b">{user.name}</td>
              <td className="py-2 px-2 border-b">{user.email}</td>
              <td className="py-2 px-2 border-b">{user.mobileNo}</td>
              <td className="py-2 px-2 border-b">
                {roles.find((role) => role.role_id === Number(user.roleId))?.name || 'NA'}
              </td>
              <td className="py-2 px-2 border-b">
                <div className="flex flex-wrap gap-1">
                  {/* Edit Button */}
                  <button
                    onClick={() => handleEdit(user)}
                    className={`bg-yellow-500 text-white text-xs px-2 py-1 rounded-md hover:bg-yellow-600 ${
                      loggedInUser?.roleId === 3 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    disabled={loggedInUser?.roleId === 3}
                  >
                    <FaEdit className="inline-block mr-1" /> Edit
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleOpenDeleteModal(user.user_id)}
                    className={`bg-red-500 text-white text-xs px-2 py-1 rounded-md hover:bg-red-600 ${
                      loggedInUser?.roleId === 3 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    disabled={loggedInUser?.roleId === 3}
                  >
                    <MdDelete className="inline-block mr-1" /> Delete
                  </button>

                  {/* Change Password Button */}
                  <button
                    onClick={() => handleOpenChangePassModal(user.email)}
                    className="bg-blue-500 text-white text-xs px-2 py-1 rounded-md hover:bg-blue-600"
                  >
                    <FaKey className="inline-block mr-1" /> Change Password
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <p className="text-gray-600 text-center py-4 text-sm">No users found.</p>
  )}
</div>




      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 pt-2  0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-3 rounded-lg shadow-md w-full max-w-sm dark:bg-gray-500">
            <h2 className="text-base font-semibold mb-2 text-center dark:text-meta-5">Add User</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-2">
                <label className="block text-xs font-medium mb-0.5 dark:text-gray-800" htmlFor="name">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={user.name}
                  onChange={handleChange}
                  placeholder="Enter name"
                  required
                  pattern="[A-Za-z\s]{2,50}"
                  title="Name should be 2-50 characters long and contain only letters and spaces"
                  className={`w-full p-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-600 ${user.name && !/^[A-Za-z\s]{2,50}$/.test(user.name) ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
                {user.name && !/^[A-Za-z\s]{2,50}$/.test(user.name) && (
                  <p className="text-red-500 text-xs mt-0.5">Valid name: 2-50 letters</p>
                )}
              </div>

              <div className="mb-2">
                <label className="block text-xs font-medium mb-0.5 dark:text-gray-800" htmlFor="email">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={user.email}
                  onChange={handleChange}
                  placeholder="Enter email"
                  required
                  pattern="[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"
                  title="Please enter a valid email address"
                  className={`w-full p-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-600 ${user.email && !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(user.email)
                      ? 'border-red-500'
                      : 'border-gray-300'
                    }`}
                />
                {user.email && !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(user.email) && (
                  <p className="text-red-500 text-xs mt-0.5">Enter a valid email</p>
                )}
              </div>

              <div className="mb-2">
                <label className="block text-xs font-medium mb-0.5 dark:text-gray-800" htmlFor="mobileNo">
                  Mobile No
                </label>
                <input
                  type="text"
                  id="mobileNo"
                  name="mobileNo"
                  value={user.mobileNo}
                  onChange={handleChange}
                  placeholder="Enter mobile no"
                  required
                  pattern="[0-9]{10}"
                  title="Mobile number should be 10 digits"
                  className={`w-full p-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-600 ${user.mobileNo && !/^[0-9]{10}$/.test(user.mobileNo) ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
                {user.mobileNo && !/^[0-9]{10}$/.test(user.mobileNo) && (
                  <p className="text-red-500 text-xs mt-0.5">Enter a 10-digit mobile no</p>
                )}
              </div>

              <div className="mb-2 relative">
                <label className="block text-xs font-medium mb-0.5 dark:text-gray-800" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={user.password}
                    onChange={handleChange}
                    placeholder="Enter password"
                    required
                    pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}"
                    title="Password must be at least 8 characters long and contain uppercase, lowercase, and numbers"
                    className={`w-full p-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-600 ${user.password && !/(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}/.test(user.password)
                        ? 'border-red-500'
                        : 'border-gray-300'
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-2 flex items-center"
                  >
                    {showPassword ? (
                      <svg className="h-4 text-gray-700" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512">
                        <path fill="currentColor" d="M572.52 241.4C518.29 135.59 410.93 64 288 64S57.68 135.64 3.48 241.41a32.35 32.35 0 0 0 0 29.19C57.71 376.41 165.07 448 288 448s230.32-71.64 284.52-177.41a32.35 32.35 0 0 0 0-29.19zM288 400a144 144 0 1 1 144-144 143.93 143.93 0 0 1-144 144zm0-240a95.31 95.31 0 0 0-25.31 3.79 47.85 47.85 0 0 1-66.9 66.9A95.78 95.78 0 1 0 288 160z"></path>
                      </svg>
                    ) : (
                      <svg className="h-4 text-gray-700" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512">
                        <path fill="currentColor" d="M320 400c-75.85 0-137.25-58.71-142.9-133.11L72.2 185.82c-13.79 17.3-26.48 35.59-36.72 55.59a32.35 32.35 0 0 0 0 29.19C89.71 376.41 197.07 448 320 448c26.91 0 52.87-4 77.89-10.46L346 397.39a144.13 144.13 0 0 1-26 2.61zm313.82 58.1l-110.55-85.44a331.25 331.25 0 0 0 81.25-102.07 32.35 32.35 0 0 0 0-29.19C550.29 135.59 442.93 64 320 64a308.15 308.15 0 0 0-147.32 37.7L45.46 3.37A16 16 0 0 0 23 6.18L3.37 31.45A16 16 0 0 0 6.18 53.9l588.36 454.73a16 16 0 0 0 22.46-2.81l19.64-25.27a16 16 0 0 0-2.82-22.45zm-183.72-142l-39.3-30.38A94.75 94.75 0 0 0 416 256a94.76 94.76 0 0 0-121.31-92.21A47.65 47.65 0 0 1 304 192a46.64 46.64 0 0 1-1.54 10l-73.61-56.89A142.31 142.31 0 0 1 320 112a143.92 143.92 0 0 1 144 144c0 21.63-5.29 41.79-13.9 60.11z"></path>
                      </svg>
                    )}
                  </button>
                </div>
                {user.password && !/(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}/.test(user.password) && (
                  <p className="text-red-500 text-xs mt-0.5">8+ chars, upper, lower, number</p>
                )}
              </div>

              <div className="mb-2">
                <label className="block text-xs font-medium mb-0.5 dark:text-gray-800" htmlFor="roleId">
                  Role
                </label>
                <select
                  id="roleId"
                  name="roleId"
                  value={user.roleId}
                  onChange={handleChange}
                  required
                  className={`w-full p-1.5 text-sm border dark:bg-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${user.roleId === '' && user.roleId !== undefined ? 'border-red-500' : 'border-gray-300'
                    }`}
                >
                  <option value="" className="dark:bg-gray-600">Select Role</option>
                  {roles && roles.length > 0 ? (
                    roles
                      .filter((role) => role.role_id !== 2)
                      .map((role) => (
                        <option key={role.role_id} value={role.role_id}>
                          {role.name}
                        </option>
                      ))
                  ) : (
                    <option value="" disabled>
                      No roles found
                    </option>
                  )}
                </select>
                {user.roleId === '' && user.roleId !== undefined && (
                  <p className="text-red-500 text-xs mt-0.5">Select a role</p>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setUser({
                      name: '',
                      email: '',
                      mobileNo: '',
                      password: '',
                      roleId: '',
                      created_by: createdBy,
                    });
                  }}
                  className="bg-gray-500 text-white px-2 py-1 text-sm rounded-md hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-500 text-white px-2 py-1 text-sm rounded-md hover:bg-blue-600"
                >
                  {isSubmitting ? 'Adding...' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {/* Edit User Modal - Compact Version */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg shadow-md w-full dark:bg-gray-600 max-w-xs">
            <h2 className="text-base font-semibold mb-2">Edit User</h2>
            <form onSubmit={handleEditSubmit}>
              <div className="mb-2">
                <label className="block text-xs font-medium mb-0.5" htmlFor="name">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  required
                  className="w-full p-1.5 text-sm border dark:bg-gray-700 border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="mb-2">
                <label className="block text-xs font-medium mb-0.5" htmlFor="email">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  required
                  className="w-full p-1.5 text-sm border dark:bg-gray-700 border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="mb-2">
                <label className="block text-xs font-medium mb-0.5" htmlFor="mobileNo">
                  Mobile No
                </label>
                <input
                  type="text"
                  id="mobileNo"
                  name="mobileNo"
                  value={editingUser.mobileNo}
                  onChange={(e) => setEditingUser({ ...editingUser, mobileNo: e.target.value })}
                  required
                  className="w-full p-1.5 text-sm border border-gray-300 dark:bg-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="mb-3">
                <label className="block text-xs font-medium mb-0.5" htmlFor="roleId">
                  Role
                </label>
                <select
                  id="roleId"
                  name="roleId"
                  value={editingUser.roleId}
                  onChange={(e) => setEditingUser({ ...editingUser, roleId: e.target.value })}
                  required
                  className="w-full p-1.5 text-sm border border-gray-300 dark:bg-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select Role</option>
                  {roles && roles.length > 0 ? (
                    roles
                      .filter((role) => role.role_id !== 2)
                      .map((role) => (
                        <option key={role.role_id} value={role.role_id}>
                          {role.name}
                        </option>
                      ))
                  ) : (
                    <option value="" disabled>
                      No roles found.
                    </option>
                  )}
                </select>
              </div>

              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="bg-gray-500 text-white px-3 py-1 text-xs rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-500 text-white px-3 py-1 text-xs rounded hover:bg-blue-600"
                >
                  {isSubmitting ? 'Updating...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {isChangePassModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-3 rounded-lg shadow-md w-full max-w-xs dark:bg-gray-600">
            <h2 className="text-base font-semibold mb-1 bg-gray-200 text-center border-b py-1 dark:text-gray-700 rounded-md dark:bg-gray-400">
              Change Password
            </h2>
            <form onSubmit={handleChangePass}>
              <input type="hidden" name="email" value={selectedEmail} />

              <div className="mb-2 relative">
                <label className="block text-xs font-medium mb-0.5" htmlFor="oldPassword">
                  Old Password
                </label>
                <div className="relative">
                  <input
                    type={showOldPassword ? "text" : "password"}
                    id="oldPassword"
                    name="oldPassword"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Old password"
                    required
                    className="w-full p-1.5 text-sm border border-gray-300 dark:bg-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute inset-y-0 right-0 pr-2 flex items-center"
                  >
                    {showOldPassword ? (
                      <svg className="h-4 text-gray-700" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512">
                        <path fill="currentColor" d="M572.52 241.4C518.29 135.59 410.93 64 288 64S57.68 135.64 3.48 241.41a32.35 32.35 0 0 0 0 29.19C57.71 376.41 165.07 448 288 448s230.32-71.64 284.52-177.41a32.35 32.35 0 0 0 0-29.19zM288 400a144 144 0 1 1 144-144 143.93 143.93 0 0 1-144 144zm0-240a95.31 95.31 0 0 0-25.31 3.79 47.85 47.85 0 0 1-66.9 66.9A95.78 95.78 0 1 0 288 160z"></path>
                      </svg>
                    ) : (
                      <svg className="h-4 text-gray-700" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512">
                        <path fill="currentColor" d="M320 400c-75.85 0-137.25-58.71-142.9-133.11L72.2 185.82c-13.79 17.3-26.48 35.59-36.72 55.59a32.35 32.35 0 0 0 0 29.19C89.71 376.41 197.07 448 320 448c26.91 0 52.87-4 77.89-10.46L346 397.39a144.13 144.13 0 0 1-26 2.61zm313.82 58.1l-110.55-85.44a331.25 331.25 0 0 0 81.25-102.07 32.35 32.35 0 0 0 0-29.19C550.29 135.59 442.93 64 320 64a308.15 308.15 0 0 0-147.32 37.7L45.46 3.37A16 16 0 0 0 23 6.18L3.37 31.45A16 16 0 0 0 6.18 53.9l588.36 454.73a16 16 0 0 0 22.46-2.81l19.64-25.27a16 16 0 0 0-2.82-22.45zm-183.72-142l-39.3-30.38A94.75 94.75 0 0 0 416 256a94.75 94.75 0 0 0-121.31-92.21A47.65 47.65 0 0 1 304 192a46.64 46.64 0 0 1-1.54 10l-73.61-56.89A142.31 142.31 0 0 1 320 112a143.92 143.92 0 0 1 144 144c0 21.63-5.29 41.79-13.9 60.11z"></path>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="mb-2 relative">
                <label className="block text-xs font-medium mb-0.5" htmlFor="newPassword">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    id="newPassword"
                    name="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password"
                    required
                    className="w-full p-1.5 text-sm border border-gray-300 dark:bg-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-2 flex items-center"
                  >
                    {showNewPassword ? (
                      <svg className="h-4 text-gray-700" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512">
                        <path fill="currentColor" d="M572.52 241.4C518.29 135.59 410.93 64 288 64S57.68 135.64 3.48 241.41a32.35 32.35 0 0 0 0 29.19C57.71 376.41 165.07 448 288 448s230.32-71.64 284.52-177.41a32.35 32.35 0 0 0 0-29.19zM288 400a144 144 0 1 1 144-144 143.93 143.93 0 0 1-144 144zm0-240a95.31 95.31 0 0 0-25.31 3.79 47.85 47.85 0 0 1-66.9 66.9A95.78 95.78 0 1 0 288 160z"></path>
                      </svg>
                    ) : (
                      <svg className="h-4 text-gray-700" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512">
                        <path fill="currentColor" d="M320 400c-75.85 0-137.25-58.71-142.9-133.11L72.2 185.82c-13.79 17.3-26.48 35.59-36.72 55.59a32.35 32.35 0 0 0 0 29.19C89.71 376.41 197.07 448 320 448c26.91 0 52.87-4 77.89-10.46L346 397.39a144.13 144.13 0 0 1-26 2.61zm313.82 58.1l-110.55-85.44a331.25 331.25 0 0 0 81.25-102.07 32.35 32.35 0 0 0 0-29.19C550.29 135.59 442.93 64 320 64a308.15 308.15 0 0 0-147.32 37.7L45.46 3.37A16 16 0 0 0 23 6.18L3.37 31.45A16 16 0 0 0 6.18 53.9l588.36 454.73a16 16 0 0 0 22.46-2.81l19.64-25.27a16 16 0 0 0-2.82-22.45zm-183.72-142l-39.3-30.38A94.75 94.75 0 0 0 416 256a94.75 94.75 0 0 0-121.31-92.21A47.65 47.65 0 0 1 304 192a46.64 46.64 0 0 1-1.54 10l-73.61-56.89A142.31 142.31 0 0 1 320 112a143.92 143.92 0 0 1 144 144c0 21.63-5.29 41.79-13.9 60.11z"></path>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="mb-2 relative">
                <label className="block text-xs font-medium mb-0.5" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    required
                    className="w-full p-1.5 text-sm border border-gray-300 dark:bg-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-2 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <svg className="h-4 text-gray-700" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512">
                        <path fill="currentColor" d="M572.52 241.4C518.29 135.59 410.93 64 288 64S57.68 135.64 3.48 241.41a32.35 32.35 0 0 0 0 29.19C57.71 376.41 165.07 448 288 448s230.32-71.64 284.52-177.41a32.35 32.35 0 0 0 0-29.19zM288 400a144 144 0 1 1 144-144 143.93 143.93 0 0 1-144 144zm0-240a95.31 95.31 0 0 0-25.31 3.79 47.85 47.85 0 0 1-66.9 66.9A95.78 95.78 0 1 0 288 160z"></path>
                      </svg>
                    ) : (
                      <svg className="h-4 text-gray-700" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512">
                        <path fill="currentColor" d="M320 400c-75.85 0-137.25-58.71-142.9-133.11L72.2 185.82c-13.79 17.3-26.48 35.59-36.72 55.59a32.35 32.35 0 0 0 0 29.19C89.71 376.41 197.07 448 320 448c26.91 0 52.87-4 77.89-10.46L346 397.39a144.13 144.13 0 0 1-26 2.61zm313.82 58.1l-110.55-85.44a331.25 331.25 0 0 0 81.25-102.07 32.35 32.35 0 0 0 0-29.19C550.29 135.59 442.93 64 320 64a308.15 308.15 0 0 0-147.32 37.7L45.46 3.37A16 16 0 0 0 23 6.18L3.37 31.45A16 16 0 0 0 6.18 53.9l588.36 454.73a16 16 0 0 0 22.46-2.81l19.64-25.27a16 16 0 0 0-2.82-22.45zm-183.72-142l-39.3-30.38A94.75 94.75 0 0 0 416 256a94.75 94.75 0 0 0-121.31-92.21A47.65 47.65 0 0 1 304 192a46.64 46.64 0 0 1-1.54 10l-73.61-56.89A142.31 142.31 0 0 1 320 112a143.92 143.92 0 0 1 144 144c0 21.63-5.29 41.79-13.9 60.11z"></path>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsChangePassModalOpen(false)}
                  className="bg-gray-400 text-white px-2 py-1 text-sm rounded-md hover:bg-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-500 text-white px-2 py-1 text-sm rounded-md hover:bg-blue-600"
                >
                  {isSubmitting ? 'Updating...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

  
      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm  flex items-center justify-center px-4">
          <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-lg w-full max-w-sm">
            <h3 className="text-lg font-semibold text-center text-gray-900 dark:text-gray-200">Confirm Delete</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 text-center">
              Are you sure you want to delete this user? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={handleCancelDelete}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AddUser;