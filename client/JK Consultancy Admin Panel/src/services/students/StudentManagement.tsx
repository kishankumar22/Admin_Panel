import { useState, useEffect } from 'react';
import axiosInstance from '../../config';
import { useAuth } from '../../context/AuthContext';
import { FaEdit, FaTrash, FaSearch, FaTimes } from 'react-icons/fa';
import AddStudentModal from '../students/AddStudentModal';
import EditStudentModal from '../students/EditStudentModal';
import DeleteConfirmationModal from '../students/DeleteConfirmationModal';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';

interface AcademicDetail {
  id: number;
  studentId: number;
  sessionYear: string;
  paymentMode: string;
  adminAmount: number;
  feesAmount: number;
  numberOfEMI: number | null;
  ledgerNumber: string | null;
  courseYear: string;
  createdBy: string;
  createdOn: string;
  modifiedBy: string | null;
  modifiedOn: string | null;
}

interface Student {
  isDiscontinue:boolean
  id: number;
  rollNumber: string;
  fName: string;
  lName: string | null;
  email: string;
  mobileNumber: string;
  course: {
    courseName: string;
  };
  college: {
    collegeName: string;
  };
  createdOn: string;
  academicDetails: AcademicDetail[];
}

const StudentManagement: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [courseYearFilter, setCourseYearFilter] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [sessionYearFilter, setSessionYearFilter] = useState('');
  const [emailFilter, setEmailFilter] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentStudentId, setCurrentStudentId] = useState<number | null>(null);
  const [filterOptions, setFilterOptions] = useState({
    courseYears: new Set<string>(),
    colleges: new Set<string>(),
    sessionYears: new Set<string>(),
    emails: new Set<string>(),
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axiosInstance.get('/students');
      const formattedStudents: Student[] = response.data.map((student: any) => ({
        id: student.id,
        rollNumber: student.rollNumber || '',
        fName: student.fName || '',
        lName: student.lName || null,
        email: student.email || '',
        isDiscontinue:student.isDiscontinue,
        mobileNumber: student.mobileNumber || '',
        course: {
          courseName: student.course?.courseName || 'N/A',
        },
        college: {
          collegeName: student.college?.collegeName || 'N/A',
        },
        createdOn: student.createdOn || '',
        academicDetails: student.academicDetails || [],
      }));

      // Extract unique filter options (only latest academic details)
      const courseYears = new Set<string>();
      const sessionYears = new Set<string>();
      const colleges = new Set<string>();
      const emails = new Set<string>();

      formattedStudents.forEach(student => {
        colleges.add(student.college.collegeName);
        emails.add(student.email);
        const latestAcademic = student.academicDetails
          .sort((a, b) => new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime())[0] || {};
        if (latestAcademic.courseYear) courseYears.add(latestAcademic.courseYear);
        if (latestAcademic.sessionYear) sessionYears.add(latestAcademic.sessionYear);
      });

      setFilterOptions({
        courseYears: new Set([...courseYears].sort()),
        colleges: new Set([...colleges].sort()),
        sessionYears: new Set([...sessionYears].sort()),
        emails: new Set([...emails].sort()),
      });

      setStudents(formattedStudents);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch students');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (studentId: number) => {
    if (isNaN(studentId)) {
      setError('Invalid student ID. ID must be a number.');
      return;
    }
    setCurrentStudentId(studentId);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (studentId: number) => {
    if (isNaN(studentId)) {
      setError('Invalid student ID. ID must be a number.');
      return;
    }
    setCurrentStudentId(studentId);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!currentStudentId) return;

    try {
      await axiosInstance.delete(`/students/${currentStudentId}`);
      fetchStudents();
      setIsDeleteModalOpen(false);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete student');
      console.error('Delete error:', err);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCourseYearFilter('');
    setCollegeFilter('');
    setSessionYearFilter('');
    setEmailFilter('');
  };

  const filteredStudents = students.filter(student => {
    // Get the latest academic details for this student
    const latestAcademic = student.academicDetails
      .sort((a, b) => new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime())[0] || {};

    const matchesSearch = [
      student.fName,
      student.lName,
      student.rollNumber,
      student.email,
      student.mobileNumber,
    ].some(field => field?.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCourseYear = !courseYearFilter || 
      latestAcademic.courseYear === courseYearFilter;

    const matchesCollege = !collegeFilter || student.college.collegeName === collegeFilter;

    const matchesSessionYear = !sessionYearFilter || 
      latestAcademic.sessionYear === sessionYearFilter;

    const matchesEmail = !emailFilter || student.email.toLowerCase().includes(emailFilter.toLowerCase());

    return matchesSearch && matchesCourseYear && matchesCollege && matchesSessionYear && matchesEmail;
  });

  if (loading) return <div className="text-xs text-gray-500 p-2">Loading...</div>;
  if (error) return <div className="text-xs text-red-500 p-2">{error}</div>;

  return (

    <>
   <Breadcrumb pageName="Student List " />
   <div>
    <span className='text-blue-800'> Total Student : <b className='text-xl'>{students.length}</b></span>
    <span className='text-blue-800'> Status :  1. fresh 2. category 3. discontinue</span>
   </div>
    <div className="p-2 max-w-full mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-center mb-2 gap-2">
        {/* <h1 className="text-sm font-bold">Student Management</h1> */}
        <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-2 w-full md:w-auto">
          <div className="relative w-full md:w-auto">
            <input
              type="text"
              placeholder="Search by name, roll no, mobile..."
              className="pl-6 pr-2 py-1 border rounded-md text-xs "
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <FaSearch className="absolute left-2 top-1.5 text-gray-400 text-xs" />
            
          </div>

          <select
            value={courseYearFilter}
            onChange={(e) => setCourseYearFilter(e.target.value)}
            className="border rounded-md p-1 text-xs w-full md:w-auto"
          >
            <option value="">All Course Years</option>
            {[...filterOptions.courseYears].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          <select
            value={collegeFilter}
            onChange={(e) => setCollegeFilter(e.target.value)}
            className="border rounded-md p-1 text-xs w-full md:w-auto"
          >
            <option value="">All Colleges</option>
            {[...filterOptions.colleges].map(college => (
              <option key={college} value={college}>{college}</option>
            ))}
          </select>

          <select
            value={sessionYearFilter}
            onChange={(e) => setSessionYearFilter(e.target.value)}
            className="border rounded-md p-1 text-xs w-full md:w-auto"
          >
            <option value="">All Session Years</option>
            {[...filterOptions.sessionYears].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Filter by email..."
            value={emailFilter}
            onChange={(e) => setEmailFilter(e.target.value)}
            className="border rounded-md p-1 text-xs w-full md:w-auto"
          />

          <button
            onClick={clearFilters}
            className="bg-gray-500 text-white p-1 rounded-md text-xs hover:bg-gray-600 flex items-center"
          >
            <FaTimes className="mr-1" /> Clear Filters
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-500 text-white px-2 py-1 rounded-md text-xs hover:bg-blue-600 w-full md:w-auto"
          >
            Add Student
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border rounded-lg overflow-hidden">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-1 px-2 border text-xs">#</th>
              <th className="py-1 px-2 border text-xs">Name</th>
              <th className="py-1 px-2 border text-xs">Roll No</th>
              <th className="py-1 px-2 border text-xs">Email</th>
              <th className="py-1 px-2 border text-xs">Course</th>
              <th className="py-1 px-2 border text-xs">College</th>
              <th className="py-1 px-2 border text-xs">Course Year</th>
              <th className="py-1 px-2 border text-xs">Session Year</th>
              <th className="py-1 px-2 border text-xs">Mobile</th>
              <th className="py-1 px-2 border text-xs">is discontinue</th>
              <th className="py-1 px-2 border text-xs">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student, index) => {
                const latestAcademic = student.academicDetails
                  .sort((a, b) => new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime())[0] || {};

                return (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="py-1 px-2 border text-center text-xs">{index + 1}</td>
                    <td className="py-1 px-2 border text-xs">{student.fName} {student.lName || ''}</td>
                    <td className="py-1 px-2 border text-center text-xs">{student.rollNumber}</td>
                    <td className="py-1 px-2 border text-xs">{student.email}</td>
                    <td className="py-1 px-2 border text-xs">{student.course?.courseName || 'N/A'}</td>
                    <td className="py-1 px-2 border text-xs">{student.college?.collegeName || 'N/A'}</td>
                    <td className="py-1 px-2 border text-xs">{latestAcademic.courseYear || 'N/A'}</td>
                    <td className="py-1 px-2 border text-xs">{latestAcademic.sessionYear || 'N/A'}</td>
                    <td className="py-1 px-2 border text-xs">{student.mobileNumber}</td>
                    <td className="py-1 px-2 border text-xs">{student.isDiscontinue}</td>
                    <td className="py-1 px-2 border text-center">
                      <div className="flex justify-center space-x-1">
                        <button
                          onClick={() => handleEditClick(student.id)}
                          className="text-blue-500 hover:text-blue-700 text-xs"
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(student.id)}
                          className="text-red-500 hover:text-red-700 text-xs"
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={10} className="py-2 text-center text-xs text-gray-500">
                  No students found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isAddModalOpen && (
        <AddStudentModal
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            setIsAddModalOpen(false);
            fetchStudents();
          }}
          createdBy={user?.name || 'Admin'}
        />
      )}

      {isEditModalOpen && currentStudentId !== null && (
        <EditStudentModal
          studentId={currentStudentId}
          onClose={() => {
            setIsEditModalOpen(false);
            setCurrentStudentId(null);
          }}
          onSuccess={() => {
            setIsEditModalOpen(false);
            fetchStudents();
            setCurrentStudentId(null);
          }}
          modifiedBy={user?.name || 'Admin'}
        />
      )}

      {isDeleteModalOpen && (
        <DeleteConfirmationModal
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteConfirm}
          message="Are you sure you want to delete this student? This action cannot be undone."
        />
      )}
    </div>
    </>
  );
};

export default StudentManagement;