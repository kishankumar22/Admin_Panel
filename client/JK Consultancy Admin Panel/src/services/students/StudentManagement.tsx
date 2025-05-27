import { useState, useEffect } from 'react';
import axiosInstance from '../../config';
import { useAuth } from '../../context/AuthContext';
import { FaEdit, FaTrash, FaSearch, FaTimes, FaSpinner, FaFileExport, FaToggleOn, FaToggleOff } from 'react-icons/fa';
import AddStudentModal from '../students/AddStudentModal';
import EditStudentModal from '../students/EditStudentModal';
import DeleteConfirmationModal from '../students/DeleteConfirmationModal';
import StudentPaymentModal from '../students/StudentPaymentModal';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import PromoteStudentModal from './PromoteStudentModal';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';
import { FileSearch } from 'lucide-react';

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
  emiAmount: number;
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
  StudentId: string;
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
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [admissionModeFilter, setAdmissionModeFilter] = useState('');
    const [isFilterLoading, setIsFilterLoading] = useState(false); // Added for filter loader
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(50);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isToggleStatusModalOpen, setIsToggleStatusModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [currentStudentId, setCurrentStudentId] = useState<number | null>(null);
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [showLoading, setShowLoading] = useState(true);
    // Handle filtering with loader
  useEffect(() => {
    setIsFilterLoading(true); // Show filter loader
    students.filter(student => {
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
      const matchesCategory = !categoryFilter || student.category === categoryFilter;
      const matchesAdmissionMode = !admissionModeFilter || student.admissionMode === admissionModeFilter;

      const currentYear = new Date().getFullYear();
      const latestYearPrefix = `${currentYear}-${currentYear + 1}`;
      const matchesStatus = statusFilter === 'All' ||
        (statusFilter === 'Active' && student.status === true) ||
        (statusFilter === 'Inactive' && student.status === false) ||
        (statusFilter === 'isDiscontinue' && student.isDiscontinue === true) ||
        (statusFilter === 'Fresh Student' && latestAcademic.sessionYear === latestYearPrefix);

      return matchesSearch && matchesCourseYear && matchesCollege && matchesSessionYear &&
             matchesStatus && matchesCategory && matchesAdmissionMode;
    });

    // Simulate processing delay for filter loader
    setTimeout(() => {
      setIsFilterLoading(false);
    }, 100);
  }, [searchQuery, courseYearFilter, collegeFilter, sessionYearFilter, statusFilter, categoryFilter, admissionModeFilter, students]);

  const [yearFilter, setYearFilter] = useState('');
  const [filterOptions, setFilterOptions] = useState({
    courseYears: new Set<string>(),
    colleges: new Set<string>(),
    sessionYears: new Set<string>(),
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
        stdCollId: student.stdCollId,
        rollNumber: student.rollNumber || '',
        fName: student.fName || '',
        lName: student.lName || null,
        email: student.email || '',
        isDiscontinue: student.isDiscontinue,
        status: student.status,
        admissionMode: student.admissionMode,
        category: student.category || 'N/A',
        mobileNumber: student.mobileNumber || '',
        fatherName: student.fatherName || 'N/A',
        course: {
          courseName: student.course?.courseName || 'N/A',
        },
        college: {
          collegeName: student.college?.collegeName || 'N/A',
        },
        createdOn: student.createdOn || '',
        academicDetails: student.academicDetails || [],
        emiDetails: student.emiDetails || [],
      }));

      const courseYears = new Set<string>();
      const colleges = new Set<string>();
      const sessionYears = new Set<string>();
      const categories = new Set<string>();
      const admissionModes = new Set<string>();

      formattedStudents.forEach(student => {
        colleges.add(student.college.collegeName);
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
        categories: new Set([...categories].sort()),
        admissionModes: new Set([...admissionModes].sort()),
      });

      setStudents(formattedStudents);

      // Set default session year to 2025-2026 based on current date (May 16, 2025)
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth(); // 0 = Jan … 6 = Jul

      const sessionStartYear = month >= 6 ? year : year - 1; // Jul – Dec ⇒ same year, Jan – Jun ⇒ previous year
      const sessionEndYear = sessionStartYear + 1;

      const currentSessionYear = `${sessionStartYear}-${sessionEndYear}`;
      setSessionYearFilter(currentSessionYear);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch students');
      console.error('Fetch error:', err);
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 200);
      const minLoadingTime = setTimeout(() => {
        setShowLoading(false);
      }, 200);
      return () => clearTimeout(minLoadingTime);
    }
  };

  const handlePromoteClick = (studentId: number) => {
    setSelectedStudentId(studentId);
    setIsPromoteModalOpen(true);
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

  const handleToggleStatusClick = (studentId: number) => {
    if (isNaN(studentId)) {
      setError('Invalid student ID.');
      return;
    }
    setCurrentStudentId(studentId);
    setIsToggleStatusModalOpen(true);
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

  const handleToggleStatusConfirm = async () => {
    if (!currentStudentId) return;

    try {
      const modifiedBy = user?.name || 'Admin';
      const response = await axiosInstance.put(`/students/toggle-status/${currentStudentId}`, { modifiedBy });
      
      if (response.status === 200) {
        toast.success('Student status updated successfully');
        fetchStudents();
        setIsToggleStatusModalOpen(false);
        setError('');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update student status');
      toast.error(err.response?.data?.message || 'Failed to update student status');
      console.error('Toggle status error:', err);
    }
  };

  const exportToExcel = () => {
    if (filteredStudents.length === 0) {
      toast.warning('No data to export');
      return;
    }
    const dataToExport = filteredStudents.map((student, index) => {
      const latestAcademic = student.academicDetails
        .sort((a, b) => new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime())[0] || {};

      return {
        '#': index + 1,
        'Name': `${student.fName} ${student.lName || ''}`,
        'Roll No': student.rollNumber,
        'College ID': student.stdCollId || 'N/A',
        'Email': student.email,
        'Course': student.course?.courseName || 'N/A',
        'College': student.college?.collegeName || 'N/A',
        'Year': latestAcademic.courseYear || 'N/A',
        'Session': latestAcademic.sessionYear || 'N/A',
        'Mobile': student.mobileNumber,
        'Discontinue': student.isDiscontinue ? 'Yes' : 'No',
        'Status': student.status ? 'Active' : 'Inactive',
        'Admission': student.admissionMode,
        'Category': student.category,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    XLSX.writeFile(workbook, 'Student_List.xlsx');
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCourseYearFilter('');
    setCollegeFilter('');
    setSessionYearFilter('');
    setStatusFilter('All');
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
    const matchesCategory = !categoryFilter || student.category === categoryFilter;
    const matchesAdmissionMode = !admissionModeFilter || student.admissionMode === admissionModeFilter;

    const currentYear = new Date().getFullYear();
    const latestYearPrefix = `${currentYear}-${currentYear + 1}`;
    const matchesStatus = statusFilter === 'All' || 
      (statusFilter === 'Active' && student.status === true) ||
      (statusFilter === 'Inactive' && student.status === false) ||
      (statusFilter === 'isDiscontinue' && student.isDiscontinue === true) ||
      (statusFilter === 'Fresh Student' && latestAcademic.sessionYear === latestYearPrefix);

    return matchesSearch && matchesCourseYear && matchesCollege && matchesSessionYear && 
           matchesStatus && matchesCategory && matchesAdmissionMode;
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

  // Toggle Status Modal Component
  const ToggleStatusModal: React.FC<{
    onClose: () => void;
    onConfirm: () => void;
    message: string;
  }> = ({ onClose, onConfirm, message }) => {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 bg bg-yellow-500 rounded p-2">Change Status</h2>
          <p className="text-gray-600 mb-6 text-ellipsis ">{message}</p>
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-green-800 rounded-md hover:bg-green-300 transition duration-150"
            >
              No
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-150"
            >
              Yes
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading || showLoading) {
    return (
      <div className="flex justify-center -m-4 items-center h-screen bg-gradient-to-br from-blue-200 via-purple-100 to-pink-100">
        <div className="flex flex-col items-center">
          <FaSpinner className="animate-spin text-4xl text-purple-600" />
          <div className="text-xl font-semibold text-purple-700">Loading, please wait...</div>
        </div>
      </div>
    );
  }

  if (error) return <div className="text-[10px] text-red-500 p-2">{error}</div>;

  return (
    <>
      <Breadcrumb pageName="Student List" />
      <div className="">
        <div className="p-2 mt-2 mb-2 bg-gradient-to-r from-purple-100 to-indigo-100 rounded shadow-md">
          <div className="mb-1">
            <div className="flex justify-between items-center text-blue-800 text-[14px]">
              <span className="flex items-center">
                Number of Students: <b className="text-base ml-0.5">{filteredStudents.length}</b>
              </span>
              <div className="flex items-center">
                Status : 
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="ml-0.5 border rounded-md p-1.5 text-[14px] bg-white focus:ring-2 focus:border-blue-500 w-28"
                >
                  <option value="All">All</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="isDiscontinue">Discontinued</option>
                  <option value="Fresh Student">Fresh Student</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-around items-center gap-1">
            <div className="grid grid-cols-1 sm:grid-cols-5 md:grid-cols-9 gap-2 w-full sm:w-auto flex-wrap">
              <div className="relative col-span-1">
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-5 pr-1 py-0.5 border rounded-md text-[14px] w-full focus:ring-4 focus:border-blue-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <FaSearch className="absolute left-1.5 top-2.5 text-black text-[12px]" />
              </div>

              <select
                value={courseYearFilter}
                onChange={(e) => setCourseYearFilter(e.target.value)}
                className="border rounded-md p-0.5 text-[14px] w-full focus:ring-4 focus:border-blue-500 col-span-1"
              >
                <option value="">Course Year</option>
                {[...filterOptions.courseYears].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>

              <select
                value={collegeFilter}
                onChange={(e) => setCollegeFilter(e.target.value)}
                className="border rounded-md p-0.5 text-[14px] w-full focus:ring-4 focus:border-blue-500 col-span-1"
              >
                <option value="">College</option>
                {[...filterOptions.colleges].map(college => (
                  <option key={college} value={college}>{college}</option>
                ))}
              </select>

              <select
                value={sessionYearFilter}
                onChange={(e) => setSessionYearFilter(e.target.value)}
                className="border rounded-md p-0.5 text-[14px] w-full focus:ring-4 focus:border-blue-500 col-span-1"
              >
                <option value="">Session Year</option>
                {[...filterOptions.sessionYears].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="border rounded-md p-0.5 text-[14px] w-full focus:ring-4 focus:border-blue-500 col-span-1"
              >
                <option value="">Category</option>
                {['Gen', 'OBC', 'SC', 'ST'].filter(cat => filterOptions.categories.has(cat)).map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>

              <select
                value={admissionModeFilter}
                onChange={(e) => setAdmissionModeFilter(e.target.value)}
                className="border rounded-md p-0.5 text-[14px] w-full focus:ring-4 focus:border-blue-500 col-span-1"
              >
                <option value="">Admission Mode</option>
                {[...filterOptions.admissionModes].map(mode => (
                  <option key={mode} value={mode}>{mode}</option>
                ))}
              </select>

              <div className="col-span-1 flex space-x-0.5">
                <button
                  onClick={clearFilters}
                  className="bg-red-50 text-red-500 text-[12px] px-2 p-0.5 rounded-md border border-red-200 focus:ring-4 focus:ring-red-300 focus:outline-none hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors duration-150 flex items-center flex-1"
                >
                  <FaTimes className="w-4 h-4 mr-1" /> Clear Filter
                </button>
              </div>

              <div className="col-span-1">
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="bg-blue-500 text-white px-1 py-0.5 rounded-md text-[12px] hover:bg-blue-600 w-full focus:ring-0 focus:border-blue-500"
                >
                  Add Student
                </button>
              </div>

              <div className="col-span-1">
                <button
                  onClick={exportToExcel}
                  className="bg-green-500 text-white px-1 py-0.5 rounded-md text-[12px] hover:bg-green-600 w-full focus:ring-0 focus:border-green-500 flex items-center justify-center"
                >
                  <FaFileExport className="w-4 h-4 mr-1" /> Export to Excel
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg shadow-lg">
          <table className="min-w-full bg-white text-xs sm:text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
                <th className="py-2 px-2 font-medium text-center">#</th>
                <th className="py-2 px-2 font-medium text-left">Name</th>
                <th className="py-2 px-2 font-medium text-center">Roll No</th>
                <th className="py-2 px-2 font-medium text-center">College ID</th>
                <th className="py-2 px-2 font-medium text-left">Email</th>
                <th className="py-2 px-2 font-medium text-left">Course</th>
                <th className="py-2 px-2 font-medium text-left">College</th>
                <th className="py-2 px-2 font-medium text-center">Year</th>
                <th className="py-2 px-2 font-medium text-center">Session</th>
                <th className="py-2 px-2 font-medium text-center">Mobile</th>
                <th className="py-2 px-2 font-medium text-center">Discontinue</th>
                <th className="py-2 px-2 font-medium text-center">Status</th>
                <th className="py-2 px-2 font-medium text-left">Admission</th>
                <th className="py-2 px-2 font-medium text-center">Category</th>
                <th className="py-2 px-2 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isFilterLoading ? (
                <tr>
                  <td colSpan={15} className="py-4 text-center text-gray-500 bg-gray-50">
                    <div className="flex flex-col items-center justify-center min-h-[300px] bg-gray-50 border-t border-gray-200">
                      <FaSpinner className="animate-spin h-8 w-8 text-indigo-600 mb-3" />
                      <p className="text-sm font-medium text-gray-600">Loading students...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedStudents.length > 0 ? (
                paginatedStudents.map((student, index) => {
                  const latestAcademic = student.academicDetails
                    .sort((a, b) => new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime())[0] || {};

                  const rowClass = index % 2 === 0 ? "bg-white" : "bg-gray-50";

                  return (
                    <tr key={student.id} className={`${rowClass} hover:bg-blue-50 transition duration-150`}>
                      <td className="py-2 px-2 text-center font-medium text-gray-700">{(currentPage - 1) * entriesPerPage + index + 1}</td>
                      <td className="py-2 px-2 font-medium text-gray-800 whitespace-nowrap">{student.fName} {student.lName || ''}</td>
                      <td className="py-2 px-2 text-center text-gray-700">{student.rollNumber}</td>
                      <td className="py-2 px-2 text-center text-gray-700">{student.stdCollId}</td>
                      <td className="py-2 px-2 whitespace-nowrap truncate max-w-[150px] text-blue-600">{student.email}</td>
                      <td className="py-2 px-2 font-medium whitespace-nowrap truncate max-w-[120px]">{student.course?.courseName || 'N/A'}</td>
                      <td className="py-2 px-2 whitespace-nowrap truncate max-w-[120px]">{student.college?.collegeName || 'N/A'}</td>
                      <td className="py-2 px-2 text-center">{latestAcademic.courseYear || 'N/A'}</td>
                      <td className="py-2 px-2 text-center">{latestAcademic.sessionYear || 'N/A'}</td>
                      <td className="py-2 px-2 text-center">{student.mobileNumber}</td>
                      <td className="py-2 px-2 text-center">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${student.isDiscontinue ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {student.isDiscontinue ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${student.status ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                          {student.status ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-2 px-2 whitespace-nowrap truncate max-w-[100px]">{student.admissionMode}</td>
                      <td className="py-2 px-2 text-center font-medium">{student.category}</td>
                      <td className="py-2 px-2">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handlePromoteClick(student.id)}
                            type='button'
                            title="Promote Student"
                            className="px-2 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 transition duration-150 flex items-center justify-center"
                          >
                            Promote
                          </button>
                          <button
                            onClick={() => handleEditClick(student.id)}
                            className="p-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition duration-150 flex items-center justify-center"
                            title="Edit"
                            type='button'
                          >
                            <FaEdit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(student.id)}
                            className="p-1 hidden bg-red-100 text-red-700 rounded hover:bg-red-200 transition duration-150 items-center justify-center"
                            title="Delete"
                          >
                            <FaTrash className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleStatusClick(student.id)}
                            className={`p-1 rounded transition duration-150 flex items-center justify-center ${student.status ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                            title="Active/Inactive"
                          >
                            {student.status ? (
                              <FaToggleOn className="w-3.5 h-3.5" />
                            ) : (
                              <FaToggleOff className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={15} className="py-4 text-center text-gray-500 bg-gray-50">
                    <div className="flex flex-col items-center justify-center min-h-[300px] bg-gray-50 border-t border-gray-200">
                      <div className="mb-3">
                        <FileSearch className="h-8 w-8 text-gray-400 animate-pulse" />
                      </div>
                      <p className="text-sm font-medium text-gray-600 mb-1">No Students records found</p>
                      <p className="text-xs text-gray-400 text-center px-4">
                        Try adjusting your filters or check back later
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center mt-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-700 font-medium flex items-center">
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
              </svg>
              Entries per page:
            </span>
            <select
              value={entriesPerPage}
              onChange={(e) => {
                setEntriesPerPage(parseInt(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={75}>75</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex items-center gap-3 mt-3 md:mt-0">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-500 text-sm flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
              </svg>
              Previous
            </button>

            <span className="text-gray-700 font-medium flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-500 text-sm flex items-center"
            >
              Next
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
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

        {isToggleStatusModalOpen && (
          <ToggleStatusModal
            onClose={() => {
              setIsToggleStatusModalOpen(false);
              setCurrentStudentId(null);
            }}
            onConfirm={handleToggleStatusConfirm}
            message="Are you sure you want to change  the status of this student?"
          />
        )}

        {isPromoteModalOpen && selectedStudentId && (
          <PromoteStudentModal
            studentId={selectedStudentId}
            onClose={() => setIsPromoteModalOpen(false)}
            onSuccess={() => {
              setIsPromoteModalOpen(false);
              fetchStudents();
            }}
            modifiedBy={user?.name || 'Admin'}
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
              fetchStudents();
            }}
          />
        )}
      </div>
    </>
  );
};

export default StudentManagement;