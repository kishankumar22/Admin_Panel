const express = require('express');
const multer = require('multer');
const cloudinary = require('../config/cloudinaryConfig');
const { sql, executeQuery } = require('../config/db');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// 1. GET All Important Links
router.get('/important-links/all', async (req, res) => {
  try {
    const result = await executeQuery('SELECT * FROM ImportantLinks ORDER BY logoPosition ASC');
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('Fetch Error:', err);
    res.status(500).json({ success: false, message: 'Error fetching links' });
  }
});

// 2. POST Upload Important Link
router.post('/important-links/upload', upload.single('file'), async (req, res) => {
  try {
    const { logoName, linksUrl, created_by, logoPosition } = req.body;
    const file = req.file;

    if (!file || !logoName || !linksUrl || !created_by || logoPosition === undefined) {
      return res.status(400).json({ success: false, message: 'File, logo name, links URL, created_by, and logo position are required' });
    }

    const position = parseInt(logoPosition);
    if (position < 1) {
      return res.status(400).json({ success: false, message: 'Logo position must be 1 or greater' });
    }

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'auto', folder: 'important-links' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      stream.end(file.buffer);
    });

    const query = `
      INSERT INTO ImportantLinks (logoName, LOGOUrl, publicId, linksUrl, logoPosition, created_by, created_on, IsVisible)
      OUTPUT INSERTED.*
      VALUES (@logoName, @logoUrl, @publicId, @linksUrl, @logoPosition, @createdBy, GETDATE(), 1)
    `;

    const result = await executeQuery(query, {
      logoName: { type: sql.NVarChar, value: logoName },
      logoUrl: { type: sql.NVarChar, value: uploadResult.secure_url },
      publicId: { type: sql.NVarChar, value: uploadResult.public_id },
      linksUrl: { type: sql.NVarChar, value: linksUrl },
      logoPosition: { type: sql.Int, value: position },
      createdBy: { type: sql.NVarChar, value: created_by },
    });

    console.log('Logo added:', result.recordset[0].logoName);
    res.status(201).json({ success: true, message: 'Important link uploaded successfully', link: result.recordset[0] });
  } catch (err) {
    console.error('Upload Error:', err);
    res.status(500).json({ success: false, message: 'Error uploading link' });
  }
});

// 3. PUT Update Important Link
router.put('/important-links/update/:id', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const { logoName, linksUrl, modify_by, logoPosition } = req.body;
    const file = req.file;

    const existing = await executeQuery(
      `SELECT * FROM ImportantLinks WHERE id = @id`,
      { id: { type: sql.Int, value: parseInt(id) } }
    );

    if (existing.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Important link not found' });
    }

    let logoUrl = existing.recordset[0].LOGOUrl;
    let publicId = existing.recordset[0].publicId;

    if (file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: 'auto', folder: 'important-links' },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        stream.end(file.buffer);
      });

      logoUrl = uploadResult.secure_url;
      publicId = uploadResult.public_id;

      if (existing.recordset[0].publicId) {
        await cloudinary.uploader.destroy(existing.recordset[0].publicId);
      }
    }

    const query = `
      UPDATE ImportantLinks
      SET logoName = @logoName,
          LOGOUrl = @logoUrl,
          publicId = @publicId,
          linksUrl = @linksUrl,
          logoPosition = @logoPosition,
          modify_by = @modifyBy,
          modify_on = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `;

    const result = await executeQuery(query, {
      id: { type: sql.Int, value: parseInt(id) },
      logoName: { type: sql.NVarChar, value: logoName || existing.recordset[0].logoName },
      logoUrl: { type: sql.NVarChar, value: logoUrl },
      publicId: { type: sql.NVarChar, value: publicId },
      linksUrl: { type: sql.NVarChar, value: linksUrl || existing.recordset[0].linksUrl },
      logoPosition: { type: sql.Int, value: logoPosition ? parseInt(logoPosition) : existing.recordset[0].logoPosition },
      modifyBy: { type: sql.NVarChar, value: modify_by },
    });

    console.log('Logo updated:', result.recordset[0].logoName);
    res.status(200).json({ success: true, message: 'Important link updated successfully', link: result.recordset[0] });
  } catch (err) {
    console.error('Update Error:', err);
    res.status(500).json({ success: false, message: 'Error updating link' });
  }
});

// 4. DELETE Important Link
router.delete('/important-links/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await executeQuery(
      `SELECT * FROM ImportantLinks WHERE id = @id`,
      { id: { type: sql.Int, value: parseInt(id) } }
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Important link not found' });
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
      `DELETE FROM ImportantLinks WHERE id = @id`,
      { id: { type: sql.Int, value: parseInt(id) } }
    );

    console.log('Logo deleted:', result.recordset[0].logoName);
    res.status(200).json({ success: true, message: 'Important link deleted successfully' });
  } catch (err) {
    console.error('Delete Error:', err);
    res.status(500).json({ success: false, message: 'Error deleting link' });
  }
});

// 5. PUT Toggle Important Link Visibility
router.put('/important-links/toggle-visibility/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { modify_by } = req.body;

    const existing = await executeQuery(
      `SELECT * FROM ImportantLinks WHERE id = @id`,
      { id: { type: sql.Int, value: parseInt(id) } }
    );

    if (existing.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Important link not found' });
    }

    const query = `
      UPDATE ImportantLinks
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

    console.log('Logo visibility toggled:', result.recordset[0].logoName);
    res.status(200).json({ success: true, message: 'Link visibility updated successfully', link: result.recordset[0] });
  } catch (err) {
    console.error('Toggle Visibility Error:', err);
    res.status(500).json({ success: false, message: 'Error updating link visibility' });
  }
});

module.exports = router;