import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axiosInstance from '../config';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FaEdit, FaKey, FaEye, FaEyeSlash, FaUserPlus, FaFilter, FaSearch, FaTimes } from 'react-icons/fa';
import { MdDelete, MdEmail, MdSmartphone, MdPerson } from 'react-icons/md';
import { HiOutlineUserCircle } from 'react-icons/hi';


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

interface Page {
  modify_by: string;
  modify_on: any;
  pageId: number;
  pageName: string;
  pageUrl: string;
  created_by: string;
  created_on: Date;
}

interface Permission {
  roleId: number;
  pageId: number;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

const AddUser: React.FC = () => {
  const { user: loggedInUser, logout } = useAuth();
  const navigate = useNavigate();
  const createdBy = loggedInUser?.name || 'admin';
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isChangePassModalOpen, setIsChangePassModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [originalEmail, setOriginalEmail] = useState<string>(''); // Store the original email
  const [selectedEmail, setSelectedEmail] = useState<string>('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userIdToDelete, setUserIdToDelete] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [userConfirmPassword, setUserConfirmPassword] = useState('');
  const [showUserConfirmPassword, setShowUserConfirmPassword] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedMobile, setSelectedMobile] = useState('');

  const [user, setUser] = useState({
    name: '',
    email: '',
    mobileNo: '',
    password: '',
    roleId: '',
    created_by: createdBy,
  });

  useEffect(() => {
    if (user.password || userConfirmPassword) {
      setPasswordsMatch(user.password === userConfirmPassword);
    } else {
      setPasswordsMatch(true);
    }
  }, [user.password, userConfirmPassword]);

  useEffect(() => {
    fetchUsers();
    fetchroles();
    fetchPages();
    fetchPermissions();

  }, []);
  
  // Fetch Pages
  const fetchPages = async () => {
    try {
      const response = await axiosInstance.get("/pages");
      setPages(response.data);
    } catch (err) {
      toast.error("Error fetching pages");
      console.error(err);
    }
  };

  // Fetch Existing Permissions
  const fetchPermissions = async () => {
    try {
      const response = await axiosInstance.get("/permissions");
      setPermissions(response.data);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      toast.error("Error fetching permissions");
    }
  };

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

   // Use useLocation to get the current path
    const location = useLocation();
    const currentPageName = location.pathname.split('/').pop();
    // console.log("currentPageName :", currentPageName);
  console.log('Current role ID:', loggedInUser?.roleId);  
  const loginUserRoleId = Number(loggedInUser?.roleId);
    // Permissions and roles
    // Prefixing currentPageName with '/' to match the database format
    const prefixedPageUrl = `/${currentPageName}`;
    const pageId = pages.find(page => page.pageUrl === prefixedPageUrl)?.pageId;
    // const roleId = roles.find(role => role.role_id === loginUserRoleId)?.role_id;
    const userPermissions = permissions.find(perm => perm.pageId === pageId && perm.roleId === loginUserRoleId);
 const loggedroleId = loggedInUser?.roleId;
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
  
  const resetModalForm = () => {
    setUser({
      name: '',
      email: '',
      mobileNo: '',
      password: '',
      roleId: '',
      created_by: createdBy,
    });
    setUserConfirmPassword('');
    setPasswordsMatch(true);
    setShowPassword(false);
    setShowUserConfirmPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!passwordsMatch) {
      toast.error('Password and confirm password do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = { ...user, created_by: createdBy };
      await axiosInstance.post('/users', payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      toast.success('User added successfully!');
      resetModalForm();
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
    setOriginalEmail(user.email); // Store the original email when opening the edit modal
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

      // Check if the logged-in user changed their own email
      if (
        editingUser.email !== originalEmail &&
        originalEmail === loggedInUser?.email
      ) {
        logout(); // Logout the user
        navigate('/auth/signin'); // Redirect to sign-in page
      } else {
        setIsEditModalOpen(false);
        fetchUsers();
      }
    } catch (err) {
      let errorMessage = 'Failed to update user. Please try again.';
      if (err instanceof Error) errorMessage = err.message;
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const axiosError = err as { response: { data: { message?: string } } };
        errorMessage = axiosError.response?.data?.message || errorMessage;
      }
      console.error('Error updating user:', errorMessage);
      toast.error(errorMessage);
      setIsEditModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChangePassModal = (email: string) => {
    setSelectedEmail(email);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setIsChangePassModalOpen

(true);
  };

  const handleCloseChangePassModal = () => {
    setIsChangePassModalOpen(false);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSelectedEmail('');
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
      handleCloseChangePassModal();
    } catch (error) {
      toast.error('Failed to change password');
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedRole('');
    setSelectedEmail('');
    setSelectedMobile('');
  };

  const getRoleColor = (roleName: string) => {
    switch (roleName?.toLowerCase()) {
      case 'administrator':
        return 'bg-purple-600 text-white';
      case 'admin':
        return 'bg-blue-600 text-white';
      case 'registered':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  // Determine if the Edit button should be enabled for a user
  const canEditUser = (user: User) => {
    const loggedInRoleId = Number(loggedInUser?.roleId);
    const userRoleId = Number(user.roleId);

    if (loggedInRoleId === 2) {
      // Administrator can edit everyone
      return true;
    } else if (loggedInRoleId === 1) {
      // Admin can edit themselves, other Admins, and Registered users, but not Administrators
      return userRoleId !== 2;
    } else if (loggedInRoleId === 3) {
      // Registered user can only edit themselves
      return user.email === loggedInUser?.email;
    }
    return false;
  };

  // Determine if the Password Change button should be enabled for a user
  const canChangePassword = (user: User) => {
    const loggedInRoleId = Number(loggedInUser?.roleId);
    const userRoleId = Number(user.roleId);

    if (loggedInRoleId === 2) {
      // Administrator can change password for everyone
      return true;
    } else if (loggedInRoleId === 1) {
      // Admin can change password for themselves, other Admins, and Registered users, but not Administrators
      return userRoleId !== 2;
    } else if (loggedInRoleId === 3) {
      // Registered user can only change their own password
      return user.email === loggedInUser?.email;
    }
    return false;
  };

  // Determine if the Delete button should be enabled for a user
  const canDeleteUser = (user: User) => {
    const loggedInRoleId = Number(loggedInUser?.roleId);
    const userRoleId = Number(user.roleId);

    // No user can delete themselves
    if (user.email === loggedInUser?.email) {
      return false;
    }

    if (loggedInRoleId === 2) {
      // Administrator can delete everyone except themselves (already checked above)
      return true;
    } else if (loggedInRoleId === 1) {
      // Admin can delete other Admins and Registered users, but not Administrators or themselves
      return userRoleId !== 2;
    } else if (loggedInRoleId === 3) {
      // Registered user cannot delete anyone
      return false;
    }
    return false;
  };

  // Determine if the role field should be editable in the Edit modal
  const isRoleEditable = () => {
    const loggedInRoleId = Number(loggedInUser?.roleId);
    if (!editingUser) return false;

    // Use the original email to check if the user is editing themselves
    if (originalEmail === loggedInUser?.email) {
      return false; // Disable role editing for self
    }

    if (loggedInRoleId === 2) {
      // Administrator can change roles for others
      return true;
    } else if (loggedInRoleId === 1) {
      // Admin can change roles for others
      return true;
    } else if (loggedInRoleId === 3) {
      // Registered user cannot change their role (already handled by the self-edit check)
      return false;
    }
    return false;
  };

  return (
    <div className="bg-gray-50 text-black">
      <div className="bg-indigo-700 text-white p-3 rounded-lg shadow-lg flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center">
          <MdPerson className="mr-2" size={20} /> User Management
        </h1>
        <div className="text-xs bg-indigo-800 px-2 py-1 rounded">
          Total Users: {users.length}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 my-3 p-2 bg-white rounded-lg shadow border border-gray-100">
        <div className="relative flex-grow">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs" />
          <input
            type="search"
            className="p-2 pl-8 bg-white border border-gray-200 rounded text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Search name, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="relative w-32">
          <select
            className="p-2 border border-gray-200 rounded text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white appearance-none"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <option value="">All Roles</option>
            {roles.map((role) => (
              <option key={role.role_id} value={role.role_id}>{role.name}</option>
            ))}
          </select>
          <FaFilter className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs" />
        </div>

        <div className="relative w-44">
          <select
            className="p-2 border border-gray-200 rounded text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white appearance-none"
            value={selectedEmail}
            onChange={(e) => setSelectedEmail(e.target.value)}
          >
            <option value="">All Emails</option>
            {Array.from(new Set(users.map(u => u.email))).map(email => (
              <option key={email} value={email}>{email}</option>
            ))}
          </select>
        </div>

        <div className="relative w-44">
          <select
            className="p-2 border border-gray-200 rounded text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white appearance-none"
            value={selectedMobile}
            onChange={(e) => setSelectedMobile(e.target.value)}
          >
            <option value="">All Mobile Numbers</option>
            {Array.from(new Set(users.map(u => u.mobileNo))).map(mobile => (
              <option key={mobile} value={mobile}>{mobile}</option>
            ))}
          </select>
        </div>

        <button
          className="p-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded flex items-center"
          onClick={clearFilters}
        >
          <FaTimes size={12} className="mr-1" /> Clear Filters
        </button>

    {Number(loggedInUser?.roleId) !== 3 && (
  <button
    className={`p-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded flex items-center transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400
      ${!canCreate ? 'opacity-50 cursor-not-allowed' : ''}`}
    onClick={() => {
      if (!canCreate) {
        toast.error('Access Denied: You do not have permission to add users.');
        return;
      }
      resetModalForm();
      setIsModalOpen(true);
    }}
  >
    <FaUserPlus size={12} className="mr-1" /> Add User
  </button>
)}

      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-md overflow-hidden">
        <div className="flex items-center px-4 py-2 border-b border-gray-100">
          <HiOutlineUserCircle className="mr-2 text-gray-500" size={18} />
          <h2 className="text-sm font-semibold text-gray-700">User List</h2>
          <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
            {filteredUsers.length} users
          </span>
        </div>

        <div className="overflow-x-auto rounded shadow">
          {filteredUsers.length > 0 ? (
            <table className="min-w-full text-sm text-center border border-gray-200">
              <thead className="bg-gray-100 text-gray-700 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Mobile</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user, index) => (
                  <tr key={user.user_id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">{index + 1}</td>
                    <td className="px-3 py-2">{user.name}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center ml-16 justify-start text-gray-800">
                        <MdEmail className="mr-2 text-gray-500" size={16} />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center text-gray-700">
                        <MdSmartphone className="mr-1 text-gray-500" size={14} />
                        {user.mobileNo}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(roles.find((role) => role.role_id === Number(user.roleId))?.name || '')}`}>
                        {roles.find((role) => role.role_id === Number(user.roleId))?.name || 'N/A'}
                      </span>
                    </td>
                    <td className="px-1 py-1">
                      <div className="flex justify-stretch gap-1">
                     {/* Edit Button */}
{canEditUser(user) && (
  <button
    className={`bg-yellow-500 hover:bg-yellow-600 text-white text-xs px-2 py-1 rounded mr-1
      ${!canUpdate ? 'opacity-50 cursor-not-allowed' : ''}`}
    onClick={() => {
      if (!canUpdate) {
        toast.error('Access Denied: You do not have permission to edit users.');
        return;
      }
      handleEdit(user);
    }}
  >
    <FaEdit className="inline mr-1" size={10} /> Edit
  </button>
)}

{/* Delete Button */}
{canDeleteUser(user) && (
  <button
    className={`bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded mr-1
      ${!canDelete ? 'opacity-50 cursor-not-allowed' : ''}`}
    onClick={() => {
      if (!canDelete) {
        toast.error('Access Denied: You do not have permission to delete users.');
        return;
      }
      handleOpenDeleteModal(user.user_id);
    }}
  >
    <MdDelete className="inline mr-1" size={10} /> Delete
  </button>
)}

{/* Password Button */}
{canChangePassword(user) && (
  <button
    className={`bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded
      ${!canRead ? 'opacity-50 cursor-not-allowed' : ''}`}
    onClick={() => {
      if (!canRead) {
        toast.error('Access Denied: You do not have permission to change passwords.');
        return;
      }
      handleOpenChangePassModal(user.email);
    }}
  >
    <FaKey className="inline mr-1" size={10} /> Password
  </button>
)}

                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-gray-500 text-center py-4 text-sm">
              No users found. Try adjusting your filters.
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg shadow-lg w-full max-w-md border border-blue-100">
            <div className="bg-indigo-600 text-white p-2 rounded-t-lg -mt-4 -mx-4 mb-3">
              <h2 className="text-lg font-semibold text-center flex items-center justify-center">
                <FaUserPlus className="mr-2" size={16} /> Add New User
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700" htmlFor="name">
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
                  className={`w-full p-2 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 ${user.name && !/^[A-Za-z\s]{2,50}$/.test(user.name) ? 'border-red-500' : 'border-gray-300'} text-black`}
                />
                {user.name && !/^[A-Za-z\s]{2,50}$/.test(user.name) && (
                  <p className="text-red-500 text-xs mt-1">Valid name: 2-50 letters</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700" htmlFor="email">
                  Email
                </label>
                <input
                  type=" email"
                  id="email"
                  name="email"
                  value={user.email}
                  onChange={handleChange}
                  placeholder="Enter email"
                  required
                  pattern="[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"
                  title="Please enter a valid email address"
                  className={`w-full p-2 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 ${user.email && !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(user.email) ? 'border-red-500' : 'border-gray-300'} text-black`}
                />
                {user.email && !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(user.email) && (
                  <p className="text-red-500 text-xs mt-1">Enter a valid email</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700" htmlFor="mobileNo">
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
                  className={`w-full p-2 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 ${user.mobileNo && !/^[0-9]{10}$/.test(user.mobileNo) ? 'border-red-500' : 'border-gray-300'} text-black`}
                />
                {user.mobileNo && !/^[0-9]{10}$/.test(user.mobileNo) && (
                  <p className="text-red-500 text-xs mt-1">Enter a 10-digit mobile no</p>
                )}
              </div>

              <div className="relative">
                <label className="block text-xs font-medium mb-1 text-gray-700" htmlFor="password">
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
                    className={`w-full p-2 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 pr-10 ${user.password && !/(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}/.test(user.password) ? 'border-red-500' : (passwordsMatch ? 'border-gray-300' : 'border-red-500')} text-black`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? <FaEyeSlash className="text-gray-500" size={14} /> : <FaEye className="text-gray-500" size={14} />}
                  </button>
                </div>
                {user.password && !/(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}/.test(user.password) && (
                  <p className="text-red-500 text-xs mt-1">8+ chars, upper, lower, number</p>
                )}
              </div>

              <div className="relative">
                <label className="block text-xs font-medium mb-1 text-gray-700" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showUserConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={userConfirmPassword}
                    onChange={(e) => setUserConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    required
                    className={`w-full p-2 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 pr-10 ${!passwordsMatch ? 'border-red-500' : 'border-gray-300'} text-black`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowUserConfirmPassword(!showUserConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showUserConfirmPassword ? <FaEyeSlash className="text-gray-500" size={14} /> : <FaEye className="text-gray-500" size={14} />}
                  </button>
                </div>
                {!passwordsMatch && (
                  <p className="text-red-500 text-xs mt-1">Passwords don't match</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700" htmlFor="roleId">
                  Role
                </label>
                <select
                  id="roleId"
                  name="roleId"
                  value={user.roleId}
                  onChange={handleChange}
                  required
                  className={`w-full p-2 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 ${user.roleId === '' ? 'border-red-500' : 'border-gray-300'} text-black`}
                >
                  <option value="">Select Role</option>
                  {roles && roles.length > 0 ? (
                    roles
                      .filter((role) => role.role_id !== 2) // Exclude Admin role from Add User options
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
                {user.roleId === '' && (
                  <p className="text-red-500 text-xs mt-1">Select a role</p>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    resetModalForm();
                    setIsModalOpen(false);
                  }}
                  className="bg-gray-400 hover:bg-gray-500 text-white px-3 py-1.5 text-sm rounded flex items-center"
                >
                  <FaTimes className="mr-1" size={12} /> Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !passwordsMatch}
                  className={`${isSubmitting || !passwordsMatch ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} text-white px-3 py-1.5 text-sm rounded flex items-center`}
                >
                  <FaUserPlus className="mr-1" size={12} /> {isSubmitting ? 'Adding...' : 'Add User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 p-4 rounded-lg shadow-lg w-full max-w-md border border-yellow-100">
            <div className="bg-yellow-500 text-white p-2 rounded-t-lg -mt-4 -mx-4 mb-3">
              <h2 className="text-lg font-semibold text-center flex items-center justify-center">
                <FaEdit className="mr-2" size={16} /> Edit User
              </h2>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700" htmlFor="name">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  required
                  className="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-yellow-500 text-black"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700" htmlFor="email">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  required
                  className="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-yellow-500 text-black"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700" htmlFor="mobileNo">
                  Mobile No
                </label>
                <input
                  type="text"
                  id="mobileNo"
                  name="mobileNo"
                  value={editingUser.mobileNo}
                  onChange={(e) => setEditingUser({ ...editingUser, mobileNo: e.target.value })}
                  required
                  className="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-yellow-500 text-black"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700" htmlFor="roleId">
                  Role
                </label>
                {isRoleEditable() ? (
                  <select
                    id="roleId"
                    name="roleId"
                    value={editingUser.roleId}
                    onChange={(e) => setEditingUser({ ...editingUser, roleId: e.target.value })}
                    required
                    className="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-yellow-500 text-black"
                  >
                    <option value="">Select Role</option>
                    {roles && roles.length > 0 ? (
                      roles
                        .filter((role) => role.role_id !== 2) // Exclude Admin role from options
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
                ) : (
                  <input
                    type="text"
                    id="roleId"
                    name="roleId"
                    value={roles.find((role) => role.role_id === Number(editingUser.roleId))?.name || 'N/A'}
                    disabled
                    className="w-full p-2 text-sm border border-gray-300 rounded bg-gray-100 text-black cursor-not-allowed"
                  />
                )}
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="bg-gray-400 hover:bg-gray-500 text-white px-3 py-1.5 text-sm rounded flex items-center"
                >
                  <FaTimes className="mr-1" size={12} /> Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`${isSubmitting ? 'bg-yellow-400' : 'bg-yellow-500 hover:bg-yellow-600'} text-white px-3 py-1.5 text-sm rounded flex items-center`}
                >
                  <FaEdit className="mr-1" size={12} /> {isSubmitting ? 'Updating...' : 'Update User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isChangePassModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-lg shadow-lg w-full max-w-md border border-blue-100">
            <div className="bg-blue-600 text-white p-2 rounded-t-lg -mt-4 -mx-4 mb-3">
              <h2 className="text-lg font-semibold text-center flex items-center justify-center">
                <FaKey className="mr-2" size={16} /> Change Password
              </h2>
            </div>
            <form onSubmit={handleChangePass} className="space-y-3">
              <input type="hidden" name="email" value={selectedEmail} />

              <div className="relative">
                <label className="block text-xs font-medium mb-1 text-gray-700" htmlFor="oldPassword">
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
                    className="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 pr-10 text-black"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showOldPassword ? <FaEyeSlash className="text-gray-500" size={14} /> : <FaEye className="text-gray-500" size={14} />}
                  </button>
                </div>
              </div>

              <div className="relative">
                <label className="block text-xs font-medium mb-1 text-gray-700" htmlFor="newPassword">
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
                    className="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 pr-10 text-black"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showNewPassword ? <FaEyeSlash className="text-gray-500" size={14} /> : <FaEye className="text-gray-500" size={14} />}
                  </button>
                </div>
              </div>

              <div className="relative">
                <label className="block text-xs font-medium mb-1 text-gray-700" htmlFor="confirmPassword">
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
                    className={`w-full p-2 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 pr-10 ${newPassword !== confirmPassword && confirmPassword ? 'border-red-500' : 'border-gray-300'} text-black`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPassword ? <FaEyeSlash className="text-gray-500" size={14} /> : <FaEye className="text-gray-500" size={14} />}
                  </button>
                </div>
                {newPassword !== confirmPassword && confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">Passwords don't match</p>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={handleCloseChangePassModal}
                  className="bg-gray-400 hover:bg-gray-500 text-white px-3 py-1.5 text-sm rounded flex items-center"
                >
                  <FaTimes className="mr-1" size={12} /> Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || (newPassword !== confirmPassword)}
                  className={`${isSubmitting || (newPassword !== confirmPassword) ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} text-white px-3 py-1.5 text-sm rounded flex items-center`}
                >
                  <FaKey className="mr-1" size={12} /> {isSubmitting ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center px-4 z-50">
          <div className="bg-gradient-to-br from-red-50 to-pink-50 p-4 rounded-lg shadow-lg w-full max-w-sm border border-red-100">
            <div className="bg-red-500 text-white p-2 rounded-t-lg -mt-4 -mx-4 mb-3">
              <h3 className="text-lg font-semibold text-center flex items-center justify-center">
                <MdDelete className="mr-2" size={18} /> Confirm Delete
              </h3>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-700 text-center">
                Are you sure you want to delete this user? This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelDelete}
                className="bg-gray-400 hover:bg-gray-500 text-white px-3 py-1.5 rounded text-sm flex items-center"
              >
                <FaTimes className="mr-1" size={12} /> Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded text-sm flex items-center"
              >
                <MdDelete className="mr-1" size={12} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddUser;