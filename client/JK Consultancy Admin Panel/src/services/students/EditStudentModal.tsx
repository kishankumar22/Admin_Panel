import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import axiosInstance from '../../config';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Modal } from 'flowbite-react';
import { Loader1 } from '../../common/Loader/index';
import PromoteStudentModal from './PromoteStudentModal';

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
  DocumentType: string;
  Url: string;
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
          docs[doc.DocumentType] = doc;
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
      const timer = setTimeout(() => setError(''), 5000);
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
      setStudent((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
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
          !!student.LName &&
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
        return Object.values(documents).some((doc) => doc.file !== null) || Object.values(existingDocuments).length > 0;
      default:
        return true;
    }
  };

  const handleTabClick = (tabNumber: number) => {
    if (validateStep(step)) {
      setStep(tabNumber);
      setError('');
    } else {
      toast.warning(`Please fill all required fields in current tab before switching`);
    }
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
                <label className="block text-xs font-medium text-gray-700">
                  Last Name <RequiredAsterisk />
                </label>
                <input
                  type="text"
                  name="LName"
                  value={student.LName}
                  onChange={handleChange}
                  className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300"
                  required
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
                      className="mr-1"
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
                        className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Discontinued By</label>
                      <input
                        type="text"
                        name="DiscontinueBy"
                        value={student.DiscontinueBy}
                        onChange={handleChange}
                        className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="mt-1">
                <div className=' flex justify-between p-1 mb-2 bg-gradient-to-r from-blue-500 to-purple-300 rounded '>
                <h2 className="text-xl font-semibold text-white mb-0.5">Academic History</h2>
                <button
                  onClick={() => handlePromoteClick(student.StudentId)}
                  title="Promote Student"
                  className="px-2 py-1 text-sm font-semibold focus:ring-2  text-white bg-green-400 rounded-lg shadow-sm 
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
              <div>
                <label className="block text-xs font-medium text-gray-700">Student Photo</label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, 'StudentImage')}
                  className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300 file:rounded-full file:bg-blue-300"
                />
                {documents.StudentImage.preview ? (
                  <img src={documents.StudentImage.preview} alt="New Preview" className="h-10 w-10 object-cover rounded mt-0.5" />
                ) : existingDocuments.StudentImage ? (
                  <img src={existingDocuments.StudentImage.Url} alt="Current" className="h-10 w-10 object-cover rounded mt-0.5" />
                ) : null}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">10th Marksheet</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, 'TenthMarks')}
                  className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300 file:rounded-full file:bg-blue-300"
                />
                {existingDocuments.TenthMarks && !documents.TenthMarks.file && (
                  <a
                    href={existingDocuments.TenthMarks.Url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 text-xs hover:underline"
                  >
                    View Current
                  </a>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">12th Marksheet</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, 'TwelfthMarks')}
                  className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300 file:rounded-full file:bg-blue-300"
                />
                {existingDocuments.TwelfthMarks && !documents.TwelfthMarks.file && (
                  <a
                    href={existingDocuments.TwelfthMarks.Url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 text-xs hover:underline"
                  >
                    View Current
                  </a>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Caste Certificate</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, 'CasteCertificate')}
                  className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300 file:rounded-full file:bg-blue-300"
                />
                {existingDocuments.CasteCertificate && !documents.CasteCertificate.file && (
                  <a
                    href={existingDocuments.CasteCertificate.Url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 text-xs hover:underline"
                  >
                    View Current
                  </a>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Income Certificate</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, 'Income')}
                  className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300 file:rounded-full file:bg-blue-300"
                />
                {existingDocuments.Income && !documents.Income.file && (
                  <a
                    href={existingDocuments.Income.Url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 text-xs hover:underline"
                  >
                    View Current
                  </a>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Residential Proof</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, 'Residential')}
                  className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300 file:rounded-full file:bg-blue-300"
                />
                {existingDocuments.Residential && !documents.Residential.file && (
                  <a
                    href={existingDocuments.Residential.Url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 text-xs hover:underline"
                  >
                    View Current
                  </a>
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
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-999">
            <div className="bg-white p-3 rounded-lg max-w-xl w-full max-h-[85vh] overflow-y-auto shadow-lg">
              <h2 className="text-lg font-bold mb-1 text-center text-blue-800">Student Details Preview</h2>
              <div className="flex justify-center mb-2">
                {documents.StudentImage.preview ? (
                  <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-blue-200">
                    <img src={documents.StudentImage.preview} alt="Student" className="h-full w-full object-cover" />
                  </div>
                ) : existingDocuments.StudentImage ? (
                  <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-blue-200">
                    <img src={existingDocuments.StudentImage.Url} alt="Student" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                    No Image
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2 text-xs">
                <div className="space-y-0.5">
                  <h3 className="font-bold text-blue-600 border-b pb-0.5">Personal Details</h3>
                  <div><span className="font-medium">Name:</span> {student.FName} {student.LName}</div>
                  <div><span className="font-medium">Roll Number:</span> {student.RollNumber}</div>
                  <div><span className="font-medium">DOB:</span> {student.DOB}</div>
                  <div><span className="font-medium">Gender:</span> {student.Gender}</div>
                  <div><span className="font-medium">Mobile:</span> {student.MobileNumber}</div>
                  <div><span className="font-medium">Email:</span> {student.EmailId}</div>
                  <div><span className="font-medium">Father's Name:</span> {student.FatherName}</div>
                  <div><span className="font-medium">Mother's Name:</span> {student.MotherName}</div>
                  <div><span className="font-medium">Category:</span> {student.Category}</div>
                  <div><span className="font-medium">Address:</span> {student.Address}</div>
                  <div><span className="font-medium">City:</span> {student.City}</div>
                  <div><span className="font-medium">State:</span> {student.State}</div>
                  <div><span className="font-medium">Pincode:</span> {student.Pincode}</div>
                </div>
                <div className="space-y-0.5">
                  <h3 className="font-bold text-blue-600 border-b pb-0.5">Academic Details</h3>
                  <div>
                    <span className="font-medium">College:</span>{' '}
                    {colleges.find((c) => c.id === parseInt(student.CollegeId))?.collegeName || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Course:</span>{' '}
                    {courses.find((c) => c.id === parseInt(student.CourseId))?.courseName || 'N/A'}
                  </div>
                  <div><span className="font-medium">Course Year:</span> {student.CourseYear}</div>
                  <div><span className="font-medium">Admission Mode:</span> {student.AdmissionMode}</div>
                  <div><span className="font-medium">Admission Date:</span> {student.AdmissionDate}</div>
                  <div><span className="font-medium">Session Year:</span> {student.SessionYear}</div>
                  <div><span className="font-medium">Is Discontinued:</span> {student.IsDiscontinue ? 'Yes' : 'No'}</div>
                  {student.IsDiscontinue && (
                    <>
                      <div><span className="font-medium">Discontinue Date:</span> {student.DiscontinueOn}</div>
                      <div><span className="font-medium">Discontinued By:</span> {student.DiscontinueBy}</div>
                    </>
                  )}
                </div>
                <div className="space-y-0.5">
                  <h3 className="font-bold text-blue-600 border-b pb-0.5">Payment Details</h3>
                  <div><span className="font-medium">Payment Mode:</span> {student.PaymentMode}</div>
                  <div><span className="font-medium">Admin Amount:</span> ₹{student.FineAmount.toLocaleString('en-IN')}</div>
                  <div><span className="font-medium">Fees Amount:</span> ₹{student.RefundAmount.toLocaleString('en-IN')}</div>
                  <div><span className="font-medium">Ledger Number:</span> {student.LedgerNumber || '-'}</div>
                  {student.PaymentMode === 'EMI' && student.NumberOfEMI && (
                    <>
                      <div><span className="font-medium">No of EMIs:</span> {student.NumberOfEMI}</div>
                      {emiDetails.map((emi, index) => (
                        <div key={index}>
                          <span className="font-medium">EMI {emi.emiNumber}:</span> Amount: ₹{emi.amount.toLocaleString('en-IN')},
                          Due Date: {emi.dueDate || 'Not set'}
                        </div>
                      ))}
                    </>
                  )}
                </div>
                <div className="space-y-0.5">
                  <h3 className="font-bold text-blue-600 border-b pb-0.5">Document Details</h3>
                  <div>
                    <span className="font-medium">Student Photo:</span>{' '}
                    {documents.StudentImage.file ? 'New Uploaded' : existingDocuments.StudentImage ? 'Existing' : 'Not Uploaded'}
                  </div>
                  <div>
                    <span className="font-medium">10th Marksheet:</span>{' '}
                    {documents.TenthMarks.file ? 'New Uploaded' : existingDocuments.TenthMarks ? 'Existing' : 'Not Uploaded'}
                  </div>
                  <div>
                    <span className="font-medium">12th Marksheet:</span>{' '}
                    {documents.TwelfthMarks.file ? 'New Uploaded' : existingDocuments.TwelfthMarks ? 'Existing' : 'Not Uploaded'}
                  </div>
                  <div>
                    <span className="font-medium">Caste Certificate:</span>{' '}
                    {documents.CasteCertificate.file ? 'New Uploaded' : existingDocuments.CasteCertificate ? 'Existing' : 'Not Uploaded'}
                  </div>
                  <div>
                    <span className="font-medium">Income Certificate:</span>{' '}
                    {documents.Income.file ? 'New Uploaded' : existingDocuments.Income ? 'Existing' : 'Not Uploaded'}
                  </div>
                  <div>
                    <span className="font-medium">Residential Proof:</span>{' '}
                    {documents.Residential.file ? 'New Uploaded' : existingDocuments.Residential ? 'Existing' : 'Not Uploaded'}
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-1">
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="px-2 py-0.5 bg-gray-300 text-xs text-gray-800 rounded hover:bg-gray-400"
                >
                  Back
                </button>
                <button
                  onClick={() => setShowUpdateConfirmModal(true)}
                  className="px-2 py-0.5 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                >
                  Confirm Update
                </button>
              </div>

              <Modal
                show={showUpdateConfirmModal}
                onClose={() => setShowUpdateConfirmModal(false)}
                size="md"
                className="fixed inset-0 pt-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
              >
                <Modal.Header className="bg-green-500 text-white py-1 text-sm">Confirm Update</Modal.Header>
                <Modal.Body className="py-2">
                  <p className="text-xs text-gray-600">Are you sure you want to update this student's data?</p>
                </Modal.Body>
                <Modal.Footer className="py-1">
                  <button
                    onClick={() => setShowUpdateConfirmModal(false)}
                    className="px-2 py-0.5 bg-gray-300 text-gray-800 text-xs rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmUpdate}
                    className="px-2 py-0.5 bg-green-500 text-white text-xs rounded hover:bg-green-600"
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
            </div>
          </div>
        )}

        {isPromoteModalOpen && selectedStudentId && (
          <PromoteStudentModal
            studentId={selectedStudentId}
            onClose={() => setIsPromoteModalOpen(false)}
            onSuccess={() => {
              setIsPromoteModalOpen(false);
              // Refresh data if needed
              // fetchStudents();
            }}
            modifiedBy={'Admin'}
          />
        )}
      </div>
    </div>
  );
};

export default EditStudentModal;