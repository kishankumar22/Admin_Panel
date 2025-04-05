import { useState, useEffect } from 'react';
import axiosInstance from '../../config';
import { useAuth } from '../../context/AuthContext';
import { FaEdit, FaTrash, FaSearch } from 'react-icons/fa';
import AddStudentModal from '../students/AddStudentModal';
import EditStudentModal from '../students/EditStudentModal';
import DeleteConfirmationModal from '../students/DeleteConfirmationModal';

interface Student {
  id: number;
  rollNumber: string; // Changed from RollNumber to match Prisma schema
  fName: string; // Changed from FName
  lName: string | null; // Changed from LName
  email: string; // Changed from EmailId
  mobileNumber: string; // Changed from MobileNumber
  course: {
    courseName: string; // Changed from CourseName
  };
  college: {
    collegeName: string; // Changed from CollegeName
  };
  createdOn: string; // Changed from CreatedOn
  // Add other fields as needed from your Prisma model
}

const StudentManagement: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [currentStudentId, setCurrentStudentId] = useState<number | null>(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/students');
      // Ensure the response data matches the Student interface
      const formattedStudents: Student[] = response.data.map((student: any) => ({
        id: student.id,
        rollNumber: student.rollNumber,
        fName: student.fName,
        lName: student.lName || '',
        email: student.email,
        mobileNumber: student.mobileNumber,
        course: {
          courseName: student.course?.courseName || 'N/A',
        },
        college: {
          collegeName: student.college?.collegeName || 'N/A',
        },
        createdOn: student.createdOn,
      }));
      setStudents(formattedStudents);
      console.log('Fetched students:', formattedStudents);
    } catch (err) {
      setError('Failed to fetch students');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (student: Student) => {
    setCurrentStudent(student);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (studentId: number) => {
    setCurrentStudentId(studentId);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!currentStudentId) return;

    try {
      await axiosInstance.delete(`/students/${currentStudentId}`);
      fetchStudents(); // Refresh the list
      setIsDeleteModalOpen(false);
    } catch (err) {
      setError('Failed to delete student');
      console.error('Delete error:', err);
    } 
  };

  const filteredStudents = students.filter(student =>
    [student.fName, student.lName, student.rollNumber, student.email, student.mobileNumber]
      .some(field => field?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) return <div className="text-xs text-gray-500 p-2">Loading...</div>;
  if (error) return <div className="text-xs text-red-500 p-2">{error}</div>;

  return (
    <div className="p-2">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-sm font-bold">Student Management</h1>
        <div className="flex items-center space-x-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Search students..."
              className="pl-6 pr-2 py-1 border rounded-md text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <FaSearch className="absolute left-2 top-1.5 text-gray-400 text-xs" />
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-500 text-white px-2 py-1 rounded-md text-xs hover:bg-blue-600"
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
              <th className="py-1 px-2 border text-xs">Mobile</th>
              {/* <th className="py-1 px-2 border text-xs">College</th> */}
              <th className="py-1 px-2 border text-xs">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student, index) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="py-1 px-2 border text-center text-xs">{index + 1}</td>
                  <td className="py-1 px-2 border text-xs">{student.fName} {student.lName || ''}</td>
                  <td className="py-1 px-2 border text-center text-xs">{student.rollNumber}</td>
                  <td className="py-1 px-2 border text-xs">{student.email}</td>
                  <td className="py-1 px-2 border text-xs">{student.mobileNumber}</td>
                  {/* <td className="py-1 px-2 border text-xs">{student.college?.collegeName || '-'}</td> */}
                  <td className="py-1 px-2 border text-center">
                    <div className="flex justify-center space-x-1">
                      <button
                        onClick={() => handleEditClick(student)}
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
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-2 text-center text-xs text-gray-500">
                  No students found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
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

      {isEditModalOpen && currentStudent && (
        <EditStudentModal
          student={currentStudent}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => {
            setIsEditModalOpen(false);
            fetchStudents();
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
  );
};

export default StudentManagement;