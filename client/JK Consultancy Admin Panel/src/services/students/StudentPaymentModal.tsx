import React, { useState } from 'react';
import { FaTimes, FaUpload, FaMoneyBillWave, FaCalendarAlt, FaUserGraduate, FaFileInvoiceDollar } from 'react-icons/fa';

interface StudentPaymentModalProps {
  studentId: number;
  students: any[]; // Array of students from StudentManagement
  onClose: () => void;
}

const StudentPaymentModal: React.FC<StudentPaymentModalProps> = ({ studentId, students, onClose }) => {
  const [paymentMethod, setPaymentMethod] = useState<'handover' | 'bank'>('handover');
 
  const student = students.find(s => s.id === studentId);
  if (!student) return null;
 
  const latestAcademic = student.academicDetails
    .sort((a: any, b: any) => new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime())[0] || {};

  const handlePaymentMethodChange = (method: 'handover' | 'bank') => {
    setPaymentMethod(method);
  };

  return (
<div className="fixed inset-0 flex mt-10 items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-50">
  <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-md border border-gray-200">
    {/* Header */}
    <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-2 rounded-t-lg flex justify-between items-center">
      <div className="flex items-center">
        <FaFileInvoiceDollar className="text-white mr-1 text-lg" />
        <h2 className="text-sm font-semibold text-white">Student Payment Details</h2>
      </div>
      <button
        onClick={onClose}
        className="text-white hover:text-red-200 bg-red-500 hover:bg-red-600 p-1 rounded-full transition duration-200"
      >
        <FaTimes />
      </button>
    </div>

    <div className="p-3">
      {/* Student Info Banner */}
      <div className="bg-gray-100 p-2 rounded-lg mb-3 border-l-2 border-blue-600 shadow-sm">
        <div className="flex items-center mb-1">
          <FaUserGraduate className="text-blue-600 mr-1 text-base" />
          <h3 className="font-semibold text-sm text-gray-800">{student.fName} {student.lName || ''}</h3>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center">
            <span className="font-medium text-gray-600 mr-1">Roll Number:</span>
            <span className="text-gray-800">{student.rollNumber}</span>
          </div>
          <div className="flex items-center">
            <span className="font-medium text-gray-600 mr-1">Father's Name:</span>
            <span className="text-gray-800">{student.fatherName}</span>
          </div>
          <div className="flex items-center">
            <span className="font-medium text-gray-600 mr-1">Course Session:</span>
            <span className="text-gray-800">{latestAcademic.sessionYear}</span>
          </div>
          <div className="flex items-center">
            <span className="font-medium text-gray-600 mr-1">Course Year:</span>
            <span className="text-gray-800">{latestAcademic.courseYear}</span>
          </div>
        </div>
      </div>

      {/* Main Form Content */}
      <div className="space-y-3">
        {/* Payment Information Section */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="bg-gray-50 px-2 py-1 border-b border-gray-200 rounded-t-lg">
            <h3 className="font-semibold text-gray-700 flex items-center text-xs">
              <FaMoneyBillWave className="mr-1 text-green-600 text-base" />
              Payment Information
            </h3>
          </div>
          <div className="p-2">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-2">
              <div className="space-y-0.5">
                <label className="block text-xs font-medium text-gray-700">Payment Mode</label>
                <select className="w-full border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs">
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="upi">UPI</option>
                </select>
              </div>
              <div className="space-y-0.5">
                <label className="block text-xs font-medium text-gray-700">Check/Transaction/Receipt #</label>
                <input type="text" className="w-full border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs" />
              </div>
              <div className="space-y-0.5">
                <label className="block text-xs font-medium text-gray-700">Amount</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-gray-500 text-xs">₹</span>
                  <input type="text" className="w-full border border-gray-300 rounded-md pl-5 pr-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs" />
                </div>
              </div>
              <div className="space-y-0.5">
                <label className="block text-xs font-medium text-gray-700">Received Date</label>
                <div className="relative">
                  <FaCalendarAlt className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs" />
                  <input type="date" className="w-full border border-gray-300 rounded-md pl-7 pr-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs" />
                </div>
              </div>
              <div className="space-y-0.5">
                <label className="block text-xs font-medium text-gray-700">Approved By</label>
                <input type="text" className="w-full border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs" />
              </div>
              <div className="space-y-0.5">
                <label className="block text-xs font-medium text-gray-700">Amount Type</label>
                <select className="w-full border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs">
                  <option value="tuition">Tuition Fees</option>
                  <option value="exam">Examination Fees</option>
                  <option value="hostel">Hostel Fees</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="border border-gray-200 rounded-md p-2 bg-blue-50">
                <p className="text-xs font-medium text-blue-800 mb-0.5">Academic Details</p>
                <div className="grid grid-cols-2 gap-0.5 text-xs">
                  <div>
                    <span className="text-gray-600">Admin Amount:</span>
                    <span className="ml-0.5 font-medium">₹{latestAcademic.adminAmount || '0'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Fees Amount:</span>
                    <span className="ml-0.5 font-medium">₹{latestAcademic.feesAmount || '0'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Course Year:</span>
                    <span className="ml-0.5 font-medium">{latestAcademic.courseYear || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">EMI Amount:</span>
                    <span className="ml-0.5 font-medium">₹{latestAcademic.emiAmount || '0'}</span>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-md p-2">
                <div className="space-y-1">
                  <div className="space-y-0.5">
                    <label className="block text-xs font-medium text-gray-700">Password</label>
                    <input type="password" className="w-full border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs" />
                  </div>
                  <div className="space-y-0.5">
                    <label className="block text-xs font-medium text-gray-700">Upload Student File</label>
                    <div className="relative">
                      <input type="file" className="hidden" id="student-file" />
                      <label htmlFor="student-file" className="cursor-pointer flex items-center justify-center w-full border border-gray-300 border-dashed rounded-md px-2 py-1 text-xs text-gray-700 hover:bg-gray-50">
                        <FaUpload className="mr-1 text-gray-500 text-base" />
                        <span>Click to upload</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* EMI Details Section */}
        {latestAcademic.paymentMode === 'EMI' && student.emiDetails && student.emiDetails.length > 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="bg-gray-50 px-2 py-1 border-b border-gray-200 rounded-t-lg">
              <h3 className="font-semibold text-gray-700 text-xs">EMI Details</h3>
            </div>
            <div className="p-2">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">EMI No</th>
                      <th scope="col" className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th scope="col" className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                      <th scope="col" className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {student.emiDetails.map((emi: any, index: number) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900">{emi.emiNumber}</td>
                        <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900">₹{emi.amount}</td>
                        <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900">{emi.dueDate.split('T')[0]}</td>
                        <td className="px-3 py-1 whitespace-nowrap">
                          <span className={`px-1 inline-flex text-xs leading-4 font-semibold rounded-full ${
                            new Date(emi.dueDate) < new Date() ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {new Date(emi.dueDate) < new Date() ? 'Overdue' : 'Upcoming'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="bg-gray-50 px-2 py-1 border-b border-gray-200 rounded-t-lg">
              <h3 className="font-semibold text-gray-700 text-xs">EMI Details</h3>
            </div>
            <div className="p-2 text-center text-gray-500 text-xs">
              No EMI details available for this student
            </div>
          </div>
        )}

        {/* Bank Information Section */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="bg-gray-50 px-2 py-1 border-b border-gray-200 rounded-t-lg">
            <h3 className="font-semibold text-gray-700 text-xs">Bank Information</h3>
          </div>
          <div className="p-2">
            <div className="flex space-x-2 mb-2">
              <label className="flex items-center space-x-1 cursor-pointer">
                <input
                  type="radio"
                  name="paymentMethod"
                  className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300"
                  checked={paymentMethod === 'handover'}
                  onChange={() => handlePaymentMethodChange('handover')}
                />
                <span className="text-xs font-medium text-gray-700">Hand Handover</span>
              </label>
              <label className="flex items-center space-x-1 cursor-pointer">
                <input
                  type="radio"
                  name="paymentMethod"
                  className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300"
                  checked={paymentMethod === 'bank'}
                  onChange={() => handlePaymentMethodChange('bank')}
                />
                <span className="text-xs font-medium text-gray-700">Bank Submit</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <div className="space-y-0.5">
                  <label className="block text-xs font-medium text-gray-700">
                    {paymentMethod === 'handover' ? 'Hand Over To' : 'Bank Name'}
                  </label>
                  <input type="text" className="w-full border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs" />
                </div>
                <div className="space-y-0.5">
                  <label className="block text-xs font-medium text-gray-700">Deposit Amount</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-gray-500 text-xs">₹</span>
                    <input type="text" className="w-full border border-gray-300 rounded-md pl-5 pr-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs" />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <label className="block text-xs font-medium text-gray-700">Payment Deposit Date</label>
                  <div className="relative">
                    <FaCalendarAlt className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs" />
                    <input type="date" className="w-full border border-gray-300 rounded-md pl-7 pr-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="space-y-0.5">
                  <label className="block text-xs font-medium text-gray-700">Check/Transaction Number</label>
                  <input type="text" className="w-full border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs" />
                </div>
                <div className="space-y-0.5">
                  <label className="block text-xs font-medium text-gray-700">Comment</label>
                  <textarea className="w-full border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs" rows={1}></textarea>
                </div>
                <div className="space-y-0.5">
                  <label className="block text-xs font-medium text-gray-700">Upload Receipt</label>
                  <div className="relative">
                    <input type="file" className="hidden" id="receipt-file" />
                    <label htmlFor="receipt-file" className="cursor-pointer flex items-center justify-center w-full border border-gray-300 border-dashed rounded-md px-2 py-1 text-xs text-gray-700 hover:bg-gray-50">
                      <FaUpload className="mr-1 text-gray-500 text-base" />
                      <span>Click to upload receipt</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-2 mt-3">
        <button
          onClick={onClose}
          className="px-2 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition duration-200 font-medium text-xs"
        >
          Cancel
        </button>
        <button
          className="px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 font-medium text-xs"
        >
          Save Payment
        </button>
      </div>
    </div>
  </div>
</div>
  );
};

export default StudentPaymentModal;