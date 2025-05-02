import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import axiosInstance from '../../config';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const RequiredAsterisk = () => <span className="text-red-500">*</span>;

interface StudentFormData {
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
  CreatedBy: string;
  SessionYear: string;
  PaymentMode: string;
  NumberOfEMI: number | null;
  isLateral: boolean;
}

interface FileData {
  file: File | null;
  preview: string | null;
}

interface Documents {
  StudentImage: FileData;
  CasteCertificate: FileData;
  TenthMarks: FileData;
  TwelfthMarks: FileData;
  Residential: FileData;
  Income: FileData;
}

interface College {
  id: number;
  collegeName: string;
}

interface Course {
  id: number;
  courseName: string;
  courseDuration: number;
}

interface StudentFromApi {
  email: string;
  rollNumber: string;
}

interface AddStudentModalProps {
  onClose: () => void;
  onSuccess: () => void;
  createdBy: string;
}

const AddStudentModal: React.FC<AddStudentModalProps> = ({ onClose, onSuccess, createdBy }) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [colleges, setColleges] = useState<College[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [emiDetails, setEmiDetails] = useState<Array<{ emiNumber: number; amount: number; date: string }>>([]);
  const [isLateralModalOpen, setIsLateralModalOpen] = useState(false);
  const [existingStudents, setExistingStudents] = useState<StudentFromApi[]>([]);
  const [rollNumberError, setRollNumberError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [dobError, setDobError] = useState('');

  const [student, setStudent] = useState<StudentFormData>({
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
    CourseYear: '1st',
    Category: '',
    LedgerNumber: '',
    CollegeId: '',
    AdmissionMode: '',
    AdmissionDate: '',
    IsDiscontinue: false,
    DiscontinueOn: '',
    DiscontinueBy: '',
    FineAmount: 0,
    RefundAmount: 0,
    CreatedBy: createdBy || '',
    SessionYear: '',
    PaymentMode: 'One-Time',
    NumberOfEMI: null,
    isLateral: false,
  });

  const [documents, setDocuments] = useState<Documents>({
    StudentImage: { file: null, preview: null },
    CasteCertificate: { file: null, preview: null },
    TenthMarks: { file: null, preview: null },
    TwelfthMarks: { file: null, preview: null },
    Residential: { file: null, preview: null },
    Income: { file: null, preview: null },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [collegeResponse, courseResponse, studentsResponse] = await Promise.all([
          axiosInstance.get('/colleges'),
          axiosInstance.get('/courses'),
          axiosInstance.get('/students'),
        ]);
        setColleges(collegeResponse.data);
        setCourses(courseResponse.data);
        setExistingStudents(studentsResponse.data); // Assuming response is an array of { email, rollNumber }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load colleges, courses, or student data');
        setTimeout(() => setError(''), 5000);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, student.FineAmount, student.RefundAmount, emiDetails]);

  const validateRollNumber = (rollNumber: string) => {
    if (rollNumber && existingStudents.some((s) => s.rollNumber === rollNumber)) {
      setRollNumberError('This roll number already exists. Please enter a different roll number.');
    } else {
      setRollNumberError('');
    }
  };

  const validateEmail = (email: string) => {
    if (email && existingStudents.some((s) => s.email.toLowerCase() === email.toLowerCase())) {
      setEmailError('This email already exists. Please enter a different email.');
    } else {
      setEmailError('');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;

    // Validate DOB (minimum 18 years old)
    if (name === 'DOB') {
      const dob = new Date(value);
      const today = new Date();
      const minDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());

      if (dob > minDate) {
        setDobError('Student must be at least 18 years old');
      }
      else{
        setDobError('')
      }
    }

    // Validate Admission Date (not in future) and set Session Year
    if (name === 'AdmissionDate') {
      const admissionDate = new Date(value);
      const today = new Date();

      if (admissionDate > today) {
        setError('Admission date cannot be in the future');
        return;
      }
      const admissionYear = admissionDate.getFullYear();
      const nextYear = admissionYear + 1;
      const sessionYear = `${admissionYear}-${nextYear}`;

      setStudent((prev) => ({
        ...prev,
        AdmissionDate: value,
        SessionYear: sessionYear,
      }));
      return;
    }

    // Check if CourseYear is changed to "2nd"
    if (name === 'CourseYear' && value === '2nd') {
      setIsLateralModalOpen(true);
    }

    // Update student state and validate roll number/email
    if (type === 'checkbox') {
      setStudent((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else if (type === 'number') {
      const numValue = value === '' ? 0 : parseFloat(value);
      setStudent((prev) => ({ ...prev, [name]: numValue }));
      if (name === 'RollNumber') {
        validateRollNumber(value);
      }
    } else if (name === 'PaymentMode') {
      setStudent((prev) => ({
        ...prev,
        [name]: value,
        NumberOfEMI: value === 'EMI' ? (prev.NumberOfEMI || null) : null,
      }));
      setEmiDetails([]);
    } else if (name === 'NumberOfEMI') {
      const newNumEMIs = value === '' ? null : parseInt(value);
      setStudent((prev) => ({ ...prev, [name]: newNumEMIs }));
      if (newNumEMIs && newNumEMIs > 0) {
        const newEmiDetails = Array.from({ length: newNumEMIs }, (_, i) => ({
          emiNumber: i + 1,
          amount: emiDetails[i]?.amount || 0,
          date: emiDetails[i]?.date || '',
        }));
        setEmiDetails(newEmiDetails);
      } else {
        setEmiDetails([]);
      }
    } else {
      setStudent((prev) => ({ ...prev, [name]: value }));
      if (name === 'RollNumber') {
        validateRollNumber(value);
      } else if (name === 'EmailId') {
        validateEmail(value);
      }
    }
  };

  const handleEmiChange = (index: number, field: 'amount' | 'date', value: string | number) => {
    setEmiDetails((prev) => {
      const newEmiDetails = [...prev];
      newEmiDetails[index] = {
        ...newEmiDetails[index],
        [field]: field === 'amount' ? (value === '' ? 0 : parseFloat(value as string)) : value as string,
      };
      return newEmiDetails;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof Documents) => {
    const file = e.target.files?.[0];
    if (file) {
      const preview = fieldName === 'StudentImage' ? URL.createObjectURL(file) : null;
      setDocuments((prev) => ({ ...prev, [fieldName]: { file, preview } }));
    }
  };

  const handleLateralModalConfirm = () => {
    setStudent((prev) => ({
      ...prev,
      isLateral: true,
      CourseYear: '2nd',
    }));
    setError('You are a lateral Student.');
    setIsLateralModalOpen(false);
  };

  const handleLateralModalCancel = () => {
    setStudent((prev) => ({
      ...prev,
      isLateral: false,
      CourseYear: '1st',
    }));
    setIsLateralModalOpen(false);
  };

  const validateStep = (currentStep: number): boolean => {
    if (rollNumberError || emailError) {
      setError('Please resolve the errors in Roll Number or Email before proceeding.');
      return false;
    }

    if (currentStep === 3 && student.PaymentMode === 'EMI' && student.NumberOfEMI && emiDetails.length > 0) {
      const adminAmount = student.FineAmount || 0;
      const feesAmount = student.RefundAmount || 0;
      const totalAmount = adminAmount + feesAmount;
      const totalEMIAmount = emiDetails.reduce((sum, emi) => sum + (emi.amount || 0), 0);

      if (totalAmount < totalEMIAmount) {
        setError('The sum of total EMI amounts cannot be greater than the sum of admin amount and fees amount.');
        return false;
      }
    }

    switch (currentStep) {
      case 1:
        const isStep1Valid =
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
          !!student.Category;
        if (!isStep1Valid) {
          setError('Please fill all required fields to proceed to the next step.');
        }
        return isStep1Valid;
      case 2:
        const isStep2Valid = !!student.CollegeId && !!student.AdmissionMode && !!student.CourseId && !!student.CourseYear && !!student.SessionYear;
        if (!isStep2Valid) {
          setError('Please fill all required fields to proceed to the next step.');
        }
        return isStep2Valid;
      case 3:
        const isStep3Valid =
          !!student.PaymentMode &&
          (student.PaymentMode !== 'EMI' ||
            (student.NumberOfEMI !== null && student.NumberOfEMI > 0 && emiDetails.every((emi) => emi.amount > 0 && emi.date)));
        if (!isStep3Valid) {
          setError('Please fill all required fields to proceed to the next step.');
        }
        return isStep3Valid;
      case 4:
        // const isStep4Valid = Object.values(documents).some((doc) => doc.file !== null);
        // if (!isStep4Valid) {
        //   setError('Please upload at least one document to proceed.');
        // }
        // return isStep4Valid;
      default:
        return true;
    }
  };

  const handleTabClick = (tabNumber: number) => {
    if (validateStep(step)) {
      setStep(tabNumber);
      setError('');
    } else {
      setError('Please fill all required fields to proceed to the next step.');
    }
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, 4));
      setError('');
    }
  };

  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
    setError('');
  };

  const handleSubmit = async () => {
    if (!window.confirm('Are you sure you want to submit this student data?')) return;

    if (rollNumberError || emailError) {
      setError('Please resolve the errors in Roll Number or Email before submitting.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    if (student.PaymentMode === 'EMI' && student.NumberOfEMI && emiDetails.length > 0) {
      const adminAmount = student.FineAmount || 0;
      const feesAmount = student.RefundAmount || 0;
      const totalAmount = adminAmount + feesAmount;
      const totalEMIAmount = emiDetails.reduce((sum, emi) => sum + (emi.amount || 0), 0);

      if (totalAmount < totalEMIAmount) {
        setError('The sum of admin amount and fees amount cannot be greater than the sum of total EMI amounts.');
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const formData = new FormData();

      Object.entries(student).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, value.toString());
        }
      });

      if (student.PaymentMode === 'EMI' && emiDetails.length > 0) {
        emiDetails.forEach((emi, index) => {
          formData.append(`emiDetails[${index}].emiNumber`, emi.emiNumber.toString());
          formData.append(`emiDetails[${index}].amount`, emi.amount.toString());
          formData.append(`emiDetails[${index}].date`, emi.date);
        });
      }

      Object.entries(documents).forEach(([fieldName, fileData]) => {
        if (fileData.file) {
          formData.append(fieldName, fileData.file);
        }
      });

      const response = await axiosInstance.post('/students', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        onSuccess();
        toast.success('Student Added successfully!', {
          position: 'top-right',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        onClose();
      } else {
        throw new Error(response.data.message || 'Failed to create student');
      }
    } catch (error: any) {
      console.error('Error creating student:', error);
      setError(error.response?.data?.message || error.message || 'An error occurred while submitting the form');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
   <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-80 backdrop-blur-sm z-50">
  <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl border border-gray-200 dark:border-gray-700">
    <div className="sticky top-0 z-10 flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-2 rounded-t-lg shadow-md">
      <h2 className="text-base font-bold flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        Add New Student
      </h2>
      <button
        onClick={onClose}
        className="text-white bg-red-500 hover:bg-red-600 transition-colors p-1 rounded-full focus:ring-1 focus:ring-white"
      >
        <FaTimes />
      </button>
    </div>

    {error && (
      <div className="mx-2 mt-2 p-1 bg-red-100 text-xs text-red-700 rounded border-l-4 border-red-500 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        {error}
      </div>
    )}

    <div className="flex px-2 pt-2 mb-1 overflow-x-auto">
      {[1, 2, 3, 4].map((tab) => (
        <button
          key={tab}
          onClick={() => handleTabClick(tab)}
          className={`px-3 py-1 mb-1 text-sm font-medium rounded transition-all duration-200 focus:ring-1 focus:ring-opacity-50 mr-1 ${
            step === tab
              ? 'text-white bg-gradient-to-r from-blue-500 to-indigo-600 shadow-sm focus:ring-blue-400'
              : 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 focus:ring-gray-400'
          }`}
        >
          <span className="flex items-center">
            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 mr-1 text-xs font-bold border border-blue-300 dark:border-blue-700">
              {tab}
            </span>
            {['Personal', 'Academic', 'Payment', 'Documents'][tab - 1]}
          </span>
        </button>
      ))}
    </div>

    <div className="px-2 pb-2">
      <form className="space-y-2" onSubmit={(e) => e.preventDefault()}>
        {step === 1 && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 p-2 rounded-lg border border-blue-100 dark:border-gray-700">
            <h3 className="text-sm font-bold text-blue-700 dark:text-blue-400 mb-2 flex items-center border-b border-blue-200 dark:border-blue-800 pb-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  First Name <RequiredAsterisk />
                </label>
                <input
                  type="text"
                  name="FName"
                  value={student.FName}
                  onChange={handleChange}
                  className="w-full border border-gray-300 dark:border-gray-600 p-1.5 rounded text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400 dark:bg-gray-700 dark:text-white transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Last Name <RequiredAsterisk />
                </label>
                <input
                  type="text"
                  name="LName"
                  value={student.LName}
                  onChange={handleChange}
                  className="w-full border border-gray-300 dark:border-gray-600 p-1.5 rounded text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400 dark:bg-gray-700 dark:text-white transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Roll Number <RequiredAsterisk />
                </label>
                <input
                  type="text"
                  name="RollNumber"
                  value={student.RollNumber}
                  onChange={handleChange}
                  onBlur={() => validateRollNumber(student.RollNumber)}
                  className={`w-full border p-1.5 rounded text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400 dark:bg-gray-700 dark:text-white transition-colors ${
                    rollNumberError ? 'bg-red-50 border-red-500 focus:ring-red-400 dark:bg-red-900/30' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  required
                />
                {rollNumberError && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {rollNumberError}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  DOB <RequiredAsterisk />
                </label>
                <input
                  type="date"
                  name="DOB"
                  value={student.DOB}
                  onChange={handleChange}
                  className="w-full border border-gray-300 dark:border-gray-600 p-1.5 rounded text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400 dark:bg-gray-700 dark:text-white transition-colors"
                  required
                />
                {dobError && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {dobError}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Gender <RequiredAsterisk />
                </label>
                <select
                  name="Gender"
                  value={student.Gender}
                  onChange={handleChange}
                  className="w-full border border-gray-300 dark:border-gray-600 p-1.5 rounded text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400 dark:bg-gray-700 dark:text-white transition-colors"
                  required
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Category <RequiredAsterisk />
                </label>
                <select
                  name="Category"
                  value={student.Category}
                  onChange={handleChange}
                  className="w-full border border-gray-300 dark:border-gray-600 p-1.5 rounded text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400 dark:bg-gray-700 dark:text-white transition-colors"
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
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Father's Name <RequiredAsterisk />
                </label>
                <input
                  type="text"
                  name="FatherName"
                  value={student.FatherName}
                  onChange={handleChange}
                  className="w-full border border-gray-300 dark:border-gray-600 p-1.5 rounded text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400 dark:bg-gray-700 dark:text-white transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Mother's Name <RequiredAsterisk />
                </label>
                <input
                  type="text"
                  name="MotherName"
                  value={student.MotherName}
                  onChange={handleChange}
                  className="w-full border border-gray-300 dark:border-gray-600 p-1.5 rounded text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400 dark:bg-gray-700 dark:text-white transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Mobile Number <RequiredAsterisk />
                </label>
                <input
                  type="tel"
                  name="MobileNumber"
                  value={student.MobileNumber}
                  onChange={handleChange}
                  maxLength={10}
                  className="w-full border border-gray-300 dark:border-gray-600 p-1.5 rounded text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400 dark:bg-gray-700 dark:text-white transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Alternate Number
                </label>
                <input
                  type="tel"
                  name="AlternateNumber"
                  value={student.AlternateNumber}
                  onChange={handleChange}
                  maxLength={10}
                  className="w-full border border-gray-300 dark:border-gray-600 p-1.5 rounded text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400 dark:bg-gray-700 dark:text-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Email ID <RequiredAsterisk />
                </label>
                <input
                  type="email"
                  name="EmailId"
                  value={student.EmailId}
                  onChange={handleChange}
                  onBlur={() => validateEmail(student.EmailId)}
                  className={`w-full border p-1.5 rounded text-sm focus:ring-1 focus:border-blue-400 dark:bg-gray-700 dark:text-white transition-colors ${
                    emailError ? 'bg-red-50 border-red-500 focus:ring-red-400 dark:bg-red-900/30' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-400'
                  }`}
                  required
                />
                {emailError && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {emailError}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Father's Mobile <RequiredAsterisk />
                </label>
                <input
                  type="tel"
                  name="FatherMobileNumber"
                  value={student.FatherMobileNumber}
                  maxLength={10}
                  onChange={handleChange}
                  className="w-full border border-gray-300 dark:border-gray-600 p-1.5 rounded text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400 dark:bg-gray-700 dark:text-white transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  City <RequiredAsterisk />
                </label>
                <input
                  type="text"
                  name="City"
                  value={student.City}
                  onChange={handleChange}
                  className="w-full border border-gray-300 dark:border-gray-600 p-1.5 rounded text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400 dark:bg-gray-700 dark:text-white transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  State <RequiredAsterisk />
                </label>
                <input
                  type="text"
                  name="State"
                  value={student.State}
                  onChange={handleChange}
                  className="w-full border border-gray-300 dark:border-gray-600 p-1.5 rounded text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400 dark:bg-gray-700 dark:text-white transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Pincode <RequiredAsterisk />
                </label>
                <input
                  type="text"
                  name="Pincode"
                  value={student.Pincode}
                  maxLength={6}
                  onChange={handleChange}
                  className="w-full border border-gray-300 dark:border-gray-600 p-1.5 rounded text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400 dark:bg-gray-700 dark:text-white transition-colors"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Address <RequiredAsterisk />
                </label>
                <textarea
                  name="Address"
                  value={student.Address}
                  onChange={handleChange}
                  className="w-full border border-gray-300 dark:border-gray-600 p-1.5 rounded text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400 dark:bg-gray-700 dark:text-white transition-colors"
                  required
                  rows={2}
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 p-2 rounded-lg border border-purple-100 dark:border-purple-900">
            <h3 className="text-sm font-bold text-purple-700 dark:text-purple-400 mb-2 flex items-center border-b border-purple-200 dark:border-purple-800 pb-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M12 14l9-5-9-5-9 5 9 5z" />
                <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
              </svg>
              Academic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  College <RequiredAsterisk />
                </label>
                <select
                  name="CollegeId"
                  value={student.CollegeId}
                  onChange={handleChange}
                  className="w-full border border-gray-300 dark:border-gray-600 p-1.5 rounded text-sm focus:ring-1 focus:ring-purple-400 focus:border-purple-400 dark:bg-gray-700 dark:text-white transition-colors"
                  required
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
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Course <RequiredAsterisk />
                </label>
                <select
                  name="CourseId"
                  value={student.CourseId}
                  onChange={handleChange}
                  className="w-full border border-gray-300 dark:border-gray-600 p-1.5 rounded text-sm focus:ring-1 focus:ring-purple-400 focus:border-purple-400 dark:bg-gray-700 dark:text-white transition-colors"
                  required
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
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Admission Mode <RequiredAsterisk />
                </label>
                <select
                  name="AdmissionMode"
                  value={student.AdmissionMode}
                  onChange={handleChange}
                  className="w-full border border-gray-300 dark:border-gray-600 p-1.5 rounded text-sm focus:ring-1 focus:ring-purple-400 focus:border-purple-400 dark:bg-gray-700 dark:text-white transition-colors"
                  required
                >
                  <option value="">Select</option>
                  <option value="direct">Direct</option>
                  <option value="entrance">Entrance</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Admission Date
                </label>
                <input
                  type="date"
                  name="AdmissionDate"
                  value={student.AdmissionDate}
                  onChange={handleChange}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full border border-gray-300 dark:border-gray-600 p-1.5 rounded text-sm focus:ring-1 focus:ring-purple-400 focus:border-purple-400 dark:bg-gray-700 dark:text-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Course Year <RequiredAsterisk />
                </label>
                <select
                  name="CourseYear"
                  value={student.CourseYear}
                  onChange={handleChange}
                  className="w-full border border-gray-300 dark:border-gray-600 p-1.5 rounded text-sm focus:ring-1 focus:ring-purple-400 focus:border-purple-400 dark:bg-gray-700 dark:text-white transition-colors"
                  required
                >
                  <option value="1st">1st</option>
                  <option value="2nd">2nd</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Session Year <RequiredAsterisk />
                </label>
                <input
                  type="text"
                  name="SessionYear"
                  value={student.SessionYear}
                  readOnly
                  className="w-full border border-gray-300 dark:border-gray-600 p-1.5 rounded text-sm bg-gray-100 dark:bg-gray-800 focus:ring-1 focus:ring-purple-400 focus:border-purple-400 dark:text-gray-400 transition-colors"
                  required
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-gradient-to-br from-pink-50 to-red-50 dark:from-gray-800 dark:to-gray-900 p-2 rounded-lg border border-pink-100 dark:border-pink-900">
            <h3 className="text-sm font-bold text-pink-700 dark:text-pink-400 mb-2 flex items-center border-b border-pink-200 dark:border-pink-800 pb-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Payment Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Admin Amount <RequiredAsterisk />
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                    <span className="text-gray-500 dark:text-gray-400 text-xs">₹</span>
                  </div>
                  <input
                    type="number"
                    name="FineAmount"
                    value={student.FineAmount}
                    onChange={handleChange}
                    className="w-full border border-gray-300 dark:border-gray-600 p-1.5 pl-6 rounded text-sm focus:ring-1 focus:ring-pink-400 focus:border-pink-400 dark:bg-gray-700 dark:text-white transition-colors"
                    min="02"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Ledger Number
                </label>
                <input
                  type="text"
                  name="LedgerNumber"
                  value={student.LedgerNumber}
                  onChange={handleChange}
                  className="w-full border border-gray-300 dark:border-gray-600 p-1.5 rounded text-sm focus:ring-1 focus:ring-pink-400 focus:border-pink-400 dark:bg-gray-700 dark:text-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Fees Amount <RequiredAsterisk />
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                    <span className="text-gray-500 dark:text-gray-400 text-xs">₹</span>
                  </div>
                  <input
                    type="number"
                    name="RefundAmount"
                    value={student.RefundAmount}
                    onChange={handleChange}
                    className="w-full border border-gray-300 dark:border-gray-600 p-1.5 pl-6 rounded text-sm focus:ring-1 focus:ring-pink-400 focus:border-pink-400 dark:bg-gray-700 dark:text-white transition-colors"
                    min="0"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center">
                <label className="mr-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Payment Mode <RequiredAsterisk />
                </label>
                <div className="flex space-x-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="PaymentMode"
                      value="One-Time"
                      checked={student.PaymentMode === 'One-Time'}
                      onChange={handleChange}
                      className="h-3 w-3 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                    />
                    <span className="ml-1 text-xs text-gray-700 dark:text-gray-300">One-Time</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="PaymentMode"
                      value="EMI"
                      checked={student.PaymentMode === 'EMI'}
                      onChange={handleChange}
                      className="h-3 w-3 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                    />
                    <span className="ml-1 text-xs text-gray-700 dark:text-gray-300">EMI</span>
                  </label>
                </div>
              </div>
              {student.PaymentMode === 'EMI' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                    No of EMIs <RequiredAsterisk />
                  </label>
                  <select
                    name="NumberOfEMI"
                    value={student.NumberOfEMI || ''}
                    onChange={handleChange}
                    className="w-full border border-gray-300 dark:border-gray-600 p-1.5 rounded text-sm focus:ring-1 focus:ring-pink-400 focus:border-pink-400 dark:bg-gray-700 dark:text-white transition-colors"
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
                <div className="md:col-span-2 mt-1">
                  <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-2 py-1 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            EMI
                          </th>
                          <th className="px-2 py-1 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Amount <RequiredAsterisk />
                          </th>
                          <th className="px-2 py-1 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Date <RequiredAsterisk />
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {emiDetails.map((emi, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-700/50' : ''}>
                            <td className="px-2 py-1 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex items-center justify-center h-5 w-5 rounded-full bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-300 text-xs font-medium mr-1">
                                  {emi.emiNumber}
                                </div>
                                <span className="text-xs text-gray-900 dark:text-gray-100">EMI {emi.emiNumber}</span>
                              </div>
                            </td>
                            <td className="px-2 py-1">
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                                  <span className="text-gray-500 dark:text-gray-400 text-xs">₹</span>
                                </div>
                                <input
                                  type="number"
                                  value={emi.amount || 0}
                                  onChange={(e) =>
                                    handleEmiChange(index, 'amount', e.target.value)
                                  }
                                  className="w-full border border-gray-300 dark:border-gray-600 p-1 pl-6 rounded text-sm focus:ring-1 focus:ring-pink-400 focus:border-pink-400 dark:bg-gray-700 dark:text-white transition-colors"
                                  min="0"
                                  required
                                />
                              </div>
                            </td>
                            <td className="px-2 py-1">
                              <input
                                type="date"
                                value={emi.date}
                                onChange={(e) =>
                                  handleEmiChange(index, 'date', e.target.value)
                                }
                                className="w-full border border-gray-300 dark:border-gray-600 p-1 rounded text-sm focus:ring-1 focus:ring-pink-400 focus:border-pink-400 dark:bg-gray-700 dark:text-white transition-colors"
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
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-gray-800 dark:to-gray-900 p-2 rounded-lg border border-green-100 dark:border-green-900">
            <h3 className="text-sm font-bold text-green-700 dark:text-green-400 mb-2 flex items-center border-b border-green-200 dark:border-green-800 pb-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Document Uploads
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Student Photo
                </label>
                <div className="flex items-center">
                  <div className="flex-grow">
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange(e, 'StudentImage')}
                      className="w-full text-xs text-gray-500 dark:text-gray-400
                        file:mr-2 file:py-1 file:px-2
                        file:rounded-full file:border-0
                        file:text-xs file:font-medium
                        file:bg-blue-50 file:text-blue-700
                        dark:file:bg-blue-900 dark:file:text-blue-200
                        hover:file:bg-blue-100 dark:hover:file:bg-blue-800
                        focus:outline-none"
                    />
                  </div>
                  {documents.StudentImage.preview && (
                    <div className="ml-1 h-8 w-8 flex-shrink-0">
                      <img
                        src={documents.StudentImage.preview}
                        alt="Preview"
                        className="h-8 w-8 rounded-full object-cover ring-1 ring-blue-500"
                      />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  10th Marksheet
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, 'TenthMarks')}
                  className="w-full text-xs text-gray-500 dark:text-gray-400
                    file:mr-2 file:py-1 file:px-2
                    file:rounded-full file:border-0
                    file:text-xs file:font-medium
                    file:bg-green-50 file:text-green-700
                    dark:file:bg-green-900 dark:file:text-green-200
                    hover:file:bg-green-100 dark:hover:file:bg-green-800
                    focus:outline-none"
                />
                {documents.TenthMarks.file && (
                  <span className="inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    <svg className="mr-0.5 h-2 w-2" fill="currentColor" viewBox="0 0 8 8">
                      <circle cx="4" cy="4" r="3" />
                    </svg>
                    File selected
                  </span>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  12th Marksheet
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, 'TwelfthMarks')}
                  className="w-full text-xs text-gray-500 dark:text-gray-400
                    file:mr-2 file:py-1 file:px-2
                    file:rounded-full file:border-0
                    file:text-xs file:font-medium
                    file:bg-purple-50 file:text-purple-700
                    dark:file:bg-purple-900 dark:file:text-purple-200
                    hover:file:bg-purple-100 dark:hover:file:bg-purple-800
                    focus:outline-none"
                />
                {documents.TwelfthMarks.file && (
                  <span className="inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                    <svg className="mr-0.5 h-2 w-2" fill="currentColor" viewBox="0 0 8 8">
                      <circle cx="4" cy="4" r="3" />
                    </svg>
                    File selected
                  </span>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Caste Certificate
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, 'CasteCertificate')}
                  className="w-full text-xs text-gray-500 dark:text-gray-400
                    file:mr-2 file:py-1 file:px-2
                    file:rounded-full file:border-0
                    file:text-xs file:font-medium
                    file:bg-yellow-50 file:text-yellow-700
                    dark:file:bg-yellow-900 dark:file:text-yellow-200
                    hover:file:bg-yellow-100 dark:hover:file:bg-yellow-800
                    focus:outline-none"
                />
                {documents.CasteCertificate.file && (
                  <span className="inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                    <svg className="mr-0.5 h-2 w-2" fill="currentColor" viewBox="0 0 8 8">
                      <circle cx="4" cy="4" r="3" />
                    </svg>
                    File selected
                  </span>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Income Certificate
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, 'Income')}
                  className="w-full text-xs text-gray-500 dark:text-gray-400
                    file:mr-2 file:py-1 file:px-2
                    file:rounded-full file:border-0
                    file:text-xs file:font-medium
                    file:bg-red-50 file:text-red-700
                    dark:file:bg-red-900 dark:file:text-red-200
                    hover:file:bg-red-100 dark:hover:file:bg-red-800
                    focus:outline-none"
                />
                {documents.Income.file && (
                  <span className="inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                    <svg className="mr-0.5 h-2 w-2" fill="currentColor" viewBox="0 0 8 8">
                      <circle cx="4" cy="4" r="3" />
                    </svg>
                    File selected
                  </span>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Residential Proof
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, 'Residential')}
                  className="w-full text-xs text-gray-500 dark:text-gray-400
                    file:mr-2 file:py-1 file:px-2
                    file:rounded-full file:border-0
                    file:text-xs file:font-medium
                    file:bg-indigo-50 file:text-indigo-700
                    dark:file:bg-indigo-900 dark:file:text-indigo-200
                    hover:file:bg-indigo-100 dark:hover:file:bg-indigo-800
                    focus:outline-none"
                />
                {documents.Residential.file && (
                  <span className="inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                    <svg className="mr-0.5 h-2 w-2" fill="currentColor" viewBox="0 0 8 8">
                      <circle cx="4" cy="4" r="3" />
                    </svg>
                    File selected
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-2">
          {step > 1 && (
            <button
              type="button"
              onClick={prevStep}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>
          )}
          <div className="flex space-x-2">
            {step < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-md flex items-center"
              >
                Save & Next
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-medium rounded-lg hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all shadow-md flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Preview & Submit
              </button>
            )}
          </div>
        </div>
      </form>
    </div>

    {isPreviewOpen && (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm z-[1000]">
        <div className="bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-6 rounded-2xl max-w-3xl w-full max-h-[95vh] overflow-y-auto shadow-2xl border border-blue-200 dark:border-blue-900">
          <h2 className="text-xl font-bold mb-4 text-center text-indigo-700 dark:text-indigo-400 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Student Details Preview
          </h2>

          <div className="flex justify-center mb-6">
            {documents.StudentImage.preview ? (
              <div className="h-28 w-28 rounded-full overflow-hidden border-4 border-indigo-300 dark:border-indigo-700 shadow-lg">
                <img
                  src={documents.StudentImage.preview}
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
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{student.FName} {student.LName}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Roll Number</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{student.RollNumber}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Date of Birth</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{student.DOB}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Gender</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{student.Gender}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Mobile</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{student.MobileNumber}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Email</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{student.EmailId}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Father's Name</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{student.FatherName}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Mother's Name</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{student.MotherName}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Category</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{student.Category}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Address</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{student.Address}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Location</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{student.City}, {student.State} - {student.Pincode}</span>
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
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {colleges.find((c) => c.id === parseInt(student.CollegeId))?.collegeName || 'N/A'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Course</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {courses.find((c) => c.id === parseInt(student.CourseId))?.courseName || 'N/A'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Course Year</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{student.CourseYear}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Admission Mode</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{student.AdmissionMode}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Admission Date</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{student.AdmissionDate || 'Not specified'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Session Year</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{student.SessionYear}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Lateral Entry</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{student.isLateral ? 'Yes' : 'No'}</span>
                </div>
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
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      student.PaymentMode === 'EMI' 
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' 
                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    }`}>
                      {student.PaymentMode}
                    </span>
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Admin Amount</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">₹ {student.FineAmount}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Fees Amount</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">₹ {student.RefundAmount}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Ledger Number</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{student.LedgerNumber || 'Not specified'}</span>
                </div>
                {student.PaymentMode === 'EMI' && student.NumberOfEMI && (
                  <>
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Number of EMIs</span>
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{student.NumberOfEMI}</span>
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
                              <div className="text-sm font-medium text-gray-800 dark:text-gray-200">₹ {emi.amount}</div>
                              <span className="text-xs text-gray-500 dark:text-gray-400">Date</span>
                              <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{emi.date}</div>
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
                    <span className="text-sm text-gray-700 dark:text-gray-300">{
                      key === 'StudentImage' ? 'Student Photo' :
                      key === 'TenthMarks' ? '10th Marksheet' :
                      key === 'TwelfthMarks' ? '12th Marksheet' :
                      key === 'CasteCertificate' ? 'Caste Certificate' :
                      key === 'Income' ? 'Income Certificate' :
                      key === 'Residential' ? 'Residential Proof' : key
                    }</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      value.file 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                      {value.file ? 'Uploaded' : 'Not Uploaded'}
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
              Back to Form
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-medium rounded-lg hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-md flex items-center"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Submitting...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Submit Application
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )}

    {isLateralModalOpen && (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[1000] backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl max-w-sm w-full border-t-4 border-blue-500 dark:border-blue-600 animate-fadeIn">
          <h3 className="text-lg font-bold text-blue-700 dark:text-blue-400 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Lateral Entry Confirmation
          </h3>
          <p className="mt-3 text-base font-medium text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg border-l-2 border-blue-300 dark:border-blue-700">
            You are entering 2nd year. Is this student a lateral entry?
          </p>
          <div className="mt-5 flex justify-end space-x-3">
            <button
              onClick={handleLateralModalCancel}
              className="px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-sm font-medium border border-red-300 dark:border-red-700 hover:border-red-400 dark:hover:border-red-600 transition-colors"
            >
              No
            </button>
            <button
              onClick={handleLateralModalConfirm}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 text-sm font-medium shadow-md transition-all"
            >
              Yes
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
</div>
  );
};

export default AddStudentModal;