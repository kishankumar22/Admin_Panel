import { useState, useEffect } from 'react';
import axiosInstance from '../../config';
import { useAuth } from '../../context/AuthContext';
import { FaEdit, FaTrash, FaSearch, FaTimes } from 'react-icons/fa'; // Added FaMoneyBill for payment icon
import AddStudentModal from '../students/AddStudentModal';
import EditStudentModal from '../students/EditStudentModal';
import DeleteConfirmationModal from '../students/DeleteConfirmationModal';
import StudentPaymentModal from '../students/StudentPaymentModal'; // New modal import
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';

interface EmiDetail {
  id: number;
  studentId: number;
  studentAcademicId: number;
  emiNumber: number;
  amount: number;
  dueDate: string;
  createdBy: string;
  createdOn: string;
  modifiedBy: string | null;
  modifiedOn: string | null;
}

interface AcademicDetail {
  id: number;
  emiAmount: number; // required
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
  emiDetails: EmiDetail[];
}

interface Student {
  id: number;
  rollNumber: string;
  fName: string;
  lName: string | null;
  email: string;
  mobileNumber: string;
  fatherName: string;
  status: boolean;
  isDiscontinue: boolean;
  admissionMode: string;
  category: string;
  gender: string;
  address: string;
  pincode: string;
  dob: string;
  admissionDate: string;
  discontinueBy: string | null;
  stdCollId?: string;
  course: {
    courseName: string;
    id?: number;
  };
  college: {
    collegeName: string;
    id?: number;
  };
  academicDetails: AcademicDetail[];
  emiDetails: EmiDetail[];
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
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [admissionModeFilter, setAdmissionModeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false); // New state for payment modal
  const [currentStudentId, setCurrentStudentId] = useState<number | null>(null);
const [yearFilter, setYearFilter] = useState('');
  const [filterOptions, setFilterOptions] = useState({
    courseYears: new Set<string>(),
    colleges: new Set<string>(),
    sessionYears: new Set<string>(),
    emails: new Set<string>(),
    categories: new Set<string>(),
    admissionModes: new Set<string>(),
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
        isDiscontinue: student.isDiscontinue,
        status: student.status,
        admissionMode: student.admissionMode,
        category: student.category || 'N/A',
        mobileNumber: student.mobileNumber || '',
        fatherName: student.fatherName || 'N/A', // Added fatherName
        course: {
          courseName: student.course?.courseName || 'N/A',
        },
        college: {
          collegeName: student.college?.collegeName || 'N/A',
        },
        createdOn: student.createdOn || '',
        academicDetails: student.academicDetails || [],
        emiDetails: student.emiDetails || [], // Added emiDetails
      }));

      const courseYears = new Set<string>();
      const colleges = new Set<string>();
      const sessionYears = new Set<string>();
      const emails = new Set<string>();
      const categories = new Set<string>();
      const admissionModes = new Set<string>();

      formattedStudents.forEach(student => {
        colleges.add(student.college.collegeName);
        emails.add(student.email);
        categories.add(student.category);
        admissionModes.add(student.admissionMode);
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
        categories: new Set([...categories].sort()),
        admissionModes: new Set([...admissionModes].sort()),
      });

      setStudents(formattedStudents);

      const currentYear = new Date().getFullYear();
      const currentSessionYear = `${currentYear}-${currentYear + 1}`;
      setSessionYearFilter(currentSessionYear);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch students');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (studentId: number) => {
    if (isNaN(studentId)) {
      setError('Invalid student ID.');
      return;
    }
    setCurrentStudentId(studentId);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (studentId: number) => {
    if (isNaN(studentId)) {
      setError('Invalid student ID.');
      return;
    }
    setCurrentStudentId(studentId);
    setIsDeleteModalOpen(true);
  };

  // const handlePaymentClick = (studentId: number) => {
  //   if (isNaN(studentId)) {
  //     setError('Invalid student ID.');
  //     return;
  //   }
  //   setCurrentStudentId(studentId);
  //   setIsPaymentModalOpen(true);
  // };

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
    setStatusFilter('');
    setCategoryFilter('');
    setAdmissionModeFilter('');
    setCurrentPage(1);
  };

  const filteredStudents = students.filter(student => {
    const latestAcademic = student.academicDetails
      .sort((a, b) => new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime())[0] || {};

    const matchesSearch = [
      student.fName,
      student.lName,
      student.rollNumber,
      student.email,
      student.mobileNumber,
    ].some(field => field?.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCourseYear = !courseYearFilter || latestAcademic.courseYear === courseYearFilter;
    const matchesCollege = !collegeFilter || student.college.collegeName === collegeFilter;
    const matchesSessionYear = !sessionYearFilter || latestAcademic.sessionYear === sessionYearFilter;
    const matchesEmail = !emailFilter || student.email.toLowerCase().includes(emailFilter.toLowerCase());
    const matchesCategory = !categoryFilter || student.category === categoryFilter;
    const matchesAdmissionMode = !admissionModeFilter || student.admissionMode === admissionModeFilter;

    const currentYear = new Date().getFullYear();
    const latestYearPrefix = `${currentYear}-${currentYear + 1}`;
    const matchesStatus = !statusFilter || 
      (statusFilter === 'Status' && student.status === true) ||
      (statusFilter === 'StatusIn' && student.status === false) ||
      (statusFilter === 'isDiscontinue' && student.isDiscontinue === true) ||
      (statusFilter === 'Fresh Student' && latestAcademic.sessionYear === latestYearPrefix);

    return matchesSearch && matchesCourseYear && matchesCollege && matchesSessionYear && 
           matchesEmail && matchesStatus && matchesCategory && matchesAdmissionMode;
  });

  const totalEntries = filteredStudents.length;
  const totalPages = Math.ceil(totalEntries / entriesPerPage);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * entriesPerPage,
    currentPage * entriesPerPage
  );

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  if (loading) return <div className="text-[10px] text-black p-2">Loading...</div>;
  if (error) return <div className="text-[10px] text-red-500 p-2">{error}</div>;

  return (
    <>
      <Breadcrumb pageName="Student List" />
      <div className="">
      <div className="p-2 mb-2 bg-gray-50 rounded-lg shadow-md">
  <div className="mb-1">
    <div className="flex justify-between items-center text-blue-800 text-[10px]">
      <span className="flex items-center">
        Total Students: <b className="text-base ml-0.5">{students.length}</b>
      </span>
      <div className="flex items-center">
        Status : 
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="ml-0.5 border rounded-md p-1.5 text-[10px] bg-white focus:ring-2 focus:border-blue-500 w-28"
        >
          <option value="">Active</option>
          <option value="StatusIn">Inactive</option>
          <option value="isDiscontinue">isDiscontinue</option>
          <option value="Fresh Student">Fresh Student</option>
        </select>
      </div>
    </div>
  </div>

  <div className="flex flex-col sm:flex-row justify-around items-center gap-1">
    <div className="grid  grid-cols-1 sm:grid-cols-5 md:grid-cols-10 gap-2 w-full sm:w-auto flex-wrap">
      {/* First Row (5 columns) */}
      <div className="relative col-span-1">
        <input
          type="text"
          placeholder="Search..."
          className="pl-5 pr-1 py-0.5 border rounded-md text-[10px] w-full focus:ring-4 focus:border-blue-500"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <FaSearch className="absolute left-1.5 top-2.5 text-black text-[10px]" />
      </div>

      <select
        value={courseYearFilter}
        onChange={(e) => setCourseYearFilter(e.target.value)}
        className="border rounded-md p-0.5 text-[10px] w-full focus:ring-4 focus:border-blue-500 col-span-1"
      >
        <option value="">Course Year</option>
        {[...filterOptions.courseYears].map(year => (
          <option key={year} value={year}>{year}</option>
        ))}
      </select>

      <select
        value={collegeFilter}
        onChange={(e) => setCollegeFilter(e.target.value)}
        className="border rounded-md p-0.5 text-[10px] w-full focus:ring-4 focus:border-blue-500 col-span-1"
      >
        <option value="">College</option>
        {[...filterOptions.colleges].map(college => (
          <option key={college} value={college}>{college}</option>
        ))}
      </select>

      <select
        value={sessionYearFilter}
        onChange={(e) => setSessionYearFilter(e.target.value)}
        className="border rounded-md p-0.5 text-[10px] w-full focus:ring-4 focus:border-blue-500 col-span-1"
      >
        <option value="">Session Year</option>
        {[...filterOptions.sessionYears].map(year => (
          <option key={year} value={year}>{year}</option>
        ))}
      </select>

      <select
        value={categoryFilter}
        onChange={(e) => setCategoryFilter(e.target.value)}
        className="border rounded-md p-0.5 text-[10px] w-full focus:ring-4 focus:border-blue-500 col-span-1"
      >
        <option value="">Category</option>
        {['Gen', 'OBC', 'SC', 'ST'].filter(cat => filterOptions.categories.has(cat)).map(category => (
          <option key={category} value={category}>{category}</option>
        ))}
      </select>

      {/* Second Row (5 columns) */}
      <select
        value={admissionModeFilter}
        onChange={(e) => setAdmissionModeFilter(e.target.value)}
        className="border rounded-md p-0.5 text-[10px] w-full focus:ring-4 focus:border-blue-500 col-span-1"
      >
        <option value="">Admission Mode</option>
        {[...filterOptions.admissionModes].map(mode => (
          <option key={mode} value={mode}>{mode}</option>
        ))}
      </select>

      <select
        value={emailFilter}
        onChange={(e) => setEmailFilter(e.target.value)}
        className="border rounded-md p-0.5 text-[10px] w-full focus:ring-4 focus:border-blue-500 col-span-1"
      >
        <option value="">Email</option>
        {[...filterOptions.emails].map(email => (
          <option key={email} value={email}>{email}</option>
        ))}
      </select>

      <div className="col-span-1 flex space-x-0.5">
        <button
          onClick={clearFilters}
          className="bg-blue-300  text-emerald-800 text-[12px] px-1 p-0.5 rounded-md  focus:ring-4 focus:border-blue-500 hover:text-red-400 hover:bg-blue-400 flex items-center flex-1"
        >
          <FaTimes className="w-5 h-5 " /> Clear Filter 
        </button>
      </div>

      <div className="col-span-2">
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-blue-500 text-white px-1 py-0.5 rounded-md text-[10px] hover:bg-blue-600 w-full focus:ring-0 focus:border-blue-500"
        >
          Add Student
        </button>
      </div>

    </div>
  </div>
</div>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border rounded-lg text-[10px] text-black">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-1 px-2 border font-medium">#</th>
                <th className="py-1 px-2 border font-medium">Name</th>
                <th className="py-1 px-2 border font-medium">Roll No</th>
                <th className="py-1 px-2 border font-medium">Email</th>
                <th className="py-1 px-2 border font-medium">Course</th>
                <th className="py-1 px-2 border font-medium">College</th>
                <th className="py-1 px-2 border font-medium">Year</th>
                <th className="py-1 px-2 border font-medium">Session</th>
                <th className="py-1 px-2 border font-medium">Mobile</th>
                <th className="py-1 px-2 border font-medium">Discont.</th>
                <th className="py-1 px-2 border font-medium">Status</th>
                <th className="py-1 px-2 border font-medium">Mode</th>
                <th className="py-1 px-2 border font-medium">Category</th>
                <th className="py-1 px-2 border font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStudents.length > 0 ? (
                paginatedStudents.map((student, index) => {
                  const latestAcademic = student.academicDetails
                    .sort((a, b) => new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime())[0] || {};

                  return (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="py-1 px-2 border text-center">{(currentPage - 1) * entriesPerPage + index + 1}</td>
                      <td className="py-1 px-2 border">{student.fName} {student.lName || ''}</td>
                      <td className="py-1 px-2 border text-center">{student.rollNumber}</td>
                      <td className="py-1 px-2 border">{student.email}</td>
                      <td className="py-1 px-2 border">{student.course?.courseName || 'N/A'}</td>
                      <td className="py-1 px-2 border">{student.college?.collegeName || 'N/A'}</td>
                      <td className="py-1 px-2 border">{latestAcademic.courseYear || 'N/A'}</td>
                      <td className="py-1 px-2 border">{latestAcademic.sessionYear || 'N/A'}</td>
                      <td className="py-1 px-2 border">{student.mobileNumber}</td>
                      <td className="py-1 px-2 border text-center">{student.isDiscontinue ? 'Yes' : 'No'}</td>
                      <td className="py-1 px-2 border text-center">{student.status ? 'Active' : 'Inactive'}</td>
                      <td className="py-1 px-2 border">{student.admissionMode}</td>
                      <td className="py-1 px-2 border">{student.category}</td>
                      <td className="py-1 px-2 border text-center">
                        <div className="flex justify-center space-x-1">
                          <button
                            onClick={() => handleEditClick(student.id)}
                            className="text-blue-500 hover:text-blue-700"
                            title="Edit"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(student.id)}
                            className="text-red-500 hover:text-red-700"
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                          {/* <button
                            onClick={() => handlePaymentClick(student.id)}
                            className="text-green-500 hover:text-green-700"
                            title="Payment Details"
                          >
                            <FaMoneyBill />
                          </button> */}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={14} className="py-2 text-center text-[10px] text-black">
                    No students found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center mt-2 text-[10px]">
          <div className="flex items-center space-x-2">
            <span>Entries per page:</span>
            <select
              value={entriesPerPage}
              onChange={(e) => {
                setEntriesPerPage(parseInt(e.target.value));
                setCurrentPage(1);
              }}
              className="border rounded-md p-2 text-[10px] focus:ring-2 focus:border-blue-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div className="flex items-center space-x-2 mt-2 md:mt-0">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-2 py-0.5 bg-gray-300 rounded-md disabled:bg-gray-200"
            >
              Previous
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-2 py-0.5 bg-gray-300 rounded-md disabled:bg-gray-200"
            >
              Next
            </button>
          </div>
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

{isPaymentModalOpen && currentStudentId !== null && (
  <StudentPaymentModal
    studentId={currentStudentId}
    students={students}
    sessionYearFilter={sessionYearFilter}
    yearFilter={yearFilter}
    onClose={() => {
      setIsPaymentModalOpen(false);
      setCurrentStudentId(null);
      fetchStudents(); // Refresh student data after payment
    }}
  />
)}
      </div>
    </>
  );
};

export default StudentManagement;