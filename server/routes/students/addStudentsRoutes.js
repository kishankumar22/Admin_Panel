const express = require('express');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const uploadToCloudinary = require('../../utils/cloudinaryUpload');
const bcrypt = require('bcrypt');


const router = express.Router();
const prisma = new PrismaClient();

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
      RefundAmount, CreatedBy, SessionYear, PaymentMode, NumberOfEMI,isLateral
    } = req.body;

    console.log("Request Body:", req.body);

    // Parse EMI details
    const emiDetails = [];
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

    // Function to generate stdCollId
    const generateStdCollId = async (courseId, collegeId, admissionDate) => {
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

      // Step 4: Combine all parts
      return `${coursePrefix}/${collegePrefix}/${yearSuffix}`; // e.g., "BPH/JKIOP/2526"
    };

    // Generate stdCollId
    const stdCollId = await generateStdCollId(CourseId, CollegeId, AdmissionDate);

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
          stdCollId: stdCollId, // Use server-generated stdCollId
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

      // Create StudentAcademicDetails
      const academicDetails = await prisma.studentAcademicDetails.create({
        data: {
          studentId: student.id,
          sessionYear: SessionYear,
          paymentMode: PaymentMode,
          adminAmount: parseFloat(FineAmount) || 0.0,
          feesAmount: parseFloat(RefundAmount) || 0.0,
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

      return student;
    });

    res.status(201).json({ success: true, student: newStudent });
  } catch (error) {
    console.error('Error creating student:', error);
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


// PUT update student and academic details
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
          // Create new academic detail
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
          // Update existing academic details
          await prisma.studentAcademicDetails.update({
            where: { id: existingAcademicDetail.id },
            data: {
              sessionYear: SessionYear,
              paymentMode: PaymentMode,
              adminAmount: parseFloat(FineAmount) || 0.0,
              feesAmount: parseFloat(RefundAmount) || 0.0,
              numberOfEMI: PaymentMode === 'EMI' ? parseInt(NumberOfEMI) || 0 : null,
              ledgerNumber: LedgerNumber || null,
              courseYear: CourseYear || null,
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
// Student Update Route 22-04-2025
// router.put(
//   '/students/:id',
//   upload.fields([
//     { name: 'StudentImage' },
//     { name: 'CasteCertificate' },
//     { name: 'TenthMarks' },
//     { name: 'TwelfthMarks' },
//     { name: 'Residential' },
//     { name: 'Income' },
//   ]),
//   async (req, res) => {
//     try {
//       const studentId = parseInt(req.params.id);
//       const {
//         RollNumber,
//         FName,
//         LName,
//         DOB,
//         Gender,
//         MobileNumber,
//         AlternateNumber,
//         EmailId,
//         FatherName,
//         FatherMobileNumber,
//         MotherName,
//         Address,
//         City,
//         State,
//         Pincode,
//         CourseId,
//         CourseYear,
//         Category,
//         LedgerNumber,
//         CollegeId,
//         AdmissionMode,
//         AdmissionDate,
//         IsDiscontinue,
//         DiscontinueOn,
//         DiscontinueBy,
//         FineAmount,
//         RefundAmount,
//         ModifiedBy,
//         SessionYear,
//         PaymentMode,
//         NumberOfEMI,
//         emiDetails, // Expecting JSON string of EMI details
//       } = req.body;

//       // Validate course year and session year logic
//       if (CourseYear) {
//         // Get all academic details for this student to validate course year progression
//         const existingAcademicDetails = await prisma.studentAcademicDetails.findMany({
//           where: { studentId: studentId },
//           orderBy: { courseYear: 'asc' },
//         });

//         // Get current course year if it exists
//         const currentAcademicDetail = existingAcademicDetails.find(
//           detail => detail.courseYear === CourseYear
//         );

//         // Course year order for validation
//         const courseYearOrder = ['1st', '2nd', '3rd', '4th'];
        
//         // If trying to skip years (direct check on backend side too)
//         if (existingAcademicDetails.length > 0) {
//           const enrolledYears = existingAcademicDetails.map(detail => detail.courseYear);
//           const currentIndex = courseYearOrder.indexOf(CourseYear);
          
//           // Check if skipping years (e.g. having 1st but trying to add 3rd without 2nd)
//           if (currentIndex > 0 && !currentAcademicDetail) {
//             // Check if all previous years exist
//             for (let i = 0; i < currentIndex; i++) {
//               const yearToCheck = courseYearOrder[i];
//               if (!enrolledYears.includes(yearToCheck)) {
//                 return res.status(400).json({
//                   success: false,
//                   message: `Cannot skip years. Student must first enroll in ${yearToCheck} year before ${CourseYear} year.`
//                 });
//               }
//             }
//           }
//         }
//       }

//       const existingStudent = await prisma.student.findUnique({
//         where: { id: studentId },
//         include: {
//           academicDetails: true,
//           documents: true,
//           emiDetails: true,
//         },
//       });

//       if (!existingStudent) {
//         return res.status(404).json({ success: false, message: 'Student not found' });
//       }

//       // Check if academic detail with this CourseYear exists
//       const existingAcademicDetail = existingStudent.academicDetails.find(
//         (detail) => detail.courseYear === CourseYear
//       );

//       // Upload new documents to Cloudinary
//       const documentsData = [];
//       const uploadFile = async (fieldName) => {
//         if (req.files && req.files[fieldName]?.[0]) {
//           const oldDoc = existingStudent.documents.find((doc) => doc.documentType === fieldName);
//           if (oldDoc) {
//             await deleteFromCloudinary(oldDoc.publicId);
//             await prisma.documents.delete({ where: { id: oldDoc.id } });
//           }

//           const uploadedFile = await uploadToCloudinary(
//             req.files[fieldName][0].buffer,
//             `student_documents/${fieldName}`
//           );
//           if (uploadedFile?.public_id && uploadedFile?.url) {
//             documentsData.push({
//               documentType: fieldName,
//               publicId: uploadedFile.public_id,
//               fileUrl: uploadedFile.url,
//               fileName: req.files[fieldName][0].originalname,
//               createdBy: ModifiedBy,
//             });
//           }
//         }
//       };

//       await Promise.all([
//         uploadFile('StudentImage'),
//         uploadFile('CasteCertificate'),
//         uploadFile('TenthMarks'),
//         uploadFile('TwelfthMarks'),
//         uploadFile('Residential'),
//         uploadFile('Income'),
//       ]);

//       // Update student in a transaction
//       const updatedStudent = await prisma.$transaction(async (prisma) => {
//         // Update student basic details
//         const student = await prisma.student.update({
//           where: { id: studentId },
//           data: {
//             rollNumber: RollNumber,
//             fName: FName,
//             lName: LName || null,
//             dob: new Date(DOB),
//             gender: Gender,
//             mobileNumber: MobileNumber,
//             alternateNumber: AlternateNumber || null,
//             email: EmailId,
//             fatherName: FatherName,
//             fatherMobile: FatherMobileNumber || null,
//             motherName: MotherName,
//             address: Address,
//             city: City,
//             state: State,
//             pincode: Pincode,
//             admissionMode: AdmissionMode,
//             collegeId: parseInt(CollegeId),
//             courseId: parseInt(CourseId),
//             admissionDate: AdmissionDate ? new Date(AdmissionDate) : null,
//             studentImage:
//               documentsData.find((doc) => doc.documentType === 'StudentImage')?.fileUrl ||
//               existingStudent.studentImage,
//             category: Category,
//             isDiscontinue: IsDiscontinue === 'true' || IsDiscontinue === true,
//             discontinueOn: DiscontinueOn ? new Date(DiscontinueOn) : null,
//             discontinueBy: DiscontinueBy || null,
//             modifiedBy: ModifiedBy,
//             modifiedOn: new Date(),
//           },
//         });

//         // Handle academic details
//         if (!existingAcademicDetail) {
//           // Create new academic detail
//           const newAcademicDetail = await prisma.studentAcademicDetails.create({
//             data: {
//               studentId: studentId,
//               sessionYear: SessionYear,
//               paymentMode: PaymentMode,
//               adminAmount: parseFloat(FineAmount) || 0.0,
//               feesAmount: parseFloat(RefundAmount) || 0.0,
//               numberOfEMI: PaymentMode === 'EMI' ? parseInt(NumberOfEMI) || 0 : null,
//               ledgerNumber: LedgerNumber || null,
//               courseYear: CourseYear || null,
//               createdBy: ModifiedBy,
//               modifiedBy: ModifiedBy,
//               modifiedOn: new Date(),
//             },
//           });

//           // Handle EMI details for new academic record
//           if (PaymentMode === 'EMI' && NumberOfEMI && emiDetails) {
//             const parsedEmiDetails = typeof emiDetails === 'string' 
//               ? JSON.parse(emiDetails || '[]')
//               : emiDetails;
              
//             if (parsedEmiDetails.length > 0) {
//               await prisma.eMIDetails.createMany({
//                 data: parsedEmiDetails.map((emi) => ({
//                   studentId: studentId,
//                   studentAcademicId: newAcademicDetail.id,
//                   emiNumber: parseInt(emi.emiNumber),
//                   amount: parseFloat(emi.amount),
//                   dueDate: new Date(emi.dueDate),
//                   createdBy: ModifiedBy,
//                   createdOn: new Date(),
//                   modifiedBy: ModifiedBy,
//                   modifiedOn: new Date(),
//                 })),
//               });
//             }
//           }
//         } else {
//           // Update existing academic details
//           await prisma.studentAcademicDetails.update({
//             where: { id: existingAcademicDetail.id },
//             data: {
//               sessionYear: SessionYear,
//               paymentMode: PaymentMode,
//               adminAmount: parseFloat(FineAmount) || 0.0,
//               feesAmount: parseFloat(RefundAmount) || 0.0,
//               numberOfEMI: PaymentMode === 'EMI' ? parseInt(NumberOfEMI) || 0 : null,
//               ledgerNumber: LedgerNumber || null,
//               courseYear: CourseYear || null,
//               modifiedBy: ModifiedBy,
//               modifiedOn: new Date(),
//             },
//           });

//           // Handle EMI details
//           if (PaymentMode === 'EMI' && NumberOfEMI && emiDetails) {
//             const parsedEmiDetails = typeof emiDetails === 'string' 
//               ? JSON.parse(emiDetails || '[]')
//               : emiDetails;
              
//             // Delete existing EMI details
//             await prisma.eMIDetails.deleteMany({ where: { studentAcademicId: existingAcademicDetail.id } });
            
//             if (parsedEmiDetails.length > 0) {
//               await prisma.eMIDetails.createMany({
//                 data: parsedEmiDetails.map((emi) => ({
//                   studentId: studentId,
//                   studentAcademicId: existingAcademicDetail.id,
//                   emiNumber: parseInt(emi.emiNumber),
//                   amount: parseFloat(emi.amount),
//                   dueDate: new Date(emi.dueDate),
//                   createdBy: ModifiedBy,
//                   createdOn: new Date(),
//                   modifiedBy: ModifiedBy,
//                   modifiedOn: new Date(),
//                 })),
//               });
//             }
//           } else if (PaymentMode === 'One-Time') {
//             // Delete EMI details if switching to One-Time
//             await prisma.eMIDetails.deleteMany({ where: { studentAcademicId: existingAcademicDetail.id } });
//           }
//         }

//         // Create new documents
//         if (documentsData.length > 0) {
//           await prisma.documents.createMany({
//             data: documentsData.map((doc) => ({
//               studentId: student.id,
//               documentType: doc.documentType,
//               publicId: doc.publicId,
//               fileUrl: doc.fileUrl,
//               fileName: doc.fileName,
//               createdBy: doc.createdBy,
//               modifiedBy: ModifiedBy,
//               modifiedOn: new Date(),
//             })),
//           });
//         }

//         return student;
//       });

//       res.status(200).json({ 
//         success: true, 
//         message: 'Student updated successfully', 
//         student: updatedStudent 
//       });
//     } catch (error) {
//       console.error('Error updating student:', error);
//       res.status(500).json({ success: false, message: error.message || 'An error occurred while updating the student' });
//     }
//   }
// );
// Student Update Route 28-04-2025
// router.put(
//   '/students/:studentId/academic-details/:academicId/course-year',
//   async (req, res) => {
//     try {
//       const { studentId, academicId } = req.params;
//       const { courseYear, sessionYear, modifiedBy } = req.body;

//       if (!courseYear || !sessionYear || !modifiedBy) {
//         return res.status(400).json({
//           success: false,
//           message: 'Course year, session year, and modifiedBy are required',
//         });
//       }

//       const courseYearOrder = ['1st', '2nd', '3rd', '4th'];
//       if (!courseYearOrder.includes(courseYear)) {
//         return res.status(400).json({
//           success: false,
//           message: 'Invalid course year',
//         });
//       }

//       // Check if the academic record exists
//       const academicDetail = await prisma.studentAcademicDetails.findUnique({
//         where: { id: parseInt(academicId) },
//       });

//       if (!academicDetail || academicDetail.studentId !== parseInt(studentId)) {
//         return res.status(404).json({
//           success: false,
//           message: 'Academic record not found or does not belong to the student',
//         });
//       }

//       // Check if there are any payments for this academic record
//       const payments = await prisma.studentPayment.findMany({
//         where: {
//           studentId: parseInt(studentId),
//           sessionYear: academicDetail.sessionYear,
//           courseYear: academicDetail.courseYear,
//         },
//       });

//       if (payments.length > 0) {
//         return res.status(400).json({
//           success: false,
//           message: `Cannot update course year for ${academicDetail.courseYear} in session ${academicDetail.sessionYear} because payments exist.`,
//         });
//       }

//       // Validate course year sequence
//       const existingAcademicDetails = await prisma.studentAcademicDetails.findMany({
//         where: { studentId: parseInt(studentId) },
//         orderBy: { courseYear: 'asc' },
//       });

//       const enrolledYears = existingAcademicDetails.map(detail => detail.courseYear);
//       const currentIndex = courseYearOrder.indexOf(courseYear);
//       const originalIndex = courseYearOrder.indexOf(academicDetail.courseYear);

//       if (currentIndex > originalIndex + 1) {
//         const skippedYears = courseYearOrder.slice(originalIndex + 1, currentIndex);
//         return res.status(400).json({
//           success: false,
//           message: `Cannot skip years. Student must first enroll in ${skippedYears.join(', ')} year(s) before ${courseYear} year.`,
//         });
//       }

//       if (currentIndex > 0) {
//         for (let i = 0; i < currentIndex; i++) {
//           const yearToCheck = courseYearOrder[i];
//           if (!enrolledYears.includes(yearToCheck)) {
//             return res.status(400).json({
//               success: false,
//               message: `Cannot skip years. Student must first enroll in ${yearToCheck} year before ${courseYear} year.`,
//             });
//           }
//         }
//       }

//       // Validate session year
//       const currentYear = new Date().getFullYear();
//       const sessionYears = Array.from({ length: 10 }, (_, i) => {
//         const startYear = currentYear - 5 + i;
//         return `${startYear}-${startYear + 1}`;
//       });

//       if (!sessionYears.includes(sessionYear)) {
//         return res.status(400).json({
//           success: false,
//           message: 'Invalid session year',
//         });
//       }

//       // Check for session year conflicts
//       const existingSessionDetail = existingAcademicDetails.find(
//         detail => detail.sessionYear === sessionYear && detail.id !== parseInt(academicId)
//       );

//       if (existingSessionDetail) {
//         return res.status(400).json({
//           success: false,
//           message: `Session year ${sessionYear} is already associated with another academic record.`,
//         });
//       }

//       // Update the academic record
//       const updatedAcademicDetail = await prisma.studentAcademicDetails.update({
//         where: { id: parseInt(academicId) },
//         data: {
//           courseYear,
//           sessionYear,
//           modifiedBy,
//           modifiedOn: new Date(),
//         },
//       });

//       res.status(200).json({
//         success: true,
//         message: 'Course year updated successfully',
//         data: updatedAcademicDetail,
//       });
//     } catch (error) {
//       console.error('Error updating course year:', error);
//       res.status(500).json({
//         success: false,
//         message: error.message || 'An error occurred while updating the course year',
//       });
//     }
//   }
// );

// promotion of students
// Route to handle student promotion
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
//       modifiedBy
//     } = req.body;

//     // Input validation
//     if (!newCourseYear || !newSessionYear) {
//       return res.status(400).json({
//         success: false,
//         message: 'New course year and session year are required'
//       });
//     }

//     if (adminAmount < 0 || feesAmount < 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Admin amount and fees amount cannot be negative'
//       });
//     }

//     if (paymentMode === 'EMI' && (!numberOfEMI || numberOfEMI <= 0)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Number of EMIs must be greater than 0 for EMI payment mode'
//       });
//     }

//     if (paymentMode === 'EMI' && (!emiDetails || emiDetails.length === 0)) {
//       return res.status(400).json({
//         success: false,
//         message: 'EMI details are required for EMI payment mode'
//       });
//     }

//     // Verify course year validity
//     const courseYearOrder = ['1st', '2nd', '3rd', '4th'];
//     if (!courseYearOrder.includes(newCourseYear)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid course year'
//       });
//     }

//     // Verify session year validity
//     const currentYear = new Date().getFullYear();
//     const sessionYears = Array.from({ length: 10 }, (_, i) => {
//       const startYear = currentYear - 5 + i;
//       return `${startYear}-${startYear + 1}`;
//     });

//     if (!sessionYears.includes(newSessionYear)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid session year'
//       });
//     }

//     // Verify the student exists
//     const student = await prisma.student.findUnique({
//       where: { id: parseInt(studentId) }
//     });

//     if (!student) {
//       return res.status(404).json({
//         success: false,
//         message: 'Student not found'
//       });
//     }

//     // Get current academic record
//     const currentAcademic = await prisma.studentAcademicDetails.findUnique({
//       where: { id: parseInt(currentAcademicId) }
//     });

//     if (!currentAcademic || currentAcademic.studentId !== parseInt(studentId)) {
//       return res.status(404).json({
//         success: false,
//         message: 'Current academic record not found or does not belong to the student'
//       });
//     }

//     // Check if the student already has an academic record for the new course year
//     const existingCourseYearRecord = await prisma.studentAcademicDetails.findFirst({
//       where: {
//         studentId: parseInt(studentId),
//         courseYear: newCourseYear
//       }
//     });

//     if (existingCourseYearRecord) {
//       return res.status(400).json({
//         success: false,
//         message: `Student already has an academic record for ${newCourseYear} year`
//       });
//     }

//     // Check if there's a gap in course year sequence
//     const currentCourseYearIndex = courseYearOrder.indexOf(currentAcademic.courseYear);
//     const newCourseYearIndex = courseYearOrder.indexOf(newCourseYear);

//     if (newCourseYearIndex !== currentCourseYearIndex + 1) {
//       return res.status(400).json({
//         success: false,
//         message: `Cannot promote from ${currentAcademic.courseYear} directly to ${newCourseYear}. Promotion must be sequential.`
//       });
//     }

//     // Check if there's a gap in session year sequence
//     const currentSessionIndex = sessionYears.indexOf(currentAcademic.sessionYear);
//     const newSessionIndex = sessionYears.indexOf(newSessionYear);

//     if (newSessionIndex <= currentSessionIndex) {
//       return res.status(400).json({
//         success: false,
//         message: `New session year (${newSessionYear}) cannot be before or same as current session year (${currentAcademic.sessionYear})`
//       });
//     }

//     if (newSessionIndex !== currentSessionIndex + 1) {
//       return res.status(400).json({
//         success: false,
//         message: `Cannot skip session years. Next valid session year should be ${sessionYears[currentSessionIndex + 1]}`
//       });
//     }

//     // Create new academic record for the student
//     const newAcademicRecord = await prisma.studentAcademicDetails.create({
//       data: {
//         studentId: parseInt(studentId),
//         courseYear: newCourseYear,
//         sessionYear: newSessionYear,
//         adminAmount: adminAmount,
//         feesAmount: feesAmount,
//         paymentMode: paymentMode,
//         numberOfEMI: paymentMode === 'EMI' ? parseInt(numberOfEMI) : null,
//         emiDetails: paymentMode === 'EMI' ? JSON.stringify(emiDetails) : null,
//         ledgerNumber: ledgerNumber || null,
//         createdBy: modifiedBy,
//         createdOn: new Date()
//       }
//     });

//     // Update student's current course year and session year
//     await prisma.student.update({
//       where: { id: parseInt(studentId) },
//       data: {
//         CourseYear: newCourseYear,
//         SessionYear: newSessionYear,
//         ModifiedBy: modifiedBy,
//         ModifiedOn: new Date()
//       }
//     });

//     // Return success response
//     res.status(200).json({
//       success: true,
//       message: `Student successfully promoted to ${newCourseYear} year for session ${newSessionYear}`,
//       data: newAcademicRecord
//     });
//   } catch (error) {
//     console.error('Error promoting student:', error);
//     res.status(500).json({
//       success: false,
//       message: error.message || 'An error occurred while promoting the student'
//     });
//   }
// });
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
      isDepromote, // New field to determine if this is a demotion operation
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

    // Special handling for lateral entry students being depromoted to 1st year
    if (isDepromote && student.isLateral && currentCourseYearIndex === 1 && newCourseYearIndex === 0) {
      // This is a lateral entry student being depromoted from 2nd to 1st year
      
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
    } 
    // Regular depromote case (not for lateral entry)
    else if (isDepromote) {
      // Validate that we're not skipping course years when depromoting
      if (newCourseYearIndex !== currentCourseYearIndex - 1) {
        return res.status(400).json({
          success: false,
          message: `Cannot depromote from ${currentAcademic.courseYear} directly to ${newCourseYear}. Demotion must be sequential.`,
        });
      }

      // Check if student is already in 3rd year or higher, can't depromote back to 1st
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

      // Check if session year is same as current (not allowed for promotion)
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
    }

    // Create new academic record for the student
    const academicData = {
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
    };

    // Create the new academic record
    const newAcademicRecord = await prisma.studentAcademicDetails.create({
      data: academicData,
    });

    // If payment mode is EMI, create EMI details
    if (paymentMode === 'EMI' && emiDetails && emiDetails.length > 0) {
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

    // If this is a lateral entry student being depromoted to 1st year, update the isLateral flag
    if (isDepromote && student.isLateral && currentCourseYearIndex === 1 && newCourseYearIndex === 0) {
      await prisma.student.update({
        where: { id: parseInt(studentId) },
        data: {
          isLateral: false,
          modifiedBy,
          modifiedOn: new Date(),
        },
      });
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


// date 15-04-2025  save payment
// Create new payment
router.post('/studentPayment', upload.single('receipt'), async (req, res) => {
  try {
    // console.log('Request body:', req.body);
    // console.log('Request file:', req.file);

    const {
      studentId,
      studentAcademicId,
      paymentMode,
      transactionNumber,
      amount,
     
      receivedDate,
      approvedBy,
      amountType,
      comment,
      courseYear,
      sessionYear,
      email,
      password,
    } = req.body;

    // Validate required fields
    const requiredFields = { email, password, amountType, amount, paymentMode, receivedDate };
    const missingFields = Object.keys(requiredFields).filter((key) => !requiredFields[key]);
    if (missingFields.length > 0) {
      console.log('Missing required fields:', missingFields);
      return res.status(400).json({ success: false, error: `Missing required fields: ${missingFields.join(', ')}` });
    }

    // Validate amount
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      console.log('Invalid amount:', amount);
      return res.status(400).json({ success: false, error: 'Amount must be a valid positive number' });
    }

    // Validate paymentMode
    const validPaymentModes = ['cash', 'check', 'bank', 'upi'];
    if (!validPaymentModes.includes(paymentMode)) {
      console.log('Invalid paymentMode:', paymentMode);
      return res.status(400).json({ success: false, error: 'Payment mode must be one of: cash, check, bank, upi' });
    }

    // Validate receivedDate
    const parsedDate = new Date(receivedDate);
    if (isNaN(parsedDate.getTime())) {
      console.log('Invalid receivedDate:', receivedDate);
      return res.status(400).json({ success: false, error: 'ReceivedDate must be a valid date' });
    }

    // Authenticate user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      console.log('Invalid credentials for email:', email);
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
        createdBy: user.name || email, // Use name if available, fallback to email
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

    // Validate studentId
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
//  get   
// GET: /student/:id/full-details


module.exports = router;
