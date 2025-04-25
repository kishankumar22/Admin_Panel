import React, { useState, useEffect } from 'react';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import { Search, Check, X, FileText, ArrowLeftRight, Calendar, DollarSign, User, Users, Plus, Eye } from 'lucide-react';
import axiosInstance from '../../config';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { RequiredAsterisk } from './AddStudentModal';

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
  receiptUrl?: string| null;
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

interface Faculty {
  id: number;
  faculty_name: string;
}

interface ApprovedBy {
  approvedBy: string;
}

interface PaymentWithHandover extends Payment {
  handoverAmount: number;
  isPartial: boolean;
}

const CashHandover: React.FC = () => {
  const [cashHandovers, setCashHandovers] = useState<CashHandover[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'all' | 'verified' | 'unverified'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [approvedByList, setApprovedByList] = useState<ApprovedBy[]>([]);
  const [admins, setAdmins] = useState<Faculty[]>([]);
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

        // Fetch faculty for "Handed Over To" dropdown
        const facultyRes = await axiosInstance.get('/faculty1');
        if (facultyRes.data.success) {
          setAdmins(facultyRes.data.data);
        } else {
          throw new Error('Failed to fetch faculty');
        }

        // Fetch cash handovers
        const handoversRes = await axiosInstance.get('/cash-handovers');
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

  // Fetch payments when receivedBy changes
  useEffect(() => {
    const fetchPayments = async () => {
      if (formData.receivedBy) {
        setLoading(true);
        try {
          const paymentsRes = await axiosInstance.get(`/payments-by-staff/${encodeURIComponent(formData.receivedBy)}`);
          if (paymentsRes.data.success) {
            setPayments(paymentsRes.data.data);
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

  // Filter handovers based on search term and selected tab
  const filteredHandovers = cashHandovers.filter(handover => {
    const matchesSearch =
      (handover.student?.fName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (handover.receivedBy?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (handover.handedOverTo?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    if (selectedTab === 'all') return matchesSearch;
    if (selectedTab === 'verified') return matchesSearch && handover.verified;
    if (selectedTab === 'unverified') return matchesSearch && !handover.verified;

    return matchesSearch;
  });

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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedPayments.length === 0) {
      toast.error('Please select at least one payment to handover');
      return;
    }

    try {
      const res = await axiosInstance.post('/cash-handovers', {
        paymentData: selectedPayments.map(p => ({
          id: p.id,
          handoverAmount: p.handoverAmount
        })),
        handedOverTo: formData.handedOverTo,
        handoverDate: formData.handoverDate,
        remarks: formData.remarks,
        createdBy: user?.name || 'System',
      });

      if (res.data.success) {
        // Refresh handovers list
        const handoversRes = await axiosInstance.get('/cash-handovers');
        if (handoversRes.data.success) {
          setCashHandovers(handoversRes.data.data);
        }

        // Refresh payments list
        if (formData.receivedBy) {
          const paymentsRes = await axiosInstance.get(`/payments-by-staff/${encodeURIComponent(formData.receivedBy)}`);
          if (paymentsRes.data.success) {
            setPayments(paymentsRes.data.data);
          }
        }

        // Reset form
        setFormData({
          receivedBy: '',
          handedOverTo: '',
          handoverDate: new Date().toISOString().slice(0, 10),
          remarks: '',
        });
        setSelectedPayments([]);
        setShowAddForm(false);
        toast.success(`Handover Created Successfully By ${user?.name}`);
      } else {
        throw new Error('Failed to create handovers');
      }
    } catch (error: any) {
      console.error('Error creating handovers:', error);
      toast.error(error.response?.data?.message || 'Failed to create handovers');
    }
  };

  // Modal for viewing receipt
  const ReceiptModal = () => {
    if (!viewReceiptUrl) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-auto">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="text-lg font-medium">View Receipt</h3>
            <button onClick={() => setViewReceiptUrl(null)} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4">
            {viewReceiptUrl.endsWith('.pdf') ? (
              <iframe 
                src={viewReceiptUrl} 
                className="w-full" 
                style={{ height: '70vh' }} 
                title="Receipt PDF"
              />
            ) : (
              <img 
                src={viewReceiptUrl} 
                alt="Receipt" 
                className="max-w-full mx-auto"
              />
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Breadcrumb pageName="Cash Handover" />

      <div className="flex flex-col bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-3 py-2 rounded-t-lg shadow-sm">
          <div className="flex items-center justify-end">
            <div className="flex space-x-2">
              <button
                className="inline-flex items-center px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs"
                onClick={() => setShowAddForm(!showAddForm)}
              >
                {showAddForm ? <X className="w-3 h-3 mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                {showAddForm ? 'Cancel' : 'New Handover'}
              </button>
              <button className="inline-flex items-center px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md text-xs">
                <ArrowLeftRight className="w-3 h-3 mr-1" />
                View Reports
              </button>
            </div>
          </div>
        </header>

        <main className="p-3">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-3 text-xs">
              {error}
            </div>
          )}

          {showAddForm && (
            <div className="bg-white rounded-lg shadow mb-3 p-3">
              <h2 className="text-sm font-semibold mb-2">New Cash Handover</h2>
              <form onSubmit={handleSubmit} className="space-y-3">
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
                    <label className="block text-xs font-medium text-gray-700 mb-1 focus">Handed Over To <RequiredAsterisk /></label>
                    <select
                      name="handedOverTo"
                      value={formData.handedOverTo}
                      onChange={handleFormChange}
                      required
                      className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
                    >
                      <option value="">Select Admin</option>
                      {admins.map(admin => (
                        <option key={admin.id} value={admin.faculty_name}>
                          {admin.faculty_name}
                        </option>
                      ))}
                    </select>
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
                    <h3 className="text-xs font-medium mb-1">Select Payments to Handover</h3>

                    {loading ? (
                      <div className="text-gray-500 p-2 bg-gray-50 rounded-md text-xs">Loading payments...</div>
                    ) : Object.keys(paymentsByStudent).length === 0 ? (
                      <div className="text-gray-500 p-2 bg-gray-50 rounded-md text-xs">
                        No payments found for {formData.receivedBy}
                      </div>
                    ) : (
                      <div className="border border-gray-200 rounded-md overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200 text-xs">
                          <thead className="bg-gray-50">
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
                            {Object.values(paymentsByStudent).map(({ student, payments }) =>
                              payments.map((payment) => {
                                const isSelected = selectedPayments.some(p => p.id === payment.id);
                                const selectedPayment = selectedPayments.find(p => p.id === payment.id);
                                
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
      className="border border-gray-300 rounded-md px-2 py-1 text-xs w-20"
    />
  )}
</td>
                                    <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-500">{student.course?.courseName || '-'}</td>
                                    <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-500">
                                      {payment.receiptUrl && (
                                        <button 
                                        onClick={() => setViewReceiptUrl(payment.receiptUrl ?? null)}

                                          className="text-blue-600 hover:text-blue-800"
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
                      </div>
                    )}

                    {selectedPayments.length > 0 && (
                      <div className="mt-2 bg-blue-50 p-2 rounded-md">
                        <h4 className="text-xs font-medium text-blue-800 mb-1">Summary of Selected Payments</h4>
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
                        onClick={() => setShowAddForm(false)}
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

          <div className="bg-white rounded-lg shadow mb-3 p-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex space-x-1">
                <button
                  onClick={() => setSelectedTab('all')}
                  className={`px-2 py-1 rounded-md text-xs ${selectedTab === 'all' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setSelectedTab('verified')}
                  className={`px-2 py-1 rounded-md text-xs ${selectedTab === 'verified' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}
                >
                  <Check className="w-3 h-3 inline mr-1 text-green-700" />
                  Verified
                </button>
                <button
                  onClick={() => setSelectedTab('unverified')}
                  className={`px-2 py-1 rounded-md text-xs ${selectedTab === 'unverified' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'}`}
                >
                  <X className="w-3 h-3 inline mr-1 text-red-600" />
                  Unverified
                </button>
              </div>
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2 top-1.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by student or staff..."
                  className="pl-6 pr-2 py-1 border border-gray-300 rounded-md w-48 text-xs"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

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
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50">
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
                    {filteredHandovers.map(handover => (
                      <tr key={handover.id} className="hover:bg-gray-50">
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
  >
    <Eye className="h-3 w-3" />
  </button>
)}

                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white rounded-lg shadow p-3">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-100 rounded-md p-1.5">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-500">Total Handover Amount</p>
                  <p className="text-sm font-semibold text-gray-900">
                    ₹{cashHandovers.reduce((sum, h) => sum + h.amount, 0).toLocaleString('en-US')}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-3">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-100 rounded-md p-1.5">
                  <Check className="h-4 w-4 text-green-600" />
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-500">Verified Handovers</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {cashHandovers.filter(h => h.verified).length} / {cashHandovers.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-3">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-yellow-100 rounded-md p-1.5">
                  <X className="h-4 w-4 text-yellow-600" />
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-500">Unverified Handovers</p>
                  <p className="text-sm font-semibold text-gray-900">{cashHandovers.filter(h => !h.verified).length}</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Receipt Viewer Modal */}
      {viewReceiptUrl && <ReceiptModal />}
    </>
  );
};

export default CashHandover;