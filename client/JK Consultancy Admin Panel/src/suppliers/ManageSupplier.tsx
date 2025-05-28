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
  FaCreditCard,
  FaComment,
  FaFileUpload,
  FaTimes,
  FaFileExcel,
  FaEdit,
  FaToggleOn,
  FaToggleOff,
  FaMoneyBillWave,
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../config';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import SupplierPayment from './SupplierPaymentHistory';
import EditSupplierModal from './EditSupplierModal';
import { FileSearch } from 'lucide-react';

export const RequiredAsterisk = () => <span className="text-red-500">*</span>;

interface Supplier {
  SupplierId?: number;
  Name: string;
  Email: string;
  PhoneNo: string;
  Address: string;
  BankName: string;
  AccountNo: string;
  IFSCCode: string;
  Comment: string;
  CreatedBy: string;
  CreatedOn: string;
  Deleted: boolean;
  ModifiedBy: string | null;
  ModifiedOn: string | null;
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
  const [isLoading, setIsLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNo: '',
    address: '',
    bankName: '',
    accountNo: '',
    ifscCode: '',
    comment: '',
    files: [] as File[],
  });

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phoneNo: '',
      address: '',
      bankName: '',
      accountNo: '',
      ifscCode: '',
      comment: '',
      files: [],
    });
    setErrors({});
  };

  const fetchSuppliers = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get('/suppliers');
      setSuppliers(response.data);
      setFilteredSuppliers(response.data);
    } catch (error) {
      toast.error('Failed to fetch suppliers', { position: 'top-right', autoClose: 1000 });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    if (suppliers.length === 0) return;

    setIsLoading(true);
    let filtered = [...suppliers];

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

    if (statusFilter !== 'All') {
      filtered = filtered.filter((supplier) => {
        if (statusFilter === 'Active') {
          return !supplier.Deleted;
        } else if (statusFilter === 'Inactive') {
          return supplier.Deleted;
        }
        return true;
      });
    }

    setFilteredSuppliers(filtered);
    setCurrentPage(1);
    setTimeout(() => setIsLoading(false), 100);
  }, [searchTerm, fromDate, toDate, statusFilter, suppliers]);

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
    if (supplier.Deleted) {
      toast.warning('Supplier is inactive. Please activate to edit or make payment.', {
        position: 'top-right',
        autoClose: 3000,
      });
      return;
    }
    setSelectedSupplier(supplier);
    setSearchTerm('');
    if (searchInputRef.current) {
      searchInputRef.current.blur();
      searchInputRef.current.value = '';
    }
    setIsPaymentModalOpen(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    if (supplier.Deleted) {
      toast.warning('Supplier is inactive. Please activate to edit or make payment.', {
        position: 'top-right',
        autoClose: 3000,
      });
      return;
    }
    setEditingSupplier(supplier);
    setIsEditModalOpen(true);
  };

  const handleToggleStatus = async (supplier: Supplier) => {
    try {
      const response = await axiosInstance.patch(`/supplier/${supplier.SupplierId}/toggle`, {
        ModifiedBy: createdBy,
      });
      toast.success(response.data.message, { position: 'top-right', autoClose: 2000 });
      fetchSuppliers();
    } catch (err: any) {
      console.error('Error toggling supplier status:', err);
      toast.error(err.response?.data?.message || 'Failed to toggle supplier status', {
        position: 'top-right',
        autoClose: 1000,
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
      'Bank Name': supplier.BankName,
      'Account No.': supplier.AccountNo,
      'IFSC Code': supplier.IFSCCode,
      Comment: supplier.Comment,
      'Created By': supplier.CreatedBy,
      'Created On': new Date(supplier.CreatedOn).toLocaleString(),
      Status: supplier.Deleted ? 'Inactive' : 'Active',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Suppliers');
    XLSX.writeFile(workbook, 'Suppliers_List.xlsx');
    toast.success('Exported to Excel successfully', { position: 'top-right', autoClose: 3000 });
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setFromDate('');
    setToDate('');
    setStatusFilter('All');
    if (searchInputRef.current) {
      searchInputRef.current.value = '';
      searchInputRef.current.blur();
    }
  };

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRowsPerPage = parseInt(e.target.value);
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1);
  };

  const indexOfLastSupplier = currentPage * rowsPerPage;
  const indexOfFirstSupplier = indexOfLastSupplier - rowsPerPage;
  const currentSuppliers = filteredSuppliers.slice(indexOfFirstSupplier, indexOfLastSupplier);
  const totalPages = Math.ceil(filteredSuppliers.length / rowsPerPage);

  const activeFilteredSuppliers = filteredSuppliers.filter((supplier) => !supplier.Deleted);
  const displaySuppliers = statusFilter === 'Inactive' ? filteredSuppliers : activeFilteredSuppliers;
  const totalDisplaySuppliers = displaySuppliers.length;

  const pageNumbers = [];
  const maxPagesToShow = 5;
  const startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
  const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <>
      <Breadcrumb pageName="Manage Suppliers" />
      <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-1">
              <FaUserPlus className="text-indigo-600 dark:text-indigo-400 w-3 h-3" />
              <span className="text-gray-600 dark:text-gray-400">Total Supplier:</span>
              <span className="font-semibold text-indigo-700 dark:text-indigo-400">
                {isLoading ? '...' : totalDisplaySuppliers}
              </span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="relative w-full sm:w-auto">
              <FaSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs" />
              <input
                type="text"
                name="search"
                placeholder="Search by Name, Email, Phone"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                ref={searchInputRef}
                autoComplete="new-search"
                className="w-full sm:w-48 pl-6 pr-2 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white placeholder:text-xs"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">From:</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-24 p-1 text-xs rounded border border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">To:</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-24 p-1 text-xs rounded border border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'All' | 'Active' | 'Inactive')}
                  className="w-16 p-1 text-xs rounded border border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="All">All</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleClearFilters}
                  className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-gray-400"
                  title="Clear Filters"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <FaUserPlus className="w-3 h-3" />
                  <span className="hidden sm:inline">Add Supplier</span>
                  <span className="sm:hidden">Add</span>
                </button>
              </div>
            </div>
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
          <FaFileExcel className="w-3.5 h-3.5" />
          <span>Export To Excel</span>
        </button>
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
          {isLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] bg-gray-50 border border-gray-200 dark:border-gray-700">
              <FaSpinner className="animate-spin h-8 w-8 text-indigo-600 mb-3" />
              <p className="text-sm font-medium text-gray-600">Loading suppliers...</p>
            </div>
          ) : (
            <table className="min-w-full text-[11px] md:text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              <thead>
                <tr className="bg-indigo-600 text-white">
                  {[
                    'Sr.',
                    'Action',
                    'Name',
                    'Email',
                    'Phone No.',
                    'Address',
                    'Bank Name',
                    'Account No.',
                    'IFSC Code',
                    'Comment',
                    'Created By',
                    'Created On',
                    'Status',
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
                      <td className="py-1 px-2 flex gap-2 text-black dark:text-gray-200 whitespace-nowrap">
                        <button
                          onClick={() => handlePaySupplier(supplier)}
                          className={`inline-flex items-center px-2 py-1 text-white rounded transition text-[11px] ${
                            supplier.Deleted
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                          title="Payment"
                        >
                          <FaMoneyBillWave className="w-3 h-3 mr-1" />
                          Pay
                        </button>
                        <button
                          onClick={() => handleEditSupplier(supplier)}
                          className={`inline-flex items-center px-2 py-1 text-white rounded transition text-[11px] ${
                            supplier.Deleted
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-yellow-600 hover:bg-yellow-700'
                          }`}
                          title="Edit"
                        >
                          <FaEdit className="w-3 h-3 mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleStatus(supplier)}
                          className={`inline-flex items-center px-2 py-1 text-white rounded transition text-[11px] ${
                            supplier.Deleted
                              ? 'bg-green-600 hover:bg-green-700'
                              : 'bg-red-600 hover:bg-red-700'
                          }`}
                          title={supplier.Deleted ? 'Activate' : 'Deactivate'}
                        >
                          {supplier.Deleted ? (
                            <FaToggleOff className="w-3 h-3 mr-1" />
                          ) : (
                            <FaToggleOn className="w-3 h-3 mr-1" />
                          )}
                          {supplier.Deleted ? 'Active' : 'Inactive'}
                        </button>
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
                          {supplier.Deleted ? 'Inactive' : 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={13}
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
          )}
        </div>
        <div className="flex items-center justify-between mt-4 px-3">
          <div className="text-xs text-gray-600 dark:text-gray-400">
            <span>
              Showing {indexOfFirstSupplier + 1} to{' '}
              {Math.min(indexOfLastSupplier, filteredSuppliers.length)} of{' '}
              {filteredSuppliers.length} suppliers
            </span>
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
      </div>
    </>
  );
};

export default ManageSupplier;