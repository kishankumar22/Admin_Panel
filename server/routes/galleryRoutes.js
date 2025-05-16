const express = require('express');
const multer = require('multer');
const cloudinary = require('../config/cloudinaryConfig');
const { sql, executeQuery } = require('../config/db');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// 1. GET All Galleries
router.get('/gallery', async (req, res, next) => {
  try {
    const result = await executeQuery('SELECT * FROM Gallery ORDER BY galleryPosition ASC');
    res.status(200).json(result.recordset);
  } catch (err) {
    // console.error('Fetch Error:', err);
        next(err);
    res.status(500).json({ success: false, message: 'Error fetching galleries' });
  }
});

// 2. POST Upload Gallery
router.post('/gallery/upload', upload.single('file'), async (req, res, next) => {
  try {
    const { galleryName, created_by, galleryPosition } = req.body;
    const file = req.file;

    if (!file || !galleryName || !created_by || galleryPosition === undefined) {
      return res.status(400).json({ success: false, message: 'File, gallery name, created_by, and gallery position are required' });
    }

    const position = parseInt(galleryPosition);
    if (position < 1) {
      return res.status(400).json({ success: false, message: 'Gallery position must be 1 or greater' });
    }

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'auto', folder: 'galleries' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      stream.end(file.buffer);
    });

    const query = `
      INSERT INTO Gallery (galleryName, galleryUrl, publicId, galleryPosition, created_by, created_on, IsVisible)
      OUTPUT INSERTED.*
      VALUES (@galleryName, @galleryUrl, @publicId, @galleryPosition, @createdBy, GETDATE(), 1)
    `;

    const result = await executeQuery(query, {
      galleryName: { type: sql.NVarChar, value: galleryName },
      galleryUrl: { type: sql.NVarChar, value: uploadResult.secure_url },
      publicId: { type: sql.NVarChar, value: uploadResult.public_id },
      galleryPosition: { type: sql.Int, value: position },
      createdBy: { type: sql.NVarChar, value: created_by },
    });

    res.status(201).json({ success: true, message: 'Gallery uploaded successfully', gallery: result.recordset[0] });
  } catch (err) {
    // console.error('Upload Error:', err);
        next(err);
    res.status(500).json({ success: false, message: 'Error uploading gallery' });
  }
});

// 3. PUT Update Gallery
router.put('/gallery/update/:id', upload.single('file'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { galleryName, modify_by, galleryPosition } = req.body;
    const file = req.file;

    const existing = await executeQuery(
      `SELECT * FROM Gallery WHERE id = @id`,
      { id: { type: sql.Int, value: parseInt(id) } }
    );

    if (existing.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Gallery not found' });
    }

    let galleryUrl = existing.recordset[0].galleryUrl;
    let publicId = existing.recordset[0].publicId;

    if (file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: 'auto', folder: 'galleries' },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        stream.end(file.buffer);
      });

      galleryUrl = uploadResult.secure_url;
      publicId = uploadResult.public_id;

      if (existing.recordset[0].publicId) {
        await cloudinary.uploader.destroy(existing.recordset[0].publicId);
      }
    }

    const query = `
      UPDATE Gallery
      SET galleryName = @galleryName,
          galleryUrl = @galleryUrl,
          publicId = @publicId,
          galleryPosition = @galleryPosition,
          modify_by = @modifyBy,
          modify_on = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `;

    const result = await executeQuery(query, {
      id: { type: sql.Int, value: parseInt(id) },
      galleryName: { type: sql.NVarChar, value: galleryName || existing.recordset[0].galleryName },
      galleryUrl: { type: sql.NVarChar, value: galleryUrl },
      publicId: { type: sql.NVarChar, value: publicId },
      galleryPosition: { type: sql.Int, value: galleryPosition ? parseInt(galleryPosition) : existing.recordset[0].galleryPosition },
      modifyBy: { type: sql.NVarChar, value: modify_by },
    });

    res.status(200).json({ success: true, message: 'Gallery updated successfully', gallery: result.recordset[0] });
  } catch (err) {
    // console.error('Update Error:', err);
        next(err);
    res.status(500).json({ success: false, message: 'Error updating gallery' });
  }
});

// 4. DELETE Gallery
router.delete('/gallery/delete/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await executeQuery(
      `SELECT * FROM Gallery WHERE id = @id`,
      { id: { type: sql.Int, value: parseInt(id) } }
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Gallery not found' });
    }

    const publicId = result.recordset[0].publicId;

    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (cloudinaryErr) {
        console.error('Cloudinary Delete Error:', cloudinaryErr);
      }
    }

    await executeQuery(
      `DELETE FROM Gallery WHERE id = @id`,
      { id: { type: sql.Int, value: parseInt(id) } }
    );

    res.status(200).json({ success: true, message: 'Gallery deleted successfully' });
  } catch (err) {
    // console.error('Delete Error:', err);
        next(err);
    res.status(500).json({ success: false, message: 'Error deleting gallery' });
  }
});

// 5. PUT Toggle Gallery Visibility
router.put('/gallery/toggle-visibility/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { modify_by } = req.body;

    const existing = await executeQuery(
      `SELECT * FROM Gallery WHERE id = @id`,
      { id: { type: sql.Int, value: parseInt(id) } }
    );

    if (existing.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Gallery not found' });
    }

    const query = `
      UPDATE Gallery
      SET IsVisible = @isVisible,
          modify_by = @modifyBy,
          modify_on = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `;

    const result = await executeQuery(query, {
      id: { type: sql.Int, value: parseInt(id) },
      isVisible: { type: sql.Bit, value: !existing.recordset[0].IsVisible },
      modifyBy: { type: sql.NVarChar, value: modify_by },
    });

    res.status(200).json({ success: true, message: 'Gallery visibility updated successfully', gallery: result.recordset[0] });
  } catch (err) {
    // console.error('Toggle Visibility Error:', err);
        next(err);
    res.status(500).json({ success: false, message: 'Error updating gallery visibility' });
  }
});

module.exports = router;