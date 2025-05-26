import React, { useState, useEffect, useRef } from 'react';
import Breadcrumb from '../components/Breadcrumbs/Breadcrumb';
import { FaSearch, FaTimes, FaMoneyBillWave, FaEdit, FaToggleOn, FaToggleOff, FaUpload, FaTrash, FaChevronLeft, FaChevronRight, FaEye, FaSpinner } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../config';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ExpensePayment from './ExpensePayment';
import { FileSearch } from 'lucide-react';
import DocumentViewerModal from './DocumentViewerModal';

export const RequiredAsterisk = () => <span className="text-red-500">*</span>;

interface Supplier {
  SupplierId: number;
  Name: string;
  Amount: number;
}

interface Document {
  DocumentId: number;
  SupplierId: number;
  DocumentUrl: string;
  PublicId: string;
  CreatedOn: string;
  DocumentType: string;
}

interface Expense {
  SuppliersExpenseID: number;
  SupplierId: number;
  SupplierName: string;
  SupplierEmail: string;
  SupplierPhone: string;
  Reason: string;
  Amount: number;
  Deleted: boolean;
  CreatedOn: string;
  CreatedBy: string;
  ModifiedBy: string | null;
  ModifiedOn: string | null;
  PendingAmount?: number;
}

interface FileWithPreview {
  file: File;
  preview: string;
}

const ManageExpense: React.FC = () => {
  const { user } = useAuth();
  const createdBy = user?.name || 'admin';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<{ SupplierId: number; SupplierName: string; Amount: number } | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isDeleting, setIsDeleting] = useState<{ [key: string]: boolean }>({});
  const [viewDocument, setViewDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Added for loader
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [formData, setFormData] = useState({
    SupplierId: '',
    Reason: '',
    Amount: '',
  });
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Set default date range (To: today, From: one month ago)
  useEffect(() => {
    const today = new Date();
    // const oneMonthAgo = new Date(today);
    // oneMonthAgo.setMonth(today.getMonth() - 1);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    setToDate(formatDate(today));
    // setFromDate(formatDate(oneMonthAgo));
  }, []);

  // Fetch suppliers and expenses with pending amounts
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const response = await axiosInstance.get('/suppliers');
        setSuppliers(response.data);
      } catch (err) {
        console.error('Error fetching suppliers:', err);
        setError('Failed to load suppliers');
        toast.error('Failed to load suppliers');
      }
    };

    const fetchExpenses = async () => {
      setIsLoading(true); // Show loader
      try {
        const response = await axiosInstance.get('/expenses');
        const expensesWithPending = await Promise.all(
          response.data.map(async (expense: Expense) => {
            try {
              const paymentResponse = await axiosInstance.get(`/expense/${expense.SupplierId}/payments`);
              const totalPaid = paymentResponse.data.reduce((sum: number, payment: any) => sum + payment.PaidAmount, 0);
              return { ...expense, PendingAmount: expense.Amount - totalPaid };
            } catch (error) {
              console.error(`Error fetching payments for supplier ${expense.SupplierId}:`, error);
              return { ...expense, PendingAmount: expense.Amount };
            }
          })
        );
        setExpenses(expensesWithPending);
        setFilteredExpenses(expensesWithPending);
      } catch (err) {
        console.error('Error fetching expenses:', err);
        setError('Failed to load expenses');
        toast.error('Failed to load expenses');
      } finally {
        setIsLoading(false); // Hide loader
      }
    };

    fetchSuppliers();
    fetchExpenses();
  }, []);

  // Handle search, date range, and status filtering
  useEffect(() => {
    setIsLoading(true); // Show loader when filters change
    let filtered = expenses;

    if (searchTerm) {
      filtered = filtered.filter((expense) =>
        [expense.SupplierName, expense.SupplierEmail, expense.SupplierPhone]
          .some((field) => field?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (fromDate || toDate) {
      filtered = filtered.filter((expense) => {
        const createdOnDate = new Date(expense.CreatedOn).getTime();
        const from = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : -Infinity;
        const to = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : Infinity;
        return createdOnDate >= from && createdOnDate <= to;
      });
    }

    if (statusFilter !== 'All') {
      filtered = filtered.filter((expense) => {
        const pendingAmount = expense.PendingAmount || 0;
        if (statusFilter === 'Paid') {
          return pendingAmount <= 0;
        } else if (statusFilter === 'Unpaid') {
          return pendingAmount > 0;
        }
        return true;
      });
    }

    setFilteredExpenses(filtered);
    setCurrentPage(1);
    setTimeout(() => setIsLoading(false), 500); // Simulate slight delay for loader
  }, [searchTerm, fromDate, toDate, statusFilter, expenses]);

  // Fetch documents when editing an expense
  useEffect(() => {
    if (modalMode === 'edit' && editingExpense) {
      const fetchDocuments = async () => {
        try {
          const response = await axiosInstance.get(`/supplier/${editingExpense.SupplierId}/documents`, {
            params: { documentType: 'ExpenseDocument' },
          });
          setDocuments(response.data);
        } catch (error) {
          console.error('Error fetching documents:', error);
          toast.error('Failed to fetch documents', { position: 'top-right', autoClose: 3000 });
        }
      };
      fetchDocuments();
    } else {
      setDocuments([]);
    }
  }, [modalMode, editingExpense]);

  // Handle rows per page change
  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRowsPerPage = parseInt(e.target.value);
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1);
  };

  const totalFilteredAmount = filteredExpenses.reduce((sum, expense) => sum + expense.Amount, 0);
  const totalFilteredPendingAmount = filteredExpenses.reduce((sum, expense) => sum + (expense.PendingAmount || 0), 0);
  const indexOfLastExpense = currentPage * rowsPerPage;
  const indexOfFirstExpense = indexOfLastExpense - rowsPerPage;
  const currentExpenses = filteredExpenses.slice(indexOfFirstExpense, indexOfLastExpense);
  const totalPages = Math.ceil(filteredExpenses.length / rowsPerPage);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));
      setFiles((prev) => [...prev, ...selectedFiles]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const updatedFiles = prev.filter((_, i) => i !== index);
      URL.revokeObjectURL(prev[index].preview);
      return updatedFiles;
    });
  };

  const handleDeleteDocument = async (publicId: string) => {
    setIsDeleting((prev) => ({ ...prev, [publicId]: true }));
    try {
      const response = await axiosInstance.delete(`/documents/${publicId}`);
      setDocuments((prev) => prev.filter((doc) => doc.PublicId !== publicId));
      toast.success('Document deleted successfully', { position: 'top-right', autoClose: 3000 });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete document';
      toast.error(errorMessage, { position: 'top-right', autoClose: 3000 });
    } finally {
      setIsDeleting((prev) => ({ ...prev, [publicId]: false }));
    }
  };

  const handleViewDocument = (doc: Document) => {
    setViewDocument(doc);
  };

  const openEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setModalMode('edit');
    setFormData({
      SupplierId: expense.SupplierId.toString(),
      Reason: expense.Reason,
      Amount: expense.Amount.toString(),
    });
    setFiles([]);
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  };

  const openPaymentModal = (expense: Expense) => {
    const supplier = suppliers.find((s) => s.SupplierId === expense.SupplierId);
    if (supplier) {
      setSelectedSupplier({
        SupplierId: supplier.SupplierId,
        SupplierName: supplier.Name,
        Amount: expense.Amount,
      });
      setIsPaymentModalOpen(true);
    } else {
      toast.error('Supplier not found');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.SupplierId || !formData.Reason || !formData.Amount) {
      setError('Please fill all required fields');
      return;
    }

    if (parseFloat(formData.Amount) <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('SupplierId', formData.SupplierId);
      formDataToSend.append('Reason', formData.Reason);
      formDataToSend.append('Amount', formData.Amount);
      const userName = createdBy;

      if (modalMode === 'add') {
        formDataToSend.append('CreatedBy', userName);
      } else {
        formDataToSend.append('ModifiedBy', userName);
      }

      files.forEach((fileObj) => {
        formDataToSend.append('files', fileObj.file);
      });

      const url = modalMode === 'add' ? '/expenses' : `/expenses/${editingExpense?.SuppliersExpenseID}`;
      const method = modalMode === 'add' ? 'post' : 'put';

      const response = await axiosInstance[method](url, formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success(response.data.message, { position: 'top-right', autoClose: 2000 });
      setFormData({ SupplierId: '', Reason: '', Amount: '' });
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setIsModalOpen(false);
      setEditingExpense(null);
      setModalMode('add');
      setDocuments([]);

      const expensesResponse = await axiosInstance.get('/expenses');
      const expensesWithPending = await Promise.all(
        expensesResponse.data.map(async (expense: Expense) => {
          try {
            const paymentResponse = await axiosInstance.get(`/expense/${expense.SupplierId}/payments`);
            const totalPaid = paymentResponse.data.reduce((sum: number, payment: any) => sum + payment.PaidAmount, 0);
            return { ...expense, PendingAmount: expense.Amount - totalPaid };
          } catch (error) {
            return { ...expense, PendingAmount: expense.Amount };
          }
        })
      );
      setExpenses(expensesWithPending);
      setFilteredExpenses(expensesWithPending);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || `Failed to ${modalMode === 'add' ? 'add' : 'update'} expense`;
      setError(errorMessage);
      toast.error(errorMessage, { position: 'top-right', autoClose: 2000 });
    }
  };

  const handleToggleDeleted = async (expense: Expense) => {
    try {
      const response = await axiosInstance.patch(`/expenses/${expense.SuppliersExpenseID}/toggle`, {
        ModifiedBy: createdBy,
      });
      toast.success(response.data.message, { position: 'top-right', autoClose: 2000 });

      const expensesResponse = await axiosInstance.get('/expenses');
      const expensesWithPending = await Promise.all(
        expensesResponse.data.map(async (expense: Expense) => {
          try {
            const paymentResponse = await axiosInstance.get(`/expense/${expense.SupplierId}/payments`);
            const totalPaid = paymentResponse.data.reduce((sum: number, payment: any) => sum + payment.PaidAmount, 0);
            return { ...expense, PendingAmount: expense.Amount - totalPaid };
          } catch (error) {
            return { ...expense, PendingAmount: expense.Amount };
          }
        })
      );
      setExpenses(expensesWithPending);
      setFilteredExpenses(expensesWithPending);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to toggle expense';
      toast.error(errorMessage, { position: 'top-right', autoClose: 2000 });
    }
  };

  const handleExportToExcel = () => {
    if (filteredExpenses.length === 0) {
      toast.warning('No data to export');
      return;
    }
    const worksheetData = filteredExpenses.map((expense) => ({
      'Supplier Name': expense.SupplierName,
      'Email': expense.SupplierEmail,
      'Phone': expense.SupplierPhone,
      'Reason': expense.Reason,
      'Amount (₹)': expense.Amount.toFixed(2),
      'Pending Amount (₹)': (expense.PendingAmount || 0).toFixed(2),
      'Created On': new Date(expense.CreatedOn).toLocaleDateString(),
      'Created By': expense.CreatedBy,
      'Status': expense.Deleted ? 'InActive' : 'Active',
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses');
    XLSX.writeFile(workbook, 'Expenses.xlsx');
    toast.success('Expenses exported to Excel successfully', { position: 'top-right', autoClose: 2000 });
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    const today = new Date();
    const oneMonthAgo = new Date(today);
    oneMonthAgo.setMonth(today.getMonth() - 1);
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    setFromDate(formatDate(oneMonthAgo));
    setToDate(formatDate(today));
    setStatusFilter('All');
    if (searchInputRef.current) {
      searchInputRef.current.value = '';
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({ SupplierId: '', Reason: '', Amount: '' });
    setFiles([]);
    setError(null);
    setSuccess(null);
    setEditingExpense(null);
    setModalMode('add');
    setDocuments([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const closePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setSelectedSupplier(null);
    axiosInstance.get('/expenses').then(async (response) => {
      const expensesWithPending = await Promise.all(
        response.data.map(async (expense: Expense) => {
          try {
            const paymentResponse = await axiosInstance.get(`/expense/${expense.SupplierId}/payments`);
            const totalPaid = paymentResponse.data.reduce((sum: number, payment: any) => sum + payment.PaidAmount, 0);
            return { ...expense, PendingAmount: expense.Amount - totalPaid };
          } catch (error) {
            return { ...expense, PendingAmount: expense.Amount };
          }
        })
      );
      setExpenses(expensesWithPending);
      setFilteredExpenses(expensesWithPending);
    }).catch((err) => {
      toast.error('Failed to refresh expenses', { position: 'top-right', autoClose: 2000 });
    });
  };

  const pageNumbers = [];
  const maxPagesToShow = 5;
  const startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
  const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <>
      <Breadcrumb pageName="Manage Expenses" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 mb-3 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center gap-4 mb-2 sm:mb-0">
          <span className="text-sm font-medium">Expenses: <span className="text-indigo-700">{filteredExpenses.length}</span></span>
          <span className="text-sm font-medium">Total Amount: <span className="text-indigo-700">₹{totalFilteredAmount.toLocaleString('en-IN')}</span></span>
          <span className="text-sm font-medium">Pending Amount: <span className="text-red-700">₹{totalFilteredPendingAmount.toLocaleString('en-IN')}</span></span>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <FaSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs" />
            <input
              type="text"
              placeholder="Search by Name, Email, or"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-7 pr-2 py-1 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-600">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-28 p-1 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-600">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-28 p-1 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-600">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-20 p-1 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="All">All</option>
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
              </select>
            </div>
            <button
              onClick={handleClearFilters}
              className="p-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors focus:outline-none"
              title="Clear Filters"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setModalMode('add');
                setIsModalOpen(true);
              }}
              className="px-2 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700"
            >
              Add Expense
            </button>
            <button
              onClick={handleExportToExcel}
              className="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
            >
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-3 mb-4">
        <h3 className="text-base font-semibold text-gray-800 mb-2 flex items-center">
          <FaMoneyBillWave className="text-purple-500 w-4 h-4 mr-1.5" />
          Expenses List
        </h3>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] bg-gray-50 border-t border-gray-200">
            <FaSpinner className="animate-spin h-8 w-8 text-indigo-600 mb-3" />
            <p className="text-sm font-medium text-gray-600">Loading expenses...</p>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] bg-gray-50 border-t border-gray-200">
            <div className="mb-3">
              <FileSearch className="h-8 w-8 text-gray-400 animate-pulse" />
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">No Expense found</p>
            <p className="text-xs text-gray-400 text-center px-4">
              Try adjusting your filters or check back later
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-gray-700 border-collapse">
                <thead className="text-xs uppercase bg-gray-400 text-white">
                  <tr>
                    <th className="px-3 py-2 rounded-tl-md">Supplier Name</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Phone</th>
                    <th className="px-3 py-2">Reason</th>
                    <th className="px-3 py-2">Amount (₹)</th>
                    <th className="px-3 py-2">Pending Amount (₹)</th>
                    <th className="px-3 py-2">Created On</th>
                    <th className="px-3 py-2">Created By</th>
                    <th className="px-3 py-2 rounded-tr-md">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentExpenses.map((expense, index) => (
                    <tr
                      key={expense.SuppliersExpenseID}
                      className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
                    >
                      <td className="px-3 py-1.5">{expense.SupplierName}</td>
                      <td className="px-3 py-1.5">{expense.SupplierEmail}</td>
                      <td className="px-3 py-1.5">{expense.SupplierPhone}</td>
                      <td className="px-3 py-1.5">{expense.Reason}</td>
                      <td className="px-3 py-1.5 font-medium text-purple-700">₹{expense.Amount.toFixed(2)}</td>
                      <td className="px-3 py-1.5 font-medium text-red-700">₹{(expense.PendingAmount || 0).toFixed(2)}</td>
                      <td className="px-3 py-1.5">{new Date(expense.CreatedOn).toLocaleDateString()}</td>
                      <td className="px-3 py-1.5">{expense.CreatedBy}</td>
                      <td className="px-3 py-1.5 flex gap-1">
                        <button
                          onClick={() => openPaymentModal(expense)}
                          className="inline-flex items-center px-1.5 py-0.5 text-white bg-blue-500 rounded hover:bg-blue-600 transition text-[10px]"
                          title="Payment"
                        >
                          <FaMoneyBillWave className="w-2.5 h-2.5 mr-0.5" />
                          Pay
                        </button>
                        <button
                          onClick={() => openEditModal(expense)}
                          className="inline-flex items-center px-1.5 py-0.5 text-white bg-yellow-500 rounded hover:bg-yellow-600 transition text-[10px]"
                          title="Edit"
                        >
                          <FaEdit className="w-2.5 h-2.5 mr-0.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleDeleted(expense)}
                          className={`inline-flex items-center px-1.5 py-0.5 text-white rounded hover:opacity-90 transition text-[10px] ${expense.Deleted ? 'bg-green-500' : 'bg-red-500'}`}
                          title={expense.Deleted ? 'Restore' : 'Delete'}
                        >
                          {expense.Deleted ? (
                            <FaToggleOff className="w-2.5 h-2.5 mr-0.5" />
                          ) : (
                            <FaToggleOn className="w-2.5 h-2.5 mr-0.5" />
                          )}
                          {expense.Deleted ? 'Active' : 'Deactive'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-4 px-3">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span>
                  Showing {indexOfFirstExpense + 1} to{' '}
                  {Math.min(indexOfLastExpense, filteredExpenses.length)} of{' '}
                  {filteredExpenses.length} expenses
                </span>
                <div className="flex items-center gap-1">
                  <span>Rows per page:</span>
                  <select
                    value={rowsPerPage}
                    onChange={handleRowsPerPageChange}
                    className="p-1 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
              <nav className="flex items-center space-x-1">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-full text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400 transition duration-150"
                >
                  <FaChevronLeft className="w-4 h-4" />
                </button>
                {startPage > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentPage(1)}
                      className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 transition duration-150"
                    >
                      1
                    </button>
                    {startPage > 2 && (
                      <span className="px-2 text-xs text-gray-600">...</span>
                    )}
                  </>
                )}
                {pageNumbers.map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition duration-150 ${
                      currentPage === page
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                {endPage < totalPages && (
                  <>
                    {endPage < totalPages - 1 && (
                      <span className="px-2 text-xs text-gray-600">...</span>
                    )}
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 transition duration-150"
                    >
                      {totalPages}
                    </button>
                  </>
                )}
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-full text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400 transition duration-150"
                >
                  <FaChevronRight className="w-4 h-4" />
                </button>
              </nav>
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-4 w-full max-w-md">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-800 flex items-center">
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white mr-2">
                  {modalMode === 'add' ? '+' : '✎'}
                </span>
                {modalMode === 'add' ? 'Add New Expense' : 'Update Expense'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1"
              >
                <FaTimes size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Supplier <RequiredAsterisk />
                </label>
                <select
                  name="SupplierId"
                  value={formData.SupplierId}
                  onChange={handleInputChange}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 bg-white"
                  required
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.SupplierId} value={supplier.SupplierId}>
                      {supplier.Name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Reason <RequiredAsterisk />
                </label>
                <textarea
                  name="Reason"
                  value={formData.Reason}
                  onChange={handleInputChange}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 bg-white"
                  rows={2}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Amount <RequiredAsterisk />
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-gray-500">₹</span>
                  <input
                    type="number"
                    name="Amount"
                    value={formData.Amount}
                    onChange={handleInputChange}
                    className="w-full pl-6 pr-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 bg-white"
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Upload Files
                  {(files.length > 0 || documents.length > 0) && (
                    <span className="ml-2 text-xs text-indigo-600">
                      ({files.length + documents.length}{' '}
                      {files.length + documents.length === 1 ? 'file' : 'files'})
                    </span>
                  )}
                </label>
                <div className="flex items-center space-x-2">
                  <label className="flex-1 flex items-center justify-center px-2.5 py-1.5 border border-gray-300 border-dashed rounded-md bg-gray-50 hover:bg-gray-100 cursor-pointer">
                    <FaUpload className="mr-1.5 text-gray-400" size={14} />
                    <span className="text-xs text-gray-500">Choose files</span>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      ref={fileInputRef}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {(files.length > 0 || documents.length > 0) && (
                <div className="bg-gray-50 p-2 rounded-md">
                  <h3 className="text-xs font-medium text-gray-700 mb-1.5">Files:</h3>
                  <ul className="space-y-1 max-h-24 overflow-y-auto">
                    {documents.map((doc, index) => (
                      <li
                        key={`doc-${doc.DocumentId}`}
                        className="flex items-center justify-between bg-white p-1.5 rounded-md border border-gray-200 text-xs"
                      >
                        <span className="truncate">{index + 1}. </span>
                        <span className="truncate flex-1">
                          {doc.DocumentUrl.split('/').pop() || 'Document'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleViewDocument(doc)}
                          className="text-blue-500 hover:text-blue-700 transition duration-150 flex-shrink-0 mr-2"
                          title="View Document"
                        >
                          <FaEye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDocument(doc.PublicId)}
                          disabled={isDeleting[doc.PublicId]}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 p-1 rounded-full disabled:opacity-50"
                        >
                          {isDeleting[doc.PublicId] ? (
                            <FaTimes className="animate-spin w-4 h-4" />
                          ) : (
                            <FaTrash size={12} />
                          )}
                        </button>
                      </li>
                    ))}
                    {files.map((fileObj, index) => (
                      <li
                        key={`file-${index}`}
                        className="flex items-center justify-between bg-white p-1.5 rounded-md border border-gray-200 text-xs"
                      >
                        <span className="truncate">{documents.length + index + 1}. </span>
                        <span className="truncate flex-1">{fileObj.file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 p-1 rounded-full"
                        >
                          <FaTrash size={12} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-2 rounded">
                  <p className="text-red-700 text-xs">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border-l-4 border-green-500 p-2 rounded">
                  <p className="text-green-700 text-xs">{success}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-medium text-white rounded-md bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  {modalMode === 'add' ? 'Save' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && selectedSupplier && (
        <ExpensePayment
          expense={selectedSupplier}
          onClose={closePaymentModal}
          onSuccess={() => {
            closePaymentModal();
            toast.success('Payment processed successfully', { position: 'top-right', autoClose: 2000 });
          }}
          createdBy={createdBy}
          searchInputRef={searchInputRef}
        />
      )}

      {/* Document Viewer Modal */}
      {viewDocument && (
        <DocumentViewerModal
          document={viewDocument}
          onClose={() => setViewDocument(null)}
        />
      )}
    </>
  );
};

export default ManageExpense;