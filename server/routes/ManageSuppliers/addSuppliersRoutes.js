const express = require('express');
const multer = require('multer');
const cloudinary = require('../../config/cloudinaryConfig');
const { sql, executeQuery } = require('../../config/db');
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET all suppliers
router.get('/suppliers', async (req, res, next) => {
  try {
    const result = await executeQuery('SELECT * FROM Suppliers');
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
      SELECT DocumentId, SupplierId, DocumentUrl, PublicId, DocumentType,CreatedOn
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

// DELETE document by PublicId
router.delete('/documents/:publicId', async (req, res, next) => {
  try {
    const { publicId } = req.params;
    console.log('Deleting document with PublicId:', publicId);

    // Check if document exists
    const documentCheck = await executeQuery(
      'SELECT DocumentId FROM SupplierDocuments WHERE PublicId = @PublicId',
      {
        PublicId: { type: sql.NVarChar, value: publicId },
      }
    );

    if (documentCheck.recordset.length === 0) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(publicId);

    // Delete from SupplierDocuments
    await executeQuery(
      'DELETE FROM SupplierDocuments WHERE PublicId = @PublicId',
      {
        PublicId: { type: sql.NVarChar, value: publicId },
      }
    );

    console.log('Document deleted successfully');
    res.status(200).json({ message: 'Document deleted successfully' });
  } catch (err) {
    console.error('Error deleting document:', err);
    next(err);
  }
});

// PUT update supplier
router.put('/supplier/:id', upload.array('files'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, phoneNo, address, amount, bankName, accountNo, ifscCode, comment, modifiedBy } = req.body;
    const files = req.files;

    // Validate required fields
    if (!modifiedBy) {
      return res.status(400).json({ success: false, message: 'ModifiedBy field is required' });
    }

    // Check if supplier exists
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

    // Prepare dynamic updates
    const updates = [];
    const params = {
      SupplierId: { type: sql.Int, value: parseInt(id) },
      ModifiedBy: { type: sql.NVarChar, value: modifiedBy },
      ModifiedOn: { type: sql.DateTime, value: new Date() },
    };

    // Field validation and update preparation
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

    if (amount) {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum < 0) {
        return res.status(400).json({ success: false, message: 'Amount must be a valid positive number' });
      }
      if (amountNum !== currentSupplier.Amount) {
        updates.push('Amount = @Amount');
        params.Amount = { type: sql.Decimal(18, 2), value: amountNum };
      }
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

    // Update supplier if there are changes
    if (updates.length > 0) {
      const updateQuery = `
        UPDATE Suppliers
        SET ${updates.join(', ')}, ModifiedBy = @ModifiedBy, ModifiedOn = @ModifiedOn
        WHERE SupplierId = @SupplierId
      `;
      await executeQuery(updateQuery, params);
    }

    // Handle file uploads
    if (files && files.length > 0) {
      for (const file of files) {
        // Upload to Cloudinary
        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { 
              resource_type: 'auto',
              folder: 'Supplier',
              allowed_formats: ['jpg', 'png', 'pdf', 'jpeg', 'doc', 'docx']
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          stream.end(file.buffer);
        });

        // Insert into SupplierDocuments with DocumentType
        await executeQuery(
          `INSERT INTO SupplierDocuments 
           (SupplierId, DocumentUrl, PublicId, DocumentType, CreatedOn) 
           VALUES (@SupplierId, @DocumentUrl, @PublicId, @DocumentType, @CreatedOn)`,
          {
            SupplierId: { type: sql.Int, value: parseInt(id) },
            DocumentUrl: { type: sql.NVarChar, value: result.secure_url },
            PublicId: { type: sql.NVarChar, value: result.public_id },
            DocumentType: { type: sql.NVarChar, value: 'SupplierDocument' },
            CreatedOn: { type: sql.DateTime, value: new Date() },
          }
        );
      }
    }

    res.status(200).json({ 
      success: true, 
      message: 'Supplier updated successfully',
      supplierId: id
    });

  } catch (err) {
    console.error('Error updating supplier:', err);
    
    // Delete any uploaded files if error occurred
    if (req.files?.length > 0) {
      try {
        for (const file of req.files) {
          if (file.public_id) {
            await cloudinary.uploader.destroy(file.public_id);
          }
        }
      } catch (cloudinaryErr) {
        console.error('Error cleaning up Cloudinary uploads:', cloudinaryErr);
      }
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update supplier',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
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

    res.status(200).json({ message: `Supplier ${newDeleted ? 'deleted' : 'restored'} successfully`, newDeleted });
  } catch (err) {
    console.error('Error toggling supplier:', err);
    res.status(500).json({ message: 'Failed to toggle supplier' });
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
    if (!supplierId || !paidAmount || !paymentMode || !paymentDate || !createdBy) {
      return res.status(400).json({ success: false, message: 'All required fields must be provided' });
    }

    // If payment mode is not Cash, transactionId is required
    if (paymentMode !== 'Cash' && !transactionId) {
      return res.status(400).json({ success: false, message: 'Transaction ID is required for non-cash payments' });
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
      transactionId: { type: sql.NVarChar, value: paymentMode === 'Cash' ? null : transactionId },
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
// GET all expenses with supplier details
router.get('/suppliers', async (req, res, next) => {
  try {
    const result = await executeQuery('SELECT * FROM Suppliers WHERE Deleted = 0', {});
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('Error fetching suppliers:', err);
    next(err);
  }
});

// GET all expenses with supplier details
router.get('/expenses', async (req, res, next) => {
  try {
    const result = await executeQuery(
      `SELECT 
        se.SuppliersExpenseID,
        se.SupplierId,
        s.Name AS SupplierName,
        s.Email AS SupplierEmail,
        s.PhoneNo AS SupplierPhone,
        se.Reason,
        se.Amount,
        se.Deleted,
        se.CreatedOn,
        se.CreatedBy,
        se.ModifiedBy,
        se.ModifiedOn
      FROM SupplierExpenses se
      INNER JOIN Suppliers s ON se.SupplierId = s.SupplierId
      WHERE s.Deleted = 0`,
      {}
    );
    // console.log('Fetched expenses:', result.recordset.length);
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('Error fetching expenses:', err);
    next(err);
  }
});

// GET documents for an expense's SupplierId
router.get('/expenses/:id/documents', async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log('Fetching documents for expense ID:', id);

    // Get SupplierId from SupplierExpenses
    const expenseCheck = await executeQuery(
      'SELECT SupplierId FROM SupplierExpenses WHERE SuppliersExpenseID = @Id',
      {
        Id: { type: sql.Int, value: parseInt(id) },
      }
    );

    if (expenseCheck.recordset.length === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    const supplierId = expenseCheck.recordset[0].SupplierId;

    // Fetch documents
    const result = await executeQuery(
      'SELECT DocumentId, DocumentUrl, PublicId, CreatedOn FROM SupplierDocuments WHERE SupplierId = @SupplierId',
      {
        SupplierId: { type: sql.Int, value: supplierId },
      }
    );

    console.log('Fetched documents:', result.recordset);
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('Error fetching documents:', err);
    next(err);
  }
});

// POST expense
router.post('/expenses', upload.array('files'), async (req, res, next) => {
  try {
    const { SupplierId, Reason, Amount, CreatedBy } = req.body;
    const files = req.files || [];

    console.log('Received POST request body:', { SupplierId, Reason, Amount, CreatedBy });
    console.log('Received files:', files.length);

    // Validate required fields
    if (!SupplierId || !Reason || !Amount || !CreatedBy) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate SupplierId
    const supplierIdNum = parseInt(SupplierId);
    if (isNaN(supplierIdNum)) {
      return res.status(400).json({ message: 'SupplierId must be a valid number' });
    }

    // Validate Amount
    const amountNum = parseFloat(Amount);
    if (isNaN(amountNum)) {
      return res.status(400).json({ message: 'Amount must be a valid number' });
    }

    // Check if SupplierId exists and is not deleted
    const supplierCheck = await executeQuery(
      'SELECT SupplierId FROM Suppliers WHERE SupplierId = @SupplierId AND Deleted = 0',
      {
        SupplierId: { type: sql.Int, value: supplierIdNum },
      }
    );

    console.log('Supplier check result:', supplierCheck.recordset);

    if (supplierCheck.recordset.length === 0) {
      return res.status(400).json({ message: 'Invalid SupplierId' });
    }

    // Insert the expense
    const currentDate = new Date();
    const expenseResult = await executeQuery(
      `INSERT INTO SupplierExpenses (SupplierId, Reason, Amount, Deleted, CreatedOn, CreatedBy)
       OUTPUT INSERTED.SuppliersExpenseID
       VALUES (@SupplierId, @Reason, @Amount, 0, @CreatedOn, @CreatedBy)`,
      {
        SupplierId: { type: sql.Int, value: supplierIdNum },
        Reason: { type: sql.NVarChar, value: Reason },
        Amount: { type: sql.Decimal(18, 2), value: amountNum },
        CreatedOn: { type: sql.DateTime, value: currentDate },
        CreatedBy: { type: sql.NVarChar, value: CreatedBy },
      }
    );

    console.log('Expense insert result:', expenseResult.recordset);

    const expenseId = expenseResult.recordset[0].SuppliersExpenseID;

    // Process file uploads and insert into SupplierDocuments with DocumentType
    const documentPromises = files.map(async (file) => {
      try {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'suppliers', resource_type: 'auto' },
          async (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              throw new Error('Failed to upload file to Cloudinary');
            }

            console.log('Cloudinary upload result:', { url: result.secure_url, publicId: result.public_id });

            // Insert document with DocumentType set to 'ExpenseDocument'
            await executeQuery(
              `INSERT INTO SupplierDocuments (SupplierId, DocumentUrl, PublicId, DocumentType, CreatedOn)
               VALUES (@SupplierId, @DocumentUrl, @PublicId, @DocumentType, @CreatedOn)`,
              {
                SupplierId: { type: sql.Int, value: supplierIdNum },
                DocumentUrl: { type: sql.NVarChar, value: result.secure_url },
                PublicId: { type: sql.NVarChar, value: result.public_id },
                DocumentType: { type: sql.NVarChar, value: 'ExpenseDocument' }, // Default value
                CreatedOn: { type: sql.DateTime, value: currentDate },
              }
            );
          }
        );

        const bufferStream = require('stream').Readable.from(file.buffer);
        bufferStream.pipe(uploadStream);
      } catch (err) {
        console.error('Error processing file:', err);
        throw err;
      }
    });

    await Promise.all(documentPromises);

    res.status(201).json({ message: 'Expense and documents saved successfully', expenseId });
  } catch (err) {
    console.error('Error saving expense:', err);
    next(err);
  }
});

// PUT expense (update specific fields)
router.put('/expenses/:id', upload.array('files'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { SupplierId, Reason, Amount, ModifiedBy } = req.body;
    const files = req.files || [];

    console.log('Received PUT request body:', { id, SupplierId, Reason, Amount, ModifiedBy });
    console.log('Received files:', files.length);

    // Check if the expense exists and is not deleted
    const expenseCheck = await executeQuery(
      'SELECT SupplierId, Reason, Amount FROM SupplierExpenses WHERE SuppliersExpenseID = @Id AND Deleted = 0',
      {
        Id: { type: sql.Int, value: parseInt(id) },
      }
    );

    if (expenseCheck.recordset.length === 0) {
      return res.status(404).json({ message: 'Expense not found or deleted' });
    }

    const currentExpense = expenseCheck.recordset[0];

    const updates = [];
    const params = {
      Id: { type: sql.Int, value: parseInt(id) },
      ModifiedOn: { type: sql.DateTime, value: new Date() },
      ModifiedBy: { type: sql.NVarChar, value: ModifiedBy || 'admin' },
    };

    // Validate and prepare updates for SupplierId
    if (SupplierId && SupplierId !== currentExpense.SupplierId.toString()) {
      const supplierIdNum = parseInt(SupplierId);
      if (isNaN(supplierIdNum)) {
        return res.status(400).json({ message: 'SupplierId must be a valid number' });
      }
      const supplierCheck = await executeQuery(
        'SELECT SupplierId FROM Suppliers WHERE SupplierId = @SupplierId AND Deleted = 0',
        {
          SupplierId: { type: sql.Int, value: supplierIdNum },
        }
      );
      if (supplierCheck.recordset.length === 0) {
        return res.status(400).json({ message: 'Invalid SupplierId' });
      }
      updates.push('SupplierId = @SupplierId');
      params.SupplierId = { type: sql.Int, value: supplierIdNum };
    }

    // Validate and prepare updates for Reason
    if (Reason && Reason !== currentExpense.Reason) {
      updates.push('Reason = @Reason');
      params.Reason = { type: sql.NVarChar, value: Reason };
    }

    // Validate and prepare updates for Amount
    if (Amount && parseFloat(Amount) !== currentExpense.Amount) {
      const amountNum = parseFloat(Amount);
      if (isNaN(amountNum)) {
        return res.status(400).json({ message: 'Amount must be a valid number' });
      }
      updates.push('Amount = @Amount');
      params.Amount = { type: sql.Decimal(18, 2), value: amountNum };
    }

    // If no updates and no files, return early
    if (updates.length === 0 && files.length === 0) {
      return res.status(200).json({ message: 'No changes detected' });
    }

    // Perform the update if there are changes
    if (updates.length > 0) {
      const updateQuery = `
        UPDATE SupplierExpenses
        SET ${updates.join(', ')}, ModifiedBy = @ModifiedBy, ModifiedOn = @ModifiedOn
        WHERE SuppliersExpenseID = @Id AND Deleted = 0
      `;
      await executeQuery(updateQuery, params);
    }

    // Process file uploads and insert into SupplierDocuments with DocumentType
    const documentPromises = files.map(async (file) => {
      try {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'suppliers', resource_type: 'auto' },
          async (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              throw new Error('Failed to upload file to Cloudinary');
            }

            console.log('Cloudinary upload result:', { url: result.secure_url, publicId: result.public_id });

            // Insert document with DocumentType set to 'ExpenseDocument'
            await executeQuery(
              `INSERT INTO SupplierDocuments (SupplierId, DocumentUrl, PublicId, DocumentType, CreatedOn)
               VALUES (@SupplierId, @DocumentUrl, @PublicId, @DocumentType, @CreatedOn)`,
              {
                SupplierId: { type: sql.Int, value: parseInt(SupplierId || currentExpense.SupplierId) },
                DocumentUrl: { type: sql.NVarChar, value: result.secure_url },
                PublicId: { type: sql.NVarChar, value: result.public_id },
                DocumentType: { type: sql.NVarChar, value: 'ExpenseDocument' }, // Default value
                CreatedOn: { type: sql.DateTime, value: new Date() },
              }
            );
          }
        );

        const bufferStream = require('stream').Readable.from(file.buffer);
        bufferStream.pipe(uploadStream);
      } catch (err) {
        console.error('Error processing file:', err);
        throw err;
      }
    });

    await Promise.all(documentPromises);

    res.status(200).json({ message: 'Expense updated successfully' });
  } catch (err) {
    console.error('Error updating expense:', err);
    next(err);
  }
});

// PATCH expense to toggle Deleted status
router.patch('/expenses/:id/toggle', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { ModifiedBy } = req.body;

    console.log('Received PATCH request:', { id, ModifiedBy });

    if (!ModifiedBy) {
      return res.status(400).json({ message: 'ModifiedBy is required' });
    }

    const expenseCheck = await executeQuery(
      'SELECT Deleted FROM SupplierExpenses WHERE SuppliersExpenseID = @Id',
      {
        Id: { type: sql.Int, value: parseInt(id) },
      }
    );

    console.log('Expense check result:', expenseCheck.recordset);

    if (expenseCheck.recordset.length === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    const currentDeleted = expenseCheck.recordset[0].Deleted;
    const newDeleted = !currentDeleted;

    console.log(`Toggling Deleted from ${currentDeleted} to ${newDeleted} for expense ID ${id}`);

    const updateResult = await executeQuery(
      `UPDATE SupplierExpenses
       SET Deleted = @Deleted, ModifiedBy = @ModifiedBy, ModifiedOn = @ModifiedOn
       WHERE SuppliersExpenseID = @Id`,
      {
        Id: { type: sql.Int, value: parseInt(id) },
        Deleted: { type: sql.Bit, value: newDeleted },
        ModifiedBy: { type: sql.NVarChar, value: ModifiedBy },
        ModifiedOn: { type: sql.DateTime, value: new Date() },
      }
    );

    console.log('Update result:', updateResult);

    res.status(200).json({ message: `Expense ${newDeleted ? 'deleted' : 'restored'} successfully`, newDeleted });
  } catch (err) {
    console.error('Error toggling expense:', err);
    next(err);
  }
});



//// GET payment history for a specific supplier
router.get('/expense/:supplierId/payments', async (req, res, next) => {
  try {
    const { supplierId } = req.params;
    if (!supplierId || isNaN(parseInt(supplierId))) {
      return res.status(400).json({ success: false, message: 'Invalid supplier ID' });
    }
    const query = `
      SELECT ExpensePaymentID, PaidAmount, PaymentMode, TransactionId, PaymentDate, Comment, PaymentImage, PaymentPublicId, CreatedBy, CreatedOn
      FROM ExpensePayment
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

// POST expense payment
// POST expense payment
router.post('/expense/payment', upload.single('file'), async (req, res, next) => {
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
    if (!supplierId || !paidAmount || !paymentMode || !paymentDate || !createdBy) {
      return res.status(400).json({ success: false, message: 'All required fields must be provided' });
    }

    // Require transactionId only for non-Cash payments
    if (paymentMode !== 'Cash' && !transactionId) {
      return res.status(400).json({ success: false, message: 'Transaction ID is required for non-cash payments' });
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
      FROM ExpensePayment
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
          { resource_type: 'auto', folder: 'ExpensePayments' },
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

    // Insert payment into ExpensePayment table
    const paymentQuery = `
      INSERT INTO ExpensePayment (
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
      transactionId: { type: sql.NVarChar, value: paymentMode === 'Cash' ? '' : transactionId },
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