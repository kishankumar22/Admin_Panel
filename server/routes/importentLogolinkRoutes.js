const express = require('express');
const multer = require('multer');
const uploadToCloudinary = require('../utils/cloudinaryUpload');
const { PrismaClient } = require('@prisma/client');
const cloudinary = require('cloudinary').v2; // Ensure you have cloudinary configured

const router = express.Router();
const prisma = new PrismaClient();

// Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// 📌 Fetch all important links (Sorted by logoPosition)
router.get('/important-links/all', async (req, res) => {
  try {
    const links = await prisma.importantLinks.findMany({
      orderBy: { logoPosition: 'asc' },
    });
    res.status(200).json(links);
  } catch (error) {
    console.error('Error fetching links:', error);
    res.status(500).json({ message: 'Error fetching links', error });
  }
});

// 📌 Upload new important link
router.post('/important-links/upload', upload.single('file'), async (req, res) => {
  try {
    const { logoName, linksUrl, created_by, logoPosition } = req.body;
    const file = req.file;

    if (!file || !logoName || !linksUrl || !created_by || logoPosition === undefined) {
      return res.status(400).json({ message: 'File, logo name, links URL, created_by, and logo position are required.' });
    }

    if (parseInt(logoPosition) < 1) {
      return res.status(400).json({ message: 'Logo position must be 1 or greater.' });
    }

    const uploadResult = await uploadToCloudinary(file.buffer, 'important-links');

    const newLink = await prisma.importantLinks.create({
      data: {
        logoName,
        LOGOUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        linksUrl,
        logoPosition: parseInt(logoPosition),
        created_by,
      },
    });

    res.status(201).json({ message: 'Important link uploaded successfully!', link: newLink });
  } catch (error) {
    console.error('Error uploading link:', error);
    res.status(500).json({ message: 'Error uploading link', error });
  }
});

// 📌 Update important link
router.put('/important-links/update/:id', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const { logoName, linksUrl, modify_by, logoPosition } = req.body;
    const file = req.file;

    const existingLink = await prisma.importantLinks.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingLink) {
      return res.status(404).json({ message: 'Important link not found.' });
    }

    let LOGOUrl = existingLink.LOGOUrl;

    if (file) {
      const uploadResult = await uploadToCloudinary(file.buffer, 'important-links');
      LOGOUrl = uploadResult.secure_url;
      await cloudinary.uploader.destroy(existingLink.publicId);
    }

    const updateData = {
      ...(logoName && { logoName }),
      ...(linksUrl && { linksUrl }),
      ...(logoPosition && { logoPosition: parseInt(logoPosition) }),
      ...(file && { LOGOUrl }),
      modify_by,
      modify_on: new Date(),
    };

    const updatedLink = await prisma.importantLinks.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    res.status(200).json({ message: 'Important link updated successfully!', link: updatedLink });
  } catch (error) {
    console.error('Error updating link:', error);
    res.status(500).json({ message: 'Error updating link', error });
  }
});

// 📌 Delete important link
router.delete('/important-links/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existingLink = await prisma.importantLinks.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingLink) {
      return res.status(404).json({ message: 'Important link not found.' });
    }

    // Delete image from Cloudinary
    try {
      await cloudinary.uploader.destroy(existingLink.publicId);
    } catch (cloudinaryError) {
      console.error('Error deleting image from Cloudinary:', cloudinaryError);
    }

    // Delete from database
    await prisma.importantLinks.delete({
      where: { id: parseInt(id) },
    });

    res.status(200).json({ message: 'Important link deleted successfully.' });
  } catch (error) {
    console.error('Error deleting link:', error);
    res.status(500).json({ message: 'Error deleting link.', error });
  }
});

// 📌 Toggle visibility of important link
router.put('/important-links/toggle-visibility/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { modify_by } = req.body;

    const existingLink = await prisma.importantLinks.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingLink) {
      return res.status(404).json({ message: 'Important link not found.' });
    }

    const updatedLink = await prisma.importantLinks.update({
      where: { id: parseInt(id) },
      data: {
        IsVisible: !existingLink.IsVisible,
        modify_by,
        modify_on: new Date(),
      },
    });

    res.status(200).json({ message: 'Link visibility updated successfully!', link: updatedLink });
  } catch (error) {
    console.error('Error updating link visibility:', error);
    res.status(500).json({ message: 'Error updating link visibility', error });
  }
});

module.exports = router;