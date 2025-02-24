import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext'; 
import Breadcrumb from '../components/Breadcrumbs/Breadcrumb';
import FroalaEditor from 'react-froala-wysiwyg';
import 'froala-editor/css/froala_editor.pkgd.min.css';
import 'froala-editor/js/plugins.pkgd.min.js';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axiosInstance from '../config';

const LatestPost: React.FC = () => {
  const { user } = useAuth();
  const createdBy = user?.name || 'admin'; 
  const modify_by = user?.name; 


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

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
      <Breadcrumb pageName="Add Latest Post" />
      <div className="w-full p-4 bg-white rounded-lg shadow-md dark:bg-gray-700">
        {!isFormVisible && (
          <button
            onClick={() => setIsFormVisible(true)}
            className="bg-blue-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-green-600 transition duration-200"
          >
            Add Latest Post
          </button>
        )}

        {isFormVisible && (
          <form ref={formRef} onSubmit={handleSubmit}>
            <div className="flex justify-end items-center">
              <h1 className="bg-gray-200 text-center text-black rounded-md font-semibold py-2 px-4 flex-grow">
                {editingPostId ? 'Edit Post' : 'Add Latest Post'}
              </h1>
              <button
                type="button"
                onClick={() => setIsFormVisible(false)}
                className="text-red-500 bg-gray-200 p-2 hover:bg-gray-600 rounded font-semibold ml-4"
              >
                X
              </button>
            </div>
            <div className="mb-2">
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
            <FroalaEditor model={content} onModelChange={handleModelChange} />
            <div className="flex justify-center gap-3 mt-4">
              <button type="button" onClick={() => setIsFormVisible(false)} className="bg-red-500 text-white font-semibold py-2 px-4 rounded-md hover:bg -red-600 transition duration-200">
                Cancel
              </button>
              <button type="submit" className="bg-blue-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-600 transition duration-200">
                {editingPostId ? 'Update Post' : 'Submit'}
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 ">
          <h2 className="text-xl font-semibold mb-4">Latest Posts</h2>
          {posts.length > 0 ? (
            <ul>
              {posts.map((post) => (
                <li key={post.post_id} className="mb-4 p-4 border border-gray-300 rounded-md">
                  <div dangerouslySetInnerHTML={{ __html: post.post_content }} />
                  <p className="text-sm text-gray-500">Created by: {post.created_by}</p>
<p className="text-sm text-gray-500">Created on: {post.created_on ? new Date(post.created_on).toLocaleDateString() : 'N/A'}</p>
<p className="text-sm text-gray-500">Modified by: {post.modify_by || 'N/A'}</p>
<p className="text-sm text-gray-500">Modified on: {post.modify_on ? new Date(post.modify_on).toLocaleDateString() : 'N/A'}</p>
                  <div className="mt-2">
                    <button onClick={() => openDeleteModal(post.post_id)} className="bg-red-500 text-white font-semibold py-1 px-2 rounded-md hover:bg-red-600 transition duration-200 mr-2">
                      Delete
                    </button>
                    <button onClick={() => handleEditPost(post)} className="bg-blue-500 text-white font-semibold py-1 px-2 rounded-md hover:bg-blue-600 transition duration-200">
                      Edit
                    </button>
                    <label className="inline-flex items-center cursor-pointer ml-4">
                      <input
                        type="checkbox"
                        checked={post.isVisible}
                        onChange={() => handleToggleVisibility(post.post_id)}
                        className="sr-only peer"
                      />
                      <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600"></div>
                      <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                        Visible
                      </span>
                    </label>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p>No posts found.</p>}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-lg font-semibold">Are you sure you want to delete this post?</h2>
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