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
      orderBy: { faculty_name: 'asc' },
    });
    res.status(200).json(faculties);
  } catch (error) {
    console.error('Error fetching faculties:', error);
    res.status(500).json({ message: 'Error fetching faculties', error });
  }
});

// Add faculty with profile picture and documents
router.post('/faculty/add', upload.fields([
  { name: 'profilePic', maxCount: 1 },
  { name: 'documents', maxCount: 5 }
]), async (req, res) => {
  try {
    const { 
      faculty_name, 
      qualification, 
      designation, 
      created_by, 
      monthlySalary, 
      yearlyLeave, 
      IsVisible 
    } = req.body;

    // Validate required fields
    if (!faculty_name || !qualification || !designation || !created_by) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    let profilePicUrl = null;
    let documents = [];

    // Upload profile picture if provided
    if (req.files && req.files.profilePic && req.files.profilePic.length > 0) {
      const uploadResult = await uploadToCloudinary(req.files.profilePic[0].buffer, 'faculties');
      if (!uploadResult || !uploadResult.secure_url) {
        return res.status(500).json({ message: 'Failed to upload profile picture to Cloudinary' });
      }
      profilePicUrl = uploadResult.secure_url;
    }

    // Upload multiple documents if provided
    if (req.files && req.files.documents) {
      for (const file of req.files.documents) {
        const uploadResult = await uploadToCloudinary(file.buffer, 'faculties');
        if (!uploadResult || !uploadResult.secure_url) {
          return res.status(500).json({ message: `Failed to upload document ${file.originalname} to Cloudinary` });
        }
        documents.push({ title: file.originalname, url: uploadResult.secure_url });
      }
    }

    // Create faculty record
    const newFaculty = await prisma.faculty.create({
      data: {
        faculty_name,
        qualification,
        designation,
        profilePicUrl,
        documents: documents.length > 0 ? JSON.stringify(documents) : null,
        monthlySalary: monthlySalary ? parseInt(monthlySalary) : null,
        yearlyLeave: yearlyLeave ? parseInt(yearlyLeave) : null,
        created_by,
        IsVisible: IsVisible ? JSON.parse(IsVisible) : true, // Default to true if not provided
      },
    });

    res.status(201).json({ 
      message: 'Faculty added successfully!', 
      faculty: newFaculty, 
      profilePicUrl, 
      documents 
    });
  } catch (error) {
    console.error('Error adding faculty:', error);
    res.status(500).json({ message: 'Error adding faculty', error: error.message });
  }
});

// Update faculty
router.put('/faculty/update/:id', upload.fields([
  { name: 'profilePic', maxCount: 1 },
  { name: 'documents', maxCount: 5 }
]), async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      faculty_name, 
      qualification, 
      designation, 
      monthlySalary, 
      yearlyLeave, 
      modify_by, 
      IsVisible 
    } = req.body;

    const existingFaculty = await prisma.faculty.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingFaculty) {
      return res.status(404).json({ message: 'Faculty not found.' });
    }

    let profilePicUrl = existingFaculty.profilePicUrl;
    let documents = existingFaculty.documents ? JSON.parse(existingFaculty.documents) : [];

    // Upload new profile picture if provided
    if (req.files && req.files.profilePic && req.files.profilePic.length > 0) {
      const uploadResult = await uploadToCloudinary(req.files.profilePic[0].buffer, 'faculties');
      if (!uploadResult || !uploadResult.secure_url) {
        return res.status(500).json({ message: 'Failed to upload profile picture to Cloudinary' });
      }
      profilePicUrl = uploadResult.secure_url;
    }

    // Upload new documents if provided (append to existing)
    if (req.files && req.files.documents) {
      for (const file of req.files.documents) {
        const uploadResult = await uploadToCloudinary(file.buffer, 'faculties');
        if (!uploadResult || !uploadResult.secure_url) {
          return res.status(500).json({ message: `Failed to upload document ${file.originalname} to Cloudinary` });
        }
        documents.push({ title: file.originalname, url: uploadResult.secure_url });
      }
    }

    const updatedFaculty = await prisma.faculty.update({
      where: { id: parseInt(id) },
      data: {
        faculty_name,
        qualification,
        designation,
        profilePicUrl,
        documents: documents.length > 0 ? JSON.stringify(documents) : null,
        monthlySalary: monthlySalary ? parseInt(monthlySalary) : null,
        yearlyLeave: yearlyLeave ? parseInt(yearlyLeave) : null,
        modify_by,
        modify_on: new Date(),
        IsVisible: IsVisible !== undefined ? JSON.parse(IsVisible) : existingFaculty.IsVisible,
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

// Toggle visibility
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
        IsVisible: !existingFaculty.IsVisible,
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