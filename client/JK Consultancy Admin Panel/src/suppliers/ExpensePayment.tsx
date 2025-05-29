import React, { useState, useEffect } from 'react';
import { FaTimes, FaMoneyBillWave, FaSpinner } from 'react-icons/fa';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { toast } from 'react-toastify';
import axiosInstance from '../config';
import { useAuth } from '../context/AuthContext';

interface ExpensePaymentProps {
  expense: {
    SupplierId: number;
    SupplierName: string;
    Amount: number;
    SuppliersExpenseID: number;
  };
  onClose: () => void;
  onSuccess: () => void;
  createdBy: string;
  searchInputRef?: React.RefObject<HTMLInputElement>;
}

interface PaymentHistory {
  ExpensePaymentID: number;
  amount: number;
  mode: string;
  transactionNo: string;
  receivedDate: string;
  receivedBy: string;
  createdBy: string;
  createdOn: string;
  paymentImage: string;
  comment: string | null;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-full max-w-md mx-2 shadow-lg">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
            <FaTimes className="w-4 h-4" />
          </button>
        </div>
        <div>{children}</div>
        <div className="mt-3">{footer}</div>
      </div>
    </div>
  );
};

const RequiredAsterisk = () => <span className="text-red-500">*</span>;

const ExpensePayment: React.FC<ExpensePaymentProps> = ({
  expense,
  onClose,
  onSuccess,
  createdBy,
  searchInputRef,
}) => {
  const { user } = useAuth();
  const modifiedBy = user?.name || 'admin';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [totalPaidAmount, setTotalPaidAmount] = useState<number>(0);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [paymentData, setPaymentData] = useState({
    paymentAmount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: '',
    transactionNo: '',
    file: null as File | null,
    comment: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const totalAmount = expense.Amount;
  const remainingAmount = totalAmount - totalPaidAmount;

  const fetchPaymentHistory = async () => {
    try {
      const response = await axiosInstance.get(`/expense/${expense.SupplierId}/payments`, {
        params: {
          suppliersExpenseID: expense.SuppliersExpenseID, // Pass SuppliersExpenseID as query parameter
        },
      });
      const history: PaymentHistory[] = response.data.map((payment: any) => ({
        ExpensePaymentID: payment.ExpensePaymentID,
        amount: payment.PaidAmount,
        mode: payment.PaymentMode,
        transactionNo: payment.TransactionId,
        receivedDate: new Date(payment.PaymentDate).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit',
        }),
        receivedBy: payment.CreatedBy,
        createdBy: payment.CreatedBy,
        createdOn: new Date(payment.CreatedOn).toLocaleString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        paymentImage: payment.PaymentImage,
        comment: payment.Comment || '',
      }));
      setPaymentHistory(history);
      const totalPaid = history.reduce((sum, payment) => sum + payment.amount, 0);
      setTotalPaidAmount(totalPaid);
    } catch (error) {
      toast.error('Failed to fetch payment history');
    }
  };

  useEffect(() => {
    fetchPaymentHistory();
  }, [expense.SupplierId, expense.SuppliersExpenseID]); // Added SuppliersExpenseID to dependency array

  const getTransactionLabel = () => {
    switch (paymentData.paymentMethod) {
      case 'Cheque':
        return 'Cheque Transaction No.';
      case 'Bank Transfer':
        return 'Bank Transaction No.';
      default:
        return 'Transaction No.';
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!paymentData.paymentAmount) {
      newErrors.paymentAmount = 'Payment amount is required';
    } else if (parseFloat(paymentData.paymentAmount) <= 0) {
      newErrors.paymentAmount = 'Payment amount must be greater than 0';
    } else if (parseFloat(paymentData.paymentAmount) > remainingAmount) {
      newErrors.paymentAmount = 'Payment amount cannot exceed remaining amount';
    }

    if (!paymentData.paymentDate) {
      newErrors.paymentDate = 'Payment date is required';
    }

    if (!paymentData.paymentMethod) {
      newErrors.paymentMethod = 'Payment method is required';
    }

    if (paymentData.paymentMethod !== 'Cash' && !paymentData.transactionNo) {
      newErrors.transactionNo = `${getTransactionLabel()} is required`;
    } else if (paymentData.paymentMethod !== 'Cash' && paymentData.transactionNo) {
      const isDuplicate = paymentHistory.some(
        (payment) => payment.transactionNo === paymentData.transactionNo
      );
      if (isDuplicate) {
        newErrors.transactionNo = 'This transaction number already exists';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === 'paymentMethod') {
      setPaymentData((prev) => ({
        ...prev,
        paymentMethod: value,
        transactionNo: value === 'Cash' ? '' : prev.transactionNo,
      }));
    } else {
      setPaymentData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setPaymentData((prev) => ({ ...prev, file }));
    e.target.value = '';
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setPasswordError('');
  };

  const handleCancelPassword = () => {
    setShowPasswordModal(false);
    setPassword('');
    setPasswordError('');
    setIsPasswordVerified(false);
  };

  const handleSubmitWithPassword = async () => {
    if (!password) {
      setPasswordError('Password is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const verifyRes = await axiosInstance.post('/verify-password', {
        userId: user?.user_id,
        password: password,
      });

      if (!verifyRes.data.success) {
        setPasswordError('Invalid credentials');
        setIsSubmitting(false);
        return;
      }

      setIsPasswordVerified(true);
      setShowPasswordModal(false);
      setPassword('');
      setPasswordError('');
      await submitPayment();
    } catch (error) {
      setPasswordError('Failed to verify password');
      setIsSubmitting(false);
    }
  };

  const submitPayment = async () => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('supplierId', expense.SupplierId.toString());
      formData.append('suppliersExpenseID', expense.SuppliersExpenseID.toString());
      formData.append('paidAmount', paymentData.paymentAmount);
      formData.append('paymentMode', paymentData.paymentMethod);
      formData.append('transactionId', paymentData.paymentMethod === 'Cash' ? '' : paymentData.transactionNo);
      formData.append('paymentDate', paymentData.paymentDate);
      formData.append('isApproved', 'true');
      formData.append('approveBy', modifiedBy);
      formData.append('comment', paymentData.comment || '');
      formData.append('createdBy', createdBy);
      if (paymentData.file) {
        formData.append('file', paymentData.file);
      }

      const response = await axiosInstance.post('/expense/payment', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        toast.success(`Payment of ₹${paymentData.paymentAmount} processed for ${expense.SupplierName}`);
        if (searchInputRef?.current) {
          searchInputRef.current.blur();
          searchInputRef.current.value = '';
        }
        onSuccess();
        onClose();
      } else {
        toast.error(response.data.message || 'Failed to process payment');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to process payment');
    } finally {
      setIsSubmitting(false);
      if (searchInputRef?.current) {
        searchInputRef.current.blur();
        searchInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (searchInputRef?.current) {
      searchInputRef.current.blur();
      searchInputRef.current.value = '';
    }

    setShowPasswordModal(true);
  };

  const isFormValid = () => {
    return (
      paymentData.paymentAmount &&
      parseFloat(paymentData.paymentAmount) > 0 &&
      paymentData.paymentDate &&
      paymentData.paymentMethod &&
      (paymentData.paymentMethod === 'Cash' || (paymentData.transactionNo && !errors.transactionNo))
    );
  };

  const PasswordVerificationModal = () => {
    const [localPasswordError, setLocalPasswordError] = useState('');

    useEffect(() => {
      if (passwordError) {
        setLocalPasswordError(passwordError);
        const timer = setTimeout(() => {
          setLocalPasswordError('');
        }, 3000);
        return () => clearTimeout(timer);
      }
    }, [passwordError]);

    const modalFooter = (
      <div className="flex justify-end space-x-1">
        <button
          type="button"
          onClick={handleCancelPassword}
          className="px-2 py-0.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-2 py-0.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 disabled:bg-blue-300"
          disabled={isSubmitting}
          onClick={handleSubmitWithPassword}
        >
          {isSubmitting ? 'Verifying...' : 'Verify & Submit'}
        </button>
      </div>
    );

    return (
      <Modal
        isOpen={showPasswordModal}
        onClose={handleCancelPassword}
        title="Verify Payment Approval"
        footer={modalFooter}
      >
        <div className="mb-2">
          <div className="bg-blue-50 p-2 rounded-md mb-2">
            <p className="text-xs text-blue-800">
              Approving payment of ₹{parseFloat(paymentData.paymentAmount || '0').toLocaleString('en-US')} for {expense.SupplierName}. Verify with your password.
            </p>
          </div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">
            Password <RequiredAsterisk />
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={handlePasswordChange}
              className={`w-full border ${localPasswordError ? 'border-red-300' : 'border-gray-300'} rounded-md px-2 py-1 text-xs pr-12 dark:bg-gray-700 dark:border-gray-600 dark:text-white`}
              placeholder="Enter password"
              required
              autoFocus
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-2">
              <button
                type="button"
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mr-2 focus:outline-none"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </button>
              <Lock className="h-3 w-3 text-gray-400" />
            </div>
          </div>
          {localPasswordError && (
            <p className="mt-1 text-xs text-red-600 transition-opacity duration-300">
              {localPasswordError}
            </p>
          )}
        </div>
      </Modal>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity duration-300">
      <div className="bg-white dark:bg-gray-900 rounded-xl p-3 w-full max-w-4xl mx-2 transform transition-all duration-300 scale-95 sm:scale-100 shadow-lg relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 mt-1 text-black hover:text-red-700 dark:text-gray-400 dark:hover:text-gray-200 transition duration-150 z-10"
        >
          <FaTimes className="w-6 h-6 mr-3 mt-1" />
        </button>
        <h2 className="text-base sm:text-lg md:text-xl font-semibold mb-4 px-3 py-1 rounded-md bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-500 text-white dark:from-blue-700 dark:via-indigo-700 dark:to-indigo-800 shadow flex items-center gap-2">
          <FaMoneyBillWave className="text-yellow-300 w-5 h-5" />
          <span>Expense Payment Details - {expense.SupplierName}</span>
        </h2>

        <div className="max-h-[70vh] overflow-y-auto pr-1">
          <div className="mb-3">
            <div className="flex flex-col sm:flex-row justify-between items-center bg-blue-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm shadow-sm gap-2 sm:gap-4">
              <div className="text-gray-600 dark:text-gray-300">
                <span className="font-medium">Total Expense Amount:</span>{' '}
                <span className="font-bold text-gray-900 dark:text-white">₹{totalAmount}</span>
              </div>
              <div className="text-gray-600 dark:text-gray-300">
                <span className="font-medium">Total Paid Amount:</span>{' '}
                <span className="font-bold text-blue-600 dark:text-blue-400">₹{totalPaidAmount}</span>
              </div>
              <div className="text-gray-600 dark:text-gray-300">
                <span className="font-medium">Total Remaining Amount:</span>{' '}
                <span className="font-bold text-red-600 dark:text-red-400">₹{remainingAmount}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
            <h3 className="text-md font-semibold bg-blue-100 p-1.5 rounded text-gray-800 dark:text-gray-100 mb-1">
              Payment Information
            </h3>
            <form onSubmit={handleSubmit} className="text-xs">
              <div className="grid grid-cols-2 gap-1.5">
                <div className="mb-1">
                  <label className="flex items-center text-xs font-medium text-black dark:text-gray-200 mb-0.5">
                    Payment Mode <RequiredAsterisk />
                  </label>
                  <select
                    name="paymentMethod"
                    value={paymentData.paymentMethod}
                    onChange={handleInputChange}
                    className={`w-full p-1 text-xs rounded border ${
                      errors.paymentMethod ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } focus:ring-1 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white`}
                    required
                  >
                    <option value="">Select payment mode</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                  {errors.paymentMethod && (
                    <p className="text-red-500 text-xs mt-0.5">{errors.paymentMethod}</p>
                  )}
                </div>
                <div className="mb-1">
                  <label className="flex items-center text-xs font-medium text-black dark:text-gray-200 mb-0.5">
                    {getTransactionLabel()} {paymentData.paymentMethod !== 'Cash' && <RequiredAsterisk />}
                  </label>
                  <input
                    type="text"
                    name="transactionNo"
                    value={paymentData.transactionNo}
                    onChange={handleInputChange}
                    className={`w-full p-1 text-xs rounded border ${
                      errors.transactionNo ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } focus:ring-1 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white ${
                      paymentData.paymentMethod === 'Cash' ? 'cursor-not-allowed bg-gray-200' : ''
                    }`}
                    disabled={paymentData.paymentMethod === 'Cash'}
                    required={paymentData.paymentMethod !== 'Cash'}
                    title={paymentData.paymentMethod === 'Cash' ? 'Cash does not need transaction no' : ''}
                  />
                  {errors.transactionNo && (
                    <p className="text-red-500 text-xs mt-0.5">{errors.transactionNo}</p>
                  )}
                </div>
                <div className="mb-1">
                  <label className="flex items-center text-xs font-medium text-black dark:text-gray-200 mb-0.5">
                    Amount <RequiredAsterisk />
                  </label>
                  <input
                    type="number"
                    name="paymentAmount"
                    value={paymentData.paymentAmount}
                    onChange={handleInputChange}
                    className={`w-full p-1 text-xs rounded border ${
                      errors.paymentAmount ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } focus:ring-1 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white`}
                    required
                  />
                  {errors.paymentAmount && (
                    <p className="text-red-500 text-xs mt-0.5">{errors.paymentAmount}</p>
                  )}
                </div>
                <div className="mb-1">
                  <label className="flex items-center text-xs font-medium text-black dark:text-gray-200 mb-0.5">
                    Payment Date <RequiredAsterisk />
                  </label>
                  <input
                    type="date"
                    name="paymentDate"
                    value={paymentData.paymentDate}
                    onChange={handleInputChange}
                    className={`w-full p-1 text-xs rounded border ${
                      errors.paymentDate ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } focus:ring-1 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white`}
                    required
                  />
                  {errors.paymentDate && (
                    <p className="text-red-500 text-xs mt-0.5">{errors.paymentDate}</p>
                  )}
                </div>
                <div className="mb-1">
                  <label className="flex items-center text-xs font-medium text-black dark:text-gray-200 mb-0.5">
                    Comment
                  </label>
                  <textarea
                    name="comment"
                    value={paymentData.comment}
                    onChange={handleInputChange}
                    className="w-full p-1 text-xs rounded border border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white"
                    rows={2}
                  />
                </div>
                <div className="mb-1">
                  <label className="flex items-center text-xs font-medium text-black dark:text-gray-200 mb-0.5">
                    Upload Expense Payment File
                    {paymentData.file && (
                      <span className="ml-1 text-xs text-indigo-600 truncate max-w-xs">
                        ({paymentData.file.name})
                      </span>
                    )}
                  </label>
                  <div className="flex items-center">
                    <input
                      type="file"
                      id="expense-payment-file-upload"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => document.getElementById('expense-payment-file-upload')?.click()}
                      className="px-2 py-0.5 text-xs text-black bg-gray-200 rounded hover:bg-gray-300"
                    >
                      Upload File
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-1.5 mt-1.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-0.5 text-xs font-medium text-white bg-red-500 rounded hover:bg-red-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isFormValid() || isSubmitting}
                  className="px-3 py-0.5 text-xs font-medium text-white bg-indigo-500 rounded hover:bg-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 flex items-center gap-1 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <FaSpinner className="animate-spin w-3 h-3" />
                      Processing...
                    </>
                  ) : (
                    'Save Payment'
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="mt-2 border-t border-gray-200 dark:border-gray-700 pt-2">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">
              Payment History
            </h3>
            <div className="overflow-x-auto rounded-lg shadow-md">
              <table className="min-w-full text-[11px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                <thead>
                  <tr className="bg-indigo-600 text-white">
                    {[
                      'Amount',
                      'Mode',
                      'Trans #',
                      'Received Date',
                      'Received By',
                      'Created By',
                      'Created On',
                      'Comment',
                      'Payment Slip',
                    ].map((title) => (
                      <th
                        key={title}
                        className="py-1 px-2 text-left font-semibold whitespace-nowrap"
                      >
                        {title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.length > 0 ? (
                    paymentHistory.map((history) => (
                      <tr
                        key={history.ExpensePaymentID}
                        className={`border-b border-gray-200 dark:border-gray-700 transition duration-150 ${
                          paymentHistory.indexOf(history) % 2 === 0
                            ? 'bg-gray-100 dark:bg-gray-800'
                            : 'bg-white dark:bg-gray-900'
                        } hover:bg-indigo-100 dark:hover:bg-gray-700`}
                      >
                        <td className="py-1 px-2 text-black dark:text-gray-200 whitespace-nowrap">
                          ₹{history.amount}
                        </td>
                        <td className="py-1 px-2 text-black dark:text-gray-200 whitespace-nowrap">
                          {history.mode}
                        </td>
                        <td className="py-1 px-2 text-black dark:text-gray-200 whitespace-nowrap">
                          {history.transactionNo || '-'}
                        </td>
                        <td className="py-1 px-2 text-black dark:text-gray-200 whitespace-nowrap">
                          {history.receivedDate}
                        </td>
                        <td className="py-1 px-2 text-black dark:text-gray-200 whitespace-nowrap">
                          {history.receivedBy}
                        </td>
                        <td className="py-1 px-2 text-black dark:text-gray-200 whitespace-nowrap">
                          {history.createdBy}
                        </td>
                        <td className="py-1 px-2 text-black dark:text-gray-200 whitespace-nowrap">
                          {history.createdOn}
                        </td>
                        <td className="py-1 px-2 text-black dark:text-gray-200 whitespace-nowrap">
                          {history.comment || '-'}
                        </td>
                        <td className="py-1 px-2 text-black dark:text-gray-200 whitespace-nowrap">
                          {history.paymentImage ? (
                            <a
                              href={history.paymentImage}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              View Slip
                            </a>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={9}
                        className="py-2 text-center text-gray-600 dark:text-gray-400 text-xs"
                      >
                        No payment history available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <PasswordVerificationModal />
    </div>
  );
};

export default ExpensePayment;