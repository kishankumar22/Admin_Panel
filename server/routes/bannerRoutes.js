const express = require('express');
const multer = require('multer');
const uploadToCloudinary = require('../utils/cloudinaryUpload');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Configure Multer for in-memory file storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Fetch all banners
router.get('/banners', async (req, res) => {
  try {
    const banners = await prisma.banner.findMany({
      orderBy: {
        bannerPosition: 'asc',
      },
    });
    res.status(200).json(banners);
  } catch (error) {
    console.error('Error fetching banners:', error);
    res.status(500).json({ message: 'Error fetching banners', error });
  }
});

// Upload banner
router.post('/banner/upload', upload.single('file'), async (req, res) => {
  try {
    const { bannerName, created_by, bannerPosition } = req.body;
    const file = req.file;

    if (!file || !bannerName || !created_by || bannerPosition === undefined) {
      return res.status(400).json({ message: 'File, banner name, created_by, and banner position are required.' });
    }

    if (parseInt(bannerPosition) < 1) {
      return res.status(400).json({ message: 'Banner position must be 1 or greater.' });
    }

    const uploadResult = await uploadToCloudinary(file.buffer, 'banners');

    const newBanner = await prisma.banner.create({
      data: {
        bannerName,
        bannerUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        bannerPosition: parseInt(bannerPosition),
        created_by,
      },
    });

    res.status(201).json({ message: 'Banner uploaded successfully!', banner: newBanner });
  } catch (error) {
    console.error('Error uploading banner:', error);
    res.status(500).json({ message: 'Error uploading banner', error });
  }
});

// Update banner
router.put('/banner/update/:id', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const { bannerName, modify_by, bannerPosition } = req.body;
    const file = req.file;

    const existingBanner = await prisma.banner.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingBanner) {
      return res.status(404).json({ message: 'Banner not found.' });
    }

    let bannerUrl = existingBanner.bannerUrl;

    if (file) {
      const uploadResult = await uploadToCloudinary(file.buffer, 'banners');
      bannerUrl = uploadResult.secure_url;
      await cloudinary.uploader.destroy(existingBanner.publicId);
    }

    const updateData = {
      ...(bannerName && { bannerName }),
      ...(bannerPosition && { bannerPosition: parseInt(bannerPosition) }),
      ...(file && { bannerUrl }),
      modify_by,
      modify_on: new Date(),
    };

    const updatedBanner = await prisma.banner.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    res.status(200).json({ message: 'Banner updated successfully!', banner: updatedBanner });
  } catch (error) {
    console.error('Error updating banner:', error);
    res.status(500).json({ message: 'Error updating banner', error });
  }
});

router.delete('/banner/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Deleting banner with ID:', id); // Debugging

    const existingBanner = await prisma.banner.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingBanner) {
      return res.status(404).json({ message: 'Banner not found.' });
    }

    // Delete image from Cloudinary
    try {
      await cloudinary.uploader.destroy(existingBanner.publicId);
    } catch (cloudinaryError) {
      console.error('Error deleting image from Cloudinary:', cloudinaryError);
      // Optionally, proceed with deleting the database entry even if Cloudinary deletion fails
    }

    // Delete banner from database
    await prisma.banner.delete({
      where: { id: parseInt(id) },
    });

    res.status(200).json({ message: 'Banner deleted successfully.' });
  } catch (error) {
    console.error('Error deleting banner:', error);
    res.status(500).json({ message: 'Error deleting banner.', error });
  }
});

// Toggle banner visibility
router.put('/banner/toggle-visibility/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { modify_by } = req.body;

    const existingBanner = await prisma.banner.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingBanner) {
      return res.status(404).json({ message: 'Banner not found.' });
    }

    const updatedBanner = await prisma.banner.update({
      where: { id: parseInt(id) },
      data: {
        IsVisible: !existingBanner.IsVisible,
        modify_by,
        modify_on: new Date(),
      },
    });

    res.status(200).json({ message: 'Banner visibility updated successfully!', banner: updatedBanner });
  } catch (error) {
    console.error('Error updating banner visibility:', error);
    res.status(500).json({ message: 'Error updating banner visibility', error });
  }
});

module.exports = router;