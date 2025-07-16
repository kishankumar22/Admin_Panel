import React, { useState, useEffect, useRef } from 'react';
import Breadcrumb from '../components/Breadcrumbs/Breadcrumb';
import { FaSearch, FaTimes, FaMoneyBillWave, FaEdit, FaToggleOn, FaToggleOff, FaUpload, FaTrash, FaChevronLeft, FaChevronRight, FaEye, FaSpinner } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../config';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ExpensePayment from './ExpensePayment';
import DocumentViewerModal from './DocumentViewerModal';
import { useLocation } from 'react-router-dom';
import { usePermissions } from '../context/PermissionsContext';
import { FileSearch } from 'lucide-react';

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
  SuppliersExpenseID: number;
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
  const [selectedSupplier, setSelectedSupplier] = useState<{
    SuppliersExpenseID: number; SupplierId: number; SupplierName: string; Amount: number 
  } | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isDeleting, setIsDeleting] = useState<{ [key: string]: boolean }>({});
  const [viewDocument, setViewDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dataFetched, setDataFetched] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<'All' | 'Paid' | 'Unpaid'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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
  const {
    fetchRoles,
    fetchPages,
    fetchPermissions,
    pages,
    permissions,
  } = usePermissions();

  useEffect(() => {
    const fetchData = async () => {
      await fetchRoles();
      await fetchPages();
      await fetchPermissions();
    };
    fetchData();
  }, []);

  const location = useLocation();
  const currentPageName = location.pathname.split('/').pop();
  const prefixedPageUrl = `/${currentPageName}`;
  const pageId = pages.find((page: { pageUrl: string; }) => page.pageUrl === prefixedPageUrl)?.pageId;
  const userPermissions = permissions.find((perm: { pageId: any; roleId: number | undefined; }) => perm.pageId === pageId && perm.roleId === user?.roleId);
  const loggedroleId = user?.roleId;
  const defaultPermission = loggedroleId === 2;
  const canCreate = userPermissions?.canCreate ?? defaultPermission;
  const canUpdate = userPermissions?.canUpdate ?? defaultPermission;
  const canDelete = userPermissions?.canDelete ?? defaultPermission;
  const canRead = userPermissions?.canRead ?? defaultPermission;

  useEffect(() => {
    const today = new Date();
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    setToDate(formatDate(today));
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const suppliersResponse = await axiosInstance.get('/suppliers');
        setSuppliers(suppliersResponse.data);

        const expensesResponse = await axiosInstance.get('/expenses');
        const expensesWithPending = await Promise.all(
          expensesResponse.data.map(async (expense: Expense) => {
            try {
              const paymentResponse = await axiosInstance.get(`/expense/${expense.SupplierId}/payments`, {
                params: { suppliersExpenseID: expense.SuppliersExpenseID },
              });
              const totalPaid = paymentResponse.data.reduce((sum: number, payment: any) => sum + payment.PaidAmount, 0);
              return { ...expense, PendingAmount: expense.Amount - totalPaid };
            } catch (error) {
              console.error(`Error fetching payments for expense ${expense.SuppliersExpenseID}:`, error);
              return { ...expense, PendingAmount: expense.Amount };
            }
          })
        );
        setExpenses(expensesWithPending);
        setFilteredExpenses(expensesWithPending);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data');
        toast.error('Failed to load data');
      } finally {
        setDataFetched(true);
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (expenses.length === 0) return;

    setIsLoading(true);
    let filtered = [...expenses];

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

    if (paymentStatus !== 'All') {
      filtered = filtered.filter((expense) => {
        const pendingAmount = expense.PendingAmount || 0;
        if (paymentStatus === 'Paid') {
          return pendingAmount <= 0;
        } else if (paymentStatus === 'Unpaid') {
          return pendingAmount > 0;
        }
        return true;
      });
    }

    if (statusFilter !== 'All') {
      filtered = filtered.filter((expense) => {
        if (statusFilter === 'Active') {
          return !expense.Deleted;
        } else if (statusFilter === 'Inactive') {
          return expense.Deleted;
        }
        return true;
      });
    }

    setFilteredExpenses(filtered);
    setCurrentPage(1);
    setTimeout(() => setIsLoading(false), 100);
  }, [searchTerm, fromDate, toDate, paymentStatus, statusFilter, expenses]);

  useEffect(() => {
    if (modalMode === 'edit' && editingExpense) {
      const fetchDocuments = async () => {
        setIsLoading(true);
        try {
          const response = await axiosInstance.get(`/expenses/${editingExpense.SuppliersExpenseID}/documents`);
          setDocuments(response.data);
        } catch (error) {
          console.error('Error fetching documents:', error);
          toast.error('Failed to fetch documents', {
            position: 'top-right',
            autoClose: 1000,
          });
        } finally {
          setIsLoading(false);
        }
      };
      fetchDocuments();
    } else {
      setDocuments([]);
    }
  }, [modalMode, editingExpense]);

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRowsPerPage = parseInt(e.target.value);
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1);
  };

  const indexOfLastExpense = currentPage * rowsPerPage;
  const indexOfFirstExpense = indexOfLastExpense - rowsPerPage;
  const currentExpenses = filteredExpenses.slice(indexOfFirstExpense, indexOfLastExpense);
  const totalPages = Math.ceil(filteredExpenses.length / rowsPerPage);

  const activeFilteredExpenses = filteredExpenses.filter((expense) => !expense.Deleted);
  const displayExpenses = statusFilter === 'Inactive' ? filteredExpenses : activeFilteredExpenses;
  const totalDisplayExpenses = displayExpenses.length;
  const totalDisplayAmount = displayExpenses.reduce((sum, expense) => sum + expense.Amount, 0);
  const totalDisplayPendingAmount = displayExpenses.reduce((sum, expense) => sum + (expense.PendingAmount || 0), 0);

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
      const response = await axiosInstance.delete(`/documents/${encodeURIComponent(publicId)}`);
      setDocuments((prev) => prev.filter((doc) => doc.PublicId !== publicId));
      toast.success('Document deleted successfully', { position: 'top-right', autoClose: 1000 });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete document';
      toast.error(errorMessage, { position: 'top-right', autoClose: 1000 });
    } finally {
      setIsDeleting((prev) => ({ ...prev, [publicId]: false }));
    }
  };

  const handleViewDocument = (doc: Document) => {
    const fullUrl = doc.DocumentUrl.startsWith('/ExpenseDocs')
      ? `${axiosInstance.defaults.baseURL}/ExpenseDocs/${doc.PublicId}`
      : doc.DocumentUrl;
    setViewDocument({ ...doc, DocumentUrl: fullUrl });
  };

  const openEditModal = (expense: Expense) => {
    if (expense.Deleted) {
      toast.warning('Expense is inactive. Please activate to edit or make payment.', {
        position: 'top-right',
        autoClose: 1000,
      });
      return;
    }
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
    if (expense.Deleted) {
      toast.warning('Expense is inactive. Please activate to edit or make payment.', {
        position: 'top-right',
        autoClose: 1500,
      });
      return;
    }
    const supplier = suppliers.find((s) => s.SupplierId === expense.SupplierId);
    if (supplier) {
      setSelectedSupplier({
        SuppliersExpenseID: expense.SuppliersExpenseID,
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
            const paymentResponse = await axiosInstance.get(`/expense/${expense.SupplierId}/payments`, {
              params: { suppliersExpenseID: expense.SuppliersExpenseID },
            });
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
      toast.error(errorMessage, { position: 'top-right', autoClose: 1500 });
    }
  };

  const handleToggleDeleted = async (expense: Expense) => {
    try {
      const response = await axiosInstance.patch(`/expenses/${expense.SuppliersExpenseID}/toggle`, {
        ModifiedBy: createdBy,
      });
      toast.success(response.data.message);
      const expensesResponse = await axiosInstance.get('/expenses');
      const expensesWithPending = await Promise.all(
        expensesResponse.data.map(async (expense: Expense) => {
          try {
            const paymentResponse = await axiosInstance.get(`/expense/${expense.SupplierId}/payments`, {
              params: { suppliersExpenseID: expense.SuppliersExpenseID },
            });
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
      toast.error(errorMessage, { position: 'top-right', autoClose: 1500 });
    }
  };

  const handleExportToExcel = () => {
    if (filteredExpenses.length === 0) {
      toast.warning('No data to export to Excel');
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
      'Status': expense.Deleted ? 'Inactive' : 'Active',
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses');
    XLSX.writeFile(workbook, 'Expenses.xlsx');
    toast.success('Expenses exported to Excel successfully', { position: 'top-right', autoClose: 1500 });
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    const today = new Date();
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    setFromDate('');
    setToDate(formatDate(today));
    setPaymentStatus('All');
    setStatusFilter('All');
    if (searchInputRef.current) {
      searchInputRef.current.value = '';
      searchInputRef.current.blur();
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
            const paymentResponse = await axiosInstance.get(`/expense/${expense.SupplierId}/payments`, {
              params: { suppliersExpenseID: expense.SuppliersExpenseID },
            });
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
      toast.error('Failed to refresh expenses', { position: 'top-right', autoClose: 1500 });
    });
  };

  const pageNumbers = [];
  const maxPagesToShow = 5;
  const startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
  const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  const renderDocumentPreview = (doc: Document) => {
    const isLocal = doc.DocumentUrl.startsWith('/ExpenseDocs');
    const url = isLocal ? `${axiosInstance.defaults.baseURL}/ExpenseDocs/${doc.PublicId}` : doc.DocumentUrl;
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(doc.PublicId.split('.').pop()?.toLowerCase() || '');
    const isPdf = doc.PublicId.split('.').pop()?.toLowerCase() === 'pdf';

    return (
      <div className="flex items-center gap-1">
        {isImage ? (
          <img src={url} alt="Document" className="w-6 h-6 object-cover rounded" />
        ) : isPdf ? (
          <span className="text-blue-600">PDF</span>
        ) : (
          <span className="text-blue-600">File</span>
        )}
      </div>
    );
  };

  return (
    <>
      <Breadcrumb pageName="Manage Expenses" />
      <div className="p-1 bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
            <div className="flex items-center gap-1">
              <FaMoneyBillWave className="text-indigo-600 dark:text-indigo-400 w-3 h-3" />
              <span className="text-gray-600 dark:text-gray-400">Number of Expense:</span>
              <span className="font-semibold text-indigo-700 dark:text-indigo-400">
                {isLoading ? '...' : totalDisplayExpenses}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-600 dark:text-gray-400">Total Expense Amount:</span>
              <span className="font-semibold text-green-700 dark:text-green-400">
                {isLoading ? '...' : `₹${totalDisplayAmount.toLocaleString()}`}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-600 dark:text-gray-400">Total Expense Pending:</span>
              <span className="font-semibold text-red-600 dark:text-red-400">
                {isLoading ? '...' : `₹${totalDisplayPendingAmount.toLocaleString()}`}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5">
            <div className="relative w-full sm:w-44">
              <FaSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                ref={searchInputRef}
                className="w-full pl-6 pr-2 py-1 text-xs rounded-md border border-gray-300 dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-1">
              <span className="text-gray-600 dark:text-gray-400">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-24 p-1 text-xs rounded border border-gray-300 dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-600 dark:text-gray-400">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-24 p-1 text-xs rounded border border-gray-300 dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as 'All' | 'Paid' | 'Unpaid')}
              className="w-20 p-1 text-xs rounded border border-gray-300 dark:border-gray-600 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="All">All</option>
              <option value="Paid">Paid</option>
              <option value="Unpaid">Unpaid</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'All' | 'Active' | 'Inactive')}
              className="w-20 p-1 text-xs rounded border border-gray-300 dark:border-gray-600 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="All">All</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            <button
              onClick={handleClearFilters}
              className="p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded focus:outline-none"
              title="Clear Filters"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button
              onClick={
                canCreate
                  ? () => {
                      setModalMode('add');
                      setIsModalOpen(true);
                    }
                  : () => toast.error('Access Denied: You do not have permission to add Expenses.')
              }
              className={`px-2 py-1 text-xs font-medium rounded text-white transition-colors ${
                canCreate
                  ? 'bg-indigo-600 hover:bg-indigo-700 focus:ring-1 focus:ring-indigo-500'
                  : 'bg-indigo-600 opacity-50 cursor-not-allowed'
              }`}
              type='button'
            >
              + Add
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-row items-center justify-between p-2 bg-white my-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-600 dark:text-gray-400">Rows per page:</span>
          <select
            value={rowsPerPage}
            onChange={handleRowsPerPageChange}
            className="p-1 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={75}>75</option>
            <option value={100}>100</option>
          </select>
        </div>
        <button
          onClick={handleExportToExcel}
          className="flex items-center gap-1 px-2 py-1 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors focus:outline-none focus:ring-1 focus:ring-green-500"
        >
          <span>Export to Excel</span>
        </button>
      </div>

      <div className="mt-2">
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] bg-gray-50 dark:bg-gray-800">
              <FaSpinner className="animate-spin h-8 w-8 text-indigo-600 mb-3" />
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Loading expenses...</p>
            </div>
          ) : (
            <>
              <table className="min-w-full text-xs bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-indigo-600 dark:bg-indigo-700 text-white">
                  <tr>
                    {['Sr.', 'Supplier', 'Phone', 'Reason', 'Amount', 'Pending', 'Created On', 'Created By', 'Status', 'Action'].map((title) => (
                      <th 
                        key={title} 
                        className={`px-2 py-2 text-left font-medium whitespace-nowrap ${
                          title === 'Amount' || title === 'Pending' ? 'text-right' : 'text-left'
                        }`}
                      >
                        {title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {dataFetched && currentExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <FileSearch className="h-8 w-8 text-gray-400 mb-2" />
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No Expense records found</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Try adjusting your filters or check back later
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    currentExpenses.map((expense, index) => (
                      <tr
                        key={expense.SuppliersExpenseID}
                        className={`${
                          expense.Deleted
                            ? 'bg-gray-50 dark:bg-gray-800 opacity-80'
                            : index % 2 === 0
                            ? 'bg-gray-50 dark:bg-gray-800'
                            : 'bg-white dark:bg-gray-900'
                        } hover:bg-indigo-50 dark:hover:bg-gray-700 transition-colors`}
                      >
                        <td className="px-2 py-2 text-gray-700 dark:text-gray-300">
                          {indexOfFirstExpense + index + 1}
                        </td>
                        <td className="px-2 py-2 text-gray-700 dark:text-gray-300 font-medium">
                          {expense.SupplierName}
                        </td>
                        <td className="px-2 py-2 text-gray-600 dark:text-gray-400">
                          {expense.SupplierPhone}
                        </td>
                        <td className="px-2 py-2 text-gray-700 dark:text-gray-300 max-w-[120px] truncate" title={expense.Reason}>
                          {expense.Reason}
                        </td>
                        <td className="px-2 py-2 text-right font-medium text-green-600 dark:text-green-400">
                          ₹{expense.Amount.toFixed(2)}
                        </td>
                        <td className="px-2 py-2 text-right font-medium text-red-600 dark:text-red-400">
                          ₹{(expense.PendingAmount || 0).toFixed(2)}
                        </td>
                        <td className="px-2 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {new Date(expense.CreatedOn).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-2 py-2 text-gray-600 dark:text-gray-400">
                          {expense.CreatedBy}
                        </td>
                        <td className="px-2 py-2">
                          <span
                            className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                              expense.Deleted
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            }`}
                          >
                            {expense.Deleted ? 'Inactive' : 'Active'}
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex gap-1">
                            <button
                              onClick={
                                canUpdate && !expense.Deleted
                                  ? () => openPaymentModal(expense)
                                  : () => toast.error('Access Denied: You do not have permission to make payments or expense is deleted.')
                              }
                              className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                                canUpdate && !expense.Deleted
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                  : 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed opacity-50'
                              }`}
                              title="Make Payment"
                              type='button'
                            >
                              <FaMoneyBillWave className="w-3 h-3 mr-1" />
                              Pay
                            </button>
                            <button
                              onClick={
                                canRead && !expense.Deleted
                                  ? () => openEditModal(expense)
                                  : () => toast.error('Access Denied: You do not have permission to edit expenses or expense is deleted.')
                              }
                              className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                                canRead && !expense.Deleted
                                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                  : 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed opacity-50'
                              }`}
                              title="Edit Expense"
                              type='button'
                            >
                              <FaEdit className="w-3 h-3 mr-1" />
                              Edit
                            </button>
                            <button
                              onClick={
                                canDelete
                                  ? () => handleToggleDeleted(expense)
                                  : () => toast.error('Access Denied: You do not have permission to toggle expense status.')
                              }
                              className={`inline-flex items-center px-2 py-1 rounded text-xs text-white ${
                                canDelete
                                  ? expense.Deleted
                                    ? 'bg-green-600 hover:bg-green-700'
                                    : 'bg-red-600 hover:bg-red-700'
                                  : expense.Deleted
                                  ? 'bg-green-600 opacity-50 cursor-not-allowed'
                                  : 'bg-red-600 opacity-50 cursor-not-allowed'
                              }`}
                              title={expense.Deleted ? 'Activate' : 'Deactivate'}
                              type='button'
                            >
                              {expense.Deleted ? (
                                <>
                                  <FaToggleOff className="w-3 h-3 mr-1" />
                                  Active
                                </>
                              ) : (
                                <>
                                  <FaToggleOn className="w-3 h-3 mr-1" />
                                  Inactive
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-2 sm:mb-0">
                  Showing {indexOfFirstExpense + 1} to{' '}
                  {Math.min(indexOfLastExpense, filteredExpenses.length)} of{' '}
                  {filteredExpenses.length} expenses
                </div>
                <nav className="flex items-center space-x-1">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-md text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition"
                  >
                    <FaChevronLeft className="w-3 h-3" />
                  </button>
                  {startPage > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentPage(1)}
                        className="px-2.5 py-1 text-xs rounded-md text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                      >
                        1
                      </button>
                      {startPage > 2 && (
                        <span className="px-1 text-xs text-gray-500">...</span>
                      )}
                    </>
                  )}
                  {pageNumbers.map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-2.5 py-1 text-xs rounded-md transition ${
                        currentPage === page
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  {endPage < totalPages && (
                    <>
                      {endPage < totalPages - 1 && (
                        <span className="px-1 text-xs text-gray-500">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        className="px-2.5 py-1 text-xs rounded-md text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-md text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition"
                  >
                    <FaChevronRight className="w-3 h-3" />
                  </button>
                </nav>
              </div>
            </>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-4 w-full max-w-md">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-800 flex items-center">
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-sky-500 text-white mr-2">
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
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-sky-500 focus:border-blue-500 bg-white"
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
                      accept="*/*" // Allow all file types
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
                          {doc.PublicId.split('/').pop() || 'Document'}
                        </span>
                        {renderDocumentPreview(doc)}
                        <button
                          type="button"
                          onClick={() => handleViewDocument(doc)}
                          className="text-blue-500 hover:text-blue-700 transition duration-150 flex-shrink-0 mr-2"
                          title="View Document"
                        >
                          <FaEye className="w-4 h-4 ml-2" />
                        </button>
                       <button
  type="button"
  onClick={() => setConfirmDeleteId(doc.PublicId)}
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
                        <img src={fileObj.preview} alt="Preview" className="w-6 h-6 object-cover rounded" />
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
                  className="px-3 py-1.5 text-xs font-medium text-black rounded-md bg-blue-300 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {modalMode === 'add' ? 'Save' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
{confirmDeleteId && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
    <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm text-center">
      <p className="mb-4 text-gray-800">Are you sure you want to delete this document?</p>
      <div className="flex justify-center gap-4">
        <button
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          onClick={() => {
            handleDeleteDocument(confirmDeleteId);
            setConfirmDeleteId(null);
          }}
        >
          Yes, Delete
        </button>
        <button
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
          onClick={() => setConfirmDeleteId(null)}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}

      {isPaymentModalOpen && selectedSupplier && (
        <ExpensePayment
          expense={{
            SupplierId: selectedSupplier.SupplierId,
            SupplierName: selectedSupplier.SupplierName,
            Amount: selectedSupplier.Amount,
            SuppliersExpenseID: selectedSupplier.SuppliersExpenseID,
          }}
          onClose={closePaymentModal}
          onSuccess={() => {
            closePaymentModal();
            toast.success('Payment processed successfully', { position: 'top-right', autoClose: 2000 });
          }}
          createdBy={createdBy}
          searchInputRef={searchInputRef}
        />
      )}

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