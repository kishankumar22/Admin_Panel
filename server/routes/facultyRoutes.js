const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cloudinary = require('../config/cloudinaryConfig');
const { sql, executeQuery } = require('../config/db');
const router = express.Router();

// Load STORAGE_PATH from environment variable
require('dotenv').config();
const STORAGE_PATH = process.env.STORAGE_PATH;

// Ensure storage directory exists with proper permissions
const initializeStorage = () => {
  if (!fs.existsSync(STORAGE_PATH)) {
    fs.mkdirSync(STORAGE_PATH, { recursive: true, mode: 0o755 });
    fs.chmodSync(STORAGE_PATH, 0o755);
  }
};

// Initialize storage on server start
initializeStorage();

// Handle duplicate file names by appending _1, _2, etc.
const getUniqueFileName = (fileName, storagePath) => {
  let newFileName = fileName;
  let counter = 1;
  const ext = path.extname(fileName);
  const baseName = path.basename(fileName, ext);

  while (fs.existsSync(path.join(storagePath, newFileName))) {
    newFileName = `${baseName}_${counter}${ext}`;
    counter++;
  }

  return newFileName;
};

// Multer configuration for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Middleware to prevent direct folder/file deletion
const protectFolder = (req, res, next) => {
  const forbiddenPaths = [STORAGE_PATH];
  if (forbiddenPaths.some(p => req.path.includes(p))) {
    return res.status(403).json({ success: false, message: 'Direct access to storage folder is forbidden' });
  }
  next();
};

// 1. GET All Faculties
router.get('/faculty', async (req, res) => {
  try {
    const result = await executeQuery('SELECT * FROM Faculty ORDER BY faculty_name ASC');
    const faculties = result.recordset.map(faculty => {
      if (faculty.documents) {
        try {
          const docs = JSON.parse(faculty.documents);
          faculty.documents = JSON.stringify(docs.filter(doc => {
            const url = doc.url;
            if (url.includes('res.cloudinary.com')) {
              return true;
            }
            const fileName = path.basename(url);
            const filePath = path.resolve(STORAGE_PATH, 'faculties', fileName);
            const exists = fs.existsSync(filePath);
            if (!exists) {
              console.log(`Local file not found: ${filePath}`);
            }
            return exists;
          }));
        } catch (error) {
          console.error(`Error parsing documents for faculty ${faculty.id}:`, error.message);
          faculty.documents = null;
        }
      }
      return faculty;
    });

    return res.status(200).json(faculties);
  } catch (err) {
    console.error('Error fetching faculties:', err.stack);
    return res.status(500).json({ success: false, message: 'Error fetching faculties', error: err.message });
  }
});


// 2. POST Add Faculty
router.post('/faculty/add', upload.fields([
  { name: 'profilePic', maxCount: 1 },
  { name: 'documents', maxCount: 10 }
]), protectFolder, async (req, res, next) => {
  try {
    const {
      faculty_name,
      qualification,
      designation,
      created_by,
      monthlySalary,
      yearlyLeave,
      IsVisible,
      documentTitles
    } = req.body;

    if (!faculty_name || !qualification || !designation || !created_by) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    let profilePicUrl = null;
    let documents = [];

    // Upload profile picture to Cloudinary
    if (req.files && req.files.profilePic && req.files.profilePic.length > 0) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: 'auto', folder: 'faculties' },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        stream.end(req.files.profilePic[0].buffer);
      });
      profilePicUrl = uploadResult.secure_url;
    }

    // Save documents locally with original names or unique names
    const titles = documentTitles ? JSON.parse(documentTitles) : [];
    if (req.files && req.files.documents) {
      const documentFiles = req.files.documents;
      for (let i = 0; i < documentFiles.length; i++) {
        const file = documentFiles[i];
        const originalFileName = file.originalname;
        const uniqueFileName = getUniqueFileName(originalFileName, STORAGE_PATH);
        const filePath = path.join(STORAGE_PATH, uniqueFileName);

        // Save file with read-only permissions
        fs.writeFileSync(filePath, file.buffer);
        fs.chmodSync(filePath, 0o444); // Read-only permissions

        const title = titles[i] || originalFileName;
        documents.push({ title, url: `/${uniqueFileName}` });
      }
    }

    const query = `
      INSERT INTO Faculty (
        faculty_name, qualification, designation, profilePicUrl, documents,
        monthlySalary, yearlyLeave, created_by, created_on, IsVisible
      )
      OUTPUT INSERTED.*
      VALUES (
        @facultyName, @qualification, @designation, @profilePicUrl, @documents,
        @monthlySalary, @yearlyLeave, @createdBy, GETDATE(), @isVisible
      )
    `;

    const result = await executeQuery(query, {
      facultyName: { type: sql.NVarChar, value: faculty_name },
      qualification: { type: sql.NVarChar, value: qualification },
      designation: { type: sql.NVarChar, value: designation },
      profilePicUrl: { type: sql.NVarChar, value: profilePicUrl },
      documents: { type: sql.NVarChar, value: documents.length > 0 ? JSON.stringify(documents) : null },
      monthlySalary: { type: sql.Int, value: monthlySalary ? parseInt(monthlySalary) : null },
      yearlyLeave: { type: sql.Int, value: yearlyLeave ? parseInt(yearlyLeave) : null },
      createdBy: { type: sql.NVarChar, value: created_by },
      isVisible: { type: sql.Bit, value: IsVisible !== undefined ? JSON.parse(IsVisible) : true },
    });

    res.status(201).json({
      success: true,
      message: 'Faculty added successfully',
      faculty: result.recordset[0]
    });
  } catch (err) {
    next(err); // Pass error to middleware
  }
});

// 3. PUT Update Faculty
router.put('/faculty/update/:id', upload.fields([
  { name: 'profilePic', maxCount: 1 },
  { name: 'documents', maxCount: 10 }
]), protectFolder, async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      faculty_name,
      qualification,
      designation,
      monthlySalary,
      yearlyLeave,
      modify_by,
      IsVisible,
      documentTitles,
      existingDocuments
    } = req.body;

    const existing = await executeQuery(
      `SELECT * FROM Faculty WHERE id = @id`,
      { id: { type: sql.Int, value: parseInt(id) } }
    );

    if (existing.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    let profilePicUrl = existing.recordset[0].profilePicUrl;
    let documents = existingDocuments ? JSON.parse(existingDocuments) : [];

    // Upload profile picture to Cloudinary
    if (req.files && req.files.profilePic && req.files.profilePic.length > 0) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: 'auto', folder: 'faculties' },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        stream.end(req.files.profilePic[0].buffer);
      });
      profilePicUrl = uploadResult.secure_url;
    }

    // Save new documents locally with original names or unique names
    const titles = documentTitles ? JSON.parse(documentTitles) : [];
    if (req.files && req.files.documents) {
      const documentFiles = req.files.documents;
      for (let i = 0; i < documentFiles.length; i++) {
        const file = documentFiles[i];
        const originalFileName = file.originalname;
        const uniqueFileName = getUniqueFileName(originalFileName, STORAGE_PATH);
        const filePath = path.join(STORAGE_PATH, uniqueFileName);

        fs.writeFileSync(filePath, file.buffer);
        fs.chmodSync(filePath, 0o444); // Read-only permissions

        const title = titles[i] || originalFileName;
        documents.push({ title, url: `/${uniqueFileName}` });
      }
    }

    const query = `
      UPDATE Faculty
      SET 
        faculty_name = @facultyName,
        qualification = @qualification,
        designation = @designation,
        profilePicUrl = @profilePicUrl,
        documents = @documents,
        monthlySalary = @monthlySalary,
        yearlyLeave = @yearlyLeave,
        modify_by = @modifyBy,
        modify_on = GETDATE(),
        IsVisible = @isVisible
      OUTPUT INSERTED.*
      WHERE id = @id
    `;

    const result = await executeQuery(query, {
      id: { type: sql.Int, value: parseInt(id) },
      facultyName: { type: sql.NVarChar, value: faculty_name || existing.recordset[0].faculty_name },
      qualification: { type: sql.NVarChar, value: qualification || existing.recordset[0].qualification },
      designation: { type: sql.NVarChar, value: designation || existing.recordset[0].designation },
      profilePicUrl: { type: sql.NVarChar, value: profilePicUrl },
      documents: { type: sql.NVarChar, value: documents.length > 0 ? JSON.stringify(documents) : null },
      monthlySalary: { type: sql.Int, value: monthlySalary ? parseInt(monthlySalary) : existing.recordset[0].monthlySalary },
      yearlyLeave: { type: sql.Int, value: yearlyLeave ? parseInt(yearlyLeave) : existing.recordset[0].yearlyLeave },
      modifyBy: { type: sql.NVarChar, value: modify_by },
      isVisible: { type: sql.Bit, value: IsVisible !== undefined ? JSON.parse(IsVisible) : existing.recordset[0].IsVisible },
    });

    res.status(200).json({
      success: true,
      message: 'Faculty updated successfully',
      faculty: result.recordset[0]
    });
  } catch (err) {
    next(err); // Pass error to middleware
  }
});

// 4. DELETE Faculty
router.delete('/faculty/delete/:id', protectFolder, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await executeQuery(
      `SELECT * FROM Faculty WHERE id = @id`,
      { id: { type: sql.Int, value: parseInt(id) } }
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    // Delete associated local documents
    if (result.recordset[0].documents) {
      const documents = JSON.parse(result.recordset[0].documents);
      for (const doc of documents) {
        const fileName = path.basename(doc.url);
        const filePath = path.join(STORAGE_PATH, fileName);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    await executeQuery(
      `DELETE FROM Faculty WHERE id = @id`,
      { id: { type: sql.Int, value: parseInt(id) } }
    );

    res.status(200).json({ success: true, message: 'Faculty deleted successfully' });
  } catch (err) {
    next(err); // Pass error to middleware
  }
});

// 5. PUT Toggle Faculty Visibility
router.put('/faculty/toggle-visibility/:id', protectFolder, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { modify_by } = req.body;

    const existing = await executeQuery(
      `SELECT * FROM Faculty WHERE id = @id`,
      { id: { type: sql.Int, value: parseInt(id) } }
    );

    if (existing.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    const query = `
      UPDATE Faculty
      SET IsVisible = @isVisible,
          modify_by = @modifyBy,
          modify_on = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `;

    const result = await executeQuery(query, {
      id: { type: sql.Int, value: parseInt(id) },
      isVisible: { type: sql.Bit, value: !existing.recordset[0].IsVisible },
      modifyBy: { type: sql.NVarChar, value: modify_by },
    });

    res.status(200).json({
      success: true,
      message: 'Faculty visibility updated successfully',
      faculty: result.recordset[0]
    });
  } catch (err) {
    next(err); // Pass error to middleware
  }
});

// 6. Serve Documents (Check File Existence)
router.get('/upload/:fileName', (req, res, next) => {
  try {
    const fileName = req.params.fileName;
    const filePath = path.join(STORAGE_PATH, fileName);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ success: false, message: 'File not found' });
    }
  } catch (err) {
    next(err); // Pass error to middleware
  }
});

// 7. PUT Update Document Title
router.put('/faculty/:id/update-document-title', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { docIndex, newTitle } = req.body;

    // Validate inputs
    if (!id || isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid faculty ID' });
    }
    if (docIndex === undefined || isNaN(docIndex) || docIndex < 0) {
      return res.status(400).json({ success: false, message: 'Invalid document index' });
    }
    if (!newTitle || typeof newTitle !== 'string') {
      return res.status(400).json({ success: false, message: 'New title must be a non-empty string' });
    }

    // Fetch the faculty record
    const result = await executeQuery('SELECT * FROM Faculty WHERE id = @id', {
      id: { type: sql.Int, value: parseInt(id) }
    });

    if (!result.recordset || result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    const faculty = result.recordset[0];
    let documents;

    // Handle the documents field
    try {
      documents = faculty.documents ? JSON.parse(faculty.documents) : [];
      if (!Array.isArray(documents)) {
        documents = [];
      }
    } catch (error) {
      console.error('Error parsing faculty.documents:', error);
      documents = [];
    }

    // Validate document index
    if (docIndex >= documents.length) {
      return res.status(400).json({ success: false, message: 'Document index out of bounds' });
    }

    // Update the document title
    documents[docIndex].title = newTitle;

    // Update the faculty record in the database
    const documentsString = JSON.stringify(documents);
    await executeQuery(
      'UPDATE Faculty SET documents = @documents WHERE id = @id',
      {
        id: { type: sql.Int, value: parseInt(id) },
        documents: { type: sql.NVarChar, value: documents.length > 0 ? documentsString : null }
      }
    );

    // Fetch the updated faculty record to return
    const updatedResult = await executeQuery('SELECT * FROM Faculty WHERE id = @id', {
      id: { type: sql.Int, value: parseInt(id) }
    });
    const updatedFaculty = updatedResult.recordset[0];

    res.status(200).json(updatedFaculty);
  } catch (err) {
    next(err); // Pass error to middleware
  }
});

// Serve static files (optional, for fallback)
router.use('/', express.static(STORAGE_PATH));

module.exports = router;