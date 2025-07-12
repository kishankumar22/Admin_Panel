const express = require('express');
const router = express.Router();
const sql = require('mssql'); // Import mssql for type definitions
const { executeQuery } = require('../../config/db');

// GET - Get all placements with student details
router.get('/placements', async (req, res) => {
  try {
    const placements = await executeQuery(`
      SELECT p.*, s.fName, s.lName ,s.studentimage
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
      `SELECT p.*, s.fName, s.lName 
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

// POST - Add placement
router.post('/placements', async (req, res) => {
  const { studentAcademicId, company, role, package: pkg, year, status, remarks, CreatedBy } = req.body;

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
       (StudentAcademicId, CompanyName, RoleOffered, PackageOffered, PlacementYear, Status, Remarks, CreatedBy, CreatedOn)
       VALUES 
       (@studentAcademicId, @company, @role, @pkg, @year, @status, @remarks, @CreatedBy, GETDATE())`,
      {
        studentAcademicId: { value: studentAcademicId, type: sql.Int },
        company: { value: company, type: sql.NVarChar(100) },
        role: { value: role || null, type: sql.NVarChar(100) },
        pkg: { value: pkg || null, type: sql.Decimal(10, 2) },
        year: { value: year || null, type: sql.Int },
        status: { value: status, type: sql.NVarChar(50) },
        remarks: { value: remarks || null, type: sql.NVarChar(250) },
        CreatedBy: { value: CreatedBy, type: sql.NVarChar(50) },
      }
    );

    res.status(200).json({ message: 'Placement added successfully' });
  } catch (err) {
    console.error('Error adding placement:', err);
    res.status(500).json({ error: 'Failed to add placement' });
  }
});


// PUT - Update placement
router.put('/placements/:id', async (req, res) => {
  const { id } = req.params;
  const { CompanyName, RoleOffered, PackageOffered, PlacementYear, Status, Remarks, ModifiedBy } = req.body;

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

  try {
    await executeQuery(
      `UPDATE Placement 
       SET CompanyName = @CompanyName, 
           RoleOffered = @RoleOffered, 
           PackageOffered = @PackageOffered, 
           PlacementYear = @PlacementYear, 
           Status = @Status, 
           Remarks = @Remarks, 
           ModifiedBy = @ModifiedBy, 
           ModifiedOn = GETDATE()
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
    await executeQuery(`DELETE FROM Placement WHERE PlacementId = @id`, {
      id: { value: id, type: sql.Int },
    });
    res.status(200).json({ message: 'Placement deleted successfully' });
  } catch (err) {
    console.error('Error deleting placement:', err);
    res.status(500).json({ error: 'Failed to delete placement' });
  }
});

module.exports = router;