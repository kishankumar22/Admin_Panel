import { useState, useEffect } from 'react';
import axiosInstance from '../../config';
import { useAuth } from '../../context/AuthContext';
import { FaEdit, FaTrash, FaSearch, FaTimes, FaMoneyBill, FaFilter, FaPlus, FaFileAlt } from 'react-icons/fa';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import EditStudentModal from './EditStudentModal';
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
  course: {
    courseName: string;
  };
  college: {
    collegeName: string;
  };
  academicDetails: AcademicDetail[];
  emiDetails: EmiDetail[];
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
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [courseYearFilter, setCourseYearFilter] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [sessionYearFilter, setSessionYearFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [admissionModeFilter, setAdmissionModeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  
  // Filter options
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
        course: {
          courseName: student.course?.courseName || 'N/A',
        },
        college: {
          collegeName: student.college?.collegeName || 'N/A',
        },
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
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch students');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
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
    setCourseYearFilter('');
    setCollegeFilter('');
    setSessionYearFilter('');
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
      student.fatherName,
    ].some(field => field?.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCourseYear = !courseYearFilter || latestAcademic.courseYear === courseYearFilter;
    const matchesCollege = !collegeFilter || student.college.collegeName === collegeFilter;
    const matchesSessionYear = !sessionYearFilter || latestAcademic.sessionYear === sessionYearFilter;
    const matchesCategory = !categoryFilter || student.category === categoryFilter;
    const matchesAdmissionMode = !admissionModeFilter || student.admissionMode === admissionModeFilter;
    const matchesStatus = !statusFilter || 
      (statusFilter === 'active' && student.status) ||
      (statusFilter === 'inactive' && !student.status) ||
      (statusFilter === 'discontinued' && student.isDiscontinue);

    return matchesSearch && matchesCourseYear && matchesCollege && 
           matchesSessionYear && matchesStatus && matchesCategory && matchesAdmissionMode;
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
      
      {/* Compact Filter Section */}
      <div className="p-1 mb-1 bg-white rounded border">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                className="pl-6 pr-2 py-1 border rounded text-xs w-40 focus:outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <FaSearch className="absolute left-2 top-2 text-gray-400 text-xs" />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-2 py-1 bg-gray-100 rounded text-xs"
            >
              <FaFilter className="mr-1" /> Filters
            </button>
            <button
              onClick={clearFilters}
              className="flex items-center px-2 py-1 bg-gray-100 rounded text-xs"
            >
              <FaTimes className="mr-1" /> Clear
            </button>
          </div>
          <div className="text-xs">
            Total: <span className="font-bold">{students.length}</span> | Showing: <span className="font-bold">{filteredStudents.length}</span>
          </div>

          
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-1">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded p-1 text-xs w-full"
            >
              {/* <option value="">All Status</option> */}
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="discontinued">Discontinued</option>
            </select>

            <select
              value={courseYearFilter}
              onChange={(e) => setCourseYearFilter(e.target.value)}
              className="border rounded p-1 text-xs w-full"
            >
              <option value="">All Years</option>
              {[...filterOptions.courseYears].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>

            <select
              value={collegeFilter}
              onChange={(e) => setCollegeFilter(e.target.value)}
              className="border rounded p-1 text-xs w-full"
            >
              <option value="">All Colleges</option>
              {[...filterOptions.colleges].map(college => (
                <option key={college} value={college}>{college}</option>
              ))}
            </select>

            <select
              value={sessionYearFilter}
              onChange={(e) => setSessionYearFilter(e.target.value)}
              className="border rounded p-1 text-xs w-full"
            >
              <option value="">All Sessions</option>
              {[...filterOptions.sessionYears].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border rounded p-1 text-xs w-full"
            >
              <option value="">All Categories</option>
              {[...filterOptions.categories].map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            <select
              value={admissionModeFilter}
              onChange={(e) => setAdmissionModeFilter(e.target.value)}
              className="border rounded p-1 text-xs w-full"
            >
              <option value="">All Modes</option>
              {[...filterOptions.admissionModes].map(mode => (
                <option key={mode} value={mode}>{mode}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Compact Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border text-xs text-black">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-1 border">#</th>
              <th className="p-1 border">Name</th>
              <th className="p-1 border">Roll No</th>
              <th className="p-1 border">Father</th>
              <th className="p-1 border">Course</th>
              <th className="p-1 border">College</th>
              <th className="p-1 border">Mobile</th>
              <th className="p-1 border">Status</th>
              <th className="p-1 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedStudents.length > 0 ? (
              paginatedStudents.map((student, index) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="p-1 border text-center">{(currentPage - 1) * entriesPerPage + index + 1}</td>
                  <td className="p-1 border">{student.fName} {student.lName || ''}</td>
                  <td className="p-1 border text-center">{student.rollNumber}</td>
                  <td className="p-1 border">{student.fatherName}</td>
                  <td className="p-1 border">{student.course?.courseName}</td>
                  <td className="p-1 border">{student.college?.collegeName}</td>
                  <td className="p-1 border">{student.mobileNumber}</td>
                  <td className="p-1 border text-center">
                    <span className={`inline-block w-2 h-2 rounded-full mr-1 ${
                      student.isDiscontinue ? 'bg-red-500' : 
                      student.status ? 'bg-green-500' : 'bg-yellow-500'
                    }`}></span>
                    {student.isDiscontinue ? 'Discontinued' : student.status ? 'Active' : 'Inactive'}
                  </td>
                  <td className="p-1 border text-center">
                    <button
                      onClick={() => handleViewDetails(student.id)}
                      className="text-blue-500 hover:text-blue-700 mx-1"
                      title="View Details"
                    >
                      <FaFileAlt />
                    </button>
                    <button
                      onClick={() => handlePaymentClick(student.id)}
                      className="text-green-500 hover:text-green-700 mx-1"
                      title="Payment"
                    >
                      <FaMoneyBill />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="p-2 text-center text-xs">
                  No students found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Compact Pagination */}
      <div className="flex flex-col md:flex-row justify-between items-center mt-1 text-xs">
        <div className="flex items-center space-x-1 mb-1 md:mb-0">
          <span>Show:</span>
          <select
            value={entriesPerPage}
            onChange={(e) => {
              setEntriesPerPage(parseInt(e.target.value));
              setCurrentPage(1);
            }}
            className="border rounded p-1"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span>entries</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-2 py-1 bg-gray-100 rounded disabled:opacity-50"
          >
            Prev
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-2 py-1 bg-gray-100 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {/* Student Details Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-50">
          <div className="bg-white rounded border shadow w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-2 border-b flex justify-between items-center">
              <h3 className="text-sm font-semibold">
                {selectedStudent.fName} {selectedStudent.lName} - {selectedStudent.rollNumber}
              </h3>
              <button
                onClick={() => setSelectedStudent(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-2">
              <div className="flex border-b mb-2 overflow-x-auto">
                <button
                  className={`py-1 px-3 whitespace-nowrap ${activeTab === 'academic' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
                  onClick={() => setActiveTab('academic')}
                >
                  Academic
                </button>
                <button
                  className={`py-1 px-3 whitespace-nowrap ${activeTab === 'emi' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
                  onClick={() => setActiveTab('emi')}
                >
                  EMI Details
                </button>
                <button
                  className={`py-1 px-3 whitespace-nowrap ${activeTab === 'personal' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
                  onClick={() => setActiveTab('personal')}
                >
                  Personal Info
                </button>
              </div>

              {activeTab === 'academic' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full border text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-1 border">Session</th>
                        <th className="p-1 border">Year</th>
                        <th className="p-1 border">Payment Mode</th>
                        <th className="p-1 border">Admin Amt</th>
                        <th className="p-1 border">Fees Amt</th>
                        <th className="p-1 border">EMIs</th>
                        <th className="p-1 border">Ledger</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedStudent.academicDetails.map((detail) => (
                        <tr key={detail.id} className="hover:bg-gray-50">
                          <td className="p-1 border">{detail.sessionYear}</td>
                          <td className="p-1 border">{detail.courseYear}</td>
                          <td className="p-1 border">{detail.paymentMode}</td>
                          <td className="p-1 border">{detail.adminAmount}</td>
                          <td className="p-1 border">{detail.feesAmount}</td>
                          <td className="p-1 border">{detail.numberOfEMI || 'N/A'}</td>
                          <td className="p-1 border">{detail.ledgerNumber || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'emi' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full border text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-1 border">EMI#</th>
                        <th className="p-1 border">Amount</th>
                        <th className="p-1 border">Due Date</th>
                        <th className="p-1 border">Session</th>
                        <th className="p-1 border">Year</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedStudent.emiDetails.map((emi) => {
                        const academicDetail = selectedStudent.academicDetails.find(
                          (ad) => ad.id === emi.studentAcademicId
                        );
                        return (
                          <tr key={emi.id} className="hover:bg-gray-50">
                            <td className="p-1 border">{emi.emiNumber}</td>
                            <td className="p-1 border">{emi.amount}</td>
                            <td className="p-1 border">{new Date(emi.dueDate).toLocaleDateString()}</td>
                            <td className="p-1 border">
                              {academicDetail?.sessionYear || 'N/A'}
                            </td>
                            <td className="p-1 border">
                              {academicDetail?.courseYear || 'N/A'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'personal' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div>
                    <p><span className="font-medium">Email:</span> {selectedStudent.email}</p>
                    <p><span className="font-medium">Mobile:</span> {selectedStudent.mobileNumber}</p>
                    <p><span className="font-medium">Father:</span> {selectedStudent.fatherName}</p>
                    <p><span className="font-medium">Category:</span> {selectedStudent.category}</p>
                  </div>
                  <div>
                    <p><span className="font-medium">Admission Mode:</span> {selectedStudent.admissionMode}</p>
                    <p><span className="font-medium">Status:</span> {selectedStudent.status ? 'Active' : 'Inactive'}</p>
                    <p><span className="font-medium">Discontinued:</span> {selectedStudent.isDiscontinue ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-2 border-t flex justify-end">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-3 py-1 bg-gray-100 rounded text-xs hover:bg-gray-200"
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
            onClose={() => {
              setIsPaymentModalOpen(false);
              setCurrentStudentId(null);
            }}
          />
        )}


    </>
  );
};

export default ManagePayment;