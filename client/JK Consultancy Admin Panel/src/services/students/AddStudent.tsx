import React, { useState } from 'react';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';

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
    rollNumber: '', fName: '', lName: '', dob: '', gender: '',
    mobileNumber: '', alternateNumber: '', emailId: '', fatherName: '', fatherMobileNumber: '',
    motherName: '', address: '', city: '', state: '', pincode: '',
    courseName: '', createdOn: new Date().toISOString(), createdBy: '', modifiedOn: '', modifiedBy: '',
    studentImage: '', courseYear: '', isDiscontinue: false, discontinueOn: '',
    discontinueBy: '', fineAmount: 0, refundAmount: 0, finePaidAmount: 0,
    isSCStudent: false, ledgerNumber: '', collegeName: '', collegeId: '', admissionMode: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setStudent({ ...student, [name]: value });
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
      rollNumber: '', fName: '', lName: '', dob: '', gender: '',
      mobileNumber: '', alternateNumber: '', emailId: '', fatherName: '', fatherMobileNumber: '',
      motherName: '', address: '', city: '', state: '', pincode: '',
      courseName: '', createdOn: new Date().toISOString(), createdBy: '', modifiedOn: '', modifiedBy: '',
      studentImage: '', courseYear: '', isDiscontinue: false, discontinueOn: '',
      discontinueBy: '', fineAmount: 0, refundAmount: 0, finePaidAmount: 0,
      isSCStudent: false, ledgerNumber: '', collegeName: '', collegeId: '', admissionMode: ''
    });
    setSavedSteps({ 1: false, 2: false, 3: false, 4: false }); // Reset saved steps
  };

  const handleSubmit = () => {
    if (window.confirm("Are you sure to submit this form?")) {
      alert('Student data submitted successfully!');
      setIsPreviewOpen(false);
      setIsModalOpen(false);
      setStep(1); // Reset step to 1 after submission
      resetForm(); // Reset form and saved steps
    }
  };

  const openModalAtStepOne = () => {
    setIsModalOpen(true);
    setStep(1); // Ensure modal always starts at Step 1
    setSavedSteps({ 1: false, 2: false, 3: false, 4: false }); // Reset saved steps when opening modal
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <Breadcrumb pageName="Add Students" />
      <div className="flex items-center justify-end p-2 mb-3 bg-gray-100 dark:bg-gray-700 rounded-lg shadow-md">
      
      <button 
        onClick={openModalAtStepOne} // Use new function to open modal at Step 1
        className={`ml-2 flex items-center gap-3 px-4 py-1 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400`}

      >
        Add Student
      </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-4 rounded-lg max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-bold">Step {step} of 4</h2>
              <button 
                className="text-red-500 hover:text-red-700 text-xl"
                onClick={() => setIsModalOpen(false)}
              >
                X
              </button>
            </div>

            <form className="space-y-2" onSubmit={(e) => e.preventDefault()}>
              {step === 1 && (
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-blue-600 text-center">Personal Details</h3>
                  <div>
                    <label className="block text-sm text-gray-700">Roll Number</label>
                    <input type="text" name="rollNumber" value={student.rollNumber} onChange={handleChange} className="w-full border p-2 rounded" required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">First Name</label>
                    <input type="text" name="fName" value={student.fName} onChange={handleChange} className="w-full border p-2 rounded" required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Last Name</label>
                    <input type="text" name="lName" value={student.lName} onChange={handleChange} className="w-full border p-2 rounded" required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Date of Birth</label>
                    <input type="date" name="dob" value={student.dob} onChange={handleChange} className="w-full border p-2 rounded" required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Gender</label>
                    <select name="gender" value={student.gender} onChange={handleChange} className="w-full border p-2 rounded">
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
                  <h3 className="text-base font-semibold text-blue-600 text-center">Contact Details</h3>
                  <div>
                    <label className="block text-sm text-gray-700">Mobile Number</label>
                    <input type="tel" name="mobileNumber" value={student.mobileNumber} onChange={handleChange} className="w-full border p-2 rounded" required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Alternate Number</label>
                    <input type="tel" name="alternateNumber" value={student.alternateNumber} onChange={handleChange} className="w-full border p-2 rounded" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Email ID</label>
                    <input type="email" name="emailId" value={student.emailId} onChange={handleChange} className="w-full border p-2 rounded" required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Father's Name</label>
                    <input type="text" name="fatherName" value={student.fatherName} onChange={handleChange} className="w-full border p-2 rounded" required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Father's Mobile</label>
                    <input type="tel" name="fatherMobileNumber" value={student.fatherMobileNumber} onChange={handleChange} className="w-full border p-2 rounded" required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Mother's Name</label>
                    <input type="text" name="motherName" value={student.motherName} onChange={handleChange} className="w-full border p-2 rounded" required />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-blue-600 text-center">Academic Details</h3>
                  <div>
                    <label className="block text-sm text-gray-700">Course</label>
                    <select name="courseName" value={student.courseName} onChange={handleChange} className="w-full border p-2 rounded" required>
                      <option value="">Select</option>
                      {courseOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Course Year</label>
                    <input type="text" name="courseYear" value={student.courseYear} onChange={handleChange} className="w-full border p-2 rounded" required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Address</label>
                    <textarea name="address" value={student.address} onChange={handleChange} className="w-full border p-2 rounded" required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">City</label>
                    <input type="text" name="city" value={student.city} onChange={handleChange} className="w-full border p-2 rounded" required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">State</label>
                    <input type="text" name="state" value={student.state} onChange={handleChange} className="w-full border p-2 rounded" required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Pincode</label>
                    <input type="text" name="pincode" value={student.pincode} onChange={handleChange} className="w-full border p-2 rounded" required />
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-blue-600 text-center">Final Details</h3>
                  <div>
                    <label className="block text-sm text-gray-700">College</label>
                    <select name="collegeName" value={student.collegeName} onChange={handleChange} className="w-full border p-2 rounded" required>
                      <option value="">Select</option>
                      {collegeOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Admission Mode</label>
                    <select name="admissionMode" value={student.admissionMode} onChange={handleChange} className="w-full border p-2 rounded" required>
                      <option value="">Select</option>
                      {admissionModes.map(mode => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Is SC Student?</label>
                    <input type="checkbox" name="isSCStudent" checked={student.isSCStudent} onChange={(e) => setStudent({ ...student, isSCStudent: e.target.checked })} className="mr-1" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Ledger Number</label>
                    <input type="text" name="ledgerNumber" value={student.ledgerNumber} onChange={handleChange} className="w-full border p-2 rounded" />
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
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-4 rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-2">Preview Student Details</h2>
            <div className="space-y-1 text-sm">
              <p><strong>Roll Number:</strong> {student.rollNumber}</p>
              <p><strong>Name:</strong> {student.fName} {student.lName}</p>
              <p><strong>DOB:</strong> {student.dob}</p>
              <p><strong>Gender:</strong> {student.gender}</p>
              <p><strong>Mobile:</strong> {student.mobileNumber}</p>
              <p><strong>Email:</strong> {student.emailId}</p>
              <p><strong>Father's Name:</strong> {student.fatherName}</p>
              <p><strong>Mother's Name:</strong> {student.motherName}</p>
              <p><strong>Course:</strong> {courseOptions.find(option => option.id === student.courseName)?.name || ''}</p>
              <p><strong>Course Year:</strong> {student.courseYear}</p>
              <p><strong>Address:</strong> {student.address}, {student.city}, {student.state} - {student.pincode}</p>
              <p><strong>College:</strong> {collegeOptions.find(option => option.id === student.collegeName)?.name || ''}</p>
              <p><strong>Admission Mode:</strong> {admissionModes.find(mode => mode.value === student.admissionMode)?.label || ''}</p>
              <p><strong>Is SC Student:</strong> {student.isSCStudent ? 'Yes' : 'No'}</p>
              <p><strong>Ledger Number:</strong> {student.ledgerNumber}</p>
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