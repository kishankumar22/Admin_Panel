const express = require('express');
const multer = require('multer');
const cloudinary = require('../config/cloudinaryConfig'); // Cloudinary setup
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// Multer setup to handle file uploads
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /notifications/add-notification
 * Adds a new notification (either URL or File)
 */
router.post('/add-notification', upload.single('file'), async (req, res) => {
  try {
    const { notification_message, user_id, created_by, url } = req.body;
    const file = req.file; // File uploaded from the frontend

    // Ensure only one of URL or file is provided
    if ((url && file) || (!url && !file)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide either a URL or a file, not both!',
      });
    }

    // Initialize `notification_url`
    let notification_url = null;

    // If the user provided a file, upload it to Cloudinary
    if (file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: 'auto', folder: 'notifications' },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              return reject(error);
            }
            resolve(result);
          }
        );
        stream.end(file.buffer);
      });

      // Log the upload result
      console.log('Upload result:', uploadResult);

      if (uploadResult && uploadResult.secure_url) {
        notification_url = uploadResult.secure_url; // Get the file's URL from Cloudinary
      } else {
        return res.status(500).json({
          success: false,
          message: 'File upload failed, no URL returned.',
        });
      }
    }

    // If the user provided a URL, use it directly
    if (url) {
      notification_url = url;
    }

    // Save the notification in the database
    const notification = await prisma.notification.create({
      data: {
        notification_message,
        notification_url,
        userId: parseInt(user_id),
        created_by,
      },
    });

    res.status(201).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error('Error adding notification:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while adding the notification.',
    });
  }
});

// Get all notifications
/**
 * GET /notifications/all-notification
 * Fetch all notifications from the database
 */
router.get('/all-notification', async (req, res) => {
  try {
    // Fetch all notifications, ordered by creation date (most recent first)
    const notifications = await prisma.notification.findMany({
      orderBy: {
        created_on: 'desc', // Sort by the most recent notifications
      },
    });

    // Send the notifications back to the frontend
    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching notifications.',
    });
  }
});

// edit 
/**
 * PUT /notifications/edit/:id
 * Edit an existing notification by ID
 */
router.put('/edit/:id', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const { notification_message, url } = req.body;
    const file = req.file; // File uploaded from the frontend

    // Initialize `notification_url`
    let notification_url = null;

    // If the user provided a file, upload it to Cloudinary
    if (file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: 'auto', folder: 'notifications' },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              return reject(error);
            }
            resolve(result);
          }
        );
        stream.end(file.buffer);
      });

      // Get the file's URL from Cloudinary
      if (uploadResult && uploadResult.secure_url) {
        notification_url = uploadResult.secure_url;
      } else {
        return res.status(500).json({
          success: false,
          message: 'File upload failed, no URL returned.',
        });
      }
    }

    // If the user provided a URL, use it directly
    if (url) {
      notification_url = url;
    }

    // Update the notification in the database
    const updatedNotification = await prisma.notification.update({
      where: { notification_id: parseInt(id) },
      data: {
        notification_message,
        notification_url,
      },
    });

    res.status(200).json({
      success: true,
      data: updatedNotification,
    });
  } catch (error) {
    console.error('Error editing notification:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while editing the notification.',
    });
  }
});

//delete  notification

/**
 * DELETE /notifications/delete/:id
 * Delete a notification by ID
 */
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Delete the notification from the database
    await prisma.notification.delete({
      where: { notification_id: parseInt(id) },
    });
    
    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully!',
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while deleting the notification.',
    });
  }
});



module.exports = router;