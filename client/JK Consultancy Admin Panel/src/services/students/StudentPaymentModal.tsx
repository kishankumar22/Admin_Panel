import React, { useState, useEffect } from 'react';
import {
  FaTimes,
  FaUpload,
  FaMoneyBillWave,
  FaCalendarAlt,
  FaUserGraduate,
  FaFileInvoiceDollar,
  FaFileAlt,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import axiosInstance from '../../config';

// Interface for StudentPayment
interface StudentPayment {
  id: number;
  studentId: number;
  studentAcademicId: number | null;
  paymentMode: string | null;
  transactionNumber: string | null;
  amount: number | null;
  refundAmount: number | null;
  receivedDate: string | null;
  approvedBy: string | null;
  amountType: string | null;
  comment: string | null;
  receiptUrl: string | null;
  receiptPublicId: string | null;
  courseYear: string | null;
  sessionYear: string | null;
  createdBy: string | null;
  createdOn: string;
  modifiedBy: string | null;
  modifiedOn: string | null;
  student: {
    fName: string;
    lName: string | null;
    rollNumber: string;
  };
  studentAcademic: {
    sessionYear: string | null;
    courseYear: string | null;
  } | null;
}

interface StudentPaymentModalProps {
  studentId: number;
  students: any[];
  sessionYearFilter: string;
  yearFilter: string;
  onClose: () => void;
}

const StudentPaymentModal: React.FC<StudentPaymentModalProps> = ({
  studentId,
  students,
  sessionYearFilter,
  yearFilter,
  onClose,
}) => {
  const [formData, setFormData] = useState({
    paymentMode: 'cash',
    transactionNumber: '',
    amount: '',
    refundAmount: '',
    receivedDate: '',
    approvedBy: '',
    amountType: 'adminAmount',
    comment: '',
    password: '',
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const { isLoggedIn, user } = useAuth();
  const [payments, setPayments] = useState<StudentPayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState('');

  const student = students.find((s) => s.id === studentId);
  if (!student) return null;

  // Find matching academic detail based on filters
  const matchingAcademic = student.academicDetails.find(
    (detail: any) =>
      (sessionYearFilter ? detail.sessionYear === sessionYearFilter : true) &&
      (yearFilter ? detail.courseYear === yearFilter : true)
  ) || null; // Return null if no match found

  // Fetch payments for studentId
  useEffect(() => {
    const fetchPayments = async () => {
      setLoadingPayments(true);
      setPaymentError('');
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication token missing');
        }

        const response = await axiosInstance.get(`/studentPayment/${studentId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.data.success) {
          setPayments(response.data.data);
        } else {
          throw new Error(response.data.error || 'Failed to fetch payments');
        }
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to fetch payments';
        setPaymentError(errorMessage);
      } finally {
        setLoadingPayments(false);
      }
    };

    if (isLoggedIn) {
      fetchPayments();
    }
  }, [studentId, isLoggedIn]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!isLoggedIn || !user) {
      setError('Please login to save payment');
      toast.error('Please login to save payment');
      return;
    }

    if (!formData.password) {
      setError('Password is required');
      toast.error('Password is required');
      return;
    }

    if (!matchingAcademic) {
      setError('No matching academic details found for the selected session and year');
      toast.error('No matching academic details found');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication token missing');
      toast.error('Authentication token missing');
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('studentId', studentId.toString());
      formDataToSend.append('studentAcademicId', matchingAcademic.id?.toString() || '');
      formDataToSend.append('paymentMode', formData.paymentMode);
      formDataToSend.append('transactionNumber', formData.transactionNumber);
      formDataToSend.append('amount', formData.amount);
      formDataToSend.append('refundAmount', formData.refundAmount);
      formDataToSend.append('receivedDate', formData.receivedDate);
      formDataToSend.append('approvedBy', formData.approvedBy);
      formDataToSend.append('amountType', formData.amountType);
      formDataToSend.append('comment', formData.comment);
      formDataToSend.append('courseYear', matchingAcademic.courseYear || '');
      formDataToSend.append('sessionYear', matchingAcademic.sessionYear || '');
      formDataToSend.append('email', user.email);
      formDataToSend.append('password', formData.password);
      if (receiptFile) {
        formDataToSend.append('receipt', receiptFile);
      }

      const response = await axiosInstance.post('/studentPayment', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        toast.success('Payment Successful');
        const fetchResponse = await axiosInstance.get(`/studentPayment/${studentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (fetchResponse.data.success) {
          setPayments(fetchResponse.data.data);
        }
        onClose();
      } else {
        setError(response.data.error || 'Failed to save payment');
        toast.error(response.data.error || 'Failed to save payment');
      }
    } catch (err) {
      const errorMessage = 'Failed to save payment';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Submission error:', err);
    }
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
          {error && <div className="text-red-500 text-xs mb-2">{error}</div>}

          {/* Student Info Banner */}
          <div className="bg-gray-100 p-2 rounded-lg mb-3 border-l-2 border-blue-600 shadow-sm">
            <div className="flex items-center mb-1">
              <FaUserGraduate className="text-blue-600 mr-1 text-base" />
              <h3 className="font-semibold text-sm text-gray-800">
                {student.fName} {student.lName || ''}
              </h3>
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
                <span className="text-gray-800">{matchingAcademic?.sessionYear || 'N/A'}</span>
              </div>
              <div className="flex items-center">
                <span className="font-medium text-gray-600 mr-1">Course Year:</span>
                <span className="text-gray-800">{matchingAcademic?.courseYear || 'N/A'}</span>
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
                    <select
                      name="paymentMode"
                      value={formData.paymentMode}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                    >
                      <option value="cash">Cash</option>
                      <option value="check">Check</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="upi">UPI</option>
                    </select>
                  </div>
                  <div className="space-y-0.5">
                    <label className="block text-xs font-medium text-gray-700">Check/Transaction/Receipt #</label>
                    <input
                      type="text"
                      name="transactionNumber"
                      value={formData.transactionNumber}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="block text-xs font-medium text-gray-700">Amount</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-gray-500 text-xs">₹</span>
                      <input
                        type="text"
                        name="amount"
                        value={formData.amount}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-md pl-5 pr-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <label className="block text-xs font-medium text-gray-700">Refund Amount</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-gray-500 text-xs">₹</span>
                      <input
                        type="text"
                        name="refundAmount"
                        value={formData.refundAmount}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-md pl-5 pr-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <label className="block text-xs font-medium text-gray-700">Received Date</label>
                    <div className="relative">
                      <FaCalendarAlt className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs" />
                      <input
                        type="date"
                        name="receivedDate"
                        value={formData.receivedDate}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-md pl-7 pr-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <label className="block text-xs font-medium text-gray-700">Approved By</label>
                    <input
                      type="text"
                      name="approvedBy"
                      value={formData.approvedBy}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="block text-xs font-medium text-gray-700">Amount Type</label>
                    <select
                      name="amountType"
                      value={formData.amountType}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                    >
                      <option value="adminAmount">Admin Fees</option>
                      <option value="feesAmount">Fees Amount</option>
                      <option value="fineAmount">Fine Amount</option>
                    </select>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="border border-gray-200 rounded-md p-2 bg-blue-50">
                    <p className="text-xs font-medium text-blue-800 mb-0.5">Academic Details</p>
                    <div className="grid grid-cols-2 gap-0.5 text-xs">
                      <div>
                        <span className="text-gray-600">Admin Amount:</span>
                        <span className="ml-0.5 font-medium">₹{matchingAcademic?.adminAmount || '0'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Fees Amount:</span>
                        <span className="ml-0.5 font-medium">₹{matchingAcademic?.feesAmount || '0'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Course Year:</span>
                        <span className="ml-0.5 font-medium">{matchingAcademic?.courseYear || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">EMI Amount:</span>
                        <span className="ml-0.5 font-medium">₹{matchingAcademic?.emiAmount || '0'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-md p-2">
                    <div className="space-y-1">
                      <div className="space-y-0.5">
                        <label className="block text-xs font-medium text-gray-700">Comment</label>
                        <textarea
                          name="comment"
                          value={formData.comment}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                          rows={1}
                        ></textarea>
                      </div>
                      <div className="space-y-0.5">
                        <label className="block text-xs font-medium text-gray-700">Password</label>
                        <input
                          type="password"
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="block text-xs font-medium text-gray-700">Upload Student Payment File</label>
                        <div className="relative">
                          <input
                            type="file"
                            className="hidden"
                            id="student-file"
                            onChange={handleFileChange}
                          />
                          <label
                            htmlFor="student-file"
                            className="cursor-pointer flex items-center justify-center w-full border border-gray-300 border-dashed rounded-md px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                          >
                            <FaUpload className="mr-1 text-gray-500 text-base" />
                            <span>{receiptFile ? receiptFile.name : 'Click to upload'}</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* EMI Details Section */}
            {matchingAcademic?.paymentMode === 'EMI' && student.emiDetails && student.emiDetails.length > 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="bg-gray-50 px-2 py-1 border-b border-gray-200 rounded-t-lg">
                  <h3 className="font-semibold text-gray-700 text-xs">EMI Details</h3>
                </div>
                <div className="p-2">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th
                            scope="col"
                            className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            EMI No
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Amount
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Due Date
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {student.emiDetails
                          .filter((emi: any) => emi.studentAcademicId === matchingAcademic.id)
                          .map((emi: any, index: number) => (
                            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900">{emi.emiNumber}</td>
                              <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900">₹{emi.amount}</td>
                              <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900">
                                {emi.dueDate.split('T')[0]}
                              </td>
                              <td className="px-3 py-1 whitespace-nowrap">
                                <span
                                  className={`px-1 inline-flex text-xs leading-4 font-semibold rounded-full ${
                                    new Date(emi.dueDate) < new Date()
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-green-100 text-green-800'
                                  }`}
                                >
                                  {new Date(emi.dueDate) < new Date() ? 'pending' : 'Upcoming'}
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
                <div className="p-2 text-center text-gray-500 text-xs">No EMI details available for this student</div>
              </div>
            )}

            {/* Payment History Table */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm mt-3">
              <div className="bg-gray-50 px-2 py-1 border-b border-gray-200 rounded-t-lg">
                <h3 className="font-semibold text-gray-700 flex items-center text-xs">
                  <FaFileInvoiceDollar className="mr-1 text-blue-600 text-base" />
                  Payment History
                </h3>
              </div>
              <div className="p-1">
                {loadingPayments ? (
                  <div className="text-black text-xs text-center">Loading payments...</div>
                ) : payments.length === 0 ? (
                  <div className="text-black text-xs text-center">No payment history available</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-tight">
                            Amount
                          </th>
                          <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-tight">
                            Refund Amount
                          </th>
                          <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-tight">
                            Mode
                          </th>
                          <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-tight">
                            Trans. #
                          </th>
                          <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-tight">
                            Received
                          </th>
                          <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-tight">
                            Approved
                          </th>
                          <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-tight">
                            Type
                          </th>
                          <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-tight">
                            Comment
                          </th>
                          <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-tight">
                            Course
                          </th>
                          <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-tight">
                            Session
                          </th>
                          <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-tight">
                            Created By
                          </th>
                          <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-tight">
                            Created
                          </th>
                          <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-tight">
                            Receipt
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {payments.map((payment) => (
                          <tr key={payment.id} className="hover:bg-gray-50">
                            <td className="px-2 py-1 whitespace-nowrap text-xs text-black">
                              <div className="flex items-center">
                                <FaMoneyBillWave className="mr-1 text-green-600 text-xs" />
                                {payment.amount ? `₹${payment.amount.toFixed(2)}` : 'N/A'}
                              </div>
                            </td>
                            <td className="px-2 py-1 whitespace-nowrap text-xs text-black">
                              <div className="flex items-center">
                                {payment.refundAmount ? (
                                  <>
                                    <FaMoneyBillWave className="mr-1 text-red-600 text-xs" />
                                    {`₹${payment.refundAmount.toFixed(2)}`}
                                  </>
                                ) : (
                                  'N/A'
                                )}
                              </div>
                            </td>
                            <td className="px-2 py-1 whitespace-nowrap text-xs text-black">
                              {payment.paymentMode || 'N/A'}
                            </td>
                            <td className="px-2 py-1 whitespace-nowrap text-xs text-black">
                              {payment.transactionNumber || 'N/A'}
                            </td>
                            <td className="px-2 py-1 whitespace-nowrap text-xs text-black">
                              {payment.receivedDate
                                ? new Date(payment.receivedDate).toLocaleDateString('en-GB', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: '2-digit',
                                  })
                                : 'N/A'}
                            </td>
                            <td className="px-2 py-1 whitespace-nowrap text-xs text-black">
                              {payment.approvedBy || 'N/A'}
                            </td>
                            <td className="px-2 py-1 whitespace-nowrap text-xs text-black">
                              {payment.amountType === 'adminamount' ? 'Admin' : payment.amountType || 'N/A'}
                            </td>
                            <td className="px-2 py-1 text-xs text-black">{payment.comment || 'N/A'}</td>
                            <td className="px-2 py-1 whitespace-nowrap text-xs text-black">
                              {payment.studentAcademic?.courseYear || payment.courseYear || 'N/A'}
                            </td>
                            <td className="px-2 py-1 whitespace-nowrap text-xs text-black">
                              {payment.studentAcademic?.sessionYear || payment.sessionYear || 'N/A'}
                            </td>
                            <td className="px-2 py-1 whitespace-nowrap text-xs text-black">
                              {payment.createdBy || 'N/A'}
                            </td>
                            <td className="px-2 py-1 whitespace-nowrap text-xs text-black">
                              {new Date(payment.createdOn).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: '2-digit',
                                year: '2-digit',
                              })}
                            </td>
                            <td className="px-2 py-1 whitespace-nowrap text-xs text-black">
                              {payment.receiptUrl ? (
                                <a
                                  href={payment.receiptUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center text-blue-600 hover:underline"
                                >
                                  <FaFileAlt className="mr-1 text-xs" />
                                  View
                                </a>
                              ) : (
                                'N/A'
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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
              onClick={handleSubmit}
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