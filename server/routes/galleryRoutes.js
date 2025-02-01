const express = require('express');
const multer = require('multer');
const uploadToCloudinary = require('../utils/cloudinaryUpload');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Configure Multer for in-memory file storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Fetch all galleries
router.get('/gallery', async (req, res) => {
  try {
    const galleries = await prisma.gallery.findMany({
      orderBy: {
        galleryPosition: 'asc',
      },
    });
    res.status(200).json(galleries);
  } catch (error) {
    console.error('Error fetching galleries:', error);
    res.status(500).json({ message: 'Error fetching galleries', error });
  }
});

// Upload gallery
router.post('/gallery/upload', upload.single('file'), async (req, res) => {
  try {
    const { galleryName, created_by, galleryPosition } = req.body;
    const file = req.file;

    if (!file || !galleryName || !created_by || galleryPosition === undefined) {
      return res.status(400).json({ message: 'File, gallery name, created_by, and gallery position are required.' });
    }

    if (parseInt(galleryPosition) < 1) {
      return res.status(400).json({ message: 'Gallery position must be 1 or greater.' });
    }

    const uploadResult = await uploadToCloudinary(file.buffer, 'galleries');

    const newGallery = await prisma.gallery.create({
      data: {
        galleryName,
        galleryUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        galleryPosition: parseInt(galleryPosition),
        created_by,
      },
    });

    res.status(201).json({ message: 'Gallery uploaded successfully!', gallery: newGallery });
  } catch (error) {
    console.error('Error uploading gallery:', error);
    res.status(500).json({ message: 'Error uploading gallery', error });
  }
});

// Update gallery
router.put('/gallery/update/:id', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const { galleryName, modify_by, galleryPosition } = req.body;
    const file = req.file;

    const existingGallery = await prisma.gallery.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingGallery) {
      return res.status(404).json({ message: 'Gallery not found.' });
    }

    let galleryUrl = existingGallery.galleryUrl;

    if (file) {
      const uploadResult = await uploadToCloudinary(file.buffer, 'galleries');
      galleryUrl = uploadResult.secure_url;
      await cloudinary.uploader.destroy(existingGallery.publicId);
    }

    const updateData = {
      ...(galleryName && { galleryName }),
      ...(galleryPosition && { galleryPosition: parseInt(galleryPosition) }),
      ...(file && { galleryUrl }),
      modify_by,
      modify_on: new Date(),
    };

    const updatedGallery = await prisma.gallery.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    res.status(200).json({ message: 'Gallery updated successfully!', gallery: updatedGallery });
  } catch (error) {
    console.error('Error updating gallery:', error);
    res.status(500).json({ message: 'Error updating gallery', error });
  }
});
router.delete('/gallery/delete/:id', async (req, res) => {
    try {
      const { id } = req.params;
      console.log('Deleting gallery with ID:', id); // Debugging
  
      const existingGallery = await prisma.gallery.findUnique({
        where: { id: parseInt(id) },
      });
  
      if (!existingGallery) {
        return res.status(404).json({ message: 'Gallery not found.' });
      }
  
      // Delete image from Cloudinary
      try {
        await cloudinary.uploader.destroy(existingGallery.publicId);
      } catch (cloudinaryError) {
        console.error('Error deleting image from Cloudinary:', cloudinaryError);
        // Optionally, proceed with deleting the database entry even if Cloudinary deletion fails
      }
  
      // Delete gallery from database
      await prisma.gallery.delete({
        where: { id: parseInt(id) },
      });
  
      res.status(200).json({ message: 'Gallery deleted successfully.' });
    } catch (error) {
      console.error('Error deleting gallery:', error);
      res.status(500).json({ message: 'Error deleting gallery.', error });
    }
  });

// Toggle gallery visibility
router.put('/gallery/toggle-visibility/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { modify_by } = req.body;

    const existingGallery = await prisma.gallery.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingGallery) {
      return res.status(404).json({ message: 'Gallery not found.' });
    }

    const updatedGallery = await prisma.gallery.update({
      where: { id: parseInt(id) },
      data: {
        IsVisible: !existingGallery.IsVisible,
        modify_by,
        modify_on: new Date(),
      },
    });

    res.status(200).json({ message: 'Gallery visibility updated successfully!', gallery: updatedGallery });
  } catch (error) {
    console.error('Error updating gallery visibility:', error);
    res.status(500).json({ message: 'Error updating gallery visibility', error });
  }
});

module.exports = router;