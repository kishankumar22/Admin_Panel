const express = require('express');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const uploadToCloudinary = require('../../utils/cloudinaryUpload');
const cloudinary = require('../../config/cloudinaryConfig');

const router = express.Router();
const prisma = new PrismaClient();

// Configure Multer for in-memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

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
    if (!CollegeId) {
      return res.status(400).json({ success: false, message: 'CollegeId is required' });
    }
    const collegeExists = await prisma.college.findUnique({ where: { id: parseInt(CollegeId) } });
    if (!collegeExists) {
      return res.status(400).json({ success: false, message: 'Invalid CollegeId.' });
    }

    // Validate CourseId
    if (!CourseId) {
      return res.status(400).json({ success: false, message: 'CourseId is required' });
    }
    const courseExists = await prisma.course.findUnique({ where: { id: parseInt(CourseId) } });
    if (!courseExists) {
      return res.status(400).json({ success: false, message: 'Invalid CourseId.' });
    }

    // Check for duplicate RollNumber
    const existingStudent = await prisma.student.findUnique({ where: { rollNumber: RollNumber } });
    if (existingStudent) {
      return res.status(400).json({ success: false, message: 'Roll Number already exists.' });
    }

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
        documents: true, // Include documents to verify URLs
        emiDetails: true, // Include EMI details to verify values
      },
      orderBy: { id: 'asc' },
    });
    res.status(200).json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ success: false, message: 'Error fetching students', error });
  }
});

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

// Get single student today
router.get('/:id', async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const student = await prisma.student.findUnique({
      where: { id: studentId }, // Use 'id' here, not 'StudentId'
      include: {
        course: true,
        college: true,
        academicDetails: true,
        documents: true,
        emiDetails: true,
      },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    res.status(200).json({ success: true, student });
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /students/:id/complete - Get complete student data including documents
router.get('/students/:id/documents', async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const documents = await prisma.documents.findMany({
      where: { studentId: studentId }, // Assuming studentId is a number in your schema
      select: {
        id: true,
        documentType: true,
        fileName: true,
        fileUrl: true,
        publicId: true,
      },
    });

    // Format documents to match frontend expectations
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
// GET /students/:id/documents - Get student documents
router.get('/students/:id', async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        academicDetails: true, // Include academic details for payment and session info
        documents: true,       // Include documents if needed here (optional, since separate route exists)
      },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Format the student data to match the frontend StudentFormData interface
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
      CourseYear: student.academicDetails?.courseYear || '',
      Category: student.category,
      LedgerNumber: student.academicDetails?.ledgerNumber || '',
      CollegeId: student.collegeId ? student.collegeId.toString() : '',
      AdmissionMode: student.admissionMode,
      AdmissionDate: student.admissionDate ? student.admissionDate.toISOString().split('T')[0] : '',
      IsDiscontinue: student.isDiscontinue,
      DiscontinueOn: student.discontinueOn ? student.discontinueOn.toISOString().split('T')[0] : '',
      DiscontinueBy: student.discontinueBy || '',
      FineAmount: student.academicDetails?.adminAmount || 0,
      RefundAmount: student.academicDetails?.feesAmount || 0,
      ModifiedBy: student.modifiedBy || '',
      SessionYear: student.academicDetails?.sessionYear || '',
      PaymentMode: student.academicDetails?.paymentMode || '',
      NumberOfEMI: student.academicDetails?.numberOfEMI || null,
    };

    res.status(200).json(formattedStudent);
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ success: false, message: 'Failed to load student data' });
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
        academicDetails: true
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

// PUT /students/:id - Update student
router.put('/students/:id', upload.fields([
  { name: 'StudentImage' },
  { name: 'CasteCertificate' },
  { name: 'TenthMarks' },
  { name: 'TwelfthMarks' },
  { name: 'Residential' },
  { name: 'Income' }
]), async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const {
      RollNumber, FName, LName, DOB, Gender, MobileNumber, AlternateNumber,
      EmailId, FatherName, FatherMobileNumber, MotherName, Address, City, State, Pincode,
      CourseId, CourseYear, Category, LedgerNumber, CollegeId, AdmissionMode,
      AdmissionDate, IsDiscontinue, DiscontinueOn, DiscontinueBy, FineAmount,
      RefundAmount, ModifiedBy, SessionYear, PaymentMode, NumberOfEMI
    } = req.body;

    // Check if student exists
    const existingStudent = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        academicDetails: true,
        documents: true
      }
    });

    if (!existingStudent) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Upload new documents to Cloudinary
    const documentsData = [];
    const uploadFile = async (fieldName) => {
      if (req.files[fieldName]?.[0]) {
        // Delete old document if exists
        const oldDoc = existingStudent.documents.find(doc => doc.documentType === fieldName);
        if (oldDoc) {
          await deleteFromCloudinary(oldDoc.publicId);
          await prisma.documents.delete({ where: { id: oldDoc.id } });
        }

        // Upload new document
        const uploadedFile = await uploadToCloudinary(req.files[fieldName][0].buffer, `student_documents/${fieldName}`);
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
      uploadFile('Income')
    ]);

    // Update student and related records in a transaction
    const updatedStudent = await prisma.$transaction(async (prisma) => {
      // Update Student
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
          studentImage: documentsData.find(doc => doc.documentType === 'StudentImage')?.fileUrl || existingStudent.studentImage,
          category: Category,
          isDiscontinue: IsDiscontinue === 'true',
          discontinueOn: DiscontinueOn ? new Date(DiscontinueOn) : null,
          discontinueBy: DiscontinueBy || null,
          modifiedBy: ModifiedBy,
          modifiedOn: new Date(),
        },
      });

      // Update Academic Details
      await prisma.studentAcademicDetails.update({
        where: { studentId: student.id },
        data: {
          sessionYear: SessionYear,
          paymentMode: PaymentMode,
          adminAmount: parseFloat(FineAmount) || 0.0,
          feesAmount: parseFloat(RefundAmount) || 0.0,
          numberOfEMI: PaymentMode === 'EMI' ? parseInt(NumberOfEMI) || 0 : null,
          ledgerNumber: LedgerNumber || null,
          courseYear: CourseYear || null,
          modifiedBy: ModifiedBy,
        },
      });

      // Create new documents if uploaded
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

      return student;
    });

    res.status(200).json({ success: true, student: updatedStudent });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
router.get('/students/:id', async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        academicDetails: true, // Include academic details for payment and session info
        documents: true,       // Include documents if needed here (optional, since separate route exists)
      },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Format the student data to match the frontend StudentFormData interface
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
      CourseYear: student.academicDetails?.courseYear || '',
      Category: student.category,
      LedgerNumber: student.academicDetails?.ledgerNumber || '',
      CollegeId: student.collegeId ? student.collegeId.toString() : '',
      AdmissionMode: student.admissionMode,
      AdmissionDate: student.admissionDate ? student.admissionDate.toISOString().split('T')[0] : '',
      IsDiscontinue: student.isDiscontinue,
      DiscontinueOn: student.discontinueOn ? student.discontinueOn.toISOString().split('T')[0] : '',
      DiscontinueBy: student.discontinueBy || '',
      FineAmount: student.academicDetails?.adminAmount || 0,
      RefundAmount: student.academicDetails?.feesAmount || 0,
      ModifiedBy: student.modifiedBy || '',
      SessionYear: student.academicDetails?.sessionYear || '',
      PaymentMode: student.academicDetails?.paymentMode || '',
      NumberOfEMI: student.academicDetails?.numberOfEMI || null,
    };

    res.status(200).json(formattedStudent);
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ success: false, message: 'Failed to load student data' });
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
module.exports = router;
