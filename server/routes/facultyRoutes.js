const express = require('express');
const multer = require('multer');
const uploadToCloudinary = require('../utils/cloudinaryUpload');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Configure Multer for in-memory file storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Fetch all faculties
router.get('/faculty', async (req, res) => {
  try {
    const faculties = await prisma.faculty.findMany({
      orderBy: {
        faculty_name: 'asc',
      },
    });
    res.status(200).json(faculties);
  } catch (error) {
    console.error('Error fetching faculties:', error);
    res.status(500).json({ message: 'Error fetching faculties', error });
  }
});

// Upload faculty profile picture and add faculty
// router.post('/faculty/add', upload.single('file'), async (req, res) => {
//   try {
//     const { faculty_name, qualification, designation, created_by } = req.body;
//     const file = req.file;

//     if (!file || !faculty_name || !qualification || !designation || !created_by) {
//       return res.status(400).json({ message: 'All fields are required.' });
//     }

//     const uploadResult = await uploadToCloudinary(file.buffer, 'faculties');

//     const newFaculty = await prisma.faculty.create({
//       data: {
//         faculty_name,
//         qualification,
//         designation,
//         profilePicUrl: uploadResult.secure_url,
//         created_by,
//       },
//     });

//     res.status(201).json({ message: 'Faculty added successfully!', faculty: newFaculty });
//   } catch (error) {
//     console.error('Error adding faculty:', error);
//     res.status(500).json({ message: 'Error adding faculty', error });
//   }
// });

router.post('/faculty/add', upload.single('file'), async (req, res) => {
  try {
    const { faculty_name, qualification, designation, created_by } = req.body;
    const file = req.file;

    // Validate required fields
    if (!faculty_name || !qualification || !designation || !created_by) {
      return res.status(400).json({ message: 'All fields except file are required.' });
    }

    let profilePicUrl = null; // Default value for profilePicUrl

    // If a file is provided, upload it to Cloudinary
    if (file) {
      const uploadResult = await uploadToCloudinary(file.buffer, 'faculties');
      profilePicUrl = uploadResult.secure_url; // Set the URL if the upload is successful
    }

    // Create a new faculty record
    const newFaculty = await prisma.faculty.create({
      data: {
        faculty_name,
        qualification,
        designation,
        profilePicUrl, // This will be null if no file was uploaded
        created_by,
      },
    });

    res.status(201).json({ message: 'Faculty added successfully!', faculty: newFaculty });
  } catch (error) {
    console.error('Error adding faculty:', error);
    res.status(500).json({ message: 'Error adding faculty', error });
  }
});
// Update faculty
router.put('/faculty/update/:id', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const { faculty_name, qualification, designation, modify_by } = req.body;
    const file = req.file;

    const existingFaculty = await prisma.faculty.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingFaculty) {
      return res.status(404).json({ message: 'Faculty not found.' });
    }

    let profilePicUrl = existingFaculty.profilePicUrl;

    if (file) {
      const uploadResult = await uploadToCloudinary(file.buffer, 'faculties');
      profilePicUrl = uploadResult.secure_url;
    }

    const updatedFaculty = await prisma.faculty.update({
      where: { id: parseInt(id) },
      data: {
        faculty_name,
        qualification,
        designation,
        profilePicUrl,
        modify_by,
        modify_on: new Date(),
      },
    });

    res.status(200).json({ message: 'Faculty updated successfully!', faculty: updatedFaculty });
  } catch (error) {
    console.error('Error updating faculty:', error);
    res.status(500).json({ message: 'Error updating faculty', error });
  }
});

// Delete faculty
router.delete('/faculty/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existingFaculty = await prisma.faculty.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingFaculty) {
      return res.status(404).json({ message: 'Faculty not found.' });
    }

    await prisma.faculty.delete({
      where: { id: parseInt(id) },
    });

    res.status(200).json({ message: 'Faculty deleted successfully.' });
  } catch (error) {
    console.error('Error deleting faculty:', error);
    res.status(500).json({ message: 'Error deleting faculty.', error });
  }
});

//toggle visibility
// Backend route for toggling faculty visibility
router.put('/faculty/toggle-visibility/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { modify_by } = req.body;

    const existingFaculty = await prisma.faculty.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingFaculty) {
      return res.status(404).json({ message: 'Faculty not found.' });
    }

    const updatedFaculty = await prisma.faculty.update({
      where: { id: parseInt(id) },
      data: {
        IsVisible: !existingFaculty.IsVisible, // Toggle visibility
        modify_by,
        modify_on: new Date(),
      },
    });

    res.status(200).json({ message: 'Faculty visibility updated successfully!', faculty: updatedFaculty });
  } catch (error) {
    console.error('Error updating faculty visibility:', error);
    res.status(500).json({ message: 'Error updating faculty visibility', error });
  }
});

module.exports = router;
