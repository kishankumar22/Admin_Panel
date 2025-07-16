const express = require('express');
const multer = require('multer');
const { sql, executeQuery } = require('../../config/db');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

// Configure multer for local storage
const localStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../public/uploads/ExpenseDocs');
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

// Serve static files from /ExpenseDocs
router.use('/ExpenseDocs', express.static(path.join(__dirname, '../../public/uploads/ExpenseDocs')));

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

    // Get SupplierId for this expense
    const expenseCheck = await executeQuery(
      'SELECT SupplierId FROM SupplierExpenses WHERE SuppliersExpenseID = @Id',
      { Id: { type: sql.Int, value: parseInt(id) } }
    );

    if (expenseCheck.recordset.length === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    const supplierId = expenseCheck.recordset[0].SupplierId;

    // Fetch only documents for this Supplier's expense
    const result = await executeQuery(
      `SELECT DocumentId, SupplierId, DocumentUrl, PublicId, CreatedOn, DocumentType, SuppliersExpenseID
       FROM SupplierDocuments
       WHERE SupplierId = @SupplierId
         AND SuppliersExpenseID = @SuppliersExpenseID
         AND DocumentType = 'ExpenseDocument'`,
      {
        SupplierId: { type: sql.Int, value: supplierId },
        SuppliersExpenseID: { type: sql.Int, value: parseInt(id) },
      }
    );

    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('Error fetching documents:', err);
    next(err);
  }
});

// POST expense (local file upload only)
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

    const expenseId = expenseResult.recordset[0].SuppliersExpenseID;

    // Process local file uploads
    const documentPromises = files.map(async (file) => {
      const documentUrl = `/ExpenseDocs/${file.filename}`;
      await executeQuery(
        `INSERT INTO SupplierDocuments 
           (SupplierId, SuppliersExpenseID, DocumentUrl, PublicId, DocumentType, CreatedOn)
         VALUES
           (@SupplierId, @SuppliersExpenseID, @DocumentUrl, @PublicId, @DocumentType, @CreatedOn)`,
        {
          SupplierId: { type: sql.Int, value: supplierIdNum },
          SuppliersExpenseID: { type: sql.Int, value: expenseId },
          DocumentUrl: { type: sql.NVarChar, value: documentUrl },
          PublicId: { type: sql.NVarChar, value: file.filename }, // Use filename as PublicId for local files
          DocumentType: { type: sql.NVarChar, value: 'ExpenseDocument' },
          CreatedOn: { type: sql.DateTime, value: currentDate },
        }
      );
    });

    await Promise.all(documentPromises);

    res.status(201).json({ message: 'Expense and documents saved successfully', expenseId });
  } catch (err) {
    console.error('Error saving expense:', err);
    next(err);
  }
});

// PUT expense (local file upload only)
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

    // Process local file uploads
    const documentPromises = files.map(async (file) => {
      const documentUrl = `/ExpenseDocs/${file.filename}`;
      await executeQuery(
        `INSERT INTO SupplierDocuments 
           (SupplierId, SuppliersExpenseID, DocumentUrl, PublicId, DocumentType, CreatedOn)
         VALUES
           (@SupplierId, @SuppliersExpenseID, @DocumentUrl, @PublicId, @DocumentType, @CreatedOn)`,
        {
          SupplierId: { type: sql.Int, value: parseInt(SupplierId || currentExpense.SupplierId) },
          SuppliersExpenseID: { type: sql.Int, value: parseInt(id) },
          DocumentUrl: { type: sql.NVarChar, value: documentUrl },
          PublicId: { type: sql.NVarChar, value: file.filename },
          DocumentType: { type: sql.NVarChar, value: 'ExpenseDocument' },
          CreatedOn: { type: sql.DateTime, value: new Date() },
        }
      );
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

    if (!ModifiedBy) {
      return res.status(400).json({ message: 'ModifiedBy is required' });
    }

    const expenseCheck = await executeQuery(
      'SELECT Deleted FROM SupplierExpenses WHERE SuppliersExpenseID = @Id',
      {
        Id: { type: sql.Int, value: parseInt(id) },
      }
    );

    if (expenseCheck.recordset.length === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    const currentDeleted = expenseCheck.recordset[0].Deleted;
    const newDeleted = !currentDeleted;

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

    res.status(200).json({ message: `Expense ${newDeleted ? 'deleted' : 'restored'} successfully`, newDeleted });
  } catch (err) {
    console.error('Error toggling expense:', err);
    next(err);
  }
});

// GET payment history for a specific supplier
// router.get('/expense/:supplierId/payments', async (req, res, next) => {
//   try {
//     const { supplierId } = req.params;
//     const { suppliersExpenseID } = req.query;

//     if (!supplierId || isNaN(parseInt(supplierId))) {
//       return res.status(400).json({ success: false, message: 'Invalid supplier ID' });
//     }
//     if (!suppliersExpenseID || isNaN(parseInt(suppliersExpenseID))) {
//       return res.status(400).json({ success: false, message: 'Invalid suppliers expense ID' });
//     }

//     const query = `
//       SELECT ExpensePaymentID, SuppliersExpenseID, PaidAmount, PaymentMode, TransactionId, PaymentDate, Comment, PaymentImage, PaymentPublicId, CreatedBy, CreatedOn
//       FROM ExpensePayment
//       WHERE SupplierId = @supplierId AND SuppliersExpenseID = @suppliersExpenseID
//     `;
//     const result = await executeQuery(query, {
//       supplierId: { type: sql.Int, value: parseInt(supplierId) },
//       suppliersExpenseID: { type: sql.Int, value: parseInt(suppliersExpenseID) },
//     });

//     res.status(200).json(result.recordset);
//   } catch (err) {
//     next(err);
//   }
// });

// GET expense payments
router.get('/expense/:supplierId/payments', async (req, res, next) => {
  try {
    const { supplierId } = req.params;
    const { suppliersExpenseID } = req.query;

    if (!supplierId || isNaN(parseInt(supplierId))) {
      return res.status(400).json({ success: false, message: 'Invalid supplier ID' });
    }
    if (!suppliersExpenseID || isNaN(parseInt(suppliersExpenseID))) {
      return res.status(400).json({ success: false, message: 'Invalid suppliers expense ID' });
    }

    const query = `
      SELECT ExpensePaymentID, SuppliersExpenseID, PaidAmount, PaymentMode, TransactionId, PaymentDate, Comment, PaymentImage, PaymentPublicId, CreatedBy, CreatedOn
      FROM ExpensePayment
      WHERE SupplierId = @supplierId AND SuppliersExpenseID = @suppliersExpenseID
    `;
    const result = await executeQuery(query, {
      supplierId: { type: sql.Int, value: parseInt(supplierId) },
      suppliersExpenseID: { type: sql.Int, value: parseInt(suppliersExpenseID) },
    });

    res.status(200).json(result.recordset);
  } catch (err) {
    next(err);
  }
});
// POST expense payment
// router.post('/expense/payment', upload.single('file'), async (req, res, next) => {
//   try {
//     const {
//       supplierId,
//       suppliersExpenseID,
//       paidAmount,
//       paymentMode,
//       transactionId,
//       paymentDate,
//       isApproved,
//       approveBy,
//       comment,
//       createdBy,
//     } = req.body;
//     const file = req.file;

//     // Validate required fields
//     if (!supplierId || !suppliersExpenseID || !paidAmount || !paymentMode || !paymentDate || !createdBy) {
//       return res.status(400).json({ success: false, message: 'All required fields must be provided' });
//     }

//     // Require transactionId only for non-Cash payments
//     if (paymentMode !== 'Cash' && !transactionId) {
//       return res.status(400).json({ success: false, message: 'Transaction ID is required for non-cash payments' });
//     }

//     // Fetch current supplier details
//     const supplierQuery = `
//       SELECT *
//       FROM Suppliers
//       WHERE SupplierId = @supplierId AND Deleted = 0
//     `;
//     const supplierResult = await executeQuery(supplierQuery, {
//       supplierId: { type: sql.Int, value: parseInt(supplierId) },
//     });

//     if (!supplierResult.recordset.length) {
//       return res.status(404).json({ success: false, message: 'Supplier not found' });
//     }

//     const currentAmount = parseFloat(supplierResult.recordset[0].Amount);
//     const paymentAmount = parseFloat(paidAmount);

//     // Fetch total paid amount for this supplier to calculate remaining amount
//     const paymentHistoryQuery = `
//       SELECT SUM(PaidAmount) AS TotalPaidAmount
//       FROM ExpensePayment
//       WHERE SupplierId = @supplierId
//     `;
//     const paymentHistoryResult = await executeQuery(paymentHistoryQuery, {
//       supplierId: { type: sql.Int, value: parseInt(supplierId) },
//     });

//     const totalPaidAmount = parseFloat(paymentHistoryResult.recordset[0].TotalPaidAmount) || 0;
//     const remainingAmount = currentAmount - totalPaidAmount;

//     if (paymentAmount > remainingAmount) {
//       return res.status(400).json({ success: false, message: 'Payment amount exceeds remaining amount' });
//     }

//     // Upload file to local storage if provided
//     let fileUrl = null;
//     let publicId = null;
//     if (file) {
//       fileUrl = `/ExpenseDocs/${file.filename}`;
//       publicId = file.filename;
//     }

//     // Insert payment into ExpensePayment table
//     const paymentQuery = `
//       INSERT INTO ExpensePayment (
//         SupplierId, SuppliersExpenseID, PaidAmount, PaymentMode, TransactionId, PaymentDate, 
//         IsApproved, ApproveBy, Comment, PaymentImage, PaymentPublicId, 
//         CreatedBy, CreatedOn
//       )
//       VALUES (
//         @supplierId, @suppliersExpenseID, @paidAmount, @paymentMode, @transactionId, @paymentDate, 
//         @isApproved, @approveBy, @comment, @paymentImage, @paymentPublicId, 
//         @createdBy, GETDATE()
//       )
//     `;
//     await executeQuery(paymentQuery, {
//       supplierId: { type: sql.Int, value: parseInt(supplierId) },
//       suppliersExpenseID: { type: sql.Int, value: parseInt(suppliersExpenseID) },
//       paidAmount: { type: sql.Decimal(18, 2), value: paymentAmount },
//       paymentMode: { type: sql.NVarChar, value: paymentMode },
//       transactionId: { type: sql.NVarChar, value: paymentMode === 'Cash' ? '' : transactionId },
//       paymentDate: { type: sql.Date, value: paymentDate },
//       isApproved: { type: sql.Bit, value: isApproved === 'true' ? 1 : 0 },
//       approveBy: { type: sql.NVarChar, value: approveBy || null },
//       comment: { type: sql.NVarChar, value: comment || null },
//       paymentImage: { type: sql.NVarChar, value: fileUrl || null },
//       paymentPublicId: { type: sql.NVarChar, value: publicId || null },
//       createdBy: { type: sql.NVarChar, value: createdBy },
//     });

//     res.status(201).json({ success: true, message: 'Payment processed successfully' });
//   } catch (err) {
//     next(err);
//   }
// });
// POST expense payment
router.post('/expense/payment', upload.single('file'), async (req, res, next) => {
  try {
    const {
      supplierId,
      suppliersExpenseID,
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
    if (!supplierId || !suppliersExpenseID || !paidAmount || !paymentMode || !paymentDate || !createdBy) {
      return res.status(400).json({ success: false, message: 'All required fields must be provided' });
    }

    // Require transactionId only for non-Cash payments
    if (paymentMode !== 'Cash' && !transactionId) {
      return res.status(400).json({ success: false, message: 'Transaction ID is required for non-cash payments' });
    }

    // Fetch current supplier details
    const supplierQuery = `
      SELECT *
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

    // Upload file to local storage if provided
    let fileUrl = null;
    let publicId = null;
    if (file) {
      fileUrl = `/ExpenseDocs/${file.filename}`;
      publicId = file.filename;
    }

    // Insert payment into ExpensePayment table
    const paymentQuery = `
      INSERT INTO ExpensePayment (
        SupplierId, SuppliersExpenseID, PaidAmount, PaymentMode, TransactionId, PaymentDate, 
        IsApproved, ApproveBy, Comment, PaymentImage, PaymentPublicId, 
        CreatedBy, CreatedOn
      )
      VALUES (
        @supplierId, @suppliersExpenseID, @paidAmount, @paymentMode, @transactionId, @paymentDate, 
        @isApproved, @approveBy, @comment, @paymentImage, @paymentPublicId, 
        @createdBy, GETDATE()
      )
    `;
    await executeQuery(paymentQuery, {
      supplierId: { type: sql.Int, value: parseInt(supplierId) },
      suppliersExpenseID: { type: sql.Int, value: parseInt(suppliersExpenseID) },
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

// DELETE document (local file deletion)
// DELETE document (local file deletion)
router.delete('/documents/:publicId', async (req, res, next) => {
  const { publicId } = req.params;
  console.log(`[DELETE] Starting deletion for PublicId: ${publicId}`);

  try {
    // 1. Verify document exists in database
    console.log('[DELETE] Checking database...');
    const docQuery = await executeQuery(
      `SELECT DocumentId, DocumentUrl, PublicId 
       FROM SupplierDocuments 
       WHERE PublicId = @PublicId`,
      { PublicId: { type: sql.NVarChar, value: publicId } }
    );

    if (docQuery.recordset.length === 0) {
      console.log('[DELETE] Document not found in database');
      return res.status(404).json({ 
        success: false,
        message: 'Document not found in database'
      });
    }

    const document = docQuery.recordset[0];
    console.log('[DELETE] Document found in database:', document);

    // 2. Prepare local file path
    const basePath = 'C:/Users/Windows/Desktop/JK Consultancy/server/public/uploads/ExpenseDocs';
    const filePath = path.join(basePath, publicId);
    console.log(`[DELETE] Full file path: ${filePath}`);

    // 3. Debug directory contents
    console.log('[DELETE] Listing directory contents...');
    try {
      const files = await fs.readdir(basePath);
      console.log('[DELETE] Files in directory:', files);
      const fileExists = files.includes(publicId);
      console.log(`[DELETE] File exists: ${fileExists}`);
      
      if (!fileExists) {
        console.warn('[DELETE] Warning: File not found in directory but exists in database');
      }
    } catch (dirErr) {
      console.error('[DELETE] Error reading directory:', dirErr);
    }

    // 4. Delete local file
    console.log('[DELETE] Attempting file deletion...');
    try {
      await fs.access(filePath);
      await fs.unlink(filePath);
      console.log('[DELETE] File successfully deleted from local storage');
    } catch (fileErr) {
      if (fileErr.code === 'ENOENT') {
        console.warn('[DELETE] File not found in local storage (may have been already deleted)');
      } else {
        console.error('[DELETE] File deletion error:', fileErr);
        throw fileErr;
      }
    }

    // 5. Delete database record
    console.log('[DELETE] Deleting database record...');
    await executeQuery(
      `DELETE FROM SupplierDocuments WHERE PublicId = @PublicId`,
      { PublicId: { type: sql.NVarChar, value: publicId } }
    );
    console.log('[DELETE] Database record deleted');

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully',
      details: {
        publicId: publicId,
        localPath: filePath,
        dbRecordDeleted: true,
        fileDeleted: true
      }
    });

  } catch (err) {
    console.error('[DELETE] Process failed:', err);
    res.status(500).json({
      success: false,
      message: 'Document deletion failed',
      error: err.message,
      publicId: publicId
    });
  }
});

module.exports = router;
