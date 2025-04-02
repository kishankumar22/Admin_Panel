const express = require('express');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const uploadToCloudinary = require('../../utils/cloudinaryUpload');

const router = express.Router();
const prisma = new PrismaClient();

// Configure Multer for in-memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

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
      CourseName, CourseYear, IsSCStudent, LedgerNumber, CollegeId, AdmissionMode,
      AdmissionDate, IsDiscontinue, DiscontinueOn, DiscontinueBy, FineAmount,
      RefundAmount, FinePaidAmount,CreatedBy
    } = req.body;

    // 🔹 Validate CollegeId
    if (!CollegeId) {
      return res.status(400).json({ success: false, message: 'CollegeId is required' });
    }

    const collegeExists = await prisma.college.findUnique({
      where: { CollegeId }
    });

    if (!collegeExists) {
      return res.status(400).json({ success: false, message: 'Invalid CollegeId. No such college exists.' });
    }

    // 🔹 Check if RollNumber already exists
    const existingStudent = await prisma.student.findUnique({
      where: { RollNumber }
    });

    if (existingStudent) {
      return res.status(400).json({ success: false, message: 'Student with this Roll Number already exists.' });
    }

    // 🔹 Upload documents to Cloudinary
    const documentsData = [];

    const uploadFile = async (fieldName) => {
      if (req.files[fieldName]?.[0]) {
        const uploadedFile = await uploadToCloudinary(req.files[fieldName][0].buffer, `student_documents/${fieldName}`);
        if (uploadedFile?.public_id) {
          documentsData.push({
            DocumentType: fieldName,
            PublicId: uploadedFile.public_id,
            FileName: req.files[fieldName][0].originalname,
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

    // 🔹 Create new student
    const newStudent = await prisma.student.create({
      data: {
        RollNumber,
        FName,
        LName,
        DOB: DOB ? new Date(DOB) : null,
        Gender,
        MobileNumber,
        AlternateNumber: AlternateNumber || null,
        EmailId,
        FatherName,
        FatherMobileNumber,
        MotherName,
        Address,
        City,
        State,
        Pincode,
        CourseName,
        CourseYear,
        IsSCStudent: IsSCStudent === 'true',
        LedgerNumber: LedgerNumber || null,
        CollegeId,
        AdmissionMode,
        AdmissionDate: AdmissionDate ? new Date(AdmissionDate) : null,
        FineAmount: FineAmount ? parseFloat(FineAmount) : 0,
        RefundAmount: RefundAmount ? parseFloat(RefundAmount) : 0,
        FinePaidAmount: FinePaidAmount ? parseFloat(FinePaidAmount) : 0,
        IsDiscontinue: IsDiscontinue === 'true',
        DiscontinueOn: DiscontinueOn ? new Date(DiscontinueOn) : null,
        DiscontinueBy: DiscontinueBy || null,
        
      },
    });

    // 🔹 Insert uploaded documents into the database
    if (documentsData.length > 0) {
      await prisma.documents.createMany({
        data: documentsData.map(doc => ({
          ...doc,
          StudentId: newStudent.StudentId,
        })),
      });
    }

    res.status(201).json({ success: true, student: newStudent });
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});


// Get all students (simplified)
router.get('/students', async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      orderBy: {
        FName: 'asc',
      },
    });
    res.status(200).json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ message: 'Error fetching students', error });
  }
});


// EDIT 
router.put('/students/:id', upload.fields([
  { name: 'StudentImage' },
  { name: 'CasteCertificate' },
  { name: 'TenthMarks' },
  { name: 'TwelfthMarks' },
  { name: 'Residential' },
  { name: 'Income' }
]), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      RollNumber, FName, LName, DOB, Gender, MobileNumber, AlternateNumber,
      EmailId, FatherName, FatherMobileNumber, MotherName, Address, City, State, Pincode,
      CourseName, CourseYear, IsSCStudent, LedgerNumber, CollegeId, AdmissionMode,
      AdmissionDate, IsDiscontinue, DiscontinueOn, DiscontinueBy, FineAmount,
      RefundAmount, FinePaidAmount,    
    } = req.body;

    // 🔹 Validate student exists
    const existingStudent = await prisma.student.findUnique({
      where: { StudentId: parseInt(id) }
    });

    if (!existingStudent) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // 🔹 Validate CollegeId
    if (!CollegeId) {
      return res.status(400).json({ success: false, message: 'CollegeId is required' });
    }

    const collegeExists = await prisma.college.findUnique({
      where: { CollegeId }
    });

    if (!collegeExists) {
      return res.status(400).json({ success: false, message: 'Invalid CollegeId. No such college exists.' });
    }

    // 🔹 Check if RollNumber is being changed to one that already exists
    if (RollNumber !== existingStudent.RollNumber) {
      const studentWithNewRoll = await prisma.student.findUnique({
        where: { RollNumber }
      });

      if (studentWithNewRoll) {
        return res.status(400).json({ 
          success: false, 
          message: 'Another student with this Roll Number already exists.' 
        });
      }
    }

    // 🔹 Upload new documents to Cloudinary
    const documentsData = [];

    const uploadFile = async (fieldName) => {
      if (req.files[fieldName]?.[0]) {
        // First delete old document if exists
        const oldDoc = await prisma.documents.findFirst({
          where: { 
            StudentId: parseInt(id),
            DocumentType: fieldName
          }
        });

        if (oldDoc) {
          await uploadToCloudinary.destroy(oldDoc.PublicId);
          await prisma.documents.delete({
            where: { DocumentId: oldDoc.DocumentId }
          });
        }

        // Upload new document
        const uploadedFile = await uploadToCloudinary(
          req.files[fieldName][0].buffer, 
          `student_documents/${fieldName}`
        );

        if (uploadedFile?.public_id) {
          documentsData.push({
            DocumentType: fieldName,
            PublicId: uploadedFile.public_id,
            FileName: req.files[fieldName][0].originalname,
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

    // 🔹 Update student
    const updatedStudent = await prisma.student.update({
      where: { StudentId: parseInt(id) },
      data: {
        RollNumber,
        FName,
        LName,
        DOB: DOB ? new Date(DOB) : null,
        Gender,
        MobileNumber,
        AlternateNumber: AlternateNumber || null,
        EmailId,
        FatherName,
        FatherMobileNumber,
        MotherName,
        Address,
        City,
        State,
        Pincode,
        CourseName,
        CourseYear,
        IsSCStudent: IsSCStudent === 'true',
        LedgerNumber: LedgerNumber || null,
        CollegeId,
        AdmissionMode,
        AdmissionDate: AdmissionDate ? new Date(AdmissionDate) : null,
        FineAmount: FineAmount ? parseFloat(FineAmount) : 0,
        RefundAmount: RefundAmount ? parseFloat(RefundAmount) : 0,
        FinePaidAmount: FinePaidAmount ? parseFloat(FinePaidAmount) : 0,
        IsDiscontinue: IsDiscontinue === 'true',
        DiscontinueOn: DiscontinueOn ? new Date(DiscontinueOn) : null,
        DiscontinueBy: DiscontinueBy || null,
      },
    });

    // 🔹 Insert new uploaded documents into the database
    if (documentsData.length > 0) {
      await prisma.documents.createMany({
        data: documentsData.map(doc => ({
          ...doc,
          StudentId: parseInt(id),
        })),
      });
    }

    res.status(200).json({ success: true, student: updatedStudent });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
// delete 

router.delete('/students/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // First delete all documents from Cloudinary and database
    const documents = await prisma.documents.findMany({
      where: { StudentId: parseInt(id) }
    });

    await Promise.all(
      documents.map(async (doc) => {
        await uploadToCloudinary.destroy(doc.PublicId);
      })
    );

    await prisma.documents.deleteMany({
      where: { StudentId: parseInt(id) }
    });

    // Then delete the student
    await prisma.student.delete({
      where: { StudentId: parseInt(id) }
    });

    res.status(200).json({ success: true, message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});



module.exports = router;
