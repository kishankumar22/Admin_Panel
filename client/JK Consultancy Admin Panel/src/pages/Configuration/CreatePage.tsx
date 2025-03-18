import React, { useEffect, useState } from 'react';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import { Link } from 'react-router-dom';
import axiosInstance from '../../config';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';


const CreatePage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pageName, setPageName] = useState('');
  const [pageUrl, setPageUrl] = useState('');
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  const { user } = useAuth();
  const createdBy = user?.name;

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      const response = await axiosInstance.get('/pages');
      setPages(response.data);
    } catch (err) {
      toast.error('Error fetching pages');
    }
  };

   // Interfaces
   interface Permission {
    roleId: number;
    pageId: number;
    canCreate: boolean;
    canRead: boolean;
    canUpdate: boolean;
    canDelete: boolean;
  }

  interface Page {
    modify_on: string;
    modify_by: string;
    pageId: number;
    pageName: string;
    pageUrl: string;
    created_by: string;
    created_on: string;
  }

  interface Role {
    name: string;
    role_id: number;
  }

  // Fetching data
  useEffect(() => {
    fetchPages();
    fetchPermissions();
    fetchRoles();
  }, []);



  const fetchPermissions = async () => {
    try {
      const response = await axiosInstance.get('/permissions');
      setPermissions(response.data);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await axiosInstance.get('/getrole');
      setRoles(response.data.role);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  // Permissions and roles
  const pageId = pages.find(page => page.pageName === "Create Page")?.pageId;
  const roleId = roles.find(role => role.role_id === user?.roleId)?.role_id;
  const userPermissions = permissions.find(perm => perm.pageId === pageId && roleId === user?.roleId);
  const canCreate = userPermissions?.canCreate ?? false;
  const canUpdate = userPermissions?.canUpdate ?? false;
  const canDelete = userPermissions?.canDelete ?? false;
  // const canRead = userPermissions?.canRead ?? false;
  
  useEffect(() => {
    console.log('User Role ID:', user?.roleId);
    console.log('Page ID:', pageId);
    console.log('Permissions:', permissions);
    console.log('User Permissions:', userPermissions);
    console.log('Permission Values:', { canCreate, canUpdate, canDelete });
  }, []);
  const handleCreatePage = async () => {
    try {
      await axiosInstance.post('/createPage', { pageName, pageUrl, created_by: createdBy });
      toast.success('Page created successfully!');
      fetchPages();
      setIsModalOpen(false);
    } catch (error) {
      toast.error('Error creating page');
    }
  };

  const handleEditPage = async () => {
    if (!selectedPage) return;

    try {
      await axiosInstance.put(`/updatePage/${selectedPage.pageId}`, { 
        pageName, 
        pageUrl, 
        modify_by: createdBy 
      });

      toast.success('Page updated successfully!');
      fetchPages();
      setIsEditModalOpen(false);
    } catch (error) {
      toast.error('Error updating page');
    }
  };

  const handleDeletePage = async () => {
    if (!selectedPage) return;

    try {
      await axiosInstance.delete(`/deletePage/${selectedPage.pageId}`);
      toast.success('Page deleted successfully!');
      fetchPages();
      setIsDeleteModalOpen(false);
    } catch (error) {
      toast.error('Error deleting page');
    }
  };
  const [searchQuery, setSearchQuery] = useState<string>('');
 // Filter pages based on the search query
 const filteredPages = pages.filter(page =>
  page.pageName.toLowerCase().includes(searchQuery.toLowerCase())
);
  return (
    <>
      <Breadcrumb pageName="Create Page" />
      <div className="flex items-center justify-between mb-4">
      <input
        type="search"
        className='py-1 px-2 bg-white border border-gray-300 rounded-md text-xs w-80 placeholder:text-[.7rem] focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200'
        placeholder='Search Message here...'
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)} // Update search query state
      />

      <div className="flex items-center space-x-2">
       <button
  className={`bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600 transition duration-200 ${!canCreate ? 'opacity-50 cursor-not-allowed' : ''}`}
  onClick={canCreate ? () => setIsModalOpen(true) : () => toast.error('Access Denied: You do not have permission to create pages.')}
  disabled={!canCreate}
>
  Create Page
</button>
        <Link to="/assign-page-to-role">
          <button className="bg-orange-500 text-white px-3 py-1 rounded text-xs hover:bg-orange-600 transition duration-200">
            Assign Page to Role
          </button>
        </Link>
      </div>
    </div>

      <table className="min-w-full border mt-2 text-sm"> {/* Reduced margin and set smaller text size */}
  <thead>
    <tr className="bg-gray-200">
      <th className="py-1 px-2">ID</th>
      <th className="py-1 px-2">Page Name</th>
      <th className="py-1 px-2">Page URL</th>
      <th className="py-1 px-2">Created By</th>
      <th className="py-1 px-2">Created On</th>
      <th className="py-1 px-2">Modified By</th>
      <th className="py-1 px-2">Modified On</th>
      <th className="py-1 px-2">Actions</th>
    </tr>
  </thead>
  <tbody>
  {filteredPages.length > 0 ? (
            filteredPages.map((page) => (
              <tr key={page.pageId} className="border-b border-gray-200 hover:bg-gray-100">
                <td className="py-1 px-2 border-b">{page.pageId}</td>
                <td className="py-1 px-2 border-b">{page.pageName}</td>
                <td className="py-1 px-2 border-b">{page.pageUrl}</td>
                <td className="py-1 px-2 border-b">{page.created_by}</td>
                <td className="py-1 px-2 border-b">{new Date(page.created_on).toLocaleDateString()}</td>
                <td className="py-1 px-2 border-b">{page.modify_by || 'N/A'}</td>
                <td className="py-1 px-2 border-b">{page.modify_on ? new Date(page.modify_on).toLocaleDateString() : 'N/A'}</td>
                <td className="py-1 px-2 border-b">
  <button
    className={`bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 transition duration-200 ${!canUpdate ? 'opacity-50 cursor-not-allowed' : ''}`}
    onClick={canUpdate ? () => {
      setSelectedPage(page);
      setIsEditModalOpen(true);
    } : () => toast.error('Access Denied: You do not have permission to edit pages.')}
    disabled={!canUpdate}
  >
    Edit
  </button>
  <button
    className={`bg-red-500 text-white px-2 py-1 rounded ml-2 hover:bg-red-600 transition duration-200 ${!canDelete ? 'opacity-50 cursor-not-allowed' : ''}`}
    onClick={canDelete ? () => {
      setSelectedPage(page);
      setIsDeleteModalOpen(true);
    } : () => toast.error('Access Denied: You do not have permission to delete pages.')}
    disabled={!canDelete}
  >
    Delete
  </button>
</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={8} className="py-4 text-center text-gray-500">No pages found</td>
            </tr>
          )}
  </tbody>
</table>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h2 className="text-lg font-semibold mb-4">Edit Page</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Page Name</label>
              <input
                type="text"
                value={pageName}
                onChange={(e) => setPageName(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder=" Enter page name"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Page URL</label>
              <input
                type="text"
                value={pageUrl}
                onChange={(e) => setPageUrl(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Enter page URL"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleEditPage}
                className="bg-blue-500 text-white font-semibold py-2 px-4 rounded-md"
              >
                Update
              </button>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-md"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h2 className="text-lg font-semibold mb-4">Confirm Deletion</h2>
            <p>Are you sure you want to delete this page?</p>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={handleDeletePage}
                className="bg-red-500 text-white font-semibold py-2 px-4 rounded-md"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-md"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Page Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 shadow-lg w-96">
            <h2 className="text-lg font-semibold mb-4">Create New Page</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Page Name</label>
              <input
                type="text"
                value={pageName}
                onChange={(e) => setPageName(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Enter page name"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Page URL</label>
              <input
                type="text"
                value={pageUrl}
                onChange={(e) => setPageUrl(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Enter page URL"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="bg-red-500 text-white font-semibold py-2 px-4 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePage}
                className="bg-blue-500 text-white font-semibold py-2 px-4 rounded-md"
              >
                Create Page
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CreatePage;