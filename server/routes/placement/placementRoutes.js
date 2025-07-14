const express = require('express');
const router = express.Router();
const sql = require('mssql');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { executeQuery } = require('../../config/db');

// Configure multer for local storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../public/uploads/Placement');
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (err) {
      cb(err);
    }
  },
  filename: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../public/uploads/Placement');
    const baseName = path.parse(file.originalname).name;
    const ext = path.extname(file.originalname);
    let filename = `${baseName}${ext}`;
    let counter = 0;

    while (await fs.access(path.join(uploadPath, filename)).then(() => true).catch(() => false)) {
      counter++;
      filename = `${baseName}_${counter}${ext}`;
    }

    cb(null, filename);
  }
});

const upload = multer({ storage });

// Serve static files
router.use('/Placement', express.static(path.join(__dirname, '../../public/uploads/Placement')));

// GET - Get all placements with student details
router.get('/placements', async (req, res) => {
  try {
    const placements = await executeQuery(`
      SELECT p.*, s.fName, s.lName, 
             COALESCE(p.StudentPic, s.studentImage) as studentimage
      FROM Placement p 
      JOIN StudentAcademicDetails sad ON p.StudentAcademicId = sad.id
      JOIN Student s ON sad.studentId = s.id
    `);
    res.status(200).json(placements);
  } catch (err) {
    console.error('Error fetching placements:', err);
    res.status(500).json({ error: 'Failed to fetch placements' });
  }
});

// GET - Get placement by ID
router.get('/placements/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const placement = await executeQuery(
      `SELECT p.*, s.fName, s.lName, 
              COALESCE(p.StudentPic, s.studentImage) as studentimage
       FROM Placement p 
       JOIN StudentAcademicDetails sad ON p.StudentAcademicId = sad.id
       JOIN Student s ON sad.studentId = s.id 
       WHERE p.PlacementId = @id`,
      { id: { value: id, type: sql.Int } }
    );
    if (placement.length === 0) {
      return res.status(404).json({ error: 'Placement not found' });
    }
    res.status(200).json(placement[0]);
  } catch (err) {
    console.error('Error fetching placement:', err);
    res.status(500).json({ error: 'Failed to fetch placement' });
  }
});

// POST - Add placement with image upload
router.post('/placements', upload.single('studentPic'), async (req, res) => {
  const { studentAcademicId, company, role, package: pkg, year, status, remarks, CreatedBy } = req.body;
  const studentPic = req.file ? `/Placement/${req.file.filename}` : null;

  // Input validation
  if (!studentAcademicId || isNaN(studentAcademicId)) {
    return res.status(400).json({ error: 'Invalid or missing studentAcademicId' });
  }
  if (!company) {
    return res.status(400).json({ error: 'Company name is required' });
  }
  if (!status || !['Selected', 'Joined', 'Offer Received'].includes(status)) {
    return res.status(400).json({ error: 'Invalid or missing status' });
  }
  if (pkg && isNaN(pkg)) {
    return res.status(400).json({ error: 'Invalid package value' });
  }
  if (year && isNaN(year)) {
    return res.status(400).json({ error: 'Invalid placement year' });
  }
  if (!CreatedBy) {
    return res.status(400).json({ error: 'CreatedBy is required' });
  }

  try {
    await executeQuery(
      `INSERT INTO Placement 
       (StudentAcademicId, CompanyName, RoleOffered, PackageOffered, PlacementYear, 
        Status, Remarks, CreatedBy, CreatedOn, StudentPic)
       VALUES 
       (@studentAcademicId, @company, @role, @pkg, @year, @status, @remarks, 
        @CreatedBy, GETDATE(), @studentPic)`,
      {
        studentAcademicId: { value: studentAcademicId, type: sql.Int },
        company: { value: company, type: sql.NVarChar(100) },
        role: { value: role || null, type: sql.NVarChar(100) },
        pkg: { value: pkg || null, type: sql.Decimal(10, 2) },
        year: { value: year || null, type: sql.Int },
        status: { value: status, type: sql.NVarChar(50) },
        remarks: { value: remarks || null, type: sql.NVarChar(250) },
        CreatedBy: { value: CreatedBy, type: sql.NVarChar(50) },
        studentPic: { value: studentPic, type: sql.NVarChar(255) }
      }
    );

    res.status(200).json({ message: 'Placement added successfully' });
  } catch (err) {
    console.error('Error adding placement:', err);
    res.status(500).json({ error: 'Failed to add placement' });
  }
});

// PUT - Update placement with optional image upload
router.put('/placements/:id', upload.single('studentPic'), async (req, res) => {
  const { id } = req.params;
  const { CompanyName, RoleOffered, PackageOffered, PlacementYear, Status, 
          Remarks, ModifiedBy, deleteExistingImage } = req.body;
  
  let studentPic = null;
  
  try {
    // Get current image path if exists
    let currentImage = null;
    if (!deleteExistingImage) {
      const current = await executeQuery(
        'SELECT StudentPic FROM Placement WHERE PlacementId = @id',
        { id: { value: id, type: sql.Int } }
      );
      currentImage = current[0]?.StudentPic;
    }

    // Handle image upload/delete
    if (req.file) {
      studentPic = `/Placement/${req.file.filename}`;
      // Delete old image if exists
      if (currentImage) {
        try {
          const imagePath = path.join(__dirname, '../../public', currentImage);
          await fs.unlink(imagePath);
        } catch (err) {
          console.error('Error deleting old image:', err);
        }
      }
    } else if (deleteExistingImage === 'true' && currentImage) {
      try {
        const imagePath = path.join(__dirname, '../../public', currentImage);
        await fs.unlink(imagePath);
      } catch (err) {
        console.error('Error deleting old image:', err);
      }
    } else {
      studentPic = currentImage;
    }

    // Input validation
    if (!CompanyName) {
      return res.status(400).json({ error: 'Company name is required' });
    }
    if (!Status || !['Selected', 'Joined', 'Offer Received'].includes(Status)) {
      return res.status(400).json({ error: 'Invalid or missing status' });
    }
    if (PackageOffered && isNaN(PackageOffered)) {
      return res.status(400).json({ error: 'Invalid package value' });
    }
    if (PlacementYear && isNaN(PlacementYear)) {
      return res.status(400).json({ error: 'Invalid placement year' });
    }
    if (!ModifiedBy) {
      return res.status(400).json({ error: 'ModifiedBy is required' });
    }

    await executeQuery(
      `UPDATE Placement 
       SET CompanyName = @CompanyName, 
           RoleOffered = @RoleOffered, 
           PackageOffered = @PackageOffered, 
           PlacementYear = @PlacementYear, 
           Status = @Status, 
           Remarks = @Remarks, 
           ModifiedBy = @ModifiedBy, 
           ModifiedOn = GETDATE(),
           StudentPic = @studentPic
       WHERE PlacementId = @id`,
      {
        id: { value: id, type: sql.Int },
        CompanyName: { value: CompanyName, type: sql.NVarChar(100) },
        RoleOffered: { value: RoleOffered || null, type: sql.NVarChar(100) },
        PackageOffered: { value: PackageOffered || null, type: sql.Decimal(10, 2) },
        PlacementYear: { value: PlacementYear || null, type: sql.Int },
        Status: { value: Status, type: sql.NVarChar(50) },
        Remarks: { value: Remarks || null, type: sql.NVarChar(250) },
        ModifiedBy: { value: ModifiedBy, type: sql.NVarChar(50) },
        studentPic: { value: studentPic, type: sql.NVarChar(255) }
      }
    );
    res.status(200).json({ message: 'Placement updated successfully' });
  } catch (err) {
    console.error('Error updating placement:', err);
    res.status(500).json({ error: 'Failed to update placement' });
  }
});

// DELETE - Delete placement
router.delete('/placements/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Get image path before deletion
    const placement = await executeQuery(
      'SELECT StudentPic FROM Placement WHERE PlacementId = @id',
      { id: { value: id, type: sql.Int } }
    );
    
    const imagePath = placement[0]?.StudentPic;
    
    // Delete placement record
    await executeQuery(
      'DELETE FROM Placement WHERE PlacementId = @id',
      { id: { value: id, type: sql.Int } }
    );
    
    // Delete associated image if exists
    if (imagePath) {
      try {
        const fullPath = path.join(__dirname, '../../public', imagePath);
        await fs.unlink(fullPath);
      } catch (err) {
        console.error('Error deleting placement image:', err);
      }
    }
    
    res.status(200).json({ message: 'Placement deleted successfully' });
  } catch (err) {
    console.error('Error deleting placement:', err);
    res.status(500).json({ error: 'Failed to delete placement' });
  }
});

module.exports = router;