import React, { useState, useEffect, useRef } from 'react';
import Breadcrumb from '../components/Breadcrumbs/Breadcrumb';
import {
  FaUserPlus,
  FaSpinner,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
  FaEnvelope,
  FaPhone,
  FaBuilding,
  FaMoneyBillWave,
  FaCreditCard,
  FaComment,
  FaFileUpload,
  FaTimes,
  FaFileExcel,
  FaEdit,
  FaToggleOn,
  FaToggleOff,
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../config';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import SupplierPayment from './SupplierPayment';
import EditSupplierModal from './EditSupplierModal';
import { FileSearch } from 'lucide-react';

export const RequiredAsterisk = () => <span className="text-red-500">*</span>;

interface Supplier {
  SupplierId?: number;
  Name: string;
  Email: string;
  PhoneNo: string;
  Address: string;
  Amount: number;
  BankName: string;
  AccountNo: string;
  IFSCCode: string;
  Comment: string;
  CreatedBy: string;
  CreatedOn: string;
  Deleted: boolean;
  ModifiedBy: string | null;
  ModifiedOn: string | null;
  TotalPaidAmount?: number;
  PendingAmount?: number;
}

interface PaymentHistory {
  SPId: number;
  PaidAmount: number;
}

const ManageSupplier: React.FC = () => {
  const { user } = useAuth();
  const createdBy = user?.name || 'admin';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<'All' | 'Paid' | 'Unpaid'>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(20);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNo: '',
    address: '',
    amount: '',
    bankName: '',
    accountNo: '',
    ifscCode: '',
    comment: '',
    files: [] as File[],
  });

  // Set default dates: current date for toDate and one month prior for fromDate
  useEffect(() => {
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);

    // Format dates as YYYY-MM-DD
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    setToDate(formatDate(today));
    setFromDate(formatDate(oneMonthAgo));
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phoneNo: '',
      address: '',
      amount: '',
      bankName: '',
      accountNo: '',
      ifscCode: '',
      comment: '',
      files: [],
    });
    setErrors({});
  };

  const fetchSuppliers = async () => {
    try {
      const response = await axiosInstance.get('/suppliers');
      let data: Supplier[] = response.data;

      for (let supplier of data) {
        const totalPaid = await fetchTotalPaidAmount(supplier.SupplierId!);
        supplier.TotalPaidAmount = totalPaid;
        supplier.PendingAmount = supplier.Amount - (totalPaid || 0);
      }

      setSuppliers(data);
      setFilteredSuppliers(data);
    } catch (error) {
      toast.error('Failed to fetch suppliers', { position: 'top-right', autoClose: 3000 });
    }
  };

  const fetchTotalPaidAmount = async (supplierId: number): Promise<number> => {
    try {
      const response = await axiosInstance.get(`/supplier/${supplierId}/payments`);
      const payments: PaymentHistory[] = response.data;
      return payments.reduce((sum, payment) => sum + payment.PaidAmount, 0);
    } catch (error) {
      return 0;
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    let filtered = suppliers;

    if (searchTerm) {
      filtered = filtered.filter((supplier) =>
        [supplier.Name, supplier.Email, supplier.PhoneNo].some((field) =>
          field?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    if (fromDate || toDate) {
      filtered = filtered.filter((supplier) => {
        const createdOnDate = new Date(supplier.CreatedOn).getTime();
        const from = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : -Infinity;
        const to = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : Infinity;
        return createdOnDate >= from && createdOnDate <= to;
      });
    }

    if (paymentStatus !== 'All') {
      filtered = filtered.filter((supplier) => {
        const totalPaid = supplier.TotalPaidAmount || 0;
        if (paymentStatus === 'Paid') {
          return supplier.Amount === totalPaid;
        } else if (paymentStatus === 'Unpaid') {
          return supplier.Amount > totalPaid;
        }
        return true;
      });
    }

    setFilteredSuppliers(filtered);
    setCurrentPage(1);
  }, [searchTerm, fromDate, toDate, paymentStatus, suppliers]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.name) newErrors.name = 'Name is required';
    else if (
      suppliers.some((supplier) => supplier.Name.toLowerCase() === formData.name.toLowerCase())
    ) {
      newErrors.name = 'This supplier already exists. Please try another name.';
    }
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.phoneNo) newErrors.phoneNo = 'Phone number is required';
    else if (!/^\d{10}$/.test(formData.phoneNo)) newErrors.phoneNo = 'Phone number must be 10 digits';
    if (!formData.address) newErrors.address = 'Address is required';
    if (!formData.amount) newErrors.amount = 'Amount is required';
    else if (parseFloat(formData.amount) <= 0) newErrors.amount = 'Amount must be greater than 0';
    if (!formData.bankName) newErrors.bankName = 'Bank name is required';
    if (!formData.accountNo) newErrors.accountNo = 'Account number is required';
    if (!formData.ifscCode) newErrors.ifscCode = 'IFSC code is required';
    else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode))
      newErrors.ifscCode = 'Invalid IFSC code format';
    if (!formData.comment) newErrors.comment = 'Comment is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));

    if (name === 'name' && value) {
      const exists = suppliers.some((supplier) => supplier.Name.toLowerCase() === value.toLowerCase());
      if (exists) {
        setErrors((prev) => ({
          ...prev,
          name: 'This supplier already exists. Please try another name.',
        }));
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData((prev) => ({
      ...prev,
      files: [...prev.files, ...files],
    }));
    e.target.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    const data = new FormData();
    data.append('name', formData.name);
    data.append('email', formData.email);
    data.append('phoneNo', formData.phoneNo);
    data.append('address', formData.address);
    data.append('amount', formData.amount);
    data.append('bankName', formData.bankName);
    data.append('accountNo', formData.accountNo);
    data.append('ifscCode', formData.ifscCode);
    data.append('comment', formData.comment);
    data.append('createdBy', createdBy);
    formData.files.forEach((file) => {
      data.append('files', file);
    });

    try {
      const response = await axiosInstance.post('/supplier/add', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        toast.success('Supplier added successfully', { position: 'top-right', autoClose: 3000 });
        setIsModalOpen(false);
        resetForm();
        fetchSuppliers();
      } else {
        toast.error(response.data.message || 'Failed to add supplier', { position: 'top-right', autoClose: 3000 });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error adding supplier', { position: 'top-right', autoClose: 3000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaySupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setSearchTerm('');
    if (searchInputRef.current) {
      searchInputRef.current.blur();
      searchInputRef.current.value = '';
    }
    setIsPaymentModalOpen(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsEditModalOpen(true);
  };

  const handleToggleDeleted = async (supplier: Supplier) => {
    try {
      const response = await axiosInstance.patch(`/supplier/${supplier.SupplierId}/toggle`, {
        ModifiedBy: createdBy,
      });
      toast.success(response.data.message, { position: 'top-right', autoClose: 3000 });
      fetchSuppliers();
    } catch (err: any) {
      console.error('Error toggling supplier:', err);
      toast.error(err.response?.data?.message || 'Failed to toggle supplier', {
        position: 'top-right',
        autoClose: 3000,
      });
    }
  };

  const handleExportToExcel = () => {
    if (filteredSuppliers.length === 0) {
      toast.warning('No data to export');
      return;
    }
    const exportData = filteredSuppliers.map((supplier, index) => ({
      'Sr.': index + 1,
      Name: supplier.Name,
      Email: supplier.Email,
      'Phone No.': supplier.PhoneNo,
      Address: supplier.Address,
      Amount: supplier.Amount,
      'Pending Amount': supplier.PendingAmount,
      'Bank Name': supplier.BankName,
      'Account No.': supplier.AccountNo,
      'IFSC Code': supplier.IFSCCode,
      Comment: supplier.Comment,
      'Created By': supplier.CreatedBy,
      'Created On': new Date(supplier.CreatedOn).toLocaleString(),
      Status: supplier.Deleted ? 'INActive' : 'Active',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Suppliers');
    XLSX.writeFile(workbook, 'Suppliers_List.xlsx');
    toast.success('Exported to Excel successfully', { position: 'top-right', autoClose: 3000 });
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    setToDate(formatDate(today));
    setFromDate(formatDate(oneMonthAgo));
    setPaymentStatus('All');
    if (searchInputRef.current) {
      searchInputRef.current.value = '';
    }
  };

  const indexOfLastSupplier = currentPage * rowsPerPage;
  const indexOfFirstSupplier = indexOfLastSupplier - rowsPerPage;
  const currentSuppliers = filteredSuppliers.slice(indexOfFirstSupplier, indexOfLastSupplier);
  const totalPages = Math.ceil(filteredSuppliers.length / rowsPerPage);
  const totalFilteredAmount = filteredSuppliers.reduce((sum, supplier) => {
    return sum + (supplier.Amount || 0);
  }, 0);
  const totalFilteredPendingAmount = filteredSuppliers.reduce((sum, supplier) => {
    return sum + (supplier.PendingAmount || 0);
  }, 0);

  return (
    <>
      <Breadcrumb pageName="Manage Suppliers" />
      <div className="flex flex-row items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <FaUserPlus className="text-indigo-600 dark:text-indigo-400 w-4 h-4 mr-1" />
            <span className="text-sm text-gray-600 dark:text-gray-400 mr-1">Suppliers:</span>
            <span className="font-medium text-indigo-700 dark:text-indigo-400 mr-3">
              {filteredSuppliers.length}
            </span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400 mr-1">Total Amount:</span>
            <span className="font-medium text-indigo-700 dark:text-indigo-400 mr-3">
              ₹{totalFilteredAmount.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400 mr-1">Pending Amount:</span>
            <span className="font-medium text-red-600 dark:text-red-400">
              ₹{totalFilteredPendingAmount.toLocaleString()}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <div className="relative">
            <FaSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs" />
            <input
              type="text"
              name="search"
              placeholder="Search by Name, Email, or Phone"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              ref={searchInputRef}
              autoComplete="new-search"
              className="w-full pl-7 pr-2 py-1 text-sm rounded-md border border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          
          <div className="flex items-center gap-1">
            <div className="flex items-center">
              <span className="text-xs text-gray-600 dark:text-gray-400">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-[110px] p-1 text-sm rounded-md border border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="flex items-center">
              <span className="text-xs text-gray-600 dark:text-gray-400">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-[110px] p-1 text-sm rounded-md border border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="flex items-center">
              <span className="text-xs text-gray-600 dark:text-gray-400">Status:</span>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as 'All' | 'Paid' | 'Unpaid')}
                className="w-[90px] p-1 text-sm rounded-md border border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="All">All</option>
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
              </select>
            </div>
            <button
              onClick={handleClearFilters}
              className="p-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors focus:outline-none"
              title="Clear Filters"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1 px-2 py-1 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <FaUserPlus className="w-3.5 h-3.5" />
              <span>Add Supplier</span>
            </button>
            
            <button
              onClick={handleExportToExcel}
              className="flex items-center gap-1 px-2 py-1 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors focus:outline-none focus:ring-1 focus:ring-green-500"
            >
              <FaFileExcel className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity duration-300">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-3 w-full max-w-2xl mx-2 transform transition-all duration-300 scale-95 sm:scale-100 shadow-lg relative">
            <button
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
              className="absolute top-2 right-2 text-gray-500 hover:text-red-700 dark:text-gray-400 dark:hover:text-gray-200 transition duration-150 z-10"
            >
              <FaTimes className="w-6 h-6 mr-3 mt-2" />
            </button>
            <h2 className="text-lg font-semibold mb-3 bg-gradient-to-r from-indigo-200 to-blue-200 p-1 rounded text-black dark:text-gray-100 flex items-center gap-1">
              <FaUserPlus className="text-indigo-600" />
              Add Supplier
            </h2>
            <div className="form-container max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="mb-2">
                  <label className="flex items-center gap-1 text-xs font-medium text-black dark:text-gray-200 mb-1">
                    <FaUserPlus className="text-indigo-500" />
                    Name <RequiredAsterisk />
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full p-1 text-sm rounded-md border ${
                      errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white transition duration-150`}
                    required
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-0.5">{errors.name}</p>}
                </div>
                <div className="mb-2">
                  <label className="flex items-center gap-1 text-xs font-medium text-black dark:text-gray-200 mb-1">
                    <FaEnvelope className="text-indigo-500" />
                    Email Id <RequiredAsterisk />
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full p-1 text-sm rounded-md border ${
                      errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white transition duration-150`}
                    required
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-0.5">{errors.email}</p>}
                </div>
                <div className="mb-2">
                  <label className="flex items-center gap-1 text-xs font-medium text-black dark:text-gray-200 mb-1">
                    <FaPhone className="text-indigo-500" />
                    Phone No. <RequiredAsterisk />
                  </label>
                  <input
                    type="text"
                    name="phoneNo"
                    value={formData.phoneNo}
                    onChange={handleInputChange}
                    className={`w-full p-1 text-sm rounded-md border ${
                      errors.phoneNo ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white transition duration-150`}
                    required
                  />
                  {errors.phoneNo && <p className="text-red-500 text-xs mt-0.5">{errors.phoneNo}</p>}
                </div>
                <div className="mb-2">
                  <label className="flex items-center gap-1 text-xs font-medium text-black dark:text-gray-200 mb-1">
                    <FaBuilding className="text-indigo-500" />
                    Address <RequiredAsterisk />
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className={`w-full p-1 text-sm rounded-md border ${
                      errors.address ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white transition duration-150`}
                    required
                  />
                  {errors.address && <p className="text-red-500 text-xs mt-0.5">{errors.address}</p>}
                </div>
                <div className="mb-2">
                  <label className="flex items-center gap-1 text-xs font-medium text-black dark:text-gray-200 mb-1">
                    <FaMoneyBillWave className="text-indigo-500" />
                    Total Amount <RequiredAsterisk />
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    className={`w-full p-1 text-sm rounded-md border ${
                      errors.amount ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white transition duration-150`}
                    required
                  />
                  {errors.amount && <p className="text-red-500 text-xs mt-0.5">{errors.amount}</p>}
                </div>
                <div className="mb-2">
                  <label className="flex items-center gap-1 text-xs font-medium text-black dark:text-gray-200 mb-1">
                    Bank Name <RequiredAsterisk />
                  </label>
                  <input
                    type="text"
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleInputChange}
                    className={`w-full p-1 text-sm rounded-md border ${
                      errors.bankName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white transition duration-150`}
                    required
                  />
                  {errors.bankName && <p className="text-red-500 text-xs mt-0.5">{errors.bankName}</p>}
                </div>
                <div className="mb-2">
                  <label className="flex items-center gap-1 text-xs font-medium text-black dark:text-gray-200 mb-1">
                    <FaCreditCard className="text-indigo-500" />
                    Account No. <RequiredAsterisk />
                  </label>
                  <input
                    type="text"
                    name="accountNo"
                    value={formData.accountNo}
                    onChange={handleInputChange}
                    className={`w-full p-1 text-sm rounded-md border ${
                      errors.accountNo ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white transition duration-150`}
                    required
                  />
                  {errors.accountNo && <p className="text-red-500 text-xs mt-0.5">{errors.accountNo}</p>}
                </div>
                <div className="mb-2">
                  <label className="flex items-center gap-1 text-xs font-medium text-black dark:text-gray-200 mb-1">
                    <FaCreditCard className="text-indigo-500" />
                    IFSC Code <RequiredAsterisk />
                  </label>
                  <input
                    type="text"
                    name="ifscCode"
                    value={formData.ifscCode}
                    onChange={handleInputChange}
                    className={`w-full p-1 text-sm rounded-md border ${
                      errors.ifscCode ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white transition duration-150`}
                    required
                  />
                  {errors.ifscCode && <p className="text-red-500 text-xs mt-0.5">{errors.ifscCode}</p>}
                </div>
              </div>
              <div className="mb-2">
                <label className="flex items-center gap-1 text-xs font-medium text-black dark:text-gray-200 mb-1">
                  <FaComment className="text-indigo-500" />
                  Comment <RequiredAsterisk />
                </label>
                <textarea
                  name="comment"
                  value={formData.comment}
                  onChange={handleInputChange}
                  className={`w-full p-1 text-sm rounded-md border ${
                    errors.comment ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white transition duration-150`}
                  rows={2}
                  required
                />
                {errors.comment && <p className="text-red-500 text-xs mt-0.5">{errors.comment}</p>}
              </div>
              <div className="mb-2">
                <label className="flex items-center gap-1 text-xs font-medium text-black dark:text-gray-200 mb-1">
                  <FaFileUpload className="text-indigo-500" />
                  Upload Supplier Agreement Files
                  {formData.files.length > 0 && (
                    <span className="ml-2 text-xs text-indigo-600">
                      ({formData.files.length} {formData.files.length === 1 ? 'file' : 'files'})
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="px-3 py-1 text-xs font-medium text-black bg-gray-300 rounded-md hover:bg-gray-400 transition duration-150 flex items-center gap-1"
                  >
                    <FaFileUpload className="w-4 h-4" />
                    Add Files
                  </button>
                </div>
                {formData.files.length > 0 && (
                  <div className="mt-2 p-2 w-72 bg-gray-100 dark:bg-gray-800 rounded-md">
                    <ul className="space-y-2">
                      {formData.files.map((file, index) => (
                        <li
                          key={index}
                          className="flex items-center justify-between gap-2 text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 p-2 rounded-md shadow-sm"
                        >
                          <span className="truncate">{index + 1}. </span>
                          <span className="truncate">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(index)}
                            className="text-red-500 hover:text-red-700 transition duration-150 flex-shrink-0"
                          >
                            <FaTimes className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="px-4 py-1 text-sm font-medium text-black dark:text-gray-200 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition duration-150"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={isSubmitting || !!errors.name}
                className="px-4 py-1 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-150 flex items-center gap-1 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="animate-spin w-4 h-4" />
                    Submitting...
                  </>
                ) : (
                  'Submit'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isPaymentModalOpen && selectedSupplier && (
        <SupplierPayment
          supplier={{
            SupplierId: selectedSupplier.SupplierId!,
            Name: selectedSupplier.Name,
            Amount: selectedSupplier.Amount,
          }}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setSelectedSupplier(null);
            setSearchTerm('');
            if (searchInputRef.current) {
              searchInputRef.current.blur();
              searchInputRef.current.value = '';
            }
          }}
          onSuccess={() => {
            setIsPaymentModalOpen(false);
            setSelectedSupplier(null);
            setSearchTerm('');
            if (searchInputRef.current) {
              searchInputRef.current.blur();
              searchInputRef.current.value = '';
            }
            fetchSuppliers();
          }}
          createdBy={createdBy}
          searchInputRef={searchInputRef}
        />
      )}

      {isEditModalOpen && editingSupplier && editingSupplier.SupplierId !== undefined && (
        <EditSupplierModal
          supplier={{
            ...editingSupplier,
            SupplierId: editingSupplier.SupplierId as number,
          }}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingSupplier(null);
          }}
          onSuccess={() => {
            setIsEditModalOpen(false);
            setEditingSupplier(null);
            fetchSuppliers();
          }}
          modifiedBy={createdBy}
        />
      )}

      <div className="mt-2">
        <div className="overflow-x-auto rounded-lg shadow-md">
          <table className="min-w-full text-[11px] md:text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <thead>
              <tr className="bg-indigo-600 text-white">
                {[
                  'Sr.',
                  'Name',
                  'Email',
                  'Phone No.',
                  'Address',
                  'Amount',
                  'Pending Amount',
                  'Bank Name',
                  'Account No.',
                  'IFSC Code',
                  'Comment',
                  'Created By',
                  'Created On',
                  'Status',
                  'Action',
                ].map((title) => (
                  <th key={title} className="py-1 px-2 text-left font-semibold whitespace-nowrap">
                    {title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentSuppliers.length > 0 ? (
                currentSuppliers.map((supplier, index) => (
                  <tr
                    key={supplier.SupplierId || index}
                    className={`border-b border-gray-200 dark:border-gray-700 transition duration-150 ${
                      supplier.Deleted
                        ? 'bg-gray-100 dark:bg-gray-800 opacity-60'
                        : index % 2 === 0
                        ? 'bg-gray-100 dark:bg-gray-800'
                        : 'bg-white dark:bg-gray-900'
                    } hover:bg-indigo-100 dark:hover:bg-gray-700`}
                  >
                    <td className="py-1 px-2 text-black dark:text-gray-200 whitespace-nowrap">
                      {indexOfFirstSupplier + index + 1}
                    </td>
                    <td className="py-1 px-2 text-black dark:text-gray-200 whitespace-nowrap">
                      {supplier.Name}
                    </td>
                    <td className="py-1 px-2 text-black dark:text-gray-200 whitespace-nowrap">
                      {supplier.Email}
                    </td>
                    <td className="py-1 px-2 text-black dark:text-gray-200 whitespace-nowrap">
                      {supplier.PhoneNo}
                    </td>
                    <td className="py-1 px-2 text-black dark:text-gray-200 whitespace-nowrap">
                      {supplier.Address}
                    </td>
                    <td className="py-1 px-2 text-black dark:text-gray-200 whitespace-nowrap">
                      ₹{supplier.Amount.toLocaleString()}
                    </td>
                    <td className="py-1 px-2 text-black dark:text-gray-200 whitespace-nowrap">
                      ₹{(supplier.PendingAmount || 0).toLocaleString()}
                    </td>
                    <td className="py-1 px-2 text-black dark:text-gray-200 whitespace-nowrap">
                      {supplier.BankName}
                    </td>
                    <td className="py-1 px-2 text-black dark:text-gray-200 whitespace-nowrap">
                      {supplier.AccountNo}
                    </td>
                    <td className="py-1 px-2 text-black dark:text-gray-200 whitespace-nowrap">
                      {supplier.IFSCCode}
                    </td>
                    <td className="py-1 px-2 text-black dark:text-gray-200 whitespace-nowrap">
                      {supplier.Comment}
                    </td>
                    <td className="py-1 px-2 text-black dark:text-gray-200 whitespace-nowrap">
                      {supplier.CreatedBy}
                    </td>
                    <td className="py-1 px-2 text-black dark:text-gray-200 whitespace-nowrap">
                      {new Date(supplier.CreatedOn).toLocaleString()}
                    </td>
                    <td className="py-1 px-2 text-black dark:text-gray-200 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                          supplier.Deleted
                            ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                            : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        }`}
                      >
                        {supplier.Deleted ? 'InActive' : 'Active'}
                      </span>
                    </td>
                    <td className="py-1 px-2 flex gap-2 text-black dark:text-gray-200 whitespace-nowrap">
                      <button
                        onClick={() => handlePaySupplier(supplier)}
                        className="inline-flex items-center px-2 py-1 text-white bg-blue-600 rounded hover:bg-blue-700 transition text-[11px]"
                        title="Payment"
                      >
                        <FaMoneyBillWave className="w-3 h-3 mr-1" />
                        Pay
                      </button>
                      <button
                        onClick={() => handleEditSupplier(supplier)}
                        className="inline-flex items-center px-2 py-1 text-white bg-yellow-600 rounded hover:bg-yellow-700 transition text-[11px]"
                        title="Edit"
                      >
                        <FaEdit className="w-3 h-3 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleDeleted(supplier)}
                        className="inline-flex items-center px-2 py-1 text-white bg-gray-600 rounded hover:bg-gray-700 transition text-[11px]"
                        title={supplier.Deleted ? 'Restore' : 'Delete'}
                      >
                        {supplier.Deleted ? (
                          <FaToggleOff className="w-3 h-3 mr-1" />
                        ) : (
                          <FaToggleOn className="w-3 h-3 mr-1" />
                        )}
                        {supplier.Deleted ? 'Restore' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={15}
                    className="text-center text-gray-600 dark:text-gray-400 text-xs"
                  >
                    <div className="flex flex-col items-center justify-center min-h-[300px] bg-gray-50 border-t border-gray-200">
                      <div className="mb-3">
                        <FileSearch className="h-8 w-8 text-gray-400 animate-pulse" />
                      </div>
                      <p className="text-sm font-medium text-gray-600 mb-1">No Suppliers records found</p>
                      <p className="text-xs text-gray-400 text-center px-4">
                        Try adjusting your filters or check back later
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-2 px-3">
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Showing {indexOfFirstSupplier + 1} to{' '}
            {Math.min(indexOfLastSupplier, filteredSuppliers.length)} of{' '}
            {filteredSuppliers.length} suppliers
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-2 py-1 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-150"
            >
              <FaChevronLeft />
            </button>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-2 py-1 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-150"
            >
              <FaChevronRight />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ManageSupplier;