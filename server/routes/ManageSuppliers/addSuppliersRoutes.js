const express = require('express');
const multer = require('multer');
const cloudinary = require('../../config/cloudinaryConfig');
const { sql, executeQuery } = require('../../config/db');
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET all suppliers
router.get('/suppliers', async (req, res, next) => {
  try {
    const result = await executeQuery('SELECT * FROM Suppliers WHERE Deleted = 0');
    res.status(200).json(result.recordset);
  } catch (err) {
    next(err);
  }
});

// GET documents for a specific supplier
router.get('/supplier/:supplierId/documents', async (req, res, next) => {
  try {
    const { supplierId } = req.params;
    const query = `
      SELECT DocumentId, SupplierId, DocumentUrl, PublicId, CreatedOn
      FROM SupplierDocuments
      WHERE SupplierId = @supplierId
    `;
    const result = await executeQuery(query, {
      supplierId: { type: sql.Int, value: parseInt(supplierId) },
    });
    res.status(200).json(result.recordset);
  } catch (err) {
    next(err);
  }
});

// POST Add Supplier with multiple files
router.post('/supplier/add', upload.array('files', 10), async (req, res, next) => {
  try {
    const { name, email, phoneNo, address, amount, bankName, accountNo, ifscCode, comment, createdBy } = req.body;
    const files = req.files;

    // Validate required fields
    if (!name || !email || !phoneNo || !address || !amount || !bankName || !accountNo || !ifscCode || !createdBy) {
      return res.status(400).json({ success: false, message: 'All required fields must be provided' });
    }

    // Upload files to Cloudinary and collect URLs and PublicIds
    const uploadedFiles = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const uploadResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { resource_type: 'auto', folder: 'Supplier' },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          stream.end(file.buffer);
        });
        uploadedFiles.push({
          fileUrl: uploadResult.secure_url,
          publicId: uploadResult.public_id,
        });
      }
    }

    // Insert supplier into Suppliers table
    const supplierQuery = `
      INSERT INTO Suppliers (Name, Email, PhoneNo, Address, Amount, BankName, AccountNo, IFSCCode, Comment, CreatedBy, CreatedOn, Deleted)
      OUTPUT INSERTED.SupplierId
      VALUES (@name, @email, @phoneNo, @address, @amount, @bankName, @accountNo, @ifscCode, @comment, @createdBy, GETDATE(), 0)
    `;

    const supplierResult = await executeQuery(supplierQuery, {
      name: { type: sql.NVarChar, value: name },
      email: { type: sql.NVarChar, value: email },
      phoneNo: { type: sql.NVarChar, value: phoneNo },
      address: { type: sql.NVarChar, value: address },
      amount: { type: sql.Decimal(18, 2), value: parseFloat(amount) },
      bankName: { type: sql.NVarChar, value: bankName },
      accountNo: { type: sql.NVarChar, value: accountNo },
      ifscCode: { type: sql.NVarChar, value: ifscCode },
      comment: { type: sql.NVarChar, value: comment || null },
      createdBy: { type: sql.NVarChar, value: createdBy },
    });

    const supplierId = supplierResult.recordset[0].SupplierId;

    // Insert uploaded files into SupplierDocuments table
    if (uploadedFiles.length > 0) {
      for (const file of uploadedFiles) {
        const documentQuery = `
          INSERT INTO SupplierDocuments (SupplierId, DocumentUrl, PublicId, CreatedOn)
          VALUES (@supplierId, @documentUrl, @publicId, GETDATE())
        `;
        await executeQuery(documentQuery, {
          supplierId: { type: sql.Int, value: supplierId },
          documentUrl: { type: sql.NVarChar, value: file.fileUrl },
          publicId: { type: sql.NVarChar, value: file.publicId },
        });
      }
    }

    res.status(201).json({ success: true, message: 'Supplier added successfully', supplierId });
  } catch (err) {
    next(err);
  }
});

module.exports = router;