const express = require('express');
const multer = require('multer');
const cloudinary = require('../config/cloudinaryConfig');
const { sql, executeQuery } = require('../config/db');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// 1. GET All Faculties
router.get('/faculty', async (req, res) => {
  try {
    const result = await executeQuery('SELECT * FROM Faculty ORDER BY faculty_name ASC');
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('Fetch Error:', err);
    res.status(500).json({ success: false, message: 'Error fetching faculties', error: err.message });
  }
});

// 2. POST Add Faculty
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
      IsVisible,
      documentTitles
    } = req.body;

    if (!faculty_name || !qualification || !designation || !created_by) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    let profilePicUrl = null;
    let documents = [];

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

    const titles = documentTitles ? JSON.parse(documentTitles) : [];
    if (req.files && req.files.documents) {
      const documentFiles = req.files.documents;
      for (let i = 0; i < documentFiles.length; i++) {
        const file = documentFiles[i];
        const uploadResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { resource_type: 'auto', folder: 'faculties' },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          stream.end(file.buffer);
        });
        const title = titles[i] || `Untitled Document ${i + 1}`;
        documents.push({ title, url: uploadResult.secure_url });
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

    console.log('Faculty added:', result.recordset[0].faculty_name);
    res.status(201).json({ 
      success: true, 
      message: 'Faculty added successfully', 
      faculty: result.recordset[0] 
    });
  } catch (err) {
    console.error('Add Faculty Error:', err);
    res.status(500).json({ success: false, message: 'Error adding faculty', error: err.message });
  }
});

// 3. PUT Update Faculty
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

    const titles = documentTitles ? JSON.parse(documentTitles) : [];
    if (req.files && req.files.documents) {
      const documentFiles = req.files.documents;
      for (let i = 0; i < documentFiles.length; i++) {
        const file = documentFiles[i];
        const uploadResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { resource_type: 'auto', folder: 'faculties' },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          stream.end(file.buffer);
        });
        const title = titles[i] || `Untitled Document ${i + 1}`;
        documents.push({ title, url: uploadResult.secure_url });
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

    console.log('Faculty updated:', result.recordset[0].faculty_name);
    res.status(200).json({ 
      success: true, 
      message: 'Faculty updated successfully', 
      faculty: result.recordset[0] 
    });
  } catch (err) {
    console.error('Update Faculty Error:', err);
    res.status(500).json({ success: false, message: 'Error updating faculty', error: err.message });
  }
});

// 4. DELETE Faculty
router.delete('/faculty/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await executeQuery(
      `SELECT * FROM Faculty WHERE id = @id`,
      { id: { type: sql.Int, value: parseInt(id) } }
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    await executeQuery(
      `DELETE FROM Faculty WHERE id = @id`,
      { id: { type: sql.Int, value: parseInt(id) } }
    );

    console.log('Faculty deleted:', result.recordset[0].faculty_name);
    res.status(200).json({ success: true, message: 'Faculty deleted successfully' });
  } catch (err) {
    console.error('Delete Faculty Error:', err);
    res.status(500).json({ success: false, message: 'Error deleting faculty', error: err.message });
  }
});

// 5. PUT Toggle Faculty Visibility
router.put('/faculty/toggle-visibility/:id', async (req, res) => {
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

    console.log('Faculty visibility toggled:', result.recordset[0].faculty_name);
    res.status(200).json({ 
      success: true, 
      message: 'Faculty visibility updated successfully', 
      faculty: result.recordset[0] 
    });
  } catch (err) {
    console.error('Toggle Visibility Error:', err);
    res.status(500).json({ success: false, message: 'Error updating faculty visibility', error: err.message });
  }
});

module.exports = router;