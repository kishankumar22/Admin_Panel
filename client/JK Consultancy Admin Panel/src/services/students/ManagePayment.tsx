import { useState, useEffect } from 'react';
import axiosInstance from '../../config';
import {
  FaSearch,
  FaTimes,
  FaMoneyBill,
  FaBook,
  FaCalendarAlt,
  FaCheckCircle,
  FaUniversity,
  FaCoins,
  FaHandHoldingUsd,
  FaExchangeAlt,
  FaMoneyCheck,
  FaUsers,
  FaFileExcel,
  FaSpinner,
} from 'react-icons/fa';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import StudentPaymentModal from './StudentPaymentModal';
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

interface StudentPayment {
  id: number;
  studentId: number;
  amount: number;
  amountType: string;
  paymentMode: string;
  receivedDate: string | null;
  transactionNumber: string;
  courseYear: string;
  sessionYear: string;
  studentAcademic: {
    id: number;
    sessionYear: string;
    feesAmount: number;
    adminAmount: number;
    paymentMode: string;
    courseYear: string;
  };
}

interface SummaryData {
  totalStudents: number;
  adminAmount: number;
  adminReceived: number;
  adminPending: number;
  feesAmount: number;
  feesReceived: number;
  feesPending: number;
  totalFine: number;
  totalRefund: number;
}

const ManagePayment: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [currentStudentId, setCurrentStudentId] = useState<number | null>(null);
  const [selectedSessionYear, setSelectedSessionYear] = useState<string | null>(null);
  const [selectedCourseYear, setSelectedCourseYear] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFilterLoading, setIsFilterLoading] = useState(false); // Added for filter loader
  const [showLoading, setShowLoading] = useState(true);

  const [error, setError] = useState('');
  const [payments, setPayments] = useState<StudentPayment[]>([]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const sessionStartYear = month >= 6 ? year : year - 1;
  const sessionEndYear = sessionStartYear + 1;
  const currentSessionYear = `${sessionStartYear}-${sessionEndYear}`;
  const [sessionYearFilter, setSessionYearFilter] = useState(currentSessionYear);
  const [statusFilter, setStatusFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [feesFilter, setFeesFilter] = useState('Pending');
  const [amountTypeFilter, setAmountTypeFilter] = useState('');

  // Summary data
  const [summaryData, setSummaryData] = useState<SummaryData>({
    totalStudents: 0,
    adminAmount: 0,
    adminReceived: 0,
    adminPending: 0,
    feesAmount: 0,
    feesReceived: 0,
    feesPending: 0,
    totalFine: 0,
    totalRefund: 0,
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
    categories: new Set<string>(),
    genders: new Set<string>(),
    amountTypes: new Set<string>(['feesAmount', 'adminAmount', 'fineAmount', 'refundAmount']),
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  // Handle filtering with loader
  useEffect(() => {
    setIsFilterLoading(true); // Show filter loader
    const filtered = students
      .map((student) => {
        const filteredAcademicDetails = student.academicDetails.filter((academic) => {
          const pendingFees = calculatePendingFees(student.id, academic.id, academic.feesAmount);
          const isFullPaid = pendingFees === 0;
          const isPending = pendingFees > 0;

          const matchesFees =
            feesFilter === 'All' ||
            (feesFilter === 'Pending' && isPending) ||
            (feesFilter === 'Full Payment' && isFullPaid);

          const matchesSessionYear = !sessionYearFilter || academic.sessionYear === sessionYearFilter;
          const matchesYear = !yearFilter || academic.courseYear === yearFilter;

          if (amountTypeFilter) {
            if (amountTypeFilter === 'adminAmount' || amountTypeFilter === 'feesAmount') {
              const hasPaymentOfType = payments.some(
                (payment) =>
                  payment.studentId === student.id &&
                  payment.studentAcademic.id === academic.id &&
                  payment.amountType === amountTypeFilter
              );
              return matchesFees && matchesSessionYear && matchesYear && hasPaymentOfType;
            } else if (amountTypeFilter === 'fineAmount' || amountTypeFilter === 'refundAmount') {
              const hasPaymentOfType = payments.some(
                (payment) => payment.studentId === student.id && payment.amountType === amountTypeFilter
              );
              return matchesSessionYear && matchesYear && hasPaymentOfType;
            }
          }

          return matchesFees && matchesSessionYear && matchesYear;
        });

        if (filteredAcademicDetails.length === 0 && (sessionYearFilter || yearFilter || amountTypeFilter)) {
          return null;
        }

        if (!sessionYearFilter && !yearFilter && !amountTypeFilter && feesFilter === 'Pending') {
          const pendingAcademicDetails = student.academicDetails.filter((academic) => {
            const pendingFees = calculatePendingFees(student.id, academic.id, academic.feesAmount);
            return pendingFees > 0;
          });
          if (pendingAcademicDetails.length === 0) return null;
          return { ...student, academicDetails: pendingAcademicDetails };
        }

        return { ...student, academicDetails: filteredAcademicDetails };
      })
      .filter((student): student is Student => student !== null)
      .filter((student) => {
        const matchesSearch =
          searchQuery === '' ||
          student.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          [
            student.fName,
            student.lName,
            student.email,
            student.mobileNumber,
            student.fatherName,
            student.stdCollId,
            student.address,
            student.category,
            student.gender,
          ].some((field) => field?.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesCourse = !courseFilter || student.course.courseName === courseFilter;
        const matchesCollege = !collegeFilter || student.college.collegeName === collegeFilter;

        const matchesStatus =
          !statusFilter ||
          (getStatusValue(statusFilter) === 'fresh' &&
            student.status &&
            !student.isDiscontinue &&
            student.academicDetails.some((ad) => ad.courseYear === '1st')) ||
          (getStatusValue(statusFilter) === 'active' && student.status && !student.isDiscontinue) ||
          (getStatusValue(statusFilter) === 'inactive' && !student.status && !student.isDiscontinue) ||
          (getStatusValue(statusFilter) === 'discontinued' && student.isDiscontinue);

        return matchesSearch && matchesCourse && matchesCollege && matchesStatus;
      });

    // Simulate processing delay for filter loader
    setTimeout(() => {
      setIsFilterLoading(false);
    }, 500);
  }, [
    searchQuery,
    courseFilter,
    collegeFilter,
    sessionYearFilter,
    statusFilter,
    yearFilter,
    feesFilter,
    amountTypeFilter,
    students,
    payments,
  ]);

  // Function to calculate pending fees for a student's academic detail
  const calculatePendingFees = (studentId: number, academicId: number, totalFees: number): number => {
    const relevantPayments = payments.filter(
      (payment) =>
        payment.studentId === studentId &&
        payment.studentAcademic.id === academicId &&
        (payment.amountType === 'feesAmount' || payment.amountType === 'AmountFees')
    );
    const totalPaid = relevantPayments.reduce((sum, payment) => sum + payment.amount, 0);
    return totalFees - totalPaid > 0 ? totalFees - totalPaid : 0;
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError('');

      const studentResponse = await axiosInstance.get('/students');
      const formattedStudents: Student[] = studentResponse.data.map((student: any) => ({
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

      const paymentResponse = await axiosInstance.get('/amountType');
      const formattedPayments: StudentPayment[] = paymentResponse.data.data.map((payment: any) => ({
        id: payment.id,
        studentId: payment.student.id,
        amount: payment.amount || 0,
        amountType: payment.amountType || '',
        paymentMode: payment.paymentMode || '',
        receivedDate: payment.receivedDate || null,
        transactionNumber: payment.transactionNumber || '',
        courseYear: payment.courseYear || '',
        sessionYear: payment.sessionYear || '',
        studentAcademic: {
          id: payment.studentAcademic.id,
          sessionYear: payment.studentAcademic.sessionYear,
          feesAmount: payment.studentAcademic.feesAmount,
          adminAmount: payment.studentAcademic.adminAmount,
          paymentMode: payment.studentAcademic.paymentMode,
          courseYear: payment.studentAcademic.courseYear,
        },
      }));

      const courseYears = new Set<string>();
      const sessionYears = new Set<string>();
      const colleges = new Set<string>();
      const courses = new Set<string>();
      const categories = new Set<string>();
      const genders = new Set<string>();

      formattedStudents.forEach((student) => {
        colleges.add(student.college.collegeName);
        courses.add(student.course.courseName);
        student.academicDetails.forEach((detail) => {
          sessionYears.add(detail.sessionYear);
          courseYears.add(detail.courseYear || 'N/A');
        });
        categories.add(student.category);
        genders.add(student.gender);
      });

      setFilterOptions((prev) => ({
        ...prev,
        courseYears,
        colleges,
        sessionYears,
        courses,
        categories,
        genders,
      }));

      setStudents(formattedStudents);
      setPayments(formattedPayments);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch data');
      console.error('Fetch error:', err);
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 300);
      const minLoadingTime = setTimeout(() => {
        setShowLoading(false);
      }, 300);
      return () => clearTimeout(minLoadingTime);
    }
  };

  const calculateSummaryData = (filteredStudents: Student[], paymentData: StudentPayment[]) => {
    let adminAmount = 0;
    let feesAmount = 0;
    let adminReceived = 0;
    let feesReceived = 0;
    let totalFine = 0;
    let totalRefund = 0;

    filteredStudents.forEach((student) => {
      student.academicDetails.forEach((academic) => {
        adminAmount += academic.adminAmount || 0;
        feesAmount += academic.feesAmount || 0;
      });
    });

    paymentData.forEach((payment) => {
      // Only include payments for filtered students
      const isStudentIncluded = filteredStudents.some(
        (student) =>
          student.id === payment.studentId &&
          student.academicDetails.some((academic) => academic.id === payment.studentAcademic.id)
      );

      if (isStudentIncluded) {
        if (payment.amountType === 'adminAmount') {
          adminReceived += payment.amount || 0;
        } else if (payment.amountType === 'feesAmount' || payment.amountType === 'AmountFees') {
          feesReceived += payment.amount || 0;
        } else if (payment.amountType === 'fineAmount') {
          totalFine += payment.amount || 0;
        } else if (payment.amountType === 'refundAmount') {
          totalRefund += payment.amount || 0;
        }
      }
    });

    setSummaryData({
      totalStudents: filteredStudents.length,
      adminAmount,
      adminReceived,
      adminPending: adminAmount - adminReceived,
      feesAmount,
      feesReceived,
      feesPending: feesAmount - feesReceived,
      totalFine,
      totalRefund,
    });
  };

  const openPaymentModal = (studentId: number, sessionYear: string, courseYear: string) => {
    setCurrentStudentId(studentId);
    setSelectedSessionYear(sessionYear);
    setSelectedCourseYear(courseYear);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentClick = (studentId: number, sessionYear?: string, courseYear?: string) => {
    const student = students.find((s) => s.id === studentId);
    if (!student || student.academicDetails.length === 0) {
      setError('No academic details available for this student');
      return;
    }

    let matchingAcademic: AcademicDetail | undefined;
    if (sessionYear && courseYear) {
      matchingAcademic = student.academicDetails.find(
        (academic) => academic.sessionYear === sessionYear && academic.courseYear === courseYear
      );
    } else if (sessionYearFilter && yearFilter) {
      matchingAcademic = student.academicDetails.find(
        (academic) => academic.sessionYear === sessionYearFilter && academic.courseYear === yearFilter
      );
    }

    if (!matchingAcademic) {
      matchingAcademic = student.academicDetails.sort(
        (a, b) => new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime()
      )[0];
    }

    if (!matchingAcademic) {
      setError('No matching academic details found');
      return;
    }

    openPaymentModal(studentId, matchingAcademic.sessionYear, matchingAcademic.courseYear);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCourseFilter('');
    setCollegeFilter('');
    setSessionYearFilter(currentSessionYear);
    setStatusFilter('');
    setYearFilter('');
    setFeesFilter('Pending');
    setAmountTypeFilter('');
    setCurrentPage(1);
  };

  const getStatusValue = (status: string) => {
    switch (status) {
      case 'Fresh Student':
        return 'fresh';
      case 'Active':
        return 'active';
      case 'Inactive':
        return 'inactive';
      case 'Discontinued':
        return 'discontinued';
      default:
        return '';
    }
  };

  const calculateTotalPaid = (studentId: number, academicId: number): number => {
    const relevantPayments = payments.filter(
      (payment) =>
        payment.studentId === studentId &&
        payment.studentAcademic.id === academicId &&
        (payment.amountType === 'feesAmount' || payment.amountType === 'AmountFees')
    );
    return relevantPayments.reduce((sum, payment) => sum + payment.amount, 0);
  };

  const filteredStudents = students
    .map((student) => {
      const filteredAcademicDetails = student.academicDetails.filter((academic) => {
        const pendingFees = calculatePendingFees(student.id, academic.id, academic.feesAmount);
        const isFullPaid = pendingFees === 0;
        const isPending = pendingFees > 0;

        const matchesFees =
          feesFilter === 'All' ||
          (feesFilter === 'Pending' && isPending) ||
          (feesFilter === 'Full Payment' && isFullPaid);

        const matchesSessionYear = !sessionYearFilter || academic.sessionYear === sessionYearFilter;
        const matchesYear = !yearFilter || academic.courseYear === yearFilter;

        if (amountTypeFilter) {
          if (amountTypeFilter === 'adminAmount' || amountTypeFilter === 'feesAmount') {
            const hasPaymentOfType = payments.some(
              (payment) =>
                payment.studentId === student.id &&
                payment.studentAcademic.id === academic.id &&
                payment.amountType === amountTypeFilter
            );
            return matchesFees && matchesSessionYear && matchesYear && hasPaymentOfType;
          } else if (amountTypeFilter === 'fineAmount' || amountTypeFilter === 'refundAmount') {
            const hasPaymentOfType = payments.some(
              (payment) => payment.studentId === student.id && payment.amountType === amountTypeFilter
            );
            return matchesSessionYear && matchesYear && hasPaymentOfType;
          }
        }

        return matchesFees && matchesSessionYear && matchesYear;
      });

      if (filteredAcademicDetails.length === 0 && (sessionYearFilter || yearFilter || amountTypeFilter)) {
        return null;
      }

      if (!sessionYearFilter && !yearFilter && !amountTypeFilter && feesFilter === 'Pending') {
        const pendingAcademicDetails = student.academicDetails.filter((academic) => {
          const pendingFees = calculatePendingFees(student.id, academic.id, academic.feesAmount);
          return pendingFees > 0;
        });
        if (pendingAcademicDetails.length === 0) return null;
        return { ...student, academicDetails: pendingAcademicDetails };
      }

      return { ...student, academicDetails: filteredAcademicDetails };
    })
    .filter((student): student is Student => student !== null)
    .filter((student) => {
      const matchesSearch =
        searchQuery === '' ||
        student.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        [
          student.fName,
          student.lName,
          student.email,
          student.mobileNumber,
          student.fatherName,
          student.stdCollId,
          student.address,
          student.category,
          student.gender,
        ].some((field) => field?.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCourse = !courseFilter || student.course.courseName === courseFilter;
      const matchesCollege = !collegeFilter || student.college.collegeName === collegeFilter;

      const matchesStatus =
        !statusFilter ||
        (getStatusValue(statusFilter) === 'fresh' &&
          student.status &&
          !student.isDiscontinue &&
          student.academicDetails.some((ad) => ad.courseYear === '1st')) ||
        (getStatusValue(statusFilter) === 'active' && student.status && !student.isDiscontinue) ||
        (getStatusValue(statusFilter) === 'inactive' && !student.status && !student.isDiscontinue) ||
        (getStatusValue(statusFilter) === 'discontinued' && student.isDiscontinue);

      return matchesSearch && matchesCourse && matchesCollege && matchesStatus;
    });

  // Calculate summary data based on filtered students
  useEffect(() => {
    calculateSummaryData(filteredStudents, payments);
  }, [filteredStudents, payments]);

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

  const handleExportToExcel = () => {
    if (paginatedStudents.length === 0) {
      toast.warning('No data to export');
      return;
    }

    const excelData = paginatedStudents.flatMap((student) =>
      student.academicDetails.map((academic) => {
        const firstEmi = student.emiDetails.find(
          (emi) => emi.emiNumber === 1 && emi.studentAcademicId === academic.id
        );
        const secondEmi = student.emiDetails.find(
          (emi) => emi.emiNumber === 2 && emi.studentAcademicId === academic.id
        );

        return {
          'S.No': (currentPage - 1) * entriesPerPage + paginatedStudents.indexOf(student) + 1,
          'College ID': student.stdCollId || 'N/A',
          'Name': `${student.fName} ${student.lName || ''}`,
          'Roll No': student.rollNumber,
          'Course Year': academic.courseYear || 'N/A',
          'Session Year': academic.sessionYear || 'N/A',
          'Admin Amount': academic.adminAmount?.toLocaleString() || '0',
          'Pending Fees': calculatePendingFees(student.id, academic.id, academic.feesAmount).toLocaleString() || '0',
          'Paid Fees': calculateTotalPaid(student.id, academic.id).toLocaleString() || '0',
          'Course': student.course.courseName,
          'College': student.college.collegeName,
          'Mobile': student.mobileNumber,
          'Status': student.status ? 'Active' : 'Inactive',
          'Discontinued By': student.discontinueBy || 'N/A',
          'Category': student.category,
          'Gender': student.gender,
          'Address': student.address,
          'Pin Code': student.pincode,
          'DOB': new Date(student.dob).toLocaleDateString(),
          'Admission Date': new Date(student.admissionDate).toLocaleDateString(),
          'Is Discontinued': student.isDiscontinue ? 'Yes' : 'No',
          'Payment Mode': academic.paymentMode || 'N/A',
          'Ledger No': academic.ledgerNumber || 'N/A',
          'Total EMIs': academic.numberOfEMI || 'N/A',
          '1st EMI': firstEmi?.amount?.toLocaleString() || 'N/A',
          '2nd EMI': secondEmi?.amount?.toLocaleString() || 'N/A',
          '1st EMI Date': firstEmi ? new Date(firstEmi.dueDate).toLocaleDateString() : 'N/A',
          '2nd EMI Date': secondEmi ? new Date(secondEmi.dueDate).toLocaleDateString() : 'N/A',
        };
      })
    );

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    worksheet['!cols'] = [
      { wch: 8 },
      { wch: 15 },
      { wch: 20 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
      { wch: 12 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 25 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Student Payment Data');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `student-payment-data-${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success('Downloaded Excel sheet', {
      position: 'top-center',
      autoClose: 3000,
    });
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
  if (error) return <div className="text-xs text-red-500 p-1">{error}</div>;

  return (
    <>
      <Breadcrumb pageName="Payment Management" />

      <div className="p-1 mt-3 mb-2 bg-gradient-to-r from-white to-gray-50 rounded-lg shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-1 mb-1 text-black">
          <div className="flex-1 min-w-[100px]">
            <label className="text-xs font-semibold text-black flex items-center mb-0.5">
              <FaCheckCircle className="mr-1 text-gray-600 text-[12px]" /> Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded py-0.5 px-1 text-xs w-full bg-white focus:ring-1 focus:ring-blue-300 focus:border-blue-300 transition-colors duration-150"
            >
              <option value="">All</option>
              {Array.from(filterOptions.statuses).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[100px]">
            <label className="text-xs font-semibold text-black flex items-center mb-0.5">
              <FaUniversity className="mr-1 text-gray-600 text-[10px]" /> College
            </label>
            <select
              value={collegeFilter}
              onChange={(e) => setCollegeFilter(e.target.value)}
              className="border border-gray-200 rounded py-0.5 px-1 text-xs w-full bg-white focus:ring-1 focus:ring-blue-300 focus:border-blue-300 transition-colors duration-150"
            >
              <option value="">All</option>
              {Array.from(filterOptions.colleges).map((college) => (
                <option key={college} value={college}>
                  {college}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[100px]">
            <label className="text-xs font-semibold text-black flex items-center mb-0.5">
              <FaBook className="mr-1 text-gray-600 text-[10px]" /> Course
            </label>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="border border-gray-200 rounded py-0.5 px-1 text-xs w-full bg-white focus:ring-1 focus:ring-blue-300 focus:border-blue-300 transition-colors duration-150"
            >
              <option value="">All</option>
              {Array.from(filterOptions.courses).map((course) => (
                <option key={course} value={course}>
                  {course}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[100px]">
            <label className="text-xs font-semibold text-black flex items-center mb-0.5">
              <FaCalendarAlt className="mr-1 text-gray-600 text-[10px]" /> Session Year
            </label>
            <select
              value={sessionYearFilter}
              onChange={(e) => setSessionYearFilter(e.target.value)}
              className="border border-gray-200 rounded py-0.5 px-1 text-xs w-full bg-white focus:ring-1 focus:ring-blue-300 focus:border-blue-300 transition-colors duration-150"
            >
              <option value="">All</option>
              {Array.from(filterOptions.sessionYears).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[100px]">
            <label className="text-xs font-semibold text-black flex items-center mb-0.5">
              <FaCalendarAlt className="mr-1 text-gray-600 text-[10px]" /> Year
            </label>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="border border-gray-200 rounded py-0.5 px-1 text-xs w-full bg-white focus:ring-1 focus:ring-blue-300 focus:border-blue-300 transition-colors duration-150"
            >
              <option value="">All</option>
              {Array.from(filterOptions.courseYears).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[100px]">
            <label className="text-xs font-semibold text-black flex items-center mb-0.5">
              <FaMoneyBill className="mr-1 text-gray-600 text-[10px]" /> Fees
            </label>
            <select
              value={feesFilter}
              onChange={(e) => setFeesFilter(e.target.value)}
              className="border border-gray-200 rounded py-0.5 px-1 text-xs w-full bg-white focus:ring-1 focus:ring-blue-300 focus:border-blue-300 transition-colors duration-150"
            >
              <option value="All">All</option>
              <option value="Pending">Pending</option>
              <option value="Full Payment">Full Payment</option>
            </select>
          </div>
          <div className="flex-1 min-w-[110px]">
            <label className="text-xs font-semibold text-black flex items-center mb-0.5">
              <FaCoins className="mr-1 text-gray-600 text-[10px]" /> Amount Type
            </label>
            <select
              value={amountTypeFilter}
              onChange={(e) => setAmountTypeFilter(e.target.value)}
              className="border border-gray-200 rounded py-0.5 px-1 text-xs w-full bg-white focus:ring-1 focus:ring-blue-300 focus:border-blue-300 transition-colors duration-150"
            >
              <option value="">All Types</option>
              {Array.from(filterOptions.amountTypes).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-1 min-w-[300px]">
            <div className="flex-1 min-w-[150px]">
              <label className="text-xs font-semibold text-black flex items-center mb-0.5">
                <FaSearch className="mr-1 text-gray-600 text-[10px]" /> Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Name, Roll No, ID..."
                  className="pl-5 pr-1 py-0.5 border border-gray-200 rounded text-xs w-full bg-white focus:ring-1 focus:ring-blue-300 focus:border-blue-300 transition-colors duration-150"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <FaSearch className="absolute left-1.5 top-1.5 text-gray-400 text-[9px]" />
              </div>
            </div>
            <div className="flex gap-1 self-end mb-0.5">
              <button
                onClick={clearFilters}
                className="inline-flex items-center px-2 py-0.5 bg-gray-300 hover:bg-gray-200 text-black rounded text-xs font-medium focus:ring-1 focus:ring-gray-300 transition-colors duration-150"
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
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 sm:gap-1.5 mb-1.5">
        <div className="bg-gradient-to-br from-white to-blue-50 rounded-lg shadow-sm border border-blue-100 p-1.5 transition-all duration-200 hover:shadow-md">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center">
              <FaMoneyCheck className="text-blue-600 mr-1" size={20} />
              <span className="text-md font-semibold text-gray-700">Admin Amount</span>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-200 flex items-center justify-center">
              <span className="text-[13px] font-bold text-blue-800">
                {Math.round((summaryData.adminReceived / (summaryData.adminAmount || 1)) * 100)}%
              </span>
            </div>
          </div>
          <div className="mb-1">
            <p className="text-sm font-bold text-blue-700">
              ₹{summaryData.adminAmount.toLocaleString()}
            </p>
          </div>
          <div className="flex items-center justify-between text-[12px] space-x-2">
            <div className="flex items-center">
              <div className="w-1 h-1 rounded-full bg-green-500 mr-0.5"></div>
              <span className="text-gray-600 text-[13px]">Received:</span>
              <span className="text-green-700 font-medium ml-0.5">
                ₹{summaryData.adminReceived.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center">
              <div className="w-1 h-1 rounded-full bg-red-500 mr-0.5"></div>
              <span className="text-gray-600 text-[13px]">Pending:</span>
              <span className="text-red-600 font-medium ml-0.5">
                ₹{summaryData.adminPending.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-white to-green-50 rounded-lg shadow-sm border border-green-100 p-1.5 transition-all duration-200 hover:shadow-md">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center">
              <FaMoneyBill className="text-green-600 mr-1" size={20} />
              <span className="text-md font-semibold text-gray-700">Fees Amount</span>
            </div>
            <div className="h-10 w-10 rounded-full bg-green-200 flex items-center justify-center">
              <span className="text-[13px] font-bold text-green-800">
                {Math.round((summaryData.feesReceived / (summaryData.feesAmount || 1)) * 100)}%
              </span>
            </div>
          </div>
          <div className="mb-1">
            <p className="text-sm font-bold text-green-700">
              ₹{summaryData.feesAmount.toLocaleString()}
            </p>
          </div>
          <div className="flex items-center text-[12px] justify-between space-x-2">
            <div className="flex items-center">
              <div className="w-1 h-1 rounded-full bg-green-500 mr-0.5"></div>
              <span className="text-gray-600 text-[13px]">Received:</span>
              <span className="text-green-700 font-medium ml-0.5">
                ₹{summaryData.feesReceived.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center">
              <div className="w-1 h-1 rounded-full bg-red-500 mr-0.5"></div>
              <span className="text-gray-600 text-[13px]">Pending:</span>
              <span className="text-red-600 font-medium ml-0.5">
                ₹{summaryData.feesPending.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-white to-pink-100 p-1.5 rounded-lg shadow-sm border border-gray-100 transition-all duration-200 hover:shadow-md">
          <div className="flex justify-between items-center mb-1">
            <p className="text-md font-semibold text-gray-700 flex items-center">
              <FaUsers className="mr-1 text-blue-500" size={20} />
              Students
            </p>
            <div className="flex space-x-1.5">
              <span className="bg-blue-100 text-blue-800 text-semibold px-1 py-0 rounded-full flex items-center">
                <span className="w-0.5 p-1.5 font-xs rounded-full bg-blue-500"></span>
                Total: <b>{summaryData.totalStudents}</b>
              </span>
              <span className="bg-amber-100 text-amber-800 text-bold px-1 py-0 rounded-full flex items-center">
                <span className="w-0.5 p-1 font-semibold rounded-full bg-amber-500 mr-0.5"></span>
                Filtered: <b>{filteredStudents.length}</b>
              </span>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-1 mt-1">
            <div className="flex items-center mb-0.5">
              <div className="flex space-x-0.5 items-center">
                <FaHandHoldingUsd className="text-red-600" size={20} />
                <FaExchangeAlt className="text-amber-600" size={20} />
              </div>
              <span className="text-md font-semibold text-gray-700 ml-1">Fine & Refund</span>
            </div>
            <div className="grid grid-cols-2 gap-1 mb-0.5">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-[14px] text-black font-medium">Fine</p>
                  <p className="text-xs font-bold text-red-600">
                    ₹{summaryData.totalFine.toLocaleString()}
                  </p>
                </div>
                <div className="h-1 bg-gray-200 rounded-full overflow-hidden mt-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        (summaryData.totalFine / (summaryData.feesAmount || 1)) * 100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-[13px] text-black font-medium">Refund</p>
                  <p className="text-xs font-bold text-amber-600">
                    ₹{summaryData.totalRefund.toLocaleString()}
                  </p>
                </div>
                <div className="h-1 bg-gray-200 rounded-full overflow-hidden mt-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        (summaryData.totalRefund / (summaryData.feesAmount || 1)) * 100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="relative overflow-x-auto max-h-[70vh] flex justify-between items-center p-1">
          <div></div>
          <button
            onClick={handleExportToExcel}
            className="flex items-center text-green-600 hover:text-green-800 text-xs px-2 py-1 bg-white border border-green-300 rounded hover:bg-green-50 transition-all duration-150"
          >
            <FaFileExcel className="mr-1 text-base" />
            Export to Excel
          </button>
        </div>
        <div className="relative overflow-x-auto max-h-[70vh]">
          <table className="min-w-full bg-white text-xs text-black-2 border-collapse">
            <thead className="bg-gradient-to-r from-blue-200 to-indigo-200 text-gray-600 sticky top-0 z-10">
              <tr>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">
                  S.No
                </th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">
                  Actions
                </th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">
                  College Id
                </th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">
                  Name
                </th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">
                  Roll No
                </th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">
                  Course Year
                </th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">
                  Session Year
                </th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-right font-semibold tracking-tight whitespace-nowrap">
                  Admin Amount
                </th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-right font-semibold tracking-tight whitespace-nowrap">
                  Pending Fees
                </th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-right font-semibold tracking-tight whitespace-nowrap">
                  Paid Fees
                </th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">
                  Course
                </th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">
                  College
                </th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">
                  Mobile
                </th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">
                  Status
                </th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">
                  Discontinued By
                </th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">
                  Category
                </th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">
                  Gender
                </th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">
                  Address
                </th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">
                  Pin Code
                </th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">
                  DOB
                </th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">
                  Admission Date
                </th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">
                  Is Discontinued
                </th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">
                  Payment Mode
                </th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-left font-semibold tracking-tight whitespace-nowrap">
                  Ledger No
                </th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-center font-semibold tracking-tight whitespace-nowrap">
                  Total EMIs
                </th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-center font-semibold tracking-tight whitespace-nowrap">
                  1st EMI
                </th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-center font-semibold tracking-tight whitespace-nowrap">
                  2nd EMI
                </th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-center font-semibold tracking-tight whitespace-nowrap">
                  1st EMI Date
                </th>
                <th className="px-1.5 py-1 border-b border-gray-100 text-center font-semibold tracking-tight whitespace-nowrap">
                  2nd EMI Date
                </th>
              </tr>
            </thead>
            <tbody>
              {isFilterLoading ? (
                <tr>
                  <td colSpan={29} className="px-1.5 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center min-h-[150px] bg-gray-50 border-t border-gray-200">
                      <FaSpinner className="animate-spin h-8 w-8 text-indigo-600 mb-3" />
                      <p className="text-sm font-medium text-gray-600">Loading payments...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedStudents.length > 0 ? (
                paginatedStudents.map((student, index) =>
                  student.academicDetails.map((academic) => {
                    const firstEmi = student.emiDetails.find(
                      (emi) => emi.emiNumber === 1 && emi.studentAcademicId === academic.id
                    );
                    const secondEmi = student.emiDetails.find(
                      (emi) => emi.emiNumber === 2 && emi.studentAcademicId === academic.id
                    );

                    return (
                      <tr
                        key={`${student.id}-${academic.id}`}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150 align-middle"
                      >
                        <td className="px-1.5 py-1 text-center">
                          {(currentPage - 1) * entriesPerPage + index + 1}
                        </td>
                        <td className="px-1.5 py-1">
                          <div className="flex space-x-1">
                            <button
                              onClick={() =>
                                handlePaymentClick(student.id, academic.sessionYear, academic.courseYear)
                              }
                              className="flex items-center justify-center px-2 py-0.5 text-xs font-medium text-green-600 bg-white rounded-full border border-green-300 hover:bg-green-50 transition-all duration-150 shadow-sm"
                              title="Make Payments"
                            >
                              <FaMoneyBill className="mr-1 text-green-500" size={10} />
                              <span>Pay</span>
                            </button>
                          </div>
                        </td>
                        <td className="px-1.5 py-1 font-medium truncate max-w-[150px]" title="Click karne par payment slip download hogi">
                          {student.stdCollId || '-'}
                        </td>
                        <td className="px-1.5 py-1 capitalize truncate max-w-[120px]">
                          {student.fName} {student.lName || ''}
                        </td>
                        <td className="px-1.5 py-1 truncate max-w-[80px]">{student.rollNumber}</td>
                        <td className="px-1.5 py-1 truncate max-w-[60px]">{academic.courseYear || 'N/A'}</td>
                        <td className="px-1.5 py-1 truncate max-w-[80px]">{academic.sessionYear || 'N/A'}</td>
                        <td className="px-1.5 py-1 text-right truncate max-w-[80px]">
                          {academic.adminAmount?.toLocaleString() || '0'}
                        </td>
                        <td className="px-1.5 py-1 text-right truncate max-w-[80px]">
                          {calculatePendingFees(student.id, academic.id, academic.feesAmount).toLocaleString() || '0'}
                        </td>
                        <td className="px-1.5 py-1 text-right truncate max-w-[80px]">
                          {calculateTotalPaid(student.id, academic.id).toLocaleString() || '0'}
                        </td>
                        <td className="px-1.5 py-1 truncate max-w-[100px]">{student.course?.courseName}</td>
                        <td className="px-1.5 py-1 truncate max-w-[120px]">{student.college?.collegeName}</td>
                        <td className="px-1.5 py-1 truncate max-w-[90px]">{student.mobileNumber}</td>
                        <td className="px-1.5 py-1">
                          <span
                            className={`inline-flex items-center px-1 py-0.5 rounded-full text-xs font-medium ${
                              student.status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
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
                        <td className="px-1.5 py-1 truncate max-w-[80px]">{student.discontinueBy || 'N/A'}</td>
                        <td className="px-1.5 py-1 truncate max-w-[60px]">{student.category}</td>
                        <td className="px-1.5 py-1 truncate max-w-[60px]">{student.gender}</td>
                        <td className="px-1.5 py-1 truncate max-w-[120px]">{student.address}</td>
                        <td className="px-1.5 py-1 truncate max-w-[60px]">{student.pincode}</td>
                        <td className="px-1.5 py-1 truncate max-w-[80px]">
                          {new Date(student.dob).toLocaleDateString()}
                        </td>
                        <td className="px-1.5 py-1 truncate max-w-[80px]">
                          {new Date(student.admissionDate).toLocaleDateString()}
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
                        <td className="px-1.5 py-1 truncate max-w-[80px]">{academic.paymentMode || 'N/A'}</td>
                        <td className="px-1.5 py-1 truncate max-w-[80px]">{academic.ledgerNumber || 'N/A'}</td>
                        <td className="px-1.5 py-1 text-center truncate max-w-[60px]">
                          {academic.numberOfEMI || 'N/A'}
                        </td>
                        <td className="px-1.5 py-1 text-center truncate max-w-[60px]">
                          {firstEmi?.amount?.toLocaleString() || 'N/A'}
                        </td>
                        <td className="px-1.5 py-1 text-center truncate max-w-[60px]">
                          {secondEmi?.amount?.toLocaleString() || 'N/A'}
                        </td>
                        <td className="px-1.5 py-1 text-center truncate max-w-[80px]">
                          {firstEmi ? new Date(firstEmi.dueDate).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-1.5 py-1 text-center truncate max-w-[80px]">
                          {secondEmi ? new Date(secondEmi.dueDate).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    );
                  })
                )
              ) : (
                <tr>
                  <td colSpan={29} className="px-1.5 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center min-h-[150px] bg-gray-50 border-t border-gray-200">
                      <div className="mb-3">
                        <FileSearch className="h-8 w-8 text-gray-400 animate-pulse" />
                      </div>
                      <p className="text-sm font-medium text-gray-600 mb-1">No Payment records found</p>
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
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center mt-2 p-2 bg-white rounded shadow-md border border-gray-200">
        <div className="flex items-center text-gray-600 space-x-1 mb-2 md:mb-0">
          <span className="text-xs">Show:</span>
          <select
            value={entriesPerPage}
            onChange={(e) => {
              setEntriesPerPage(parseInt(e.target.value));
              setCurrentPage(1);
            }}
            className="border border-gray-200 rounded py-0.5 px-1 text-xs bg-white focus:ring-1 focus:ring-blue-300 focus:border-blue-300"
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
            Page <span className="font-semibold">{currentPage}</span> of{' '}
            <span className="font-semibold">{totalPages || 1}</span>
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

      {isPaymentModalOpen && currentStudentId !== null && selectedSessionYear && selectedCourseYear && (
        <StudentPaymentModal
          studentId={currentStudentId}
          students={students}
          sessionYearFilter={selectedSessionYear}
          yearFilter={selectedCourseYear}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setCurrentStudentId(null);
            setSelectedSessionYear(null);
            setSelectedCourseYear(null);
            // fetchStudents();
          }}
        />
      )}
    </>
  );
};

export default ManagePayment;