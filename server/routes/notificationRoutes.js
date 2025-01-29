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
    const file = req.file;

    // Ensure only one of URL or file is provided
    if ((url && file) || (!url && !file)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide either a URL or a file, not both!',
      });
    }

    let notification_url = null;
    let public_id = null;

    // If the user provided a file, upload it to Cloudinary
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
        public_id, // Save Cloudinary public ID for file deletions
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

/**
 * GET /notifications/all-notification
 * Fetch all notifications
 */
router.get('/all-notification', async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: {
        created_on: 'desc',
      },
    });

    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching notifications.',
    });
  }
});

/**
 * PUT /notifications/edit/:id
 * Edit an existing notification
 */
router.put('/edit/:id', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const { notification_message, url, modify_by } = req.body;
    const file = req.file;

    let notification_url = null;
    let public_id = null;

    // Fetch the existing notification
    const existingNotification = await prisma.notification.findUnique({
      where: { notification_id: parseInt(id) },
    });

    if (!existingNotification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // If the user provided a file, upload it to Cloudinary
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

      // Delete the old file from Cloudinary if a new file is uploaded
      if (existingNotification.public_id) {
        await cloudinary.uploader.destroy(existingNotification.public_id);
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
        notification_url: notification_url || existingNotification.notification_url,
        public_id: public_id || existingNotification.public_id,
        modify_by,
        modify_on: new Date(),
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

/**
 * DELETE /notifications/delete/:id
 * Delete a notification
 */
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the existing notification
    const notification = await prisma.notification.findUnique({
      where: { notification_id: parseInt(id) },
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Delete the file from Cloudinary if it exists
    if (notification.public_id) {
      await cloudinary.uploader.destroy(notification.public_id);
    }

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
