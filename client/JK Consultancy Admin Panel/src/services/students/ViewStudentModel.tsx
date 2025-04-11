import React from 'react';
import { Student } from '../../../src/types/student';

interface Props {
  student: Student | null;
  onClose: () => void;
}

const ViewStudentModel: React.FC<Props> = ({ student, onClose }) => {
  if (!student) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center overflow-y-auto p-4">
      <div className="bg-white p-6 rounded-lg w-full max-w-2xl shadow-xl">
        <h2 className="text-2xl font-bold mb-4">Student Details</h2>

        {/* Image */}
        {student.studentImage && (
          <div className="mb-4 flex justify-center">
            <img
              src={student.studentImage}
              alt="Student"
              className="w-32 h-32 object-cover rounded-full shadow border"
            />
          </div>
        )}

        {/* Personal Info */}
        <div className="grid grid-cols-2 gap-4 text-sm text-black">
          <div><strong>Name:</strong> {student.fName} {student.lName}</div>
          <div><strong>Roll No:</strong> {student.rollNumber}</div>
          <div><strong>Email:</strong> {student.email}</div>
          <div><strong>Mobile:</strong> {student.mobileNumber}</div>
          <div><strong>Father's Name:</strong> {student.fatherName}</div>
          <div><strong>Mother's Name:</strong> {student.motherName}</div>
          <div><strong>Father Mobile:</strong> {student.fatherMobile}</div>
          <div><strong>Alternate Number:</strong> {student.alternateNumber}</div>
          <div><strong>DOB:</strong> {student.dob ? new Date(student.dob).toLocaleDateString() : 'N/A'}</div>

          <div><strong>Gender:</strong> {student.gender}</div>
          <div><strong>Category:</strong> {student.category}</div>
          <div><strong>Admission Mode:</strong> {student.admissionMode}</div>
          <div><strong>Status:</strong> {student.status ? 'Active' : 'Inactive'}</div>
          <div><strong>Discontinued:</strong> {student.isDiscontinue ? 'Yes' : 'No'}</div>
          <div><strong>Address:</strong> {student.address}</div>
          <div><strong>City:</strong> {student.city}</div>
          <div><strong>State:</strong> {student.state}</div>
          <div><strong>Pincode:</strong> {student.pincode}</div>
          <div><strong>Admission Date:</strong> {new Date(student.admissionDate).toLocaleDateString()}</div>
          <div><strong>College:</strong> {student.college.collegeName}</div>
          <div><strong>Course:</strong> {student.course.courseName}</div>
        </div>

        {/* Academic Details */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Academic Details</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-2 py-1">Session</th>
                  <th className="border px-2 py-1">Year</th>
                  <th className="border px-2 py-1">Payment Mode</th>
                  <th className="border px-2 py-1">Admin Fee</th>
                  <th className="border px-2 py-1">Course Fee</th>
                  <th className="border px-2 py-1">Ledger</th>
                </tr>
              </thead>
              <tbody>
                {student.academicDetails.map((detail) => (
                  <tr key={detail.id}>
                    <td className="border px-2 py-1">{detail.sessionYear}</td>
                    <td className="border px-2 py-1">{detail.courseYear}</td>
                    <td className="border px-2 py-1">{detail.paymentMode}</td>
                    <td className="border px-2 py-1">{detail.adminAmount}</td>
                    <td className="border px-2 py-1">{detail.feesAmount}</td>
                    <td className="border px-2 py-1">{detail.ledgerNumber || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* EMI Details */}
        {student.emiDetails?.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">EMI Details</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-2 py-1">EMI No.</th>
                    <th className="border px-2 py-1">Amount</th>
                    <th className="border px-2 py-1">Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {student.emiDetails.map((emi) => (
                    <tr key={emi.id}>
                      <td className="border px-2 py-1">{emi.emiNumber}</td>
                      <td className="border px-2 py-1">{emi.amount}</td>
                      <td className="border px-2 py-1">{new Date(emi.dueDate).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Documents */}
        {student.documents?.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Documents</h3>
            <ul className="list-disc pl-5 text-sm">
              {student.documents.map((doc) => (
                <li key={doc.id}>
                  <strong>{doc.documentType}:</strong>{' '}
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    {doc.fileName}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Close Button */}
        <div className="text-right mt-6">
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewStudentModel;
