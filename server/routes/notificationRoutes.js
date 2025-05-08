const express = require('express');
const multer = require('multer');
const cloudinary = require('../config/cloudinaryConfig');
const { sql, executeQuery } = require('../config/db'); // Your mssql wrapper

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// 1. GET All Notifications
router.get('/all-notification', async (req, res) => {
  try {
    const result = await executeQuery('SELECT * FROM Notification ORDER BY created_on DESC');
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('Fetch Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 2. POST Add Notification
router.post('/add-notification', upload.single('file'), async (req, res) => {
  try {
    const { notification_message, user_id, created_by, url } = req.body;
    const file = req.file;

    if ((url && file) || (!url && !file)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide either a URL or a file, not both!',
      });
    }

    let notification_url = null;
    let public_id = null;

    if (file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: 'auto', folder: 'notifications' },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        stream.end(file.buffer);
      });

      notification_url = uploadResult.secure_url;
      public_id = uploadResult.public_id;
    } else if (url) {
      notification_url = url;
    }

    const query = `
      INSERT INTO Notification (notification_message, notification_url, public_id, userId, created_by, created_on)
      VALUES (@message, @url, @publicId, @userId, @createdBy, GETDATE())
    `;

    await executeQuery(query, {
      message: { type: sql.NVarChar, value: notification_message },
      url: { type: sql.NVarChar, value: notification_url },
      publicId: { type: sql.NVarChar, value: public_id },
      userId: { type: sql.Int, value: parseInt(user_id) },
      createdBy: { type: sql.NVarChar, value: created_by },
    });

    res.status(201).json({ success: true, message: 'Notification added successfully!' });
  } catch (err) {
    console.error('Add Error:', err);
    res.status(500).json({ success: false, message: 'Error adding notification' });
  }
});

// 3. PUT Edit Notification
router.put('/edit/:id', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const { notification_message, url, modify_by } = req.body;
    const file = req.file;

    const existing = await executeQuery(
      `SELECT * FROM Notification WHERE notification_id = @id`,
      { id: { type: sql.Int, value: id } }
    );

    if (existing.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    let notification_url = url || existing.recordset[0].notification_url;
    let public_id = existing.recordset[0].public_id;

    if (file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: 'auto', folder: 'notifications' },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        stream.end(file.buffer);
      });

      notification_url = uploadResult.secure_url;
      public_id = uploadResult.public_id;

      if (existing.recordset[0].public_id) {
        await cloudinary.uploader.destroy(existing.recordset[0].public_id);
      }
    }

    const query = `
      UPDATE Notification
      SET notification_message = @message,
          notification_url = @url,
          public_id = @publicId,
          modify_by = @modifyBy,
          modify_on = GETDATE()
      WHERE notification_id = @id
    `;

    await executeQuery(query, {
      id: { type: sql.Int, value: parseInt(id) },
      message: { type: sql.NVarChar, value: notification_message },
      url: { type: sql.NVarChar, value: notification_url },
      publicId: { type: sql.NVarChar, value: public_id },
      modifyBy: { type: sql.NVarChar, value: modify_by },
    });

    res.status(200).json({ success: true, message: 'Notification updated' });
  } catch (err) {
    console.error('Edit Error:', err);
    res.status(500).json({ success: false, message: 'Error editing notification' });
  }
});

// 4. DELETE Notification
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await executeQuery(
      `SELECT * FROM Notification WHERE notification_id = @id`,
      { id: { type: sql.Int, value: id } }
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    const public_id = result.recordset[0].public_id;

    if (public_id) {
      await cloudinary.uploader.destroy(public_id);
    }

    await executeQuery(
      `DELETE FROM Notification WHERE notification_id = @id`,
      { id: { type: sql.Int, value: id } }
    );

    res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    console.error('Delete Error:', err);
    res.status(500).json({ success: false, message: 'Error deleting notification' });
  }
});

module.exports = router;
