import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import axiosInstance from '../../config';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Interfaces
interface StudentFormData {
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

interface ExistingDocument {
  DocumentId: number;
  DocumentType: string;
  FileName: string;
  Url: string;
  PublicId: string;
}

interface AcademicHistory {
  id: string;
  courseYear: string;
  sessionYear: string;
  adminAmount: number;
  paymentMode: string;
  numberOfEMI?: number;
  feesAmount: number;
  ledgerNumber?: string;
  createdOn: string | Date;
  createdBy?: string;
  modifiedOn?: string | Date;
  modifiedBy?: string;
  emiDetails: Array<{ emiNumber: number; amount: number; dueDate: string }>;
}

interface EditStudentModalProps {
  studentId: number;
  onClose: () => void;
  onSuccess: () => void;
  modifiedBy: string;
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
  const [loadingAcademic, setLoadingAcademic] = useState(false);

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

  // Fetch initial student data, colleges, courses, documents, and academic details
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentResponse, collegeResponse, courseResponse, docsResponse, academicResponse] = await Promise.all([
          axiosInstance.get(`/students/${studentId}`),
          axiosInstance.get('/colleges'),
          axiosInstance.get('/courses'),
          axiosInstance.get(`/students/${studentId}/documents`),
          axiosInstance.get(`/students/${studentId}/academic-details`),
        ]);

        const studentData = studentResponse.data;
        setStudent({
          ...studentData,
          DOB: studentData.DOB ? new Date(studentData.DOB).toISOString().split('T')[0] : '',
          AdmissionDate: studentData.AdmissionDate ? new Date(studentData.AdmissionDate).toISOString().split('T')[0] : '',
          DiscontinueOn: studentData.DiscontinueOn ? new Date(studentData.DiscontinueOn).toISOString().split('T')[0] : '',
          ModifiedBy: modifiedBy,
          NumberOfEMI: studentData.NumberOfEMI || null,
          emiDetails: studentData.emiDetails || [],
          PaymentMode: studentData.PaymentMode || 'One-Time',
          FineAmount: studentData.FineAmount || 0,
          RefundAmount: studentData.RefundAmount || 0,
          LedgerNumber: studentData.LedgerNumber || '',
        });

        setColleges(collegeResponse.data);
        setCourses(courseResponse.data);

        const docs: Record<string, ExistingDocument> = {};
        docsResponse.data.forEach((doc: ExistingDocument) => {
          docs[doc.DocumentType] = doc;
        });
        setExistingDocuments(docs);

        setAcademicData(academicResponse.data.data);
      } catch (error: any) {
        console.error('Error fetching data:', error);
        setError(error.response?.data?.message || 'Failed to load student data, colleges, courses, or academic details');
        setTimeout(() => setError(''), 5000);
      }
    };

    fetchData();
  }, [studentId, modifiedBy]);

  // Fetch academic details when CourseYear changes
  useEffect(() => {
    if (student.CourseYear && loadingAcademic) {
      const fetchAcademicDetails = async () => {
        try {
          const response = await axiosInstance.get(`/students/${studentId}/academic-details`);
          const academicDetail = response.data.data.find(
            (detail: AcademicHistory) => detail.courseYear === student.CourseYear
          );

          if (academicDetail) {
            setStudent((prev) => ({
              ...prev,
              SessionYear: academicDetail.sessionYear,
              PaymentMode: academicDetail.paymentMode,
              FineAmount: academicDetail.adminAmount,
              RefundAmount: academicDetail.feesAmount,
              LedgerNumber: academicDetail.ledgerNumber || '',
              NumberOfEMI: academicDetail.numberOfEMI || null,
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
            // Reset payment-related fields if no data for selected course year
            setStudent((prev) => ({
              ...prev,
              PaymentMode: 'One-Time',
              FineAmount: 0,
              RefundAmount: 0,
              LedgerNumber: '',
              NumberOfEMI: null,
              emiDetails: [],
            }));
            setEmiDetails([]);
          }
        } catch (error) {
          console.error('Error fetching academic details:', error);
          toast.error('Failed to load academic details');
        }
      };

      fetchAcademicDetails();
    }
  }, [student.CourseYear, studentId, loadingAcademic]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
      const currentYear = new Date().getFullYear();
      let baseStartYear = student.SessionYear ? parseInt(student.SessionYear.split('-')[0]) : currentYear;

      // Map CourseYear to numeric values
      const prevYearNum = student.CourseYear === '1st' ? 1 : student.CourseYear === '2nd' ? 2 : student.CourseYear === '3rd' ? 3 : student.CourseYear === '4th' ? 4 : 1;
      const newYearNum = value === '1st' ? 1 : value === '2nd' ? 2 : value === '3rd' ? 3 : value === '4th' ? 4 : 1;

      // Calculate the difference in years between the previous and new CourseYear
      const yearsToAdd = newYearNum - prevYearNum;

      // Adjust the base year based on the difference
      const newStartYear = baseStartYear + yearsToAdd;
      const newEndYear = newStartYear + 1;
      const newSessionYear = `${newStartYear}-${newEndYear}`;

      setStudent((prev) => ({ ...prev, CourseYear: value, SessionYear: newSessionYear }));

      // Show loader for 2 seconds and navigate to Step 3
      if (['1st', '2nd', '3rd', '4th'].includes(value)) {
        setLoadingAcademic(true);
        setStep(3); // Navigate to Step 3 immediately to show loader
        setTimeout(() => {
          setLoadingAcademic(false);
        }, 1500); // Ensure loader shows for exactly 2 seconds
      }
      return;
    }

    if (type === 'checkbox') {
      setStudent((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else if (type === 'number') {
      const numValue = value === '' ? 0 : parseFloat(value);
      setStudent((prev) => ({ ...prev, [name]: numValue }));
    } else if (name === 'PaymentMode') {
      setStudent((prev) => ({
        ...prev,
        [name]: value,
        NumberOfEMI: value === 'EMI' ? (prev.NumberOfEMI || 0) : null,
        emiDetails: value === 'EMI' ? prev.emiDetails : [],
      }));
      if (value !== 'EMI') setEmiDetails([]);
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
    setStep(tabNumber);
    setError('');
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, 4));
      setError('');
    } else {
      setError(`Please fill all required fields in Step ${step} before proceeding.`);
    }
  };

  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
    setError('');
  };

  const handleSubmit = async () => {
    if (!window.confirm('Are you sure you want to update this student data?')) return;

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
        toast.success('Student Updated successfully!', {
          position: 'top-right',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        onSuccess();
        onClose();
      } else {
        throw new Error(response.data.message || 'Failed to update student');
      }
    } catch (error: any) {
      console.error('Error updating student:', error);
      setError(error.response?.data?.message || error.message || 'An error occurred while updating the form');
    } finally {
      setIsSubmitting(false);
    }
  };

  const RequiredAsterisk = () => <span className="text-red-500">*</span>;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-50">
      <div className="bg-white p-3 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-lg">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-sm font-bold">
            Edit Student : <b>{student.stdCollId}</b>
          </h2>
          <button
            onClick={onClose}
            className="text-red-500 hover:text-red-700 text-lg p-1 rounded focus:ring-2 focus:ring-blue-300"
          >
            <FaTimes />
          </button>
        </div>

        {error && <div className="mb-2 p-1 bg-red-100 text-xs text-red-700 rounded">{error}</div>}

        <div className="flex border-b mb-2">
          {[1, 2, 3, 4].map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabClick(tab)}
              className={`px-2 py-1 text-xs font-medium ${
                step === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-black'
              }`}
            >
              {['Personal', 'Academic', 'Payment', 'Documents'][tab - 1]} Details
            </button>
          ))}
        </div>

        <form className="space-y-2" onSubmit={(e) => e.preventDefault()}>
          {step === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-black">
                  First Name <RequiredAsterisk />
                </label>
                <input
                  type="text"
                  name="FName"
                  value={student.FName}
                  onChange={handleChange}
                  className="w-full border p-1 rounded mt-1 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-black">
                  Last Name <RequiredAsterisk />
                </label>
                <input
                  type="text"
                  name="LName"
                  value={student.LName}
                  onChange={handleChange}
                  className="w-full border p-1 rounded mt-1 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-black">
                  Roll Number <RequiredAsterisk />
                </label>
                <input
                  type="text"
                  name="RollNumber"
                  value={student.RollNumber}
                  onChange={handleChange}
                  className="w-full border p-1 rounded mt-1 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-black">
                  DOB <RequiredAsterisk />
                </label>
                <input
                  type="date"
                  name="DOB"
                  value={student.DOB}
                  onChange={handleChange}
                  className="w-full border p-1 rounded mt-1 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-black">
                  Gender <RequiredAsterisk />
                </label>
                <select
                  name="Gender"
                  value={student.Gender}
                  onChange={handleChange}
                  className="w-full border p-1 rounded mt-1 text-xs"
                  required
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-black">
                  Category <RequiredAsterisk />
                </label>
                <select
                  name="Category"
                  value={student.Category}
                  onChange={handleChange}
                  className="w-full border p-1 rounded mt-1 text-xs"
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
                <label className="block text-xs font-medium text-black">
                  Father's Name <RequiredAsterisk />
                </label>
                <input
                  type="text"
                  name="FatherName"
                  value={student.FatherName}
                  onChange={handleChange}
                  className="w-full border p-1 rounded mt-1 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-black">
                  Mother's Name <RequiredAsterisk />
                </label>
                <input
                  type="text"
                  name="MotherName"
                  value={student.MotherName}
                  onChange={handleChange}
                  className="w-full border p-1 rounded mt-1 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-black">
                  Mobile Number <RequiredAsterisk />
                </label>
                <input
                  type="tel"
                  name="MobileNumber"
                  maxLength={10}
                  value={student.MobileNumber}
                  onChange={handleChange}
                  className="w-full border p-1 rounded mt-1 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-black">Alternate Number</label>
                <input
                  type="tel"
                  name="AlternateNumber"
                  maxLength={10}
                  value={student.AlternateNumber}
                  onChange={handleChange}
                  className="w-full border p-1 rounded mt-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-black">
                  Email ID <RequiredAsterisk />
                </label>
                <input
                  type="email"
                  name="EmailId"
                  value={student.EmailId}
                  onChange={handleChange}
                  className="w-full border p-1 rounded mt-1 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-black">
                  Father's Mobile <RequiredAsterisk />
                </label>
                <input
                  type="tel"
                  name="FatherMobileNumber"
                  value={student.FatherMobileNumber}
                  onChange={handleChange}
                  className="w-full border p-1 rounded mt-1 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-black">
                  City <RequiredAsterisk />
                </label>
                <input
                  type="text"
                  name="City"
                  value={student.City}
                  onChange={handleChange}
                  className="w-full border p-1 rounded mt-1 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-black">
                  State <RequiredAsterisk />
                </label>
                <input
                  type="text"
                  name="State"
                  value={student.State}
                  onChange={handleChange}
                  className="w-full border p-1 rounded mt-1 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-black">
                  Pincode <RequiredAsterisk />
                </label>
                <input
                  type="text"
                  name="Pincode"
                  maxLength={6}
                  value={student.Pincode}
                  onChange={handleChange}
                  className="w-full border p-1 rounded mt-1 text-xs"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-black">
                  Address <RequiredAsterisk />
                </label>
                <textarea
                  name="Address"
                  value={student.Address}
                  onChange={handleChange}
                  className="w-full border p-1 rounded mt-1 text-xs"
                  required
                  rows={2}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* College */}
                <div>
                  <label className="block text-xs font-medium text-black">
                    College <RequiredAsterisk />
                  </label>
                  <select
                    name="CollegeId"
                    value={student.CollegeId}
                    onChange={handleChange}
                    className="w-full border p-1 rounded mt-1 text-xs disabled:cursor-not-allowed"
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

                {/* Admission Mode */}
                <div>
                  <label className="block text-xs font-medium text-black">
                    Admission Mode <RequiredAsterisk />
                  </label>
                  <select
                    name="AdmissionMode"
                    value={student.AdmissionMode}
                    onChange={handleChange}
                    className="w-full border p-1 rounded mt-1 text-xs disabled:cursor-not-allowed"
                    required
                    disabled
                  >
                    <option value="">Select</option>
                    <option value="direct">Direct</option>
                    <option value="entrance">Entrance</option>
                  </select>
                </div>

                {/* Course */}
                <div>
                  <label className="block text-xs font-medium text-black">
                    Course <RequiredAsterisk />
                  </label>
                  <select
                    name="CourseId"
                    value={student.CourseId}
                    onChange={handleChange}
                    className="w-full border p-1 rounded mt-1 text-xs disabled:cursor-not-allowed"
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

                {/* Course Year */}
                <div>
                  <label className="block text-xs font-medium text-black">
                    Course Year <RequiredAsterisk />
                  </label>
                  <select
                    name="CourseYear"
                    value={student.CourseYear}
                    onChange={handleChange}
                    className="w-full border p-1 rounded mt-1 text-xs"
                    required
                  >
                    <option value="">Select</option>
                    <option value="1st">1st</option>
                    <option value="2nd">2nd</option>
                    <option value="3rd">3rd</option>
                    <option value="4th">4th</option>
                  </select>
                </div>

                {/* Admission Date */}
                <div>
                  <label className="block text-xs font-medium text-black">Admission Date</label>
                  <input
                    type="date"
                    name="AdmissionDate"
                    value={student.AdmissionDate}
                    onChange={handleChange}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full border p-1 rounded mt-1 text-xs"
                  />
                </div>

                {/* Session Year */}
                <div>
                  <label className="block text-xs font-medium text-black">
                    Session Year <RequiredAsterisk />
                  </label>
                  <input
                    type="text"
                    name="SessionYear"
                    value={student.SessionYear}
                    readOnly
                    required
                    disabled
                    className="w-full border p-1 rounded mt-1 text-xs bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Is Discontinue */}
                <div className="col-span-2">
                  <label className="flex items-center text-xs font-medium text-black">
                    <input
                      type="checkbox"
                      name="IsDiscontinue"
                      checked={student.IsDiscontinue}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    Is Discontinued?
                  </label>
                </div>

                {/* If Discontinued */}
                {student.IsDiscontinue && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-black">Discontinue Date</label>
                      <input
                        type="date"
                        name="DiscontinueOn"
                        value={student.DiscontinueOn}
                        onChange={handleChange}
                        className="w-full border p-1 rounded mt-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-black">Discontinued By</label>
                      <input
                        type="text"
                        name="DiscontinueBy"
                        value={student.DiscontinueBy}
                        onChange={handleChange}
                        className="w-full border p-1 rounded mt-1 text-xs"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Academic History Table */}
              <div className="mt-3">
                <h2 className="text-xs font-semibold text-gray-800 mb-1">Academic History</h2>
                <div className="overflow-x-auto rounded border border-gray-200 shadow-sm">
                  <table className="min-w-full divide-y divide-gray-200 text-[10px]">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-1 py-1 text-left font-medium text-gray-500 uppercase">SAID</th>
                        <th className="px-1 py-1 text-left font-medium text-gray-500 uppercase">Course Year</th>
                        <th className="px-1 py-1 text-left font-medium text-gray-500 uppercase">Session</th>
                        <th className="px-1 py-1 text-left font-medium text-gray-500 uppercase">Admin Amount</th>
                        <th className="px-1 py-1 text-left font-medium text-gray-500 uppercase">Payment mode</th>
                        <th className="px-1 py-1 text-left font-medium text-gray-500 uppercase">Fees amount</th>
                        {/* <th className="px-1 py-1 text-left font-medium text-gray-500 uppercase">Emi</th> */}
                        <th className="px-1 py-1 text-left font-medium text-gray-500 uppercase">Created On</th>
                        <th className="px-1 py-1 text-left font-medium text-gray-500 uppercase">Created By</th>
                        <th className="px-1 py-1 text-left font-medium text-gray-500 uppercase">Modified On</th>
                        <th className="px-1 py-1 text-left font-medium text-gray-500 uppercase">Modified By</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {academicData.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-1 py-0.5 text-gray-900">{item.id}</td>
                          <td className="px-1 py-0.5 text-gray-900">{item.courseYear}</td>
                          <td className="px-1 py-0.5 text-gray-500">{item.sessionYear}</td>
                          <td className="px-1 py-0.5 text-gray-500">₹{item.adminAmount.toLocaleString('en-IN')}</td>
                          <td className="px-1 py-0.5 text-gray-500">
                            <div className="flex items-center">
                              {item.paymentMode}
                              {item.numberOfEMI && (
                                <span className="ml-0.5 bg-blue-200 text-blue-800 text-[8px] px-1 py-0.5 rounded-full">
                                  {item.numberOfEMI} EMIs
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-1 py-0.5 text-gray-500">₹{item.feesAmount.toLocaleString('en-IN')}</td>
                          {/* <td className="px-1 py-0.5 text-gray-500">{item.numberOfEMI}</td> */}
                          <td className="px-1 py-0.5 text-gray-500">
                            {new Date(item.createdOn).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="px-1 py-0.5 text-gray-500">{item.createdBy || '-'}</td>
                          <td className="px-1 py-0.5 text-gray-500">
                            {item.modifiedOn
                              ? new Date(item.modifiedOn).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : '-'}
                          </td>
                          <td className="px-1 py-0.5 text-gray-500">{item.modifiedBy || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {academicData.length === 0 && (
                    <div className="text-center py-1 text-[10px] text-gray-500">No academic records found</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {loadingAcademic ? (
                <div className="col-span-2 flex justify-center items-center">
                  <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-black">Admin Amount</label>
                    <input
                      type="number"
                      name="FineAmount"
                      value={student.FineAmount}
                      onChange={handleChange}
                      className="w-full border p-1 rounded mt-1 text-xs"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-black">Ledger Number</label>
                    <input
                      type="text"
                      name="LedgerNumber"
                      value={student.LedgerNumber}
                      onChange={handleChange}
                      className="w-full border p-1 rounded mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-black">Fees Amount</label>
                    <input
                      type="number"
                      name="RefundAmount"
                      value={student.RefundAmount}
                      onChange={handleChange}
                      className="w-full border p-1 rounded mt-1 text-xs"
                      min="0"
                    />
                  </div>
                  <div className="flex items-center">
                    <label className="mr-2 block text-xs font-medium text-black">
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
                      <span className="ml-1 text-xs">One-Time</span>
                    </label>
                    <label className="flex items-center ml-2">
                      <input
                        type="radio"
                        name="PaymentMode"
                        value="EMI"
                        checked={student.PaymentMode === 'EMI'}
                        onChange={handleChange}
                        className="h-3 w-3 text-blue-600"
                      />
                      <span className="ml-1 text-xs">EMI</span>
                    </label>
                  </div>
                  {student.PaymentMode === 'EMI' && (
                    <div>
                      <label className="block text-xs font-medium text-black">
                        No of EMIs <RequiredAsterisk />
                      </label>
                      <select
                        name="NumberOfEMI"
                        value={student.NumberOfEMI || ''}
                        onChange={handleChange}
                        className="w-full border p-1 rounded mt-1 text-xs"
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
                    <div className="col-span-2 mt-2">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-1 py-0.5 text-left text-[10px] font-medium text-black">EMI</th>
                              <th className="px-1 py-0.5 text-left text-[10px] font-medium text-black">Amount</th>
                              <th className="px-1 py-0.5 text-left text-[10px] font-medium text-black">Date</th>
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
                                    className="w-full border p-0.5 rounded text-[10px] bg-gray-100"
                                  />
                                </td>
                                <td className="px-1 py-0.5">
                                  <input
                                    type="number"
                                    value={emi.amount || 0}
                                    onChange={(e) => handleEmiChange(index, 'amount', e.target.value)}
                                    className="w-full border p-0.5 rounded text-[10px]"
                                    min="0"
                                    required
                                  />
                                </td>
                                <td className="px-1 py-0.5">
                                  <input
                                    type="date"
                                    value={emi.dueDate}
                                    onChange={(e) => handleEmiChange(index, 'dueDate', e.target.value)}
                                    className="w-full border p-0.5 rounded text-[10px]"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-black">Student Photo</label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, 'StudentImage')}
                  className="w-full border p-1 rounded mt-1 text-xs"
                />
                {documents.StudentImage.preview ? (
                  <img src={documents.StudentImage.preview} alt="New Preview" className="h-12 w-12 object-cover rounded mt-1" />
                ) : existingDocuments.StudentImage ? (
                  <img src={existingDocuments.StudentImage.Url} alt="Current" className="h-12 w-12 object-cover rounded mt-1" />
                ) : null}
              </div>
              <div>
                <label className="block text-xs font-medium text-black">10th Marksheet</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, 'TenthMarks')}
                  className="w-full border p-1 rounded mt-1 text-xs"
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
                <label className="block text-xs font-medium text-black">12th Marksheet</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, 'TwelfthMarks')}
                  className="w-full border p-1 rounded mt-1 text-xs"
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
                <label className="block text-xs font-medium text-black">Caste Certificate</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, 'CasteCertificate')}
                  className="w-full border p-1 rounded mt-1 text-xs"
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
                <label className="block text-xs font-medium text-black">Income Certificate</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, 'Income')}
                  className="w-full border p-1 rounded mt-1 text-xs"
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
                <label className="block text-xs font-medium text-black">Residential Proof</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, 'Residential')}
                  className="w-full border p-1 rounded mt-1 text-xs"
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

          <div className="flex justify-between pt-2">
            {step > 1 && (
              <button
                onClick={prevStep}
                className="px-2 py-1 bg-gray-300 text-xs text-gray-800 rounded hover:bg-gray-400"
              >
                Previous
              </button>
            )}
            <div className="flex space-x-1">
              {step < 4 ? (
                <button
                  onClick={nextStep}
                  className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                >
                  Save & Next
                </button>
              ) : (
                <button
                  onClick={() => setIsPreviewOpen(true)}
                  className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                >
                  Preview & Update
                </button>
              )}
            </div>
          </div>
        </form>

        {isPreviewOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-50">
            <div className="bg-white p-3 rounded-lg max-w-xl w-full max-h-[85vh] overflow-y-auto shadow-lg">
              <h2 className="text-sm font-bold mb-2 text-center">Student Details Preview</h2>
              <div className="flex justify-center mb-4">
                {documents.StudentImage.preview ? (
                  <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-blue-200">
                    <img src={documents.StudentImage.preview} alt="Student" className="h-full w-full object-cover" />
                  </div>
                ) : existingDocuments.StudentImage ? (
                  <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-blue-200">
                    <img src={existingDocuments.StudentImage.Url} alt="Student" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                    No Image
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-xs">
                <div className="space-y-1">
                  <h3 className="font-bold text-blue-600 border-b pb-1">Personal Details</h3>
                  <div>
                    <span className="font-medium">Name:</span> {student.FName} {student.LName}
                  </div>
                  <div>
                    <span className="font-medium">Roll Number:</span> {student.RollNumber}
                  </div>
                  <div>
                    <span className="font-medium">DOB:</span> {student.DOB}
                  </div>
                  <div>
                    <span className="font-medium">Gender:</span> {student.Gender}
                  </div>
                  <div>
                    <span className="font-medium">Mobile:</span> {student.MobileNumber}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span> {student.EmailId}
                  </div>
                  <div>
                    <span className="font-medium">Father's Name:</span> {student.FatherName}
                  </div>
                  <div>
                    <span className="font-medium">Mother's Name:</span> {student.MotherName}
                  </div>
                  <div>
                    <span className="font-medium">Category:</span> {student.Category}
                  </div>
                  <div>
                    <span className="font-medium">Address:</span> {student.Address}
                  </div>
                  <div>
                    <span className="font-medium">City:</span> {student.City}
                  </div>
                  <div>
                    <span className="font-medium">State:</span> {student.State}
                  </div>
                  <div>
                    <span className="font-medium">Pincode:</span> {student.Pincode}
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-blue-600 border-b pb-1">Academic Details</h3>
                  <div>
                    <span className="font-medium">College:</span>{' '}
                    {colleges.find((c) => c.id === parseInt(student.CollegeId))?.collegeName || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Course:</span>{' '}
                    {courses.find((c) => c.id === parseInt(student.CourseId))?.courseName || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Course Year:</span> {student.CourseYear}
                  </div>
                  <div>
                    <span className="font-medium">Admission Mode:</span> {student.AdmissionMode}
                  </div>
                  <div>
                    <span className="font-medium">Admission Date:</span> {student.AdmissionDate}
                  </div>
                  <div>
                    <span className="font-medium">Session Year:</span> {student.SessionYear}
                  </div>
                  <div>
                    <span className="font-medium">Is Discontinued:</span> {student.IsDiscontinue ? 'Yes' : 'No'}
                  </div>
                  {student.IsDiscontinue && (
                    <>
                      <div>
                        <span className="font-medium">Discontinue Date:</span> {student.DiscontinueOn}
                      </div>
                      <div>
                        <span className="font-medium">Discontinued By:</span> {student.DiscontinueBy}
                      </div>
                    </>
                  )}
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-blue-600 border-b pb-1">Payment Details</h3>
                  <div>
                    <span className="font-medium">Payment Mode:</span> {student.PaymentMode}
                  </div>
                  <div>
                    <span className="font-medium">Admin Amount:</span> {student.FineAmount}
                  </div>
                  <div>
                    <span className="font-medium">Fees Amount:</span> {student.RefundAmount}
                  </div>
                  <div>
                    <span className="font-medium">Ledger Number:</span> {student.LedgerNumber}
                  </div>
                  {student.PaymentMode === 'EMI' && student.NumberOfEMI && (
                    <>
                      <div>
                        <span className="font-medium">No of EMIs:</span> {student.NumberOfEMI}
                      </div>
                      {emiDetails.map((emi, index) => (
                        <div key={index}>
                          <span className="font-medium">EMI {emi.emiNumber}:</span> Amount: {emi.amount}, Date:{' '}
                          {emi.dueDate}
                        </div>
                      ))}
                    </>
                  )}
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-blue-600 border-b pb-1">Document Details</h3>
                  <div>
                    <span className="font-medium">Student Photo:</span>{' '}
                    {documents.StudentImage.file
                      ? 'New Uploaded'
                      : existingDocuments.StudentImage
                      ? 'Existing'
                      : 'Not Uploaded'}
                  </div>
                  <div>
                    <span className="font-medium">10th Marksheet:</span>{' '}
                    {documents.TenthMarks.file
                      ? 'New Uploaded'
                      : existingDocuments.TenthMarks
                      ? 'Existing'
                      : 'Not Uploaded'}
                  </div>
                  <div>
                    <span className="font-medium">12th Marksheet:</span>{' '}
                    {documents.TwelfthMarks.file
                      ? 'New Uploaded'
                      : existingDocuments.TwelfthMarks
                      ? 'Existing'
                      : 'Not Uploaded'}
                  </div>
                  <div>
                    <span className="font-medium">Caste Certificate:</span>{' '}
                    {documents.CasteCertificate.file
                      ? 'New Uploaded'
                      : existingDocuments.CasteCertificate
                      ? 'Existing'
                      : 'Not Uploaded'}
                  </div>
                  <div>
                    <span className="font-medium">Income Certificate:</span>{' '}
                    {documents.Income.file ? 'New Uploaded' : existingDocuments.Income ? 'Existing' : 'Not Uploaded'}
                  </div>
                  <div>
                    <span className="font-medium">Residential Proof:</span>{' '}
                    {documents.Residential.file
                      ? 'New Uploaded'
                      : existingDocuments.Residential
                      ? 'Existing'
                      : 'Not Uploaded'}
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-1">
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="px-2 py-1 bg-gray-300 text-xs text-gray-800 rounded hover:bg-gray-400"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:bg-green-300"
                >
                  {isSubmitting ? 'Updating...' : 'Update'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditStudentModal;