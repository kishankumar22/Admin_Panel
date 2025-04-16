const express = require('express');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const uploadToCloudinary = require('../../utils/cloudinaryUpload');
const cloudinary = require('../../config/cloudinaryConfig');
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
      RefundAmount, CreatedBy, SessionYear, PaymentMode, NumberOfEMI
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
      // 1. Delete documents from Cloudinary (if they exist) and database
      if (student.documents.length > 0) {
        // First delete from Cloudinary
        await Promise.all(
          student.documents.map(async (doc) => {
            try {
              await deleteFromCloudinary(doc.publicId);
            } catch (error) {
              console.error(`Error deleting document ${doc.publicId} from Cloudinary:`, error);
            }
          })
        );
        
        // Then delete from database
        await prisma.documents.deleteMany({
          where: { studentId: studentId }
        });
      }

      // 2. Delete EMI details if they exist
      if (student.academicDetails && student.academicDetails.length > 0) {
        await prisma.EMIDetails.deleteMany({
          where: { studentId: studentId }
        });
      }

      // 3. Delete academic details
      if (student.academicDetails && student.academicDetails.length > 0) {
        await prisma.studentAcademicDetails.deleteMany({
          where: { studentId: studentId }
        });
      }

      // 4. Finally, delete the student
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

//  table to get acdemic details 

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
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);

    const {
      studentId,
      studentAcademicId,
      paymentMode,
      transactionNumber,
      amount,
      refundAmount, // New field
      receivedDate,
      approvedBy,
      amountType,
      comment,
      courseYear,
      sessionYear,
      email,
      password,
    } = req.body;

    if (!email || !password) {
      console.log('Email or password missing:', { email, password });
      return res.status(401).json({ success: false, error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
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
        amount: amount ? parseFloat(amount) : null,
        refundAmount: refundAmount ? parseFloat(refundAmount) : null, // New field
        receivedDate: receivedDate ? new Date(receivedDate) : null,
        approvedBy,
        amountType,
        comment,
        courseYear,
        sessionYear,
        createdBy: email,
        ...receiptData,
      },
    });

    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(500).json({ success: false, error: 'Failed to create payment' });
  }
});


//   get payment   details 

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

// amount type get sum 

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
