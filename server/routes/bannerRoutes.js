const express = require('express');
const multer = require('multer');
const cloudinary = require('../config/cloudinaryConfig');
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
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { bannerName, created_by, bannerPosition } = req.body;
    const file = req.file;

    if (!file || !bannerName || !created_by || bannerPosition === undefined) {
      return res.status(400).json({ message: 'File, banner name, created_by, and banner position are required.' });
    }

    // Validate bannerPosition >= 1
    if (parseInt(bannerPosition) < 1) {
      return res.status(400).json({ message: 'Banner position must be 1 or greater.' });
    }

    // Check if bannerPosition is already used
    const existingBanner = await prisma.banner.findFirst({
      where: { bannerPosition: parseInt(bannerPosition) },
    });

    if (existingBanner) {
      return res.status(400).json({ message: `Banner position ${bannerPosition} is already in use. Please delete the existing banner before adding a new one.` });
    }

    // Upload file to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'banners' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      stream.end(file.buffer);
    });

    // Save banner to database
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
router.put('/update/:id', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const { bannerName, modify_by, bannerPosition } = req.body;
    const file = req.file;

    // Fetch the existing banner
    const existingBanner = await prisma.banner.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingBanner) {
      return res.status(404).json({ message: 'Banner not found.' });
    }

    // Validate bannerPosition >= 1
    if (bannerPosition && parseInt(bannerPosition) < 1) {
      return res.status(400).json({ message: 'Banner position must be 1 or greater.' });
    }

    // Check if bannerPosition is already used by another banner
    if (bannerPosition && parseInt(bannerPosition) !== existingBanner.bannerPosition) {
      const positionInUse = await prisma.banner.findFirst({
        where: { bannerPosition: parseInt(bannerPosition) },
      });

      if (positionInUse) {
        return res.status(400).json({
          message: `Banner position ${bannerPosition} is already in use. Please delete the existing banner before assigning this position.`,
        });
      }
    }

    let bannerUrl = existingBanner.bannerUrl;

    // If a new file is uploaded, upload it to Cloudinary
    if (file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'banners' },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        stream.end(file.buffer);
      });

      bannerUrl = uploadResult.secure_url;

      // Delete the old file from Cloudinary
      await cloudinary.uploader.destroy(existingBanner.publicId);
    }

    // Update the banner in the database
    const updatedBanner = await prisma.banner.update({
      where: { id: parseInt(id) },
      data: {
        bannerName: bannerName || existingBanner.bannerName,
        bannerUrl,
        bannerPosition: bannerPosition
          ? parseInt(bannerPosition)
          : existingBanner.bannerPosition,
        modify_by,
        modify_on: new Date(), // Explicitly update modify_on
      },
    });

    res.status(200).json({ message: 'Banner updated successfully!', banner: updatedBanner });
  } catch (error) {
    console.error('Error updating banner:', error);
    res.status(500).json({ message: 'Error updating banner', error });
  }
});

// Delete banner
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existingBanner = await prisma.banner.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingBanner) {
      return res.status(404).json({ message: 'Banner not found.' });
    }

    await cloudinary.uploader.destroy(existingBanner.publicId);

    await prisma.banner.delete({
      where: { id: parseInt(id) },
    });

    res.status(200).json({ message: 'Banner deleted successfully.' });
  } catch (error) {
    console.error('Error deleting banner:', error);
    res.status(500).json({ message: 'Error deleting banner.', error });
  }
});

// Swap banner positions
router.post('/swap/:oldId/:newId', async (req, res) => {
  const { oldId, newId } = req.params;

  try {
    const oldBanner = await prisma.banner.findUnique({ where: { id: parseInt(oldId) } });
    const newBanner = await prisma.banner.findUnique({ where: { id: parseInt(newId) } });

    if (!oldBanner || !newBanner) {
      return res.status(404).json({ message: 'One or both banners not found.' });
    }

    // Swap positions
    const oldPosition = oldBanner.bannerPosition;
    const newPosition = newBanner.bannerPosition;

    await prisma.banner.update({
      where: { id: parseInt(oldId) },
      data: { bannerPosition: newPosition },
    });

    await prisma.banner.update({
      where: { id: parseInt(newId) },
      data: { bannerPosition: oldPosition },
    });

    res.status(200).json({ message: 'Banner positions swapped successfully.' });
  } catch (error) {
    console.error('Error swapping banner positions:', error);
    res.status(500).json({ message: 'Error swapping banner positions.', error });
  }
});

module.exports = router;