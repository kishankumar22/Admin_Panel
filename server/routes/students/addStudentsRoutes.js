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

    // Parse EMI details from the request body
    const emiDetails = [];
    for (let i = 0; i < (parseInt(NumberOfEMI) || 0); i++) {
      const emiNumber = parseInt(req.body[`emi[${i}][emiNumber]`]) || i + 1;
      const amount = parseFloat(req.body[`emi[${i}][amount]`]) || 0;
      const date = req.body[`emi[${i}][date]`];
      if (amount > 0 && date) { // Ensure valid EMI data
        emiDetails.push({
          emiNumber,
          amount,
          dueDate: new Date(date),
          createdBy: CreatedBy,
        });
      }
    }

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

    // Upload documents to Cloudinary and store both publicId and fileUrl
    const documentsData = [];
    const uploadFile = async (fieldName) => {
      if (req.files[fieldName]?.[0]) {
        const uploadedFile = await uploadToCloudinary(req.files[fieldName][0].buffer, `student_documents/${fieldName}`);
        if (uploadedFile?.public_id && uploadedFile?.url) {
          documentsData.push({
            documentType: fieldName,
            publicId: uploadedFile.public_id,
            fileUrl: uploadedFile.url, // Store the full URL
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
          studentImage: documentsData.find(doc => doc.documentType === 'StudentImage')?.fileUrl || null, // Use fileUrl instead of publicId
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
          numberOfEMI: PaymentMode === 'EMI' ? parseInt(NumberOfEMI) : null,
          ledgerNumber: LedgerNumber || null,
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
            fileUrl: doc.fileUrl, // Save the full URL
            fileName: doc.fileName,
            createdBy: doc.createdBy,
          })),
        });
      }

      // Create EMI Details if applicable
      if (emiDetails.length > 0) {
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
    console.log("New Student Added successfully");
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
router.get('/students/:id', async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { StudentId: parseInt(req.params.id) },
      include: {
        College: true,
        Documents: true
      }
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// edit today
// PUT /students/:id - Update student width documents
  router.put('/students/:id', upload.fields([
    { name: 'StudentImage', maxCount: 1 },
    { name: 'CasteCertificate', maxCount: 1 },
    { name: 'TenthMarks', maxCount: 1 },
    { name: 'TwelfthMarks', maxCount: 1 },
    { name: 'Residential', maxCount: 1 },
    { name: 'Income', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const { id } = req.params; // Keep id as a string

      const studentData = req.body;

      // Validate student exists
      const existingStudent = await prisma.student.findUnique({ 
        where: { StudentId: id } // No need to convert to an integer
      });
      

      if (!existingStudent) {
        return res.status(404).json({ success: false, message: 'Student not found' });
      }

      // Validate CollegeId
      if (!studentData.CollegeId) {
        return res.status(400).json({ success: false, message: 'CollegeId is required' });
      }

      const collegeExists = await prisma.college.findUnique({
        where: { CollegeId: studentData.CollegeId }
      });

      if (!collegeExists) {
        return res.status(400).json({ success: false, message: 'Invalid CollegeId' });
      }

      // Check RollNumber uniqueness if changed
      if (studentData.RollNumber !== existingStudent.RollNumber) {
        const studentWithNewRoll = await prisma.student.findFirst({
          where: { 
            RollNumber: studentData.RollNumber,
            NOT: { StudentId: id }
          }
        });

        if (studentWithNewRoll) {
          return res.status(400).json({ 
            success: false, 
            message: 'Roll Number already exists' 
          });
        }
      }

      // Handle document uploads
      const documentsData = [];
      const uploadFile = async (fieldName) => {
        if (req.files[fieldName]?.[0]) {
          // Delete old document if exists
          const oldDoc = await prisma.documents.findFirst({
            where: { 
              StudentId: id,
              DocumentType: fieldName
            }
          });

          if (oldDoc) {
            await cloudinary.uploader.destroy(oldDoc.PublicId);
            await prisma.documents.delete({
              where: { DocumentId: oldDoc.DocumentId }
            });
          }

          // Upload new document
          const uploadedFile = await uploadToCloudinary(
            req.files[fieldName][0].buffer, 
            `student_documents/${id}/${fieldName}`
          );

          if (uploadedFile?.public_id) {
            documentsData.push({
              DocumentType: fieldName,
              PublicId: uploadedFile.public_id,
              FileName: req.files[fieldName][0].originalname,
              Url: uploadedFile.secure_url
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

      // Update student
      const updatedStudent = await prisma.student.update({
        where: { StudentId: id },
        data: {
          ...studentData,
          DOB: studentData.DOB ? new Date(studentData.DOB) : null,
          AdmissionDate: studentData.AdmissionDate ? new Date(studentData.AdmissionDate) : null,
          IsSCStudent: studentData.IsSCStudent === 'true',
          IsDiscontinue: studentData.IsDiscontinue === 'true',
          DiscontinueOn: studentData.DiscontinueOn ? new Date(studentData.DiscontinueOn) : null,
          FineAmount: studentData.FineAmount ? parseFloat(studentData.FineAmount) : 0,
          RefundAmount: studentData.RefundAmount ? parseFloat(studentData.RefundAmount) : 0,
          FinePaidAmount: studentData.FinePaidAmount ? parseFloat(studentData.FinePaidAmount) : 0,
          ModifiedOn: new Date(),
          ModifiedBy: studentData.ModifiedBy || 'Admin'
        }
      });

      // Insert new documents
      if (documentsData.length > 0) {
        await prisma.documents.createMany({
          data: documentsData.map(doc => ({
            ...doc,
            StudentId: id,
          })),
        });
      }

      res.json({ 
        success: true, 
        student: updatedStudent,
        documents: documentsData 
      });
      console.log(" Student updated successfully")
    } catch (error) {
      console.error('Error updating student:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Internal server error' 
      });
    }
  });

// GET /students/:id/documents - Get student documents
router.get('/students/:id/documents', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    // Use template literals to convert to string
    const documents = await prisma.documents.findMany({
      where: {
        StudentId: `${id}` // Convert to string using template literals
      }
    });
    res.json({ success: true, documents });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal server error' 
    });
  }
});

// delete today
router.delete('/students/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // First delete all documents from Cloudinary and database
    const documents = await prisma.documents.findMany({
      where: { StudentId: id } // Keep as string to match documents table
    });

    await Promise.all(
      documents.map(async (doc) => {
        await cloudinary.uploader.destroy(doc.PublicId);
      })
    );

    await prisma.documents.deleteMany({
      where: { StudentId: id }
    });

    // Delete the student - now using String ID
    await prisma.student.delete({
      where: { StudentId: id } // No parseInt needed
    });

    res.json({ success: true, message: 'Student deleted successfully' });
    console.log(" Student Deletd successfully")

  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
