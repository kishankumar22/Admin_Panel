const express = require('express');
const multer = require('multer');
const cloudinary = require('../config/cloudinaryConfig');
const { sql, executeQuery } = require('../config/db'); // Correct import path

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// 1. GET all banners
router.get('/banners', async (req, res, next) => {
  try {
    const result = await executeQuery('SELECT * FROM Banner ORDER BY bannerPosition ASC');
    res.status(200).json(result.recordset);
  } catch (err) {
    // Propagate the error to the error-handling middleware
    next(err);
  }
});

// 2. POST Upload Banner
router.post('/banner/upload', upload.single('file'), async (req, res, next) => {
  try {
    const { bannerName, created_by, bannerPosition } = req.body;
    const file = req.file;

    if (!file || !bannerName || !created_by || bannerPosition === undefined) {
      return res.status(400).json({ success: false, message: 'File, banner name, created_by, and banner position are required' });
    }

    const position = parseInt(bannerPosition);
    if (position < 1) {
      return res.status(400).json({ success: false, message: 'Banner position must be 1 or greater' });
    }

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'auto', folder: 'banners' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      stream.end(file.buffer);
    });

    const query = `
      INSERT INTO Banner (bannerName, bannerUrl, publicId, bannerPosition, created_by, created_on, IsVisible)
      OUTPUT INSERTED.*
      VALUES (@bannerName, @bannerUrl, @publicId, @bannerPosition, @createdBy, GETDATE(), 1)
    `;

    const result = await executeQuery(query, {
      bannerName: { type: sql.NVarChar, value: bannerName },
      bannerUrl: { type: sql.NVarChar, value: uploadResult.secure_url },
      publicId: { type: sql.NVarChar, value: uploadResult.public_id },
      bannerPosition: { type: sql.Int, value: position },
      createdBy: { type: sql.NVarChar, value: created_by },
    });

    res.status(201).json({ success: true, message: 'Banner uploaded successfully', banner: result.recordset[0] });
  } catch (err) {
    // Propagate the error to the error-handling middleware
    next(err);
  }
});

// 3. PUT Update Banner
router.put('/banner/update/:id', upload.single('file'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { bannerName, modify_by, bannerPosition } = req.body;
    const file = req.file;

    const existing = await executeQuery(
      `SELECT * FROM Banner WHERE id = @id`,
      { id: { type: sql.Int, value: parseInt(id) } }
    );

    if (existing.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    let bannerUrl = existing.recordset[0].bannerUrl;
    let publicId = existing.recordset[0].publicId;

    if (file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: 'auto', folder: 'banners' },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        stream.end(file.buffer);
      });

      bannerUrl = uploadResult.secure_url;
      publicId = uploadResult.public_id;

      if (existing.recordset[0].publicId) {
        await cloudinary.uploader.destroy(existing.recordset[0].publicId);
      }
    }

    const query = `
      UPDATE Banner
      SET bannerName = @bannerName,
          bannerUrl = @bannerUrl,
          publicId = @publicId,
          bannerPosition = @bannerPosition,
          modify_by = @modifyBy,
          modify_on = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `;

    const result = await executeQuery(query, {
      id: { type: sql.Int, value: parseInt(id) },
      bannerName: { type: sql.NVarChar, value: bannerName || existing.recordset[0].bannerName },
      bannerUrl: { type: sql.NVarChar, value: bannerUrl },
      publicId: { type: sql.NVarChar, value: publicId },
      bannerPosition: { type: sql.Int, value: bannerPosition ? parseInt(bannerPosition) : existing.recordset[0].bannerPosition },
      modifyBy: { type: sql.NVarChar, value: modify_by },
    });

    res.status(200).json({ success: true, message: 'Banner updated successfully', banner: result.recordset[0] });
  } catch (err) {
    // Propagate the error to the error-handling middleware
    next(err);
  }
});

// 4. DELETE Banner
router.delete('/banner/delete/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await executeQuery(
      `SELECT * FROM Banner WHERE id = @id`,
      { id: { type: sql.Int, value: parseInt(id) } }
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    const publicId = result.recordset[0].publicId;

    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    }

    await executeQuery(
      `DELETE FROM Banner WHERE id = @id`,
      { id: { type: sql.Int, value: parseInt(id) } }
    );

    res.status(200).json({ success: true, message: 'Banner deleted successfully' });
  } catch (err) {
    // Propagate the error to the error-handling middleware
    next(err);
  }
});

// 5. PUT Toggle Banner Visibility
router.put('/banner/toggle-visibility/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { modify_by } = req.body;

    const existing = await executeQuery(
      `SELECT * FROM Banner WHERE id = @id`,
      { id: { type: sql.Int, value: parseInt(id) } }
    );

    if (existing.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    const query = `
      UPDATE Banner
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

    res.status(200).json({ success: true, message: 'Banner visibility updated successfully', banner: result.recordset[0] });
  } catch (err) {
    // Propagate the error to the error-handling middleware
    next(err);
  }
});

module.exports = router;