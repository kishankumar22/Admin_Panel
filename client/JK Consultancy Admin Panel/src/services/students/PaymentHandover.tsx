import React, { useState, useEffect } from 'react';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import { Search, Check, X, ArrowLeftRight, Calendar, DollarSign, User, Users, Plus, Eye, Lock, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';
import axiosInstance from '../../config';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { RequiredAsterisk } from './AddStudentModal';

// Pagination component that can be reused
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  return (
    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-2 py-1 sm:px-3">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`relative inline-flex items-center rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium ${
            currentPage === 1 ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`relative ml-3 inline-flex items-center rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium ${
            currentPage === totalPages ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-gray-700">
            Showing <span className="font-medium">{currentPage}</span> of{' '}
            <span className="font-medium">{totalPages}</span> pages
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-1 py-0.5 text-xs font-medium ${
                currentPage === 1 ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <span className="sr-only">Previous</span>
              <ChevronLeft className="h-3 w-3" aria-hidden="true" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pageNumber = i + 1;
              const isCurrentPage = pageNumber === currentPage;
              
              return (
                <button
                  key={pageNumber}
                  onClick={() => onPageChange(pageNumber)}
                  className={`relative inline-flex items-center border px-2 py-0.5 text-xs font-medium ${
                    isCurrentPage
                      ? 'z-10 border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {pageNumber}
                </button>
              );
            })}
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <span className="relative inline-flex items-center border border-gray-300 bg-white px-2 py-0.5 text-xs font-medium text-gray-700">
                ...
              </span>
            )}
            {totalPages > 5 && (
              <button
                onClick={() => onPageChange(totalPages)}
                className={`relative inline-flex items-center border border-gray-300 px-2 py-0.5 text-xs font-medium ${
                  currentPage === totalPages
                    ? 'z-10 border-blue-500 bg-blue-50 text-blue-600'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                {totalPages}
              </button>
            )}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`relative inline-flex items-center rounded-r-md border border-gray-300 bg-white px-1 py-0.5 text-xs font-medium ${
                currentPage === totalPages ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <span className="sr-only">Next</span>
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

// Reusable modal component (Made compact)
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[85vh] overflow-auto">
        <div className="p-2 border-b flex justify-between items-center bg-blue-500">
          <h3 className="text-sm font-bold text-black rounded">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-red-700">
            <X className="w-4 h-4 bg-gray-300 rounded" />
          </button>
        </div>
        <div className="p-2">
          {children}
        </div>
        {footer && (
          <div className="bg-gray-50 px-2 py-1 rounded-b-lg">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

interface Student {
  id: number;
  fName: string;
  lName?: string;
  rollNumber: string;
  mobileNumber: string;
  email: string;
  course?: { courseName: string };
  college?: { collegeName: string };
}

interface StudentAcademic {
  id: number;
  sessionYear: string;
  feesAmount: number;
  adminAmount: number;
  paymentMode: string;
  courseYear?: string;
}

interface Payment {
  id: number;
  amount: number | null;
  amountType: string;
  paymentMode: string;
  receivedDate: string;
  transactionNumber: string;
  courseYear: string;
  sessionYear: string;
  approvedBy: string;
  student: Student;
  studentAcademic?: StudentAcademic;
  studentId: number;
  handoverAmount?: number;
  remainingAmount?: number;
  receiptUrl?: string | null;
}

interface CashHandover {
  id: number;
  paymentId: number;
  studentId: number;
  amount: number;
  receivedBy: string;
  handedOverTo: string;
  handoverDate: string;
  remarks?: string;
  verified: boolean;
  verifiedBy?: string;
  verifiedOn?: string;
  student?: Student;
  payment?: Payment;
}

interface ApprovedBy {
  approvedBy: string;
}

interface PaymentWithHandover extends Payment {
  handoverAmount: number;
  isPartial: boolean;
}

const PaymentHandover: React.FC = () => {
  const [cashHandovers, setCashHandovers] = useState<CashHandover[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [approvedByList, setApprovedByList] = useState<ApprovedBy[]>([]);

  const [payments, setPayments] = useState<Payment[]>([]); // Payments filtered by approvedBy
  const [error, setError] = useState<string | null>(null);
  const [viewReceiptUrl, setViewReceiptUrl] = useState<string | null>(null);
  const { user } = useAuth();
  
  // Selected payments with handover amounts
  const [selectedPayments, setSelectedPayments] = useState<PaymentWithHandover[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    receivedBy: '',
    handedOverTo: '',
    handoverDate: new Date().toISOString().slice(0, 10),
    remarks: '',
  });

  // Password verification modal state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Pagination states
  const [handoverCurrentPage, setHandoverCurrentPage] = useState(1);
  const [paymentsCurrentPage, setPaymentsCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch unique approvedBy values
        const approvedByRes = await axiosInstance.get('/approved-by');
        if (approvedByRes.data.success) {
          setApprovedByList(approvedByRes.data.data);
        } else {
          throw new Error('Failed to fetch approvedBy list');
        }

        // Fetch cash handovers
        const handoversRes = await axiosInstance.get('/payment-handovers');
        if (handoversRes.data.success) {
          setCashHandovers(handoversRes.data.data);
        } else {
          throw new Error('Failed to fetch cash handovers');
        }
      } catch (error: any) {
        console.error('Error fetching data:', error);
        setError('Failed to load data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Set default handover to current user's name when the form is shown
  useEffect(() => {
    if (showAddForm && user?.name) {
      setFormData(prev => ({
        ...prev,
        handedOverTo: user.name || '',
      }));
    }
  }, [showAddForm, user?.name]);

  // Reset form data
  const resetForm = () => {
    setFormData({
      receivedBy: '',
      handedOverTo: user?.name || '',
      handoverDate: new Date().toISOString().slice(0, 10),
      remarks: '',
    });
    setSelectedPayments([]);
    setPayments([]);
  };

  // Fetch payments when receivedBy changes
  useEffect(() => {
    const fetchPayments = async () => {
      if (formData.receivedBy) {
        setLoading(true);
        try {
          const paymentsRes = await axiosInstance.get(`/payments-by-staff/${encodeURIComponent(formData.receivedBy)}`);
          if (paymentsRes.data.success) {
            setPayments(paymentsRes.data.data);
            // Reset payments pagination when new data is loaded
            setPaymentsCurrentPage(1);
          } else {
            throw new Error('Failed to fetch payments');
          }
        } catch (error: any) {
          console.error('Error fetching payments:', error);
          setError('Failed to load payments. Please try again.');
          setPayments([]);
        } finally {
          setLoading(false);
        }
      } else {
        setPayments([]);
      }
    };

    fetchPayments();
  }, [formData.receivedBy]);

  // Filter payments (those with remaining amount)
  const filteredPayments = payments.filter(payment => payment.remainingAmount && payment.remainingAmount > 0);

  // Calculate total of selected payments' handover amounts
  const selectedTotal = selectedPayments.reduce((sum, payment) => sum + payment.handoverAmount, 0);

  // Filter handovers based on search term
  const filteredHandovers = cashHandovers.filter(handover => {
    const matchesSearch =
      (handover.student?.fName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (handover.receivedBy?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (handover.handedOverTo?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  // Paginate handovers and payments
  const paginatedHandovers = filteredHandovers.slice(
    (handoverCurrentPage - 1) * itemsPerPage,
    handoverCurrentPage * itemsPerPage
  );

  // Format date for display
  const formatDate = (date: string | undefined) => {
    return date ? new Date(date).toLocaleDateString('en-US') : '-';
  };

  // Handle form input changes
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Reset selected payments when receivedBy changes
    if (name === 'receivedBy') {
      setSelectedPayments([]);
    }
  };

  // Handle password input change
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setPasswordError('');
  };

  // Handle payment selection and set initial handover amount to full remaining amount
  const handlePaymentSelect = (payment: Payment) => {
    if (selectedPayments.some(p => p.id === payment.id)) {
      setSelectedPayments(selectedPayments.filter(p => p.id !== payment.id));
    } else {
      // When adding a payment, set the handover amount to the full remaining amount by default
      const remainingAmount = payment.remainingAmount || 0;
      setSelectedPayments([
        ...selectedPayments,
        {
          ...payment,
          handoverAmount: remainingAmount,
          isPartial: false
        }
      ]);
    }
  };

  // Handle handover amount change for a payment
  const handleHandoverAmountChange = (paymentId: number, amount: string) => {
    const numericAmount = parseFloat(amount);
    
    // Find the payment
    const payment = payments.find(p => p.id === paymentId);
    if (!payment) return;
    
    // Check if payment mode is "bank transfer" or "cheque" - parse the paymentMode to remove transaction number
    const paymentModeBase = payment.paymentMode.toLowerCase().split(' ')[0]; // e.g., "cheque (123456)" -> "cheque"
    const isReadOnly = ['bank', 'cheque'].includes(paymentModeBase);
    if (isReadOnly) {
      return;
    }
    
    const remainingAmount = payment.remainingAmount || 0;
    
    // Validate the amount
    if (isNaN(numericAmount) || numericAmount <= 0 || numericAmount > remainingAmount) {
      // Don't update if invalid
      return;
    }
    
    // Update the selected payment with the new handover amount
    setSelectedPayments(prevSelected =>
      prevSelected.map(p =>
        p.id === paymentId
          ? { 
              ...p, 
              handoverAmount: numericAmount,
              isPartial: numericAmount < remainingAmount
            }
          : p
      )
    );
  };

  // Group payments by student for display
  const paymentsByStudent: Record<number, { student: Student; payments: Payment[] }> = {};
  filteredPayments.forEach(payment => {
    if (!paymentsByStudent[payment.studentId]) {
      paymentsByStudent[payment.studentId] = {
        student: payment.student,
        payments: [],
      };
    }
    paymentsByStudent[payment.studentId].payments.push(payment);
  });

  // Paginate payments by student
  const paginatedPaymentsByStudent: typeof paymentsByStudent = {};
  const studentIds = Object.keys(paymentsByStudent).map(Number);
  const paginatedStudentIds = studentIds.slice(
    (paymentsCurrentPage - 1) * itemsPerPage,
    paymentsCurrentPage * itemsPerPage
  );
  
  paginatedStudentIds.forEach(studentId => {
    paginatedPaymentsByStudent[studentId] = paymentsByStudent[studentId];
  });

  // Handle initiating form submission - shows password modal
  const handleInitiateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedPayments.length === 0) {
      // setError('Please select at least one payment to handover');
      return;
    }
    setShowPasswordModal(true);
  };

  // Handle cancel of form
  const handleCancelForm = () => {
    setShowAddForm(false);
    resetForm();
  };

  // Handle cancel of password modal
  const handleCancelPassword = () => {
    setShowPasswordModal(false);
    setPassword('');
    setPasswordError('');
  };

  // Handle actual form submission after password verification
  const handleSubmitWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password) {
      setPasswordError('Password is required');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Verify password
      const verifyRes = await axiosInstance.post('/verify-password', {
        userId: user?.user_id,
        password: password
      });
      
      if (!verifyRes.data.success) {
        setPasswordError('Invalid credentials');
        setIsSubmitting(false);
        return;
      }
      
      // Password verified, proceed with handover creation
      const res = await axiosInstance.post('/payment-handovers', {
        paymentData: selectedPayments.map(p => ({
          id: p.id,
          handoverAmount: p.handoverAmount
        })),
        handedOverTo: formData.handedOverTo,
        handoverDate: formData.handoverDate,
        remarks: formData.remarks,
        createdBy: user?.name || 'System',
        verified: true, // Auto-verify since password was checked
        verifiedBy: user?.name || 'System',
        verifiedOn: new Date().toISOString()
      });

      if (res.data.success) {
        // Refresh handovers list
        const handoversRes = await axiosInstance.get('/payment-handovers');
        if (handoversRes.data.success) {
          setCashHandovers(handoversRes.data.data);
        }

        // Reset form and close modals
        resetForm();
        setShowAddForm(false);
        setShowPasswordModal(false);
        setPassword('');
        toast.success(`Handover Created Successfully By ${user?.name}`);
      } else {
        throw new Error('Failed to create handovers');
      }
    } catch (error: any) {
      console.error('Error creating handovers:', error);
      toast.error(error.response?.data?.message || 'Failed to create handovers');
      setPasswordError('Invalid credential. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate number of pages
  const handoverTotalPages = Math.ceil(filteredHandovers.length / itemsPerPage);
  const paymentsTotalPages = Math.ceil(Object.keys(paymentsByStudent).length / itemsPerPage);

  // ReceiptModal component (Updated with larger size and Cancel button)
  const ReceiptViewerModal = () => {
    const modalFooter = (
      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={() => setViewReceiptUrl(null)}
          className="px-2 py-0.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-100"
        >
          Cancel
        </button>
      </div>
    );

    return (
      <Modal
        isOpen={!!viewReceiptUrl}
        onClose={() => setViewReceiptUrl(null)}
        title="View Receipt"
        footer={modalFooter}
      >
        {viewReceiptUrl?.endsWith('.pdf') ? (
          <iframe 
            src={viewReceiptUrl} 
            className="w-full" 
            style={{ height: '70vh' }} 
            title="Receipt PDF"
          />
        ) : (
          <img 
            src={viewReceiptUrl || ''} 
            alt="Receipt" 
            className="max-w-full mx-auto h-auto"
            style={{ maxHeight: '70vh' }}
          />
        )}
      </Modal>
    );
  };

  // Password verification modal (Made compact)
  const PasswordVerificationModal = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [localPasswordError, setLocalPasswordError] = useState('');
    
    // Effect to handle error message timeout
    useEffect(() => {
      if (passwordError) {
        setLocalPasswordError(passwordError);
        
        // Set timeout to clear error after 3 seconds
        const timer = setTimeout(() => {
          setLocalPasswordError('');
        }, 3000);
        
        // Clean up timeout on unmount or when error changes
        return () => clearTimeout(timer);
      }
    }, [passwordError]);
    
    const modalFooter = (
      <div className="flex justify-end space-x-1">
        <button
          type="button"
          onClick={handleCancelPassword}
          className="px-2 py-0.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-100"
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
        title="Verify Cash Handover"
        footer={modalFooter}
      >
        <div className="mb-2">
          <div className="bg-blue-50 p-2 rounded-md mb-2">
            <p className="text-xs text-blue-800">
              Handing over ₹{selectedTotal.toLocaleString('en-US')} from {selectedPayments.length} payment(s).
              Verify with your password.
            </p>
          </div>
          
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Password <RequiredAsterisk />
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={handlePasswordChange}
              className={`w-full border ${localPasswordError ? 'border-red-300' : 'border-gray-300'} rounded-md px-2 py-1 text-xs pr-12`}
              placeholder="Enter password"
              required
              autoFocus
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-2">
              <button
                type="button"
                className="text-gray-500 hover:text-gray-700 mr-2 focus:outline-none"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-3 w-3" />
                ) : (
                  <Eye className="h-3 w-3" />
                )}
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
    <>
      <Breadcrumb pageName="Payment Handover" />
<div className="flex flex-col bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-3 py-1.5 rounded-t-lg shadow-sm">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            {/* Left side with search */}
            <div className="relative w-full sm:w-56 order-2 sm:order-1">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by student or staff..."
                className="pl-7 pr-2 py-0.5 border border-gray-300 rounded text-xs w-full focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Right side with action buttons */}
            <div className="flex items-center space-x-2 order-1 sm:order-2 w-full sm:w-auto justify-end">
  <button
    className={`inline-flex items-center px-2 py-1 ${
      showAddForm ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
    } text-white rounded text-xs font-medium transition-colors duration-150`}
    onClick={() => {
      if (showAddForm) {
        handleCancelForm();
      } else {
        setShowAddForm(true);
      }
    }}
  >
    {showAddForm ? <X className="w-3 h-3 mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
    {showAddForm ? 'Cancel' : 'New Handover'}
  </button>

  <button className="inline-flex items-center px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors duration-150">
    <ArrowLeftRight className="w-3 h-3 mr-1" />
    View Reports
  </button>
</div>

          </div>
        </header>

        <main className="pt-2">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-3 text-xs">
              {error}
            </div>
          )}

          {showAddForm && (
            <div className="bg-white rounded-lg shadow mb-3 p-2">
              <h2 className="text-sm font-semibold text-blue-600 mb-2 bg-blue-100 p-2 rounded">New Cash Handover</h2>
              <form onSubmit={handleInitiateSubmit} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Received By <RequiredAsterisk /></label>
                    <select
                      name="receivedBy"
                      value={formData.receivedBy}
                      onChange={handleFormChange}
                      required
                      className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
                    >
                      <option value="">Select Staff</option>
                      {approvedByList.map((item, index) => (
                        <option key={index} value={item.approvedBy}>
                          {item.approvedBy}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Handed Over To <RequiredAsterisk /></label>
                    <input
                      type="text"
                      name="handedOverTo"
                      value={formData.handedOverTo}
                      onChange={handleFormChange}
                      required
                      disabled
                      className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Handover Date</label>
                    <input
                      type="date"
                      name="handoverDate"
                      value={formData.handoverDate}
                      onChange={handleFormChange}
                      required
                      className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
                    />
                  </div>
                </div>

                {formData.receivedBy && (
                  <div className="mt-3">
                    <h3 className="rounded-t bg-gradient-to-r from-blue-200 via-blue-300 to-blue-400 text-black p-1.5 mb-2">Select Payments to Handover</h3>
                    {loading ? (
                      <div className="text-gray-500 p-2 bg-gray-50 rounded-md text-xs">Loading payments...</div>
                    ) : Object.keys(paymentsByStudent).length === 0 ? (
                      <div className="text-gray-500 p-2 bg-gray-50 rounded-md text-xs">
                        No payments found for {formData.receivedBy}
                      </div>
                    ) : (
                      <div className="border border-gray-200 rounded-md overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200 text-xs">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8">
                                <input
                                  type="checkbox"
                                  className="h-3 w-3 rounded border-gray-300"
                                  checked={selectedPayments.length === filteredPayments.length && filteredPayments.length > 0}
                                  onChange={() => {
                                    if (selectedPayments.length === filteredPayments.length) {
                                      setSelectedPayments([]);
                                    } else {
                                      setSelectedPayments(filteredPayments.map(p => ({
                                        ...p,
                                        handoverAmount: p.remainingAmount || 0,
                                        isPartial: false
                                      })));
                                    }
                                  }}
                                />
                              </th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount Type</th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Mode</th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Handover Amount</th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {Object.values(paginatedPaymentsByStudent).map(({ student, payments }) =>
                              payments.map((payment) => {
                                const isSelected = selectedPayments.some(p => p.id === payment.id);
                                const selectedPayment = selectedPayments.find(p => p.id === payment.id);
                                const paymentModeBase = payment.paymentMode.toLowerCase().split(' ')[0]; // e.g., "cheque (123456)" -> "cheque"
                                const isReadOnly = ['bank', 'cheque'].includes(paymentModeBase);
                                
                                return (
                                  <tr
                                    key={payment.id}
                                    className={isSelected ? 'bg-blue-50' : ''}
                                  >
                                    <td className="px-2 py-1 whitespace-nowrap">
                                      <input
                                        type="checkbox"
                                        className="h-3 w-3 rounded border-gray-300"
                                        checked={isSelected}
                                        onChange={() => handlePaymentSelect(payment)}
                                      />
                                    </td>
                                    <td className="px-2 py-1 whitespace-nowrap">
                                      <div className="flex items-center">
                                        <div className="flex-shrink-0 h-5 w-5 bg-blue-100 rounded-full flex items-center justify-center">
                                          <User className="h-3 w-3 text-blue-600" />
                                        </div>
                                        <div className="ml-2">
                                          <div className="text-xs font-medium text-gray-900">{`${student.fName} ${student.lName || ''}`}</div>
                                          <div className="text-xs text-gray-500">ID: {student.id}</div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-500">{payment.amountType}</td>
                                    <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-500">
                                      {payment.paymentMode} {payment.transactionNumber ? `(${payment.transactionNumber})` : ''}
                                    </td>
                                    <td className="px-2 py-1 whitespace-nowrap text-xs font-medium text-gray-900">
                                      ₹{(payment.remainingAmount || 0).toLocaleString('en-US')}
                                    </td>
                                    <td className="px-2 py-1 whitespace-nowrap">
                                      {isSelected && (
                                        <input
                                          type="number"
                                          min="0"
                                          max={payment.remainingAmount || 0}
                                          step="0.01"
                                          value={selectedPayment?.handoverAmount || 0}
                                          onChange={(e) => handleHandoverAmountChange(payment.id, e.target.value)}
                                          className={`border border-gray-300 rounded-md px-2 py-1 text-xs w-20 ${isReadOnly ? 'bg-gray-300 cursor-not-allowed' : ''}`}
                                          readOnly={isReadOnly}
                                          title={isReadOnly ? "Bank/Check payments cannot be partially handed over" : ""}
                                        />
                                      )}
                                    </td>
                                    <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-500">{student.course?.courseName || '-'}</td>
                                    <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-500">
                                      {payment.receiptUrl && (
                                        <button 
                                          onClick={() => setViewReceiptUrl(payment.receiptUrl ?? null)}
                                          className="text-blue-600 hover:text-blue-800"
                                          title="View Receipt"
                                        >
                                          <Eye className="h-3 w-3" />
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                        
                        {/* Pagination for payments */}
                        {paymentsTotalPages > 1 && (
                          <Pagination
                            currentPage={paymentsCurrentPage}
                            totalPages={paymentsTotalPages}
                            onPageChange={setPaymentsCurrentPage}
                          />
                        )}
                      </div>
                    )}

                    {selectedPayments.length > 0 && (
                      <div className="mt-2 bg-blue-50 p-2 rounded-md">
                        <h4 className="text-sm font-bold text-green-800 mb-1">Summary of Selected Payments</h4>
                        {selectedPayments.some(p => ['bank', 'cheque'].includes(p.paymentMode.toLowerCase().split(' ')[0])) && (
                          <div className="mt-1 text-xs text-orange-600">
                            Note: Bank/Check payments cannot be partially handed over.
                          </div>
                        )}
                        <p className="text-xs text-blue-600">
                          I am handing over {selectedPayments.length} payment{selectedPayments.length !== 1 ? 's' : ''} from{' '}
                          {new Set(selectedPayments.map(p => p.studentId)).size} student
                          {new Set(selectedPayments.map(p => p.studentId)).size !== 1 ? 's' : ''}.
                        </p>
                        <div className="flex gap-2 items-center mt-1">
                          <span className="text-xs text-blue-600">Total Amount:</span>
                          <span className="font-semibold text-xs text-blue-800">₹{selectedTotal.toLocaleString('en-US')}</span>
                        </div>
                        {selectedPayments.some(p => p.isPartial) && (
                          <div className="mt-1 text-xs text-amber-600">
                            Note: You have selected partial amounts for one or more payments.
                          </div>
                        )}
                       
                      </div>
                    )}

                    <div className="mt-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Remarks</label>
                      <textarea
                        name="remarks"
                        value={formData.remarks}
                        onChange={handleFormChange}
                        className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
                        rows={2}
                      ></textarea>
                    </div>

                    <div className="flex justify-end space-x-2 mt-3">
                      <button
                        type="button"
                        onClick={handleCancelForm}
                        className="px-2 py-1 border border-gray-300 rounded-md text-gray-700 text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 text-xs"
                        disabled={selectedPayments.length === 0}
                      >
                        {selectedPayments.length > 0
                          ? `Handover ${selectedPayments.length} Payment${selectedPayments.length !== 1 ? 's' : ''}`
                          : 'Select Payments to Handover'}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden mb-3">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex justify-center items-center h-32">
                  <p className="text-gray-500 text-xs">Loading...</p>
                </div>
              ) : filteredHandovers.length === 0 ? (
                <div className="flex justify-center items-center h-32">
                  <p className="text-gray-500 text-xs">No records found</p>
                </div>
              ) : (
                <>
<div className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 text-white rounded-md px-4 py-2 flex items-center justify-between shadow-sm mb-2">
  {/* Left: Title */}
  <h1 className="text-lg font-semibold text-white">Cash Handover List</h1>

  {/* Right: Total Amount */}
  <div className="flex items-center gap-2">
    <div className="bg-white rounded-full p-1.5 flex items-center justify-center">
      <DollarSign className="h-4 w-4 text-blue-600" />
    </div>
    <div className="text-right ">
      <p className="text-[11px] text-black font-medium leading-none">Total Handover Amount</p>
      <p className="text-sm font-bold text-white leading-tight">
        ₹{cashHandovers.reduce((sum, h) => sum + h.amount, 0).toLocaleString('en-US')}
      </p>
    </div>
  </div>
</div>

                <table title='Handover List ' className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-300">
                    <tr>
                      <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                      <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received By</th>
                      <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Handed Over To</th>
                      <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedHandovers.map(handover => (
                      <tr key={handover.id} className="hover:bg-gray-100">
                        <td className="px-2 py-1 whitespace-nowrap text-xs font-medium text-gray-900">{handover.id}</td>
                        <td className="px-2 py-1 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-5 w-5 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="h-3 w-3 text-blue-600" />
                            </div>
                            <div className="ml-2">
                              <div className="text-xs font-medium text-gray-900">{`${handover.student?.fName} ${handover.student?.lName || ''}`}</div>
                              <div className="text-xs text-gray-500">ID: {handover.studentId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap">
                          <div className="text-xs font-medium text-gray-900">₹{handover.amount?.toLocaleString('en-US') || 0}</div>
                          <div className="text-xs text-gray-500">Payment #{handover.paymentId}</div>
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-4 w-4 bg-green-100 rounded-full flex items-center justify-center">
                              <Users className="h-2 w-2 text-green-600" />
                            </div>
                            <div className="ml-1 text-xs text-gray-900">{handover.receivedBy}</div>
                          </div>
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-500">{handover.handedOverTo}</td>
                        <td className="px-2 py-1 whitespace-nowrap">
                          <div className="flex items-center">
                            <Calendar className="h-2.5 w-2.5 text-gray-400 mr-1" />
                            <span className="text-xs text-gray-500">{formatDate(handover.handoverDate)}</span>
                          </div>
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap">
                          {handover.verified ? (
                            <span className="px-1.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full bg-green-100 text-green-800">
                              <Check className="h-4 w-4 mr-0.5" />
                              Verified
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              <X className="h-4 w-4 mr-0.5" />
                              Unverified
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap">
                          {handover.payment?.receiptUrl && (
                            <button
                              onClick={() => setViewReceiptUrl(handover.payment?.receiptUrl ?? null)}
                              className="text-blue-600 hover:text-blue-900"
                              title="View Receipt"
                            >
                              <Eye className="h-3 w-3" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {/* Pagination for handovers */}
                {handoverTotalPages > 1 && (
                  <Pagination
                    currentPage={handoverCurrentPage}
                    totalPages={handoverTotalPages}
                    onPageChange={setHandoverCurrentPage}
                  />
                )}
                </>
              )}
            </div>
          </div>
       
        </main>
      </div>

      {/* Receipt Viewer Modal */}
      <ReceiptViewerModal />
      
      {/* Password Verification Modal */}
      <PasswordVerificationModal />
    </>
  );
};

export default PaymentHandover;

// Export the reusable components as well
export { Pagination, Modal };