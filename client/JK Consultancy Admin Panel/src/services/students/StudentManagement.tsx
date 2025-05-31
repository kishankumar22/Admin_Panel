import { useState, useEffect, useRef } from 'react';
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
import { useLocation } from 'react-router-dom';
import { usePermissions } from '../../context/PermissionsContext';

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
  const [courseNameFilter, setCourseNameFilter] = useState(''); // New state for course name filter
  const [collegeFilter, setCollegeFilter] = useState('');
  const [sessionYearFilter, setSessionYearFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [admissionModeFilter, setAdmissionModeFilter] = useState('');
  const [isFilterLoading, setIsFilterLoading] = useState(false);
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

  const {
      fetchRoles,
      fetchPages,
      fetchPermissions,

      pages,
      permissions,
    } = usePermissions();
  
    // Use useEffect to fetch data when the component mounts
    useEffect(() => {
      const fetchData = async () => {
        await fetchRoles();
        await fetchPages();
        await fetchPermissions();
      };
      fetchData();
    }, []);
    // Use useLocation to get the current path
    const location = useLocation();
    const currentPageName = location.pathname.split('/').pop();
    // console.log("currentPageName :", currentPageName);
  
    // Permissions and roles
    // Prefixing currentPageName with '/' to match the database format
    const prefixedPageUrl = `/${currentPageName}`;
    const pageId = pages.find((page: { pageUrl: string; }) => page.pageUrl === prefixedPageUrl)?.pageId;
    // const roleId = roles.find(role => role.role_id === user?.roleId)?.role_id;
    const userPermissions = permissions.find((perm: { pageId: any; roleId: number | undefined; }) => perm.pageId === pageId && perm.roleId === user?.roleId);
   const loggedroleId = user?.roleId;
  // Set default permissions based on role ID
  const defaultPermission = loggedroleId === 2;
  
  // Use provided permissions if available, otherwise fall back to defaultPermission
  const canCreate = userPermissions?.canCreate ?? defaultPermission;
  const canUpdate = userPermissions?.canUpdate ?? defaultPermission;
  const canDelete = userPermissions?.canDelete ?? defaultPermission;
  const canRead   = userPermissions?.canRead   ?? defaultPermission;

  // Refs for scroll container and table
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  // Handle filtering with loader
  useEffect(() => {
    setIsFilterLoading(true);
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
      const matchesCourseName = !courseNameFilter || student.course.courseName === courseNameFilter; // Added course name filter
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

      return matchesSearch && matchesCourseYear && matchesCourseName && matchesCollege && matchesSessionYear &&
             matchesStatus && matchesCategory && matchesAdmissionMode;
    });

    setTimeout(() => {
      setIsFilterLoading(false);
    }, 100);
  }, [searchQuery, courseYearFilter, courseNameFilter, collegeFilter, sessionYearFilter, statusFilter, categoryFilter, admissionModeFilter, students]);

  const [yearFilter, setYearFilter] = useState('');
  const [filterOptions, setFilterOptions] = useState({
    courseYears: new Set<string>(),
    courseNames: new Set<string>(), // New set for course names
    colleges: new Set<string>(),
    sessionYears: new Set<string>(),
    categories: new Set<string>(),
    admissionModes: new Set<string>(),
  });

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!tableContainerRef.current) return;

      const container = tableContainerRef.current;
      const scrollStep = 50;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          container.scrollLeft -= scrollStep;
          break;
        case 'ArrowRight':
          e.preventDefault();
          container.scrollLeft += scrollStep;
          break;
        case 'ArrowUp':
          e.preventDefault();
          container.scrollTop -= scrollStep;
          break;
        case 'ArrowDown':
          e.preventDefault();
          container.scrollTop += scrollStep;
          break;
      }
    };

    const container = tableContainerRef.current;
    if (container) {
      container.addEventListener('keydown', handleKeyDown);
      container.setAttribute('tabindex', '0');
    }

    return () => {
      if (container) {
        container.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, []);

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
      const courseNames = new Set<string>(); // New set for course names
      const colleges = new Set<string>();
      const sessionYears = new Set<string>();
      const categories = new Set<string>();
      const admissionModes = new Set<string>();

      formattedStudents.forEach(student => {
        courseNames.add(student.course.courseName); // Populate course names
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
        courseNames: new Set([...courseNames].sort()), // Add sorted course names to filter options
        colleges: new Set([...colleges].sort()),
        sessionYears: new Set([...sessionYears].sort()),
        categories: new Set([...categories].sort()),
        admissionModes: new Set([...admissionModes].sort()),
      });

      setStudents(formattedStudents);

      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth();

      const sessionStartYear = month >= 6 ? year : year - 1;
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
    setCourseNameFilter(''); // Reset course name filter
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
    const matchesCourseName = !courseNameFilter || student.course.courseName === courseNameFilter; // Added course name filter
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

    return matchesSearch && matchesCourseYear && matchesCourseName && matchesCollege && matchesSessionYear &&
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
  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-gray-200 rounded-lg p-2.5 mb-2">
  {/* First Row - Student Count and Status */}
  <div className="flex justify-between items-center mb-2">
    <div className="flex items-center">
      <span className="text-gray-700 text-sm mr-2">Total Students:</span>
      <span className="bg-blue-600 text-white px-2.5 py-1 rounded-md font-semibold text-sm">
        {filteredStudents.length}
      </span>
    </div>
    
    <div className="flex items-center">
      <label className="text-gray-700 text-sm mr-2">Status:</label>
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="border border-gray-300 rounded px-2.5 py-1 text-sm bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="All">All</option>
        <option value="Active">Active</option>
        <option value="Inactive">Inactive</option>
        <option value="isDiscontinue">Discontinued</option>
        <option value="Fresh Student">Fresh Student</option>
      </select>
    </div>
  </div>

  {/* Second Row - All Filters and Actions */}
  <div className="flex flex-wrap gap-1.5 items-center">
    {/* Search */}
    <div className="relative">
      <input
        type="text"
        placeholder="Search..."
        className="pl-7 pr-2 py-1.5 border border-gray-300 rounded text-sm bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-32"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <FaSearch className="absolute left-2 top-2 text-gray-400 text-xs" />
    </div>

    {/* Course Year */}
    <select
      value={courseYearFilter}
      onChange={(e) => setCourseYearFilter(e.target.value)}
      className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 min-w-[100px]"
    >
      <option value="">Course Year</option>
      {[...filterOptions.courseYears].map(year => (
        <option key={year} value={year}>{year}</option>
      ))}
    </select>

    {/* Course Name */}
    <select
      value={courseNameFilter}
      onChange={(e) => setCourseNameFilter(e.target.value)}
      className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 min-w-[110px]"
    >
      <option value="">Course Name</option>
      {[...filterOptions.courseNames].map(courseName => (
        <option key={courseName} value={courseName}>{courseName}</option>
      ))}
    </select>

    {/* College */}
    <select
      value={collegeFilter}
      onChange={(e) => setCollegeFilter(e.target.value)}
      className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 min-w-[90px]"
    >
      <option value="">College</option>
      {[...filterOptions.colleges].map(college => (
        <option key={college} value={college}>{college}</option>
      ))}
    </select>

    {/* Session Year */}
    <select
      value={sessionYearFilter}
      onChange={(e) => setSessionYearFilter(e.target.value)}
      className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 min-w-[105px]"
    >
      <option value="">Session Year</option>
      {[...filterOptions.sessionYears].map(year => (
        <option key={year} value={year}>{year}</option>
      ))}
    </select>

    {/* Category */}
    <select
      value={categoryFilter}
      onChange={(e) => setCategoryFilter(e.target.value)}
      className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 min-w-[85px]"
    >
      <option value="">Category</option>
      {['Gen', 'OBC', 'SC', 'ST','MINORITY'].filter(cat => filterOptions.categories.has(cat)).map(category => (
        <option key={category} value={category}>{category}</option>
      ))}
    </select>

    {/* Admission Mode */}
    <select
      value={admissionModeFilter}
      onChange={(e) => setAdmissionModeFilter(e.target.value)}
      className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 min-w-[120px]"
    >
      <option value="">Admission Mode</option>
      {[...filterOptions.admissionModes].map(mode => (
        <option key={mode} value={mode}>{mode}</option>
      ))}
    </select>

    {/* Action Buttons */}
    <div className="flex gap-1.5 ml-auto">
      <button
        onClick={clearFilters}
        className="flex items-center w-12 px-2.5 py-1.5 bg-red-500 min-w-[74px]  text-white rounded text-sm hover:bg-red-600 focus:ring-1 focus:ring-red-500 transition-colors"
      >
        <FaTimes className="w-3 h-3 mr-1" />
        Clear
      </button>
      
     <button
  onClick={
    canCreate
      ? () => setIsAddModalOpen(true)
      : () => toast.error('Access Denied: You do not have permission to add students.')
  }
  className={`px-3 py-1.5 text-sm text-white rounded transition-colors ${
    canCreate
      ? 'bg-blue-600 hover:bg-blue-700 focus:ring-1 focus:ring-blue-500'
      : 'bg-blue-600 opacity-50 cursor-not-allowed'
  }`}
>
  Add Student
</button>
      
      <button
        onClick={exportToExcel}
        className="flex items-center px-2.5 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 focus:ring-1 focus:ring-green-500 transition-colors"
      >
        <FaFileExport className="w-3 h-3 mr-1" />
        Export To Excel
      </button>
    </div>
  </div>
</div>

        {/* Enhanced Table Container with Custom Scroll */}
        <div 
          ref={tableContainerRef}
          className="relative bg-white rounded-lg shadow-lg border border-gray-200 "
          style={{
            height: 'calc(100vh - 200px)',
            minHeight: '400px',
            overflow: 'auto',
            position: 'relative'
          }}
          tabIndex={0}
        >
          <div className="absolute top-2 right-4 text-xs text-gray-500 z-10 bg-white px-2 py-1 rounded border">
            Use arrow keys to navigate
          </div>

          <table 
            ref={tableRef}
            className="w-full bg-white text-xs sm:text-sm"
            style={{ minWidth: '1500px' }}
          >
            <thead className="sticky top-0 z-20">
              <tr className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
                <th className="py-3 px-3 font-medium text-center border-blue-500" style={{ minWidth: '60px' }}>#</th>
                <th className="py-3 px-3 font-medium text-left border-blue-500" style={{ minWidth: '160px' }}>Name</th>
                <th className="py-3 px-3 font-medium text-center border-blue-500" style={{ minWidth: '100px' }}>Roll No</th>
                <th className="py-3 px-3 font-medium text-center border-blue-500" style={{ minWidth: '100px' }}>College ID</th>
                <th className="py-3 px-3 font-medium text-left border-blue-500" style={{ minWidth: '200px' }}>Email</th>
                <th className="py-3 px-3 font-medium text-left border-blue-500" style={{ minWidth: '150px' }}>Course</th>
                <th className="py-3 px-3 font-medium text-left border-blue-500" style={{ minWidth: '150px' }}>College</th>
                <th className="py-3 px-3 font-medium text-center border-blue-500" style={{ minWidth: '80px' }}>Year</th>
                <th className="py-3 px-3 font-medium text-center border-blue-500" style={{ minWidth: '100px' }}>Session</th>
                <th className="py-3 px-3 font-medium text-center border-blue-500" style={{ minWidth: '120px' }}>Mobile</th>
                <th className="py-3 px-3 font-medium text-center border-blue-500" style={{ minWidth: '100px' }}>Discontinue</th>
                <th className="py-3 px-3 font-medium text-center border-blue-500" style={{ minWidth: '80px' }}>Status</th>
                <th className="py-3 px-3 font-medium text-left border-blue-500" style={{ minWidth: '120px' }}>Admission</th>
                <th className="py-3 px-3 font-medium text-center border-blue-500" style={{ minWidth: '80px' }}>Category</th>
                <th className="py-3 px-3 font-medium text-center" style={{ minWidth: '180px' }}>Actions</th>
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
                    <tr key={student.id} className={`${rowClass} overflow-auto hover:bg-blue-50 transition duration-150`}>
                      <td className="py-2 px-2 text-center font-medium text-gray-700">{(currentPage - 1) * entriesPerPage + index + 1}</td>
                      <td className="py-2 px-2 font-medium text-gray-800 whitespace-nowrap">{student.fName} {student.lName || ''}</td>
                      <td className="py-2 px-2 text-center text-gray-700">{student.rollNumber}</td>
                      <td className="py-2 px-2 text-center text-gray-700">{student.stdCollId}</td>
                      <td className="py-2 px-2 whitespace-nowrap text-blue-600">{student.email}</td>
                      <td className="py-2 px-2 font-medium whitespace-nowrap truncate max-w-[120px]">{student.course?.courseName || 'N/A'}</td>
                      <td className="py-2 px-2 whitespace-nowrap truncate">{student.college?.collegeName || 'N/A'}</td>
                      <td className="py-2 px-2 text-center">{latestAcademic.courseYear || 'N/A'}</td>
                      <td className="py-2 px-2 text-center whitespace-nowrap">{latestAcademic.sessionYear || 'N/A'}</td>
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
  onClick={
    canUpdate
      ? () => handlePromoteClick(student.id)
      : () => toast.error('Access Denied: You do not have permission to promote students.')
  }
  type='button'
  title="Promote Student"
  className={`px-2 py-1 text-xs font-medium text-white rounded transition duration-150 flex items-center justify-center ${
    canUpdate
      ? 'bg-green-600 hover:bg-green-700'
      : 'bg-green-600 opacity-50 cursor-not-allowed'
  }`}
>
  Promote
</button>
                         <button
  onClick={
    canRead
      ? () => handleEditClick(student.id)
      : () => toast.error('Access Denied: You do not have permission to edit students.')
  }
  className={`p-1 rounded transition duration-150 flex items-center justify-center ${
    canRead
      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
      : 'bg-blue-100 text-blue-700 opacity-50 cursor-not-allowed'
  }`}
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
  onClick={
    canDelete
      ? () => handleToggleStatusClick(student.id)
      : () => toast.error('Access Denied: You do not have permission to toggle student status.')
  }
  className={`p-1 rounded transition duration-150 flex items-center justify-center ${
    canDelete
      ? student.status
        ? 'bg-green-100 text-green-700 hover:bg-green-200'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      : student.status
      ? 'bg-green-100 text-green-700 opacity-50 cursor-not-allowed'
      : 'bg-gray-100 text-gray-700 opacity-50 cursor-not-allowed'
  }`}
  title="Active/Inactive"
  type='button'
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
                  <td colSpan={15} className="text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center min-h-[300px]">
                      <div className="mb-3">
                        <FileSearch className="h-8 w-8 text-gray-500 animate-pulse" />
                      </div>
                      <p className="text-sm font-medium text-gray-600 mb-1">No Students records found</p>
                      <p className="text-xs text-gray-400 text-center px-4">
                        Try adjusting your filters or check back later <br /> <br />
                        <button className='text-blue-500 hover:underline text-[15px]' onClick={() => setSearchQuery('')}> Clear Input Search</button>
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
            message="Are you sure you want to change the status of this student?"
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