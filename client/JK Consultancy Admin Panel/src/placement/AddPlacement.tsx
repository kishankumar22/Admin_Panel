import React, { useState, useEffect } from 'react';
import { Student } from '../types/placement';
import type { FormData } from '../types/placement';
import Breadcrumb from '../components/Breadcrumbs/Breadcrumb';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import axiosInstance from '../config';
import PlacementList from './PlacementList';
import { FiX } from 'react-icons/fi';

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

  useEffect(() => {
    axiosInstance.get('/students').then((res) => {
      const studentsData: Student[] = res.data;
      setStudents(studentsData);

      const uniqueCourses = Array.from(
        new Set(studentsData.map((student) => student.course.courseName))
      );
      setCourses(uniqueCourses);
    });
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      const courseDuration = students.find(s => s.course.courseName === selectedCourse)?.course.courseDuration || 0;
      const years = Array.from({ length: courseDuration }, (_, i) => `${i + 1}${getOrdinalSuffix(i + 1)}`);
      
      const filtered = students
        .filter((student) => student.course.courseName === selectedCourse)
        .flatMap((student) => 
          student.academicDetails.map(detail => ({
            student,
            academicId: detail.id,
            courseYear: detail.courseYear
          }))
        )
        .filter(item => years.includes(item.courseYear));

      setFilteredStudents(filtered);
    }
  }, [selectedCourse, students]);

  const getOrdinalSuffix = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setStudentPic(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setStudentPic(null);
    setPreviewUrl(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.studentAcademicId || isNaN(Number(formData.studentAcademicId))) {
      toast.error('Please select a valid student');
      return;
    }

    if (!formData.company) {
      toast.error('Please enter a company name');
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('studentAcademicId', formData.studentAcademicId);
      formDataToSend.append('company', formData.company);
      formDataToSend.append('role', formData.role);
      formDataToSend.append('package', formData.package);
      formDataToSend.append('year', formData.year);
      formDataToSend.append('status', formData.status);
      formDataToSend.append('remarks', formData.remarks);
      formDataToSend.append('CreatedBy', user?.name || 'admin');
      if (studentPic) {
        formDataToSend.append('studentPic', studentPic);
      }

      await axiosInstance.post('/placements', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('Placement added successfully!');
      setOpenModal(false);
      resetForm();
    } catch (err) {
      console.error('Error adding placement:', err);
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
  };

  return (
    <>
      <Breadcrumb pageName="Manage Placements" /> 
      <div className="">
        <button
          onClick={() => setOpenModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition mb-4"
        >
          Add Placement
        </button>

        {openModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <form
              onSubmit={handleSubmit}
              className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md relative"
            >
              <button
                type="button"
                onClick={() => {
                  setOpenModal(false);
                  resetForm();
                }}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              >
                <FiX size={24} />
              </button>

              <h2 className="text-xl font-semibold text-blue-800 mb-4">Add New Placement</h2>

              <div className="space-y-4">
                <select
                  name="course"
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full p-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Course</option>
                  {courses.map((course) => (
                    <option key={course} value={course}>{course}</option>
                  ))}
                </select>

                <select
                  name="studentAcademicId"
                  onChange={handleChange}
                  value={formData.studentAcademicId}
                  required
                  className="w-full p-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={!selectedCourse}
                >
                  <option value="">Select Student</option>
                  {filteredStudents.map(({ student, academicId }) => (
                    <option key={academicId} value={academicId}>
                      {student.fName} {student.lName || ''} ({student.course.courseName})
                    </option>
                  ))}
                </select>

                <div className="flex flex-col">
                  <label className="mb-2 text-sm font-medium">Student Photo</label>
                  <div className="flex items-center space-x-4">
                    {previewUrl ? (
                      <>
                        <div className="relative">
                          <img 
                            src={previewUrl} 
                            alt="Preview" 
                            className="w-16 h-16 rounded-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={removeImage}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 text-xs"
                          >
                            <FiX size={12} />
                          </button>
                        </div>
                        <span className="text-sm text-gray-500">Click to change</span>
                      </>
                    ) : (
                      <label className="cursor-pointer">
                        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500">+</span>
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

                <input
                  name="company"
                  placeholder="Company"
                  value={formData.company}
                  onChange={handleChange}
                  required
                  className="w-full p-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  name="role"
                  placeholder="Role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full p-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  name="package"
                  placeholder="Package (in LPA)"
                  type="number"
                  step="0.01"
                  value={formData.package}
                  onChange={handleChange}
                  className="w-full p-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  name="year"
                  placeholder="Placement Year"
                  type="number"
                  value={formData.year}
                  onChange={handleChange}
                  className="w-full p-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full p-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Selected">Selected</option>
                  <option value="Joined">Joined</option>
                  <option value="Offer Received">Offer Received</option>
                </select>
                <input
                  name="remarks"
                  placeholder="Remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                  className="w-full p-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpenModal(false);
                    resetForm();
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
        <PlacementList/>
      </div>  
    </>
  );
};

export default AddPlacement;