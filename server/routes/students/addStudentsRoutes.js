const express = require('express');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const uploadToCloudinary = require('../../utils/cloudinaryUpload');
const bcrypt = require('bcrypt');
const PDFDocument = require('pdfkit');

const router = express.Router();
const prisma = new PrismaClient();
const path = require('path');
// Configure Multer for in-memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// GET /colleges - Fetch all colleges
router.get('/colleges', async (req, res) => {
  try {
    const colleges = await prisma.college.findMany({
      orderBy: { id: 'asc' },
    });
    res.status(200).json(colleges);
  } catch (error) {
    console.error('Error fetching colleges:', error);
    res.status(500).json({ success: false, message: 'Error fetching colleges', error });
  }
});

// GET /courses - Fetch all courses
router.get('/courses', async (req, res) => {
  try {
    const courses = await prisma.course.findMany({
      orderBy: { id: 'asc' },
    });
    res.status(200).json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ success: false, message: 'Error fetching courses', error });
  }
});


// POST /students - Create a new student with academic details and EMI details
router.post('/students', upload.fields([
  { name: 'StudentImage' },
  { name: 'CasteCertificate' },
  { name: 'TenthMarks' },
  { name: 'TwelfthMarks' },
  { name: 'Residential' },
  { name: 'Income' }
]), async (req, res) => {
  try {
    const {
      RollNumber, FName, LName, DOB, Gender, MobileNumber, AlternateNumber,
      EmailId, FatherName, FatherMobileNumber, MotherName, Address, City, State, Pincode,
      CourseId, CourseYear, Category, LedgerNumber, CollegeId, AdmissionMode,
      AdmissionDate, IsDiscontinue, DiscontinueOn, DiscontinueBy, FineAmount,
      RefundAmount, CreatedBy, SessionYear, PaymentMode, NumberOfEMI, isLateral
    } = req.body;

    console.log("Request Body:", req.body);

    // Parse EMI details
    const emiDetails = [];
    let totalEMIAmount = 0;
    if (PaymentMode === 'EMI' && NumberOfEMI) {
      let index = 0;
      while (req.body[`emiDetails[${index}].emiNumber`]) {
        const emiNumber = parseInt(req.body[`emiDetails[${index}].emiNumber`]) || (index + 1);
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

    console.log("Parsed EMI Details:", emiDetails);

    // Validate CollegeId
    if (!CollegeId || CollegeId === '') {
      return res.status(400).json({ success: false, message: 'CollegeId is required' });
    }
    const collegeIdNum = parseInt(CollegeId);
    if (isNaN(collegeIdNum)) {
      return res.status(400).json({ success: false, message: 'CollegeId must be a valid number' });
    }
    const collegeExists = await prisma.college.findUnique({ where: { id: collegeIdNum } });
    if (!collegeExists) {
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
    const courseExists = await prisma.course.findUnique({ where: { id: courseIdNum } });
    if (!courseExists) {
      return res.status(400).json({ success: false, message: 'Invalid CourseId.' });
    }

    // Check for duplicate RollNumber
    const existingStudent = await prisma.student.findFirst({ where: { rollNumber: RollNumber } });
    if (existingStudent) {
      return res.status(400).json({ success: false, message: 'Roll Number already exists.' });
    }
    // Check for duplicate EmailId
    const existingStudentEmail = await prisma.student.findFirst({ where: { email: EmailId } });
    if (existingStudentEmail) {
      return res.status(400).json({ success: false, message: 'Email ID already exists.' });
    }

    // Validate admin amount + fees amount against EMI sum
    const adminAmount = parseFloat(FineAmount) || 0;
    const feesAmount = parseFloat(RefundAmount) || 0;
    const totalAmount = adminAmount + feesAmount;
    
    if (PaymentMode === 'EMI' && totalEMIAmount > 0 && totalEMIAmount > totalAmount) {
      return res.status(400).json({ 
        success: false, 
        message: `The sum of total EMI (${totalEMIAmount}) is greater than sum of admin (${adminAmount}) and fees amount (${feesAmount})`
      });
    }

    // Function to generate stdCollId base (without student ID)
    const generateStdCollIdBase = async (courseId, collegeId, admissionDate) => {
      // Fetch course and college details
      const course = await prisma.course.findUnique({ where: { id: parseInt(courseId) } });
      const college = await prisma.college.findUnique({ where: { id: parseInt(collegeId) } });

      // Step 1: Get course prefix (first 3 characters after removing spaces and dots)
      const courseName = course?.courseName || '';
      const cleanedCourseName = courseName.replace(/[\s.]/g, ''); // Remove spaces and dots
      const coursePrefix = cleanedCourseName.substring(0, 3).toUpperCase(); // e.g., "BPH" or "DPH"

      // Step 2: Get college prefix (remove special characters and abbreviate)
      let collegeName = college?.collegeName || '';
      collegeName = collegeName.replace(/[^a-zA-Z0-9]/g, ''); // Remove special characters
      const collegeWords = collegeName.split(/(?=[A-Z])/);
      const collegePrefix = collegeWords.length > 1
        ? collegeWords[0] + collegeWords.slice(1).map(word => word[0]).join('')
        : collegeName.substring(0, 5).toUpperCase(); // Limit to 5 chars if single word

      // Step 3: Get year suffix from admission date
      const admissionYear = admissionDate ? new Date(admissionDate).getFullYear() : new Date().getFullYear();
      const yearSuffix = `${admissionYear.toString().slice(-2)}${(admissionYear + 1).toString().slice(-2)}`;

      // Step 4: Combine parts (without student ID)
      return `${coursePrefix}/${collegePrefix}/${yearSuffix}`; // e.g., "BPH/JKIOP/2526"
    };

    // Generate stdCollId base
    const stdCollIdBase = await generateStdCollIdBase(CourseId, CollegeId, AdmissionDate);

    // Upload documents to Cloudinary
    const documentsData = [];
    const uploadFile = async (fieldName) => {
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
      uploadFile('Income')
    ]);

    // Create student, academic details, documents, and EMI details in a transaction
    const newStudent = await prisma.$transaction(async (prisma) => {
      // Create Student
      const student = await prisma.student.create({
        data: {
          stdCollId: stdCollIdBase, // Temporary, will be updated with student ID
          rollNumber: RollNumber,
          fName: FName,
          lName: LName || null,
          dob: new Date(DOB),
          gender: Gender,
          mobileNumber: MobileNumber,
          alternateNumber: AlternateNumber || null,
          email: EmailId,
          fatherName: FatherName,
          fatherMobile: FatherMobileNumber || null,
          motherName: MotherName,
          address: Address,
          city: City,
          state: State,
          pincode: Pincode,
          admissionMode: AdmissionMode,
          collegeId: collegeIdNum,
          courseId: courseIdNum,
          admissionDate: new Date(AdmissionDate),
          studentImage: documentsData.find(doc => doc.documentType === 'StudentImage')?.fileUrl || null,
          category: Category,
          isDiscontinue: IsDiscontinue === 'true',
          isLateral: isLateral === 'true',
          discontinueOn: DiscontinueOn ? new Date(DiscontinueOn) : null,
          discontinueBy: DiscontinueBy || null,
          createdBy: CreatedBy,
          status: true,
        },
      });

      // Update stdCollId with student ID
      const finalStdCollId = `${stdCollIdBase}/${student.id}`;
      await prisma.student.update({
        where: { id: student.id },
        data: { stdCollId: finalStdCollId }
      });

      // Create StudentAcademicDetails
      const academicDetails = await prisma.studentAcademicDetails.create({
        data: {
          studentId: student.id,
          sessionYear: SessionYear,
          paymentMode: PaymentMode,
          adminAmount: adminAmount,
          feesAmount: feesAmount,
          numberOfEMI: PaymentMode === 'EMI' ? parseInt(NumberOfEMI) || 0 : null,
          ledgerNumber: LedgerNumber || null,
          courseYear: CourseYear || null,
          createdBy: CreatedBy,
        },
      });

      // Create Documents
      if (documentsData.length > 0) {
        await prisma.documents.createMany({
          data: documentsData.map(doc => ({
            studentId: student.id,
            documentType: doc.documentType,
            publicId: doc.publicId,
            fileUrl: doc.fileUrl,
            fileName: doc.fileName,
            createdBy: doc.createdBy,
          })),
        });
      }

      // Create EMI Details if applicable
      if (PaymentMode === 'EMI' && emiDetails.length > 0) {
        await prisma.EMIDetails.createMany({
          data: emiDetails.map(emi => ({
            studentId: student.id,
            studentAcademicId: academicDetails.id,
            emiNumber: emi.emiNumber,
            amount: emi.amount,
            dueDate: emi.dueDate,
            createdBy: emi.createdBy,
          })),
        });
      }

      return { ...student, stdCollId: finalStdCollId };
    });

    res.status(201).json({ success: true, student: newStudent });
  } catch (error) {
    console.error('Erreur lors de la création de l', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /students - Fetch all students
router.get('/students', async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      include: {
        college: true,
        course: true,
        documents: true,
        academicDetails: true,
        emiDetails: true,
      },
      orderBy: { id: 'asc' },
    });
    res.status(200).json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ success: false, message: 'Error fetching students', error: error.message });
  }
});

// GET /colleges - Fetch all colleges
router.get('/colleges', async (req, res) => {
  try {
    const colleges = await prisma.college.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, collegeName: true },
    });
    res.status(200).json(colleges);
  } catch (error) {
    console.error('Error fetching colleges:', error);
    res.status(500).json({ success: false, message: 'Error fetching colleges', error: error.message });
  }
});

// GET /courses - Fetch all courses
router.get('/courses', async (req, res) => {
  try {
    const courses = await prisma.course.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, courseName: true, courseDuration: true },
    });
    res.status(200).json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ success: false, message: 'Error fetching courses', error: error.message });
  }
});

// GET /students/:id - Fetch single student with complete data
router.get('/students/:id', async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        academicDetails: {
          orderBy: { createdOn: 'desc' }, // Get the latest academic details first
          take: 1, // Only take the most recent record
        },
        emiDetails: true,
        documents: true,
      },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const latestAcademicDetails = student.academicDetails[0] || {};
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
      stdCollId:student.stdCollId,
      NumberOfEMI: latestAcademicDetails.numberOfEMI || null,
      emiDetails: student.emiDetails.map(emi => ({
        emiNumber: emi.emiNumber,
        amount: emi.amount,
        date: emi.dueDate ? emi.dueDate.toISOString().split('T')[0] : '',
      })),
    };

    res.status(200).json(formattedStudent);
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ success: false, message: 'Failed to load student data' });
  }
});

//  get all Details from student related to its  all table 
router.get('/getAllStudents/:id', async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    if (isNaN(studentId)) {
      return res.status(400).json({ success: false, message: 'Invalid student ID' });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        college: true,
        course: true,
        documents: true,
        academicDetails: {
          orderBy: { createdOn: 'desc' },
          include: {
            emiDetails: true, // nested EMI details
          },
        },
        emiDetails: true, // top-level EMI details
      },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.status(200).json({ success: true, data: student });
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ success: false, message: 'Failed to load student data' });
  }
});

// GET /students/:id/documents - Fetch student documents
router.get('/students/:id/documents', async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const documents = await prisma.documents.findMany({
      where: { studentId: studentId },
      select: {
        id: true,
        documentType: true,
        fileName: true,
        fileUrl: true,
        publicId: true,
      },
    });

    const formattedDocuments = documents.map(doc => ({
      DocumentId: doc.id,
      DocumentType: doc.documentType,
      FileName: doc.fileName,
      Url: doc.fileUrl,
      PublicId: doc.publicId,
    }));

    res.status(200).json(formattedDocuments);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ success: false, message: 'Failed to load student documents' });
  }
});

// PUT update student f and academic details
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
  async (req, res) => {
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
        emiDetails, // Expecting JSON string of EMI details
      } = req.body;

      const existingStudent = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          academicDetails: true,
          documents: true,
          emiDetails: true,
        },
      });

      if (!existingStudent) {
        return res.status(404).json({ success: false, message: 'Student not found' });
      }

      // Check if academic detail with this CourseYear exists
      const existingAcademicDetail = existingStudent.academicDetails.find(
        (detail) => detail.courseYear === CourseYear
      );

      // Upload new documents to Cloudinary
      const documentsData = [];
      const uploadFile = async (fieldName) => {
        if (req.files && req.files[fieldName]?.[0]) {
          const oldDoc = existingStudent.documents.find((doc) => doc.documentType === fieldName);
          if (oldDoc) {
            await deleteFromCloudinary(oldDoc.publicId);
            await prisma.documents.delete({ where: { id: oldDoc.id } });
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
      const updatedStudent = await prisma.$transaction(async (prisma) => {
        // Update student basic details
        const student = await prisma.student.update({
          where: { id: studentId },
          data: {
            rollNumber: RollNumber,
            fName: FName,
            lName: LName || null,
            dob: new Date(DOB),
            gender: Gender,
            mobileNumber: MobileNumber,
            alternateNumber: AlternateNumber || null,
            email: EmailId,
            fatherName: FatherName,
            fatherMobile: FatherMobileNumber || null,
            motherName: MotherName,
            address: Address,
            city: City,
            state: State,
            pincode: Pincode,
            admissionMode: AdmissionMode,
            collegeId: parseInt(CollegeId),
            courseId: parseInt(CourseId),
            admissionDate: new Date(AdmissionDate),
            studentImage:
              documentsData.find((doc) => doc.documentType === 'StudentImage')?.fileUrl ||
              existingStudent.studentImage,
            category: Category,
            isDiscontinue: IsDiscontinue === 'true',
            discontinueOn: DiscontinueOn ? new Date(DiscontinueOn) : null,
            discontinueBy: DiscontinueBy || null,
            modifiedBy: ModifiedBy,
            modifiedOn: new Date(),
          },
        });

        // Handle academic details
        if (!existingAcademicDetail) {
          // Create new academic detail (shouldn't happen in update context, but keep for safety)
          const newAcademicDetail = await prisma.studentAcademicDetails.create({
            data: {
              studentId: studentId,
              sessionYear: SessionYear,
              paymentMode: PaymentMode,
              adminAmount: parseFloat(FineAmount) || 0.0,
              feesAmount: parseFloat(RefundAmount) || 0.0,
              numberOfEMI: PaymentMode === 'EMI' ? parseInt(NumberOfEMI) || 0 : null,
              ledgerNumber: LedgerNumber || null,
              courseYear: CourseYear || null,
              createdBy: ModifiedBy,
              modifiedBy: ModifiedBy,
              modifiedOn: new Date(),
            },
          });

          // Handle EMI details for new academic record
          if (PaymentMode === 'EMI' && NumberOfEMI && emiDetails) {
            const parsedEmiDetails = JSON.parse(emiDetails || '[]');
            if (parsedEmiDetails.length > 0) {
              await prisma.eMIDetails.createMany({
                data: parsedEmiDetails.map((emi) => ({
                  studentId: studentId,
                  studentAcademicId: newAcademicDetail.id,
                  emiNumber: parseInt(emi.emiNumber),
                  amount: parseFloat(emi.amount),
                  dueDate: new Date(emi.dueDate),
                  createdBy: ModifiedBy,
                  createdOn: new Date(),
                  modifiedBy: ModifiedBy,
                  modifiedOn: new Date(),
                })),
              });
            }
          }
        } else {
          // Update existing academic details, preserving courseYear and sessionYear
          await prisma.studentAcademicDetails.update({
            where: { id: existingAcademicDetail.id },
            data: {
              paymentMode: PaymentMode,
              adminAmount: parseFloat(FineAmount) || 0.0,
              feesAmount: parseFloat(RefundAmount) || 0.0,
              numberOfEMI: PaymentMode === 'EMI' ? parseInt(NumberOfEMI) || 0 : null,
              ledgerNumber: LedgerNumber || null,
              modifiedBy: ModifiedBy,
              modifiedOn: new Date(),
            },
          });

          // Handle EMI details
          if (PaymentMode === 'EMI' && NumberOfEMI && emiDetails) {
            const parsedEmiDetails = JSON.parse(emiDetails || '[]');
            // Delete existing EMI details
            await prisma.eMIDetails.deleteMany({ where: { studentAcademicId: existingAcademicDetail.id } });
            if (parsedEmiDetails.length > 0) {
              await prisma.eMIDetails.createMany({
                data: parsedEmiDetails.map((emi) => ({
                  studentId: studentId,
                  studentAcademicId: existingAcademicDetail.id,
                  emiNumber: parseInt(emi.emiNumber),
                  amount: parseFloat(emi.amount),
                  dueDate: new Date(emi.dueDate),
                  createdBy: ModifiedBy,
                  createdOn: new Date(),
                  modifiedBy: ModifiedBy,
                  modifiedOn: new Date(),
                })),
              });
            }
          } else if (PaymentMode === 'One-Time') {
            // Delete EMI details if switching to One-Time
            await prisma.eMIDetails.deleteMany({ where: { studentAcademicId: existingAcademicDetail.id } });
          }
        }

        // Create new documents
        if (documentsData.length > 0) {
          await prisma.documents.createMany({
            data: documentsData.map((doc) => ({
              studentId: student.id,
              documentType: doc.documentType,
              publicId: doc.publicId,
              fileUrl: doc.fileUrl,
              fileName: doc.fileName,
              createdBy: doc.createdBy,
              modifiedBy: ModifiedBy,
              modifiedOn: new Date(),
            })),
          });
        }

        return student;
      });

      res.status(200).json({ success: true, student: updatedStudent });
    } catch (error) {
      console.error('Error updating student:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Router for handling student promotion
router.post('/students/:studentId/promote', async (req, res) => {
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
    } = req.body;

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

    if (paymentMode === 'EMI' && (!numberOfEMI || numberOfEMI <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'Number of EMIs must be greater than 0 for EMI payment mode',
      });
    }

    if (paymentMode === 'EMI' && (!emiDetails || !Array.isArray(emiDetails) || emiDetails.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'EMI details are required and must be a non-empty array for EMI payment mode',
      });
    }

    // Verify course year validity
    const courseYearOrder = ['1st', '2nd', '3rd', '4th'];
    if (!courseYearOrder.includes(newCourseYear)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid course year',
      });
    }

    // Get current year and validate session years
    const currentYear = new Date().getFullYear();
    const sessionYears = Array.from({ length: 10 }, (_, i) => {
      const startYear = currentYear - 5 + i;
      return `${startYear}-${startYear + 1}`;
    });

    // Don't allow future session years beyond current year + 1
    const maxAllowedSessionYear = `${currentYear}-${currentYear + 1}`;
    if (parseInt(newSessionYear.split('-')[0]) > currentYear) {
      return res.status(400).json({
        success: false,
        message: `Cannot use future session year beyond ${maxAllowedSessionYear}`,
      });
    }

    if (!sessionYears.includes(newSessionYear)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session year',
      });
    }

    // Verify the student exists
    const student = await prisma.student.findUnique({
      where: { id: parseInt(studentId) },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Get current academic record
    const currentAcademic = await prisma.studentAcademicDetails.findUnique({
      where: { id: parseInt(currentAcademicId) },
    });

    if (!currentAcademic || currentAcademic.studentId !== parseInt(studentId)) {
      return res.status(404).json({
        success: false,
        message: 'Current academic record not found or does not belong to the student',
      });
    }

    // Get all academic records for this student to check for validity of promotion/demotion
    const allAcademicRecords = await prisma.studentAcademicDetails.findMany({
      where: { studentId: parseInt(studentId) },
      orderBy: [
        { courseYear: 'asc' },
        { sessionYear: 'asc' },
      ],
    });

    const currentCourseYearIndex = courseYearOrder.indexOf(currentAcademic.courseYear);
    const newCourseYearIndex = courseYearOrder.indexOf(newCourseYear);
    const currentSessionIndex = sessionYears.indexOf(currentAcademic.sessionYear);
    const newSessionIndex = sessionYears.indexOf(newSessionYear);

    let newAcademicRecord;

    // Special handling for lateral entry students being depromoted to 1st year
    if (isDepromote && student.isLateral && currentCourseYearIndex === 1 && newCourseYearIndex === 0) {
      // Check if the session year is the same
      if (currentAcademic.sessionYear !== newSessionYear) {
        return res.status(400).json({
          success: false,
          message: 'For depromoting a lateral entry student to 1st year, session year must remain the same',
        });
      }

      // Check if there's already a 1st year record
      const existingFirstYearRecord = allAcademicRecords.find(
        record => record.courseYear === '1st'
      );

      if (existingFirstYearRecord) {
        return res.status(400).json({
          success: false,
          message: 'Student already has a record for 1st year. Cannot depromote.',
        });
      }

      // Update existing record instead of creating new
      newAcademicRecord = await prisma.studentAcademicDetails.update({
        where: { id: parseInt(currentAcademicId) },
        data: {
          courseYear: newCourseYear,
          sessionYear: newSessionYear,
          adminAmount: parseFloat(adminAmount),
          feesAmount: parseFloat(feesAmount),
          paymentMode,
          numberOfEMI: paymentMode === 'EMI' ? parseInt(numberOfEMI) : null,
          ledgerNumber: ledgerNumber || null,
          modifiedBy,
          modifiedOn: new Date(),
        },
      });

      // Update student isLateral flag
      await prisma.student.update({
        where: { id: parseInt(studentId) },
        data: {
          isLateral: false,
          modifiedBy,
          modifiedOn: new Date(),
        },
      });
    } 
    // Regular depromote case from 2nd to 1st year
    else if (isDepromote && currentCourseYearIndex === 1 && newCourseYearIndex === 0) {
      // Validate session year
      if (currentAcademic.sessionYear !== newSessionYear) {
        return res.status(400).json({
          success: false,
          message: 'For demotion, session year must remain the same',
        });
      }

      // Check if there's already a 1st year record
      const existingFirstYearRecord = allAcademicRecords.find(
        record => record.courseYear === '1st'
      );

      if (existingFirstYearRecord) {
        return res.status(400).json({
          success: false,
          message: 'Student already has a record for 1st year. Cannot depromote.',
        });
      }

      // Update existing record instead of creating new
      newAcademicRecord = await prisma.studentAcademicDetails.update({
        where: { id: parseInt(currentAcademicId) },
        data: {
          courseYear: newCourseYear,
          sessionYear: newSessionYear,
          adminAmount: parseFloat(adminAmount),
          feesAmount: parseFloat(feesAmount),
          paymentMode,
          numberOfEMI: paymentMode === 'EMI' ? parseInt(numberOfEMI) : null,
          ledgerNumber: ledgerNumber || null,
          modifiedBy,
          modifiedOn: new Date(),
        },
      });
    }
    // Other depromote cases
    else if (isDepromote) {
      // Validate that we're not skipping course years when depromoting
      if (newCourseYearIndex !== currentCourseYearIndex - 1) {
        return res.status(400).json({
          success: false,
          message: `Cannot depromote from ${currentAcademic.courseYear} directly to ${newCourseYear}. Demotion must be sequential.`,
        });
      }

      // Check if student is in 3rd year or higher
      if (currentCourseYearIndex > 1 && newCourseYearIndex === 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot depromote from ${currentAcademic.courseYear} to 1st year. Only 2nd year students can be depromoted to 1st year.`,
        });
      }

      // Check if session year is the same for demotion
      if (currentAcademic.sessionYear !== newSessionYear) {
        return res.status(400).json({
          success: false,
          message: 'For demotion, session year must remain the same',
        });
      }

      // Check if there's already a record for the target course year
      const existingTargetYearRecord = allAcademicRecords.find(
        record => record.courseYear === newCourseYear
      );

      if (existingTargetYearRecord) {
        return res.status(400).json({
          success: false,
          message: `Student already has a record for ${newCourseYear} year. Cannot depromote.`,
        });
      }

      // Create new academic record
      newAcademicRecord = await prisma.studentAcademicDetails.create({
        data: {
          studentId: parseInt(studentId),
          courseYear: newCourseYear,
          sessionYear: newSessionYear,
          adminAmount: parseFloat(adminAmount),
          feesAmount: parseFloat(feesAmount),
          paymentMode,
          numberOfEMI: paymentMode === 'EMI' ? parseInt(numberOfEMI) : null,
          ledgerNumber: ledgerNumber || null,
          createdBy: modifiedBy,
          createdOn: new Date(),
          modifiedBy,
        },
      });
    } 
    // Regular promotion case
    else {
      // Check if the student already has an academic record for the new course year
      const existingCourseYearRecord = allAcademicRecords.find(
        record => record.courseYear === newCourseYear
      );

      if (existingCourseYearRecord) {
        return res.status(400).json({
          success: false,
          message: `Student already has an academic record for ${newCourseYear} year`,
        });
      }

      // Check if there's a gap in course year sequence for promotion
      if (newCourseYearIndex !== currentCourseYearIndex + 1) {
        return res.status(400).json({
          success: false,
          message: `Cannot promote from ${currentAcademic.courseYear} directly to ${newCourseYear}. Promotion must be sequential.`,
        });
      }

      // Check if session year is same as current
      if (currentAcademic.sessionYear === newSessionYear) {
        return res.status(400).json({
          success: false,
          message: `For promotion, new session year cannot be the same as current session year (${currentAcademic.sessionYear})`,
        });
      }

      // Check if there's a gap in session year sequence
      if (newSessionIndex <= currentSessionIndex) {
        return res.status(400).json({
          success: false,
          message: `New session year (${newSessionYear}) cannot be before or same as current session year (${currentAcademic.sessionYear})`,
        });
      }

      if (newSessionIndex !== currentSessionIndex + 1) {
        return res.status(400).json({
          success: false,
          message: `Cannot skip session years. Next valid session year should be ${sessionYears[currentSessionIndex + 1]}`,
        });
      }

      // Create new academic record
      newAcademicRecord = await prisma.studentAcademicDetails.create({
        data: {
          studentId: parseInt(studentId),
          courseYear: newCourseYear,
          sessionYear: newSessionYear,
          adminAmount: parseFloat(adminAmount),
          feesAmount: parseFloat(feesAmount),
          paymentMode,
          numberOfEMI: paymentMode === 'EMI' ? parseInt(numberOfEMI) : null,
          ledgerNumber: ledgerNumber || null,
          createdBy: modifiedBy,
          createdOn: new Date(),
          modifiedBy,
        },
      });
    }

    // If payment mode is EMI, create/update EMI details
    if (paymentMode === 'EMI' && emiDetails && emiDetails.length > 0) {
      // Delete existing EMI details if updating record
      if (isDepromote && currentCourseYearIndex === 1 && newCourseYearIndex === 0) {
        await prisma.eMIDetails.deleteMany({
          where: {
            studentId: parseInt(studentId),
            studentAcademicId: parseInt(currentAcademicId),
          },
        });
      }

      await Promise.all(
        emiDetails.map(async (emi) => {
          await prisma.eMIDetails.create({
            data: {
              studentId: parseInt(studentId),
              studentAcademicId: newAcademicRecord.id,
              emiNumber: emi.emiNumber,
              amount: parseFloat(emi.amount),
              dueDate: new Date(emi.dueDate),
              createdBy: modifiedBy,
              createdOn: new Date(),
              modifiedBy,
            },
          });
        })
      );
    }

    // Return success response
    const actionType = isDepromote ? 'demoted' : 'promoted';
    res.status(200).json({
      success: true,
      message: `Student successfully ${actionType} to ${newCourseYear} year for session ${newSessionYear}`,
      data: newAcademicRecord,
    });
  } catch (error) {
    console.error('Error promoting/demoting student:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while promoting/demoting the student',
    });
  }
});
// DELETE /students/:id - Delete a student and all related records
router.delete('/students/:id', async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    
    // First, verify the student exists
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        documents: true,
        academicDetails: true,
      }
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Delete all related records in a transaction
    await prisma.$transaction(async (prisma) => {
      // 1. Delete documents from Cloudinary and DB
      if (student.documents.length > 0) {
        await Promise.all(
          student.documents.map(async (doc) => {
            try {
              await deleteFromCloudinary(doc.publicId);
            } catch (error) {
              console.error(`Error deleting document ${doc.publicId} from Cloudinary:`, error);
            }
          })
        );
    
        await prisma.documents.deleteMany({
          where: { studentId: studentId }
        });
      }
    
      // 2. Delete EMI details
      if (student.academicDetails.length > 0) {
        await prisma.eMIDetails.deleteMany({
          where: { studentId: studentId }
        });
      }
    
      // 3. Delete Student Payment 💥 ADD THIS STEP 💥
      await prisma.studentPayment.deleteMany({
        where: { studentId: studentId }
      });
    
      // 4. Delete academic details
      await prisma.studentAcademicDetails.deleteMany({
        where: { studentId: studentId }
      });
    
      // 5. Finally, delete the student
      await prisma.student.delete({
        where: { id: studentId }
      });
    });

    res.status(200).json({ 
      success: true, 
      message: 'Student and all related records deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting student',
      error: error.message 
    });
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
router.get('/students/:studentId/academic-details', async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);

    const academicDetails = await prisma.studentAcademicDetails.findMany({
      where: { studentId },
      orderBy: { createdOn: 'desc' },
      include: {
        emiDetails: {
          orderBy: { emiNumber: 'asc' },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: academicDetails,
    });
  } catch (error) {
    console.error('Error fetching academic details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch academic details',
    });
  }
});

// Get the latest academic detail for a student
router.get('/students/:studentId/academic-details/latest', async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    
    const latestAcademicDetail = await prisma.studentAcademicDetails.findFirst({
      where: { studentId },
      orderBy: { createdOn: 'desc' },
      include: {
        emiDetails: {
          orderBy: { emiNumber: 'asc' }
        }
      }
    });

    if (!latestAcademicDetail) {
      return res.status(404).json({ 
        success: false, 
        message: 'No academic records found' 
      });
    }

    res.status(200).json({ 
      success: true, 
      data: latestAcademicDetail 
    });
  } catch (error) {
    console.error('Error fetching latest academic detail:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch latest academic details' 
    });
  }
});

// Create new payment

router.post('/studentPayment', upload.single('receipt'), async (req, res) => {
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
      email,
      password,
    } = req.body;

    // Validate required fields
    const requiredFields = { email, password, amountType, amount, paymentMode, receivedDate };
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
      const existingPayment = await prisma.studentPayment.findFirst({
        where: { transactionNumber },
      });
      if (existingPayment) {
        return res.status(400).json({ success: false, error: 'Transaction number already exists' });
      }
    }

    // Authenticate user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    let receiptData = {};
    if (req.file) {
      try {
        const result = await uploadToCloudinary(req.file.buffer, 'PaymentReceipt');
        receiptData = {
          receiptUrl: result.secure_url,
          receiptPublicId: result.public_id,
        };
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return res.status(500).json({ success: false, error: 'Failed to upload receipt' });
      }
    }

    const payment = await prisma.studentPayment.create({
      data: {
        studentId: parseInt(studentId),
        studentAcademicId: studentAcademicId ? parseInt(studentAcademicId) : null,
        paymentMode,
        transactionNumber,
        amount: parsedAmount,
        receivedDate: parsedDate,
        approvedBy,
        amountType,
        courseYear,
        sessionYear,
        createdBy: user.name || email,
   
        ...receiptData,
      },
    });

    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(500).json({ success: false, error: 'Failed to create payment' });
  }
});

// GET payments for a specific student by studentId
router.get('/studentPayment/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!studentId || isNaN(parseInt(studentId))) {
      return res.status(400).json({ success: false, error: 'Invalid student ID' });
    }

    const payments = await prisma.studentPayment.findMany({
      where: {
        studentId: parseInt(studentId),
      },
      include: {
        student: {
          select: {
            fName: true,
            lName: true,
            rollNumber: true,
            email: true,
            mobileNumber: true,
            fatherName: true,
            course: {
              select: {
                courseName: true,
              },
            },
            college: {
              select: {
                collegeName: true,
              },
            },
          },
        },
        studentAcademic: {
          select: {
            sessionYear: true,
            courseYear: true,
          },
        },
      },
    });

    if (payments.length === 0) {
      return res.status(404).json({ success: false, error: `No payments found for student ID ${studentId}` });
    }

    res.status(200).json({ success: true, data: payments });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch payments' });
  }
});

// Generate and download payment slip
router.get('/studentPayment/:paymentId/slip', async (req, res) => {
  try {
    const { paymentId } = req.params;

    // Validate paymentId
    if (!paymentId || isNaN(parseInt(paymentId)) || parseInt(paymentId) <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid or missing payment ID' });
    }

    // Fetch payment details
    const payment = await prisma.studentPayment.findUnique({
      where: { id: parseInt(paymentId) },
      include: {
        student: {
          select: {
            fName: true,
            lName: true,
            rollNumber: true,
            email: true,
            mobileNumber: true,
            fatherName: true,
            course: {
              select: {
                courseName: true,
              },
            },
          },
        },
        studentAcademic: {
          select: {
            sessionYear: true,
            courseYear: true,
          },
        },
      },
    });

    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment record not found' });
    }

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ size: [400, 600], margin: 30 });

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=payment-slip-${paymentId}.pdf`);

    // Handle errors in the PDF stream
    doc.on('error', (err) => {
      console.error('PDF stream error:', err);
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

    drawLabelValue('Name:', `${payment.student.fName} ${payment.student.lName || ''}`, 0);
    drawLabelValue('Roll Number:', payment.student.rollNumber, 15);
    drawLabelValue('Email:', payment.student.email, 30);
    drawLabelValue('Mobile Number:', payment.student.mobileNumber, 45);
    drawLabelValue('Father\'s Name:', payment.student.fatherName, 60);
    drawLabelValue('Course:', payment.student.course.courseName, 75);
    drawLabelValue('Session Year:', payment.studentAcademic.sessionYear, 90);
    drawLabelValue('Course Year:', payment.studentAcademic.courseYear, 105);

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

    drawLabelValue('Amount Type:', payment.amountType === 'adminAmount' ? 'Admin Amount' : payment.amountType, 0);
    drawLabelValue('Payment Mode:', payment.paymentMode, 15);
    drawLabelValue('Transaction Number:', payment.transactionNumber, 30);
    drawLabelValue('Amount:', `${payment.amount.toFixed(2)}`, 45);
    drawLabelValue('Received Date:', `${new Date(payment.receivedDate).toLocaleDateString('en-GB')}`, 60);
    
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

  } catch (error) {
    console.error('Error generating payment slip:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Internal server error while generating payment slip' });
    }
  }
});
// routes/studentPayment.js
router.get('/amountType', async (req, res) => {
  try {
    const payments = await prisma.studentPayment.findMany({
      select: {
        id: true,
        amount: true,
        amountType: true,
        paymentMode: true,
        receivedDate: true,
        transactionNumber: true,
        courseYear: true,
        sessionYear: true,
        student: {
          select: {
            id: true,
            fName: true,
            lName: true,
            rollNumber: true,
            mobileNumber: true,
            email: true,
            course: {
              select: {
                courseName: true
              }
            },
            college: {
              select: {
                collegeName: true
              }
            }
          }
        },
        studentAcademic: {
          select: {
            id: true,
            sessionYear: true,
            feesAmount: true,
            adminAmount: true,
            paymentMode: true,
            courseYear: true
          }
        }
      }
    });
    
    res.status(200).json({ success: true, data: payments });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch payments' });
  }
});

module.exports = router;
