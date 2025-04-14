import { useState, useEffect } from 'react';
import axiosInstance from '../../config';
import { useAuth } from '../../context/AuthContext';
import { FaEdit, FaTrash, FaSearch, FaTimes, FaMoneyBill, FaFilter, FaFileAlt, FaBook, FaCalendarAlt, FaCheckCircle, FaDoorOpen, FaUniversity } from 'react-icons/fa';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';

import StudentPaymentModal from './StudentPaymentModal';

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

interface SummaryData {
  totalStudents: number;
  adminAmount: number;
  adminReceived: number;
  adminPending: number;
  feesAmount: number;
  feesReceived: number;
  feesPending: number;
}

const ManagePayment: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [currentStudentId, setCurrentStudentId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'academic' | 'emi' | 'personal'>('academic');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Calculate current session year based on system date
//   const currentYear = new Date().getFullYear();
//   const currentMonth = new Date().getMonth();
//   const defaultSessionYear = currentMonth < 6
//   ? `${currentYear - 1}-${currentYear}`
//   : `${currentYear}-${currentYear + 1}`;
// const [sessionYearFilter, setSessionYearFilter] = useState(defaultSessionYear);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [sessionYearFilter, setSessionYearFilter] = useState('2025-2026');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [yearFilter, setYearFilter] = useState('');
  const [admissionModeFilter, setAdmissionModeFilter] = useState('');
  
  // Summary data
  const [summaryData, setSummaryData] = useState<SummaryData>({
    totalStudents: 0,
    adminAmount: 0,
    adminReceived: 0,
    adminPending: 0,
    feesAmount: 0,
    feesReceived: 0,
    feesPending: 0
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  
  // Filter options using Sets
  const [filterOptions, setFilterOptions] = useState({
    courseYears: new Set<string>(),
    colleges: new Set<string>(),
    sessionYears: new Set<string>(),
    courses: new Set<string>(),
    statuses: new Set<string>(['Fresh Student', 'Active', 'Inactive', 'Discontinued']),
    admissionModes: new Set<string>(['Direct', 'Entrance', 'Counselling']),
    categories: new Set<string>(),
    genders: new Set<string>(),
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
        mobileNumber: student.mobileNumber || '',
        fatherName: student.fatherName || '',
        status: student.status,
        isDiscontinue: student.isDiscontinue,
        admissionMode: student.admissionMode,
        category: student.category || 'N/A',
        gender: student.gender || 'N/A',
        address: student.address || 'N/A',
        pincode: student.pincode || 'N/A',
        dob: student.dob || 'N/A',
        admissionDate: student.admissionDate || 'N/A',
        discontinueBy: student.discontinueBy || null,
        stdCollId: student.stdCollId || '',
        course: {
          id: student.courseId,
          courseName: student.course?.courseName || 'N/A',
        },
        college: {
          id: student.collegeId,
          collegeName: student.college?.collegeName || 'N/A',
        },
        academicDetails: student.academicDetails || [],
        emiDetails: student.emiDetails || [],
      }));

      // Extract unique values for filter options using Sets
      const courseYears = new Set<string>();
      const sessionYears = new Set<string>();
      const colleges = new Set<string>();
      const courses = new Set<string>();
      const categories = new Set<string>();
      const genders = new Set<string>();

      formattedStudents.forEach(student => {
        colleges.add(student.college.collegeName);
        courses.add(student.course.courseName);
        student.academicDetails.forEach(detail => {
          sessionYears.add(detail.sessionYear);
          courseYears.add(detail.courseYear || 'N/A');
        });
        categories.add(student.category);
        genders.add(student.gender);
      });

      setFilterOptions(prev => ({
        ...prev,
        courseYears,
        colleges,
        sessionYears,
        courses,
        categories,
        genders,
      }));

      setStudents(formattedStudents);
      
      // Calculate summary data
      calculateSummaryData(formattedStudents);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch students');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummaryData = (studentData: Student[]) => {
    let adminAmount = 0;
    let adminReceived = 0;
    let feesAmount = 0;
    let feesReceived = 0;

    studentData.forEach(student => {
      student.academicDetails.forEach(academic => {
        adminAmount += academic.adminAmount || 0;
        feesAmount += academic.feesAmount || 0;
      });
    });

    // Mock data for received amounts - replace with actual calculations from your data
    adminReceived = 12257150;
    feesReceived = 15970000;

    setSummaryData({
      totalStudents: studentData.length,
      adminAmount,
      adminReceived,
      adminPending: adminAmount - adminReceived,
      feesAmount,
      feesReceived,
      feesPending: feesAmount - feesReceived
    });
  };

  const fetchStudentDetails = async (studentId: number) => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/getAllStudents/${studentId}`);
      setSelectedStudent(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch student details');
      console.error('Fetch details error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (studentId: number) => {
    setSelectedStudent(null); // Close any existing modal
    fetchStudentDetails(studentId);
  };

  const handlePaymentClick = (studentId: number) => {
    setCurrentStudentId(studentId);
    setIsPaymentModalOpen(true);
    setSelectedStudent(null); // Close details modal if open
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCourseFilter('');
    setCollegeFilter('');
    setSessionYearFilter('');
    setStatusFilter('');
    setYearFilter('');
    setAdmissionModeFilter('');
    setCurrentPage(1);
  };

  const getStatusValue = (status: string) => {
    switch (status) {
      case 'Fresh Student': return 'fresh';
      case 'Active': return 'active';
      case 'Inactive': return 'inactive';
      case 'Discontinued': return 'discontinued';
      default: return '';
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = searchQuery === '' || [
      student.fName,
      student.lName,
      student.rollNumber,
      student.email,
      student.mobileNumber,
      student.fatherName,
      student.stdCollId,
      student.address,
      student.category,
      student.gender,
    ].some(field => field?.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCourse = !courseFilter || student.course.courseName === courseFilter;
    const matchesCollege = !collegeFilter || student.college.collegeName === collegeFilter;
    const matchesAdmissionMode = !admissionModeFilter || 
      student.admissionMode.toLowerCase() === admissionModeFilter.toLowerCase();

    const matchesStatus = !statusFilter || 
      (getStatusValue(statusFilter) === 'fresh' && student.status && !student.isDiscontinue && 
       student.academicDetails.some(ad => ad.courseYear === '1st')) ||
      (getStatusValue(statusFilter) === 'active' && student.status && !student.isDiscontinue) ||
      (getStatusValue(statusFilter) === 'inactive' && !student.status && !student.isDiscontinue) ||
      (getStatusValue(statusFilter) === 'discontinued' && student.isDiscontinue);

    // Check if student has any academic detail matching the filters
    const matchesSessionYear = !sessionYearFilter || 
      student.academicDetails.some(detail => detail.sessionYear === sessionYearFilter);

    const matchesYear = !yearFilter || 
      student.academicDetails.some(detail => detail.courseYear === yearFilter);

    return matchesSearch && matchesCourse && matchesCollege && matchesSessionYear && 
           matchesYear && matchesStatus && matchesAdmissionMode;
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

  if (loading) return <div className="text-xs text-black p-1">Loading...</div>;
  if (error) return <div className="text-xs text-red-500 p-1">{error}</div>;

  return (
    <>
      <Breadcrumb pageName="Payment Management" />
      
      {/* Enhanced Filter Section with Better UI */}
      <div className="p-1.5 mb-2 bg-gradient-to-r from-white to-gray-50 rounded-lg shadow-sm border border-gray-100">
        <h2 className="text-sm font-semibold mb-1 text-gray-800 flex items-center">
          <FaFilter className="mr-1 text-blue-500 text-[12px]" /> Filter Students
        </h2>

        <div className="grid text-black-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-1 mb-2">
          {/* Session Year */}
          <div className="flex flex-col">
            <label className="mb-0.5 text-xs font-medium text-gray-600 flex items-center">
              <FaCalendarAlt className="mr-1 text-gray-400 text-[10px]" /> Session Year
            </label>
            <select
              value={sessionYearFilter}
              onChange={(e) => setSessionYearFilter(e.target.value)}
              className="border border-gray-200 rounded py-0.5 px-1.5 text-xs w-full bg-white focus:ring-1 focus:ring-blue-300 focus:border-blue-300 transition-colors duration-150 flex items-center"
            >
              <option value="">All</option>
              {Array.from(filterOptions.sessionYears).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* College */}
          <div className="flex flex-col">
            <label className="mb-0.5 text-xs font-medium text-gray-600 flex items-center">
              <FaUniversity className="mr-1 text-gray-400 text-[10px]" /> College Name
            </label>
            <select
              value={collegeFilter}
              onChange={(e) => setCollegeFilter(e.target.value)}
              className="border border-gray-200 rounded py-0.5 px-1.5 text-xs w-full bg-white focus:ring-1 focus:ring-blue-300 focus:border-blue-300 transition-colors duration-150 flex items-center"
            >
              <option value="">All</option>
              {Array.from(filterOptions.colleges).map(college => (
                <option key={college} value={college}>{college}</option>
              ))}
            </select>
          </div>

          {/* Course */}
          <div className="flex flex-col">
            <label className="mb-0.5 text-xs font-medium text-gray-600 flex items-center">
              <FaBook className="mr-1 text-gray-400 text-[10px]" /> Course Name
            </label>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="border border-gray-200 rounded py-0.5 px-1.5 text-xs w-full bg-white focus:ring-1 focus:ring-blue-300 focus:border-blue-300 transition-colors duration-150 flex items-center"
            >
              <option value="">All</option>
              {Array.from(filterOptions.courses).map(course => (
                <option key={course} value={course}>{course}</option>
              ))}
            </select>
          </div>

          {/* Course Year */}
          <div className="flex flex-col">
            <label className="mb-0.5 text-xs font-medium text-gray-600 flex items-center">
              <FaCalendarAlt className="mr-1 text-gray-400 text-[10px]" /> Course Year
            </label>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="border border-gray-200 rounded py-0.5 px-1.5 text-xs w-full bg-white focus:ring-1 focus:ring-blue-300 focus:border-blue-300 transition-colors duration-150 flex items-center"
            >
              <option value="">All</option>
              {Array.from(filterOptions.courseYears).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="flex flex-col">
            <label className="mb-0.5 text-xs font-medium text-gray-600 flex items-center">
              <FaCheckCircle className="mr-1 text-gray-400 text-[10px]" /> Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded py-0.5 px-1.5 text-xs w-full bg-white focus:ring-1 focus:ring-blue-300 focus:border-blue-300 transition-colors duration-150 flex items-center"
            >
              <option value="">All</option>
              {Array.from(filterOptions.statuses).map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          {/* Admission Mode */}
          <div className="flex flex-col">
            <label className="mb-0.5 text-xs font-medium text-gray-600 flex items-center">
              <FaDoorOpen className="mr-1 text-gray-400 text-[10px]" /> Admission Mode
            </label>
            <select
              value={admissionModeFilter}
              onChange={(e) => setAdmissionModeFilter(e.target.value)}
              className="border border-gray-200 rounded py-0.5 px-1.5 text-xs w-full bg-white focus:ring-1 focus:ring-blue-300 focus:border-blue-300 transition-colors duration-150 flex items-center"
            >
              <option value="">All</option>
              {Array.from(filterOptions.admissionModes).map(mode => (
                <option key={mode} value={mode}>{mode}</option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="flex flex-col">
            <label className=" text-xs font-medium text-gray-600 flex items-center">
              <FaSearch className="mr-1 text-gray-400 text-[10px]" /> Search
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Name, Roll No, ID..."
                className="pl-6 pr-2 py-0.5 border border-gray-200 rounded text-xs w-full bg-white focus:ring-1 focus:ring-blue-300 focus:border-blue-300 transition-colors duration-150"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <FaSearch className="absolute left-1.5 top-1.5 text-gray-400 text-[10px]" />
            </div>
          </div>
        </div>

        <div className="flex justify-end items-center gap-1">
          <button
            onClick={clearFilters}
            className="inline-flex items-center px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-medium focus:ring-1 focus:ring-gray-300 transition-colors duration-150"
          >
            <FaTimes className="mr-0.5 text-[10px]" /> Clear
          </button>
          <button
            onClick={fetchStudents}
            className="inline-flex items-center px-2 py-0.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium focus:ring-1 focus:ring-blue-300 transition-colors duration-150"
          >
            <FaSearch className="mr-0.5 text-[10px]" /> Search
          </button>
        </div>
      </div>
      
      {/* Financial Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        {/* Total Students Card */}
        <div className="bg-white p-2 rounded shadow border border-gray-200 hover:shadow-md transition-shadow duration-200">
          <p className="text-xs text-black-2 mb-1">Total Students</p>
          <div className="flex justify-between items-center">
            <p className="text-sm font-bold text-gray-800">{summaryData.totalStudents}</p>
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
          </div>
        </div>

        {/* Admin Amount Card */}
        <div className="bg-white p-2 rounded shadow border border-gray-200 hover:shadow-md transition-shadow duration-200">
          <p className="text-xs text-black-2 mb-1">Admin Amount</p>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-sm font-bold text-gray-800">{summaryData.adminAmount.toLocaleString()}</p>
              <div className="flex text-xs gap-1 mt-1">
                <p className="text-green-500">R: {summaryData.adminReceived.toLocaleString()}</p>
                <p className="text-red-500">P: {summaryData.adminPending.toLocaleString()}</p>
              </div>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
          </div>
        </div>

        {/* Fees Amount Card */}
        <div className="bg-white p-2 rounded shadow border border-gray-200 hover:shadow-md transition-shadow duration-200">
          <p className="text-xs text-black-2 mb-1">Fees Amount</p>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-sm font-bold text-gray-800">{summaryData.feesAmount.toLocaleString()}</p>
              <div className="flex text-xs gap-1 mt-1">
                <p className="text-green-500">R: {summaryData.feesReceived.toLocaleString()}</p>
                <p className="text-red-500">P: {summaryData.feesPending.toLocaleString()}</p>
              </div>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
          </div>
        </div>

        {/* Showing Results Card */}
        <div className="bg-white p-2 rounded shadow border border-gray-200 hover:shadow-md transition-shadow duration-200">
          <p className="text-xs text-gray-500 mb-1">Showing Results</p>
          <div className="flex justify-between items-center">
            <p className="text-sm font-bold text-gray-800">{filteredStudents.length}</p>
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
          </div>
        </div>
      </div>

      {/* Optimized Table with Enhanced UI */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="relative overflow-x-auto max-h-[70vh]">
          <table className="min-w-full bg-white text-xs text-black-2 border-collapse">
            <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 text-gray-600 sticky top-0 z-10">
              <tr>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">S.No</th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">Student ID</th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">Name</th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">Roll No</th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">Course Year</th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">Course</th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">College</th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">Mobile</th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">Status</th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">Discontinued By</th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">Admission Mode</th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">Category</th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">Gender</th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">Address</th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">Pin Code</th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">DOB</th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">Admission Date</th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">Is Discontinued</th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">Session Year</th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">Payment Mode</th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-right font-semibold tracking-tight whitespace-nowrap">Admin Amount</th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">Ledger No</th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-right font-semibold tracking-tight whitespace-nowrap">Fees Amount</th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-center font-semibold tracking-tight whitespace-nowrap">Total EMIs</th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-center font-semibold tracking-tight whitespace-nowrap">1st EMI</th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-center font-semibold tracking-tight whitespace-nowrap">2nd EMI</th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-center font-semibold tracking-tight whitespace-nowrap">1st EMI Date</th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-center font-semibold tracking-tight whitespace-nowrap">2nd EMI Date</th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStudents.length > 0 ? (
                paginatedStudents.map((student, index) => {
                  // Find the academic detail that matches the selected filters
                  const matchingAcademic = student.academicDetails.find(
                    detail => 
                      (!sessionYearFilter || detail.sessionYear === sessionYearFilter) &&
                      (!yearFilter || detail.courseYear === yearFilter)
                  ) || student.academicDetails[0] || {};

                  const firstEmi = student.emiDetails.find(emi => emi.emiNumber === 1 && emi.studentAcademicId === matchingAcademic.id);
                  const secondEmi = student.emiDetails.find(emi => emi.emiNumber === 2 && emi.studentAcademicId === matchingAcademic.id);

                  return (
                    <tr
                      key={student.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150 align-middle"
                    >
                      <td className="px-1.5 py-1 text-center">{(currentPage - 1) * entriesPerPage + index + 1}</td>
                      <td className="px-1.5 py-1 font-medium truncate max-w-[100px]">{student.stdCollId || '-'}</td>
                      <td className="px-1.5 py-1 truncate max-w-[120px]">{student.fName} {student.lName || ''}</td>
                      <td className="px-1.5 py-1 truncate max-w-[80px]">{student.rollNumber}</td>
                      <td className="px-1.5 py-1 truncate max-w-[60px]">{matchingAcademic.courseYear || 'N/A'}</td>

                      <td className="px-1.5 py-1 truncate max-w-[100px]">{student.course?.courseName}</td>
                      <td className="px-1.5 py-1 truncate max-w-[120px]">{student.college?.collegeName}</td>
                      <td className="px-1.5 py-1 truncate max-w-[90px]">{student.mobileNumber}</td>
                      <td className="px-1.5 py-1">
                        <span
                          className={`inline-flex items-center px-1 py-0.5 rounded-full text-xs font-medium ${
                            student.status
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          } whitespace-nowrap`}
                        >
                          <span
                            className={`w-1 h-1 rounded-full mr-0.5 ${
                              student.status ? 'bg-green-500' : 'bg-red-500'
                            }`}
                          ></span>
                          {student.status ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-1.5 py-1">
                        <span
                          className={`inline-flex items-center px-1 py-0.5 rounded-full text-xs font-medium ${
                            student.isDiscontinue
                              ? 'bg-red-100 text-red-700'
                              : 'bg-green-100 text-green-700'
                          } whitespace-nowrap`}
                        >
                          <span
                            className={`w-1 h-1 rounded-full mr-0.5 ${
                              student.isDiscontinue ? 'bg-red-500' : 'bg-green-500'
                            }`}
                          ></span>
                          {student.isDiscontinue ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-1.5 py-1 truncate max-w-[80px]">{student.admissionMode}</td>
                      <td className="px-1.5 py-1 truncate max-w-[60px]">{student.category}</td>
                      <td className="px-1.5 py-1 truncate max-w-[60px]">{student.gender}</td>
                      <td className="px-1.5 py-1 truncate max-w-[120px]">{student.address}</td>
                      <td className="px-1.5 py-1 truncate max-w-[60px]">{student.pincode}</td>
                      <td className="px-1.5 py-1 truncate max-w-[80px]">{new Date(student.dob).toLocaleDateString()}</td>
                      <td className="px-1.5 py-1 truncate max-w-[80px]">{new Date(student.admissionDate).toLocaleDateString()}</td>
                      <td className="px-1.5 py-1 truncate max-w-[80px]">{student.discontinueBy || 'N/A'}</td>
                    
                      <td className="px-1.5 py-1 truncate max-w-[80px]">{matchingAcademic.sessionYear || 'N/A'}</td>
                      <td className="px-1.5 py-1 truncate max-w-[80px]">{matchingAcademic.paymentMode || 'N/A'}</td>
                      <td className="px-1.5 py-1 text-right truncate max-w-[80px]">{matchingAcademic.adminAmount?.toLocaleString() || '0'}</td>
                      <td className="px-1.5 py-1 truncate max-w-[80px]">{matchingAcademic.ledgerNumber || 'N/A'}</td>

                      <td className="px-1.5 py-1 text-right truncate max-w-[80px]">{matchingAcademic.feesAmount?.toLocaleString() || '0'}</td>
                      <td className="px-1.5 py-1 text-center truncate max-w-[60px]">{matchingAcademic.numberOfEMI || 'N/A'}</td>
                      <td className="px-1.5 py-1 text-center truncate max-w-[60px]">{firstEmi?.amount?.toLocaleString() || 'N/A'}</td>
                      <td className="px-1.5 py-1 text-center truncate max-w-[60px]">{secondEmi?.amount?.toLocaleString() || 'N/A'}</td>
                      <td className="px-1.5 py-1 text-center truncate max-w-[80px]">{firstEmi ? new Date(firstEmi.dueDate).toLocaleDateString() : 'N/A'}</td>
                      <td className="px-1.5 py-1 text-center truncate max-w-[80px]">{secondEmi ? new Date(secondEmi.dueDate).toLocaleDateString() : 'N/A'}</td>
                      <td className="px-1.5 py-1">
                        <div className="inline-flex space-x-0.5">
                          <button
                            onClick={() => handleViewDetails(student.id)}
                            className="p-0.5 text-blue-500 hover:text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors duration-150"
                            title="View Details"
                          >
                            <FaFileAlt size={10} />
                          </button>
                          <button
                            onClick={() => handlePaymentClick(student.id)}
                            className="p-0.5 text-green-500 hover:text-green-600 bg-green-50 rounded-full hover:bg-green-100 transition-colors duration-150"
                            title="Payment"
                          >
                            <FaMoneyBill size={10} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={29} className="px-1.5 py-2 text-center text-gray-500">
                    No students found matching the filter criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col md:flex-row justify-between items-center mt-2 p-2 bg-white rounded shadow-md border border-gray-200">
        <div className="flex items-center text-gray-600 space-x-1 mb-2 md:mb-0">
          <span className="text-xs">Show:</span>
          <select
            value={entriesPerPage}
            onChange={(e) => {
              setEntriesPerPage(parseInt(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-xs">entries</span>
        </div>
        
        <div className="flex items-center space-x-0.5">
          <button
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className="px-1 py-0.5 bg-gray-100 rounded text-xs disabled:opacity-50 hover:bg-gray-200"
          >
            First
          </button>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-1 py-0.5 bg-gray-100 rounded text-xs disabled:opacity-50 hover:bg-gray-200"
          >
            Prev
          </button>
          
          <span className="text-xs px-1">
            Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages || 1}</span>
          </span>
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages === 0}
            className="px-1 py-0.5 bg-gray-100 rounded text-xs disabled:opacity-50 hover:bg-gray-200"
          >
            Next
          </button>
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages || totalPages === 0}
            className="px-1 py-0.5 bg-gray-100 rounded text-xs disabled:opacity-50 hover:bg-gray-200"
          >
            Last
          </button>
        </div>
      </div>

      {/* Student Details Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-1 z-50">
          <div className="bg-white rounded shadow-lg w-full max-w-3xl max-h-[85vh] overflow-auto">
            <div className="p-2 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-800">
                {selectedStudent.fName} {selectedStudent.lName} - {selectedStudent.rollNumber}
              </h3>
              <button
                onClick={() => setSelectedStudent(null)}
                className="text-gray-500 hover:text-gray-700 p-0.5 rounded-full hover:bg-gray-200"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-2">
              <div className="flex border-b mb-2 overflow-x-auto">
                <button
                  className={`py-1 px-2 font-medium text-xs whitespace-nowrap ${activeTab === 'academic' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setActiveTab('academic')}
                >
                  Academic
                </button>
                <button
                  className={`py-1 px-2 font-medium text-xs whitespace-nowrap ${activeTab === 'emi' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setActiveTab('emi')}
                >
                  EMI Details
                </button>
                <button
                  className={`py-1 px-2 font-medium text-xs whitespace-nowrap ${activeTab === 'personal' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setActiveTab('personal')}
                >
                  Personal Info
                </button>
              </div>

              {activeTab === 'academic' && (
                <div className="overflow-x-auto bg-white rounded border">
                  <table className="min-w-full text-xs border-collapse">
                    <thead className="bg-gray-50 text-gray-700">
                      <tr>
                        <th className="p-1 border text-left">Session</th>
                        <th className="p-1 border text-left">Year</th>
                        <th className="p-1 border text-left">Payment Mode</th>
                        <th className="p-1 border text-right">Admin Amt</th>
                        <th className="p-1 border text-right">Fees Amt</th>
                        <th className="p-1 border text-center">EMIs</th>
                        <th className="p-1 border text-center">Ledger</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedStudent.academicDetails.map((detail) => (
                        <tr key={detail.id} className="hover:bg-gray-50">
                          <td className="p-1 border">{detail.sessionYear}</td>
                          <td className="p-1 border">{detail.courseYear}</td>
                          <td className="p-1 border">{detail.paymentMode}</td>
                          <td className="p-1 border text-right">{detail.adminAmount.toLocaleString()}</td>
                          <td className="p-1 border text-right">{detail.feesAmount.toLocaleString()}</td>
                          <td className="p-1 border text-center">{detail.numberOfEMI || 'N/A'}</td>
                          <td className="p-1 border text-center">{detail.ledgerNumber || 'N/A'}</td>
                        </tr>
                      ))}
                      {selectedStudent.academicDetails.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-2 text-center text-gray-500">
                            No academic records found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'emi' && (
                <div className="overflow-x-auto bg-white rounded border">
                  <table className="min-w-full text-xs border-collapse">
                    <thead className="bg-gray-50 text-gray-700">
                      <tr>
                        <th className="p-1 border text-left">EMI#</th>
                        <th className="p-1 border text-right">Amount</th>
                        <th className="p-1 border text-center">Due Date</th>
                        <th className="p-1 border text-left">Session</th>
                        <th className="p-1 border text-left">Year</th>
                        <th className="p-1 border text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedStudent.emiDetails.map((emi) => {
                        const academicDetail = selectedStudent.academicDetails.find(
                          (ad) => ad.id === emi.studentAcademicId
                        );
                        const dueDate = new Date(emi.dueDate);
                        const today = new Date();
                        const isPastDue = dueDate < today;
                        
                        return (
                          <tr key={emi.id} className="hover:bg-gray-50">
                            <td className="p-1 border">{emi.emiNumber}</td>
                            <td className="p-1 border text-right">{emi.amount.toLocaleString()}</td>
                            <td className="p-1 border text-center">{new Date(emi.dueDate).toLocaleDateString()}</td>
                            <td className="p-1 border">
                              {academicDetail?.sessionYear || 'N/A'}
                            </td>
                            <td className="p-1 border">
                              {academicDetail?.courseYear || 'N/A'}
                            </td>
                            <td className="p-1 border text-center">
                              <span className={`inline-flex items-center px-1 py-0.5 rounded-full text-xs font-medium ${
                                isPastDue ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                              }`}>
                                {isPastDue ? 'Past Due' : 'Upcoming'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {selectedStudent.emiDetails.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-2 text-center text-gray-500">
                            No EMI records found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'personal' && (
                <div className="bg-white rounded border p-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div className="space-y-1">
                      <div className="bg-gray-50 p-1 rounded">
                        <p className="text-gray-500 text-xs mb-0.5">Student ID</p>
                        <p className="font-medium">{selectedStudent.stdCollId || 'Not assigned'}</p>
                      </div>
                      
                      <div className="bg-gray-50 p-1 rounded">
                        <p className="text-gray-500 text-xs mb-0.5">Email</p>
                        <p className="font-medium break-all">{selectedStudent.email}</p>
                      </div>
                      
                      <div className="bg-gray-50 p-1 rounded">
                        <p className="text-gray-500 text-xs mb-0.5">Mobile Number</p>
                        <p className="font-medium">{selectedStudent.mobileNumber}</p>
                      </div>
                      
                      <div className="bg-gray-50 p-1 rounded">
                        <p className="text-gray-500 text-xs mb-0.5">Father's Name</p>
                        <p className="font-medium">{selectedStudent.fatherName}</p>
                      </div>
                      
                      <div className="bg-gray-50 p-1 rounded">
                        <p className="text-gray-500 text-xs mb-0.5">Address</p>
                        <p className="font-medium">{selectedStudent.address}</p>
                      </div>
                      
                      <div className="bg-gray-50 p-1 rounded">
                        <p className="text-gray-500 text-xs mb-0.5">Pin Code</p>
                        <p className="font-medium">{selectedStudent.pincode}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="bg-gray-50 p-1 rounded">
                        <p className="text-gray-500 text-xs mb-0.5">Category</p>
                        <p className="font-medium">{selectedStudent.category}</p>
                      </div>
                      
                      <div className="bg-gray-50 p-1 rounded">
                        <p className="text-gray-500 text-xs mb-0.5">Gender</p>
                        <p className="font-medium">{selectedStudent.gender}</p>
                      </div>
                      
                      <div className="bg-gray-50 p-1 rounded">
                        <p className="text-gray-500 text-xs mb-0.5">DOB</p>
                        <p className="font-medium">{new Date(selectedStudent.dob).toLocaleDateString()}</p>
                      </div>
                      
                      <div className="bg-gray-50 p-1 rounded">
                        <p className="text-gray-500 text-xs mb-0.5">Admission Mode</p>
                        <p className="font-medium capitalize">{selectedStudent.admissionMode}</p>
                      </div>
                      
                      <div className="bg-gray-50 p-1 rounded">
                        <p className="text-gray-500 text-xs mb-0.5">Admission Date</p>
                        <p className="font-medium">{new Date(selectedStudent.admissionDate).toLocaleDateString()}</p>
                      </div>
                      
                      <div className="bg-gray-50 p-1 rounded">
                        <p className="text-gray-500 text-xs mb-0.5">Status</p>
                        <div className="flex items-center">
                          <span className={`w-1.5 h-1.5 rounded-full mr-0.5 ${
                            selectedStudent.isDiscontinue ? 'bg-red-500' : 
                            selectedStudent.status ? 'bg-green-500' : 'bg-yellow-500'
                          }`}></span>
                          <p className="font-medium">
                            {selectedStudent.isDiscontinue ? 'Discontinued' : 
                             selectedStudent.status ? 'Active' : 'Inactive'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-1 rounded">
                        <p className="text-gray-500 text-xs mb-0.5">Discontinued By</p>
                        <p className="font-medium">{selectedStudent.discontinueBy || 'N/A'}</p>
                      </div>
                      
                      <div className="bg-gray-50 p-1 rounded">
                        <p className="text-gray-500 text-xs mb-0.5">College & Course</p>
                        <p className="font-medium">{selectedStudent.college?.collegeName} - {selectedStudent.course?.courseName}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-2 border-t flex justify-end gap-1 bg-gray-50">
              <button
                onClick={() => handlePaymentClick(selectedStudent.id)}
                className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 font-medium flex items-center"
              >
                <FaMoneyBill className="mr-0.5" /> Pay
              </button>
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-2 py-1 bg-gray-200 rounded text-xs hover:bg-gray-300 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Payment Modal */}
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
    </>
  );
};

export default ManagePayment;