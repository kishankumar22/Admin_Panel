const express = require('express');
const multer = require('multer');
const cloudinary = require('../config/cloudinaryConfig');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prismaClient = new PrismaClient();

// Configure Multer to store files in memory instead of the file system
const storage = multer.memoryStorage(); // Store file in memory
const upload = multer({ storage }); // Use memory storage in Multer

// Route to upload file and save banner details to database
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { bannerName, created_by } = req.body; // Extract banner name and created_by from request body
    const file = req.file; // Get the file object from Multer

    if (!file || !bannerName || !created_by) {
      return res.status(400).json({ message: 'File, banner name, and created_by are required' });
    }

    // Upload file to Cloudinary directly from memory
    const uploadResult = await cloudinary.uploader.upload_stream(
      { folder: 'banners' }, // Cloudinary folder name
      async (error, result) => {
        if (error) {
          console.error('Cloudinary Upload Error:', error);
          return res.status(500).json({ message: 'Error uploading file to Cloudinary', error });
        }

        // Save banner details to the database
        const newBanner = await prismaClient.banner.create({
          data: {
            bannerName, // Use the banner name from the request
            bannerUrl: result.secure_url, // Save the Cloudinary URL in the database
            created_by, // Save the created_by field in the database
          },
        });

        // Send success response
        res.status(201).json({
          message: 'Banner uploaded and saved successfully',
          banner: newBanner,
        });
      }
    );

    // Write the file buffer to the Cloudinary uploader stream
    uploadResult.end(file.buffer); // Pass the in-memory file buffer to Cloudinary
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error uploading banner', error });
  }
});

// Route to fetch all banners
router.get('/banners', async (req, res) => {
  try {
    const banners = await prismaClient.banner.findMany();
    res.status(200).json(banners);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching banners', error });
  }
});


// Route to update a banner
router.put('/update/:id', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params; // Get the banner ID from the route parameters
    const { bannerName } = req.body; // Extract bannerName from the request body
    const file = req.file; // Get the file (if provided)

    // Check if the banner exists
    const existingBanner = await prismaClient.banner.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingBanner) {
      return res.status(404).json({ message: 'Banner not found' });
    }

    let bannerUrl = existingBanner.bannerUrl;

    // If a new file is provided, upload it to Cloudinary
    if (file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'banners' },
          (error, result) => {
            if (error) {
              console.error('Cloudinary Upload Error:', error);
              return reject(error);
            }
            resolve(result);
          }
        );
        stream.end(file.buffer);
      });

      bannerUrl = uploadResult.secure_url; // Use the new URL from Cloudinary
    }

    // Update the banner in the database
    const updatedBanner = await prismaClient.banner.update({
      where: { id: parseInt(id) },
      data: {
        bannerName: bannerName || existingBanner.bannerName, // Update bannerName if provided
        bannerUrl, // Use the new or existing bannerUrl
      },
    });

    res.status(200).json({
      message: 'Banner updated successfully',
      banner: updatedBanner,
    });
  } catch (error) {
    console.error('Error updating bannerc:', error);
    res.status(500).json({ message: 'Error updating banner', error });
  }
});

// Route to delete a banner
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params; // Get the banner ID from the route parameters

    // Check if the banner exists
    const existingBanner = await prismaClient.banner.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingBanner) {
      return res.status(404).json({ message: 'Banner not found' });
    }

    // Delete the banner from the database
    await prismaClient.banner.delete({
      where: { id: parseInt(id) },
    });

    res.status(200).json({ message: 'Banner deleted successfully' });
  } catch (error) {
    console.error('Error deleting banner:', error);
    res.status(500).json({ message: 'Error deleting banner', error });
  }
});



module.exports = router;
