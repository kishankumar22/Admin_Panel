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

// GET payment history for a specific supplier
router.get('/supplier/:supplierId/payments', async (req, res, next) => {
  try {
    const { supplierId } = req.params;
    const query = `
      SELECT SPId, PaidAmount, PaymentMode, TransactionId, PaymentDate, Comment, PaymentImage, PaymentPublicId, CreatedBy, CreatedOn
      FROM SupplierPayment
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

// POST Add Supplier Payment
router.post('/supplier/payment', upload.single('file'), async (req, res, next) => {
  try {
    const {
      supplierId,
      paidAmount,
      paymentMode,
      transactionId,
      paymentDate,
      isApproved,
      approveBy,
      comment,
      createdBy,
    } = req.body;
    const file = req.file;

    // Validate required fields
    if (!supplierId || !paidAmount || !paymentMode || !transactionId || !paymentDate || !createdBy) {
      return res.status(400).json({ success: false, message: 'All required fields must be provided' });
    }

    // Fetch current supplier details
    const supplierQuery = `
      SELECT Amount
      FROM Suppliers
      WHERE SupplierId = @supplierId AND Deleted = 0
    `;
    const supplierResult = await executeQuery(supplierQuery, {
      supplierId: { type: sql.Int, value: parseInt(supplierId) },
    });

    if (!supplierResult.recordset.length) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const currentAmount = parseFloat(supplierResult.recordset[0].Amount);
    const paymentAmount = parseFloat(paidAmount);

    // Fetch total paid amount for this supplier to calculate remaining amount
    const paymentHistoryQuery = `
      SELECT SUM(PaidAmount) AS TotalPaidAmount
      FROM SupplierPayment
      WHERE SupplierId = @supplierId
    `;
    const paymentHistoryResult = await executeQuery(paymentHistoryQuery, {
      supplierId: { type: sql.Int, value: parseInt(supplierId) },
    });

    const totalPaidAmount = parseFloat(paymentHistoryResult.recordset[0].TotalPaidAmount) || 0;
    const remainingAmount = currentAmount - totalPaidAmount;

    if (paymentAmount > remainingAmount) {
      return res.status(400).json({ success: false, message: 'Payment amount exceeds remaining amount' });
    }

    // Upload file to Cloudinary if provided
    let fileUrl = null;
    let publicId = null;
    if (file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: 'auto', folder: 'SupplierPayments' },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        stream.end(file.buffer);
      });
      fileUrl = uploadResult.secure_url;
      publicId = uploadResult.public_id;
    }

    // Insert payment into SupplierPayment table
    const paymentQuery = `
      INSERT INTO SupplierPayment (
        SupplierId, PaidAmount, PaymentMode, TransactionId, PaymentDate, 
        IsApproved, ApproveBy, Comment, PaymentImage, PaymentPublicId, 
        CreatedBy, CreatedOn
      )
      VALUES (
        @supplierId, @paidAmount, @paymentMode, @transactionId, @paymentDate, 
        @isApproved, @approveBy, @comment, @paymentImage, @paymentPublicId, 
        @createdBy, GETDATE()
      )
    `;
    await executeQuery(paymentQuery, {
      supplierId: { type: sql.Int, value: parseInt(supplierId) },
      paidAmount: { type: sql.Decimal(18, 2), value: paymentAmount },
      paymentMode: { type: sql.NVarChar, value: paymentMode },
      transactionId: { type: sql.NVarChar, value: transactionId },
      paymentDate: { type: sql.Date, value: paymentDate },
      isApproved: { type: sql.Bit, value: isApproved === 'true' ? 1 : 0 },
      approveBy: { type: sql.NVarChar, value: approveBy || null },
      comment: { type: sql.NVarChar, value: comment || null },
      paymentImage: { type: sql.NVarChar, value: fileUrl || null },
      paymentPublicId: { type: sql.NVarChar, value: publicId || null },
      createdBy: { type: sql.NVarChar, value: createdBy },
    });

    res.status(201).json({ success: true, message: 'Payment processed successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;