import React, { useState, useEffect } from 'react';
import axiosInstance from '../config';
import { useAuth } from '../context/AuthContext';

interface User {
  user_id: number;
  name: string;
  email: string;
  mobileNo: string;
  roleId: string;
  created_by: string;
}

const AddUser: React.FC = () => {
  const { user: loggedInUser } = useAuth(); // Get the logged-in user's details
  const createdBy = loggedInUser?.name || 'admin'; // Set created_by to the logged-in user's name or 'admin' as fallback

  const [users, setUsers] = useState<User[]>([]); // State to store all users
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false); // State to control modal visibility
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false); // State to control edit modal visibility
  const [editingUser, setEditingUser] = useState<User | null>(null); // State to store the user being edited

  const [user, setUser] = useState({
    name: '',
    email: '',
    mobileNo: '',
    password: '',
    roleId: '',
    created_by: createdBy, // Initialize created_by with the logged-in user's name
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch all users on component mount
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setUser((prevUser) => ({ ...prevUser, [name]: value }));
  };
const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Include created_by in the request payload
      const payload = {
        ...user,
        created_by: createdBy, // Add created_by field
      };

      // Use axiosInstance to send a POST request
      const response = await axiosInstance.post('/users', payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log(response)


      // Assuming the response contains the created user data
      setSuccess('User added successfully!');
      setUser({
        name: '',
        email: '',
        mobileNo: '',
        password: '',
        roleId: '',
        created_by: createdBy, // Reset created_by field
      }); // Reset form

      setIsModalOpen(false); // Close the modal
      fetchUsers(); // Refresh the user list
    } catch (err) {
        let errorMessage = 'Failed to add user. Please try again.';
      
        // Check if 'err' is an instance of Error
        if (err instanceof Error) {
          errorMessage = err.message;
        }
      
        // Check if 'err' is an Axios error (if using Axios)
        if (typeof err === 'object' && err !== null && 'response' in err) {
          const axiosError = err as { response: { data: { message?: string } } };
          errorMessage = axiosError.response?.data?.message || errorMessage;
        }
      
        console.error('Error adding user:', errorMessage); // Log the error
        setError(errorMessage);
      } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user); // Set the user being edited
    setIsEditModalOpen(true); // Open the edit modal
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        ...editingUser,
        modify_by: loggedInUser?.name || 'admin', // Add modify_by field
      };

      // Use axiosInstance to send a PUT request
      const response = await axiosInstance.put(`/users/${editingUser.user_id}`, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log(response)

      setSuccess('User updated successfully!');
      setIsEditModalOpen(false); // Close the edit modal
      fetchUsers(); // Refresh the user list
    }catch (err) {
        let errorMessage = 'Failed to update user. Please try again.';
      
        // Check if 'err' is an instance of Error
        if (err instanceof Error) {
          errorMessage = err.message;
        }
      
        // Check if 'err' is an Axios error (if using Axios)
        if (typeof err === 'object' && err !== null && 'response' in err) {
          const axiosError = err as { response: { data: { message?: string } } };
          errorMessage = axiosError.response?.data?.message || errorMessage;
        }
      
        console.error('Error update user:', errorMessage); // Log the error
        setError(errorMessage);
      }finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (userId: number) => {
    try {
      await axiosInstance.delete(`/users/${userId}`);
      alert("deleedt")
      setSuccess('User deleted successfully!');
      fetchUsers(); // Refresh the user list
    } catch (err) {
        let errorMessage = 'Failed to delete user. Please try again.';
      
        // Check if 'err' is an instance of Error
        if (err instanceof Error) {
          errorMessage = err.message;
        }
      
        // Check if 'err' is an Axios error (if using Axios)
        if (typeof err === 'object' && err !== null && 'response' in err) {
          const axiosError = err as { response: { data: { message?: string } } };
          errorMessage = axiosError.response?.data?.message || errorMessage;
        }
      
        console.error('Error delete user:', errorMessage); // Log the error
        setError(errorMessage);
      }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">User Management</h1>

      {/* Add User Button */}
      <div className="flex justify-center mb-4">
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
        >
          Add User
        </button>
      </div>

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Add User</h2>
            {error && <div className="text-red-500 mb-2">{error}</div>}
            {success && <div className="text-green-500 mb-2">{success}</div>}
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1" htmlFor="name">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={user.name}
                  onChange={handleChange}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  value={user.email}
                  onChange={handleChange}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  value={user.mobileNo}
                  onChange={handleChange}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1" htmlFor="password">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={user.password}
                  onChange={handleChange}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1" htmlFor="roleId">
                  Role
                </label>
                <select
                  id="roleId"
                  name="roleId"
                  value={user.roleId}
                  onChange={handleChange}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Role</option>
                  <option value="1">Admin</option>
                  <option value="3">Registered</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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

      {/* Edit User Modal */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Edit User</h2>
            {error && <div className="text-red-500 mb-2">{error}</div>}
            {success && <div className="text-green-500 mb-2">{success}</div>}
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
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, name: e.target.value })
                  }
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, email: e.target.value })
                  }
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, mobileNo: e.target.value })
                  }
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1" htmlFor="roleId">
                  Role
                </label>
                <select
                  id="roleId"
                  name="roleId"
                  value={editingUser.roleId}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, roleId: e.target.value })
                  }
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Role</option>
                  <option value="1">Admin</option>
                  <option value="3">Registered</option>
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

      {/* User List */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">User List</h2>
        {users.length > 0 ? (
  <ul className="space-y-4">
    {users.map((user) => (
      <li
        key={user.user_id}
        className="p-6 bg-white shadow-md rounded-lg hover:shadow-lg transition-shadow duration-300"
      >
        <div className="flex justify-between items-center">
          <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-6">
            <p className="font-semibold text-gray-800">{user.name}</p>
            <p className="text-sm text-gray-600">{user.email}</p>
            <p className="text-sm text-gray-600">{user.mobileNo}</p>
            <p className="text-sm text-gray-600">
              Role: {user.roleId == '1' ? 'Admin' : 'Registered'}
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => handleEdit(user)}
              className="bg-yellow-500 text-white px-3 py-1.5 rounded-md hover:bg-yellow-600 transition-colors duration-200"
            >
              Edit
            </button>
            <button
              onClick={() => handleDelete(user.user_id)}
              className="bg-red-500 text-white px-3 py-1.5 rounded-md hover:bg-red-600 transition-colors duration-200"
            >
              Delete
            </button>
          </div>
        </div>
      </li>
    ))}
  </ul>
) : (
  <p className="text-gray-600 text-center py-6">No users found.</p>
)}
      </div>
    </div>
  );
};

export default AddUser;