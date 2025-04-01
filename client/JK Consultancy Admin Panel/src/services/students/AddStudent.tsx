import React, { useState } from 'react';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import { Button } from 'flowbite-react';
import { FaTimes } from 'react-icons/fa';

const courseOptions = [
  { id: 'bpharma', name: 'B. Pharma' },
  { id: 'mpharma', name: 'M. Pharma' }
];

const admissionModes = [
  { value: 'direct', label: 'By Direct Admission' },
  { value: 'entrance', label: 'Entrance Exam' }
];

const collegeOptions = [
  { id: 'college1', name: 'ABC College' },
  { id: 'college2', name: 'XYZ College' }
];

const AddStudent = () => {
  const [step, setStep] = useState(1);
  const [savedSteps, setSavedSteps] = useState<Record<number, boolean>>({ 1: false, 2: false, 3: false, 4: false });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [student, setStudent] = useState({
    StudentId: '', RollNumber: '', FName: '', LName: '', DOB: '', Gender: '',
    MobileNumber: '', AlternateNumber: '', EmailId: '', FatherName: '', FatherMobileNumber: '',
    MotherName: '', Address: '', City: '', State: '', Pincode: '',
    CourseName: '', CreatedOn: new Date().toISOString(), CreatedBy: '', ModifiedOn: '', ModifiedBy: '',
    StudentImage: '', CourseYear: '', IsDiscontinue: false, DiscontinueOn: '',
    DiscontinueBy: '', FineAmount: 0, RefundAmount: 0, FinePaidAmount: 0,
    IsSCStudent: false, LedgerNumber: '', CollegeName: '', CollegeId: '', AdmissionMode: '',
    AdmissionDate: '' // Added as a potentially necessary field
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setStudent({ ...student, [name]: value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setStudent({ ...student, StudentImage: file ? file.name : '' });
  };

  const saveStep = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setSavedSteps(prev => ({ ...prev, [step]: true }));
  };

  const nextStep = () => {
    if (savedSteps[step]) {
      setStep((prev) => Math.min(prev + 1, 4));
    } else {
      alert('Please save the current step before proceeding.');
    }
  };

  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));
  const resetForm = () => {
    setStudent({
      StudentId: '', RollNumber: '', FName: '', LName: '', DOB: '', Gender: '',
      MobileNumber: '', AlternateNumber: '', EmailId: '', FatherName: '', FatherMobileNumber: '',
      MotherName: '', Address: '', City: '', State: '', Pincode: '',
      CourseName: '', CreatedOn: new Date().toISOString(), CreatedBy: '', ModifiedOn: '', ModifiedBy: '',
      StudentImage: '', CourseYear: '', IsDiscontinue: false, DiscontinueOn: '',
      DiscontinueBy: '', FineAmount: 0, RefundAmount: 0, FinePaidAmount: 0,
      IsSCStudent: false, LedgerNumber: '', CollegeName: '', CollegeId: '', AdmissionMode: '',
      AdmissionDate: ''
    });
    setSavedSteps({ 1: false, 2: false, 3: false, 4: false });
  };

  const handleSubmit = () => {
    if (window.confirm("Are you sure to submit this form?")) {
      alert('Student data submitted successfully!');
      setIsPreviewOpen(false);
      setIsModalOpen(false);
      setStep(1);
      resetForm();
    }
  };

  const openModalAtStepOne = () => {
    setIsModalOpen(true);
    setStep(1);
    setSavedSteps({ 1: false, 2: false, 3: false, 4: false });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <Breadcrumb pageName="Add Students" />
      
      <Button
        type="button"
        onClick={openModalAtStepOne}
        className="text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 font-base rounded-md text-sm px-2 text-center me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
      >
        Add Students
      </Button>

      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white p-4 rounded-lg max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-bold">Step {step} of 4</h2>
              <button 
                className="text-red-500 hover:text-red-700 text-xl focus:outline-none focus:ring-4 p-2 rounded-md focus:ring-blue-300"
                onClick={() => setIsModalOpen(false)}
              >
                <FaTimes />
              </button>
            </div>

            <form className="space-y-2" onSubmit={(e) => e.preventDefault()}>
              {step === 1 && (
                <div className="space-y-2">
                  <h3 className="text-base font-semibold">Personal Details</h3>
                  <div>
                    <label className="block text-sm text-gray-700">Student ID</label>
                    <input type="text" name="StudentId" value={student.StudentId} onChange={handleChange} className="w-full border p-2 rounded" required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Roll Number</label>
                    <input type="text" name="RollNumber" value={student.RollNumber} onChange={handleChange} className="w-full border p-2 rounded" required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">First Name</label>
                    <input type="text" name="FName" value={student.FName} onChange={handleChange} className="w-full border p-2 rounded" required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Last Name</label>
                    <input type="text" name="LName" value={student.LName} onChange={handleChange} className="w-full border p-2 rounded" required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Date of Birth</label>
                    <input type="date" name="DOB" value={student.DOB} onChange={handleChange} className="w-full border p-2 rounded" required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Gender</label>
                    <select name="Gender" value={student.Gender} onChange={handleChange} className="w-full border p-2 rounded">
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-2">
                  <h3 className="text-base font-semibold">Contact Details</h3>
                  <div>
                    <label className="block text-sm text-gray-700">Mobile Number</label>
                    <input type="tel" name="MobileNumber" value={student.MobileNumber} onChange={handleChange} className="w-full border p-2 rounded" required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Alternate Number</label>
                    <input type="tel" name="AlternateNumber" value={student.AlternateNumber} onChange={handleChange} className="w-full border p-2 rounded" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Email ID</label>
                    <input type="email" name="EmailId" value={student.EmailId} onChange={handleChange} className="w-full border p-2 rounded" required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Father's Name</label>
                    <input type="text" name="FatherName" value={student.FatherName} onChange={handleChange} className="w-full border p-2 rounded" required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Father's Mobile</label>
                    <input type="tel" name="FatherMobileNumber" value={student.FatherMobileNumber} onChange={handleChange} className="w-full border p-2 rounded" required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Mother's Name</label>
                    <input type="text" name="MotherName" value={student.MotherName} onChange={handleChange} className="w-full border p-2 rounded" required />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-2">
                  <h3 className="text-base font-semibold">Academic & Address Details</h3>
                  <div>
                    <label className="block text-sm text-gray-700">Course</label>
                    <select name="CourseName" value={student.CourseName} onChange={handleChange} className="w-full border p-2 rounded" required>
                      <option value="">Select</option>
                      {courseOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Course Year</label>
                    <input type="text" name="CourseYear" value={student.CourseYear} onChange={handleChange} className="w-full border p-2 rounded" required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Address</label>
                    <textarea name="Address" value={student.Address} onChange={handleChange} className="w-full border p-2 rounded" required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">City</label>
                    <input type="text" name="City" value={student.City} onChange={handleChange} className="w-full border p-2 rounded" required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">State</label>
                    <input type="text" name="State" value={student.State} onChange={handleChange} className="w-full border p-2 rounded" required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Pincode</label>
                    <input type="text" name="Pincode" value={student.Pincode} onChange={handleChange} className="w-full border p-2 rounded" required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Admission Date</label>
                    <input type="date" name="AdmissionDate" value={student.AdmissionDate} onChange={handleChange} className="w-full border p-2 rounded" />
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-2">
                  <h3 className="text-base font-semibold">Final & Administrative Details</h3>
                  <div>
                    <label className="block text-sm text-gray-700">College</label>
                    <select name="CollegeName" value={student.CollegeName} onChange={handleChange} className="w-full border p-2 rounded" required>
                      <option value="">Select</option>
                      {collegeOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Admission Mode</label>
                    <select name="AdmissionMode" value={student.AdmissionMode} onChange={handleChange} className="w-full border p-2 rounded" required>
                      <option value="">Select</option>
                      {admissionModes.map(mode => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Is SC Student?</label>
                    <input type="checkbox" name="IsSCStudent" checked={student.IsSCStudent} onChange={(e) => setStudent({ ...student, IsSCStudent: e.target.checked })} className="mr-1" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Ledger Number</label>
                    <input type="text" name="LedgerNumber" value={student.LedgerNumber} onChange={handleChange} className="w-full border p-2 rounded" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Student Image</label>
                    <input type="file" name="StudentImage" onChange={handleFileChange} className="w-full border p-2 rounded" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Is Discontinue?</label>
                    <input type="checkbox" name="IsDiscontinue" checked={student.IsDiscontinue} onChange={(e) => setStudent({ ...student, IsDiscontinue: e.target.checked })} className="mr-1" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Discontinue On</label>
                    <input type="date" name="DiscontinueOn" value={student.DiscontinueOn} onChange={handleChange} className="w-full border p-2 rounded" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Discontinue By</label>
                    <input type="text" name="DiscontinueBy" value={student.DiscontinueBy} onChange={handleChange} className="w-full border p-2 rounded" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Fine Amount</label>
                    <input type="number" name="FineAmount" value={student.FineAmount} onChange={handleChange} className="w-full border p-2 rounded" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Refund Amount</label>
                    <input type="number" name="RefundAmount" value={student.RefundAmount} onChange={handleChange} className="w-full border p-2 rounded" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Fine Paid Amount</label>
                    <input type="number" name="FinePaidAmount" value={student.FinePaidAmount} onChange={handleChange} className="w-full border p-2 rounded" />
                  </div>
                </div>
              )}

              <div className="mt-4 flex justify-between">
                <div>
                  <button onClick={prevStep} className="px-3 py-1 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 mr-2" disabled={step === 1}>Previous</button>
                  <button onClick={resetForm} className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600">Reset</button>
                </div>
                {step < 4 ? (
                  <div className="flex space-x-2">
                    <button onClick={saveStep} className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600">Save</button>
                    {savedSteps[step] ? (
                      <button onClick={nextStep} className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">Next</button>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex space-x-2">
                    <button onClick={prevStep} className="px-3 py-1 bg-gray-300 text-gray-800 rounded hover:bg-gray-400">Back</button>
                    <button onClick={resetForm} className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600">Reset</button>
                    <button onClick={() => setIsPreviewOpen(true)} className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600">Preview</button>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {isPreviewOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white p-4 rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-2">Preview Student Details</h2>
            <div className="space-y-1 text-sm">
              <p><strong>Student ID:</strong> {student.StudentId}</p>
              <p><strong>Roll Number:</strong> {student.RollNumber}</p>
              <p><strong>Name:</strong> {student.FName} {student.LName}</p>
              <p><strong>DOB:</strong> {student.DOB}</p>
              <p><strong>Gender:</strong> {student.Gender}</p>
              <p><strong>Mobile Number:</strong> {student.MobileNumber}</p>
              <p><strong>Alternate Number:</strong> {student.AlternateNumber}</p>
              <p><strong>Email ID:</strong> {student.EmailId}</p>
              <p><strong>Father's Name:</strong> {student.FatherName}</p>
              <p><strong>Father's Mobile:</strong> {student.FatherMobileNumber}</p>
              <p><strong>Mother's Name:</strong> {student.MotherName}</p>
              <p><strong>Address:</strong> {student.Address}, {student.City}, {student.State} - {student.Pincode}</p>
              <p><strong>Course:</strong> {courseOptions.find(option => option.id === student.CourseName)?.name || ''}</p>
              <p><strong>Course Year:</strong> {student.CourseYear}</p>
              <p><strong>Admission Date:</strong> {student.AdmissionDate}</p>
              <p><strong>College:</strong> {collegeOptions.find(option => option.id === student.CollegeName)?.name || ''}</p>
              <p><strong>Admission Mode:</strong> {admissionModes.find(mode => mode.value === student.AdmissionMode)?.label || ''}</p>
              <p><strong>Is SC Student:</strong> {student.IsSCStudent ? 'Yes' : 'No'}</p>
              <p><strong>Ledger Number:</strong> {student.LedgerNumber}</p>
              <p><strong>Student Image:</strong> {student.StudentImage}</p>
              <p><strong>Is Discontinue:</strong> {student.IsDiscontinue ? 'Yes' : 'No'}</p>
              <p><strong>Discontinue On:</strong> {student.DiscontinueOn}</p>
              <p><strong>Discontinue By:</strong> {student.DiscontinueBy}</p>
              <p><strong>Fine Amount:</strong> {student.FineAmount}</p>
              <p><strong>Refund Amount:</strong> {student.RefundAmount}</p>
              <p><strong>Fine Paid Amount:</strong> {student.FinePaidAmount}</p>
              <p><strong>Created On:</strong> {student.CreatedOn}</p>
              <p><strong>Created By:</strong> {student.CreatedBy}</p>
              <p><strong>Modified On:</strong> {student.ModifiedOn}</p>
              <p><strong>Modified By:</strong> {student.ModifiedBy}</p>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button onClick={() => setIsPreviewOpen(false)} className="px-3 py-1 bg-gray-300 text-gray-800 rounded hover:bg-gray-400">Close</button>
              <button onClick={handleSubmit} className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddStudent;