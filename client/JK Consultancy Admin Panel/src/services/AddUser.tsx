import React, { useState, useEffect } from 'react';
import axiosInstance from '../config';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

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
  const [selectedEmail, setSelectedEmail] = useState<string>(''); // Store the email of the user whose password is being changed
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userIdToDelete, setUserIdToDelete] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Function to open the confirmation modal
  // Open the delete confirmation modal
  const handleOpenDeleteModal = (userId: number) => {
    setUserIdToDelete(userId);
    setIsDeleteModalOpen(true);
  };

  // Function to handle the delete action after confirmation
  const handleConfirmDelete = async () => {
    try {
      await axiosInstance.delete(`/users/${userIdToDelete}`);
      toast.success('User deleted successfully!');
      fetchUsers(); // Refresh the user list
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
      setIsDeleteModalOpen(false); // Close the modal
      setUserIdToDelete(null); // Reset the user ID
    }
  };

  // Function to close the modal without deleting
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
          email: selectedEmail, // Send the email with the request
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
      setSelectedEmail(''); // Reset email after submission
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
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axiosInstance.get('/getusers');
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    fetchroles();
  }, []);

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
      const response = await axiosInstance.post('/users', payload, {
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
      const response = await axiosInstance.put(`/users/${editingUser.user_id}`, payload, {
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

  // const handleDelete = async (userId: number) => {
  //   try {
  //     await axiosInstance.delete(`/users/${userId}`);
  //     toast.success('User deleted successfully!');
  //     fetchUsers();
  //   } catch (err) {
  //     let errorMessage = 'Failed to delete user. Please try again.';
  //     if (err instanceof Error) errorMessage = err.message;
  //     if (typeof err === 'object' && err !== null && 'response' in err) {
  //       const axiosError = err as { response: { data: { message?: string } } };
  //       errorMessage = axiosError.response?.data?.message || errorMessage;
  //     }
  //     console.error('Error deleting user:', errorMessage);
  //     toast.error(errorMessage);
  //   }
  // };

  const handleOpenChangePassModal = (email: string) => {
    setSelectedEmail(email); // Set the email of the user whose password is being changed
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setIsChangePassModalOpen(true);

  };

 // Filter users based on the search query
 const filteredUsers = users.filter(user =>
  user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
  user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
  user.mobileNo.toLowerCase().includes(searchQuery.toLowerCase()) 
);

  return (
    <div className="p-4">
      {/* Add USer Button */}
      <div className="flex justify-between mb-4">
      <input
        type="search"
        className='p-1 bg-gray-100 border-2 rounded-md text-sm w-60'
        placeholder='Search by Name	Email	Mobile Number here...'
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)} // Update search query state
      />
      <input
        type="search"
        className='p-1 bg-gray-100 border-2 rounded-md text-sm w-60'
        placeholder='Search by Name	Email	Mobile Number here...'
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)} // Update search query state
      />
        {loggedInUser?.roleId !== Number('3') && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 transition-colors duration-200 focus:outline-none active:bg-yellow-600"
          >
            Add User
          </button>
        )}
      </div>
      {/* Add USer model start*/}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center mt-12 ml-60">
          <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md dark:bg-gray-500">
            <h2 className="text-lg font-bold mb-4 text-center  dark:text-meta-5">Add User</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 dark:text-gray-800" htmlFor="name">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={user.name}
                  onChange={handleChange}
                  placeholder='Enter Your  name'
                  required
                  pattern="[A-Za-z\s]{2,50}" // Letters and spaces, 2-50 characters
                  title="Name should be 2-50 characters long and contain only letters and spaces"
                  className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 ${user.name && !/^[A-Za-z\s]{2,50}$/.test(user.name)
                    ? 'border-red-500'
                    : 'border-gray-300'
                    }`}
                />
                {user.name && !/^[A-Za-z\s]{2,50}$/.test(user.name) && (
                  <p className="text-red-500 text-xs mt-1">Please enter a valid name (2-50 characters, letters only)</p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 dark:text-gray-800" htmlFor="email">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={user.email}
                  onChange={handleChange}
                  placeholder='Enter Your  Email'
                  required
                  pattern="[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"
                  title="Please enter a valid email address"
                  className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 ${user.email && !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(user.email)
                    ? 'border-red-500'
                    : 'border-gray-300'
                    }`}
                />
                {user.email && !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(user.email) && (
                  <p className="text-red-500 text-xs mt-1">Please enter a valid email address</p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 dark:text-gray-800" htmlFor="mobileNo">
                  Mobile No
                </label>
                <input
                  type="text"
                  id="mobileNo"
                  name="mobileNo"
                  value={user.mobileNo}
                  onChange={handleChange}
                  placeholder='Enter Your  mo number'
                  required
                  pattern="[0-9]{10}"
                  title="Mobile number should be 10 digits"
                  className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 ${user.mobileNo && !/^[0-9]{10}$/.test(user.mobileNo)
                    ? 'border-red-500'
                    : 'border-gray-300'
                    }`}
                />
                {user.mobileNo && !/^[0-9]{10}$/.test(user.mobileNo) && (
                  <p className="text-red-500 text-xs mt-1">Please enter a valid 10-digit mobile number</p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 dark:text-gray-800" htmlFor="password">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={user.password}
                  onChange={handleChange}
                  placeholder='Enter Your password'
                  required
                  pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}"
                  title="Password must be at least 8 characters long and contain uppercase, lowercase, and numbers"
                  className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500  dark:bg-gray-600 ${user.password && !/(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}/.test(user.password)
                    ? 'border-red-500'
                    : 'border-gray-300'
                    }`}
                />
                {user.password && !/(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}/.test(user.password) && (
                  <p className="text-red-500 text-xs mt-1">
                    Password must be 8+ characters with uppercase, lowercase, and numbers
                  </p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 dark:text-gray-800" htmlFor="roleId">
                  Role
                </label>
                <select
                  id="roleId"
                  name="roleId"
                  value={user.roleId}
                  onChange={handleChange}
                  required
                  className={`w-full p-2 border dark:bg-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500  dark:bg-gray-600${user.roleId === '' && user.roleId !== undefined
                    ? 'border-red-500'
                    : 'border-gray-300'
                    }`}
                >
                  <option value="" className='dark:bg-gray-600'>Select Role</option>
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
                {user.roleId === '' && user.roleId !== undefined && (
                  <p className="text-red-500 text-xs mt-1">Please select a role</p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false); // Close the modal
                    setUser({ // Reset the form fields
                      name: '',
                      email: '',
                      mobileNo: '',
                      password: '',
                      roleId: '',
                      created_by: createdBy,
                    });
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                >
                  {isSubmitting ? 'Adding...' : 'Add User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Add USer model end*/}

      {/* USer edit model start*/}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center ">
          <div className="bg-white p-6 rounded-lg shadow-md w-full dark:bg-gray-600 max-w-md mt-20 ml-60">
            <h2 className="text-lg font-bold mb-4">Edit User</h2>
            <form onSubmit={handleEditSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1" htmlFor="name">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  required
                  className="w-full p-2 border dark:bg-gray-700 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1" htmlFor="email">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  required
                  className="w-full p-2 border dark:bg-gray-700 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1" htmlFor="mobileNo">
                  Mobile No
                </label>
                <input
                  type="text"
                  id="mobileNo"
                  name="mobileNo"
                  value={editingUser.mobileNo}
                  onChange={(e) => setEditingUser({ ...editingUser, mobileNo: e.target.value })}
                  required
                  className="w-full p-2 border border-gray-300 dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 " htmlFor="roleId">
                  Role
                </label>
                <select
                  id="roleId"
                  name="roleId"
                  value={editingUser.roleId}
                  onChange={(e) => setEditingUser({ ...editingUser, roleId: e.target.value })}
                  required
                  className="w-full p-2 border border-gray-300  dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                >
                  {isSubmitting ? 'Updating...' : 'Update User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* user edit model end*/}


      {/*  change Pass model start*/}
      {isChangePassModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md mt-12 ml-60 dark:bg-gray-600">
            <h2 className="text-lg font-bold mb-4 bg-gray-200 text-center border-2 border-b p-1 dark:text-gray-700 rounded-md dark:bg-gray-400">Change Password</h2>
            <form onSubmit={handleChangePass}>
              <input
                type="hidden"
                name="email"
                value={selectedEmail} // Hidden input for email
              />
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1" htmlFor="oldPassword">
                  Old Password
                </label>
                <input
                  type="password"
                  id="oldPassword"
                  name="oldPassword"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder='Enter Your  old password'
                  required
                  className="w-full p-2 border border-gray-300 dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1" htmlFor="newPassword">
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                   placeholder='Enter Your  New password'
                  required
                  className="w-full p-2 border border-gray-300 dark:bg-gray-700  rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1" htmlFor="confirmPassword">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                   placeholder='Enter Your confirm password'
                  required
                  className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsChangePassModalOpen(false)}
                  className="bg-gray-400 text-white px-4 py-2 rounded-md hover:bg-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                >
                  {isSubmitting ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Add USer change Pass model end*/}

      {/*  USer list model start*/}
      <div className="mt-8">
  <h2 className="text-lg font-bold mb-4">User List</h2>
       {filteredUsers.length > 0 ? (
        <div className="overflow-x-auto"> {/* Make the table scrollable on small screens */}
          <table className="min-w-full bg-white border dark:bg-gray-600 border-gray-300 text-sm"> {/* Smaller text */}
            <thead>
              <tr className="bg-gray-200 text-gray-600 dark:bg-gray-300">
                <th className="py-1 px-2 border-b text-left">Sr No.</th> {/* Align text to the left */}
                <th className="py-1 px-2 border-b text-left">Name</th>
                <th className="py-1 px-2 border-b text-left">Email</th>
                <th className="py-1 px-2 border-b text-left">Mobile Number</th>
                <th className="py-1 px-2 border-b text-left">Role</th>
                <th className="py-1 px-2 border-b text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, index) => (
                <tr key={user.user_id} className="hover:bg-gray-100 dark:hover:bg-gray-500 dark:hover:text-black">
                  <td className="py-1 px-2 border-b align-middle">{index + 1}</td> {/* Vertically align text */}
                  <td className="py-1 px-2 border-b align-middle">{user.name}</td>
                  <td className="py-1 px-2 border-b align-middle">{user.email}</td>
                  <td className="py-1 px-2 border-b align-middle">{user.mobileNo}</td>
                  <td className="py-1 px-2 border-b align-middle">
                    {roles.find((role) => role.role_id === Number(user.roleId))?.name || 'NA'}
                  </td>
                  <td className="py-1 px-2 border-b align-middle">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className={`bg-yellow-500 text-white w-16 py-1 rounded-md hover:bg-yellow-600 transition-colors duration-200 focus:outline-none active:bg-yellow-600 ${loggedInUser ?.roleId === Number('3') ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={loggedInUser ?.roleId === Number('3')}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleOpenDeleteModal(user.user_id)}
                        className={`bg-red-500 text-white px-2 py-1 rounded-md hover:bg-red-600 transition-colors duration-200 focus:outline-none active:bg-red-600 ${loggedInUser ?.roleId === Number('3') ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={loggedInUser  ?.roleId === Number('3')}
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => handleOpenChangePassModal(user.email)}
                        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                      >
                        Change Password
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-600 text-center py-6">No users found.</p>
      )}
      </div>
      {/*  USer list model end*/}
      {/* Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-sm ml-60  dark:bg-gray-700">
            <h3 className="text-lg font-bold mb-4 text-center">Confirm Delete</h3>
            <p className="text-sm mb-4">Are you sure you want to delete this user? This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancelDelete}
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
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