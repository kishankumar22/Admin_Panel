const express = require('express');
const multer = require('multer');
const cloudinary = require('../config/cloudinaryConfig'); // Cloudinary setup
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Add New Post
// router.post('/add-post', async (req, res) => {
//   try {
//     const { post_title, post_slug, post_content, created_by, isVisible } = req.body;

//     if (!post_title || !post_slug || !post_content || !created_by) {
//       return res.status(400).json({ message: 'Required fields are missing!' });
//     }

//     const post = await prisma.latestPost.create({
//       data: {
//         post_title,
//         post_slug,
//         post_content,
//         created_by,
//         created_on: new Date(),
//         isVisible: isVisible === 'true',
//       },
//     });

//     res.status(201).json({ success: true, data: post });
//   } catch (error) {
//     console.error('Error adding post:', error);
//     res.status(500).json({ message: 'Error adding post' });
//   }
// });
router.post('/add-post', async (req, res) => {
  try {
    const { post_title, post_content, created_by, isVisible, post_slug } = req.body;

    if (!post_title || !post_content || !created_by || !post_slug) {
      return res.status(400).json({ message: 'Required fields are missing!' });
    }
    const slugify = (post_slug) => {
      return post_slug
        .toLowerCase() // Convert to lowercase
        .trim() // Remove whitespace from both ends
        .replace(/[^a-z0-9 -]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-'); // Replace multiple hyphens with a single hyphen
    };
    // Convert the provided post_slug using the slugify function
    const converted_slug = slugify(post_slug);

    const post = await prisma.latestPost.create({
      data: {
        post_title,
        post_slug: converted_slug, // Use the converted slug
        post_content,
        created_by,
        created_on: new Date(),
        isVisible: isVisible === 'true',
      },
    });

    res.status(201).json({ success: true, data: post });
  } catch (error) {
    console.error('Error adding post:', error);
    res.status(500).json({ message: 'Error adding post' });
  }
});

// Upload File
router.post('/upload-file', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded.' });

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ resource_type: 'auto', folder: 'LatestPost' }, (error, result) => {
        if (error) return reject(error);
        resolve(result);
      });
      stream.end(file.buffer);
    });

    res.status(200).json({ link: uploadResult.secure_url });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Error uploading file' });
  }
});

// Fetch All Posts
router.get('/all-posts', async (req, res) => {
  try {
    const posts = await prisma.latestPost.findMany({ orderBy: { created_on: 'desc' } });
    res.status(200).json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ message: 'Error fetching posts' });
  }
});

// //fetch single slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params; // Get the post_slug from the request parameters
    const post = await prisma.latestPost.findUnique({
      where: { post_slug: slug }, // Ensure this matches your database schema
    });

    if (post) {
      res.status(200).json(post);
    } else {
      res.status(404).json({ message: 'Post not found' });
    }
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ message: 'Error fetching post' });
  }
});

// Edit Post
router.put('/edit/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { post_title, post_slug, post_content, modify_by, isVisible } = req.body;

    const existingPost = await prisma.latestPost.findUnique({ where: { post_id: parseInt(id) } });
    if (!existingPost) return res.status(404).json({ message: 'Post not found' });

    const updatedPost = await prisma.latestPost.update({
      where: { post_id: parseInt(id) },
      data: {
        post_title: post_title || existingPost.post_title,
        post_slug: post_slug || existingPost.post_slug,
        post_content: post_content || existingPost.post_content,
        modify_by,
        modify_on: new Date(),
        isVisible: isVisible === 'true',
      },
    });

    res.status(200).json({ success: true, data: updatedPost });
  } catch (error) {
    console.error('Error editing post:', error);
    res.status(500).json({ message: 'Error editing post' });
  }
});

// Toggle Post Visibility
router.put('/toggle-visibility/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { modify_by } = req.body;

    const existingPost = await prisma.latestPost.findUnique({ where: { post_id: parseInt(id) } });
    if (!existingPost) return res.status(404).json({ message: 'Post not found' });

    const updatedPost = await prisma.latestPost.update({
      where: { post_id: parseInt(id) },
      data: {
        isVisible: !existingPost.isVisible,
        modify_by,
        modify_on: new Date(),
      },
    });

    res.status(200).json({ message: 'Post visibility updated!', data: updatedPost });
  } catch (error) {
    console.error('Error updating visibility:', error);
    res.status(500).json({ message: 'Error updating visibility' });
  }
});

// Delete Post
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const post = await prisma.latestPost.findUnique({ where: { post_id: parseInt(id) } });
    if (!post) return res.status(404).json({ message: 'Post not found' });

    await prisma.latestPost.delete({ where: { post_id: parseInt(id) } });
    res.status(200).json({ success: true, message: 'Post deleted successfully!' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ message: 'Error deleting post' });
  }
});

module.exports = router;
