const express = require('express');
const multer = require('multer');
const cloudinary = require('../config/cloudinaryConfig');
const { sql, executeQuery } = require('../config/db');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Slugify function
const slugify = (post_slug) => {
  return post_slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

// 1. POST Add Post
router.post('/add-post', async (req, res, next) => {
  try {
    const { post_title, post_content, created_by, isVisible, post_slug } = req.body;

    if (!post_title || !post_content || !created_by || !post_slug) {
      return res.status(400).json({ success: false, message: 'Required fields are missing' });
    }

    const converted_slug = slugify(post_slug);

    const query = `
      INSERT INTO LatestPost (post_title, post_slug, post_content, created_by, created_on, isVisible)
      OUTPUT INSERTED.*
      VALUES (@postTitle, @postSlug, @postContent, @createdBy, GETDATE(), @isVisible)
    `;

    const result = await executeQuery(query, {
      postTitle: { type: sql.NVarChar, value: post_title },
      postSlug: { type: sql.NVarChar, value: converted_slug },
      postContent: { type: sql.NVarChar, value: post_content },
      createdBy: { type: sql.NVarChar, value: created_by },
      isVisible: { type: sql.Bit, value: isVisible === 'true' },
    });

    console.log('Post added:', result.recordset[0].post_title);
    res.status(201).json({ success: true, message: 'Post added successfully', data: result.recordset[0] });
  } catch (err) {
    // console.error('Add Post Error:', err);
        next(err);
    res.status(500).json({ success: false, message: 'Error adding post', error: err.message });
  }
});

// 2. POST Upload File
router.post('/upload-file', upload.single('file'), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'auto', folder: 'LatestPost' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      stream.end(file.buffer);
    });

    console.log('File uploaded to Cloudinary:', uploadResult.secure_url);
    res.status(200).json({ success: true, message: 'File uploaded successfully', link: uploadResult.secure_url });
  } catch (err) {
    // console.error('Upload File Error:', err);
        next(err);
    res.status(500).json({ success: false, message: 'Error uploading file', error: err.message });
  }
});

// 3. GET All Posts
router.get('/all-posts', async (req, res, next) => {
  try {
    const result = await executeQuery('SELECT * FROM LatestPost ORDER BY created_on DESC');
    res.status(200).json(result.recordset);
  } catch (err) {
    // console.error('Fetch Posts Error:', err); 
     next(err);
    res.status(500).json({ success: false, message: 'Error fetching posts', error: err.message });
  }
});

// 4. GET Post by Slug
router.get('/post/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;

    const result = await executeQuery(
      `SELECT * FROM LatestPost WHERE post_slug = @postSlug`,
      { postSlug: { type: sql.NVarChar, value: slug } }
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    res.status(200).json(result.recordset[0]);
  } catch (err) {
    // console.error('Fetch Post Error:', err);
        next(err);
    res.status(500).json({ success: false, message: 'Error fetching post', error: err.message });
  }
});

// 5. PUT Edit Post
router.put('/edit/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { post_title, post_slug, post_content, modify_by, isVisible } = req.body;

    const existing = await executeQuery(
      `SELECT * FROM LatestPost WHERE post_id = @postId`,
      { postId: { type: sql.Int, value: parseInt(id) } }
    );

    if (existing.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const converted_slug = slugify(post_slug || existing.recordset[0].post_slug);

    const query = `
      UPDATE LatestPost
      SET 
        post_title = @postTitle,
        post_slug = @postSlug,
        post_content = @postContent,
        modify_by = @modifyBy,
        modify_on = GETDATE(),
        isVisible = @isVisible
      OUTPUT INSERTED.*
      WHERE post_id = @postId
    `;

    const result = await executeQuery(query, {
      postId: { type: sql.Int, value: parseInt(id) },
      postTitle: { type: sql.NVarChar, value: post_title || existing.recordset[0].post_title },
      postSlug: { type: sql.NVarChar, value: converted_slug },
      postContent: { type: sql.NVarChar, value: post_content || existing.recordset[0].post_content },
      modifyBy: { type: sql.NVarChar, value: modify_by },
      isVisible: { type: sql.Bit, value: isVisible !== undefined ? isVisible === 'true' : existing.recordset[0].isVisible },
    });

    console.log('Post updated:', result.recordset[0].post_title);
    res.status(200).json({ success: true, message: 'Post updated successfully', data: result.recordset[0] });
  } catch (err) {
    // console.error('Edit Post Error:', err);
        next(err);
    res.status(500).json({ success: false, message: 'Error editing post', error: err.message });
  }
});

// 6. PUT Toggle Post Visibility
router.put('/toggle-visibility/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { modify_by } = req.body;

    const existing = await executeQuery(
      `SELECT * FROM LatestPost WHERE post_id = @postId`,
      { postId: { type: sql.Int, value: parseInt(id) } }
    );

    if (existing.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const query = `
      UPDATE LatestPost
      SET 
        isVisible = @isVisible,
        modify_by = @modifyBy,
        modify_on = GETDATE()
      OUTPUT INSERTED.*
      WHERE post_id = @postId
    `;

    const result = await executeQuery(query, {
      postId: { type: sql.Int, value: parseInt(id) },
      isVisible: { type: sql.Bit, value: !existing.recordset[0].isVisible },
      modifyBy: { type: sql.NVarChar, value: modify_by },
    });

    console.log('Post visibility toggled:', result.recordset[0].post_title);
    res.status(200).json({ 
      success: true, 
      message: 'Post visibility updated successfully', 
      data: result.recordset[0] 
    });
  } catch (err) {
    // console.error('Toggle Visibility Error:', err);
        next(err);
    res.status(500).json({ success: false, message: 'Error updating visibility', error: err.message });
  }
});

// 7. DELETE Post
router.delete('/delete/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await executeQuery(
      `SELECT * FROM LatestPost WHERE post_id = @postId`,
      { postId: { type: sql.Int, value: parseInt(id) } }
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    await executeQuery(
      `DELETE FROM LatestPost WHERE post_id = @postId`,
      { postId: { type: sql.Int, value: parseInt(id) } }
    );

    console.log('Post deleted:', result.recordset[0].post_title);
    res.status(200).json({ success: true, message: 'Post deleted successfully' });
  } catch (err) {
    // console.error('Delete Post Error:', err);
        next(err);
    res.status(500).json({ success: false, message: 'Error deleting post', error: err.message });
  }
});

module.exports = router;