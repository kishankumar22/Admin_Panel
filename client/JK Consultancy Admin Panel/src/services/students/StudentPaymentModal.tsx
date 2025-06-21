import React, { useState, useEffect } from 'react';
import {
  FaTimes,
  FaUpload,
  FaMoneyBillWave,
  FaCalendarAlt,
  FaFileInvoiceDollar,
  FaTrash,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import axiosInstance from '../../config';
import { RequiredAsterisk } from '../students/AddStudentModal';

interface StudentPayment {
  id: number;
  studentId: number;
  emiAmount?: number;
  studentAcademicId: number | null;
  paymentMode: string | null;
  transactionNumber: string | null;
  amount: number | null;
  handoverAmount: number | null;
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
    email: string;
    mobileNumber: string;
    fatherName: string | null;
    course: { courseName: string };
    college: { collegeName: string };
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
  StudentId: string;
  id: number;
  fName: string;
  stdCollId?: string;
  lName: string | null;
  rollNumber: string;
  fatherName: string | null;
  email: string;
  mobileNumber: string;
  academicDetails: StudentAcademic[];
  course: { courseName: string };
  college: { collegeName: string };
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

interface FormData {
  paymentMode: string;
  transactionNumber: string;
  amount: string;
  refundAmount: string;
  receivedDate: string;
  approvedBy: string;
  amountType: string;
  comment: string;
  password: string;
}

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const StudentPaymentModal: React.FC<StudentPaymentModalProps> = ({
  studentId,
  students,
  sessionYearFilter,
  yearFilter,
  onClose,
}) => {
  const { isLoggedIn, user } = useAuth();

  const initialFormData: FormData = {
    paymentMode: '',
    transactionNumber: '',
    amount: '',
    refundAmount: '',
    receivedDate: getTodayDate(),
    approvedBy: user?.name || '',
    amountType: '',
    comment: '',
    password: '',
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payments, setPayments] = useState<StudentPayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState('');
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyPassword, setVerifyPassword] = useState('');
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [paymentIdToDelete, setPaymentIdToDelete] = useState<number | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);

  const isFormValid = () => {
    const requiredFields: { [key: string]: string } = {
      amountType: formData.amountType,
      paymentMode: formData.paymentMode,
      amount: formData.amount,
      receivedDate: formData.receivedDate,
      transactionNumber: formData.transactionNumber,
    };
    return Object.values(requiredFields).every((field) => field && field.trim() !== '');
  };

  useEffect(() => {
    setFormData((prev) => ({ ...prev, approvedBy: user?.name || '' }));
  }, [user]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const student = students.find((s) => s.id === studentId);
  if (!student) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-999">
        <div className="bg-white p-4 rounded-lg">
          <p className="text-red-500">Student not found</p>
          <button onClick={onClose} className="mt-2 px-4 py-2 bg-gray-200 rounded">Close</button>
        </div>
      </div>
    );
  }

  const matchingAcademic = student.academicDetails.find(
    (detail) =>
      (sessionYearFilter ? detail.sessionYear === sessionYearFilter : true) &&
      (yearFilter ? detail.courseYear === yearFilter : true)
  );

  useEffect(() => {
    const fetchPayments = async () => {
      if (!matchingAcademic) {
        setPaymentError('No academic details found for the selected session and year');
        setLoadingPayments(false);
        return;
      }
      setLoadingPayments(true);
      setPaymentError('');
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Authentication token missing');

        const response = await axiosInstance.get(`/academic/${matchingAcademic.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data.success) setPayments(response.data.data);
        else throw new Error(response.data.error || 'Failed to fetch payments');
      } catch (err: any) {
        setPaymentError(err.message || 'Failed to fetch payments');
      } finally {
        setLoadingPayments(false);
      }
    };
    if (isLoggedIn && matchingAcademic) fetchPayments();
  }, [matchingAcademic, isLoggedIn]);

  const totalPaidAdminAmount = payments
    .filter(
      (payment) =>
        payment.amountType === 'adminAmount' &&
        payment.courseYear === matchingAcademic?.courseYear &&
        payment.sessionYear === matchingAcademic?.sessionYear
    )
    .reduce((sum, payment) => sum + (payment.amount || 0), 0);

  const totalPaidFeesAmount = payments
    .filter(
      (payment) =>
        payment.amountType === 'feesAmount' &&
        payment.courseYear === matchingAcademic?.courseYear &&
        payment.sessionYear === matchingAcademic?.sessionYear
    )
    .reduce((sum, payment) => sum + (payment.amount || 0), 0);

  const remainingAdminAmount = (matchingAcademic?.adminAmount || 0) - totalPaidAdminAmount;
  const remainingFeesAmount = (matchingAcademic?.feesAmount || 0) - totalPaidFeesAmount;
  const totalFees = (matchingAcademic?.adminAmount || 0) + (matchingAcademic?.feesAmount || 0);
  const cumulativePayments = payments
    .filter(
      (payment) =>
        (payment.amountType === 'adminAmount' || payment.amountType === 'feesAmount') &&
        payment.courseYear === matchingAcademic?.courseYear &&
        payment.sessionYear === matchingAcademic?.sessionYear
    )
    .reduce((sum, payment) => sum + (payment.amount || 0), 0);

  const getEMIStatus = (emi: { emiNumber: number; amount: number; dueDate: string }) => {
    let cumulativeAmount = cumulativePayments;
    const sortedEmis = student.emiDetails
      ?.filter((e) => e.studentAcademicId === matchingAcademic?.id)
      .sort((a, b) => a.emiNumber - b.emiNumber);
    let emiSum = 0;
    for (const e of sortedEmis || []) {
      emiSum += e.amount;
      if (e.emiNumber === emi.emiNumber) {
        if (cumulativeAmount >= emiSum) return 'Paid';
        const dueDate = new Date(emi.dueDate);
        const today = new Date();
        return dueDate < today ? 'Pending' : 'Upcoming';
      }
    }
    return 'Upcoming';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setReceiptFile(e.target.files[0]);
  };

  const resetForm = () => {
    setFormData({ ...initialFormData, receivedDate: getTodayDate() });
    setReceiptFile(null);
    setVerifyPassword('');
  };

  const handleVerifyPassword = async () => {
    if (!verifyPassword) {
      setError('Password is required');
      toast.error('Password is required', { autoClose: 3000 });
      return;
    }
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication token missing');
      const response = await axiosInstance.post(
        '/verify-password',
        { userId: user?.user_id, password: verifyPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        setFormData((prev) => ({ ...prev, approvedBy: user?.name || '' }));
        await handleSubmit();
        setShowVerifyModal(false);
        setVerifyPassword('');
      } else {
        setError(response.data.message || 'Invalid password');
        toast.error(response.data.message || 'Invalid password', { autoClose: 3000 });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to verify password');
      toast.error(err.response?.data?.message || 'Failed to verify password', { autoClose: 3000 });
    }
  };

  const handleSubmit = async () => {
    if (!isLoggedIn || !user) {
      setError('Please login to save payment');
      toast.error('Please login to save payment', { autoClose: 3000 });
      return;
    }
    const requiredFields: Record<string, string> = {
      Amount: formData.amount,
      'Payment Mode': formData.paymentMode,
      'Amount Type': formData.amountType,
      'Received Date': formData.receivedDate,
      'Transaction Number': formData.transactionNumber,
    };
    const missingFields = Object.keys(requiredFields).filter((key) => !requiredFields[key]);
    if (missingFields.length > 0) {
      const errorMessage = `${missingFields.join(', ')} ${missingFields.length > 1 ? 'are' : 'is'} required`;
      setError(errorMessage);
      toast.error(errorMessage, { autoClose: 3000 });
      return;
    }
    const parsedAmount = parseFloat(formData.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Amount must be a valid positive number');
      toast.error('Amount must be a valid positive number', { autoClose: 3000 });
      return;
    }
    if (!['cash', 'check', 'bank transfer', 'upi'].includes(formData.paymentMode)) {
      setError('Please select a valid payment mode');
      toast.error('Please select a valid payment mode', { autoClose: 3000 });
      return;
    }
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
      formDataToSend.append('userId', user.user_id.toString());
      formDataToSend.append('isLocal', 'true');
      if (receiptFile) formDataToSend.append('receipt', receiptFile);

      const response = await axiosInstance.post('/studentPayment', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        toast.success('Payment saved successfully', { autoClose: 3000 });
        const fetchResponse = await axiosInstance.get(`/academic/${matchingAcademic.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (fetchResponse.data.success) setPayments(fetchResponse.data.data);
        resetForm();
      } else {
        setError(response.data.error || 'Failed to save payment');
        toast.error(response.data.error || 'Failed to save payment', { autoClose: 3000 });
      }
    } catch (err) {
      let errorMessage = 'Failed to save payment';
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as any).response === 'object' &&
        (err as any).response !== null &&
        'data' in (err as any).response &&
        typeof (err as any).response.data === 'object' &&
        (err as any).response.data !== null &&
        'error' in (err as any).response.data
      ) {
        errorMessage = (err as any).response.data.error;
      }
      setError(errorMessage);
      toast.error(errorMessage, { autoClose: 3000 });
      console.error('Submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication token missing');
      const handoverResponse = await axiosInstance.get(`/paymentHandover/check/${paymentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (handoverResponse.data.hasHandover) {
        toast.error('This amount has been handed over. Please delete handover entry first.', { autoClose: 3000 });
        return;
      }
      const response = await axiosInstance.delete(`/studentPayment/${paymentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        toast.success('Payment deleted successfully', { autoClose: 3000 });
        setPayments(payments.filter((payment) => payment.id !== paymentId));
      } else throw new Error(response.data.error || 'Failed to delete payment');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete payment', { autoClose: 3000 });
    }
  };

  const confirmDeletePayment = (paymentId: number) => {
    setPaymentIdToDelete(paymentId);
    setShowDeleteConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    if (paymentIdToDelete !== null) {
      await handleDeletePayment(paymentIdToDelete);
      setShowDeleteConfirmModal(false);
      setPaymentIdToDelete(null);
    }
  };

  const handleDownloadSlip = async (paymentId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication token missing');
      const response = await axiosInstance.get(`/studentPayment/${paymentId}/slip`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payment-slip-${paymentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Download payment slip successfully', {
        position: 'top-center',
        autoClose: 5000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } catch (err) {
      console.error('Error downloading slip:', err);
      toast.error('Failed to download payment slip', { autoClose: 3000 });
    }
  };

  const getFileUrl = (payment: StudentPayment): string | undefined => {
    if (payment.receiptUrl) {
      return `${axiosInstance.defaults.baseURL}${payment.receiptUrl}`;
    }
    return undefined;
  };

  const handleViewReceipt = (payment: StudentPayment) => {
    const url = getFileUrl(payment);
    if (url) setSelectedReceiptUrl(url);
    setShowReceiptModal(true);
  };

  const getTransactionLabel = () => {
    switch (formData.paymentMode) {
      case 'cash':
        return 'Receipt Number';
      case 'check':
        return 'Cheque Transaction Number';
      case 'bank transfer':
        return 'Bank Transaction Number';
      case 'upi':
        return 'UPI Transaction Number';
      default:
        return 'Choose Payment Method';
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-99">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[85vh] overflow-y-auto shadow-md border border-gray-200">
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
          {error && (
            <div className="text-red-500 text-xs mb-2 bg-red-100 p-2 rounded animate-fade-out">
              {error}
            </div>
          )}
          {!matchingAcademic && (
            <div className="text-red-500 text-xs mb-2 bg-red-100 p-2 rounded">
              No academic details found for session {sessionYearFilter} and year {yearFilter}
            </div>
          )}

          <div className="bg-gray-300 p-2 text-black rounded-lg mb-3 border-l-4 border-blue-600 shadow-sm">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="flex items-center">
                <span className="font-bold text-black mr-1">Student Name:</span>
                <span className="text-black font-medium">{student.fName} {student.lName || ''}</span>
              </div>
              <div className="flex items-center">
                <span className="font-bold text-black mr-1">Roll number:</span>
                <span className="text-black font-medium">{student.rollNumber}</span>
              </div>
              <div className="flex items-center">
                <span className="font-bold text-black mr-1">College Id:</span>
                <span className="text-black font-medium">{student.stdCollId}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm mt-1">
              <div className="flex items-center">
                <span className="font-bold text-black mr-1">Father's Name:</span>
                <span className="text-black font-medium">{student.fatherName || 'N/A'}</span>
              </div>
              <div className="flex items-center">
                <span className="font-bold text-black mr-1">Session Year:</span>
                <span className="text-black font-medium">{matchingAcademic?.sessionYear || 'N/A'}</span>
              </div>
              <div className="flex items-center">
                <span className="font-bold text-black mr-1">Course Year:</span>
                <span className="text-black font-medium">{matchingAcademic?.courseYear || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="bg-gray-50 px-2 py-1 border-b border-gray-200 rounded-t-lg">
                <h3 className="font-bold text-gray-700 flex items-center text-sm">
                  <FaMoneyBillWave className="mr-1 text-green-600 text-2xl" />
                  Payment Information
                </h3>
              </div>
              <div className="p-2 bg-green-50">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-2">
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
                      {getTransactionLabel()} <RequiredAsterisk />
                    </label>
                    <input
                      type="text"
                      name="transactionNumber"
                      value={formData.transactionNumber}
                      onChange={handleInputChange}
                      disabled={!formData.paymentMode}
                      className={`w-full border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs ${
                        !formData.paymentMode ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
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
                        type="number"
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
                  <div></div>
                  <div></div>
                  <div className="flex gap-2">
                    <button
                      onClick={onClose}
                      className="flex-1 px-2 bg-red-400 text-black rounded-md hover:bg-red-500 transition duration-200 font-bold text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setShowVerifyModal(true)}
                      disabled={!matchingAcademic || isSubmitting || !isFormValid()}
                      className={`flex-1 px-3 py-1 rounded-md transition duration-200 font-medium text-xs flex items-center justify-center ${
                        matchingAcademic && !isSubmitting && isFormValid()
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-400 text-gray-700 cursor-not-allowed'
                      }`}
                      title={
                        !matchingAcademic
                          ? 'No academic details found'
                          : isSubmitting
                          ? 'Saving...'
                          : !isFormValid()
                          ? 'Please fill all required details'
                          : ''
                      }
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
                <div className="mt-2">
                  <div className="border-l-4 border-blue-600 rounded-md p-2 bg-blue-100">
                    <p className="text-md font-bold text-blue-800 mb-1">Academic Details</p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      <div className="space-y-0.5">
                        <div className="flex justify-between">
                          <span className="text-black font-bold">Total Admin Amount:</span>
                          <span className="font-bold">₹{matchingAcademic?.adminAmount || '0'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Remaining Admin Amount:</span>
                          <span className="font-bold text-red-600">
                            ₹{remainingAdminAmount >= 0 ? remainingAdminAmount : '0'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Paid Admin Amount:</span>
                          <span className="font-bold text-green-600">₹{totalPaidAdminAmount}</span>
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex justify-between">
                          <span className="text-black font-bold">Total Fees Amount:</span>
                          <span className="font-bold">₹{matchingAcademic?.feesAmount || '0'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Remaining Fees Amount:</span>
                          <span className="font-bold text-red-600">
                            ₹{remainingFeesAmount >= 0 ? remainingFeesAmount : '0'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Paid Fees Amount:</span>
                          <span className="font-bold text-green-600">₹{totalPaidFeesAmount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {showVerifyModal && (
              <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-100">
                <div className="bg-white rounded-lg p-4 w-full max-w-md">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Verify Password</h3>
                    <button
                      onClick={() => setShowVerifyModal(false)}
                      className="text-gray-600 hover:text-red-600"
                    >
                      <FaTimes />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Password <RequiredAsterisk />
                      </label>
                      <input
                        type="password"
                        value={verifyPassword}
                        onChange={(e) => setVerifyPassword(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="Enter your password"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setShowVerifyModal(false)}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleVerifyPassword}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                      >
                        Verify & Pay
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showDeleteConfirmModal && (
              <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-100">
                <div className="bg-white rounded-lg p-4 w-full max-w-md">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Confirm Deletion</h3>
                    <button
                      onClick={() => setShowDeleteConfirmModal(false)}
                      className="text-gray-600 hover:text-red-600"
                    >
                      <FaTimes />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-700">
                      Are you sure you want to delete this payment? This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setShowDeleteConfirmModal(false)}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm"
                      >
                        No
                      </button>
                      <button
                        onClick={handleConfirmDelete}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                      >
                        Yes
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          {showReceiptModal && selectedReceiptUrl && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
      {/* Close button */}
      <button
        onClick={() => {
          setShowReceiptModal(false);
          setSelectedReceiptUrl(null);
        }}
        className="absolute top-3 right-3 text-2xl text-gray-500 hover:text-red-500 z-10"
      >
        <FaTimes />
      </button>

      {/* Modal header */}
      <h3 className="text-xl font-bold p-4 border-b border-gray-200">Receipt</h3>

      {/* Modal content */}
      <div className="p-4 overflow-auto max-h-[80vh] flex justify-center items-center bg-gray-50">
        {/* The iframe or image */}
        <iframe
          src={selectedReceiptUrl}
          title="Receipt"
          className="w-full h-full max-h-[80vh] max-w-full   border border-gray-200 rounded-xl shadow-lg"
          style={{ minHeight: '700px' }}
        />
      </div>
    </div>
  </div>
)}


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
                          <th className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            EMI No
                          </th>
                          <th className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Due Date
                          </th>
                          <th className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {student.emiDetails
                          .filter((emi) => emi.studentAcademicId === matchingAcademic.id)
                          .sort((a, b) => a.emiNumber - b.emiNumber)
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
                                    getEMIStatus(emi) === 'Paid'
                                      ? 'bg-green-100 text-green-800'
                                      : getEMIStatus(emi) === 'Pending'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}
                                >
                                  {getEMIStatus(emi)}
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
                <div className="p-2 text-center bg-blue-50 text-gray-500 text-xs">No EMI details available</div>
              </div>
            )}

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
                  <div className="text-white text-xs text-center">{paymentError}</div>
                ) : payments.length === 0 ? (
                  <div className="text-black text-xs text-center">No payment history available</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="">
                        <tr className="bg-gray-300 rounded">
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
                          <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-tight">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-purple-50 divide-y divide-gray-200">
                        {payments.map((payment) => (
                          <tr key={payment.id} className="hover:bg-blue-100">
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
                              {getFileUrl(payment) ? (
                                <button
                                  onClick={() => handleViewReceipt(payment)}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  View Receipt
                                </button>
                              ) : (
                                'N/A'
                              )}
                            </td>
                            <td className="px-2 py-1 whitespace-nowrap text-xs text-black">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleDownloadSlip(payment.id)}
                                  className="flex items-center text-blue-600 hover:text-blue-800"
                                >
                                  <FaFileInvoiceDollar className="mr-1 text-xs" />
                                  Download Slip
                                </button>
                                <button
                                  onClick={() => confirmDeletePayment(payment.id)}
                                  className="flex items-center text-red-600 hover:text-red-800"
                                >
                                  <FaTrash className="mr-1 text-xs" />
                                  Delete
                                </button>
                              </div>
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
        </div>
      </div>
    </div>
  );
};

export default StudentPaymentModal;