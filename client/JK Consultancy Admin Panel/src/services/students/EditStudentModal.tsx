import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import axiosInstance from '../../config';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
  CourseName: string;
  CourseYear: string;
  IsSCStudent: boolean;
  LedgerNumber: string;
  CollegeId: string;
  AdmissionMode: string;
  AdmissionDate: string;
  IsDiscontinue: boolean;
  DiscontinueOn: string;
  DiscontinueBy: string;
  FineAmount: number;
  RefundAmount: number;
  FinePaidAmount: number;
  ModifiedBy: string;
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

interface DocumentInfo {
  DocumentId: number;
  DocumentType: string;
  FileName: string;
  Url: string;
  PublicId: string;
}

interface EditStudentModalProps {
  student: StudentFormData;
  onClose: () => void;
  onSuccess: () => void;
  modifiedBy: string;
}

const courseOptions = [
  { id: 'B.Pharma', name: 'B. Pharma' },
  { id: 'M.Pharma', name: 'M. Pharma' }
];

const admissionModes = [
  { value: 'direct', label: 'Direct Admission' },
  { value: 'entrance', label: 'Entrance Exam' }
];

const collegeOptions = [
  { id: 'jkiop', name: 'ABC College' },
  { id: '2', name: 'XYZ College' }
];

const EditStudentModal: React.FC<EditStudentModalProps> = ({ 
  student: initialStudent, 
  onClose, 
  onSuccess,
  modifiedBy
}) => {
  const [student, setStudent] = useState<StudentFormData>(initialStudent);
  const [documents, setDocuments] = useState<Documents>({
    StudentImage: { file: null, preview: null },
    CasteCertificate: { file: null, preview: null },
    TenthMarks: { file: null, preview: null },
    TwelfthMarks: { file: null, preview: null },
    Residential: { file: null, preview: null },
    Income: { file: null, preview: null }
  });
  const [existingDocuments, setExistingDocuments] = useState<Record<string, DocumentInfo>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  useEffect(() => {
    setStudent(initialStudent);
  }, [initialStudent]);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await axiosInstance.get(`/students/${initialStudent.StudentId}/documents`);
        const docs: Record<string, DocumentInfo> = {};
        response.data.documents.forEach((doc: DocumentInfo) => {
          docs[doc.DocumentType] = doc;
        });
        setExistingDocuments(docs);
      } catch (err) {
        console.error('Error fetching documents:', err);
      }
    };

    fetchDocuments();
  }, [initialStudent.StudentId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setStudent(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      const numValue = value === '' ? 0 : parseFloat(value);
      setStudent(prev => ({ ...prev, [name]: numValue }));
    } else {
      setStudent(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof Documents) => {
    const file = e.target.files?.[0];
    if (file) {
      const preview = fieldName === 'StudentImage' ? URL.createObjectURL(file) : null;
      setDocuments(prev => ({
        ...prev,
        [fieldName]: {
          file,
          preview
        }
      }));
    }
  };

  const handleTabClick = (tabNumber: number) => {
    setStep(tabNumber);
  };

  const nextStep = () => {
    if (step < 4) {  // Changed from 5 to 4
      setStep(prev => prev + 1);
    }
};

const prevStep = () => {
    if (step > 1) {
      setStep(prev => prev - 1);
    }
};

  const formatDateForInput = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      
      // Append student data
      Object.entries({
        ...student,
        ModifiedBy: modifiedBy
      }).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, value.toString());
        }
      });
      
      // Append files
      Object.entries(documents).forEach(([fieldName, fileData]) => {
        if (fileData.file) {
          formData.append(fieldName, fileData.file);
        }
      });

      const response = await axiosInstance.put(
        `/students/${student.StudentId}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        toast.success('Student updated successfully!');
        onSuccess();
        onClose();
      } else {
        throw new Error(response.data.message || 'Failed to update student');
      }
    } catch (err: any) {
      console.error('Error updating student:', err);
      setError(err.response?.data?.message || err.message);
      toast.error(err.response?.data?.message || 'Failed to update student');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-50">
      <div className="bg-white p-4 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Edit Student - <span className='text-2xl uppercase text-blue-700'> {student.FName} {student.LName}</span></h2>
          <button
            className="text-red-500 hover:text-red-700 text-xl focus:ring-2 p-1 rounded-md focus:ring-blue-300"
            onClick={onClose}
          >
            <FaTimes />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b mb-4">
          <button
            onClick={() => handleTabClick(1)}
            className={`px-4 py-2 font-medium ${step === 1 ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Personal Details
          </button>
          <button
            onClick={() => handleTabClick(2)}
            className={`px-4 py-2 font-medium ${step === 2 ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Contact Details
          </button>
          <button
            onClick={() => handleTabClick(3)}
            className={`px-4 py-2 font-medium ${step === 3 ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Academic & Address
          </button>
          <button
            onClick={() => handleTabClick(4)}
            className={`px-4 py-2 font-medium ${step === 4 ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Final Details
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Step 1 - Personal Details */}
          {step === 1 && (
            <div className="animate-fadeIn">
              <h3 className="text-base font-semibold text-center text-blue-500 mb-4">Personal Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name*</label>
                  <input
                    type="text"
                    name="FName"
                    value={student.FName}
                    onChange={handleChange}
                    className="w-full border p-2 rounded mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name*</label>
                  <input
                    type="text"
                    name="LName"
                    value={student.LName}
                    onChange={handleChange}
                    className="w-full border p-2 rounded mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Roll Number*</label>
                  <input
                    type="text"
                    name="RollNumber"
                    value={student.RollNumber}
                    onChange={handleChange}
                    className="w-full border p-2 rounded mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date of Birth*</label>
                  <input
                    type="date"
                    name="DOB"
                    value={formatDateForInput(student.DOB)}
                    onChange={handleChange}
                    className="w-full border p-2 rounded mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Gender*</label>
                  <select
                    name="Gender"
                    value={student.Gender}
                    onChange={handleChange}
                    className="w-full border p-2 rounded mt-1"
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Father's Name*</label>
                  <input
                    type="text"
                    name="FatherName"
                    value={student.FatherName}
                    onChange={handleChange}
                    className="w-full border p-2 rounded mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mother's Name*</label>
                  <input
                    type="text"
                    name="MotherName"
                    value={student.MotherName}
                    onChange={handleChange}
                    className="w-full border p-2 rounded mt-1"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2 - Contact Details */}
          {step === 2 && (
            <div className="animate-fadeIn">
              <h3 className="text-base font-semibold text-center text-blue-500 mb-4">Contact Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mobile Number*</label>
                  <input
                    type="tel"
                    name="MobileNumber"
                    value={student.MobileNumber}
                    onChange={handleChange}
                    className="w-full border p-2 rounded mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Alternate Number</label>
                  <input
                    type="tel"
                    name="AlternateNumber"
                    value={student.AlternateNumber}
                    onChange={handleChange}
                    className="w-full border p-2 rounded mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email ID*</label>
                  <input
                    type="email"
                    name="EmailId"
                    value={student.EmailId}
                    onChange={handleChange}
                    className="w-full border p-2 rounded mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Father's Mobile*</label>
                  <input
                    type="tel"
                    name="FatherMobileNumber"
                    value={student.FatherMobileNumber}
                    onChange={handleChange}
                    className="w-full border p-2 rounded mt-1"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3 - Academic & Address Details */}
          {step === 3 && (
            <div className="animate-fadeIn">
              <h3 className="text-base font-semibold text-center text-blue-500 mb-4">Academic & Address Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Course Name*</label>
                  <select
                    name="CourseName"
                    value={student.CourseName}
                    onChange={handleChange}
                    className="w-full border p-2 rounded mt-1"
                    required
                  >
                    <option value="">Select Course</option>
                    {courseOptions.map(option => (
                      <option key={option.id} value={option.id}>{option.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Course Year*</label>
                  <input
                    type="text"
                    name="CourseYear"
                    value={student.CourseYear}
                    onChange={handleChange}
                    className="w-full border p-2 rounded mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">10th Marksheet</label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange(e, 'TenthMarks')}
                    className="w-full border p-2 rounded mt-1"
                  />
                  {existingDocuments.TenthMarks && !documents.TenthMarks.file && (
                    <div className="mt-2 text-sm text-gray-600">
                      Current: <a href={existingDocuments.TenthMarks.Url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                        {existingDocuments.TenthMarks.FileName}
                      </a>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">12th Marksheet</label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange(e, 'TwelfthMarks')}
                    className="w-full border p-2 rounded mt-1"
                  />
                  {existingDocuments.TwelfthMarks && !documents.TwelfthMarks.file && (
                    <div className="mt-2 text-sm text-gray-600">
                      Current: <a href={existingDocuments.TwelfthMarks.Url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                        {existingDocuments.TwelfthMarks.FileName}
                      </a>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Caste Certificate</label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange(e, 'CasteCertificate')}
                    className="w-full border p-2 rounded mt-1"
                  />
                  {existingDocuments.CasteCertificate && !documents.CasteCertificate.file && (
                    <div className="mt-2 text-sm text-gray-600">
                      Current: <a href={existingDocuments.CasteCertificate.Url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                        {existingDocuments.CasteCertificate.FileName}
                      </a>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Income Certificate</label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange(e, 'Income')}
                    className="w-full border p-2 rounded mt-1"
                  />
                  {existingDocuments.Income && !documents.Income.file && (
                    <div className="mt-2 text-sm text-gray-600">
                      Current: <a href={existingDocuments.Income.Url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                        {existingDocuments.Income.FileName}
                      </a>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Residential Proof</label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange(e, 'Residential')}
                    className="w-full border p-2 rounded mt-1"
                  />
                  {existingDocuments.Residential && !documents.Residential.file && (
                    <div className="mt-2 text-sm text-gray-600">
                      Current: <a href={existingDocuments.Residential.Url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                        {existingDocuments.Residential.FileName}
                      </a>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address*</label>
                  <textarea
                    name="Address"
                    value={student.Address}
                    onChange={handleChange}
                    className="w-full border p-2 rounded mt-1"
                    required
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">City*</label>
                  <input
                    type="text"
                    name="City"
                    value={student.City}
                    onChange={handleChange}
                    className="w-full border p-2 rounded mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">State*</label>
                  <input
                    type="text"
                    name="State"
                    value={student.State}
                    onChange={handleChange}
                    className="w-full border p-2 rounded mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Pincode*</label>
                  <input
                    type="text"
                    name="Pincode"
                    value={student.Pincode}
                    onChange={handleChange}
                    className="w-full border p-2 rounded mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Admission Date</label>
                  <input
                    type="date"
                    name="AdmissionDate"
                    value={formatDateForInput(student.AdmissionDate)}
                    onChange={handleChange}
                    className="w-full border p-2 rounded mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4 - Final & Administrative Details */}
          {step === 4 && (
            <div className="animate-fadeIn">
              <h3 className="text-base font-semibold text-center text-blue-500 mb-4">Final & Administrative Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">College*</label>
                  <select
                    name="CollegeId"
                    value={student.CollegeId}
                    onChange={handleChange}
                    className="w-full border p-2 rounded mt-1"
                    required
                  >
                    <option value="">Select College</option>
                    {collegeOptions.map(option => (
                      <option key={option.id} value={option.id}>{option.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Admission Mode*</label>
                  <select
                    name="AdmissionMode"
                    value={student.AdmissionMode}
                    onChange={handleChange}
                    className="w-full border p-2 rounded mt-1"
                    required
                  >
                    <option value="">Select Admission Mode</option>
                    {admissionModes.map(mode => (
                      <option key={mode.value} value={mode.value}>{mode.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="IsSCStudent"
                    checked={student.IsSCStudent}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-700">Is SC/ST Student?</label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ledger Number</label>
                  <input
                    type="text"
                    name="LedgerNumber"
                    value={student.LedgerNumber}
                    onChange={handleChange}
                    className="w-full border p-2 rounded mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Student Photo</label>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange(e, 'StudentImage')}
                    className="w-full border p-2 rounded mt-1"
                  />
                  {documents.StudentImage.preview ? (
                    <div className="mt-2">
                      <img 
                        src={documents.StudentImage.preview} 
                        alt="New Student Preview" 
                        className="h-20 w-20 object-cover rounded"
                      />
                    </div>
                  ) : existingDocuments.StudentImage ? (
                    <div className="mt-2">
                      <img 
                        src={existingDocuments.StudentImage.Url} 
                        alt="Current Student" 
                        className="h-20 w-20 object-cover rounded"
                      />
                    </div>
                  ) : null}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fine Amount</label>
                  <input
                    type="number"
                    name="FineAmount"
                    value={student.FineAmount}
                    onChange={handleChange}
                    className="w-full border p-2 rounded mt-1"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Refund Amount</label>
                  <input
                    type="number"
                    name="RefundAmount"
                    value={student.RefundAmount}
                    onChange={handleChange}
                    className="w-full border p-2 rounded mt-1"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fine Paid Amount</label>
                  <input
                    type="number"
                    name="FinePaidAmount"
                    value={student.FinePaidAmount}
                    onChange={handleChange}
                    className="w-full border p-2 rounded mt-1"
                    min="0"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="IsDiscontinue"
                    checked={student.IsDiscontinue}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-700">Is Discontinued?</label>
                </div>
                {student.IsDiscontinue && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Discontinue Date</label>
                      <input
                        type="date"
                        name="DiscontinueOn"
                        value={formatDateForInput(student.DiscontinueOn)}
                        onChange={handleChange}
                        className="w-full border p-2 rounded mt-1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Discontinued By</label>
                      <input
                        type="text"
                        name="DiscontinueBy"
                        value={student.DiscontinueBy}
                        onChange={handleChange}
                        className="w-full border p-2 rounded mt-1"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

<div className="flex justify-between pt-4">
        <div>
          {step > 1 && (
            <button
              type="button"
              onClick={prevStep}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
            >
              Previous
            </button>
          )}
        </div>
        <div className="flex space-x-2">
          {step < 4 ? (
            <button
              type="button"
              onClick={nextStep}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Next
            </button>
          ) : null}

          {step === 4 && (
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-green-300"
            >
              {isSubmitting ? 'Updating...' : 'Update Student'}
            </button>
          )}
        </div>
      </div>
        </form>
      </div>
    </div>
  );
};

export default EditStudentModal;