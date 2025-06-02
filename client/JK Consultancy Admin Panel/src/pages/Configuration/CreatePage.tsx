import React, { useEffect, useState } from 'react';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import { Link, useLocation } from 'react-router-dom';
import axiosInstance from '../../config';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { FaEdit, FaPlus, FaUser, FaSearch, FaSpinner, FaXRay, FaTimes } from 'react-icons/fa';
import { MdDelete } from 'react-icons/md';

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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSearchLoading, setIsSearchLoading] = useState(false); // Added for search loader

  const { user } = useAuth();
  const createdBy = user?.name;

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
    const fetchData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([fetchPages(), fetchPermissions(), fetchRoles()]);
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const fetchPages = async () => {
    try {
      const response = await axiosInstance.get('/pages');
      setPages(response.data);
      console.log(response.data)
      return response.data;
    } catch (err) {
      toast.error('Error fetching pages');
      return [];
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await axiosInstance.get('/permissions');
      setPermissions(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching permissions:', error);
      return [];
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await axiosInstance.get('/getrole');
      setRoles(response.data.role);
      return response.data.role;
    } catch (error) {
      console.error('Error fetching roles:', error);
      return [];
    }
  };

  // Handle search with loader
  useEffect(() => {
    setIsSearchLoading(true); // Show search loader
    const filtered = pages.filter(page =>
      page.pageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.pageUrl.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Simulate processing delay for search loader
    const timer = setTimeout(() => {
      setIsSearchLoading(false);
    }, 300);

    return () => clearTimeout(timer); // Cleanup timeout
  }, [searchQuery, pages]);

  // Permissions and roles
  const location = useLocation();
  const currentPageName = location.pathname.split('/').pop();
  const prefixedPageUrl = `/${currentPageName}`;
  const pageId = pages.find(page => page.pageUrl === prefixedPageUrl)?.pageId;
  const userPermissions = permissions.find(perm => perm.pageId === pageId && perm.roleId === user?.roleId);
  const loggedroleId = user?.roleId;

  // Set default permissions based on role ID
  const defaultPermission = loggedroleId === 2;

  // Use provided permissions if available, otherwise fall back to defaultPermission
  const canCreate = userPermissions?.canCreate ?? defaultPermission;
  const canUpdate = userPermissions?.canUpdate ?? defaultPermission;
  const canDelete = userPermissions?.canDelete ?? defaultPermission;

  const handleCreatePage = async () => {
    if (!pageName.trim() || !pageUrl.trim()) {
      toast.warning('Please fill in all fields');
      return;
    }
    
    try {
      await axiosInstance.post('/createPage', { pageName, pageUrl, created_by: createdBy });
      toast.success('Page created successfully!');
      await fetchPages();
      setIsModalOpen(false);
      // Reset input fields
      setPageName('');
      setPageUrl('');
    } catch (error) {
      toast.error('Error creating page');
    }
  };

  const closeCreateModal = () => {
    setIsModalOpen(false);
    // Reset input fields
    setPageName('');
    setPageUrl('');
  };

  const handleEditPage = async () => {
    if (!selectedPage) return;
    
    if (!pageName.trim() || !pageUrl.trim()) {
      toast.warning('Please fill in all fields');
      return;
    }

    try {
      await axiosInstance.put(`/updatePage/${selectedPage.pageId}`, {
        pageName,
        pageUrl,
        modify_by: createdBy
      });
      toast.success('Page updated successfully!');
      await fetchPages();
      setIsEditModalOpen(false);
      // Reset input fields
      setPageName('');
      setPageUrl('');
    } catch (error) {
      toast.error('Error updating page');
    }
  };

  const handleDeletePage = async () => {
    if (!selectedPage) return;

    try {
      await axiosInstance.delete(`/deletePage/${selectedPage.pageId}`);
      toast.success('Page deleted successfully!');
      await fetchPages();
      setIsDeleteModalOpen(false);
    } catch (error) {
      toast.error('Error deleting page');
    }
  };

  // Filter pages based on the search query
  const filteredPages = pages.filter(page =>
    page.pageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    page.pageUrl.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return 'Invalid Date';
    }
  };

  return (
    <>
      <Breadcrumb pageName="Manage Page" />
      
      {/* Header with search and actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-2 mb-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <FaSearch className="text-gray-400 text-xs" />
          </div>
          <input
            type="search"
            className="py-2 pl-9 pr-3 bg-white border border-gray-300 rounded-md text-xs w-full md:w-80 
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            placeholder="Search pages by name or URL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center space-x-2 self-end md:self-auto">
          <button
            className={`bg-blue-500 text-white px-3 py-2 rounded text-xs hover:bg-blue-600 
                      transition-all shadow-sm flex items-center ${!canCreate ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={canCreate ? () => setIsModalOpen(true) : () => toast.error('Access Denied: You do not have permission to create pages.')}
          >
            <FaPlus className="mr-1.5" />
            <span>Create Page </span>
          </button>
          <Link to="/assign-page-to-role">
            <button className="bg-orange-500 text-white px-3 py-2 rounded text-xs hover:bg-orange-600 
                             transition-all shadow-sm flex items-center">
              <FaUser className="mr-1.5" />
              <span className="hidden sm:inline">Assign Page to Role</span>
              <span className="inline sm:hidden">Assign</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Pages table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
        {isLoading ? (
          <div className="py-10 text-center text-gray-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-500 mb-2"></div>
            <p>Loading pages...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Page Name</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Page URL</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Created By</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Created On</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">Modified By</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">Modified On</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isSearchLoading ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center">
                      <div className="flex flex-col items-center justify-center min-h-[200px] bg-gray-50 border-t border-gray-200">
                        <FaSpinner className="animate-spin h-8 w-8 text-blue-600 mb-3" />
                        <p className="text-sm font-medium text-gray-600">Searching...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredPages.length > 0 ? (
                  filteredPages.map((page) => (
                    <tr key={page.pageId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">{page.pageId}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-800">{page.pageName}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 hidden md:table-cell">{page.pageUrl}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 hidden lg:table-cell">{page.created_by}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 hidden lg:table-cell">{formatDate(page.created_on)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 hidden xl:table-cell">{page.modify_by || 'N/A'}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 hidden xl:table-cell">{page.modify_on ? formatDate(page.modify_on) : 'N/A'}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-right text-xs">
                        <div className="flex justify-end gap-1.5">
                          <button
                            className={`bg-green-500 text-white p-1.5 rounded hover:bg-green-600 
                                      transition-all ${!canUpdate ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={canUpdate ? () => {
                              setSelectedPage(page);
                              setPageName(page.pageName);
                              setPageUrl(page.pageUrl);
                              setIsEditModalOpen(true);
                            } : () => toast.error('Access Denied: You do not have permission to edit pages.')}
                            title="Edit"
                          >
                            <FaEdit size={14} />
                          </button>
                          <button
                            className={`bg-red-500 text-white p-1.5 rounded hover:bg-red-600 
                                      transition-all ${!canDelete ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={canDelete ? () => {
                              setSelectedPage(page);
                              setIsDeleteModalOpen(true);
                            } : () => toast.error('Access Denied: You do not have permission to delete pages.')}
                            title="Delete"
                          >
                            <MdDelete size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-left text-gray-500">
  {searchQuery ? (
    <div className="flex flex-col items-center text-xl">
      <p className="text-gray-500 mb-1">No pages found matching : <span className="font-bold">"{searchQuery}"</span></p>
      <button 
        className="text-blue-500 hover:text-blue-700 text-xs flex items-center gap-1"
        onClick={() => setSearchQuery('')}
      >
        <FaTimes className="text-red-500 text-sm" />
        <span>Clear search</span>
      </button>
    </div>
  ) : (
    <p>No pages available</p>
  )}
</td>

                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Mobile card view */}
        <div className="block sm:hidden">
          {isLoading ? (
            <div className="py-10 text-center text-gray-500">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-500 mb-2"></div>
              <p>Loading pages...</p>
            </div>
          ) : isSearchLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[200px] bg-gray-50 border-t border-gray-200 p-3">
              <FaSpinner className="animate-spin h-8 w-8 text-blue-600 mb-3" />
              <p className="text-sm font-medium text-gray-600">Searching...</p>
            </div>
          ) : filteredPages.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {filteredPages.map((page) => (
                <div key={page.pageId} className="p-3 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-xs font-medium text-gray-800">{page.pageName}</h3>
                    <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">ID: {page.pageId}</span>
                  </div>
                  <div className="text-xs text-gray-500 mb-1">{page.pageUrl}</div>
                  <div className="text-xs text-gray-500 mb-1">Created: {formatDate(page.created_on)} by {page.created_by}</div>
                  {page.modify_on && (
                    <div className="text-xs text-gray-500 mb-1">Modified: {formatDate(page.modify_on)} by {page.modify_by}</div>
                  )}
                  <div className="flex justify-end mt-2 gap-1.5">
                    <button
                      className={`bg-green-500 text-white p-1.5 rounded hover:bg-green-600 
                                transition-all ${!canUpdate ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={canUpdate ? () => {
                        setSelectedPage(page);
                        setPageName(page.pageName);
                        setPageUrl(page.pageUrl);
                        setIsEditModalOpen(true);
                      } : () => toast.error('Access Denied: You do not have permission to edit pages.')}
                    >
                      <FaEdit size={12} />
                    </button>
                    <button
                      className={`bg-red-500 text-white p-1.5 rounded hover:bg-red-600 
                                transition-all ${!canDelete ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={canDelete ? () => {
                        setSelectedPage(page);
                        setIsDeleteModalOpen(true);
                      } : () => toast.error('Access Denied: You do not have permission to delete pages.')}
                    >
                      <MdDelete size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 text-center text-gray-500">
              {searchQuery ? (
                <div>
                  <p className="text-gray-500">No pages found matching "{searchQuery}"</p>
                  <button 
                    className="text-blue-500 hover:text-blue-700 text-xs mt-2"
                    onClick={() => setSearchQuery('')}
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                <p>No pages available</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-50">
          <div className="bg-white p-5 rounded-lg shadow-lg w-96 max-w-full mx-4">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Edit Page</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Page Name</label>
              <input
                type="text"
                value={pageName}
                onChange={(e) => setPageName(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter page name"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Page URL</label>
              <div className="flex rounded-md">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  /
                </span>
                <input
                  type="text"
                  value={pageUrl.startsWith('/') ? pageUrl.substring(1) : pageUrl}
                  onChange={(e) => setPageUrl('/' + e.target.value.replace(/^\/+/, ''))}
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="page-name"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setPageName('');
                  setPageUrl('');
                }}
                className="bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-md hover:bg-gray-300 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleEditPage}
                className="bg-blue-500 text-white font-medium py-2 px-4 rounded-md hover:bg-blue-600 text-sm"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-50">
          <div className="bg-white p-5 rounded-lg shadow-lg w-96 max-w-full mx-4">
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0 bg-red-100 rounded-full p-2">
                <MdDelete className="h-5 w-5 text-red-600" />
              </div>
              <div className="ml-3">
                <h2 className="text-lg font-semibold text-gray-800">Confirm Deletion</h2>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            
            <p className="mb-4 text-gray-600">
              Are you sure you want to delete the page "{selectedPage?.pageName}"?
            </p>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-md hover:bg-gray-300 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePage}
                className="bg-red-500 text-white font-medium py-2 px-4 rounded-md hover:bg-red-600 text-sm"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Page Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-lg p-5 shadow-lg w-96 max-w-full mx-4">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Create New Page</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Page Name</label>
              <input
                type="text"
                value={pageName}
                onChange={(e) => setPageName(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter page name"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Page URL</label>
              <div className="flex rounded-md">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  /
                </span>
                <input
                  type="text"
                  value={pageUrl.startsWith('/') ? pageUrl.substring(1) : pageUrl}
                  onChange={(e) => setPageUrl('/' + e.target.value.replace(/^\/+/, ''))}
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="page-name"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={closeCreateModal}
                className="bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-md hover:bg-gray-300 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePage}
                className="bg-blue-500 text-white font-medium py-2 px-4 rounded-md hover:bg-blue-600 text-sm"
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