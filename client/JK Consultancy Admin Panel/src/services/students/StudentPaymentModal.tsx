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
import { RequiredAsterisk } from '../students/AddStudentModal'; // adjust path as needed

// Interface for StudentPayment
interface StudentPayment {
  id: number;
  studentId: number;
  emiAmount?: number;
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

interface StudentAcademic {
  id: number;
  sessionYear: string | null;
  courseYear: string | null;
  adminAmount: number | null;
  feesAmount: number | null;
  emiAmount: number | null;
  paymentMode: string | null;
}

interface Student {
  id: number;
  fName: string;
  lName: string | null;
  rollNumber: string;
  fatherName: string | null;
  academicDetails: StudentAcademic[];
  emiDetails?: Array<{
    emiNumber: number;
    amount: number;
    dueDate: string;
    studentAcademicId: number;
  }>;
}

interface StudentPaymentModalProps {
  studentId: number;
  students: Student[];
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
    paymentMode: '',
    transactionNumber: '',
    amount: '',
    refundAmount: '',
    receivedDate: '',
    approvedBy: '',
    amountType: '',
    comment: '',
    password: '',
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isLoggedIn, user } = useAuth();
  const [payments, setPayments] = useState<StudentPayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState('');

  const student = students.find((s) => s.id === studentId);
  if (!student) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="bg-white p-4 rounded-lg">
          <p className="text-red-500">Student not found</p>
          <button onClick={onClose} className="mt-2 px-4 py-2 bg-gray-200 rounded">Close</button>
        </div>
      </div>
    );
  }

  // Find matching academic detail based on filters
  const matchingAcademic = student.academicDetails.find(
    (detail) =>
      (sessionYearFilter ? detail.sessionYear === sessionYearFilter : true) &&
      (yearFilter ? detail.courseYear === yearFilter : true)
  );

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
          const filteredPayments = response.data.data.filter(
            (payment: StudentPayment) =>
              (!sessionYearFilter || payment.sessionYear === sessionYearFilter) &&
              (!yearFilter || payment.courseYear === yearFilter)
          );
          setPayments(filteredPayments);
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
  }, [studentId, isLoggedIn, sessionYearFilter, yearFilter]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(''); // Clear error on input change
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const resetForm = () => {
    setFormData({
      paymentMode: '',
      transactionNumber: '',
      amount: '',
      refundAmount: '',
      receivedDate: '',
      approvedBy: '',
      amountType: '',
      comment: '',
      password: '',
    });
    setReceiptFile(null);
  };

  const handleSubmit = async () => {
    if (!isLoggedIn || !user) {
      setError('Please login to save payment');
      toast.error('Please login to save payment', { autoClose: 3000 });
      return;
    }

    // Client-side validation
    type RequiredFieldKeys = 'Amount' | 'Payment Mode' | 'Amount Type' | 'Received Date' | 'Password';
    const requiredFields: Record<RequiredFieldKeys, string> = {
      Amount: formData.amount,
      'Payment Mode': formData.paymentMode,
      'Amount Type': formData.amountType,
      'Received Date': formData.receivedDate,
      Password: formData.password,
    };
    const missingFields = Object.keys(requiredFields).filter(
      (key) => !requiredFields[key as RequiredFieldKeys]
    ) as RequiredFieldKeys[];
    if (missingFields.length > 0) {
      const errorMessage = `${missingFields.join(', ')} ${missingFields.length > 1 ? 'are' : 'is'} required`;
      setError(errorMessage);
      toast.error(errorMessage, { autoClose: 3000 });
      return;
    }

    // Validate amount
    const parsedAmount = parseFloat(formData.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Amount must be a valid positive number');
      toast.error('Amount must be a valid positive number', { autoClose: 3000 });
      return;
    }

    // Validate paymentMode
    const validPaymentModes = ['cash', 'check', 'bank transfer', 'upi'];
    if (!validPaymentModes.includes(formData.paymentMode)) {
      setError('Please select a valid payment mode');
      toast.error('Please select a valid payment mode', { autoClose: 3000 });
      return;
    }

    // Validate receivedDate
    const parsedDate = new Date(formData.receivedDate);
    if (isNaN(parsedDate.getTime())) {
      setError('Received Date must be a valid date');
      toast.error('Received Date must be a valid date', { autoClose: 3000 });
      return;
    }

    if (!matchingAcademic) {
      setError('No academic details found for the selected session and year');
      toast.error('No academic details found', { autoClose: 3000 });
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication token missing');
      toast.error('Authentication token missing', { autoClose: 3000 });
      return;
    }

    setIsSubmitting(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('studentId', studentId.toString());
      formDataToSend.append('studentAcademicId', matchingAcademic.id.toString());
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
        toast.success('Payment saved successfully', { autoClose: 3000 });
        const fetchResponse = await axiosInstance.get(`/studentPayment/${studentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (fetchResponse.data.success) {
          const filteredPayments = fetchResponse.data.data.filter(
            (payment: StudentPayment) =>
              (!sessionYearFilter || payment.sessionYear === sessionYearFilter) &&
              (!yearFilter || payment.courseYear === yearFilter)
          );
          setPayments(filteredPayments);
        }
        resetForm();
      } else {
        setError(response.data.error || 'Failed to save payment');
        toast.error(response.data.error || 'Failed to save payment', { autoClose: 3000 });
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to save payment';
      setError(errorMessage);
      toast.error(errorMessage, { autoClose: 3000 });
      console.error('Submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0   pt-12 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-50">
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
          {!matchingAcademic && (
            <div className="text-red-500 text-xs mb-2">
              No academic details found for session {sessionYearFilter} and year {yearFilter}
            </div>
          )}

          {/* Student Info Banner */}
          <div className="bg-gray-100 p-2 rounded-lg mb-3 border-l-2 border-blue-600 shadow-sm">
            <div className="flex items-center mb-1">
              <FaUserGraduate className="text-blue-600 mr-1 text-base" />
              <h3 className="font-semibold text-sm text-gray-800">
                {student.fName} {student.lName || ''} <span>- {student.rollNumber}</span>
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex items-center">
                <span className="font-medium text-gray-600 mr-1">Father's Name:</span>
                <span className="text-gray-800">{student.fatherName || 'N/A'}</span>
              </div>
              <div className="flex items-center">
                <span className="font-medium text-gray-600 mr-1">Session Year:</span>
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
                    <label className="block text-xs font-medium text-gray-700">
                      Payment Mode <RequiredAsterisk />
                    </label>
                    <select
                      name="paymentMode"
                      value={formData.paymentMode}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                    >
                      <option value="" disabled>
                        Select Payment Mode
                      </option>
                      <option value="cash">Cash</option>
                      <option value="check">Check</option>
                      <option value="bank transfer">Bank Transfer</option>
                      <option value="upi">UPI</option>
                    </select>
                  </div>
                  <div className="space-y-0.5">
                    <label className="block text-xs font-medium text-gray-700">
                      Check/Transaction/Receipt #
                    </label>
                    <input
                      type="text"
                      name="transactionNumber"
                      value={formData.transactionNumber}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="block text-xs font-medium text-gray-700">
                      Amount <RequiredAsterisk />
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-gray-500 text-xs">
                        ₹
                      </span>
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
                    <label className="block text-xs font-medium text-gray-700">
                      Received Date <RequiredAsterisk />
                    </label>
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
                      value={user?.name}
                      onChange={handleInputChange}
                      disabled
                      className="w-full border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="block text-xs font-medium text-gray-700">
                      Amount Type <RequiredAsterisk />
                    </label>
                    <select
                      name="amountType"
                      value={formData.amountType}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                    >
                      <option value="" disabled>
                        Select Amount Type
                      </option>
                      <option value="adminAmount">Admin Fees</option>
                      <option value="feesAmount">Fees Amount</option>
                      <option value="fineAmount">Fine Amount</option>
                      <option value="refundAmount">Refund Amount</option>
                    </select>
                  </div>
                  <div className="space-y-0.5">
                    <label className="block text-xs font-medium text-gray-700">
                      Password <RequiredAsterisk />
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="block text-xs font-medium text-gray-700">
                      Upload Student Payment File
                    </label>
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

                <div className="mt-2">
                  <div className="border border-gray-200 rounded-md p-2 bg-blue-100">
                    <p className="text-xs font-medium text-blue-800 mb-0.5">Academic Details</p>
                    <div className="grid grid-cols-3 gap-0.5 text-xs">
                      <div>
                        <span className="text-gray-600">Admin Amount:</span>
                        <span className="ml-0.5 font-medium">
                          ₹{matchingAcademic?.adminAmount || '0'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Fees Amount:</span>
                        <span className="ml-0.5 font-medium">
                          ₹{matchingAcademic?.feesAmount || '0'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">EMI Amount:</span>
                        <span className="ml-0.5 font-medium">
                          ₹{matchingAcademic?.emiAmount || '0'}
                        </span>
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
                          .filter((emi) => emi.studentAcademicId === matchingAcademic.id)
                          .map((emi, index) => (
                            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900">
                                {emi.emiNumber}
                              </td>
                              <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900">
                                ₹{emi.amount}
                              </td>
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
                                  {new Date(emi.dueDate) < new Date() ? 'Pending' : 'Upcoming'}
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
                <div className="p-2 text-center text-gray-500 text-xs">No EMI details available</div>
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
                ) : paymentError ? (
                  <div className="text-white text-xs text-center hidden">{paymentError}</div>
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
                            Mode
                          </th>
                          <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-tight">
                            Trans.#
                          </th>
                          <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-tight">
                            Received
                          </th>
                          <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-tight">
                            Approved by
                          </th>
                          <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-tight">
                            Amount Type
                          </th>
                          <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-tight">
                            Created By
                          </th>
                          <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-tight">
                            Created on
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
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                  })
                                : 'N/A'}
                            </td>
                            <td className="px-2 py-1 whitespace-nowrap text-xs text-black">
                              {payment.approvedBy || 'N/A'}
                            </td>
                            <td className="px-2 py-1 whitespace-nowrap text-xs text-black">
                              {payment.amountType === 'adminAmount'
                                ? 'Admin Amount'
                                : payment.amountType || 'N/A'}
                            </td>
                            <td className="px-2 py-1 whitespace-nowrap text-xs text-black">
                              {payment.createdBy || 'N/A'}
                            </td>
                            <td className="px-2 py-1 whitespace-nowrap text-xs text-black">
                              {new Date(payment.createdOn).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: '2-digit',
                                year: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
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
              disabled={!matchingAcademic || isSubmitting}
              className={`px-2 py-1 rounded-md transition duration-200 font-medium text-xs flex items-center justify-center ${
                matchingAcademic && !isSubmitting
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-400 text-gray-700 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 mr-2 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Payment'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentPaymentModal;