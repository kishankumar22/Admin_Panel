import React, { useState, useEffect } from 'react';
import { Student, FormData } from '../types/placement';
import Breadcrumb from '../components/Breadcrumbs/Breadcrumb';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import axiosInstance from '../config';
import PlacementList from './PlacementList';

const AddPlacement: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<
    { student: Student; academicId: number }[]
  >([]);
  const [courses, setCourses] = useState<string[]>([]);
  const [courseYears, setCourseYears] = useState<string[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedCourseYear, setSelectedCourseYear] = useState<string>('');
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
      const years = Array.from(
        new Set(
          students
            .filter((student) => student.course.courseName === selectedCourse)
            .flatMap((student) => student.academicDetails.map((detail) => detail.courseYear))
        )
      );
      setCourseYears(years);
      setSelectedCourseYear('');
      setFormData((prev) => ({ ...prev, studentAcademicId: '' }));
    }
  }, [selectedCourse, students]);

  useEffect(() => {
    if (selectedCourse && selectedCourseYear) {
      const filtered = students
        .filter((student) => student.course.courseName === selectedCourse)
        .map((student) => {
          const matchingDetail = student.academicDetails.find(
            (detail) => detail.courseYear === selectedCourseYear
          );
          return matchingDetail ? { student, academicId: matchingDetail.id } : null;
        })
        .filter(Boolean) as { student: Student; academicId: number }[];

      setFilteredStudents(filtered);
    }
  }, [selectedCourse, selectedCourseYear, students]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
    await axiosInstance.post('/placements', {
      ...formData,
      CreatedBy: user?.name || 'admin', // ✅ send from body
    });

    toast.success('Placement added successfully!');
    setOpenModal(false);

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
  } catch (err) {
    console.error('Error adding placement:', err);
    toast.error('Error adding placement');
  }
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <form
            onSubmit={handleSubmit}
            className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md"
          >
            <h2 className="text-xl font-semibold text-blue-800 mb-4">Add New Placement</h2>

            <div className="space-y-4">
              <select
                name="course"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full p-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Course</option>
                {courses.map((course) => (
                  <option key={course} value={course}>{course}</option>
                ))}
              </select>

              <select
                name="courseYear"
                value={selectedCourseYear}
                onChange={(e) => setSelectedCourseYear(e.target.value)}
                className="w-full p-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={!selectedCourse}
              >
                <option value="">Select Course Year</option>
                {courseYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>

              <select
                name="studentAcademicId"
                onChange={handleChange}
                value={formData.studentAcademicId}
                required
                className="w-full p-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={!selectedCourseYear}
              >
                <option value="">Select Student</option>
                {filteredStudents.map(({ student, academicId }) => (
                  <option key={academicId} value={academicId}>
                    {student.fName} {student.lName || ''} ({student.course.courseName})
                  </option>
                ))}
              </select>

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
                onClick={() => setOpenModal(false)}
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