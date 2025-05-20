import React, { useState, useEffect, useRef } from 'react';
import Breadcrumb from '../components/Breadcrumbs/Breadcrumb';
import { FaFileExcel, FaSearch, FaUserPlus, FaTimes, FaMoneyBillWave, FaEdit, FaToggleOn, FaToggleOff, FaUpload, FaTrash, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../config';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ExpensePayment from './ExpensePayment';
import { FileSearch } from 'lucide-react';

export const RequiredAsterisk = () => <span className="text-red-500">*</span>;

interface Supplier {
  SupplierId: number;
  Name: string;
  Amount: number;
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
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState<string>(''); // State for from date
  const [toDate, setToDate] = useState<string>(''); // State for to date
  const [currentPage, setCurrentPage] = useState(1); // State for pagination
  const [rowsPerPage] = useState(10); // Number of rows per page
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

  // Fetch suppliers and expenses on component mount
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const response = await axiosInstance.get('/suppliers');
        console.log('Fetched suppliers:', response.data);
        setSuppliers(response.data);
      } catch (err) {
        console.error('Error fetching suppliers:', err);
        setError('Failed to load suppliers');
        toast.error('Failed to load suppliers');
      }
    };

    const fetchExpenses = async () => {
      try {
        const response = await axiosInstance.get('/expenses');
        console.log('Fetched expenses:', response.data);
        setExpenses(response.data);
        setFilteredExpenses(response.data);
      } catch (err) {
        console.error('Error fetching expenses:', err);
        setError('Failed to load expenses');
        toast.error('Failed to load expenses');
      }
    };

    fetchSuppliers();
    fetchExpenses();
  }, []);

  // Handle search and date range filtering
  useEffect(() => {
    let filtered = expenses;

    // Apply search term filter
    if (searchTerm) {
      filtered = filtered.filter((expense) =>
        [expense.SupplierName, expense.SupplierEmail, expense.SupplierPhone]
          .some((field) => field?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply date range filter
    if (fromDate || toDate) {
      filtered = filtered.filter((expense) => {
        const createdOnDate = new Date(expense.CreatedOn).getTime();
        const from = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : -Infinity;
        const to = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : Infinity;
        return createdOnDate >= from && createdOnDate <= to;
      });
    }

    setFilteredExpenses(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchTerm, fromDate, toDate, expenses]);

  // Calculate total amount and pagination
  const totalFilteredAmount = filteredExpenses.reduce((sum, expense) => sum + expense.Amount, 0);
  const indexOfLastExpense = currentPage * rowsPerPage;
  const indexOfFirstExpense = indexOfLastExpense - rowsPerPage;
  const currentExpenses = filteredExpenses.slice(indexOfFirstExpense, indexOfLastExpense);
  const totalPages = Math.ceil(filteredExpenses.length / rowsPerPage);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
  };

  // Remove a selected file
  const removeFile = (index: number) => {
    setFiles((prev) => {
      const updatedFiles = prev.filter((_, i) => i !== index);
      URL.revokeObjectURL(prev[index].preview);
      return updatedFiles;
    });
  };

  // Open edit modal
  const openEditModal = (expense: Expense) => {
    console.log('Opening edit modal for expense:', expense);
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

  // Open payment modal
  const openPaymentModal = (expense: Expense) => {
    const supplier = suppliers.find((s) => s.SupplierId === expense.SupplierId);
    if (supplier) {
      console.log('Opening payment modal for supplier:', supplier);
      setSelectedSupplier({
        SupplierId: supplier.SupplierId,
        SupplierName: supplier.Name,
        Amount: supplier.Amount,
      });
      setIsPaymentModalOpen(true);
    } else {
      toast.error('Supplier not found');
    }
  };

  // Handle form submission (add or edit)
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

      console.log('Sending FormData:', {
        SupplierId: formData.SupplierId,
        Reason: formData.Reason,
        Amount: formData.Amount,
        [modalMode === 'add' ? 'CreatedBy' : 'ModifiedBy']: userName,
        files: files.map((f) => f.file.name),
      });

      const url = modalMode === 'add' ? '/expenses' : `/expenses/${editingExpense?.SuppliersExpenseID}`;
      const method = modalMode === 'add' ? 'post' : 'put';

      const response = await axiosInstance[method](url, formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success(response.data.message, { position: 'top-right', autoClose: 3000 });
      setFormData({ SupplierId: '', Reason: '', Amount: '' });
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setIsModalOpen(false);
      setEditingExpense(null);
      setModalMode('add');

      // Refresh expenses
      const expensesResponse = await axiosInstance.get('/expenses');
      console.log('Refreshed expenses after submit:', expensesResponse.data);
      setExpenses(expensesResponse.data);
      setFilteredExpenses(expensesResponse.data);
    } catch (err: any) {
      console.error(`Error ${modalMode === 'add' ? 'adding' : 'updating'} expense:`, err);
      const errorMessage = err.response?.data?.message || `Failed to ${modalMode === 'add' ? 'add' : 'update'} expense`;
      setError(errorMessage);
      toast.error(errorMessage, { position: 'top-right', autoClose: 3000 });
    }
  };

  // Handle toggle deleted status
  const handleToggleDeleted = async (expense: Expense) => {
    try {
      console.log('Toggling expense:', { SuppliersExpenseID: expense.SuppliersExpenseID, ModifiedBy: createdBy });
      const response = await axiosInstance.patch(`/expenses/${expense.SuppliersExpenseID}/toggle`, {
        ModifiedBy: createdBy,
      });
      console.log('Toggle response:', response.data);
      toast.success(response.data.message, { position: 'top-right', autoClose: 3000 });

      // Refresh expenses
      const expensesResponse = await axiosInstance.get('/expenses');
      console.log('Refreshed expenses after toggle:', expensesResponse.data);
      setExpenses(expensesResponse.data);
      setFilteredExpenses(expensesResponse.data);
    } catch (err: any) {
      console.error('Error toggling expense:', err);
      const errorMessage = err.response?.data?.message || 'Failed to toggle expense';
      toast.error(errorMessage, { position: 'top-right', autoClose: 3000 });
    }
  };

  // Handle export to Excel
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
      'Created On': new Date(expense.CreatedOn).toLocaleDateString(),
      'Created By': expense.CreatedBy,
      'Status': expense.Deleted ? 'InActive' : 'Active',
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses');
    XLSX.writeFile(workbook, 'Expenses.xlsx');
    toast.success('Expenses exported to Excel successfully', { position: 'top-right', autoClose: 3000 });
  };

  // Clear filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setFromDate('');
    setToDate('');
    if (searchInputRef.current) {
      searchInputRef.current.value = '';
    }
  };

  // Close modal and reset form
  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({ SupplierId: '', Reason: '', Amount: '' });
    setFiles([]);
    setError(null);
    setSuccess(null);
    setEditingExpense(null);
    setModalMode('add');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Close payment modal
  const closePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setSelectedSupplier(null);
    // Refresh expenses
    axiosInstance.get('/expenses').then((response) => {
      console.log('Refreshed expenses after payment:', response.data);
      setExpenses(response.data);
      setFilteredExpenses(response.data);
    }).catch((err) => {
      console.error('Error refreshing expenses after payment:', err);
      toast.error('Failed to refresh expenses', { position: 'top-right', autoClose: 3000 });
    });
  };

  return (
    <>
      <Breadcrumb pageName="Manage Expenses" />

      {/* Header Section with Stats and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 mb-3 rounded-lg shadow-md">
        <div className="flex items-center flex-wrap gap-2 mb-2 sm:mb-0">
          <h3 className="text-base font-semibold text-black flex items-center">
            <FaUserPlus className="w-4 h-4 mr-1.5" />
            <span className="text-sm mr-1 dark:text-white">Suppliers Expenses:</span>
            <span className="font-medium text-indigo-700 mr-3">
              {filteredExpenses.length}
            </span>
            <span className="text-sm mr-1 dark:text  dark:text-white">Total Amount:</span>
            <span className="font-medium text-indigo-700">
              ₹{totalFilteredAmount.toFixed(2)}
            </span>
          </h3>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <FaSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs" />
            <input
              type="text"
              name="search"
              placeholder="Search by Name, Email, or Phone"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              ref={searchInputRef}
              autoComplete="new-search"
              className="w-full pl-8 pr-3 py-1 text-sm rounded-md border border-purple-300 focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <label className="text-xs text-gray-600">From:</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-[130px] p-1 text-sm rounded-md border border-gray-300 focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
              />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-xs text-gray-600">To:</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-[130px] p-1 text-sm rounded-md border border-gray-300 focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
              />
            </div>
            <button
              onClick={handleClearFilters}
              className="px-2 py-1 text-xs font-medium text-white bg-gray-500 rounded hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
            >
              Clear Filters
            </button>
          </div>
          <button
            onClick={() => {
              setModalMode('add');
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded text-white bg-green-500 hover:bg-green-600 transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-1"
          >
            <FaUserPlus className="w-3 h-3" />
            Add
          </button>
          <button
            onClick={handleExportToExcel}
            className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-blue-500 rounded hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1"
          >
            <FaFileExcel className="w-3 h-3" />
            Export
          </button>
        </div>
      </div>

      {/* Expenses List */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-3 mb-4">
        <h3 className="text-base font-semibold text-gray-800 mb-2 flex items-center">
          <FaMoneyBillWave className="text-purple-500 w-4 h-4 mr-1.5" />
          Expenses List
        </h3>
        {filteredExpenses.length === 0 ? (
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
            <div className="flex items-center justify-between mt-2 px-3">
              <div className="text-xs text-gray-600">
                Showing {indexOfFirstExpense + 1} to{' '}
                {Math.min(indexOfLastExpense, filteredExpenses.length)} of{' '}
                {filteredExpenses.length} expenses
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-xs font-medium text-white bg-purple-500 rounded-md hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-150"
                >
                  <FaChevronLeft />
                </button>
                <span className="text-xs text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 text-xs font-medium text-white bg-purple-500 rounded-md hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-150"
                >
                  <FaChevronRight />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-4 w-full max-w-sm">
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
                      {supplier.Name}{supplier.Amount > 0 ? ` ( ₹${supplier.Amount.toFixed(2)} )` : ''}
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

              {files.length > 0 && (
                <div className="bg-gray-50 p-2 rounded-md">
                  <h3 className="text-xs font-medium text-gray-700 mb-1.5">Selected Files:</h3>
                  <ul className="space-y-1 max-h-24 overflow-y-auto">
                    {files.map((fileObj, index) => (
                      <li key={index} className="flex items-center justify-between bg-white p-1.5 rounded-md border border-gray-200 text-xs">
                        <span className="text-gray-600 truncate max-w-xs">
                          {fileObj.file.name}
                        </span>
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
            toast.success('Payment processed successfully', { position: 'top-right', autoClose: 3000 });
          }}
          createdBy={createdBy}
          searchInputRef={searchInputRef}
        />
      )}
    </>
  );
};

export default ManageExpense;