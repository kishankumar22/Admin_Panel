const express = require('express');
const multer = require('multer');
const uploadToCloudinary = require('../../utils/cloudinaryUpload');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const PDFDocument = require('pdfkit');
const { sql, poolConnect, executeQuery } = require('../../config/db');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

// Configure Multer for in-memory storage (for Cloudinary) and disk storage (for local)
const cloudinaryStorage = multer.memoryStorage();
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../public/uploads/StudentPayment');
    fs.mkdir(uploadPath, { recursive: true })
      .then(() => cb(null, uploadPath))
      .catch((err) => cb(err));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});
const upload = multer({ storage: localStorage }); // Default to local storag

// GET /colleges - Fetch all colleges
router.get('/colleges', async (req, res, next) => {
  try {
    const query = `
      SELECT id, collegeName
      FROM College
      WHERE status = 1
      ORDER BY id ASC
    `;
    const result = await executeQuery(query);
    res.status(200).json(result.recordset);
  } catch (err) {
    // console.error('Error fetching colleges:', error);
        next(err);
    res.status(500).json({ success: false, message: 'Error fetching colleges', error: err.message });
  }
});

// GET /courses - Fetch all courses
  router.get('/courses', async (req, res, next) => {
    try {
      const query = `
        SELECT id, courseName, courseDuration
        FROM Course
        WHERE status = 1
        ORDER BY id ASC
      `;
      const result = await executeQuery(query);
      res.status(200).json(result.recordset);
    } catch (err) {
      // console.error('Error fetching courses:', error);
          next(err);
      res.status(500).json({ success: false, message: 'Error fetching courses', error: error.message });
    }
  });

// POST /students - Create a new student with academic details and EMI details
router.post(
  '/students',
  upload.fields([
    { name: 'StudentImage' },
    { name: 'CasteCertificate' },
    { name: 'TenthMarks' },
    { name: 'TwelfthMarks' },
    { name: 'Residential' },
    { name: 'Income' },
  ]),
  async (req, res, next) => {
    try {
      const {
        RollNumber,
        FName,
        LName,
        DOB,
        Gender,
        MobileNumber,
        AlternateNumber,
        EmailId,
        FatherName,
        FatherMobileNumber,
        MotherName,
        Address,
        City,
        State,
        Pincode,
        CourseId,
        CourseYear,
        Category,
        LedgerNumber,
        CollegeId,
        AdmissionMode,
        AdmissionDate,
        IsDiscontinue,
        DiscontinueOn,
        DiscontinueBy,
        FineAmount,
        RefundAmount,
        CreatedBy,
        SessionYear,
        PaymentMode,
        NumberOfEMI,
        isLateral,
      } = req.body;

      // console.log('Request Body:', req.body);

      // Parse EMI details
      const emiDetails = [];
      let totalEMIAmount = 0;
      if (PaymentMode === 'EMI' && NumberOfEMI) {
        let index = 0;
        while (req.body[`emiDetails[${index}].emiNumber`]) {
          const emiNumber = parseInt(req.body[`emiDetails[${index}].emiNumber`]) || index + 1;
          const amount = parseFloat(req.body[`emiDetails[${index}].amount`]) || 0;
          const date = req.body[`emiDetails[${index}].date`];

          console.log(`EMI ${index + 1}:`, { emiNumber, amount, date });

          if (amount > 0 && date) {
            emiDetails.push({
              emiNumber,
              amount,
              dueDate: new Date(date),
              createdBy: CreatedBy,
            });
            totalEMIAmount += amount;
          }
          index++;
        }
      }

      // console.log('Parsed EMI Details:', emiDetails);

      // Validate CollegeId
      if (!CollegeId || CollegeId === '') {
        return res.status(400).json({ success: false, message: 'CollegeId is required' });
      }
      const collegeIdNum = parseInt(CollegeId);
      if (isNaN(collegeIdNum)) {
        return res.status(400).json({ success: false, message: 'CollegeId must be a valid number' });
      }
      const collegeQuery = `SELECT id FROM College WHERE id = @collegeId`;
      const collegeParams = { collegeId: { type: sql.Int, value: collegeIdNum } };
      const collegeResult = await executeQuery(collegeQuery, collegeParams);
      if (!collegeResult.recordset[0]) {
        return res.status(400).json({ success: false, message: 'Invalid CollegeId.' });
      }

      // Validate CourseId
      if (!CourseId || CourseId === '') {
        return res.status(400).json({ success: false, message: 'CourseId is required' });
      }
      const courseIdNum = parseInt(CourseId);
      if (isNaN(courseIdNum)) {
        return res.status(400).json({ success: false, message: 'CourseId must be a valid number' });
      }
      const courseQuery = `SELECT id FROM Course WHERE id = @courseId`;
      const courseParams = { courseId: { type: sql.Int, value: courseIdNum } };
      const courseResult = await executeQuery(courseQuery, courseParams);
      if (!courseResult.recordset[0]) {
        return res.status(400).json({ success: false, message: 'Invalid CourseId.' });
      }

      // Check for duplicate RollNumber
      const rollQuery = `SELECT id FROM Student WHERE rollNumber = @rollNumber`;
      const rollParams = { rollNumber: { type: sql.NVarChar, value: RollNumber } };
      const rollResult = await executeQuery(rollQuery, rollParams);
      if (rollResult.recordset[0]) {
        return res.status(400).json({ success: false, message: 'Roll Number already exists.' });
      }

      // Check for duplicate EmailId
      const emailQuery = `SELECT id FROM Student WHERE email = @email`;
      const emailParams = { email: { type: sql.NVarChar, value: EmailId } };
      const emailResult = await executeQuery(emailQuery, emailParams);
      if (emailResult.recordset[0]) {
        return res.status(400).json({ success: false, message: 'Email ID already exists.' });
      }

      // Validate admin amount + fees amount against EMI sum
      const adminAmount = parseFloat(FineAmount) || 0;
      const feesAmount = parseFloat(RefundAmount) || 0;
      const totalAmount = adminAmount + feesAmount;

      if (PaymentMode === 'EMI' && totalEMIAmount > 0 && totalEMIAmount > totalAmount) {
        return res.status(400).json({
          success: false,
          message: `The sum of total EMI (${totalEMIAmount}) is greater than sum of admin (${adminAmount}) and fees amount (${feesAmount})`,
        });
      }

      // Function to generate stdCollId base (without student ID)
   const generateStdCollIdBase = async (courseId, collegeId, admissionDate) => {
  // Fetch course and college details
  const courseQuery = `SELECT courseName FROM Course WHERE id = @courseId`;
  const courseParams = { courseId: { type: sql.Int, value: parseInt(courseId) } };
  const courseResult = await executeQuery(courseQuery, courseParams);
  const collegeQuery = `SELECT collegeName FROM College WHERE id = @collegeId`;
  const collegeParams = { collegeId: { type: sql.Int, value: parseInt(collegeId) } };
  const collegeResult = await executeQuery(collegeQuery, collegeParams);

  const course = courseResult.recordset[0];
  const college = collegeResult.recordset[0];

  // Step 1: Get course prefix (first 3 characters after removing spaces and dots)
  let courseName = course?.courseName || '';
  
  // Check if course name contains 'M' or 'm'
  const hasM = /[Mm]/.test(courseName);
  if (hasM) {
    // Remove "Of" (case-insensitive) and extra spaces
    courseName = courseName.replace(/\bOf\b/gi, '').replace(/\s+/g, ' ').trim();
  }
  
  const cleanedCourseName = courseName.replace(/[\s.]/g, '');
  const coursePrefix = cleanedCourseName.substring(0, 3).toUpperCase();

  // Step 2: Get college prefix (remove special characters and abbreviate)
  let collegeName = college?.collegeName || '';
  
  // Check if college name contains 'M' or 'm' for skipping "Of"
  const collegeHasM = /[Mm]/.test(collegeName);
  if (collegeHasM) {
    // Remove "Of" (case-insensitive) and extra spaces
    collegeName = collegeName.replace(/\bOf\b/gi, '').replace(/\s+/g, ' ').trim();
  }
  
  // Remove special characters except letters and numbers
  collegeName = collegeName.replace(/[^a-zA-Z0-9]/g, '');
  const collegeWords = collegeName.split(/(?=[A-Z])/);
  const collegePrefix =
    collegeWords.length > 1
      ? collegeWords[0] + collegeWords.slice(1).map(word => word[0]).join('')
      : collegeName.substring(0, 5).toUpperCase();

  // Step 3: Get year suffix from admission date
  const admissionYear = admissionDate ? new Date(admissionDate).getFullYear() : new Date().getFullYear();
  const yearSuffix = `${admissionYear.toString().slice(-2)}${(admissionYear + 1).toString().slice(-2)}`;

  // Step 4: Combine parts (without student ID)
  return `${coursePrefix}/${collegePrefix}/${yearSuffix}`;
};

      // Generate stdCollId base
      const stdCollIdBase = await generateStdCollIdBase(CourseId, CollegeId, AdmissionDate);

      // Upload documents to Cloudinary
      const documentsData = [];
      const uploadFile = async fieldName => {
        if (req.files[fieldName]?.[0]) {
          const uploadedFile = await uploadToCloudinary(req.files[fieldName][0].buffer, `student_documents/${fieldName}`);
          if (uploadedFile?.public_id && uploadedFile?.url) {
            documentsData.push({
              documentType: fieldName,
              publicId: uploadedFile.public_id,
              fileUrl: uploadedFile.url,
              fileName: req.files[fieldName][0].originalname,
              createdBy: CreatedBy,
            });
          }
        }
      };
      await Promise.all([
        uploadFile('StudentImage'),
        uploadFile('CasteCertificate'),
        uploadFile('TenthMarks'),
        uploadFile('TwelfthMarks'),
        uploadFile('Residential'),
        uploadFile('Income'),
      ]);

      // Create student, academic details, documents, and EMI details
      let newStudent;
      const pool = await poolConnect; // Use the existing poolConnect
      const transaction = new sql.Transaction(pool);
      try {
        await transaction.begin();

        const request = new sql.Request(transaction);

        // Create Student
        const studentQuery = `
          INSERT INTO Student (
            stdCollId, rollNumber, fName, lName, dob, gender, mobileNumber, alternateNumber,
            email, fatherName, fatherMobile, motherName, address, city, state, pincode,
            admissionMode, collegeId, courseId, admissionDate, studentImage, category,
            isDiscontinue, isLateral, discontinueOn, discontinueBy, createdBy, status
          )
          OUTPUT INSERTED.*
          VALUES (
            @stdCollId, @rollNumber, @fName, @lName, @dob, @gender, @mobileNumber, @alternateNumber,
            @email, @fatherName, @fatherMobile, @motherName, @address, @city, @state, @pincode,
            @admissionMode, @collegeId, @courseId, @admissionDate, @studentImage, @category,
            @isDiscontinue, @isLateral, @discontinueOn, @discontinueBy, @createdBy, @status
          )
        `;
        request.input('stdCollId', sql.NVarChar, stdCollIdBase);
        request.input('rollNumber', sql.NVarChar, RollNumber);
        request.input('fName', sql.NVarChar, FName);
        request.input('lName', sql.NVarChar, LName || null);
        request.input('dob', sql.Date, new Date(DOB));
        request.input('gender', sql.NVarChar, Gender);
        request.input('mobileNumber', sql.NVarChar, MobileNumber);
        request.input('alternateNumber', sql.NVarChar, AlternateNumber || null);
        request.input('email', sql.NVarChar, EmailId);
        request.input('fatherName', sql.NVarChar, FatherName);
        request.input('fatherMobile', sql.NVarChar, FatherMobileNumber || null);
        request.input('motherName', sql.NVarChar, MotherName);
        request.input('address', sql.NVarChar, Address);
        request.input('city', sql.NVarChar, City);
        request.input('state', sql.NVarChar, State);
        request.input('pincode', sql.NVarChar, Pincode);
        request.input('admissionMode', sql.NVarChar, AdmissionMode);
        request.input('collegeId', sql.Int, collegeIdNum);
        request.input('courseId', sql.Int, courseIdNum);
        request.input('admissionDate', sql.Date, new Date(AdmissionDate));
        request.input('studentImage', sql.NVarChar, documentsData.find(doc => doc.documentType === 'StudentImage')?.fileUrl || null);
        request.input('category', sql.NVarChar, Category);
        request.input('isDiscontinue', sql.Bit, IsDiscontinue === 'true');
        request.input('isLateral', sql.Bit, isLateral === 'true');
        request.input('discontinueOn', sql.Date, DiscontinueOn ? new Date(DiscontinueOn) : null);
        request.input('discontinueBy', sql.NVarChar, DiscontinueBy || null);
        request.input('createdBy', sql.NVarChar, CreatedBy);
        request.input('status', sql.Bit, true);

        const studentResult = await request.query(studentQuery);
        const student = studentResult.recordset[0];

        // Update stdCollId with student ID
        const finalStdCollId = `${stdCollIdBase}/${student.id}`;
        const updateStdCollIdQuery = `
          UPDATE Student
          SET stdCollId = @finalStdCollId
          WHERE id = @studentId
        `;
        const updateStdCollIdRequest = new sql.Request(transaction);
        updateStdCollIdRequest.input('finalStdCollId', sql.NVarChar, finalStdCollId);
        updateStdCollIdRequest.input('studentId', sql.Int, student.id);
        await updateStdCollIdRequest.query(updateStdCollIdQuery);

        // Create StudentAcademicDetails
        const academicQuery = `
          INSERT INTO StudentAcademicDetails (
            studentId, sessionYear, paymentMode, adminAmount, feesAmount, numberOfEMI,
            ledgerNumber, courseYear, createdBy
          )
          OUTPUT INSERTED.*
          VALUES (
            @studentId, @sessionYear, @paymentMode, @adminAmount, @feesAmount, @numberOfEMI,
            @ledgerNumber, @courseYear, @createdBy
          )
        `;
        const academicRequest = new sql.Request(transaction);
        academicRequest.input('studentId', sql.Int, student.id);
        academicRequest.input('sessionYear', sql.NVarChar, SessionYear);
        academicRequest.input('paymentMode', sql.NVarChar, PaymentMode);
        academicRequest.input('adminAmount', sql.Decimal(10, 2), adminAmount);
        academicRequest.input('feesAmount', sql.Decimal(10, 2), feesAmount);
        academicRequest.input('numberOfEMI', sql.Int, PaymentMode === 'EMI' ? parseInt(NumberOfEMI) || 0 : null);
        academicRequest.input('ledgerNumber', sql.NVarChar, LedgerNumber || null);
        academicRequest.input('courseYear', sql.NVarChar, CourseYear || null);
        academicRequest.input('createdBy', sql.NVarChar, CreatedBy);
        const academicResult = await academicRequest.query(academicQuery);
        const academicDetails = academicResult.recordset[0];

        // Create Documents
        for (const doc of documentsData) {
          const docQuery = `
            INSERT INTO Documents (
              studentId, documentType, publicId, fileUrl, fileName, createdBy
            )
            VALUES (
              @studentId, @documentType, @publicId, @fileUrl, @fileName, @createdBy
            )
          `;
          const docRequest = new sql.Request(transaction);
          docRequest.input('studentId', sql.Int, student.id);
          docRequest.input('documentType', sql.NVarChar, doc.documentType);
          docRequest.input('publicId', sql.NVarChar, doc.publicId);
          docRequest.input('fileUrl', sql.NVarChar, doc.fileUrl);
          docRequest.input('fileName', sql.NVarChar, doc.fileName);
          docRequest.input('createdBy', sql.NVarChar, doc.createdBy);
          await docRequest.query(docQuery);
        }

        // Create EMI Details if applicable
        if (PaymentMode === 'EMI' && emiDetails.length > 0) {
          for (const emi of emiDetails) {
            const emiQuery = `
              INSERT INTO EMIDetails (
                studentId, studentAcademicId, emiNumber, amount, dueDate, createdBy
              )
              VALUES (
                @studentId, @studentAcademicId, @emiNumber, @amount, @dueDate, @createdBy
              )
            `;
            const emiRequest = new sql.Request(transaction);
            emiRequest.input('studentId', sql.Int, student.id);
            emiRequest.input('studentAcademicId', sql.Int, academicDetails.id);
            emiRequest.input('emiNumber', sql.Int, emi.emiNumber);
            emiRequest.input('amount', sql.Decimal(10, 2), emi.amount);
            emiRequest.input('dueDate', sql.Date, emi.dueDate);
            emiRequest.input('createdBy', sql.NVarChar, emi.createdBy);
            await emiRequest.query(emiQuery);
          }
        }

        newStudent = { ...student, stdCollId: finalStdCollId };
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      } finally {
        // Do NOT close the global pool here; let it persist for other requests
      }

      res.status(201).json({ success: true, student: newStudent });
    } catch (err) {
      // console.error('Erreur lors de la création de l\'étudiant:', err.stack);
          next(err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

//EDIT STUDENT

router.put(
  '/students/:id',
  upload.fields([
    { name: 'StudentImage' },
    { name: 'CasteCertificate' },
    { name: 'TenthMarks' },
    { name: 'TwelfthMarks' },
    { name: 'Residential' },
    { name: 'Income' },
  ]),
  async (req, res, next) => {
    try {
      const studentId = parseInt(req.params.id);
      const {
        RollNumber,
        FName,
        LName,
        DOB,
        Gender,
        MobileNumber,
        AlternateNumber,
        EmailId,
        FatherName,
        FatherMobileNumber,
        MotherName,
        Address,
        City,
        State,
        Pincode,
        CourseId,
        CourseYear,
        Category,
        LedgerNumber,
        CollegeId,
        AdmissionMode,
        AdmissionDate,
        IsDiscontinue,
        DiscontinueOn,
        DiscontinueBy,
        FineAmount,
        RefundAmount,
        ModifiedBy,
        SessionYear,
        PaymentMode,
        NumberOfEMI,
        emiDetails,
      } = req.body;

      // Fetch existing student
      const existingQuery = `
        SELECT s.*, sa.id AS saId, sa.sessionYear, sa.paymentMode, sa.adminAmount, sa.feesAmount, 
               sa.numberOfEMI, sa.ledgerNumber, sa.courseYear
        FROM Student s
        LEFT JOIN StudentAcademicDetails sa ON s.id = sa.studentId
        WHERE s.id = @studentId
      `;
      const existingParams = { studentId: { type: sql.Int, value: studentId } };
      const existingResult = await executeQuery(existingQuery, existingParams);
      const existingStudent = existingResult.recordset.find(row => row.id === studentId);

      if (!existingStudent) {
        return res.status(404).json({ success: false, message: 'Student not found' });
      }

      // Check if academic detail with this CourseYear exists
      const existingAcademicDetail = existingResult.recordset.find(
        (detail) => detail.courseYear === CourseYear
      );

      // Fetch existing documents and EMI details
      const docQuery = `SELECT * FROM Documents WHERE studentId = @studentId`;
      const docResult = await executeQuery(docQuery, existingParams);
      const existingDocs = docResult.recordset;

      const emiQuery = `SELECT * FROM EMIDetails WHERE studentId = @studentId AND studentAcademicId = @academicId`;
      const emiParams = {
        studentId: { type: sql.Int, value: studentId },
        academicId: { type: sql.Int, value: existingAcademicDetail?.saId || 0 }
      };
      const emiResult = await executeQuery(emiQuery, emiParams);
      const existingEmiDetails = emiResult.recordset;

      // Upload new documents to Cloudinary
      const documentsData = [];
      const uploadFile = async (fieldName) => {
        if (req.files && req.files[fieldName]?.[0]) {
          const oldDoc = existingDocs.find((doc) => doc.documentType === fieldName);
          if (oldDoc) {
            await deleteFromCloudinary(oldDoc.publicId);
            const deleteDocQuery = `DELETE FROM Documents WHERE id = @docId`;
            const deleteDocParams = { docId: { type: sql.Int, value: oldDoc.id } };
            await executeQuery(deleteDocQuery, deleteDocParams);
          }

          const uploadedFile = await uploadToCloudinary(
            req.files[fieldName][0].buffer,
            `student_documents/${fieldName}`
          );
          if (uploadedFile?.public_id && uploadedFile?.url) {
            documentsData.push({
              documentType: fieldName,
              publicId: uploadedFile.public_id,
              fileUrl: uploadedFile.url,
              fileName: req.files[fieldName][0].originalname,
              createdBy: ModifiedBy,
            });
          }
        }
      };

      await Promise.all([
        uploadFile('StudentImage'),
        uploadFile('CasteCertificate'),
        uploadFile('TenthMarks'),
        uploadFile('TwelfthMarks'),
        uploadFile('Residential'),
        uploadFile('Income'),
      ]);

      // Update student in a transaction
      let updatedStudent;
      const pool = await poolConnect; // Use the existing poolConnect
      const transaction = new sql.Transaction(pool);
      try {
        await transaction.begin();

        const request = new sql.Request(transaction);

        // Update student basic details
        const studentUpdateQuery = `
          UPDATE Student
          SET rollNumber = @rollNumber, fName = @fName, lName = @lName, dob = @dob, gender = @gender,
              mobileNumber = @mobileNumber, alternateNumber = @alternateNumber, email = @email,
              fatherName = @fatherName, fatherMobile = @fatherMobile, motherName = @motherName,
              address = @address, city = @city, state = @state, pincode = @pincode,
              admissionMode = @admissionMode, collegeId = @collegeId, courseId = @courseId,
              admissionDate = @admissionDate, studentImage = @studentImage, category = @category,
              isDiscontinue = @isDiscontinue, discontinueOn = @discontinueOn, discontinueBy = @discontinueBy,
              modifiedBy = @modifiedBy, modifiedOn = @modifiedOn
          WHERE id = @studentId
          SELECT *
          FROM Student
          WHERE id = @studentId
        `;
        request.input('rollNumber', sql.NVarChar, RollNumber);
        request.input('fName', sql.NVarChar, FName);
        request.input('lName', sql.NVarChar, LName || null);
        request.input('dob', sql.Date, new Date(DOB));
        request.input('gender', sql.NVarChar, Gender);
        request.input('mobileNumber', sql.NVarChar, MobileNumber);
        request.input('alternateNumber', sql.NVarChar, AlternateNumber || null);
        request.input('email', sql.NVarChar, EmailId);
        request.input('fatherName', sql.NVarChar, FatherName);
        request.input('fatherMobile', sql.NVarChar, FatherMobileNumber || null);
        request.input('motherName', sql.NVarChar, MotherName);
        request.input('address', sql.NVarChar, Address);
        request.input('city', sql.NVarChar, City);
        request.input('state', sql.NVarChar, State);
        request.input('pincode', sql.NVarChar, Pincode);
        request.input('admissionMode', sql.NVarChar, AdmissionMode);
        request.input('collegeId', sql.Int, parseInt(CollegeId));
        request.input('courseId', sql.Int, parseInt(CourseId));
        request.input('admissionDate', sql.Date, new Date(AdmissionDate));
        request.input('studentImage', sql.NVarChar, documentsData.find((doc) => doc.documentType === 'StudentImage')?.fileUrl || existingStudent.studentImage);
        request.input('category', sql.NVarChar, Category);
        request.input('isDiscontinue', sql.Bit, IsDiscontinue === 'true');
        request.input('discontinueOn', sql.Date, DiscontinueOn ? new Date(DiscontinueOn) : null);
        request.input('discontinueBy', sql.NVarChar, DiscontinueBy || null);
        request.input('modifiedBy', sql.NVarChar, ModifiedBy);
        request.input('modifiedOn', sql.DateTime, new Date());
        request.input('studentId', sql.Int, studentId);

        const studentResult = await request.query(studentUpdateQuery);
        updatedStudent = studentResult.recordset[0];

        // Handle academic details
        if (!existingAcademicDetail) {
          // Create new academic detail
          const academicInsertQuery = `
            INSERT INTO StudentAcademicDetails (
              studentId, sessionYear, paymentMode, adminAmount, feesAmount, numberOfEMI,
              ledgerNumber, courseYear, createdBy, modifiedBy, modifiedOn
            )
            OUTPUT INSERTED.*
            VALUES (
              @studentId, @sessionYear, @paymentMode, @adminAmount, @feesAmount, @numberOfEMI,
              @ledgerNumber, @courseYear, @createdBy, @modifiedBy, @modifiedOn
            )
          `;
          const academicRequest = new sql.Request(transaction);
          academicRequest.input('studentId', sql.Int, studentId);
          academicRequest.input('sessionYear', sql.NVarChar, SessionYear);
          academicRequest.input('paymentMode', sql.NVarChar, PaymentMode);
          academicRequest.input('adminAmount', sql.Decimal(10, 2), parseFloat(FineAmount) || 0.0);
          academicRequest.input('feesAmount', sql.Decimal(10, 2), parseFloat(RefundAmount) || 0.0);
          academicRequest.input('numberOfEMI', sql.Int, PaymentMode === 'EMI' ? parseInt(NumberOfEMI) || 0 : null);
          academicRequest.input('ledgerNumber', sql.NVarChar, LedgerNumber || null);
          academicRequest.input('courseYear', sql.NVarChar, CourseYear || null);
          academicRequest.input('createdBy', sql.NVarChar, ModifiedBy);
          academicRequest.input('modifiedBy', sql.NVarChar, ModifiedBy);
          academicRequest.input('modifiedOn', sql.DateTime, new Date());
          const academicResult = await academicRequest.query(academicInsertQuery);
          const newAcademicDetail = academicResult.recordset[0];

          // Handle EMI details for new academic record
          if (PaymentMode === 'EMI' && NumberOfEMI && emiDetails) {
            const parsedEmiDetails = JSON.parse(emiDetails || '[]');
            if (parsedEmiDetails.length > 0) {
              for (const emi of parsedEmiDetails) {
                const emiInsertQuery = `
                  INSERT INTO EMIDetails (
                    studentId, studentAcademicId, emiNumber, amount, dueDate, createdBy, createdOn,
                    modifiedBy, modifiedOn
                  )
                  VALUES (
                    @studentId, @studentAcademicId, @emiNumber, @amount, @dueDate, @createdBy, @createdOn,
                    @modifiedBy, @modifiedOn
                  )
                `;
                const emiRequest = new sql.Request(transaction);
                emiRequest.input('studentId', sql.Int, studentId);
                emiRequest.input('studentAcademicId', sql.Int, newAcademicDetail.id);
                emiRequest.input('emiNumber', sql.Int, parseInt(emi.emiNumber));
                emiRequest.input('amount', sql.Decimal(10, 2), parseFloat(emi.amount));
                emiRequest.input('dueDate', sql.Date, new Date(emi.dueDate));
                emiRequest.input('createdBy', sql.NVarChar, ModifiedBy);
                emiRequest.input('createdOn', sql.DateTime, new Date());
                emiRequest.input('modifiedBy', sql.NVarChar, ModifiedBy);
                emiRequest.input('modifiedOn', sql.DateTime, new Date());
                await emiRequest.query(emiInsertQuery);
              }
            }
          }
        } else {
          // Update existing academic details
          const academicUpdateQuery = `
            UPDATE StudentAcademicDetails
            SET paymentMode = @paymentMode, adminAmount = @adminAmount, feesAmount = @feesAmount,
                numberOfEMI = @numberOfEMI, ledgerNumber = @ledgerNumber, modifiedBy = @modifiedBy,
                modifiedOn = @modifiedOn
            WHERE id = @academicId
          `;
          const academicRequest = new sql.Request(transaction);
          academicRequest.input('paymentMode', sql.NVarChar, PaymentMode);
          academicRequest.input('adminAmount', sql.Decimal(10, 2), parseFloat(FineAmount) || 0.0);
          academicRequest.input('feesAmount', sql.Decimal(10, 2), parseFloat(RefundAmount) || 0.0);
          academicRequest.input('numberOfEMI', sql.Int, PaymentMode === 'EMI' ? parseInt(NumberOfEMI) || 0 : null);
          academicRequest.input('ledgerNumber', sql.NVarChar, LedgerNumber || null);
          academicRequest.input('modifiedBy', sql.NVarChar, ModifiedBy);
          academicRequest.input('modifiedOn', sql.DateTime, new Date());
          academicRequest.input('academicId', sql.Int, existingAcademicDetail.saId);
          await academicRequest.query(academicUpdateQuery);

          // Handle EMI details
          if (PaymentMode === 'EMI' && NumberOfEMI && emiDetails) {
            const parsedEmiDetails = JSON.parse(emiDetails || '[]');
            // Delete existing EMI details
            const deleteEmiQuery = `
              DELETE FROM EMIDetails
              WHERE studentAcademicId = @academicId
            `;
            const deleteEmiRequest = new sql.Request(transaction);
            deleteEmiRequest.input('academicId', sql.Int, existingAcademicDetail.saId);
            await deleteEmiRequest.query(deleteEmiQuery);

            if (parsedEmiDetails.length > 0) {
              for (const emi of parsedEmiDetails) {
                const emiInsertQuery = `
                  INSERT INTO EMIDetails (
                    studentId, studentAcademicId, emiNumber, amount, dueDate, createdBy, createdOn,
                    modifiedBy, modifiedOn
                  )
                  VALUES (
                    @studentId, @studentAcademicId, @emiNumber, @amount, @dueDate, @createdBy, @createdOn,
                    @modifiedBy, @modifiedOn
                  )
                `;
                const emiRequest = new sql.Request(transaction);
                emiRequest.input('studentId', sql.Int, studentId);
                emiRequest.input('studentAcademicId', sql.Int, existingAcademicDetail.saId);
                emiRequest.input('emiNumber', sql.Int, parseInt(emi.emiNumber));
                emiRequest.input('amount', sql.Decimal(10, 2), parseFloat(emi.amount));
                emiRequest.input('dueDate', sql.Date, new Date(emi.dueDate));
                emiRequest.input('createdBy', sql.NVarChar, ModifiedBy);
                emiRequest.input('createdOn', sql.DateTime, new Date());
                emiRequest.input('modifiedBy', sql.NVarChar, ModifiedBy);
                emiRequest.input('modifiedOn', sql.DateTime, new Date());
                await emiRequest.query(emiInsertQuery);
              }
            }
          } else if (PaymentMode === 'One-Time') {
            // Delete EMI details if switching to One-Time
            const deleteEmiQuery = `
              DELETE FROM EMIDetails
              WHERE studentAcademicId = @academicId
            `;
            const deleteEmiRequest = new sql.Request(transaction);
            deleteEmiRequest.input('academicId', sql.Int, existingAcademicDetail.saId);
            await deleteEmiRequest.query(deleteEmiQuery);
          }
        }

        // Create new documents
        for (const doc of documentsData) {
          const docInsertQuery = `
            INSERT INTO Documents (
              studentId, documentType, publicId, fileUrl, fileName, createdBy, modifiedBy, modifiedOn
            )
            VALUES (
              @studentId, @documentType, @publicId, @fileUrl, @fileName, @createdBy, @modifiedBy, @modifiedOn
            )
          `;
          const docRequest = new sql.Request(transaction);
          docRequest.input('studentId', sql.Int, updatedStudent.id);
          docRequest.input('documentType', sql.NVarChar, doc.documentType);
          docRequest.input('publicId', sql.NVarChar, doc.publicId);
          docRequest.input('fileUrl', sql.NVarChar, doc.fileUrl);
          docRequest.input('fileName', sql.NVarChar, doc.fileName);
          docRequest.input('createdBy', sql.NVarChar, doc.createdBy);
          docRequest.input('modifiedBy', sql.NVarChar, ModifiedBy);
          docRequest.input('modifiedOn', sql.DateTime, new Date());
          await docRequest.query(docInsertQuery);
        }

        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      } finally {
        // Do NOT close the global pool here; let it persist for other requests
        // If you created a new pool, you would close it, but we're using poolConnect
      }

      res.status(200).json({ success: true, student: updatedStudent });
    } catch (err) {
      // console.error('Error updating student:', error);
    next(err);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// acive and inactive student

// PUT toggle student status
router.put('/students/toggle-status/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { modifiedBy } = req.body;

    if (!id || !modifiedBy) {
      return res.status(400).json({ message: 'Student ID and modifiedBy are required' });
    }

    // Fetch the current status
    const fetchQuery = `SELECT status FROM Student WHERE id = @id`;
    const fetchResult = await executeQuery(fetchQuery, {
      id: { type: sql.Int, value: parseInt(id) },
    });

    if (!fetchResult.recordset || fetchResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const currentStatus = fetchResult.recordset[0].status;
    const newStatus = !currentStatus; // Toggle the status (true to false, false to true)

    // Update the status, modifiedBy, and modifiedOn
    const updateQuery = `
      UPDATE Student
      SET status = @newStatus,
          modifiedBy = @modifiedBy,
          modifiedOn = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `;
    const updateResult = await executeQuery(updateQuery, {
      id: { type: sql.Int, value: parseInt(id) },
      newStatus: { type: sql.Bit, value: newStatus },
      modifiedBy: { type: sql.NVarChar, value: modifiedBy },
    });

    if (updateResult.recordset && updateResult.recordset.length > 0) {
      res.status(200).json({
        message: 'Student status updated successfully',
        student: updateResult.recordset[0],
      });
    } else {
      res.status(500).json({ message: 'Failed to update student status' });
    }
  } catch (err) {
    next(err);
  }
});

// GET all students with related data
router.get('/students', async (req, res, next) => {
  try {
    // Fetch all students with college and course details
    const studentQuery = `
      SELECT 
        s.*,
        col.id AS collegeId, col.collegeName, col.location, col.establishYear, col.contactNumber AS collegeContactNumber, col.email AS collegeEmail, col.status AS collegeStatus, col.createdBy AS collegeCreatedBy, col.createdOn AS collegeCreatedOn, col.modifiedBy AS collegeModifiedBy, col.modifiedOn AS collegeModifiedOn,
        c.id AS courseId, c.courseName, c.collegeId AS courseCollegeId, c.courseDuration, c.createdBy AS courseCreatedBy, c.createdOn AS courseCreatedOn, c.modifiedBy AS courseModifiedBy, c.modifiedOn AS courseModifiedOn, c.status AS courseStatus
      FROM Student s
      LEFT JOIN College col ON s.collegeId = col.id
      LEFT JOIN Course c ON s.courseId = c.id
      ORDER BY s.id ASC
    `;
    const studentResult = await executeQuery(studentQuery);
    const students = studentResult.recordset;

    // Fetch related data for each student
    for (const student of students) {
      // Format college and course objects
      student.college = {
        id: student.collegeId,
        collegeName: student.collegeName,
        location: student.location,
        establishYear: student.establishYear,
        contactNumber: student.collegeContactNumber,
        email: student.collegeEmail,
        status: student.collegeStatus,
        createdBy: student.collegeCreatedBy,
        createdOn: student.collegeCreatedOn,
        modifiedBy: student.collegeModifiedBy,
        modifiedOn: student.collegeModifiedOn,
      };

      student.course = {
        id: student.courseId,
        courseName: student.courseName,
        collegeId: student.courseCollegeId,
        courseDuration: student.courseDuration,
        createdBy: student.courseCreatedBy,
        createdOn: student.courseCreatedOn,
        modifiedBy: student.courseModifiedBy,
        modifiedOn: student.courseModifiedOn,
        status: student.courseStatus,
      };

      // Remove duplicated fields from the student object
      delete student.collegeId; delete student.collegeName; delete student.location; delete student.establishYear;
      delete student.collegeContactNumber; delete student.collegeEmail; delete student.collegeStatus;
      delete student.collegeCreatedBy; delete student.collegeCreatedOn; delete student.collegeModifiedBy; delete student.collegeModifiedOn;
      delete student.courseId; delete student.courseName; delete student.courseCollegeId; delete student.courseDuration;
      delete student.courseCreatedBy; delete student.courseCreatedOn; delete student.courseModifiedBy; delete student.courseModifiedOn; delete student.courseStatus;

      // Fetch documents
      const documentsQuery = `
        SELECT *
        FROM Documents
        WHERE studentId = @studentId
      `;
      const documentsParams = { studentId: { type: sql.Int, value: student.id } };
      const documentsResult = await executeQuery(documentsQuery, documentsParams);
      student.documents = documentsResult.recordset;

      // Fetch academic details
      const academicQuery = `
        SELECT *
        FROM StudentAcademicDetails
        WHERE studentId = @studentId
      `;
      const academicParams = { studentId: { type: sql.Int, value: student.id } };
      const academicResult = await executeQuery(academicQuery, academicParams);
      student.academicDetails = academicResult.recordset;

      // Fetch EMI details
      const emiQuery = `
        SELECT *
        FROM EMIDetails
        WHERE studentId = @studentId
      `;
      const emiParams = { studentId: { type: sql.Int, value: student.id } };
      const emiResult = await executeQuery(emiQuery, emiParams);
      student.emiDetails = emiResult.recordset;
    }

    res.status(200).json(students);
  } catch (err) {
    // console.error('Error fetching students:', error);
        next(err);
    res.status(500).json({ success: false, message: 'Error fetching students', error: error.message });
  }
});


// GET /students - Fetch all students
router.get('/students', async (req, res, next) => {
  try {
    const query = `
      SELECT 
        s.*, 
        col.id AS colId, col.collegeName, col.location, col.establishYear, col.contactNumber, col.email AS colEmail, 
        col.status AS colStatus, col.createdBy AS colCreatedBy, col.createdOn AS colCreatedOn, 
        col.modifiedBy AS colModifiedBy, col.modifiedOn AS colModifiedOn,
        c.id AS cId, c.courseName, c.collegeId AS cCollegeId, c.courseDuration, 
        c.createdBy AS cCreatedBy, c.createdOn AS cCreatedOn, c.modifiedBy AS cModifiedBy, 
        c.modifiedOn AS cModifiedOn, c.status AS cStatus
      FROM Student s
      LEFT JOIN College col ON s.collegeId = col.id
      LEFT JOIN Course c ON s.courseId = c.id
      ORDER BY s.id ASC
    `;
    const result = await executeQuery(query);

    const studentsMap = new Map();
    for (const record of result.recordset) {
      if (!studentsMap.has(record.id)) {
        studentsMap.set(record.id, {
          id: record.id,
          stdCollId: record.stdCollId,
          fName: record.fName,
          lName: record.lName,
          rollNumber: record.rollNumber,
          gender: record.gender,
          fatherName: record.fatherName,
          motherName: record.motherName,
          mobileNumber: record.mobileNumber,
          fatherMobile: record.fatherMobile,
          alternateNumber: record.alternateNumber,
          dob: record.dob,
          email: record.email,
          address: record.address,
          state: record.state,
          pincode: record.pincode,
          city: record.city,
          admissionMode: record.admissionMode,
          collegeId: record.collegeId,
          courseId: record.courseId,
          admissionDate: record.admissionDate,
          studentImage: record.studentImage,
          category: record.category,
          isDiscontinue: record.isDiscontinue,
          isLateral: record.isLateral,
          discontinueOn: record.discontinueOn,
          discontinueBy: record.discontinueBy,
          createdBy: record.createdBy,
          createdOn: record.createdOn,
          modifiedBy: record.modifiedBy,
          modifiedOn: record.modifiedOn,
          status: record.status,
          college: {
            id: record.colId,
            collegeName: record.collegeName,
            location: record.location,
            establishYear: record.establishYear,
            contactNumber: record.contactNumber,
            email: record.colEmail,
            status: record.colStatus,
            createdBy: record.colCreatedBy,
            createdOn: record.colCreatedOn,
            modifiedBy: record.colModifiedBy,
            modifiedOn: record.colModifiedOn
          },
          course: {
            id: record.cId,
            courseName: record.courseName,
            collegeId: record.cCollegeId,
            courseDuration: record.courseDuration,
            createdBy: record.cCreatedBy,
            createdOn: record.cCreatedOn,
            modifiedBy: record.cModifiedBy,
            modifiedOn: record.cModifiedOn,
            status: record.cStatus
          },
          documents: [],
          academicDetails: [],
          emiDetails: []
        });
      }
    }

    // Fetch documents
    const docQuery = `
      SELECT *
      FROM Documents
      WHERE studentId IN (${Array.from(studentsMap.keys()).join(',')})
    `;
    const docResult = await executeQuery(docQuery);
    for (const doc of docResult.recordset) {
      const student = studentsMap.get(doc.studentId);
      student.documents.push({
        id: doc.id,
        studentId: doc.studentId,
        documentType: doc.documentType,
        publicId: doc.publicId,
        fileUrl: doc.fileUrl,
        fileName: doc.fileName,
        uploadDate: doc.uploadDate,
        createdBy: doc.createdBy,
        createdOn: doc.createdOn,
        modifiedBy: doc.modifiedBy,
        modifiedOn: doc.modifiedOn
      });
    }

    // Fetch academic details
    const academicQuery = `
      SELECT *
      FROM StudentAcademicDetails
      WHERE studentId IN (${Array.from(studentsMap.keys()).join(',')})
      ORDER BY createdOn DESC
    `;
    const academicResult = await executeQuery(academicQuery);
    for (const academic of academicResult.recordset) {
      const student = studentsMap.get(academic.studentId);
      student.academicDetails.push({
        id: academic.id,
        studentId: academic.studentId,
        sessionYear: academic.sessionYear,
        paymentMode: academic.paymentMode,
        adminAmount: academic.adminAmount,
        feesAmount: academic.feesAmount,
        numberOfEMI: academic.numberOfEMI,
        ledgerNumber: academic.ledgerNumber,
        courseYear: academic.courseYear,
        createdBy: academic.createdBy,
        createdOn: academic.createdOn,
        modifiedBy: academic.modifiedBy,
        modifiedOn: academic.modifiedOn
      });
    }

    // Fetch EMI details
    const emiQuery = `
      SELECT *
      FROM EMIDetails
      WHERE studentId IN (${Array.from(studentsMap.keys()).join(',')})
      ORDER BY emiNumber ASC
    `;
    const emiResult = await executeQuery(emiQuery);
    for (const emi of emiResult.recordset) {
      const student = studentsMap.get(emi.studentId);
      student.emiDetails.push({
        id: emi.id,
        studentId: emi.studentId,
        studentAcademicId: emi.studentAcademicId,
        emiNumber: emi.emiNumber,
        amount: emi.amount,
        dueDate: emi.dueDate,
        createdBy: emi.createdBy,
        createdOn: emi.createdOn,
        modifiedBy: emi.modifiedBy,
        modifiedOn: emi.modifiedOn
      });
    }

    const students = Array.from(studentsMap.values());
    res.status(200).json(students);
  } catch (err) {
    // console.error('Error fetching students:', error);
        next(err);
    res.status(500).json({ success: false, message: 'Error fetching students', error: error.message });
  }
});

// GET /students/:id - Fetch single student with complete data
router.get('/students/:id', async (req, res, next) => {
  try {
    const studentId = parseInt(req.params.id);
    const studentQuery = `
      SELECT *
      FROM Student
      WHERE id = @studentId
    `;
    const studentParams = { studentId: { type: sql.Int, value: studentId } };
    const studentResult = await executeQuery(studentQuery, studentParams);
    const student = studentResult.recordset[0];

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Fetch latest academic details
    const academicQuery = `
      SELECT TOP 1 *
      FROM StudentAcademicDetails
      WHERE studentId = @studentId
      ORDER BY createdOn DESC
    `;
    const academicResult = await executeQuery(academicQuery, studentParams);
    const latestAcademicDetails = academicResult.recordset[0] || {};

    // Fetch EMI details
    const emiQuery = `
      SELECT *
      FROM EMIDetails
      WHERE studentId = @studentId
      ORDER BY emiNumber ASC
    `;
    const emiResult = await executeQuery(emiQuery, studentParams);
    const emiDetails = emiResult.recordset.map(emi => ({
      emiNumber: emi.emiNumber,
      amount: emi.amount,
      date: emi.dueDate ? emi.dueDate.toISOString().split('T')[0] : ''
    }));

    const formattedStudent = {
      StudentId: student.id,
      RollNumber: student.rollNumber,
      FName: student.fName,
      LName: student.lName || '',
      DOB: student.dob ? student.dob.toISOString().split('T')[0] : '',
      Gender: student.gender,
      MobileNumber: student.mobileNumber,
      AlternateNumber: student.alternateNumber || '',
      EmailId: student.email,
      FatherName: student.fatherName,
      FatherMobileNumber: student.fatherMobile || '',
      MotherName: student.motherName,
      Address: student.address,
      City: student.city,
      State: student.state,
      Pincode: student.pincode,
      CourseId: student.courseId ? student.courseId.toString() : '',
      CourseYear: latestAcademicDetails.courseYear || '',
      Category: student.category,
      LedgerNumber: latestAcademicDetails.ledgerNumber || '',
      CollegeId: student.collegeId ? student.collegeId.toString() : '',
      AdmissionMode: student.admissionMode,
      AdmissionDate: student.admissionDate ? student.admissionDate.toISOString().split('T')[0] : '',
      isDiscontinue: student.isDiscontinue,
      isLateral: student.isLateral,
      DiscontinueOn: student.discontinueOn ? student.discontinueOn.toISOString().split('T')[0] : '',
      DiscontinueBy: student.discontinueBy || '',
      FineAmount: latestAcademicDetails.adminAmount || 0,
      RefundAmount: latestAcademicDetails.feesAmount || 0,
      ModifiedBy: student.modifiedBy || '',
      SessionYear: latestAcademicDetails.sessionYear || '',
      PaymentMode: latestAcademicDetails.paymentMode || '',
      stdCollId: student.stdCollId,
      NumberOfEMI: latestAcademicDetails.numberOfEMI || null,
      emiDetails: emiDetails
    };

    res.status(200).json(formattedStudent);
  } catch (err) {
    // console.error('Error fetching student:', error);
        next(err);
    res.status(500).json({ success: false, message: 'Failed to load student data' });
  }
});

// GET /getAllStudents/:id - Fetch all details for a student
router.get('/getAllStudents/:id', async (req, res, next) => {
  try {
    const studentId = parseInt(req.params.id);
    if (isNaN(studentId)) {
      return res.status(400).json({ success: false, message: 'Invalid student ID' });
    }

    const studentQuery = `
      SELECT 
        s.*, 
        col.id AS colId, col.collegeName, col.location, col.establishYear, col.contactNumber, col.email AS colEmail, 
        col.status AS colStatus, col.createdBy AS colCreatedBy, col.createdOn AS colCreatedOn, 
        col.modifiedBy AS colModifiedBy, col.modifiedOn AS colModifiedOn,
        c.id AS cId, c.courseName, c.collegeId AS cCollegeId, c.courseDuration, 
        c.createdBy AS cCreatedBy, c.createdOn AS cCreatedOn, c.modifiedBy AS cModifiedBy, 
        c.modifiedOn AS cModifiedOn, c.status AS cStatus
      FROM Student s
      LEFT JOIN College col ON s.collegeId = col.id
      LEFT JOIN Course c ON s.courseId = c.id
      WHERE s.id = @studentId
    `;
    const studentParams = { studentId: { type: sql.Int, value: studentId } };
    const studentResult = await executeQuery(studentQuery, studentParams);
    const student = studentResult.recordset[0];

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const formattedStudent = {
      id: student.id,
      stdCollId: student.stdCollId,
      fName: student.fName,
      lName: student.lName,
      rollNumber: student.rollNumber,
      gender: student.gender,
      fatherName: student.fatherName,
      motherName: student.motherName,
      mobileNumber: student.mobileNumber,
      fatherMobile: student.fatherMobile,
      alternateNumber: student.alternateNumber,
      dob: student.dob,
      email: student.email,
      address: student.address,
      state: student.state,
      pincode: student.pincode,
      city: student.city,
      admissionMode: student.admissionMode,
      collegeId: student.collegeId,
      courseId: student.courseId,
      admissionDate: student.admissionDate,
      studentImage: student.studentImage,
      category: student.category,
      isDiscontinue: student.isDiscontinue,
      isLateral: student.isLateral,
      discontinueOn: student.discontinueOn,
      discontinueBy: student.discontinueBy,
      createdBy: student.createdBy,
      createdOn: student.createdOn,
      modifiedBy: student.modifiedBy,
      modifiedOn: student.modifiedOn,
      status: student.status,
      college: {
        id: student.colId,
        collegeName: student.collegeName,
        location: student.location,
        establishYear: student.establishYear,
        contactNumber: student.contactNumber,
        email: student.colEmail,
        status: student.colStatus,
        createdBy: student.colCreatedBy,
        createdOn: student.colCreatedOn,
        modifiedBy: student.colModifiedBy,
        modifiedOn: student.colModifiedOn
      },
      course: {
        id: student.cId,
        courseName: student.courseName,
        collegeId: student.cCollegeId,
        courseDuration: student.courseDuration,
        createdBy: student.cCreatedBy,
        createdOn: student.cCreatedOn,
        modifiedBy: student.cModifiedBy,
        modifiedOn: student.cModifiedOn,
        status: student.cStatus
      },
      documents: [],
      academicDetails: [],
      emiDetails: []
    };

    // Fetch documents
    const docQuery = `
      SELECT *
      FROM Documents
      WHERE studentId = @studentId
    `;
    const docResult = await executeQuery(docQuery, studentParams);
    formattedStudent.documents = docResult.recordset;

    // Fetch academic details with nested EMI details
    const academicQuery = `
      SELECT *
      FROM StudentAcademicDetails
      WHERE studentId = @studentId
      ORDER BY createdOn DESC
    `;
    const academicResult = await executeQuery(academicQuery, studentParams);
    for (const academic of academicResult.recordset) {
      const academicEntry = { ...academic, emiDetails: [] };
      const nestedEmiQuery = `
        SELECT *
        FROM EMIDetails
        WHERE studentAcademicId = @academicId
        ORDER BY emiNumber ASC
      `;
      const nestedEmiParams = { academicId: { type: sql.Int, value: academic.id } };
      const nestedEmiResult = await executeQuery(nestedEmiQuery, nestedEmiParams);
      academicEntry.emiDetails = nestedEmiResult.recordset;
      formattedStudent.academicDetails.push(academicEntry);
    }

    // Fetch top-level EMI details
    const emiQuery = `
      SELECT *
      FROM EMIDetails
      WHERE studentId = @studentId
      ORDER BY emiNumber ASC
    `;
    const emiResult = await executeQuery(emiQuery, studentParams);
    formattedStudent.emiDetails = emiResult.recordset;

    res.status(200).json({ success: true, data: formattedStudent });
  } catch (err) {
    // console.error('Error fetching student:', error);
        next(err);
    res.status(500).json({ success: false, message: 'Failed to load student data' });
  }
});

// GET /students/:id/documents - Fetch student documents
router.get('/students/:id/documents', async (req, res , next) => {
  try {
    const studentId = parseInt(req.params.id);
    const query = `
      SELECT id, documentType, fileName, fileUrl, publicId
      FROM Documents
      WHERE studentId = @studentId
    `;
    const params = { studentId: { type: sql.Int, value: studentId } };
    const result = await executeQuery(query, params);

    const formattedDocuments = result.recordset.map(doc => ({
      DocumentId: doc.id,
      DocumentType: doc.documentType,
      FileName: doc.fileName,
      Url: doc.fileUrl,
      PublicId: doc.publicId
    }));

    res.status(200).json(formattedDocuments);
  } catch (error) {
    // console.error('Error fetching documents:', error);
        next(err);
    res.status(500).json({ success: false, message: 'Failed to load student documents' });
  }
});

// POST /students/:studentId/promote - Handle student promotion
router.post('/students/:studentId/promote', async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const {
      currentAcademicId,
      newCourseYear,
      newSessionYear,
      adminAmount,
      feesAmount,
      paymentMode,
      numberOfEMI,
      emiDetails,
      ledgerNumber,
      modifiedBy,
      isDepromote,
      confirmLateralChange,
    } = req.body;

    console.log('Promotion/Demotion Request:', { studentId, currentAcademicId, newCourseYear, newSessionYear, isDepromote, confirmLateralChange });

    // Input validation
    if (!newCourseYear || !newSessionYear) {
      return res.status(400).json({
        success: false,
        message: 'New course year and session year are required',
      });
    }

    if (adminAmount < 0 || feesAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Admin amount and fees amount cannot be negative',
      });
    }

    const validPaymentModes = ['One-Time', 'EMI'];
    if (!validPaymentModes.includes(paymentMode)) {
      return res.status(400).json({
        success: false,
        message: 'Payment mode must be one of: One-Time, EMI',
      });
    }

    if (paymentMode === 'EMI') {
      if (!numberOfEMI || numberOfEMI <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Number of EMIs must be greater than 0 for EMI payment mode',
        });
      }
      if (!emiDetails || !Array.isArray(emiDetails) || emiDetails.length !== numberOfEMI) {
        return res.status(400).json({
          success: false,
          message: `EMI details must be an array with exactly ${numberOfEMI} entries`,
        });
      }
      for (const [index, emi] of emiDetails.entries()) {
        if (!emi.emiNumber || emi.emiNumber !== index + 1) {
          return res.status(400).json({
            success: false,
            message: `EMI ${index + 1} has invalid emiNumber (expected ${index + 1})`,
          });
        }
        if (!emi.amount || emi.amount <= 0) {
          return res.status(400).json({
            success: false,
            message: `EMI ${index + 1} has invalid or missing amount`,
          });
        }
        if (!emi.dueDate || isNaN(new Date(emi.dueDate).getTime())) {
          return res.status(400).json({
            success: false,
            message: `EMI ${index + 1} has invalid dueDate`,
          });
        }
      }
    }

    // Verify course year validity
    const courseYearOrder = ['1st', '2nd', '3rd', '4th'];
    if (!courseYearOrder.includes(newCourseYear)) {
      return res.status(400).json({
        success: false,
        message: `Invalid course year: ${newCourseYear}`,
      });
    }

    // Get current year and validate session years
    const currentYear = new Date().getFullYear();
    const sessionYears = Array.from({ length: 10 }, (_, i) => {
      const startYear = currentYear - 5 + i;
      return `${startYear}-${startYear + 1}`;
    });

    if (!sessionYears.includes(newSessionYear)) {
      return res.status(400).json({
        success: false,
        message: `Invalid session year: ${newSessionYear}`,
      });
    }

    // Verify the student exists
    const studentQuery = `SELECT id, isLateral FROM Student WHERE id = @studentId`;
    const studentParams = { studentId: { type: sql.Int, value: parseInt(studentId) } };
    const studentResult = await executeQuery(studentQuery, studentParams);
    const student = studentResult.recordset[0];

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Get current academic record
    const currentAcademicQuery = `
      SELECT id, courseYear, sessionYear
      FROM StudentAcademicDetails
      WHERE id = @academicId AND studentId = @studentId
    `;
    const academicParams = {
      academicId: { type: sql.Int, value: parseInt(currentAcademicId) },
      studentId: { type: sql.Int, value: parseInt(studentId) },
    };
    const currentAcademicResult = await executeQuery(currentAcademicQuery, academicParams);
    const currentAcademic = currentAcademicResult.recordset[0];

    if (!currentAcademic) {
      return res.status(404).json({
        success: false,
        message: 'Current academic record not found or does not belong to the student',
      });
    }

    // Get all academic records for this student
    const allAcademicQuery = `
      SELECT courseYear
      FROM StudentAcademicDetails
      WHERE studentId = @studentId
    `;
    const allAcademicResult = await executeQuery(allAcademicQuery, studentParams);
    const existingCourseYears = allAcademicResult.recordset.map(record => record.courseYear);

    const currentCourseYearIndex = courseYearOrder.indexOf(currentAcademic.courseYear);
    const newCourseYearIndex = courseYearOrder.indexOf(newCourseYear);
    const currentSessionIndex = sessionYears.indexOf(currentAcademic.sessionYear);
    const newSessionIndex = sessionYears.indexOf(newSessionYear);

    let newAcademicRecord;
    const pool = await poolConnect;
    const transaction = new sql.Transaction(pool);
    try {
      await transaction.begin();

      // Special handling for lateral entry students being depromoted to 1st year
      if (isDepromote && student.isLateral && currentCourseYearIndex === 1 && newCourseYearIndex === 0) {
        if (currentAcademic.sessionYear !== newSessionYear) {
          throw new Error('For depromoting a lateral entry student to 1st year, session year must remain the same');
        }
        if (!confirmLateralChange) {
          throw new Error('Lateral entry status change confirmation is required for demotion to 1st year');
        }

        if (existingCourseYears.includes('1st')) {
          throw new Error('Student already has a record for 1st year. Cannot depromote.');
        }

        // Update existing record
        const updateAcademicQuery = `
          UPDATE StudentAcademicDetails
          SET courseYear = @courseYear, sessionYear = @sessionYear, adminAmount = @adminAmount,
              feesAmount = @feesAmount, paymentMode = @paymentMode, numberOfEMI = @numberOfEMI,
              ledgerNumber = @ledgerNumber, modifiedBy = @modifiedBy, modifiedOn = @modifiedOn
          WHERE id = @academicId
          SELECT *
          FROM StudentAcademicDetails
          WHERE id = @academicId
        `;
        const updateAcademicParams = {
          courseYear: { type: sql.NVarChar, value: newCourseYear },
          sessionYear: { type: sql.NVarChar, value: newSessionYear },
          adminAmount: { type: sql.Decimal(10, 2), value: parseFloat(adminAmount) },
          feesAmount: { type: sql.Decimal(10, 2), value: parseFloat(feesAmount) },
          paymentMode: { type: sql.NVarChar, value: paymentMode },
          numberOfEMI: { type: sql.Int, value: paymentMode === 'EMI' ? parseInt(numberOfEMI) : null },
          ledgerNumber: { type: sql.NVarChar, value: ledgerNumber || null },
          modifiedBy: { type: sql.NVarChar, value: modifiedBy },
          modifiedOn: { type: sql.DateTime, value: new Date() },
          academicId: { type: sql.Int, value: parseInt(currentAcademicId) },
        };
        const updateAcademicResult = await executeQuery(updateAcademicQuery, updateAcademicParams, transaction);
        newAcademicRecord = updateAcademicResult.recordset[0];

        // Update student isLateral flag
        const updateStudentQuery = `
          UPDATE Student
          SET isLateral = @isLateral, modifiedBy = @modifiedBy, modifiedOn = @modifiedOn
          WHERE id = @studentId
        `;
        const updateStudentParams = {
          isLateral: { type: sql.Bit, value: false },
          modifiedBy: { type: sql.NVarChar, value: modifiedBy },
          modifiedOn: { type: sql.DateTime, value: new Date() },
          studentId: { type: sql.Int, value: parseInt(studentId) },
        };
        await executeQuery(updateStudentQuery, updateStudentParams, transaction);
      }
      // Regular depromote case from 2nd to 1st year
      else if (isDepromote && currentCourseYearIndex === 1 && newCourseYearIndex === 0) {
        if (currentAcademic.sessionYear !== newSessionYear) {
          throw new Error('For demotion to 1st year, session year must remain the same');
        }

        if (existingCourseYears.includes('1st')) {
          throw new Error('Student already has a record for 1st year. Cannot depromote.');
        }

        // Update existing record
        const updateAcademicQuery = `
          UPDATE StudentAcademicDetails
          SET courseYear = @courseYear, sessionYear = @sessionYear, adminAmount = @adminAmount,
              feesAmount = @feesAmount, paymentMode = @paymentMode, numberOfEMI = @numberOfEMI,
              ledgerNumber = @ledgerNumber, modifiedBy = @modifiedBy, modifiedOn = @modifiedOn
          WHERE id = @academicId
          SELECT *
          FROM StudentAcademicDetails
          WHERE id = @academicId
        `;
        const updateAcademicParams = {
          courseYear: { type: sql.NVarChar, value: newCourseYear },
          sessionYear: { type: sql.NVarChar, value: newSessionYear },
          adminAmount: { type: sql.Decimal(10, 2), value: parseFloat(adminAmount) },
          feesAmount: { type: sql.Decimal(10, 2), value: parseFloat(feesAmount) },
          paymentMode: { type: sql.NVarChar, value: paymentMode },
          numberOfEMI: { type: sql.Int, value: paymentMode === 'EMI' ? parseInt(numberOfEMI) : null },
          ledgerNumber: { type: sql.NVarChar, value: ledgerNumber || null },
          modifiedBy: { type: sql.NVarChar, value: modifiedBy },
          modifiedOn: { type: sql.DateTime, value: new Date() },
          academicId: { type: sql.Int, value: parseInt(currentAcademicId) },
        };
        const updateAcademicResult = await executeQuery(updateAcademicQuery, updateAcademicParams, transaction);
        newAcademicRecord = updateAcademicResult.recordset[0];
      }
      // Other depromote cases
      else if (isDepromote) {
        if (newCourseYearIndex !== currentCourseYearIndex - 1) {
          throw new Error(`Cannot depromote from ${currentAcademic.courseYear} to ${newCourseYear}. Demotion must be sequential.`);
        }

        if (currentAcademic.sessionYear !== newSessionYear) {
          throw new Error('For demotion, session year must remain the same');
        }

        if (existingCourseYears.includes(newCourseYear)) {
          throw new Error(`Student already has a record for ${newCourseYear}. Cannot depromote.`);
        }

        // Create new academic record
        const insertAcademicQuery = `
          INSERT INTO StudentAcademicDetails (
            studentId, courseYear, sessionYear, adminAmount, feesAmount, paymentMode,
            numberOfEMI, ledgerNumber, createdBy, createdOn, modifiedBy
          )
          OUTPUT INSERTED.*
          VALUES (
            @studentId, @courseYear, @sessionYear, @adminAmount, @feesAmount, @paymentMode,
            @numberOfEMI, @ledgerNumber, @createdBy, @createdOn, @modifiedBy
          )
        `;
        const insertAcademicParams = {
          studentId: { type: sql.Int, value: parseInt(studentId) },
          courseYear: { type: sql.NVarChar, value: newCourseYear },
          sessionYear: { type: sql.NVarChar, value: newSessionYear },
          adminAmount: { type: sql.Decimal(10, 2), value: parseFloat(adminAmount) },
          feesAmount: { type: sql.Decimal(10, 2), value: parseFloat(feesAmount) },
          paymentMode: { type: sql.NVarChar, value: paymentMode },
          numberOfEMI: { type: sql.Int, value: paymentMode === 'EMI' ? parseInt(numberOfEMI) : null },
          ledgerNumber: { type: sql.NVarChar, value: ledgerNumber || null },
          createdBy: { type: sql.NVarChar, value: modifiedBy },
          createdOn: { type: sql.DateTime, value: new Date() },
          modifiedBy: { type: sql.NVarChar, value: modifiedBy },
        };
        const insertAcademicResult = await executeQuery(insertAcademicQuery, insertAcademicParams, transaction);
        newAcademicRecord = insertAcademicResult.recordset[0];
      }
      // Regular promotion case
      else {
        if (existingCourseYears.includes(newCourseYear)) {
          throw new Error(`Student already has an academic record for ${newCourseYear}`);
        }

        if (newCourseYearIndex !== currentCourseYearIndex + 1) {
          throw new Error(`Cannot promote from ${currentAcademic.courseYear} to ${newCourseYear}. Promotion must be sequential.`);
        }

        if (newSessionIndex <= currentSessionIndex) {
          throw new Error(`New session year (${newSessionYear}) must be after current session year (${currentAcademic.sessionYear})`);
        }

        if (newSessionIndex !== currentSessionIndex + 1) {
          throw new Error(`Cannot skip session years. Next valid session year is ${sessionYears[currentSessionIndex + 1]}`);
        }

        // Create new academic record
        const insertAcademicQuery = `
          INSERT INTO StudentAcademicDetails (
            studentId, courseYear, sessionYear, adminAmount, feesAmount, paymentMode,
            numberOfEMI, ledgerNumber, createdBy, createdOn, modifiedBy
          )
          OUTPUT INSERTED.*
          VALUES (
            @studentId, @courseYear, @sessionYear, @adminAmount, @feesAmount, @paymentMode,
            @numberOfEMI, @ledgerNumber, @createdBy, @createdOn, @modifiedBy
          )
        `;
        const insertAcademicParams = {
          studentId: { type: sql.Int, value: parseInt(studentId) },
          courseYear: { type: sql.NVarChar, value: newCourseYear },
          sessionYear: { type: sql.NVarChar, value: newSessionYear },
          adminAmount: { type: sql.Decimal(10, 2), value: parseFloat(adminAmount) },
          feesAmount: { type: sql.Decimal(10, 2), value: parseFloat(feesAmount) },
          paymentMode: { type: sql.NVarChar, value: paymentMode },
          numberOfEMI: { type: sql.Int, value: paymentMode === 'EMI' ? parseInt(numberOfEMI) : null },
          ledgerNumber: { type: sql.NVarChar, value: ledgerNumber || null },
          createdBy: { type: sql.NVarChar, value: modifiedBy },
          createdOn: { type: sql.DateTime, value: new Date() },
          modifiedBy: { type: sql.NVarChar, value: modifiedBy },
        };
        const insertAcademicResult = await executeQuery(insertAcademicQuery, insertAcademicParams, transaction);
        newAcademicRecord = insertAcademicResult.recordset[0];
      }

      // If payment mode is EMI, create/update EMI details
      if (paymentMode === 'EMI' && emiDetails && emiDetails.length > 0) {
        // Delete existing EMI details if updating record
        if (isDepromote && currentCourseYearIndex === 1 && newCourseYearIndex === 0) {
          const deleteEmiQuery = `
            DELETE FROM EMIDetails
            WHERE studentId = @studentId AND studentAcademicId = @academicId
          `;
          const deleteEmiParams = {
            studentId: { type: sql.Int, value: parseInt(studentId) },
            academicId: { type: sql.Int, value: parseInt(currentAcademicId) },
          };
          await executeQuery(deleteEmiQuery, deleteEmiParams, transaction);
        }

        for (const emi of emiDetails) {
          const emiInsertQuery = `
            INSERT INTO EMIDetails (
              studentId, studentAcademicId, emiNumber, amount, dueDate, createdBy, createdOn, modifiedBy, modifiedOn
            )
            VALUES (
              @studentId, @studentAcademicId, @emiNumber, @amount, @dueDate, @createdBy, @createdOn, @modifiedBy, @modifiedOn
            )
          `;
          const emiParams = {
            studentId: { type: sql.Int, value: parseInt(studentId) },
            studentAcademicId: { type: sql.Int, value: newAcademicRecord.id },
            emiNumber: { type: sql.Int, value: emi.emiNumber },
            amount: { type: sql.Decimal(10, 2), value: parseFloat(emi.amount) },
            dueDate: { type: sql.DateTime, value: new Date(emi.dueDate) },
            createdBy: { type: sql.NVarChar, value: modifiedBy },
            createdOn: { type: sql.DateTime, value: new Date() },
            modifiedBy: { type: sql.NVarChar, value: modifiedBy },
            modifiedOn: { type: sql.DateTime, value: new Date() },
          };
          await executeQuery(emiInsertQuery, emiParams, transaction);
        }
      }

      await transaction.commit();

      const actionType = isDepromote ? 'demoted' : 'promoted';
      res.status(200).json({
        success: true,
        message: `Student successfully ${actionType} to ${newCourseYear} year for session ${newSessionYear}`,
        data: newAcademicRecord,
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Transaction error:', error.stack);
      throw error;
    }
  } catch (err) {
    // console.error('Error promoting/demoting student:', error.stack);
        next(err);
    res.status(500).json({
      success: false,
      message: err.message || 'An error occurred while promoting/demoting the student',
      details: err.stack,
    });
  }
});
// router.post('/students/:studentId/promote', async (req, res) => {
//   try {
//     const { studentId } = req.params;
//     const {
//       currentAcademicId,
//       newCourseYear,
//       newSessionYear,
//       adminAmount,
//       feesAmount,
//       paymentMode,
//       numberOfEMI,
//       emiDetails,
//       ledgerNumber,
//       modifiedBy,
//       isDepromote, // New field to determine if this is a demotion operation
//     } = req.body;

//     // Input validation
//     if (!newCourseYear || !newSessionYear) {
//       return res.status(400).json({
//         success: false,
//         message: 'New course year and session year are required',
//       });
//     }

//     if (adminAmount < 0 || feesAmount < 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Admin amount and fees amount cannot be negative',
//       });
//     }

//     if (paymentMode === 'EMI' && (!numberOfEMI || numberOfEMI <= 0)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Number of EMIs must be greater than 0 for EMI payment mode',
//       });
//     }

//     if (paymentMode === 'EMI' && (!emiDetails || !Array.isArray(emiDetails) || emiDetails.length === 0)) {
//       return res.status(400).json({
//         success: false,
//         message: 'EMI details are required and must be a non-empty array for EMI payment mode',
//       });
//     }

//     // Verify course year validity
//     const courseYearOrder = ['1st', '2nd', '3rd', '4th'];
//     if (!courseYearOrder.includes(newCourseYear)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid course year',
//       });
//     }

//     // Get current year and validate session years
//     const currentYear = new Date().getFullYear();
//     const sessionYears = Array.from({ length: 10 }, (_, i) => {
//       const startYear = currentYear - 5 + i;
//       return `${startYear}-${startYear + 1}`;
//     });

//     // Don't allow future session years beyond current year + 1
//     const maxAllowedSessionYear = `${currentYear}-${currentYear + 1}`;
//     if (parseInt(newSessionYear.split('-')[0]) > currentYear) {
//       return res.status(400).json({
//         success: false,
//         message: `Cannot use future session year beyond ${maxAllowedSessionYear}`,
//       });
//     }

//     if (!sessionYears.includes(newSessionYear)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid session year',
//       });
//     }

//     // Verify the student exists
//     const student = await prisma.student.findUnique({
//       where: { id: parseInt(studentId) },
//     });

//     if (!student) {
//       return res.status(404).json({
//         success: false,
//         message: 'Student not found',
//       });
//     }

//     // Get current academic record
//     const currentAcademic = await prisma.studentAcademicDetails.findUnique({
//       where: { id: parseInt(currentAcademicId) },
//     });

//     if (!currentAcademic || currentAcademic.studentId !== parseInt(studentId)) {
//       return res.status(404).json({
//         success: false,
//         message: 'Current academic record not found or does not belong to the student',
//       });
//     }

//     // Get all academic records for this student to check for validity of promotion/demotion
//     const allAcademicRecords = await prisma.studentAcademicDetails.findMany({
//       where: { studentId: parseInt(studentId) },
//       orderBy: [
//         { courseYear: 'asc' },
//         { sessionYear: 'asc' },
//       ],
//     });

//     const currentCourseYearIndex = courseYearOrder.indexOf(currentAcademic.courseYear);
//     const newCourseYearIndex = courseYearOrder.indexOf(newCourseYear);
//     const currentSessionIndex = sessionYears.indexOf(currentAcademic.sessionYear);
//     const newSessionIndex = sessionYears.indexOf(newSessionYear);

//     // Special handling for lateral entry students being depromoted to 1st year
//     if (isDepromote && student.isLateral && currentCourseYearIndex === 1 && newCourseYearIndex === 0) {
//       // This is a lateral entry student being depromoted from 2nd to 1st year
      
//       // Check if the session year is the same
//       if (currentAcademic.sessionYear !== newSessionYear) {
//         return res.status(400).json({
//           success: false,
//           message: 'For depromoting a lateral entry student to 1st year, session year must remain the same',
//         });
//       }

//       // Check if there's already a 1st year record
//       const existingFirstYearRecord = allAcademicRecords.find(
//         record => record.courseYear === '1st'
//       );

//       if (existingFirstYearRecord) {
//         return res.status(400).json({
//           success: false,
//           message: 'Student already has a record for 1st year. Cannot depromote.',
//         });
//       }
//     } 
//     // Regular depromote case (not for lateral entry)
//     else if (isDepromote) {
//       // Validate that we're not skipping course years when depromoting
//       if (newCourseYearIndex !== currentCourseYearIndex - 1) {
//         return res.status(400).json({
//           success: false,
//           message: `Cannot depromote from ${currentAcademic.courseYear} directly to ${newCourseYear}. Demotion must be sequential.`,
//         });
//       }

//       // Check if student is already in 3rd year or higher, can't depromote back to 1st
//       if (currentCourseYearIndex > 1 && newCourseYearIndex === 0) {
//         return res.status(400).json({
//           success: false,
//           message: `Cannot depromote from ${currentAcademic.courseYear} to 1st year. Only 2nd year students can be depromoted to 1st year.`,
//         });
//       }

//       // Check if session year is the same for demotion
//       if (currentAcademic.sessionYear !== newSessionYear) {
//         return res.status(400).json({
//           success: false,
//           message: 'For demotion, session year must remain the same',
//         });
//       }

//       // Check if there's already a record for the target course year
//       const existingTargetYearRecord = allAcademicRecords.find(
//         record => record.courseYear === newCourseYear
//       );

//       if (existingTargetYearRecord) {
//         return res.status(400).json({
//           success: false,
//           message: `Student already has a record for ${newCourseYear} year. Cannot depromote.`,
//         });
//       }
//     } 
//     // Regular promotion case
//     else {
//       // Check if the student already has an academic record for the new course year
//       const existingCourseYearRecord = allAcademicRecords.find(
//         record => record.courseYear === newCourseYear
//       );

//       if (existingCourseYearRecord) {
//         return res.status(400).json({
//           success: false,
//           message: `Student already has an academic record for ${newCourseYear} year`,
//         });
//       }

//       // Check if there's a gap in course year sequence for promotion
//       if (newCourseYearIndex !== currentCourseYearIndex + 1) {
//         return res.status(400).json({
//           success: false,
//           message: `Cannot promote from ${currentAcademic.courseYear} directly to ${newCourseYear}. Promotion must be sequential.`,
//         });
//       }

//       // Check if session year is same as current (not allowed for promotion)
//       if (currentAcademic.sessionYear === newSessionYear) {
//         return res.status(400).json({
//           success: false,
//           message: `For promotion, new session year cannot be the same as current session year (${currentAcademic.sessionYear})`,
//         });
//       }

//       // Check if there's a gap in session year sequence
//       if (newSessionIndex <= currentSessionIndex) {
//         return res.status(400).json({
//           success: false,
//           message: `New session year (${newSessionYear}) cannot be before or same as current session year (${currentAcademic.sessionYear})`,
//         });
//       }

//       if (newSessionIndex !== currentSessionIndex + 1) {
//         return res.status(400).json({
//           success: false,
//           message: `Cannot skip session years. Next valid session year should be ${sessionYears[currentSessionIndex + 1]}`,
//         });
//       }
//     }

//     // Create new academic record for the student
//     const academicData = {
//       studentId: parseInt(studentId),
//       courseYear: newCourseYear,
//       sessionYear: newSessionYear,
//       adminAmount: parseFloat(adminAmount),
//       feesAmount: parseFloat(feesAmount),
//       paymentMode,
//       numberOfEMI: paymentMode === 'EMI' ? parseInt(numberOfEMI) : null,
//       ledgerNumber: ledgerNumber || null,
//       createdBy: modifiedBy,
//       createdOn: new Date(),
//       modifiedBy,
//     };

//     // Create the new academic record
//     const newAcademicRecord = await prisma.studentAcademicDetails.create({
//       data: academicData,
//     });

//     // If payment mode is EMI, create EMI details
//     if (paymentMode === 'EMI' && emiDetails && emiDetails.length > 0) {
//       await Promise.all(
//         emiDetails.map(async (emi) => {
//           await prisma.eMIDetails.create({
//             data: {
//               studentId: parseInt(studentId),
//               studentAcademicId: newAcademicRecord.id,
//               emiNumber: emi.emiNumber,
//               amount: parseFloat(emi.amount),
//               dueDate: new Date(emi.dueDate),
//               createdBy: modifiedBy,
//               createdOn: new Date(),
//               modifiedBy,
//             },
//           });
//         })
//       );
//     }

//     // If this is a lateral entry student being depromoted to 1st year, update the isLateral flag
//     if (isDepromote && student.isLateral && currentCourseYearIndex === 1 && newCourseYearIndex === 0) {
//       await prisma.student.update({
//         where: { id: parseInt(studentId) },
//         data: {
//           isLateral: false,
//           modifiedBy,
//           modifiedOn: new Date(),
//         },
//       });
//     }

//     // Return success response
//     const actionType = isDepromote ? 'demoted' : 'promoted';
//     res.status(200).json({
//       success: true,
//       message: `Student successfully ${actionType} to ${newCourseYear} year for session ${newSessionYear}`,
//       data: newAcademicRecord,
//     });
//   } catch (error) {
//     console.error('Error promoting/demoting student:', error.stack);
//     res.status(500).json({
//       success: false,
//       message: error.message || 'An error occurred while promoting/demoting the student',
//     });
//   }
// });



// DELETE /students/:id - Delete a student and all related records
router.delete('/students/:id', async (req, res, next) => {
  try {
    const studentId = parseInt(req.params.id);

    // Fetch student and related records
    const studentQuery = `
      SELECT s.*, d.id AS docId, d.publicId
      FROM Student s
      LEFT JOIN Documents d ON s.id = d.studentId
      WHERE s.id = @studentId
    `;
    const studentParams = { studentId: { type: sql.Int, value: studentId } };
    const studentResult = await executeQuery(studentQuery, studentParams);
    const studentRecords = studentResult.recordset;
    const student = studentRecords.find(row => row.id === studentId);

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Collect all public IDs for Cloudinary deletion
    const publicIds = studentRecords
      .filter(row => row.publicId)
      .map(row => row.publicId);

    // Fetch payment records to get receipt public IDs
    const paymentQuery = `
      SELECT receiptPublicId
      FROM StudentPayment
      WHERE studentId = @studentId AND receiptPublicId IS NOT NULL
    `;
    const paymentResult = await executeQuery(paymentQuery, studentParams);
    const paymentPublicIds = paymentResult.recordset
      .filter(row => row.receiptPublicId)
      .map(row => row.receiptPublicId);

    publicIds.push(...paymentPublicIds);

    // Delete files from Cloudinary
    if (publicIds.length > 0) {
      try {
        await Promise.all(publicIds.map(publicId => deleteFromCloudinary(publicId)));
      } catch (cloudinaryError) {
        console.error('Error deleting files from Cloudinary:', cloudinaryError);
        return res.status(500).json({ success: false, message: 'Failed to delete associated files from Cloudinary' });
      }
    }

    // Delete all related records in a transaction
    const pool = await poolConnect;
    const transaction = new sql.Transaction(pool);
    try {
      await transaction.begin();

      // Delete EMI Details
      const deleteEmiQuery = `
        DELETE FROM EMIDetails
        WHERE studentId = @studentId
      `;
      const deleteEmiRequest = new sql.Request(transaction);
      deleteEmiRequest.input('studentId', sql.Int, studentId);
      await deleteEmiRequest.query(deleteEmiQuery);

      // Delete Student Payment Records
      const deletePaymentQuery = `
        DELETE FROM StudentPayment
        WHERE studentId = @studentId
      `;
      const deletePaymentRequest = new sql.Request(transaction);
      deletePaymentRequest.input('studentId', sql.Int, studentId);
      await deletePaymentRequest.query(deletePaymentQuery);

      // Delete Student Academic Details
      const deleteAcademicQuery = `
        DELETE FROM StudentAcademicDetails
        WHERE studentId = @studentId
      `;
      const deleteAcademicRequest = new sql.Request(transaction);
      deleteAcademicRequest.input('studentId', sql.Int, studentId);
      await deleteAcademicRequest.query(deleteAcademicQuery);

      // Delete Documents
      const deleteDocsQuery = `
        DELETE FROM Documents
        WHERE studentId = @studentId
      `;
      const deleteDocsRequest = new sql.Request(transaction);
      deleteDocsRequest.input('studentId', sql.Int, studentId);
      await deleteDocsRequest.query(deleteDocsQuery);

      // Delete Student
      const deleteStudentQuery = `
        DELETE FROM Student
        WHERE id = @studentId
      `;
      const deleteStudentRequest = new sql.Request(transaction);
      deleteStudentRequest.input('studentId', sql.Int, studentId);
      await deleteStudentRequest.query(deleteStudentQuery);

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    } finally {
      
    }

    res.status(200).json({ success: true, message: 'Student and all related records deleted successfully' });
  } catch (err) {
    // console.error('Error deleting student:', error);
        next(err);
    res.status(500).json({ success: false, message: 'Failed to delete student', error: err.message });
  }
});

// Helper function to delete from Cloudinary (should be defined elsewhere in your code)
async function deleteFromCloudinary(publicId) {
  if (!publicId) return;
  
  try {
    const cloudinary = require('cloudinary').v2;
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary deletion error:', error);
    throw error;
  }
}

// GET academic details for a student
router.get('/students/:studentId/academic-details', async (req, res, next) => {
  try {
    const studentId = parseInt(req.params.studentId);

    // Fetch academic details
    const academicQuery = `
      SELECT *
      FROM StudentAcademicDetails
      WHERE studentId = @studentId
      ORDER BY createdOn DESC
    `;
    const academicParams = { studentId: { type: sql.Int, value: studentId } };
    const academicResult = await executeQuery(academicQuery, academicParams);
    const academicDetails = academicResult.recordset;

    // Fetch EMI details for each academic record
    for (const academic of academicDetails) {
      const emiQuery = `
        SELECT *
        FROM EMIDetails
        WHERE studentAcademicId = @academicId
        ORDER BY emiNumber ASC
      `;
      const emiParams = { academicId: { type: sql.Int, value: academic.id } };
      const emiResult = await executeQuery(emiQuery, emiParams);
      academic.emiDetails = emiResult.recordset;
    }

    res.status(200).json({
      success: true,
      data: academicDetails,
    });
  } catch (err) {
    // console.error('Error fetching academic details:', error);
        next(err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch academic details',
    });
  }
});

router.get('/students/:studentId/academic-details/latest', async (req, res, next) => {
  try {
    const studentId = parseInt(req.params.studentId);

    // Query to get the latest academic detail
    const academicQuery = `
      SELECT TOP 1 *
      FROM StudentAcademicDetails
      WHERE studentId = @studentId
      ORDER BY createdOn DESC
    `;
    const academicParams = {
      studentId: { type: sql.Int, value: studentId },
    };
    const academicResult = await executeQuery(academicQuery, academicParams);
    const latestAcademicDetail = academicResult.recordset[0];

    if (!latestAcademicDetail) {
      return res.status(404).json({
        success: false,
        message: 'No academic records found',
      });
    }

    // Query to get associated EMI details
    const emiQuery = `
      SELECT *
      FROM EMIDetails
      WHERE studentAcademicId = @studentAcademicId
      ORDER BY emiNumber ASC
    `;
    const emiParams = {
      studentAcademicId: { type: sql.Int, value: latestAcademicDetail.id },
    };
    const emiResult = await executeQuery(emiQuery, emiParams);
    const emiDetails = emiResult.recordset;

    // Combine the academic detail with EMI details
    const responseData = {
      ...latestAcademicDetail,
      emiDetails,
    };

    res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    // console.error('Error fetching latest academic detail:', error.stack);
        next(err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch latest academic details',
      details: error.message,
    });
  }
});


router.get('/students/:studentId/academic-details/:academicId/emi', async (req, res, next) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const academicId = parseInt(req.params.academicId);

    // Validate input parameters
    if (isNaN(studentId) || isNaN(academicId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid studentId or academicId: both must be numbers',
      });
    }

    // Query to verify the academic record exists and belongs to the student
    const academicQuery = `
      SELECT id
      FROM StudentAcademicDetails
      WHERE id = @academicId AND studentId = @studentId
    `;
    const academicParams = {
      studentId: { type: sql.Int, value: studentId },
      academicId: { type: sql.Int, value: academicId },
    };
    const academicResult = await executeQuery(academicQuery, academicParams);
    const academicRecord = academicResult.recordset[0];

    if (!academicRecord) {
      return res.status(404).json({
        success: false,
        message: 'Academic record not found for the specified student',
      });
    }

    // Query to get EMI details
    const emiQuery = `
      SELECT id, studentId, studentAcademicId, emiNumber, amount, dueDate, 
             createdBy, createdOn, modifiedBy, modifiedOn
      FROM EMIDetails
      WHERE studentId = @studentId AND studentAcademicId = @academicId
      ORDER BY emiNumber ASC
    `;
    const emiParams = {
      studentId: { type: sql.Int, value: studentId },
      academicId: { type: sql.Int, value: academicId },
    };
    const emiResult = await executeQuery(emiQuery, emiParams);
    const emiDetails = emiResult.recordset;

    res.status(200).json({
      success: true,
      data: emiDetails,
    });
  } catch (err) {
    // console.error('Error fetching EMI details:', error.stack);
        next(err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch EMI details',
      details: error.message,
    });
  }
});


// Create new payment

router.post('/studentPayment', upload.single('receipt'), async (req, res, next) => {
  try {
    const {
      studentId,
      studentAcademicId,
      paymentMode,
      transactionNumber,
      amount,
      receivedDate,
      approvedBy,
      amountType,
      courseYear,
      sessionYear,
      userId,
      isLocal = true, // Enforce local storage only
    } = req.body;

    // Validate required fields
    const requiredFields = { userId, amountType, amount, paymentMode, receivedDate };
    const missingFields = Object.keys(requiredFields).filter((key) => !requiredFields[key]);
    if (missingFields.length > 0) {
      return res.status(400).json({ success: false, error: `Missing required fields: ${missingFields.join(', ')}` });
    }

    // Validate amount
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Amount must be a valid positive number' });
    }

    // Validate paymentMode
    const validPaymentModes = ['cash', 'check', 'bank transfer', 'upi'];
    if (!validPaymentModes.includes(paymentMode)) {
      return res.status(400).json({ success: false, error: 'Payment mode must be one of: cash, check, bank transfer, upi' });
    }

    // Validate receivedDate
    const parsedDate = new Date(receivedDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ success: false, error: 'ReceivedDate must be a valid date' });
    }

    // Check if transactionNumber is unique (if provided)
    if (transactionNumber) {
      const transactionQuery = `
        SELECT id
        FROM StudentPayment
        WHERE transactionNumber = @transactionNumber
      `;
      const transactionParams = { transactionNumber: { type: sql.NVarChar, value: transactionNumber } };
      const transactionResult = await executeQuery(transactionQuery, transactionParams);
      if (transactionResult.recordset[0]) {
        return res.status(400).json({ success: false, error: 'Transaction number already exists' });
      }
    }

    // Verify user exists
    const userQuery = `
      SELECT name, email
      FROM [User]
      WHERE user_id = @userId
    `;
    const userParams = { userId: { type: sql.Int, value: parseInt(userId) } };
    const userResult = await executeQuery(userQuery, userParams);
    const user = userResult.recordset[0];

    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    let receiptData = { receiptUrl: null, receiptPublicId: null };
    if (req.file) {
      // Local storage only
      const filePath = `/StudentPayment/${req.file.filename}`;
      receiptData = {
        receiptUrl: filePath,
        receiptPublicId: null,
      };
    }

    // Create payment record
    let newPayment;
    const pool = await poolConnect;
    const transaction = new sql.Transaction(pool);
    try {
      await transaction.begin();
      const request = new sql.Request(transaction);

      const paymentQuery = `
        INSERT INTO StudentPayment (
          studentId, studentAcademicId, paymentMode, transactionNumber, amount, receivedDate,
          approvedBy, amountType, courseYear, sessionYear, createdBy, createdOn,
          receiptUrl, receiptPublicId
        )
        OUTPUT INSERTED.*
        VALUES (
          @studentId, @studentAcademicId, @paymentMode, @transactionNumber, @amount, @receivedDate,
          @approvedBy, @amountType, @courseYear, @sessionYear, @createdBy, @createdOn,
          @receiptUrl, @receiptPublicId
        )
      `;
      request.input('studentId', sql.Int, parseInt(studentId));
      request.input('studentAcademicId', sql.Int, studentAcademicId ? parseInt(studentAcademicId) : null);
      request.input('paymentMode', sql.NVarChar, paymentMode);
      request.input('transactionNumber', sql.NVarChar, transactionNumber || null);
      request.input('amount', sql.Decimal(10, 2), parsedAmount);
      request.input('receivedDate', sql.Date, parsedDate);
      request.input('approvedBy', sql.NVarChar, approvedBy || null);
      request.input('amountType', sql.NVarChar, amountType);
      request.input('courseYear', sql.NVarChar, courseYear || null);
      request.input('sessionYear', sql.NVarChar, sessionYear || null);
      request.input('createdBy', sql.NVarChar, user.name || user.email);
      request.input('createdOn', sql.DateTime, new Date());
      request.input('receiptUrl', sql.NVarChar, receiptData.receiptUrl);
      request.input('receiptPublicId', sql.NVarChar, receiptData.receiptPublicId);

      const paymentResult = await request.query(paymentQuery);
      newPayment = paymentResult.recordset[0];

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    return res.status(201).json({ success: true, data: newPayment });
  } catch (err) {
    console.error('Payment creation error:', err);
    next(err); // Pass to error handler
  }
});
// New GET endpoint for local files

router.get('/studentPayment/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '../../public/uploads/StudentPayment', filename);
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error serving local file:', err);
      res.status(404).json({ success: false, error: 'File not found' });
    }
  });
});


// Edit Cloudinary file
router.post('/studentPayment/edit/:paymentId', async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const { edits } = req.body; // Expect edits object (e.g., { width, height, crop })

    const paymentQuery = `
      SELECT receiptUrl, receiptPublicId
      FROM StudentPayment
      WHERE id = @paymentId
    `;
    const paymentParams = { paymentId: { type: sql.Int, value: parseInt(paymentId) } };
    const paymentResult = await executeQuery(paymentQuery, paymentParams);
    const payment = paymentResult.recordset[0];

    if (!payment || !payment.receiptPublicId) {
      return res.status(404).json({ success: false, error: 'Payment or receipt not found' });
    }

    // Fetch original image from Cloudinary
    const response = await fetch(payment.receiptUrl);
    const buffer = await response.buffer();

    // Apply edits (simplified example, use a library like sharp for actual editing)
    const editedBuffer = buffer; // Placeholder: Replace with actual editing logic
    const result = await uploadToCloudinary(editedBuffer, 'PaymentReceipt', payment.receiptPublicId, edits);

    // Update database with new URL and public ID
    const updateQuery = `
      UPDATE StudentPayment
      SET receiptUrl = @receiptUrl, receiptPublicId = @receiptPublicId
      WHERE id = @paymentId
    `;
    const updateParams = {
      receiptUrl: { type: sql.NVarChar, value: result.secure_url },
      receiptPublicId: { type: sql.NVarChar, value: result.public_id },
      paymentId: { type: sql.Int, value: parseInt(paymentId) },
    };
    await executeQuery(updateQuery, updateParams);

    res.status(200).json({ success: true, data: { receiptUrl: result.secure_url } });
  } catch (err) {
    console.error('Error editing Cloudinary file:', err);
    next(err);
  }
});

// GET payments for a specific student by studentId
router.get('/studentPayment/:studentId', async (req, res, next) => {
  try {
    const { studentId } = req.params;

    if (!studentId || isNaN(parseInt(studentId))) {
      return res.status(400).json({ success: false, error: 'Invalid student ID' });
    }

    const paymentQuery = `
      SELECT 
        sp.*,
        s.fName, s.lName, s.rollNumber, s.email, s.mobileNumber, s.fatherName,
        c.courseName,
        col.collegeName,
        sa.sessionYear AS academicSessionYear, sa.courseYear AS academicCourseYear
      FROM StudentPayment sp
      LEFT JOIN Student s ON sp.studentId = s.id
      LEFT JOIN Course c ON s.courseId = c.id
      LEFT JOIN College col ON s.collegeId = col.id
      LEFT JOIN StudentAcademicDetails sa ON sp.studentAcademicId = sa.id
      WHERE sp.studentId = @studentId
    `;
    const paymentParams = { studentId: { type: sql.Int, value: parseInt(studentId) } };
    const paymentResult = await executeQuery(paymentQuery, paymentParams);
    const payments = paymentResult.recordset;

    if (payments.length === 0) {
      return res.status(404).json({ success: false, error: `No payments found for student ID ${studentId}` });
    }

    const formattedPayments = payments.map(payment => ({
      ...payment,
      student: {
        fName: payment.fName,
        lName: payment.lName,
        rollNumber: payment.rollNumber,
        email: payment.email,
        mobileNumber: payment.mobileNumber,
        fatherName: payment.fatherName,
        course: { courseName: payment.courseName },
        college: { collegeName: payment.collegeName },
      },
      studentAcademic: {
        sessionYear: payment.academicSessionYear,
        courseYear: payment.academicCourseYear,
      },
    }));

    res.status(200).json({ success: true, data: formattedPayments });
  } catch (err) {
    // console.error('Error fetching payments:', error);
        next(err);
    res.status(500).json({ success: false, error: 'Failed to fetch payments' });
  }
});

// GET payment details by sa.ID
router.get('/academic/:studentAcademicId', async (req, res, next) => {
  try {
    const { studentAcademicId } = req.params;

    if (!studentAcademicId || isNaN(parseInt(studentAcademicId))) {
      return res.status(400).json({ success: false, error: 'Invalid student academic ID' });
    }

    const paymentQuery = `
      SELECT 
        sp.*,
        s.fName, s.lName, s.rollNumber, s.email, s.mobileNumber, s.fatherName,
        c.courseName,
        col.collegeName,
        sa.sessionYear AS academicSessionYear, sa.courseYear AS academicCourseYear
      FROM StudentPayment sp
      LEFT JOIN Student s ON sp.studentId = s.id
      LEFT JOIN Course c ON s.courseId = c.id
      LEFT JOIN College col ON s.collegeId = col.id
      LEFT JOIN StudentAcademicDetails sa ON sp.studentAcademicId = sa.id
      WHERE sa.id = @id
    `;
    const paymentParams = { id: { type: sql.Int, value: parseInt(studentAcademicId) } };
    const paymentResult = await executeQuery(paymentQuery, paymentParams);
    const payments = paymentResult.recordset;

    if (payments.length === 0) {
      return res.status(404).json({ success: false, error: `No payments found for student academic ID ${studentAcademicId}` });
    }

    const formattedPayments = payments.map(payment => ({
      ...payment,
      student: {
        fName: payment.fName,
        lName: payment.lName,
        rollNumber: payment.rollNumber,
        email: payment.email,
        mobileNumber: payment.mobileNumber,
        fatherName: payment.fatherName,
        course: { courseName: payment.courseName },
        college: { collegeName: payment.collegeName },
      },
      studentAcademic: {
        sessionYear: payment.academicSessionYear,
        courseYear: payment.academicCourseYear,
      },
    }));

    res.status(200).json({ success: true, data: formattedPayments });
  } catch (err) {
    next(err);
  }
});

// Generate and download payment slip
router.get('/studentPayment/:paymentId/slip', async (req, res, next) => {
  try {
    const { paymentId } = req.params;

    // Validate paymentId
    if (!paymentId || isNaN(parseInt(paymentId)) || parseInt(paymentId) <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid or missing payment ID' });
    }

    // Fetch payment details
    const paymentQuery = `
      SELECT 
        sp.*,
        s.fName, s.lName, s.rollNumber, s.email, s.mobileNumber, s.fatherName,
        c.courseName,
        sa.sessionYear, sa.courseYear
      FROM StudentPayment sp
      LEFT JOIN Student s ON sp.studentId = s.id
      LEFT JOIN Course c ON s.courseId = c.id
      LEFT JOIN StudentAcademicDetails sa ON sp.studentAcademicId = sa.id
      WHERE sp.id = @paymentId
    `;
    const paymentParams = { paymentId: { type: sql.Int, value: parseInt(paymentId) } };
    const paymentResult = await executeQuery(paymentQuery, paymentParams);
    const payment = paymentResult.recordset[0];

    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment record not found' });
    }

    const formattedPayment = {
      ...payment,
      student: {
        fName: payment.fName,
        lName: payment.lName,
        rollNumber: payment.rollNumber,
        email: payment.email,
        mobileNumber: payment.mobileNumber,
        fatherName: payment.fatherName,
        course: { courseName: payment.courseName },
      },
      studentAcademic: {
        sessionYear: payment.sessionYear,
        courseYear: payment.courseYear,
      },
    };

    const doc = new PDFDocument({ size: [400, 600], margin: 30 });

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=payment-slip-${paymentId}.pdf`);

    // Handle errors in the PDF stream
    doc.on('error', (err) => {
      // console.error('PDF stream error:', err);
          next(err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Failed to generate payment slip' });
      }
    });

    // Pipe the PDF to the response
    doc.pipe(res);

    // Outer border
    doc.rect(10, 10, doc.page.width - 20, doc.page.height - 20).stroke('#1E90FF');

    // Add PAID stamp as a background watermark (added early so it's behind text)
    doc.save();
    doc.rotate(-30, { origin: [doc.page.width / 2, 450] });
    doc.fontSize(60)
       .fillColor('rgba(0, 128, 0, 0.3)')
       .text('PAID', doc.page.width / 2 - 90, 450, { width: 180, align: 'center' });
    doc.restore();

    // Logo Position
    const logoRadius = 30;
    const logoX = doc.page.width / 2;
    const logoY = 60;
    const logoPath = path.join(process.cwd(), 'public/images/logo.jpg');

    try {
      doc.image(logoPath, logoX - logoRadius, logoY - logoRadius, { width: logoRadius * 2 });
    } catch (err) {
      console.warn('Failed to load logo, using placeholder:', err.message);
      doc.circle(logoX, logoY, logoRadius)
         .fillOpacity(0.1)
         .fill('#1E90FF')
         .stroke('#1E90FF');
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#1E90FF')
         .fillOpacity(1)
         .text('LOGO', logoX - 15, logoY - 5, { align: 'center' });
    }

    // Institute Name
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#333333')
       .text('JK Institute Of Pharmacy', doc.page.width / 2 - 80, logoY + logoRadius + 10, { align: 'center', width: 160 });

    doc.moveDown(1);
    doc.moveTo(30, doc.y).lineTo(doc.page.width - 30, doc.y).stroke('#CCCCCC');
    doc.moveDown(0.5);

    // === Student Details ===
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#006400')
       .text('Student Details', 40);

    doc.fontSize(9)
       .font('Helvetica')
       .fillColor('#333333');

    const leftX = 40;
    const rightX = 200;
    let yPos = doc.y + 10;

    const drawLabelValue = (label, value, offsetY) => {
      const safeValue = value || 'N/A';
      doc.font('Helvetica-Bold').text(`${label}`, leftX, yPos + offsetY, { width: 150 });
      doc.font('Helvetica').text(`${safeValue}`, rightX, yPos + offsetY, { width: 150 });
    };

    drawLabelValue('Name:', `${formattedPayment.student.fName} ${formattedPayment.student.lName || ''}`, 0);
    drawLabelValue('Roll Number:', formattedPayment.student.rollNumber, 15);
    drawLabelValue('Email:', formattedPayment.student.email, 30);
    drawLabelValue('Mobile Number:', formattedPayment.student.mobileNumber, 45);
    drawLabelValue('Father\'s Name:', formattedPayment.student.fatherName, 60);
    drawLabelValue('Course:', formattedPayment.student.course.courseName, 75);
    drawLabelValue('Session Year:', formattedPayment.studentAcademic.sessionYear, 90);
    drawLabelValue('Course Year:', formattedPayment.studentAcademic.courseYear, 105);

    // Modified: Moved payment details section up - reduced spacing
    doc.moveDown(1);
    doc.moveTo(30, doc.y).lineTo(doc.page.width - 30, doc.y).stroke('#CCCCCC');
    doc.moveDown(0.3);

    // === Payment Details ===
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#006400')
       .text('Payment Details', leftX);

    doc.fontSize(9)
       .font('Helvetica')
       .fillColor('#333333');

    yPos = doc.y + 10;

    drawLabelValue('Amount Type:', formattedPayment.amountType === 'adminAmount' ? 'Admin Amount' : formattedPayment.amountType, 0);
    drawLabelValue('Payment Mode:', formattedPayment.paymentMode, 15);
    drawLabelValue('Transaction Number:', formattedPayment.transactionNumber, 30);
    drawLabelValue('Amount:', `${formattedPayment.amount.toFixed(2)}`, 45);
    drawLabelValue('Received Date:', `${new Date(formattedPayment.receivedDate).toLocaleDateString('en-GB')}`, 60);
    
    // Status with green color
    doc.font('Helvetica-Bold').text('Status:', leftX, yPos + 75, { width: 150 });
    doc.font('Helvetica').fillColor('#008000')
       .text('PAID', rightX, yPos + 75, { width: 150 });

    // === Footer ===
    doc.moveTo(30, doc.page.height - 70).lineTo(doc.page.width - 30, doc.page.height - 70).stroke('#CCCCCC');
    doc.fontSize(8)
       .font('Helvetica-Oblique')
       .fillColor('#666666')
       .text('Generated by JK Institute of Pharmacy', doc.page.width / 2 - 80, doc.page.height - 60, { align: 'center', width: 160 });

    doc.fontSize(7)
       .text(`Date: ${new Date().toLocaleDateString('en-GB')}`, doc.page.width / 2 - 80, doc.page.height - 45, { align: 'center', width: 160 });

    // End the PDF document
    doc.end();
  } catch (err) {
    // console.error('Error generating payment slip:', error);
        next(err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Internal server error while generating payment slip' });
    }
  }
});


// Check Payment Handover Route
router.get('/paymentHandover/check/:paymentId', async (req ,res) => {
  try {
    const { paymentId } = req.params;

    if (!paymentId || isNaN(parseInt(paymentId))) {
      return res.status(400).json({ success: false, error: 'Invalid payment ID' });
    }

    const query = `
      SELECT id
      FROM PaymentHandover
      WHERE paymentId = @paymentId
    `;
    const params = { paymentId: { type: sql.Int, value: parseInt(paymentId) } };
    const result = await executeQuery(query, params);

    return res.status(200).json({
      success: true,
      hasHandover: result.recordset.length > 0,
    });
  } catch (error) {
    console.error('Error checking payment handover:', error);
    return res.status(500).json({ success: false, error: 'Failed to check payment handover' });
  }
});

// Delete Student Payment Route
router.delete('/studentPayment/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (!paymentId || isNaN(parseInt(paymentId))) {
      return res.status(400).json({ success: false, error: 'Invalid payment ID' });
    }

    // Check if payment exists
    const checkQuery = `
      SELECT id
      FROM StudentPayment
      WHERE id = @paymentId
    `;
    const checkParams = { paymentId: { type: sql.Int, value: parseInt(paymentId) } };
    const checkResult = await executeQuery(checkQuery, checkParams);

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    // Delete the payment
    const deleteQuery = `
      DELETE FROM StudentPayment
      WHERE id = @paymentId
    `;
    await executeQuery(deleteQuery, checkParams);

    return res.status(200).json({ success: true, message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete payment' });
  }
});

// GET /amountType - Fetch all payments
router.get('/amountType', async (req, res, next) => {
  try {
    const paymentQuery = `
      SELECT 
        sp.id, sp.amount, sp.amountType, sp.paymentMode, sp.receivedDate, sp.transactionNumber, sp.courseYear, sp.sessionYear,
        s.id AS studentId, s.fName, s.lName, s.rollNumber, s.mobileNumber, s.email,
        c.courseName,
        col.collegeName,
        sa.id AS academicId, sa.sessionYear AS academicSessionYear, sa.feesAmount, sa.adminAmount, sa.paymentMode AS academicPaymentMode, sa.courseYear AS academicCourseYear
      FROM StudentPayment sp
      LEFT JOIN Student s ON sp.studentId = s.id
      LEFT JOIN Course c ON s.courseId = c.id
      LEFT JOIN College col ON s.collegeId = col.id
      LEFT JOIN StudentAcademicDetails sa ON sp.studentAcademicId = sa.id
    `;
    const paymentResult = await executeQuery(paymentQuery);
    const payments = paymentResult.recordset;

    const formattedPayments = payments.map(payment => ({
      id: payment.id,
      amount: payment.amount,
      amountType: payment.amountType,
      paymentMode: payment.paymentMode,
      receivedDate: payment.receivedDate,
      transactionNumber: payment.transactionNumber,
      courseYear: payment.courseYear,
      sessionYear: payment.sessionYear,
      student: {
        id: payment.studentId,
        fName: payment.fName,
        lName: payment.lName,
        rollNumber: payment.rollNumber,
        mobileNumber: payment.mobileNumber,
        email: payment.email,
        course: { courseName: payment.courseName },
        college: { collegeName: payment.collegeName },
      },
      studentAcademic: {
        id: payment.academicId,
        sessionYear: payment.academicSessionYear,
        feesAmount: payment.feesAmount,
        adminAmount: payment.adminAmount,
        paymentMode: payment.academicPaymentMode,
        courseYear: payment.academicCourseYear,
      },
    }));

    res.status(200).json({ success: true, data: formattedPayments });
  } catch (err) {
    // console.error('Error fetching payments:', error);
        next(err);
    res.status(500).json({ success: false, error: 'Failed to fetch payments' });
  }
});

// POST route to handle registration form submission
router.post('/register', async (req, res, next) => {
  const { fullName, mobileNumber, email, course } = req.body;
  try {
      // Validate inputs
      if (!fullName || fullName.trim() === '') {
          return res.status(400).json({ message: 'Full name is required' });
      }
      if (!mobileNumber || !/^\d{10}$/.test(mobileNumber)) {
          return res.status(400).json({ message: 'Valid 10-digit mobile number is required' });
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return res.status(400).json({ message: 'Valid email is required' });
      }
      if (!course || course.trim() === '') {
          return res.status(400).json({ message: 'Course is required' });
      }

      // Check for duplicates
      const checkQuery = `
          SELECT id
          FROM CourseEnquiry
          WHERE email = @email OR mobileNumber = @mobileNumber
      `;
      const checkParams = {
          email: { type: sql.NVarChar, value: email },
          mobileNumber: { type: sql.NVarChar, value: mobileNumber },
      };
      const checkResult = await executeQuery(checkQuery, checkParams);
      if (checkResult.recordset[0]) {
          return res.status(400).json({ message: 'Email or mobile number already registered' });
      }

      const pool = await poolConnect;
      const transaction = new sql.Transaction(pool);
      let newRegistration;

      try {
          await transaction.begin();

          const registrationQuery = `
              INSERT INTO CourseEnquiry (
                fullName, mobileNumber, email, course, isContacted, createdAt
              )
              OUTPUT INSERTED.*
              VALUES (
                @fullName, @mobileNumber, @email, @course, @isContacted, @createdAt
              )
          `;
          const registrationParams = {
              fullName: { type: sql.NVarChar, value: fullName },
              mobileNumber: { type: sql.NVarChar, value: mobileNumber },
              email: { type: sql.NVarChar, value: email },
              course: { type: sql.NVarChar, value: course },
              isContacted: { type: sql.Bit, value: false },
              createdAt: { type: sql.DateTime, value: new Date() },
          };

          const registrationResult = await executeQuery(registrationQuery, registrationParams, transaction);
          newRegistration = registrationResult.recordset[0];

          await transaction.commit();
      } catch (error) {
          await transaction.rollback();
          throw error;
      } finally {
          // Do NOT close the global pool here; let it persist for other requests
      }
      console.log('Student registration successful:', newRegistration);
      res.status(201).json({ message: 'Registration successful', data: newRegistration });
  } catch (err) {
      next(err); // Pass the error to Express error-handling middleware
  }
});

// GET /getCourseEnquiry - Fetch all course enquiries
router.get('/getCourseEnquiry', async (req, res, next) => {
  try {
    const enquiryQuery = `
      SELECT *
      FROM CourseEnquiry
      ORDER BY createdAt DESC
    `;
    const enquiryResult = await executeQuery(enquiryQuery);
    const enquiries = enquiryResult.recordset;

    res.status(200).json({ message: 'Fetched enquiries successfully', data: enquiries });
  } catch (err) {
    // console.error('Error fetching course enquiries:', error);
        next(err);
    res.status(500).json({ message: 'Error fetching course enquiries' });
  }
});

// Update the enquiry status (e.g., mark as contacted
router.post('/updateEnquiryStatus', async (req, res, next) => {
  const { id, isContacted, modifiedAt, modifiedby } = req.body;

  try {
    // Validate inputs
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ message: 'Valid enquiry ID is required' });
    }
    if (isContacted === undefined || isContacted === null) {
      return res.status(400).json({ message: 'isContacted status is required' });
    }

    const pool = await poolConnect;
    const transaction = new sql.Transaction(pool);
    let updatedEnquiry;

    try {
      await transaction.begin();

      const updateQuery = `
        UPDATE CourseEnquiry
        SET isContacted = @isContacted, modifiedAt = @modifiedAt, modifiedby = @modifiedby
        WHERE id = @id
        SELECT *
        FROM CourseEnquiry
        WHERE id = @id
      `;
      const params = {
        id: { type: sql.Int, value: Number(id) },
        isContacted: { type: sql.Bit, value: isContacted },
        modifiedAt: { type: sql.DateTime, value: modifiedAt ? new Date(modifiedAt) : null },
        modifiedby: { type: sql.NVarChar, value: modifiedby || null },
      };

      const updateResult = await executeQuery(updateQuery, params, transaction);
      updatedEnquiry = updateResult.recordset[0];

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    } finally {
      // Do NOT close the global pool here; let it persist for other requests
    }
    console.log( 'Enquiry status updated successfully')
    res.status(200).json({
      message: 'Enquiry status updated successfully',
      data: updatedEnquiry,
    });
  } catch (err) {
    // console.error('Error updating enquiry status:', error.stack);
        next(err);
    res.status(500).json({ message: 'Error updating enquiry status', error: error.message });
  }
});

module.exports = router;