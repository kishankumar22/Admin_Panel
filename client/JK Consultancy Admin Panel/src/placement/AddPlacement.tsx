import React, { useState, useEffect } from 'react';
import { Student } from '../types/placement';
import Breadcrumb from '../components/Breadcrumbs/Breadcrumb';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import axiosInstance from '../config';
import PlacementList from './PlacementList';
import { FiX } from 'react-icons/fi';

// Define FormData type explicitly to avoid type mismatches
interface FormData {
  studentAcademicId: string;
  company: string;
  role: string;
  package: string;
  year: string;
  status: 'Selected' | 'Joined' | 'Offer Received';
  remarks: string;
  CreatedBy: string;
  ModifiedBy: string;
}

const AddPlacement: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<
    { student: Student; academicId: number }[]
  >([]);
  const [courses, setCourses] = useState<string[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [formData, setFormData] = useState<FormData>({
    studentAcademicId: '',
    company: '',
    role: '',
    package: '',
    year: '',
    status: 'Selected',
    remarks: '',
    CreatedBy: user?.name || 'admin',
    ModifiedBy: user?.name || 'admin',
  });
  const [studentPic, setStudentPic] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});

  // Input constraints
  const MAX_LENGTHS = {
    company: 100,
    role: 50,
    package: 10,
    year: 4,
    remarks: 200,
  };

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await axiosInstance.get('/students');
        const studentsData: Student[] = res.data;
        setStudents(studentsData);
        setCourses([...new Set(studentsData.map(student => student.course.courseName))]);
      } catch (err) {
        toast.error('Failed to fetch students');
      }
    };
    fetchStudents();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      const courseDuration = students.find(s => s.course.courseName === selectedCourse)?.course.courseDuration || 0;
      const finalYear = `${courseDuration}${getOrdinalSuffix(courseDuration)}`;
      
      setFilteredStudents(
        students
          .filter(student => student.course.courseName === selectedCourse)
          .flatMap(student => 
            student.academicDetails
              .filter(detail => detail.courseYear === finalYear)
              .map(detail => ({ student, academicId: detail.id }))
          )
      );
    } else {
      setFilteredStudents([]);
    }
  }, [selectedCourse, students]);

  const getOrdinalSuffix = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  };

  const validateInput = (name: string, value: string): string => {
    switch (name) {
      case 'studentAcademicId':
        return value ? '' : 'Student selection is required';
      case 'company':
        return value ? '' : 'Company name is required';
      case 'role':
        return value ? '' : 'Role is required';
      case 'package':
        return value ? (parseFloat(value) > 0 ? '' : 'Package must be positive') : 'Package is required';
      case 'year':
        return value ? (parseInt(value) >= 2000 && parseInt(value) <= new Date().getFullYear() ? '' : 'Invalidyear') : 'Year is required';
      default:
        return '';
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name in MAX_LENGTHS && value.length > MAX_LENGTHS[name as keyof typeof MAX_LENGTHS]) {
      return;
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: validateInput(name, value) }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      setStudentPic(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setStudentPic(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const mandatoryFields: (keyof FormData)[] = ['studentAcademicId', 'company', 'role', 'package', 'year'];
   // Error state type
const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

// Validation & error collection
const newErrors: Partial<Record<keyof FormData, string>> = {};

mandatoryFields.forEach((key) => {
  const value = formData[key];
  const error = validateInput(key, value);
  if (error) {
    newErrors[key] = error;
  }
});

if (Object.keys(newErrors).length > 0) {
  setErrors(newErrors);
  toast.error('Please fill all required fields correctly');
  return;
}


    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Please fill all required fields correctly');
      return;
    }

    try {
      const formDataToSend = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value);
      });
      if (studentPic) {
        formDataToSend.append('studentPic', studentPic);
      }

      await axiosInstance.post('/placements', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Placement added successfully!');
      setOpenModal(false);
      resetForm();
    } catch (err) {
      toast.error('Error adding placement');
    }
  };

  const resetForm = () => {
    setFormData({
      studentAcademicId: '',
      company: '',
      role: '',
      package: '',
      year: '',
      status: 'Selected',
      remarks: '',
      CreatedBy: user?.name || 'admin',
      ModifiedBy: user?.name || 'admin',
    });
    setSelectedCourse('');
    setStudentPic(null);
    setPreviewUrl(null);
    setErrors({});
  };

  return (
    <div className="container">
      <Breadcrumb pageName="Manage Placements" />
      <div className="mb-2 flex justify-end">
        <button
          onClick={() => setOpenModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200 text-sm font-medium"
        >
          Add Placement
        </button>
      </div>

      {openModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-999 p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl relative max-h-[90vh] overflow-y-auto"
          >
            <button
              type="button"
              onClick={() => { setOpenModal(false); resetForm(); }}
              className="absolute top-3 right-3 bg-red-500 text-white  p-2 mt-1 rounded-md hover:bg-red-700 transition text-sm"
            >
              <FiX size={20} />
            </button>

            <h2 className="text-lg font-semibold text-blue-800 mb-4">Add New Placement</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course <span className="text-red-500">*</span></label>
                <select
                  name="course"
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full p-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                  required
                >
                  <option value="">Select Course</option>
                  {courses.map(course => (
                    <option key={course} value={course}>{course}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student <span className="text-red-500">*</span></label>
                <select
                  name="studentAcademicId"
                  onChange={handleChange}
                  value={formData.studentAcademicId}
                  className={`w-full p-2 border ${errors.studentAcademicId ? 'border-red-500' : 'border-blue-300'} rounded-md focus:ring-2 focus:ring-blue-500 text-sm`}
                  disabled={!selectedCourse}
                  required
                >
                  <option value="">Select Student</option>
                  {filteredStudents.map(({ student, academicId }) => (
                    <option key={academicId} value={academicId}>
                      {student.fName} {student.lName || ''} ({student.course.courseName})
                    </option>
                  ))}
                </select>
                {errors.studentAcademicId && <p className="text-red-500 text-xs mt-1">{errors.studentAcademicId}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name <span className="text-red-500">*</span></label>
                <input
                  name="company"
                  placeholder="Enter company name"
                  value={formData.company}
                  onChange={handleChange}
                  className={`w-full p-2 border ${errors.company ? 'border-red-500' : 'border-blue-300'} rounded-md focus:ring-2 focus:ring-blue-500 text-sm`}
                  required
                  maxLength={MAX_LENGTHS.company}
                />
                {errors.company && <p className="text-red-500 text-xs mt-1">{errors.company}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role Offered <span className="text-red-500">*</span></label>
                <input
                  name="role"
                  placeholder="Enter role"
                  value={formData.role}
                  onChange={handleChange}
                  className={`w-full p-2 border ${errors.role ? 'border-red-500' : 'border-blue-300'} rounded-md focus:ring-2 focus:ring-blue-500 text-sm`}
                  required
                  maxLength={MAX_LENGTHS.role}
                />
                {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Package (in LPA) <span className="text-red-500">*</span></label>
                <input
                  name="package"
                  placeholder="Enter package"
                  type="number"
                  step="0.01"
                  value={formData.package}
                  onChange={handleChange}
                  className={`w-full p-2 border ${errors.package ? 'border-red-500' : 'border-blue-300'} rounded-md focus:ring-2 focus:ring-blue-500 text-sm`}
                  required
                  maxLength={MAX_LENGTHS.package}
                />
                {errors.package && <p className="text-red-500 text-xs mt-1">{errors.package}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Placement Year <span className="text-red-500">*</span></label>
                <input
                  name="year"
                  placeholder="Enter year"
                  type="number"
                  value={formData.year}
                  onChange={handleChange}
                  className={`w-full p-2 border ${errors.year ? 'border-red-500' : 'border-blue-300'} rounded-md focus:ring-2 focus:ring-blue-500 text-sm`}
                  required
                  maxLength={MAX_LENGTHS.year}
                />
                {errors.year && <p className="text-red-500 text-xs mt-1">{errors.year}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full p-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="Selected">Selected</option>
                  <option value="Joined">Joined</option>
                  <option value="Offer Received">Offer Received</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <input
                  name="remarks"
                  placeholder="Enter remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                  className="w-full p-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                  maxLength={MAX_LENGTHS.remarks}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Student Photo</label>
                <div className="flex items-center space-x-4">
                  {previewUrl ? (
                    <div className="relative">
                      <img src={previewUrl} alt="Preview" className="w-12 h-12 rounded-full object-cover" />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                      >
                        <FiX size={10} />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500 text-lg">+</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6 justify-end">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-200 text-sm font-medium"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => { setOpenModal(false); resetForm(); }}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition duration-200 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      <PlacementList />
    </div>
  );
};

export default AddPlacement;