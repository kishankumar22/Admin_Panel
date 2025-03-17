import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext'; 
import Breadcrumb from '../components/Breadcrumbs/Breadcrumb';
import FroalaEditor from 'react-froala-wysiwyg';
import 'froala-editor/css/froala_editor.pkgd.min.css';
import 'froala-editor/js/plugins.pkgd.min.js';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axiosInstance from '../config';

const LatestPost: React.FC = () => {
  const { user } = useAuth();
  const createdBy = user?.name || 'admin'; 
  const modify_by = user?.name; 
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
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
  
    const fetchPages = async () => {
      try {
        const response = await axiosInstance.get('/pages');
        setPages(response.data);
      } catch (err) {
        toast.error('Error fetching pages');
      }
    };
  
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
    const pageId = pages.find(page => page.pageName === "Add Latest Post")?.pageId;
    const roleId = roles.find(role => role.role_id === user?.roleId)?.role_id;
    const userPermissions = permissions.find(perm => perm.pageId === pageId && roleId === user?.roleId);
    const canCreate = userPermissions?.canCreate ?? false;
    const canUpdate = userPermissions?.canUpdate ?? false;
    const canDelete = userPermissions?.canDelete ?? false;
    const canRead = userPermissions?.canRead ?? false;
  


  const [content, setContent] = useState<string>('');
  const [postTitle, setPostTitle] = useState<string>('');
  const [postSlug, setPostSlug] = useState<string>('');
  const [isFormVisible, setIsFormVisible] = useState<boolean>(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [postToDelete, setPostToDelete] = useState<number | null>(null);

  const formRef = useRef<HTMLFormElement | null>(null); // Reference for scrolling

  const handleModelChange = (model: string) => {
    setContent(model);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await axiosInstance.get('/all-posts');
      setPosts(response.data);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Error fetching posts');
    }
  };

  const handleToggleVisibility = async (postId: number) => {
    try {
      await axiosInstance.put(`/toggle-visibility/${postId}`);
      toast.success('Post visibility updated successfully!');
      fetchPosts();
    } catch (error) {
      console.error('Error toggling visibility:', error);
      toast.error('Error toggling visibility');
    }
  };

  const openDeleteModal = (postId: number) => {
    setPostToDelete(postId);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setPostToDelete(null);
  };

  const confirmDeletePost = async () => {
    if (!postToDelete) return;

    try {
      await axiosInstance.delete(`/delete/${postToDelete}`);
      toast.success('Post deleted successfully!');
      fetchPosts();
      closeDeleteModal();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Error deleting post');
    }
  };

  const handleEditPost = (post: any) => {
    setIsFormVisible(true);
    setPostTitle(post.post_title);
    setPostSlug(post.post_slug);
    setContent(post.post_content);
    setEditingPostId(post.post_id);

    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (postTitle.length > 150) {
      toast.error('Post title cannot exceed 150 characters.');
      return;
    }

    if (postSlug.length > 150) {
      toast.error('Post slug cannot exceed 150 characters.');
      return;
    }

    try {
      if (editingPostId) {
        await axiosInstance.put(`/edit/${editingPostId}`, {
          post_title: postTitle,
          post_slug: postSlug,
          post_content: content,
          modify_by: modify_by,  // Now dynamic
          isVisible: 'true',
        });
        toast.success('Post updated successfully!');
      } else {
        await axiosInstance.post('/add-post', {
          post_title: postTitle,
          post_slug: postSlug,
          post_content: content,
          created_by: createdBy,  // Now dynamic
          isVisible: 'true',
        });
        toast.success('Post added successfully!');
      }

      setIsFormVisible(false);
      setPostTitle('');
      setPostSlug('');
      setContent('');
      setEditingPostId(null);
      fetchPosts();
    } catch (error) {
      console.error(error);
      toast.error('Error saving post');
    }
  };
  const [searchQuery, setSearchQuery] = useState('');
// Filter posts based on the search query
const filteredPosts = posts.filter(post =>
  post.post_content.toLowerCase().includes(searchQuery.toLowerCase())
);

  return (
    <>
      <Breadcrumb pageName="Add Latest Post" />
      <div className="w-full p-2 bg-white rounded-lg shadow-md dark:bg-gray-700">
  {/* Combined Search Input and Add Latest Post Button */}
  <div className="flex items-center justify-between p-2 mb-2 bg-gray-100 dark:bg-gray-600 rounded-lg shadow-md">
    <input
      type="search"
      className='py-1 px-3 bg-white border border-gray-300 rounded-md text-sm w-80 placeholder:text-[.8rem] focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200'
      placeholder='Search Latest post here...'
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)} // Update search query state
    />
   <button
  onClick={canCreate ? () => setIsFormVisible(true) : () => toast.error('Access Denied: You do not have permission to create posts.')}
  className={`ml-2 px-4 py-1 text-white rounded-lg hover:bg-blue-600 transition duration-200 ${canCreate ? 'bg-blue-500' : 'bg-gray-400 cursor-not-allowed'}`}
  disabled={!canCreate}
>
  Add Latest Post
</button>
  </div>

  {/* Form for Adding/Editing Post */}
  {isFormVisible && (
    <form ref={formRef} onSubmit={handleSubmit} className='bg-gray-200 p-4 rounded-md shadow-md'>
      <div className="flex justify-between items-center mb-4">
        <h1 className="bg-gray-400 text-center text-black rounded-md font-semibold py-2 px-4 flex-grow">
          {editingPostId ? 'Edit Post' : 'Add Latest Post'}
        </h1>
        <button
          type="button"
          onClick={() => setIsFormVisible(false)}
          className="text-red-500 bg-gray-400 p-2 hover:bg-gray-600 rounded font-semibold ml-4"
        >
          X
        </button>
      </div>
      <div className="mt-4">
        <label htmlFor="postTitle" className="block text-sm font-medium text-gray-700 mb-1">
          Post Title
        </label>
        <input
          type="text"
          id="postTitle"
          placeholder="Post Title"
          value={postTitle}
          onChange={(e) => setPostTitle(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="postSlug" className="block text-sm font-medium text-gray-700 mb-1">
          Post Slug
        </label>
        <input
          type="text"
          id="postSlug"
          placeholder="Post Slug"
          value={postSlug}
          onChange={(e) => setPostSlug(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <h1 className="text-xl font-semibold mb-2">Content Editor</h1>
      <FroalaEditor model={content} onModelChange={handleModelChange}
        config={{
          placeholderText: 'Edit Your Content Here!',
          toolbarButtons: [
            'bold', 'italic', 'underline', 'strikeThrough', '|',
            'alignLeft', 'alignCenter', 'alignRight', 'alignJustify', '|',
            'formatOL', 'formatUL', '|',
            'insertImage', 'insertFile', 'insertVideo', 'insertTable', '|',
            'undo', 'redo', 'html'
          ],
          imageUploadURL: 'http://localhost:3002/api/upload-file',
          fileUploadURL: 'http://localhost:3002/api/upload-file',
          imageAllowedTypes: ['jpeg', 'jpg', 'png', 'gif'],
          fileAllowedTypes: ['*'],
          imageMaxSize: 5 * 1024 * 1024,
          fileMaxSize: 5 * 1024 * 1024,
          imageUploadParams: {
            folder: 'LatestPost',
          },
          fileUploadParams: {
            folder: 'LatestPost',
          },
          imageUploadMethod: 'POST',
          fileUploadMethod: 'POST',
          imageUploadToS3: false,
          fileUploadToS3: false,
        }} />
      <div className="flex justify-center gap-3 mt-4">
        <button type="button" onClick={() => setIsFormVisible(false)} className="bg-red-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-red-600 transition duration-200">
          Cancel
        </button>
        <button type="submit" className="bg-blue-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-600 transition duration-200">
          {editingPostId ? 'Update Post' : 'Submit'}
        </button>
      </div>
    </form>
  )}

  {/* Latest Posts Section */}
  <div className="mt-8 p-4 rounded-md">
    <h2 className="text-xl font-semibold mb-4">Latest Posts</h2>
    {filteredPosts.length > 0 ? (
      <ul>
        {filteredPosts.map((post) => (
          <li key={post.post_id} className="mb-4 p-4 border border-gray-300 rounded-md shadow-sm">
            <div dangerouslySetInnerHTML={{ __html: post.post_content }} />
            <p className="text-sm text-gray-500">Created by: {post.created_by}</p>
            <p className="text-sm text-gray-500">Created on: {post.created_on ? new Date(post.created_on).toLocaleDateString() : 'N/A'}</p>
            <p className="text-sm text-gray-500">Modified by: {post.modify_by || 'N/A'}</p>
            <p className="text-sm text-gray-500">Modified on: {post.modify_on ? new Date(post.modify_on).toLocaleDateString() : 'N/A'}</p>
            <div className="mt-2 flex gap-2">
  <button
    onClick={canUpdate ? () => handleEditPost(post) : () => toast.error('Access Denied: You do not have permission to edit posts.')}
    className={`bg-blue-500 text-white font-semibold py-1 px-2 rounded-md hover:bg-blue-600 transition duration-200 ${!canUpdate ? 'opacity-50 cursor-not-allowed' : ''}`}
    disabled={!canUpdate}
  >
    Edit
  </button>
  <button
    onClick={canDelete ? () => openDeleteModal(post.post_id) : () => toast.error('Access Denied: You do not have permission to delete posts.')}
    className={`bg-red-500 text-white font-semibold py-1 px-2 rounded-md hover:bg-red-600 transition duration-200 mr-2 ${!canDelete ? 'opacity-50 cursor-not-allowed' : ''}`}
    disabled={!canDelete}
  >
    Delete
  </button>
  <label className="inline-flex items-center cursor-pointer ml-1">
  <input
    type="checkbox"
    checked={post.isVisible}
    onChange={canRead ? () => handleToggleVisibility(post.post_id) : () => toast.error('Access Denied: You do not have permission to update visibility.')}
    className="sr-only peer"
    disabled={!canRead} // Disable the checkbox if the user does not have permission
  />
  <div className={`relative w-10 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 ${!canRead ? 'opacity-50 cursor-not-allowed' : 'peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600'}`}>
    <div className={`absolute top-0 left-0 w-5 h-5 bg-white border border-gray-300 rounded-full transition-transform duration-200 ease-in-out ${post.isVisible ? 'translate-x-5' : ''}`}></div>
  </div>
  <span className={`ms-3 text-sm font-medium ${!canRead ? 'text-gray-400' : 'text-gray-900 dark:text-gray-300'}`}>
    Visible
  </span>
</label>
</div>
          </li>
        ))}
      </ul>
    ) : (
      <p>No posts found.</p>
    )}
  </div>
</div>
      

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 ml-60 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h1 className=' text-center text-2xl font-semibold text-red-600'> DELETE POST</h1>
            <h2 className="text-lg font-normal p-4">Are you sure you want to delete this post?</h2>
            <div className="mt-4 flex justify-end">
              <button onClick={closeDeleteModal} className="bg-gray-300 text-black px-4 py-2 rounded-md mr-2">
                Cancel
              </button>
              <button onClick={confirmDeletePost} className="bg-red-500 text-white px-4 py-2 rounded-md">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LatestPost;