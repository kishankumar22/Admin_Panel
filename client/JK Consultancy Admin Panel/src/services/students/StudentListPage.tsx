import { useEffect, useState } from 'react';
import { Student } from '../../../src/types/student';

import ViewStudentModel from './ViewStudentModel';
import axiosInstance from '../../config';

const StudentListPage = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/students');
      console.log( "Student Data ",response.data)
      const data = response.data.map((student: any) => ({
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
      setStudents(data);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Student List</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="w-full border-collapse border border-gray-300 text-sm">
          <thead>
            <tr>
              <th className="border p-2">Name</th>
              <th className="border p-2">Email</th>
              <th className="border p-2">College</th>
              <th className="border p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td className="border p-2">{student.fName} {student.lName}</td>
                <td className="border p-2">{student.email}</td>
                <td className="border p-2">{student.college.collegeName}</td>
                <td className="border p-2 text-center">
                  <button
                    className="bg-blue-500 text-white px-3 py-1 rounded"
                    onClick={() => setSelectedStudent(student)}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Reuse the View Model Here */}
      {selectedStudent && (
        <ViewStudentModel student={selectedStudent} onClose={() => setSelectedStudent(null)} />
      )}
    </div>
  );
};

export default StudentListPage;
