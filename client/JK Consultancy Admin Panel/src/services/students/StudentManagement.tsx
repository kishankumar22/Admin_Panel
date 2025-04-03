import  { useState, useEffect } from 'react';
import axiosInstance from '../../config';
import { useAuth } from '../../context/AuthContext';
import { FaEdit, FaTrash,  FaSearch } from 'react-icons/fa';
import AddStudentModal from '../students/AddStudentModal';
import EditStudentModal from '../students/EditStudentModal';
import DeleteConfirmationModal from '../students/DeleteConfirmationModal';

interface Student {
  StudentId: number;
  RollNumber: string;
  FName: string;
  LName: string;
  EmailId: string;
  MobileNumber: string;
  CourseName: string;
  College: {
    CollegeName: string;
  };
  CreatedOn: string;
  // Add all other student fields
}

const StudentManagement = () => {
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
      setStudents(response.data);
    } catch (err) {
      setError('Failed to fetch students');
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
    }
  };

  const filteredStudents = (students || []).filter(student =>
    [student.FName, student.LName, student.RollNumber, student.EmailId, student.MobileNumber]
      .some(field => field?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Student Management</h1>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search students..."
              className="pl-8 pr-4 py-2 border rounded-md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            Add Student
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border rounded-lg overflow-hidden">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-2 px-4 border">#</th>
              <th className="py-2 px-4 border">Name</th>
              <th className="py-2 px-4 border">Roll No</th>
              <th className="py-2 px-4 border">Email</th>
              <th className="py-2 px-4 border">Mobile</th>
              <th className="py-2 px-4 border">College</th>
              <th className="py-2 px-4 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student, index) => (
                <tr key={student.StudentId} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border text-center">{index + 1}</td>
                  <td className="py-2 px-4 border">{student.FName} {student.LName}</td>
                  <td className="py-2 px-4 border text-center">{student.RollNumber}</td>
                  <td className="py-2 px-4 border">{student.EmailId}</td>
                  <td className="py-2 px-4 border">{student.MobileNumber}</td>
                  <td className="py-2 px-4 border">{student.College?.CollegeName || '-'}</td>
                  <td className="py-2 px-4 border text-center">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => handleEditClick(student)}
                        className="text-blue-500 hover:text-blue-700"
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(student.StudentId)}
                        className="text-red-500 hover:text-red-700"
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
                <td colSpan={7} className="py-4 text-center text-gray-500">
                  No students found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Student Modal */}
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

      {/* Edit Student Modal */}
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

      {/* Delete Confirmation Modal */}
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