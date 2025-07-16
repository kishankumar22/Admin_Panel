import React, { useState, useEffect } from 'react';
import { FaEye, FaTimes, FaTrash } from 'react-icons/fa';
import axiosInstance from '../../config';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from '../../context/AuthContext';
import { Loader1 } from '../../common/Loader/index';
import PromoteStudentModal from './PromoteStudentModal';
import { Modal } from 'flowbite-react';

interface EditStudentModalProps {
  studentId: number;
  onClose: () => void;
  onSuccess: () => void;
  modifiedBy: string;
}

interface StudentFormData {
  isLateral: boolean;
  StudentId: number;
  RollNumber: string;
  FName: string;
  LName: string;
  DOB: string;
  Gender: string;
  MobileNumber: string;
  AlternateNumber: string;
  EmailId: string;
  FatherName: string;
  FatherMobileNumber: string;
  MotherName: string;
  Address: string;
  City: string;
  State: string;
  Pincode: string;
  CourseId: string;
  CourseYear: string;
  Category: string;
  LedgerNumber: string;
  CollegeId: string;
  AdmissionMode: string;
  AdmissionDate: string;
  IsDiscontinue: boolean;
  DiscontinueOn: string;
  DiscontinueBy: string;
  FineAmount: number;
  RefundAmount: number;
  ModifiedBy: string;
  SessionYear: string;
  PaymentMode: string;
  NumberOfEMI: number | null;
  emiDetails: Array<{ emiNumber: number; amount: number; dueDate: string }>;
  stdCollId: string;
}

interface Documents {
  StudentImage: { file: File | null; preview: string | null };
  CasteCertificate: { file: File | null; preview: string | null };
  TenthMarks: { file: File | null; preview: string | null };
  TwelfthMarks: { file: File | null; preview: string | null };
  Residential: { file: File | null; preview: string | null };
  Income: { file: File | null; preview: string | null };
}

interface ExistingDocument {
  fileUrl: any;
  documentType: any;
  fileName: any;
  DocumentType: string;
  Url: string;
  id: number; // Added for deletion
}

interface AcademicHistory {
  id: string;
  courseYear: string;
  sessionYear: string;
  adminAmount: number;
  feesAmount: number;
  paymentMode: string;
  numberOfEMI?: number;
  emiDetails: Array<{ emiNumber: number; amount: number; dueDate: string }>;
  createdOn: string;
  createdBy: string;
  modifiedOn?: string;
  modifiedBy?: string;
  ledgerNumber?: string;
}

interface PaymentDetail {
  studentId: number;
  courseYear: string;
  sessionYear: string;
  adminAmount: number;
  feesAmount: number;
  paymentMode: string;
  numberOfEMI?: number;
  emiDetails: Array<{ emiNumber: number; amount: number; dueDate: string }>;
  ledgerNumber?: string;
}

interface College {
  id: number;
  collegeName: string;
}

interface Course {
  id: number;
  courseName: string;
}

interface PaymentTransaction {
  id: number;
  amount: number | null;
  amountType: 'feesAmount' | 'adminAmount' | 'fineAmount' | 'refundAmount';
  paymentMode: string;
  receivedDate: string;
  transactionNumber: string;
  courseYear: string;
  sessionYear: string;
  student: {
    id: number;
    fName: string;
    lName: string;
    rollNumber: string;
    mobileNumber: string;
    email: string;
    course: { courseName: string };
    college: { collegeName: string };
  };
  studentAcademic: {
    id: number;
    sessionYear: string;
    feesAmount: number;
    adminAmount: number;
    paymentMode: string;
    courseYear: string;
  };
}

const EditStudentModal: React.FC<EditStudentModalProps> = ({ studentId, onClose, onSuccess, modifiedBy }) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [colleges, setColleges] = useState<College[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [emiDetails, setEmiDetails] = useState<Array<{ emiNumber: number; amount: number; dueDate: string }>>([]);
  const [academicData, setAcademicData] = useState<AcademicHistory[]>([]);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetail[]>([]);
  const [loadingAcademic, setLoadingAcademic] = useState(true);
  const [showUpdateConfirmModal, setShowUpdateConfirmModal] = useState(false);
  const { user } = useAuth();
  const [originalStudentData, setOriginalStudentData] = useState<StudentFormData | null>(null);

  const [student, setStudent] = useState<StudentFormData>({
    StudentId: 0,
    RollNumber: '',
    FName: '',
    LName: '',
    DOB: '',
    Gender: '',
    MobileNumber: '',
    AlternateNumber: '',
    EmailId: '',
    FatherName: '',
    FatherMobileNumber: '',
    MotherName: '',
    Address: '',
    City: '',
    State: '',
    Pincode: '',
    CourseId: '',
    CourseYear: '',
    Category: '',
    LedgerNumber: '',
    CollegeId: '',
    AdmissionMode: '',
    AdmissionDate: '',
    IsDiscontinue: false,
    isLateral: false,
    DiscontinueOn: '',
    DiscontinueBy: '',
    FineAmount: 0,
    RefundAmount: 0,
    ModifiedBy: modifiedBy,
    SessionYear: '',
    PaymentMode: 'One-Time',
    NumberOfEMI: null,
    emiDetails: [],
    stdCollId: '',
  });

  const [documents, setDocuments] = useState<Documents>({
    StudentImage: { file: null, preview: null },
    CasteCertificate: { file: null, preview: null },
    TenthMarks: { file: null, preview: null },
    TwelfthMarks: { file: null, preview: null },
    Residential: { file: null, preview: null },
    Income: { file: null, preview: null },
  });

  const [existingDocuments, setExistingDocuments] = useState<Record<string, ExistingDocument>>({});
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  const handlePromoteClick = (studentId: number) => {
    setSelectedStudentId(studentId);
    setIsPromoteModalOpen(true);
  };

  const currentYear = new Date().getFullYear();
  const sessionYears = Array.from({ length: 10 }, (_, i) => {
    const startYear = currentYear - 5 + i;
    return `${startYear}-${startYear + 1}`;
  });

  const courseYearOrder = ['1st', '2nd', '3rd', '4th'];
  

  const aggregatePaymentDetails = (transactions: PaymentTransaction[]): PaymentDetail[] => {
    const paymentMap: { [key: string]: PaymentDetail } = {};

    transactions.forEach((transaction) => {
      const key = `${transaction.student.id}-${transaction.courseYear}-${transaction.sessionYear}`;
      if (!paymentMap[key]) {
        paymentMap[key] = {
          studentId: transaction.student.id,
          courseYear: transaction.courseYear,
          sessionYear: transaction.sessionYear,
          adminAmount: 0,
          feesAmount: 0,
          paymentMode: transaction.paymentMode || transaction.studentAcademic.paymentMode || 'One-Time',
          emiDetails: [],
          numberOfEMI: undefined,
          ledgerNumber: undefined,
        };
      }

      const paymentDetail = paymentMap[key];
      if (transaction.amount !== null) {
        if (transaction.amountType === 'adminAmount') {
          paymentDetail.adminAmount += transaction.amount;
        } else if (transaction.amountType === 'feesAmount') {
          paymentDetail.feesAmount += transaction.amount;
        }
      }
    });

    return Object.values(paymentMap);
  };

useEffect(() => {
  const fetchData = async () => {
    try {
      const studentResponse = await axiosInstance.get(`/students/${studentId}`);
      const studentData = studentResponse.data;
      setOriginalStudentData(studentData);
      setStudent({
        ...studentData,
        DOB: studentData.DOB ? new Date(studentData.DOB).toISOString().split('T')[0] : '',
        AdmissionDate: studentData.AdmissionDate ? new Date(studentData.AdmissionDate).toISOString().split('T')[0] : '',
        DiscontinueOn: studentData.DiscontinueOn ? new Date(studentData.DiscontinueOn).toISOString().split('T')[0] : '',
        ModifiedBy: modifiedBy,
        NumberOfEMI: studentData.NumberOfEMI && [2, 3, 4, 5, 6].includes(studentData.NumberOfEMI) ? studentData.NumberOfEMI : null,
        emiDetails: studentData.emiDetails || [],
        PaymentMode: studentData.PaymentMode || 'One-Time',
        FineAmount: studentData.FineAmount || 0,
        RefundAmount: studentData.RefundAmount || 0,
        LedgerNumber: studentData.LedgerNumber || '',
        isLateral: studentData.isLateral || false,
      });

      const collegeResponse = await axiosInstance.get('/colleges');
      setColleges(collegeResponse.data);

      const courseResponse = await axiosInstance.get('/courses');
      setCourses(courseResponse.data);

      const docsResponse = await axiosInstance.get(`/students/${studentId}/documents`);
      const docs: Record<string, ExistingDocument> = {};
      docsResponse.data.forEach((doc: ExistingDocument) => {
        const getFullImageUrl = (fileUrl: string): string => {
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return fileUrl;  // Already full URL
  } else {
    return `${axiosInstance.defaults.baseURL}${fileUrl}`;  // Relative URL
  }
};
      const fullUrl = getFullImageUrl(doc.fileUrl);
// Use fileUrl from API response
        docs[doc.documentType] = { ...doc, Url: fullUrl }; // Use documentType (lowercase 'd')
        // Prefetch preview for all document types
        setDocuments((prev) => ({
          ...prev,
          [doc.documentType]: { file: null, preview: fullUrl }, // Use documentType (lowercase 'd')
        }));
      });
      setExistingDocuments(docs);


      const academicResponse = await axiosInstance.get(`/students/${studentId}/academic-details`);
      const fetchedAcademicData = academicResponse.data.data;
      setAcademicData(fetchedAcademicData);

      if (fetchedAcademicData.length === 1) {
        const singleCourseYear = fetchedAcademicData[0].courseYear;
        setStudent((prev) => ({ ...prev, CourseYear: singleCourseYear }));
        await loadAcademicDetails(singleCourseYear, false);
      }


      try {
        const paymentResponse = await axiosInstance.get('/amountType');
        if (paymentResponse.data.success) {
          const transactions: PaymentTransaction[] = paymentResponse.data.data;
          const aggregatedPayments = aggregatePaymentDetails(transactions);
          const studentPayments = aggregatedPayments.filter((payment) => payment.studentId === studentId);
          setPaymentDetails(studentPayments);
        } else {
          console.warn('Payment details API did not return success:', paymentResponse.data);
          setPaymentDetails([]);
        }
      } catch (paymentError: any) {
        console.error('Failed to fetch payment details:', paymentError.message);
        setPaymentDetails([]);
        toast.warn('Unable to load payment details. Proceeding without payment information.');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load student data');
      toast.error(error.response?.data?.message || 'Failed to load student data');
    }
  };

  fetchData();
}, [studentId, modifiedBy]);

  const loadAcademicDetails = async (courseYear: string, useLoader: boolean = true) => {
    try {
      if (useLoader) {
        setLoadingAcademic(false);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const response = await axiosInstance.get(`/students/${studentId}/academic-details`);
      const academicDetail = response.data.data.find(
        (detail: AcademicHistory) => detail.courseYear === courseYear
      );

      if (academicDetail) {
        const validNumberOfEMI = academicDetail.numberOfEMI && [2, 3, 4, 5, 6].includes(academicDetail.numberOfEMI) ? academicDetail.numberOfEMI : null;
        setStudent((prev) => ({
          ...prev,
          SessionYear: academicDetail.sessionYear,
          PaymentMode: academicDetail.paymentMode,
          FineAmount: academicDetail.adminAmount,
          RefundAmount: academicDetail.feesAmount,
          LedgerNumber: academicDetail.ledgerNumber || '',
          NumberOfEMI: validNumberOfEMI,
          emiDetails: academicDetail.emiDetails || [],
        }));
        setEmiDetails(
          academicDetail.emiDetails.map((emi: any) => ({
            emiNumber: emi.emiNumber,
            amount: emi.amount,
            dueDate: emi.dueDate ? new Date(emi.dueDate).toISOString().split('T')[0] : '',
          }))
        );
        
      } else {
        setStudent((prev) => ({
          ...prev,
          SessionYear: '',
          PaymentMode: 'One-Time',
          FineAmount: 0,
          RefundAmount: 0,
          LedgerNumber: '',
          NumberOfEMI: null,
          emiDetails: [],
        }));
        setEmiDetails([]);
      }

      setLoadingAcademic(true);
      if (useLoader) {
        setStep(3);
        toast.info(`Loaded data for ${courseYear} year`);
      }
    } catch (error) {
      setLoadingAcademic(true);
      toast.error('Failed to load academic details');
    }
  };

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 15000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (step === 3 && academicData.length === 1 && student.CourseYear) {
      loadAcademicDetails(student.CourseYear, false);
    }
  }, [step, academicData, student.CourseYear]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.preventDefault();
    const { name, value, type } = e.target;

    if (name === 'DOB') {
      const dob = new Date(value);
      const today = new Date();
      const minDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
      if (dob > minDate) {
        setError('Student must be at least 18 years old');
        return;
      }
    }

    if (name === 'CourseYear') {
      if (value === student.CourseYear) return;

      const currentIndex = courseYearOrder.indexOf(student.CourseYear);
      const newIndex = courseYearOrder.indexOf(value);

      if (currentIndex !== -1 && newIndex < currentIndex) {
        const higherYear = student.CourseYear;
        const hasPaymentDetails = paymentDetails.some(
          (payment) => payment.courseYear === higherYear
        );

        if (hasPaymentDetails) {
          toast.error(`This student is a lateral entry student. Payment details exist for ${higherYear} year.`);
          return;
        } else {
          setStudent((prev) => ({ ...prev, CourseYear: value }));
          loadAcademicDetails(value, academicData.length > 1);
          return;
        }
      }

      if (currentIndex !== -1) {
        if (newIndex < currentIndex) {
          const missingYears = [];
          for (let i = newIndex; i < currentIndex; i++) {
            if (!academicData.find((detail) => detail.courseYear === courseYearOrder[i])) {
              missingYears.push(courseYearOrder[i]);
            }
          }
          if (missingYears.length > 0) {
            toast.error(
              `Please update the records for ${missingYears.join(', ')} year(s) before updating to ${courseYearOrder[newIndex]} year.`
            );
            return;
          }
        } else if (newIndex > currentIndex + 1) {
          const skippedYears = courseYearOrder.slice(currentIndex + 1, newIndex).join(', ');
          toast.error(`You cannot skip ${skippedYears} year(s). Please enroll in sequential order.`);
          return;
        }
      }

      setStudent((prev) => ({ ...prev, CourseYear: value }));
      loadAcademicDetails(value, academicData.length > 1);
      return;
    }

    if (name === 'SessionYear') {
      const currentIndex = courseYearOrder.indexOf(student.CourseYear);
      const prevYearRecord = currentIndex > 0 ? academicData.find(
        (data) => data.courseYear === courseYearOrder[currentIndex - 1]
      ) : null;
      const nextYearRecord = academicData.find(
        (data) => data.courseYear === courseYearOrder[currentIndex + 1]
      );

      if (prevYearRecord) {
        const prevSessionIndex = sessionYears.indexOf(prevYearRecord.sessionYear);
        const selectedSessionIndex = sessionYears.indexOf(value);
        if (selectedSessionIndex <= prevSessionIndex) {
          toast.error(
            `You cannot select session year ${value} as it is earlier than or equal to the previous year (${prevYearRecord.sessionYear}). Please select a valid session year.`
          );
          return;
        }
      }

      if (nextYearRecord) {
        const nextSessionIndex = sessionYears.indexOf(nextYearRecord.sessionYear);
        const selectedSessionIndex = sessionYears.indexOf(value);
        if (selectedSessionIndex >= nextSessionIndex) {
          toast.error(
            `You cannot select session year ${value} as it is later than or equal to the next year (${nextYearRecord.sessionYear}). Please select a valid session year.`
          );
          return;
        }
      }

      const existingRecord = academicData.find((detail) => detail.sessionYear === value && detail.courseYear === student.CourseYear);
      if (existingRecord) {
        toast.error(
          `This session year ${value} for ${student.CourseYear} year already exists in the database. Please select a different session year.`
        );
        return;
      }

      setStudent((prev) => ({ ...prev, SessionYear: value }));
      toast.info(`Loaded data for ${student.CourseYear} year, session ${value}`);
      return;
    }

    if (type === 'checkbox') {
      if (name === 'IsDiscontinue') {
        const isChecked = (e.target as HTMLInputElement).checked;
        const currentDate = new Date().toISOString().split('T')[0];
        setStudent((prev) => ({
          ...prev,
          IsDiscontinue: isChecked,
          DiscontinueOn: isChecked ? currentDate : '',
          DiscontinueBy: isChecked ? modifiedBy : '',
        }));
      } else {
        setStudent((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
      }
    } else if (type === 'number') {
      const numValue = value === '' ? 0 : parseFloat(value);
      setStudent((prev) => ({ ...prev, [name]: numValue }));
    } else if (name === 'PaymentMode') {
      const newPaymentMode = value;
      const newNumberOfEMI = newPaymentMode === 'EMI' ? (student.NumberOfEMI && [2, 3, 4, 5, 6].includes(student.NumberOfEMI) ? student.NumberOfEMI : null) : null;
      setStudent((prev) => ({
        ...prev,
        [name]: newPaymentMode,
        NumberOfEMI: newNumberOfEMI,
        emiDetails: newPaymentMode === 'EMI' ? prev.emiDetails : [],
      }));
      if (newPaymentMode !== 'EMI') {
        setEmiDetails([]);
      } else if (newNumberOfEMI && newNumberOfEMI > 0) {
        const newEmiDetails = Array.from({ length: newNumberOfEMI }, (_, i) => ({
          emiNumber: i + 1,
          amount: emiDetails[i]?.amount || 0,
          dueDate: emiDetails[i]?.dueDate || '',
        }));
        setEmiDetails(newEmiDetails);
      }
    } else if (name === 'NumberOfEMI') {
      const newNumEMIs = value === '' ? null : parseInt(value);
      setStudent((prev) => ({ ...prev, [name]: newNumEMIs }));
      if (newNumEMIs && newNumEMIs > 0) {
        const newEmiDetails = Array.from({ length: newNumEMIs }, (_, i) => ({
          emiNumber: i + 1,
          amount: emiDetails[i]?.amount || 0,
          dueDate: emiDetails[i]?.dueDate || '',
        }));
        setEmiDetails(newEmiDetails);
      } else {
        setEmiDetails([]);
      }
    } else {
      setStudent((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleEmiChange = (index: number, field: 'amount' | 'dueDate', value: string | number) => {
    setEmiDetails((prev) => {
      const newEmiDetails = [...prev];
      newEmiDetails[index] = {
        ...newEmiDetails[index],
        [field]: field === 'amount' ? (value === '' ? 0 : parseFloat(value as string)) : value as string,
      };
      return newEmiDetails;
    });
    setStudent((prev) => ({ ...prev, emiDetails: emiDetails }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof Documents) => {
    const file = e.target.files?.[0];
    if (file) {
      const preview = fieldName === 'StudentImage' ? URL.createObjectURL(file) : null;
      setDocuments((prev) => ({ ...prev, [fieldName]: { file, preview } }));
    }
  };

// Inside your component
const [showDeleteModal, setShowDeleteModal] = useState(false);
const [showPreviewModal, setShowPreviewModal] = useState(false);
const [selectedDocType, setSelectedDocType] = useState<string | null>(null)
const docURL = selectedDocType ? existingDocuments[selectedDocType]?.Url || '' : '';

const confirmDelete = () => {
  if (selectedDocType) {
    handleDeleteDocument(selectedDocType as keyof Documents);
    setShowDeleteModal(false);
    setSelectedDocType(null);
  }
};

  const handleDeleteDocument = async (docType: keyof Documents) => {
    if (!existingDocuments[docType]) return;

    try {
      await axiosInstance.delete(`/students/${studentId}/documents/${docType}`);
      setExistingDocuments((prev) => {
        const newDocs = { ...prev };
        delete newDocs[docType];
        return newDocs;
      });
      setDocuments((prev) => ({
        ...prev,
        [docType]: { file: null, preview: null },
      }));
      toast.success(`${docType} deleted successfully`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete document');
    }
  };

  const handleUpdateConfirm = () => {
    setIsPreviewOpen(true);
  };

  const confirmUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowUpdateConfirmModal(false);
    setIsSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      Object.entries(student).forEach(([key, value]) => {
        if (key !== 'StudentId' && key !== 'emiDetails' && value !== null && value !== undefined) {
          formData.append(key, value.toString());
        }
      });

      if (student.PaymentMode === 'EMI' && emiDetails.length > 0) {
        formData.append('emiDetails', JSON.stringify(emiDetails));
      }

      Object.entries(documents).forEach(([fieldName, fileData]) => {
        if (fileData.file) {
          formData.append(fieldName, fileData.file);
        }
      });

      const response = await axiosInstance.put(`/students/${studentId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        toast.success('Student Updated successfully!');
        onSuccess();
        onClose();
      } else {
        throw new Error(response.data.message || 'Failed to update student');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || error.message || 'An error occurred while updating the form');
      toast.error(error.response?.data?.message || 'Failed to update student');
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        return (
          !!student.FName &&
          !!student.RollNumber &&
          !!student.DOB &&
          !!student.Gender &&
          !!student.FatherName &&
          !!student.MotherName &&
          !!student.MobileNumber &&
          !!student.EmailId &&
          !!student.FatherMobileNumber &&
          !!student.City &&
          !!student.State &&
          !!student.Pincode &&
          !!student.Address &&
          !!student.Category
        );
      case 2:
        return !!student.CollegeId && !!student.AdmissionMode && !!student.CourseId && !!student.CourseYear && !!student.SessionYear;
      case 3:
        if (student.PaymentMode === 'EMI' && student.NumberOfEMI && emiDetails.length > 0) {
          const totalEmiAmount = emiDetails.reduce((sum, emi) => sum + emi.amount, 0);
          const totalAmount = student.FineAmount + student.RefundAmount;
          if (totalEmiAmount > totalAmount) {
            setError('Total EMI amount cannot be greater than the sum of Admin Amount and Fees Amount.');
            toast.error('Total EMI amount cannot exceed Admin Amount + Fees Amount. Please adjust the EMI amounts.');
            return false;
          }
        }
        return (
          !!student.PaymentMode &&
          (student.PaymentMode !== 'EMI' ||
            (student.NumberOfEMI !== null && student.NumberOfEMI > 0 && emiDetails.every((emi) => emi.amount > 0 && emi.dueDate)))
        );
      case 4:
        return true; // No strict validation for documents
      default:
        return true;
    }
  };

 const handleTabClick = (tabNumber: number) => {
  setStep(tabNumber);   // Direct navigation
  setError('');         // Optional: clear any errors when switching
};


  const nextStep = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, 4));
      setError('');
    } else {
      toast.warning(`Please fill all required fields before proceeding`);
    }
  };

  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
    setError('');
  };

  const formatDate = (dateString: string | Date): string => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return '-';
    }
  };

  const RequiredAsterisk = () => <span className="text-red-500">*</span>;

  const hasChanged = (field: keyof StudentFormData) => {
    if (!originalStudentData) return false;
    return student[field] !== originalStudentData[field];
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-999">
      <div className="bg-white p-3 rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-lg">
        <div className="flex justify-between items-center mb-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-2 rounded-t-lg">
          <h2 className="text-sm font-bold">
            Edit Student : <b className="text-yellow-400">{student.stdCollId}</b>
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-red-700 text-lg p-1 rounded focus:ring-2 focus:ring-blue-300 transition-colors"
          >
            <FaTimes />
          </button>
        </div>

        {error && (
          <div className="mb-2 p-1 bg-red-100 text-xs text-red-700 rounded border-l-4 border-red-500 animated fadeIn">
            {error}
          </div>
        )}

        <div className="flex border-b mb-2 bg-gray-100 rounded-md p-1">
          {[1, 2, 3, 4].map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabClick(tab)}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors duration-300 focus:ring-2 mr-2 ${
                step === tab ? 'text-white bg-blue-600 shadow-md' : 'text-gray-600 hover:bg-gray-300'
              }`}
            >
              {['Personal', 'Academic', 'Payment', 'Documents'][tab - 1]} Details
            </button>
          ))}
        </div>

        <form className="space-y-2" onSubmit={confirmUpdate}>
          {step === 1 && (
            <div className="bg-blue-50 p-2 rounded grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  First Name <RequiredAsterisk />
                </label>
                <input
                  type="text"
                  name="FName"
                  value={student.FName}
                  onChange={handleChange}
                  className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Last Name</label>
                <input
                  type="text"
                  name="LName"
                  value={student.LName}
                  onChange={handleChange}
                  className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Roll Number <RequiredAsterisk />
                </label>
                <input
                  type="text"
                  name="RollNumber"
                  value={student.RollNumber}
                  onChange={handleChange}
                  className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  DOB <RequiredAsterisk />
                </label>
                <input
                  type="date"
                  name="DOB"
                  value={student.DOB}
                  onChange={handleChange}
                  className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Gender <RequiredAsterisk />
                </label>
                <select
                  name="Gender"
                  value={student.Gender}
                  onChange={handleChange}
                  className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300"
                  required
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Category <RequiredAsterisk />
                </label>
                <select
                  name="Category"
                  value={student.Category}
                  onChange={handleChange}
                  className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300"
                  required
                >
                  <option value="">Select</option>
                  <option value="Gen">Gen</option>
                  <option value="OBC">OBC</option>
                  <option value="SC">SC</option>
                  <option value="ST">ST</option>
                  <option value="MINORITY">MINORITY</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Father's Name <RequiredAsterisk />
                </label>
                <input
                  type="text"
                  name="FatherName"
                  value={student.FatherName}
                  onChange={handleChange}
                  className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Mother's Name <RequiredAsterisk />
                </label>
                <input
                  type="text"
                  name="MotherName"
                  value={student.MotherName}
                  onChange={handleChange}
                  className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Mobile Number <RequiredAsterisk />
                </label>
                <input
                  type="tel"
                  name="MobileNumber"
                  maxLength={10}
                  value={student.MobileNumber}
                  onChange={handleChange}
                  className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Alternate Number</label>
                <input
                  type="tel"
                  name="AlternateNumber"
                  maxLength={10}
                  value={student.AlternateNumber}
                  onChange={handleChange}
                  className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Email ID <RequiredAsterisk />
                </label>
                <input
                  type="email"
                  name="EmailId"
                  value={student.EmailId}
                  onChange={handleChange}
                  className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Father's Mobile <RequiredAsterisk />
                </label>
                <input
                  type="tel"
                  name="FatherMobileNumber"
                  value={student.FatherMobileNumber}
                  onChange={handleChange}
                  className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  City <RequiredAsterisk />
                </label>
                <input
                  type="text"
                  name="City"
                  value={student.City}
                  onChange={handleChange}
                  className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  State <RequiredAsterisk />
                </label>
                <input
                  type="text"
                  name="State"
                  value={student.State}
                  onChange={handleChange}
                  className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Pincode <RequiredAsterisk />
                </label>
                <input
                  type="text"
                  name="Pincode"
                  maxLength={6}
                  value={student.Pincode}
                  onChange={handleChange}
                  className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700">
                  Address <RequiredAsterisk />
                </label>
                <textarea
                  name="Address"
                  value={student.Address}
                  onChange={handleChange}
                  className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300"
                  required
                  rows={2}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="bg-pink-50 p-2 rounded grid grid-cols-1 md:grid-cols-2 gap-1">
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    College <RequiredAsterisk />
                  </label>
                  <select
                    name="CollegeId"
                    value={student.CollegeId}
                    onChange={handleChange}
                    className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed"
                    required
                    disabled
                  >
                    <option value="">Select</option>
                    {colleges.map((college) => (
                      <option key={college.id} value={college.id}>
                        {college.collegeName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Admission Mode <RequiredAsterisk />
                  </label>
                  <select
                    name="AdmissionMode"
                    value={student.AdmissionMode}
                    onChange={handleChange}
                    className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed"
                    required
                    disabled
                  >
                    <option value="">Select</option>
                    <option value="direct">Direct</option>
                    <option value="entrance">Entrance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Course <RequiredAsterisk />
                  </label>
                  <select
                    name="CourseId"
                    value={student.CourseId}
                    onChange={handleChange}
                    className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed"
                    required
                    disabled
                  >
                    <option value="">Select</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.courseName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Course Year <RequiredAsterisk />
                  </label>
                  <select
                    name="CourseYear"
                    value={student.CourseYear}
                    onChange={handleChange}
                    className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300"
                    required
                  >
                    <option value="">Select</option>
                    {academicData.map((data) => (
                      <option key={data.courseYear} value={data.courseYear}>
                        {data.courseYear}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Admission Date</label>
                  <input
                    type="date"
                    name="AdmissionDate"
                    value={student.AdmissionDate}
                    onChange={handleChange}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Session Year <RequiredAsterisk />
                  </label>
                  <select
                    name="SessionYear"
                    value={student.SessionYear}
                    onChange={handleChange}
                    className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300"
                    required
                  >
                    <option value="">Please Select Session Year</option>
                    {sessionYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="p-1">
                  <label className="flex items-center text-xs font-medium text-gray-700">
                    <input
                      type="checkbox"
                      name="IsDiscontinue"
                      checked={student.IsDiscontinue}
                      onChange={handleChange}
                      className="mr-1 focus:ring-2 focus:ring-blue-300"
                    />
                    Is Discontinued?
                  </label>
                </div>
                <div>
                  <label className="flex items-center text-xs font-medium text-gray-700">
                    <input
                      type="checkbox"
                      name="isLateral"
                      checked={student.isLateral}
                      onChange={handleChange}
                      className="mr-1 disabled:cursor-not-allowed"
                      disabled
                    />
                    Is Lateral
                  </label>
                </div>
                {student.IsDiscontinue && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Discontinue Date</label>
                      <input
                        type="date"
                        name="DiscontinueOn"
                        value={student.DiscontinueOn}
                        onChange={handleChange}
                        className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300 disabled:bg-gray-200 disabled:cursor-not-allowed"
                        disabled
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Discontinued By</label>
                      <input
                        type="text"
                        name="DiscontinueBy"
                        value={student.DiscontinueBy}
                        onChange={handleChange}
                        className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300 disabled:bg-gray-200 disabled:cursor-not-allowed"
                        disabled
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="mt-1">
                <div className='flex justify-between p-1 mb-2 bg-gradient-to-r from-blue-500 to-purple-300 rounded'>
                  <h2 className="text-xl font-semibold text-white mb-0.5">Academic History</h2>
                  <button
                    onClick={() => handlePromoteClick(student.StudentId)}
                    title="Promote Student"
                    className="px-2 py-1 text-sm font-semibold focus:ring-2 text-white bg-green-400 rounded-lg shadow-sm 
                              hover:bg-green-500 transition duration-200 flex items-center justify-center"
                            type='button'
                  >
                    Promote
                  </button>
                </div>
                <div className="overflow-x-auto rounded border border-gray-200 shadow-sm">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-200 text-gray-800 uppercase">
                      <tr>
                        {[
                          'SAID',
                          'Course Year',
                          'Session',
                          'Admin Amount',
                          'Payment Mode',
                          'Fees Amount',
                          'Created On',
                          'Created By',
                          'Modified On',
                          'Modified By',
                        ].map((header) => (
                          <th key={header} className="px-1 py-0.5 text-left font-medium whitespace-nowrap">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {academicData.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 whitespace-nowrap">
                          <td className="px-1 py-0.5">{item.id}</td>
                          <td className="px-1 py-0.5">{item.courseYear}</td>
                          <td className="px-1 py-0.5">{item.sessionYear}</td>
                          <td className="px-1 py-0.5">₹{item.adminAmount.toLocaleString('en-IN')}</td>
                          <td className="px-1 py-0.5 flex items-center gap-0.5">
                            {item.paymentMode}
                            {item.numberOfEMI && (
                              <span className="bg-blue-100 text-blue-800 text-xs px-0.5 rounded-full">
                                {item.numberOfEMI} EMI
                              </span>
                            )}
                          </td>
                          <td className="px-1 py-0.5">₹{item.feesAmount.toLocaleString('en-IN')}</td>
                          <td className="px-1 py-0.5">{formatDate(item.createdOn)}</td>
                          <td className="px-1 py-0.5">{item.createdBy || '-'}</td>
                          <td className="px-1 py-0.5">{item.modifiedOn ? formatDate(item.modifiedOn) : '-'}</td>
                          <td className="px-1 py-0.5">{item.modifiedBy || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {academicData.length === 0 && (
                    <div className="text-center py-1 text-xs text-gray-500">No academic records found</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="bg-purple-50 p-2 rounded grid grid-cols-1 md:grid-cols-2 gap-1">
              {!loadingAcademic ? (
                <div className="col-span-2 flex justify-center items-center">
                  <Loader1 size="lg" className="text-blue-500" />
                </div>
              ) : (
                <>
                  <div className="col-span-2">
                    <h2 className="text-xs font-semibold text-gray-800 mb-0.5">
                      {student.CourseYear ? `${student.CourseYear} Year Payment Details` : 'Payment Details'}
                    </h2>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Admin Amount</label>
                    <input
                      type="number"
                      name="FineAmount"
                      value={student.FineAmount}
                      onChange={handleChange}
                      className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Ledger Number</label>
                    <input
                      type="text"
                      name="LedgerNumber"
                      value={student.LedgerNumber}
                      onChange={handleChange}
                      className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Fees Amount</label>
                    <input
                      type="number"
                      name="RefundAmount"
                      value={student.RefundAmount}
                      onChange={handleChange}
                      className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300"
                      min="0"
                    />
                  </div>
                  <div className="flex items-center">
                    <label className="mr-1 block text-xs font-medium text-gray-700">
                      Payment Mode <RequiredAsterisk />
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="PaymentMode"
                        value="One-Time"
                        checked={student.PaymentMode === 'One-Time'}
                        onChange={handleChange}
                        className="h-3 w-3 text-blue-600"
                      />
                      <span className="ml-0.5 text-xs">One-Time</span>
                    </label>
                    <label className="flex items-center ml-1">
                      <input
                        type="radio"
                        name="PaymentMode"
                        value="EMI"
                        checked={student.PaymentMode === 'EMI'}
                        onChange={handleChange}
                        className="h-3 w-3 text-blue-600"
                      />
                      <span className="ml-0.5 text-xs">EMI</span>
                    </label>
                  </div>
                  {student.PaymentMode === 'EMI' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700">
                        No of EMIs <RequiredAsterisk />
                      </label>
                      <select
                        name="NumberOfEMI"
                        value={student.NumberOfEMI || ''}
                        onChange={handleChange}
                        className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300"
                        required
                      >
                        <option value="">Select</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                        <option value="6">6</option>
                      </select>
                    </div>
                  )}
                  {student.PaymentMode === 'EMI' && student.NumberOfEMI && (
                    <div className="col-span-2 mt-1">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-1 py-0.5 text-left text-xs font-medium text-gray-700">EMI</th>
                              <th className="px-1 py-0.5 text-left text-xs font-medium text-gray-700">Amount</th>
                              <th className="px-1 py-0.5 text-left text-xs font-medium text-gray-700">Date</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {emiDetails.map((emi, index) => (
                              <tr key={index}>
                                <td className="px-1 py-0.5">
                                  <input
                                    type="text"
                                    value={`EMI ${emi.emiNumber}`}
                                    disabled
                                    className="w-full border p-0.5 rounded text-xs bg-gray-100"
                                  />
                                </td>
                                <td className="px-1 py-0.5">
                                  <input
                                    type="number"
                                    value={emi.amount || 0}
                                    onChange={(e) => handleEmiChange(index, 'amount', e.target.value)}
                                    className="w-full border p-0.5 rounded text-xs focus:ring-2 focus:ring-blue-300"
                                    min="0"
                                    required
                                  />
                                </td>
                                <td className="px-1 py-0.5">
                                  <input
                                    type="date"
                                    value={emi.dueDate}
                                    onChange={(e) => handleEmiChange(index, 'dueDate', e.target.value)}
                                    className="w-full border p-0.5 rounded text-xs focus:ring-2 focus:ring-blue-300"
                                    required
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}





{step === 4 && (
  <div className="bg-blue-50 p-2 rounded grid grid-cols-1 md:grid-cols-2 gap-1">
    
    {Object.entries(documents).map(([docType, doc]) => (
      
      <div key={docType} className="flex items-center gap-2">
        <div className="w-full">
          <label className="block text-xs font-medium text-gray-700">
            {{
              StudentImage: "Student Photo",
              TenthMarks: "10th Marksheet",
              TwelfthMarks: "12th Marksheet",
              CasteCertificate: "Caste Certificate",
              Income: "Income Certificate",
              Residential: "Residential Proof"
            }[docType] || docType}
          </label>

          <div className="flex items-center gap-2">
            <input
              type="file"
              accept={docType === "StudentImage" ? ".jpg,.jpeg,.png" : ".pdf,.jpg,.jpeg,.png"}
              onChange={(e) => handleFileChange(e, docType as keyof Documents)}
              className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300 file:rounded-full file:bg-blue-300"
            />
            {(doc.preview || (existingDocuments[docType] && existingDocuments[docType].Url)) && (
              <img
                src={doc.preview || existingDocuments[docType].Url}
                alt={`${docType} Preview`}
                className="h-10 w-10 object-cover rounded mt-0.5"
              />
            )}

            {existingDocuments[docType] && (
              
              <>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDocType(docType);
                    setShowDeleteModal(true);
                  }}
                  className="text-red-500 hover:text-red-700 text-xs p-1 rounded focus:ring-2 focus:ring-red-300"
                  title="Delete Document"
                >
                  <FaTrash />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedDocType(docType);
                    setShowPreviewModal(true);
                  }}
                  className="text-blue-500 hover:text-blue-700 text-xs p-1 rounded focus:ring-2 focus:ring-blue-300"
                  title="View Document"
                >
                  <FaEye />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    ))}
  </div>
)}

{/* Delete Confirmation Modal */}
{showDeleteModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div className="bg-white rounded shadow-lg p-5 w-full max-w-sm">
      <h3 className="text-md font-semibold mb-3">Confirm Deletion</h3>
      <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete this document?</p>
      <div className="flex justify-end gap-2">
        <button
          onClick={() => {
            setShowDeleteModal(false);
            setSelectedDocType(null);
          }}
          className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
        >
          Cancel
        </button>
        <button
          onClick={confirmDelete}
          className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
)}

{/* Preview Modal */}
{showPreviewModal && selectedDocType && (
  
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
    <div className="bg-white rounded-lg shadow-lg p-4 max-w-md w-full relative">
      <button
        onClick={() => {
          setShowPreviewModal(false);
          setSelectedDocType(null);
        }}
        className="absolute top-7 right-6  text-gray-500 hover:text-red-700"
        title="Close"
      >
        <FaTimes size={20} />
      </button>
      <h3 className="text-lg font-semibold bg-blue-200 p-2   rounded  mb-3">Document Preview</h3>
      {docURL?.endsWith(".pdf") ? (
        <iframe src={docURL} title="PDF Preview" className="w-full h-96 border rounded"></iframe>
      ) : (
        <img src={docURL} alt="Preview" className="w-full  object-fit rounded shadow" />
      )}
    </div>
  </div>
)}

          <div className="flex justify-between pt-1">
            {step > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="px-2 py-0.5 bg-gray-300 text-xs text-gray-800 rounded hover:bg-gray-400"
              >
                Previous
              </button>
            )}
            <div className="flex space-x-1">
              {step < 4 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                >
                  Save & Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleUpdateConfirm}
                  className="px-2 py-0.5 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                >
                  Preview & Update
                </button>
              )}
            </div>
          </div>
        </form>

     {isPreviewOpen && (
  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm z-[1000]">
    <div className="bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-blue-200 dark:border-blue-900">
      <h2 className="text-xl font-bold mb-4 text-center text-indigo-700 dark:text-indigo-400 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Student Details Preview
      </h2>

      <div className="flex justify-center mb-6">
        {documents.StudentImage.preview || existingDocuments.StudentImage ? (
          <div className="h-28 w-28 rounded-full overflow-hidden border-4 border-indigo-300 dark:border-indigo-700 shadow-lg">
            <img
              src={documents.StudentImage.preview || existingDocuments.StudentImage.Url}
              alt="Student"
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="h-28 w-28 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 border-4 border-gray-300 dark:border-gray-600 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 text-sm">
        <div className="space-y-3 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md border border-blue-100 dark:border-blue-900">
          <h3 className="font-bold text-blue-600 dark:text-blue-400 border-b border-blue-200 dark:border-blue-700 pb-2 text-base flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Personal Details
          </h3>
          <div className="grid grid-cols-1 gap-2">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 dark:text-gray-400">Full Name</span>
              <span className={hasChanged('FName') || hasChanged('LName') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}>
                {student.FName} {student.LName}
                {(hasChanged('FName') || hasChanged('LName')) && (
                  <span className="text-gray-400 dark:text-gray-500 text-xs ml-2">
                    (Original: {originalStudentData?.FName} {originalStudentData?.LName})
                  </span>
                )}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 dark:text-gray-400">Roll Number</span>
              <span className={hasChanged('RollNumber') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}>
                {student.RollNumber}
                {hasChanged('RollNumber') && (
                  <span className="text-gray-400 dark:text-gray-500 text-xs ml-2">
                    (Original: {originalStudentData?.RollNumber})
                  </span>
                )}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 dark:text-gray-400">Date of Birth</span>
              <span className={hasChanged('DOB') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}>
                {student.DOB}
                {hasChanged('DOB') && (
                  <span className="text-gray-400 dark:text-gray-500 text-xs ml-2">
                    (Original: {originalStudentData?.DOB})
                  </span>
                )}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 dark:text-gray-400">Gender</span>
              <span className={hasChanged('Gender') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}>
                {student.Gender}
                {hasChanged('Gender') && (
                  <span className="text-gray-400 dark:text-gray-500 text-xs ml-2">
                    (Original: {originalStudentData?.Gender})
                  </span>
                )}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 dark:text-gray-400">Mobile</span>
              <span className={hasChanged('MobileNumber') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}>
                {student.MobileNumber}
                {hasChanged('MobileNumber') && (
                  <span className="text-gray-400 dark:text-gray-500 text-xs ml-2">
                    (Original: {originalStudentData?.MobileNumber})
                  </span>
                )}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 dark:text-gray-400">Email</span>
              <span className={hasChanged('EmailId') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}>
                {student.EmailId}
                {hasChanged('EmailId') && (
                  <span className="text-gray-400 dark:text-gray-500 text-xs ml-2">
                    (Original: {originalStudentData?.EmailId})
                  </span>
                )}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 dark:text-gray-400">Father's Name</span>
              <span className={hasChanged('FatherName') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}>
                {student.FatherName}
                {hasChanged('FatherName') && (
                  <span className="text-gray-400 dark:text-gray-500 text-xs ml-2">
                    (Original: {originalStudentData?.FatherName})
                  </span>
                )}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 dark:text-gray-400">Mother's Name</span>
              <span className={hasChanged('MotherName') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}>
                {student.MotherName}
                {hasChanged('MotherName') && (
                  <span className="text-gray-400 dark:text-gray-500 text-xs ml-2">
                    (Original: {originalStudentData?.MotherName})
                  </span>
                )}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 dark:text-gray-400">Category</span>
              <span className={hasChanged('Category') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}>
                {student.Category}
                {hasChanged('Category') && (
                  <span className="text-gray-400 dark:text-gray-500 text-xs ml-2">
                    (Original: {originalStudentData?.Category})
                  </span>
                )}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 dark:text-gray-400">Address</span>
              <span className={hasChanged('Address') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}>
                {student.Address}
                {hasChanged('Address') && (
                  <span className="text-gray-400 dark:text-gray-500 text-xs ml-2">
                    (Original: {originalStudentData?.Address})
                  </span>
                )}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 dark:text-gray-400">Location</span>
              <span className={hasChanged('City') || hasChanged('State') || hasChanged('Pincode') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}>
                {student.City}, {student.State} - {student.Pincode}
                {(hasChanged('City') || hasChanged('State') || hasChanged('Pincode')) && (
                  <span className="text-gray-400 dark:text-gray-500 text-xs ml-2">
                    (Original: {originalStudentData?.City}, {originalStudentData?.State} - {originalStudentData?.Pincode})
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md border border-purple-100 dark:border-purple-900">
          <h3 className="font-bold text-purple-600 dark:text-purple-400 border-b border-purple-200 dark:border-purple-700 pb-2 text-base flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M12 14l9-5-9-5-9 5 9 5z" />
              <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
            </svg>
            Academic Details
          </h3>
          <div className="grid grid-cols-1 gap-2">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 dark:text-gray-400">College</span>
              <span className={hasChanged('CollegeId') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}>
                {colleges.find((c) => c.id === parseInt(student.CollegeId))?.collegeName || 'N/A'}
                {hasChanged('CollegeId') && (
                  <span className="text-gray-400 dark:text-gray-500 text-xs ml-2">
                    (Original: {colleges.find((c) => c.id === parseInt(originalStudentData?.CollegeId || ''))?.collegeName || 'N/A'})
                  </span>
                )}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 dark:text-gray-400">Course</span>
              <span className={hasChanged('CourseId') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}>
                {courses.find((c) => c.id === parseInt(student.CourseId))?.courseName || 'N/A'}
                {hasChanged('CourseId') && (
                  <span className="text-gray-400 dark:text-gray-500 text-xs ml-2">
                    (Original: {courses.find((c) => c.id === parseInt(originalStudentData?.CourseId || ''))?.courseName || 'N/A'})
                  </span>
                )}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 dark:text-gray-400">Course Year</span>
              <span className={hasChanged('CourseYear') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}>
                {student.CourseYear}
                {hasChanged('CourseYear') && (
                  <span className="text-gray-400 dark:text-gray-500 text-xs ml-2">
                    (Original: {originalStudentData?.CourseYear})
                  </span>
                )}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 dark:text-gray-400">Admission Mode</span>
              <span className={hasChanged('AdmissionMode') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}>
                {student.AdmissionMode}
                {hasChanged('AdmissionMode') && (
                  <span className="text-gray-400 dark:text-gray-500 text-xs ml-2">
                    (Original: {originalStudentData?.AdmissionMode})
                  </span>
                )}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 dark:text-gray-400">Admission Date</span>
              <span className={hasChanged('AdmissionDate') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}>
                {student.AdmissionDate}
                {hasChanged('AdmissionDate') && (
                  <span className="text-gray-400 dark:text-gray-500 text-xs ml-2">
                    (Original: {originalStudentData?.AdmissionDate})
                  </span>
              
                )}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 dark:text-gray-400">Session Year</span>
              <span className={hasChanged('SessionYear') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}>
                {student.SessionYear}
                {hasChanged('SessionYear') && (
                  <span className="text-gray-400 dark:text-gray-500 text-xs ml-2">
                    (Original: {originalStudentData?.SessionYear})
                  </span>
                )}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 dark:text-gray-400">Is Discontinued</span>
              <span className={hasChanged('IsDiscontinue') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}>
                {student.IsDiscontinue ? 'Yes' : 'No'}
                {hasChanged('IsDiscontinue') && (
                  <span className="text-gray-400 dark:text-gray-500 text-xs ml-2">
                    (Original: {originalStudentData?.IsDiscontinue ? 'Yes' : 'No'})
                  </span>
                )}
              </span>
            </div>
            {student.IsDiscontinue && (
              <>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Discontinue Date</span>
                  <span className={hasChanged('DiscontinueOn') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}>
                    {student.DiscontinueOn}
                    {hasChanged('DiscontinueOn') && (
                      <span className="text-gray-400 dark:text-gray-500 text-xs ml-2">
                        (Original: {originalStudentData?.DiscontinueOn})
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Discontinued By</span>
                  <span className={hasChanged('DiscontinueBy') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}>
                    {student.DiscontinueBy}
                    {hasChanged('DiscontinueBy') && (
                      <span className="text-gray-400 dark:text-gray-500 text-xs ml-2">
                        (Original: {originalStudentData?.DiscontinueBy})
                      </span>
                    )}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="space-y-3 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md border border-pink-100 dark:border-pink-900">
          <h3 className="font-bold text-pink-600 dark:text-pink-400 border-b border-pink-200 dark:border-pink-700 pb-2 text-base flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Payment Details
          </h3>
          <div className="grid grid-cols-1 gap-2">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 dark:text-gray-400">Payment Mode</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                student.PaymentMode === 'EMI' 
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' 
                  : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              }`}>
                {student.PaymentMode}
                {hasChanged('PaymentMode') && (
                  <span className="text-gray-400 dark:text-gray-500 text-xs ml-2">
                    (Original: {originalStudentData?.PaymentMode})
                  </span>
                )}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 dark:text-gray-400">Admin Amount</span>
              <span className={hasChanged('FineAmount') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}>
                ₹{student.FineAmount.toLocaleString('en-IN')}
                {hasChanged('FineAmount') && (
                  <span className="text-gray-400 dark:text-gray-500 text-xs ml-2">
                    (Original: ₹{originalStudentData?.FineAmount.toLocaleString('en-IN')})
                  </span>
                )}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 dark:text-gray-400">Fees Amount</span>
              <span className={hasChanged('RefundAmount') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}>
                ₹{student.RefundAmount.toLocaleString('en-IN')}
                {hasChanged('RefundAmount') && (
                  <span className="text-gray-400 dark:text-gray-500 text-xs ml-2">
                    (Original: ₹{originalStudentData?.RefundAmount.toLocaleString('en-IN')})
                  </span>
                )}
              </span>
            </div>
            {student.PaymentMode === 'EMI' && student.NumberOfEMI && (
              <>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Number of EMIs</span>
                  <span className={hasChanged('NumberOfEMI') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}>
                    {student.NumberOfEMI}
                    {hasChanged('NumberOfEMI') && (
                      <span className="text-gray-400 dark:text-gray-500 text-xs ml-2">
                        (Original: {originalStudentData?.NumberOfEMI || 'N/A'})
                      </span>
                    )}
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">EMI Schedule</span>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2 space-y-2">
                    {emiDetails.map((emi, index) => (
                      <div key={index} className="flex justify-between items-center border-b border-gray-200 dark:border-gray-600 pb-1 last:border-0 last:pb-0">
                        <div className="flex items-center">
                          <div className="w-6 h-6 rounded-full bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-300 flex items-center justify-center text-xs font-bold mr-2">
                            {emi.emiNumber}
                          </div>
                          <span className="text-sm text-gray-700 dark:text-gray-300">EMI {emi.emiNumber}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Amount</span>
                          <div className="text-sm font-medium text-gray-800 dark:text-gray-200">₹{emi.amount.toLocaleString('en-IN')}</div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">Date</span>
                          <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{emi.dueDate}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="space-y-3 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md border border-green-100 dark:border-green-900">
          <h3 className="font-bold text-green-600 dark:text-green-400 border-b border-green-200 dark:border-green-700 pb-2 text-base flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Document Details
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {Object.entries(documents).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {key === 'StudentImage' ? 'Student Photo' :
                   key === 'TenthMarks' ? '10th Marksheet' :
                   key === 'TwelfthMarks' ? '12th Marksheet' :
                   key === 'CasteCertificate' ? 'Caste Certificate' :
                   key === 'Income' ? 'Income Certificate' :
                   key === 'Residential' ? 'Residential Proof' : key}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  value.file || existingDocuments[key] 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                }`}>
                  {value.file || existingDocuments[key] ? 'Uploaded' : 'Not Uploaded'}
                  {(value.file && existingDocuments[key]) && (
                    <span className="text-gray-400 dark:text-gray-500 text-xs ml-2">
                      (Original: Uploaded)
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          onClick={() => setIsPreviewOpen(false)}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
          </svg>
          Back to Edit
        </button>
        <button
          onClick={(e) => {
            confirmUpdate(e);
            setIsPreviewOpen(false);
          }}
          disabled={isSubmitting}
          className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-medium rounded-lg hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-md flex items-center"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              Updating...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Confirm Update
            </>
          )}
        </button>
      </div>
    </div>
  </div>
)}
        <Modal
          show={showUpdateConfirmModal}
          onClose={() => setShowUpdateConfirmModal(false)}
          size="md"
          className="fixed inset-0 pt-50 flex items-center justify-center bg-black bg-opacity-50 z-999 backdrop-blur-sm"
        >
          <Modal.Header className="bg-green-500 text-white py-1 text-sm">Confirm Update</Modal.Header>
          <Modal.Body className="py-2">
            <p className="text-sm text-gray-600">Are you sure you want to update this student's data?</p>
          </Modal.Body>
          <Modal.Footer className="py-1">
            <button
              onClick={() => setShowUpdateConfirmModal(false)}
              className="px-2 py-0.5 bg-gray-300 text-gray-800 text-sm rounded hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={confirmUpdate}
              className="px-2 py-0.5 bg-green-500 text-white text-sm rounded hover:bg-green-600"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader1 size="sm" className="inline-block mr-0.5" />
                  Updating...
                </>
              ) : 'Confirm'}
            </button>
          </Modal.Footer>
        </Modal>

        {isPromoteModalOpen && selectedStudentId && (
          <PromoteStudentModal
            studentId={selectedStudentId}
            onClose={() => setIsPromoteModalOpen(false)}
            onSuccess={() => {
              setIsPromoteModalOpen(false);
              onSuccess();
            }}
            modifiedBy={user?.name || 'Admin'}
          />
        )}
      </div>
    </div>
  );
};

export default EditStudentModal;