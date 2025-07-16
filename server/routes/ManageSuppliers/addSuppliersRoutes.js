const express = require('express');
const multer = require('multer');
const cloudinary = require('../../config/cloudinaryConfig');
const { sql, executeQuery } = require('../../config/db');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

// Configure multer for local storage
const localStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../public/uploads/SupplierDocs');
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (err) {
      cb(err);
    }
  },
  filename: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../public/uploads/SupplierDocs');
    const baseName = path.parse(file.originalname).name; // e.g., "Career"
    const ext = path.extname(file.originalname); // e.g., ".jpg"
    let filename = `${baseName}${ext}`; // Start with original filename
    let counter = 0;

    // Check if file exists and increment counter if necessary
    while (await fs.access(path.join(uploadPath, filename)).then(() => true).catch(() => false)) {
      counter++;
      filename = `${baseName}_${counter}${ext}`; // e.g., "Career_1.jpg"
    }

    cb(null, filename);
  },
});

const upload = multer({ storage: localStorage });

// GET all suppliers
router.get('/suppliers', async (req, res, next) => {
  try {
    const result = await executeQuery('SELECT * FROM Suppliers');
    res.status(200).json(result.recordset);
  } catch (err) {
    next(err);
  }
});

router.get('/supplier/:supplierId/payments', async (req, res, next) => {
  try {
    const { supplierId } = req.params;
    const { status } = req.query; // Filter by 'active', 'inactive', or undefined (all)

    if (!supplierId || isNaN(parseInt(supplierId))) {
      return res.status(400).json({ success: false, message: 'Invalid supplier ID' });
    }

    // Query to fetch supplier details, expenses, and payments
    const query = `
      -- Fetch supplier details
      SELECT s.SupplierId, s.Name
      FROM Suppliers s
      WHERE s.SupplierId = @supplierId;

      -- Fetch expenses with payments
      SELECT 
        se.SuppliersExpenseID,
        se.SupplierId,
        s.Name AS SupplierName,
        se.Reason,
        se.Amount AS ExpenseAmount,
        se.Deleted,
        COALESCE(SUM(ep.PaidAmount), 0) AS TotalPaid,
        (se.Amount - COALESCE(SUM(ep.PaidAmount), 0)) AS RemainingAmount
      FROM SupplierExpenses se
      LEFT JOIN ExpensePayment ep ON se.SuppliersExpenseID = ep.SuppliersExpenseID
      LEFT JOIN Suppliers s ON se.SupplierId = s.SupplierId
      WHERE se.SupplierId = @supplierId
      ${status ? "AND se.Deleted = @status" : ""}
      GROUP BY se.SuppliersExpenseID, se.SupplierId, s.Name, se.Reason, se.Amount, se.Deleted;

      -- Fetch total expense, total paid, and remaining amount
      SELECT 
        COALESCE(SUM(se.Amount), 0) AS TotalExpense,
        COALESCE(SUM(ep.PaidAmount), 0) AS TotalPaid,
        COALESCE(SUM(se.Amount) - SUM(ep.PaidAmount), 0) AS TotalRemaining
      FROM SupplierExpenses se
      LEFT JOIN ExpensePayment ep ON se.SuppliersExpenseID = ep.SuppliersExpenseID
      WHERE se.SupplierId = @supplierId
      ${status ? "AND se.Deleted = @status" : ""};
    `;

    const params = {
      supplierId: { type: sql.Int, value: parseInt(supplierId) },
    };
    if (status) {
      params.status = { type: sql.Bit, value: status === 'inactive' ? 1 : 0 };
    }

    const result = await executeQuery(query, params);

    // Organize the response
    const [supplierDetails, expenses, totals] = result.recordsets;
    if (!supplierDetails.length) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    res.status(200).json({
      success: true,
      supplier: supplierDetails[0],
      expenses: expenses,
      totals: totals[0],
    });
  } catch (err) {
    next(err);
  }
});

// DELETE document by PublicId
// router.delete('/documents/:publicId', async (req, res, next) => {
//   try {
//     const decodedPublicId = decodeURIComponent(req.params.publicId);
//     console.log('Deleting document with PublicId:', decodedPublicId);

//     const documentCheck = await executeQuery(
//       'SELECT DocumentId FROM SupplierDocuments WHERE PublicId = @PublicId',
//       { PublicId: { type: sql.NVarChar, value: decodedPublicId } }
//     );

//     if (documentCheck.recordset.length === 0) {
//       return res.status(404).json({ message: 'Document not found in DB' });
//     }

//     // Delete from Cloudinary
//     const cloudinaryResponse = await cloudinary.uploader.destroy(decodedPublicId);
//     console.log('Cloudinary delete result:', cloudinaryResponse); 

//     // Delete from DB
//     const result = await executeQuery(
//       'DELETE FROM SupplierDocuments WHERE PublicId = @PublicId',
//       { PublicId: { type: sql.NVarChar, value: decodedPublicId } }
//     );

//     if (result.rowsAffected[0] === 0) {
//       return res.status(500).json({ message: 'Delete failed in DB' });
//     }

//     res.status(200).json({ message: 'Document deleted successfully' });
//   } catch (err) {
//     console.error('Error deleting document:', err);
//     next(err);
//   }
// });

// POST Add Supplier with multiple files (Local Storage)
router.post('/supplier/add', upload.array('files', 10), async (req, res, next) => {
  try {
    const { name, email, phoneNo, address, bankName, accountNo, ifscCode, comment, createdBy } = req.body;
    const files = req.files;

    if (!name || !email || !phoneNo || !address || !createdBy) {
      return res.status(400).json({ success: false, message: 'All required fields must be provided' });
    }

    const uploadedFiles = files.map(file => ({
      fileUrl: `/SupplierDocs/${file.filename}`,
      publicId: file.filename,
    }));

    const supplierQuery = `
      INSERT INTO Suppliers (Name, Email, PhoneNo, Address, BankName, AccountNo, IFSCCode, Comment, CreatedBy, CreatedOn, Deleted)
      OUTPUT INSERTED.SupplierId
      VALUES (@name, @email, @phoneNo, @address, @bankName, @accountNo, @ifscCode, @comment, @createdBy, GETDATE(), 0)
    `;

    const supplierResult = await executeQuery(supplierQuery, {
      name: { type: sql.NVarChar, value: name },
      email: { type: sql.NVarChar, value: email },
      phoneNo: { type: sql.NVarChar, value: phoneNo },
      address: { type: sql.NVarChar, value: address },
      bankName: { type: sql.NVarChar, value: bankName || null },
      accountNo: { type: sql.NVarChar, value: accountNo || null },
      ifscCode: { type: sql.NVarChar, value: ifscCode || null },
      comment: { type: sql.NVarChar, value: comment || null },
      createdBy: { type: sql.NVarChar, value: createdBy },
    });

    const supplierId = supplierResult.recordset[0].SupplierId;

    if (uploadedFiles.length > 0) {
      for (const file of uploadedFiles) {
        const documentQuery = `
          INSERT INTO SupplierDocuments (SupplierId, DocumentUrl, PublicId, CreatedOn, DocumentType)
          VALUES (@supplierId, @documentUrl, @publicId, GETDATE(), @documentType)
        `;
        await executeQuery(documentQuery, {
          supplierId: { type: sql.Int, value: supplierId },
          documentUrl: { type: sql.NVarChar, value: file.fileUrl },
          publicId: { type: sql.NVarChar, value: file.publicId },
          documentType: { type: sql.NVarChar, value: 'SupplierDocument' },
        });
      }
    }

    res.status(201).json({ success: true, message: 'Supplier added successfully', supplierId });
  } catch (err) {
    next(err);
  }
});

// PUT Update Supplier with multiple files (Local Storage)
router.put('/supplier/:id', upload.array('files', 10), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, phoneNo, address, bankName, accountNo, ifscCode, comment, modifiedBy } = req.body;
    const files = req.files;

    if (!modifiedBy) {
      return res.status(400).json({ success: false, message: 'ModifiedBy field is required' });
    }

    const supplierCheck = await executeQuery(
      'SELECT * FROM Suppliers WHERE SupplierId = @SupplierId AND Deleted = 0',
      {
        SupplierId: { type: sql.Int, value: parseInt(id) },
      }
    );

    if (supplierCheck.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const currentSupplier = supplierCheck.recordset[0];

    const updates = [];
    const params = {
      SupplierId: { type: sql.Int, value: parseInt(id) },
      ModifiedBy: { type: sql.NVarChar, value: modifiedBy },
      ModifiedOn: { type: sql.DateTime, value: new Date() },
    };

    if (name && name !== currentSupplier.Name) {
      const nameCheck = await executeQuery(
        'SELECT SupplierId FROM Suppliers WHERE Name = @Name AND SupplierId != @SupplierId AND Deleted = 0',
        {
          Name: { type: sql.NVarChar, value: name },
          SupplierId: { type: sql.Int, value: parseInt(id) },
        }
      );
      if (nameCheck.recordset.length > 0) {
        return res.status(400).json({ success: false, message: 'Supplier with this name already exists' });
      }
      updates.push('Name = @Name');
      params.Name = { type: sql.NVarChar, value: name };
    }

    if (email && email !== currentSupplier.Email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, message: 'Invalid email format' });
      }
      updates.push('Email = @Email');
      params.Email = { type: sql.NVarChar, value: email };
    }

    if (phoneNo && phoneNo !== currentSupplier.PhoneNo) {
      if (!/^[0-9]{10,15}$/.test(phoneNo)) {
        return res.status(400).json({ success: false, message: 'Invalid phone number format' });
      }
      updates.push('PhoneNo = @PhoneNo');
      params.PhoneNo = { type: sql.NVarChar, value: phoneNo };
    }

    if (address && address !== currentSupplier.Address) {
      updates.push('Address = @Address');
      params.Address = { type: sql.NVarChar, value: address };
    }

    if (bankName && bankName !== currentSupplier.BankName) {
      updates.push('BankName = @BankName');
      params.BankName = { type: sql.NVarChar, value: bankName };
    }

    if (accountNo && accountNo !== currentSupplier.AccountNo) {
      updates.push('AccountNo = @AccountNo');
      params.AccountNo = { type: sql.NVarChar, value: accountNo };
    }

    if (ifscCode && ifscCode !== currentSupplier.IFSCCode) {
      if (!/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(ifscCode)) {
        return res.status(400).json({ success: false, message: 'Invalid IFSC code format' });
      }
      updates.push('IFSCCode = @IFSCCode');
      params.IFSCCode = { type: sql.NVarChar, value: ifscCode.toUpperCase() };
    }

    if (comment !== undefined && comment !== currentSupplier.Comment) {
      updates.push('Comment = @Comment');
      params.Comment = { type: sql.NVarChar, value: comment || null };
    }

    if (updates.length > 0) {
      const updateQuery = `
        UPDATE Suppliers
        SET ${updates.join(', ')}, ModifiedBy = @ModifiedBy, ModifiedOn = @ModifiedOn
        WHERE SupplierId = @SupplierId
      `;
      await executeQuery(updateQuery, params);
    }

    if (files && files.length > 0) {
      const uploadedFiles = files.map(file => ({
        fileUrl: `/SupplierDocs/${file.filename}`,
        publicId: file.filename,
      }));

      for (const file of uploadedFiles) {
        const documentQuery = `
          INSERT INTO SupplierDocuments (SupplierId, DocumentUrl, PublicId, CreatedOn, DocumentType)
          VALUES (@supplierId, @documentUrl, @publicId, GETDATE(), @documentType)
        `;
        await executeQuery(documentQuery, {
          supplierId: { type: sql.Int, value: parseInt(id) },
          documentUrl: { type: sql.NVarChar, value: file.fileUrl },
          publicId: { type: sql.NVarChar, value: file.publicId },
          documentType: { type: sql.NVarChar, value: 'SupplierDocument' },
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Supplier updated successfully',
      supplierId: id,
    });
  } catch (err) {
    console.error('Error updating supplier:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update supplier',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
    next(err);
  }
});

// ... (remaining endpoints like DELETE, GET remain unchanged, included for completeness)
// router.delete('/documents/:publicId', async (req, res, next) => {
//   try {
//     const decodedPublicId = decodeURIComponent(req.params.publicId);
//     console.log('Deleting document with PublicId:', decodedPublicId);

//     const documentCheck = await executeQuery(
//       'SELECT DocumentId FROM SupplierDocuments WHERE PublicId = @PublicId',
//       { PublicId: { type: sql.NVarChar, value: decodedPublicId } }
//     );

//     if (documentCheck.recordset.length === 0) {
//       return res.status(404).json({ message: 'Document not found in DB' });
//     }

//     const cloudinaryResponse = await cloudinary.uploader.destroy(decodedPublicId);
//     console.log('Cloudinary delete result:', cloudinaryResponse);

//     const result = await executeQuery(
//       'DELETE FROM SupplierDocuments WHERE PublicId = @PublicId',
//       { PublicId: { type: sql.NVarChar, value: decodedPublicId } }
//     );

//     if (result.rowsAffected[0] === 0) {
//       return res.status(500).json({ message: 'Delete failed in DB' });
//     }

//     res.status(200).json({ message: 'Document deleted successfully' });
//   } catch (err) {
//     console.error('Error deleting document:', err);
//     next(err);
//   }
// });

router.delete('/documents/local/:publicId', async (req, res, next) => {
  try {
    const decodedPublicId = decodeURIComponent(req.params.publicId);
    console.log('Deleting local document with PublicId:', decodedPublicId);

    const documentCheck = await executeQuery(
      'SELECT DocumentId, DocumentUrl FROM SupplierDocuments WHERE PublicId = @PublicId',
      { PublicId: { type: sql.NVarChar, value: decodedPublicId } }
    );

    if (documentCheck.recordset.length === 0) {
      return res.status(404).json({ message: 'Document not found in DB' });
    }

    const document = documentCheck.recordset[0];
    const filePath = path.join(__dirname, '../../public/uploads/SupplierDocs', decodedPublicId);

    try {
      await fs.unlink(filePath);
      console.log('Local file deleted:', filePath);
    } catch (err) {
      console.error('Error deleting local file:', err);
    }

    const result = await executeQuery(
      'DELETE FROM SupplierDocuments WHERE PublicId = @PublicId',
      { PublicId: { type: sql.NVarChar, value: decodedPublicId } }
    );

    if (result.rowsAffected[0] === 0) {
      return res.status(500).json({ message: 'Delete failed in DB' });
    }

    res.status(200).json({ message: 'Local document deleted successfully' });
  } catch (err) {
    console.error('Error deleting local document:', err);
    next(err);
  }
});

router.get('/SupplierDocs/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../../public/uploads/SupplierDocs', filename);

    await fs.access(filePath);
    res.sendFile(filePath, (err) => {
      if (err) {
        res.status(404).json({ success: false, message: 'File not found' });
      }
    });
  } catch (err) {
    res.status(404).json({ success: false, message: 'File not found' });
  }
});

router.get('/supplier/:supplierId/documents', async (req, res) => {
  try {
    const { supplierId } = req.params;
    const query = `
      SELECT DocumentId, SupplierId, DocumentUrl, PublicId, DocumentType, CreatedOn
      FROM SupplierDocuments
      WHERE SupplierId = @supplierId
    `;
    const result = await executeQuery(query, {
      supplierId: { type: sql.Int, value: supplierId },
    });
    res.status(200).json({ success: true, documents: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch documents' });
  }
});

router.get('/suppliers', async (req, res) => {
  try {
    const query = `
      SELECT SupplierId, Name, Email, PhoneNo, Address, BankName, AccountNo, IFSCCode, Comment, CreatedBy, CreatedOn, Deleted
      FROM Suppliers
    `;
    const result = await executeQuery(query);
    res.status(200).json(result.recordset);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch suppliers' });
  }
});

// PATCH endpoint to toggle supplier status
router.patch('/supplier/:supplierId/toggle', async (req, res) => {
  try {
    const { supplierId } = req.params;
    const { ModifiedBy } = req.body;

    const query = `
      UPDATE Suppliers
      SET Deleted = CASE WHEN Deleted = 1 THEN 0 ELSE 1 END,
          ModifiedBy = @ModifiedBy,
          ModifiedOn = GETDATE()
      WHERE SupplierId = @SupplierId
    `;
    await executeQuery(query, {
      SupplierId: { type: sql.Int, value: supplierId },
      ModifiedBy: { type: sql.NVarChar, value: ModifiedBy },
    });

    res.status(200).json({ success: true, message: 'Supplier status toggled successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to toggle supplier status' });
  }
});

// PATCH toggle supplier deleted status
router.patch('/supplier/:id/toggle', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { ModifiedBy } = req.body;

    console.log('Received PATCH request:', { id, ModifiedBy });

    if (!ModifiedBy) {
      return res.status(400).json({ message: 'ModifiedBy is required' });
    }

    const supplierCheck = await executeQuery(
      'SELECT Deleted FROM Suppliers WHERE SupplierId = @SupplierId',
      {
        SupplierId: { type: sql.Int, value: parseInt(id) },
      }
    );

    if (supplierCheck.recordset.length === 0) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    const currentDeleted = supplierCheck.recordset[0].Deleted;
    const newDeleted = !currentDeleted;

    const updateResult = await executeQuery(
      `UPDATE Suppliers
       SET Deleted = @Deleted, ModifiedBy = @ModifiedBy, ModifiedOn = @ModifiedOn
       WHERE SupplierId = @SupplierId`,
      {
        SupplierId: { type: sql.Int, value: parseInt(id) },
        Deleted: { type: sql.Bit, value: newDeleted },
        ModifiedBy: { type: sql.NVarChar, value: ModifiedBy },
        ModifiedOn: { type: sql.DateTime, value: new Date() },
      }
    );

    res.status(200).json({ message: `Supplier ${newDeleted ? 'InActive' : 'Active'} successfully`, newDeleted });
  } catch (err) {
    console.error('Error toggling supplier:', err);
    res.status(500).json({ message: 'Failed to toggle supplier' });
    next(err);
  }
});
// New endpoint: /supplier/:supplierId/paymentsHistory
router.get('/supplier/:supplierId/paymentsHistory', async (req, res, next) => {
  try {
    const { supplierId } = req.params;
    const { reason, fromDate, toDate } = req.query; // Add fromDate and toDate query parameters

    if (!supplierId || isNaN(parseInt(supplierId))) {
      return res.status(400).json({ success: false, message: 'Invalid supplier ID' });
    }

    // Validate date parameters
    if (fromDate && isNaN(Date.parse(fromDate ))) {
      return res.status(400).json({ success: false, message: 'Invalid fromDate format' });
    }
    if (toDate && isNaN(Date.parse(toDate ))) {
      return res.status(400).json({ success: false, message: 'Invalid toDate format' });
    }

    const query = `
      SELECT 
        ep.ExpensePaymentID,
        ep.PaidAmount,
        ep.PaymentMode,
        ep.TransactionId,
        ep.PaymentDate,
        ep.CreatedBy,
        ep.CreatedOn,
        ep.PaymentImage,
        ep.Comment,
        se.Reason,
        se.Amount AS ExpenseAmount
      FROM ExpensePayment ep
      JOIN SupplierExpenses se
        ON ep.SuppliersExpenseID = se.SuppliersExpenseID
      WHERE ep.SupplierId = @SupplierId
      ${reason ? "AND se.Reason LIKE '%' + @reason + '%'" : ""}
      ${fromDate ? "AND ep.PaymentDate >= @fromDate" : ""}
      ${toDate ? "AND ep.PaymentDate <= @toDate" : ""}
      ORDER BY ep.CreatedOn DESC;
    `;

    const params  = {
      SupplierId: { type: sql.Int, value: parseInt(supplierId) },
    };

    if (reason) {
      params.reason = { type: sql.NVarChar, value: reason };
    }
    if (fromDate) {
      params.fromDate = { type: sql.DateTime, value: new Date(fromDate ) };
    }
    if (toDate) {
      params.toDate = { type: sql.DateTime, value: new Date(toDate ) };
    }

    const result = await executeQuery(query, params);

    if (!result.recordset.length) {
      return res.status(404).json({ success: false, message: 'No payment history found' });
    }

    res.status(200).json(result.recordset);
  } catch (err) {
    next(err);
  }
});

module.exports = router;