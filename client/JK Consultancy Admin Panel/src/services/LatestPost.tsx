import React, { useState, useEffect } from 'react';
import Breadcrumb from '../components/Breadcrumbs/Breadcrumb';
import FroalaEditor from 'react-froala-wysiwyg';
import 'froala-editor/css/froala_editor.pkgd.min.css';
import 'froala-editor/js/plugins.pkgd.min.js';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axiosInstance from '../config';

const LatestPost: React.FC = () => {
  const [content, setContent] = useState<string>('');
  const [postTitle, setPostTitle] = useState<string>('');
  const [postSlug, setPostSlug] = useState<string>('');
  const [isFormVisible, setIsFormVisible] = useState<boolean>(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const handleModelChange = (model: string) => {
    setContent(model);
  };
  // Fetch posts when the component mounts
  useEffect(() => {
    fetchPosts();
  }, []);

  const handleToggleVisibility = async (postId: number) => {
    try {
      await axiosInstance.put(`/post/toggle-visibility/${postId}`);
      toast.success('Post visibility updated successfully!');
      fetchPosts();
    } catch (error) {
      console.error('Error toggling visibility:', error);
      toast.error('Error toggling visibility');
    }
  };

  // Function to fetch posts
  const fetchPosts = async () => {
    try {
      const response = await axiosInstance.get('/all-posts');
      setPosts(response.data);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Error fetching posts');
    }
  };

  // Function to delete a post
  const handleDeletePost = async (postId: number) => {
    try {
      await axiosInstance.delete(`/delete/${postId}`);
      toast.success('Post deleted successfully!');
      fetchPosts(); // Refresh the posts after deletion
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Error deleting post');
    }
  };

  // Function to edit a post
  const handleEditPost = (post: any) => {
    setIsFormVisible(true); // Show the form
    setPostTitle(post.post_title); // Pre-fill the title
    setPostSlug(post.post_slug); // Pre-fill the slug
    setContent(post.post_content); // Pre-fill the content
    setEditingPostId(post.post_id); // Set the post_id being edited
  };

  // Function to handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingPostId) {
        // Update existing post
        await axiosInstance.put(`/edit/${editingPostId}`, {
          post_title: postTitle,
          post_slug: postSlug,
          post_content: content,
          modify_by: 'admin', // Replace with actual user
          isVisible: 'true', // Default visibility
        });
        toast.success('Post updated successfully!');
      } else {
        // Add new post
        await axiosInstance.post('/add-post', {
          post_title: postTitle,
          post_slug: postSlug,
          post_content: content,
          created_by: 'admin', // Replace with actual user
          isVisible: 'true', // Default visibility
        });
        toast.success('Post added successfully!');
      }

      setIsFormVisible(false);
      setPostTitle('');
      setPostSlug('');
      setContent('');
      setEditingPostId(null); // Reset editing state
      fetchPosts(); // Refresh the posts
    } catch (error) {
      console.error(error);
      toast.error('Error saving post');
    }
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
      <Breadcrumb pageName="Add Latest Post" />
      <div className="w-full p-4 bg-white rounded-lg shadow-md">
        {!isFormVisible && (
          <button
            onClick={() => setIsFormVisible(true)}
            className="bg-blue-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-green-600 transition duration-200"
          >
            Add Latest Post
          </button>
        )}

        {isFormVisible && (
          <form onSubmit={handleSubmit}>
            <h1 className="bg-gray-200 text-center text-black rounded-md font-semibold py-2 px-4">
              {editingPostId ? 'Edit Post' : 'Add Latest Post'}
            </h1>
            {/* Cancel Button */}
            <button
              onClick={() => setIsFormVisible(false)}
              className="bg-red-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-red-600 transition duration-200 mt-4"
            >
              Cancel
            </button>
            {/* Rest of the form */}
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
            <FroalaEditor
              model={content}
              onModelChange={handleModelChange}
              config={{
                placeholderText: 'Edit Your Content Here!',
                toolbarButtons: [
                  'bold', 'italic', 'underline', 'strikeThrough', '|',
                  'alignLeft', 'alignCenter', 'alignRight', 'alignJustify', '|',
                  'formatOL', 'formatUL', '|',
                  'insertImage', 'insertFile', 'insertVideo', 'insertTable', '|',
                  'undo', 'redo', 'html'
                ],
                // Configure file upload
                imageUploadURL: 'http://localhost:3000/api/upload-file', // Endpoint for image uploads
                fileUploadURL: 'http://localhost:3000/api/upload-file', // Endpoint for file uploads
                imageAllowedTypes: ['jpeg', 'jpg', 'png', 'gif'],
                fileAllowedTypes: ['*'],
                imageMaxSize: 5 * 1024 * 1024, // 5MB max size
                fileMaxSize: 5 * 1024 * 1024, // 5MB max size
                // Handle upload response
                imageUploadParams: {
                  folder: 'LatestPost', // Upload to 'LatestPost' folder in Cloudinary
                },
                fileUploadParams: {
                  folder: 'LatestPost', // Upload to 'LatestPost' folder in Cloudinary
                },
                // Handle upload errors
                imageUploadMethod: 'POST',
                fileUploadMethod: 'POST',
                imageUploadToS3: false, // Disable S3 upload (use custom endpoint)
                fileUploadToS3: false, // Disable S3 upload (use custom endpoint)
              }}
            />
            <button
              type="submit"
              className="w-full bg-blue-500 text-white font-semibold py-2 rounded-md hover:bg-blue-600 transition duration-200 mt-4"
            >
              {editingPostId ? 'Update Post' : 'Submit'}
            </button>
          </form>
        )}

        {/* Display Posts */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Latest Posts</h2>
          {posts.length > 0 ? (
            <ul>
              {posts.map((post) => (
                <li key={post.post_id} className="mb-4 p-4 border border-gray-300 rounded-md">
                  <h3 className="text-lg font-semibold">{post.post_title}</h3>
                  <p className="text-gray-700">{post.post_content}</p>
                  <p className="text-sm text-gray-500">Created by: {post.created_by}</p>
                  {/* Delete and Edit Buttons */}
                  <div className="mt-2">
                    <button
                      onClick={() => handleDeletePost(post.post_id)}
                      className="bg-red-500 text-white font-semibold py-1 px-2 rounded-md hover:bg-red-600 transition duration-200 mr-2"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => handleEditPost(post)}
                      className="bg-blue-500 text-white font-semibold py-1 px-2 rounded-md hover:bg-blue-600 transition duration-200"
                    >
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
          ) : (
            <p>No posts found.</p>
          )}
        </div>
      </div>
    </>
  );
};

export default LatestPost;