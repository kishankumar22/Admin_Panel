import React from 'react';
import { FaTimes } from 'react-icons/fa';

interface StudentPaymentModalProps {
  studentId: number;
  students: any[]; // Array of students from StudentManagement
  onClose: () => void;
}

const StudentPaymentModal: React.FC<StudentPaymentModalProps> = ({ studentId, students, onClose }) => {
  const student = students.find(s => s.id === studentId);
  if (!student) return null;

  const latestAcademic = student.academicDetails
    .sort((a: any, b: any) => new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime())[0] || {};

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-50">
      <div className="bg-white p-2 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-lg">
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-xs font-bold text-black">Student Payment Details</h2>
          <button
            onClick={onClose}
            className="text-red-500 hover:text-red-700 text-sm p-0.5 rounded"
          >
            <FaTimes />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-1 text-[10px] mb-2">
          {/* Column 1 */}
          <div className="flex items-center">
            <span className="font-bold w-20 text-black">Payment Mode:</span>
            <input type="text" className="border rounded px-1 py-0.5 w-24 ml-0.5 text-black" />
          </div>
          <div className="flex items-center">
            <span className="font-bold w-20 text-black">Check/Trans/Rec:</span>
            <input type="text" className="border rounded px-1 py-0.5 w-24 ml-0.5 text-black" />
          </div>
          <div className="flex items-center">
            <span className="font-bold w-20 text-black">Roll Number:</span>
            <span className="text-black">{student.rollNumber}</span>
          </div>
          <div className="flex items-center">
            <span className="font-bold w-20 text-black">Admin Amount:</span>
             <span className="text-black"></span>0.00
          </div>
        

          {/* Column 2 */}
        
          <div className="flex items-center">
            <span className="font-bold w-20 text-black">Amount:</span>
            <input type="text" className="border rounded px-1 py-0.5 w-24 ml-0.5 text-black" />
          </div>
          <div className="flex items-center">
            <span className="font-bold w-20 text-black">Recieved Date:</span>
            <input type="date" className="border rounded px-1 py-0.5 w-24 ml-0.5 text-black" />
          </div>
        
          <div className="flex items-center">
            <span className="font-bold w-20 text-black">Student Name:</span>
            <span className="text-black">{student.fName} {student.lName || ''}</span>
          </div>

          {/* Column 3 */}
          <div className="flex items-center">
            <span className="font-bold w-20 text-black">fees Amount:</span>
            <span className="text-black">5000</span>
          </div>
          
          <div className="flex items-center">
            <span className="font-bold w-20 text-black">Amount Type:</span>
            <input type="text" className="border rounded px-1 py-0.5 w-24 ml-0.5 text-black" />
          </div>
          <div className="flex items-center">
            <span className="font-bold w-20 text-black">Student Name:</span>
            <span className="text-black">{student.fName} {student.lName || ''}</span>
          </div>
          <div className="flex items-center">
            <span className="font-bold w-20 text-black">Father Name:</span>
            <span className="text-black">{student.fatherName}</span>
          </div>
          <div className="flex items-center">
            <span className="font-bold w-20 text-black">Password:</span>
            <input type="text" className="border rounded px-1 py-0.5 w-24 ml-0.5 text-black" />
          </div>

          {/* Column 4 */}
          
          <div className="flex items-center">
            <span className="font-bold w-20 text-black">Payment:</span>
            <span className="text-black">{latestAcademic.sessionYear || 'N/A'}</span>
          </div>
        </div>

        {latestAcademic.paymentMode === 'EMI' && student.emiDetails && student.emiDetails.length > 0 ? (
          <div className="mb-1">
            <span className="font-medium text-black">EMI Details:</span>
            <table className="min-w-full border text-[10px] mt-0.5">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-0.5 px-1 border text-left text-black">EMI No</th>
                  <th className="py-0.5 px-1 border text-left text-black">Amount</th>
                  <th className="py-0.5 px-1 border text-left text-black">Due Date</th>
                </tr>
              </thead>
              <tbody>
                {student.emiDetails.map((emi: any, index: number) => (
                  <tr key={index}>
                    <td className="py-0.5 px-1 border text-black">{emi.emiNumber}</td>
                    <td className="py-0.5 px-1 border text-black">{emi.amount}</td>
                    <td className="py-0.5 px-1 border text-black">{emi.dueDate.split('T')[0]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mb-1">
            <span className="font-bold text-black">EMI Details:</span> <span className="text-black">N/A</span>
          </div>
        )}

        <div className="mt-1">
          <h1 className="text-xs font-bold text-black mb-0.5">Bank information for this account</h1>
          <div className="flex space-x-2 mb-0.5">
            <label className="flex items-center space-x-1">
              <input type="radio" name="paymentMethod" className="form-radio h-2 w-2" />
              <span className="text-black">Hand Haover</span>
            </label>
            <label className="flex items-center space-x-1">
              <input type="radio" name="paymentMethod" className="form-radio h-2 w-2" />
              <span className="text-black">Bank Submit</span>
            </label>
          </div>
          
          <div className="grid grid-cols-4 gap-1 text-[10px]">
            <div className="flex items-center">
              <span className="font-bold w-20 text-black">Bank Name:</span>
              <input type="text" className="border rounded px-1 py-0.5 w-24 ml-0.5 text-black" />
            </div>
            <div className="flex items-center">
              <span className="font-bold w-20 text-black">Deposit Amt:</span>
              <input type="text" className="border rounded px-1 py-0.5 w-24 ml-0.5 text-black" />
            </div>
            <div className="flex items-center">
              <span className="font-bold w-20 text-black">Check/Trans:</span>
              <input type="text" className="border rounded px-1 py-0.5 w-24 ml-0.5 text-black" />
            </div>
            <div className="flex items-center">
              <span className="font-bold w-20 text-black">Comment:</span>
              <input type="text" className="border rounded px-1 py-0.5 w-24 ml-0.5 text-black" />
            </div>
            <div className="flex items-center col-span-4">
              <span className="font-bold w-24 text-black">Upload File:</span>
              <input type="file" className="border rounded px-1 py-0.5 w-40 ml-0.5 text-black" />
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-2">
          <button
            onClick={onClose}
            className="px-2 py-0.5 bg-gray-300 text-[10px] text-black rounded hover:bg-gray-400"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentPaymentModal;