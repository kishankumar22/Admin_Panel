import React, { useEffect, useState } from 'react';

import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import { Button } from 'flowbite-react';
import { FaTimes } from 'react-icons/fa';
import axiosInstance from '../../config';
import { useAuth } from '../../context/AuthContext';


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
  CreatedBy:string
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

const AddStudent = () => {
  const [step, setStep] = useState(1);
  const [savedSteps, setSavedSteps] = useState<Record<number, boolean>>({ 1: false, 2: false, 3: false, 4: false });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

    const { user } = useAuth();
  const createdBy = user?.name;
  const modifyBy = user?.name;
  console.log(modifyBy)
  
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
    CourseName: '',
    CourseYear: '',
    IsSCStudent: false,
    LedgerNumber: '',
    CollegeId: '',
    AdmissionMode: '',
    AdmissionDate: '',
    IsDiscontinue: false,
    DiscontinueOn: '',
    DiscontinueBy: '',
    FineAmount: 0,
    RefundAmount: 0,
    FinePaidAmount: 0,
    CreatedBy:createdBy||''
  });

  const [documents, setDocuments] = useState<Documents>({
    StudentImage: { file: null, preview: null },
    CasteCertificate: { file: null, preview: null },
    TenthMarks: { file: null, preview: null },
    TwelfthMarks: { file: null, preview: null },
    Residential: { file: null, preview: null },
    Income: { file: null, preview: null }
  });

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
      const preview = URL.createObjectURL(file);
      setDocuments(prev => ({
        ...prev,
        [fieldName]: {
          file,
          preview: fieldName === 'StudentImage' ? preview : null
        }
      }));
    }
  };

  const saveStep = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setSavedSteps(prev => ({ ...prev, [step]: true }));
  };

  const nextStep = () => {
    if (savedSteps[step]) {
      setStep(prev => Math.min(prev + 1, 4));
    } else {
      alert('Please save the current step before proceeding.');
    }
  };

  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const resetForm = () => {
    setStudent({
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
      CourseName: '',
      CourseYear: '',
      IsSCStudent: false,
      LedgerNumber: '',
      CollegeId: '',
      AdmissionMode: '',
      AdmissionDate: '',
      IsDiscontinue: false,
      DiscontinueOn: '',
      DiscontinueBy: '',
      FineAmount: 0,
      RefundAmount: 0,
      FinePaidAmount: 0,
      CreatedBy:''
    });

    setDocuments({
      StudentImage: { file: null, preview: null },
      CasteCertificate: { file: null, preview: null },
      TenthMarks: { file: null, preview: null },
      TwelfthMarks: { file: null, preview: null },
      Residential: { file: null, preview: null },
      Income: { file: null, preview: null }
    });

    setSavedSteps({ 1: false, 2: false, 3: false, 4: false });
    setStep(1);
  };

  const handleSubmit = async () => {
    if (!window.confirm("Are you sure you want to submit this student data?")) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      
      // Append student data
      Object.entries(student).forEach(([key, value]) => {
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

      const response = await axiosInstance.post('/students', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        alert('Student created successfully!');
        setIsModalOpen(false);
        setIsPreviewOpen(false);
        resetForm();
      } else {
        throw new Error(response.data.message || 'Failed to create student');
      }
    } catch (error: any) {
      console.error('Error creating student:', error);
      alert(`Error: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  interface Student {
    StudentId: number;
    RollNumber: string;
    FName: string;
    LName: string;
    EmailId: string;
    MobileNumber: string;
    CourseName: string;
    College: {
      CollegeName: string;
    };
    CreatedOn: string;
  }
  const openModalAtStepOne = () => {
    setIsModalOpen(true);
    setStep(1);
    setSavedSteps({ 1: false, 2: false, 3: false, 4: false });
  };
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState("");
  
  

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await axiosInstance.get('/students');
        setStudents(response.data);
        console.log(response.data)
      } catch (err) {
        setError('Failed to fetch students');
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  if (loading) return <div>Loading students...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
    // Search Filter Logic
    const filteredStudents = students.filter((student) =>
      [student.FName, student.LName, student.EmailId, student.MobileNumber, student.RollNumber]
        .some((field) => field?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  return (
    <>
    <div className="min-h-screen bg-gray-100 p-2">
      <Breadcrumb pageName="Add Students" />
      <div className=' flex justify-between items-center gap-2'>

      <input
          type="search"
          className=" bg-gray-100 p-1 h- border rounded-md text-sm w-full sm:w-64 focus:outline-none focus:ring-4 focus:ring-blue-500 transition duration-300"
          placeholder="Search Name, Email, Mobile..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      <Button
        type="button"
        onClick={openModalAtStepOne}
        className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-2 focus:ring-blue-300 font-medium rounded-md text-sm dark:bg-blue-600 dark:hover:bg-blue-700"
      >
        Add Students
      </Button>
    

      </div>

      <div className="p-4">
  <h2 className="text-xl font-bold mb-4">Students List</h2>
  <div className="overflow-x-auto">
     <table className="min-w-full border border-gray-200 bg-white rounded-lg shadow-md">
          <thead className="bg-gray-100 border-b">
            <tr className="text-left">
              <th className="p-3 border">#</th>
              <th className="p-3 border">Name</th>
              <th className="p-3 border">Roll No</th>
              <th className="p-3 border">Email</th>
              <th className="p-3 border">Mobile</th>
              <th className="p-3 border">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student, index) => (
                <tr key={student.StudentId} className="border-b hover:bg-gray-50">
                  <td className="p-3 border">{index + 1}</td>
                  <td className="p-3 border">{student.FName} {student.LName}</td>
                  <td className="p-3 border">{student.RollNumber}</td>
                  <td className="p-3 border">{student.EmailId}</td>
                  <td className="p-3 border">{student.MobileNumber}</td>
                  <td className="p-3 border text-center">
  <button className="text-white bg-green-600 hover:bg-green-700 focus:ring-2 focus:ring-green-300 font-medium rounded-md text-sm px-3 py-1 transition duration-200 ease-in-out shadow-md hover:shadow-lg mr-2">
    EDIT
  </button>
  <button className="text-white bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-red-300 font-medium rounded-md text-sm px-3 py-1 transition duration-200 ease-in-out shadow-md hover:shadow-lg">
    Delete
  </button>
</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="p-3 text-center text-gray-500">No students found</td>
              </tr>
            )}
          </tbody>
        </table>
  </div>
</div>


      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-50">
          <div className="bg-white p-4 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Add New Student - Step {step} of 4</h2>
              <button
                className="text-red-500 hover:text-red-700 text-xl focus:ring-2 p-1 rounded-md focus:ring-blue-300"
                onClick={() => setIsModalOpen(false)}
              >
                <FaTimes />
              </button>
            </div>

            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              {step === 1 && (
                <>
                  <h3 className="text-base font-semibold text-center text-blue-500">Personal Details</h3>
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
                        value={student.DOB}
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
                </>
              )}

              {step === 2 && (
                <>
                  <h3 className="text-base font-semibold text-center text-blue-500">Contact Details</h3>
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
                </>
              )}

              {step === 3 && (
                <>
                  <h3 className="text-base font-semibold text-center text-blue-500">Academic & Address Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Course*</label>
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
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">12th Marksheet</label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange(e, 'TwelfthMarks')}
                        className="w-full border p-2 rounded mt-1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Caste Certificate</label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange(e, 'CasteCertificate')}
                        className="w-full border p-2 rounded mt-1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Income Certificate</label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange(e, 'Income')}
                        className="w-full border p-2 rounded mt-1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Residential Proof</label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange(e, 'Residential')}
                        className="w-full border p-2 rounded mt-1"
                      />
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
                        value={student.AdmissionDate}
                        onChange={handleChange}
                        className="w-full border p-2 rounded mt-1"
                      />
                    </div>
                  </div>
                </>
              )}

              {step === 4 && (
                <>
                  <h3 className="text-base font-semibold text-center text-blue-500">Final & Administrative Details</h3>
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
                      {documents.StudentImage.preview && (
                        <div className="mt-2">
                          <img 
                            src={documents.StudentImage.preview} 
                            alt="Student Preview" 
                            className="h-20 w-20 object-cover rounded"
                          />
                        </div>
                      )}
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
                            value={student.DiscontinueOn}
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
                </>
              )}

              <div className="flex justify-between pt-4">
                <div>
                  {step > 1 && (
                    <button
                      onClick={prevStep}
                      className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                    >
                      Previous
                    </button>
                  )}
                </div>
                <div className="flex space-x-2">
                  {step < 4 ? (
                    <>
                      <button
                        onClick={saveStep}
                        className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                      >
                        Save
                      </button>
                      {savedSteps[step] && (
                        <button
                          onClick={nextStep}
                          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          Next
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => resetForm()}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Reset
                      </button>
                      <button
                        onClick={() => setIsPreviewOpen(true)}
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        Preview
                      </button>
                    </>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPreviewOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Student Details Preview</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {documents.StudentImage.preview && (
                <div className="md:col-span-2 flex justify-center">
                  <img 
                    src={documents.StudentImage.preview} 
                    alt="Student Preview" 
                    className="h-32 w-32 object-cover rounded-full border-4 border-blue-200"
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <h3 className="font-semibold text-blue-500 border-b pb-1">Personal Details</h3>
                <p><span className="font-medium">Name:</span> {student.FName} {student.LName}</p>
                <p><span className="font-medium">Roll Number:</span> {student.RollNumber}</p>
                <p><span className="font-medium">DOB:</span> {student.DOB || 'N/A'}</p>
                <p><span className="font-medium">Gender:</span> {student.Gender || 'N/A'}</p>
                <p><span className="font-medium">Father's Name:</span> {student.FatherName || 'N/A'}</p>
                <p><span className="font-medium">Mother's Name:</span> {student.MotherName || 'N/A'}</p>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold text-blue-500 border-b pb-1">Contact Details</h3>
                <p><span className="font-medium">Mobile:</span> {student.MobileNumber || 'N/A'}</p>
                <p><span className="font-medium">Alternate Mobile:</span> {student.AlternateNumber || 'N/A'}</p>
                <p><span className="font-medium">Email:</span> {student.EmailId || 'N/A'}</p>
                <p><span className="font-medium">Father's Mobile:</span> {student.FatherMobileNumber || 'N/A'}</p>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold text-blue-500 border-b pb-1">Academic Details</h3>
                <p><span className="font-medium">Course:</span> {courseOptions.find(c => c.id === student.CourseName)?.name || 'N/A'}</p>
                <p><span className="font-medium">Course Year:</span> {student.CourseYear || 'N/A'}</p>
                <p><span className="font-medium">College:</span> {collegeOptions.find(c => c.id === student.CollegeId)?.name || 'N/A'}</p>
                <p><span className="font-medium">Admission Mode:</span> {admissionModes.find(m => m.value === student.AdmissionMode)?.label || 'N/A'}</p>
                <p><span className="font-medium">Admission Date:</span> {student.AdmissionDate || 'N/A'}</p>
                <p><span className="font-medium">SC/ST Student:</span> {student.IsSCStudent ? 'Yes' : 'No'}</p>
                <p><span className="font-medium">Ledger Number:</span> {student.LedgerNumber || 'N/A'}</p>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold text-blue-500 border-b pb-1">Address</h3>
                <p><span className="font-medium">Address:</span> {student.Address || 'N/A'}</p>
                <p><span className="font-medium">City:</span> {student.City || 'N/A'}</p>
                <p><span className="font-medium">State:</span> {student.State || 'N/A'}</p>
                <p><span className="font-medium">Pincode:</span> {student.Pincode || 'N/A'}</p>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold text-blue-500 border-b pb-1">Financial Details</h3>
                <p><span className="font-medium">Fine Amount:</span> {student.FineAmount}</p>
                <p><span className="font-medium">Refund Amount:</span> {student.RefundAmount}</p>
                <p><span className="font-medium">Fine Paid Amount:</span> {student.FinePaidAmount}</p>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold text-blue-500 border-b pb-1">Documents</h3>
                <p><span className="font-medium">Student Photo:</span> {documents.StudentImage.file ? documents.StudentImage.file.name : 'Not uploaded'}</p>
                <p><span className="font-medium">10th Marksheet:</span> {documents.TenthMarks.file ? documents.TenthMarks.file.name : 'Not uploaded'}</p>
                <p><span className="font-medium">12th Marksheet:</span> {documents.TwelfthMarks.file ? documents.TwelfthMarks.file.name : 'Not uploaded'}</p>
                <p><span className="font-medium">Caste Certificate:</span> {documents.CasteCertificate.file ? documents.CasteCertificate.file.name : 'Not uploaded'}</p>
                <p><span className="font-medium">Income Certificate:</span> {documents.Income.file ? documents.Income.file.name : 'Not uploaded'}</p>
                <p><span className="font-medium">Residential Proof:</span> {documents.Residential.file ? documents.Residential.file.name : 'Not uploaded'}</p>
              </div>
              
              {student.IsDiscontinue && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-blue-500 border-b pb-1">Discontinuation Details</h3>
                  <p><span className="font-medium">Discontinued:</span> Yes</p>
                  <p><span className="font-medium">Discontinue Date:</span> {student.DiscontinueOn || 'N/A'}</p>
                  <p><span className="font-medium">Discontinued By:</span> {student.DiscontinueBy || 'N/A'}</p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                Back to Edit
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-green-300"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
 
    </>
  );
};

export default AddStudent;