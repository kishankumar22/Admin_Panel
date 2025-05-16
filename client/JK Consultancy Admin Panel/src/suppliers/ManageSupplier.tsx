import React, { useState, useEffect } from "react";
import Breadcrumb from "../components/Breadcrumbs/Breadcrumb";
import { FaUserPlus, FaSpinner, FaSearch, FaChevronLeft, FaChevronRight, FaEnvelope, FaPhone, FaBuilding, FaMoneyBillWave, FaCreditCard, FaComment, FaFileUpload, FaEye, FaDownload, FaTimes } from "react-icons/fa";
import { useAuth } from '../context/AuthContext';
import axiosInstance from "../config";
import { toast } from "react-toastify";
import axios from 'axios';

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
}

interface SupplierDocument {
  DocumentId: number;
  SupplierId: number;
  DocumentUrl: string;
  PublicId: string;
  CreatedOn: string;
}

const ManageSupplier: React.FC = () => {
  const { user } = useAuth();
  const createdBy = user?.name || 'admin';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(5);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [supplierDocuments, setSupplierDocuments] = useState<SupplierDocument[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phoneNo: "",
    address: "",
    amount: "",
    bankName: "",
    accountNo: "",
    ifscCode: "",
    comment: "",
    files: [] as File[],
  });

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phoneNo: "",
      address: "",
      amount: "",
      bankName: "",
      accountNo: "",
      ifscCode: "",
      comment: "",
      files: [],
    });
    setErrors({});
  };

  const fetchSuppliers = async () => {
    try {
      const response = await axiosInstance.get('/suppliers');
      const data: Supplier[] = response.data;
      setSuppliers(data);
      setFilteredSuppliers(data);
    } catch (error) {
      toast.error('Failed to fetch suppliers');
    }
  };

  const fetchSupplierDocuments = async (supplierId: number) => {
    try {
      const response = await axiosInstance.get(`/supplier/${supplierId}/documents`);
      setSupplierDocuments(response.data);
    } catch (error) {
      toast.error('Failed to fetch supplier documents');
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

    setFilteredSuppliers(filtered);
    setCurrentPage(1);
  }, [searchTerm, suppliers]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.name) newErrors.name = "Name is required";
    if (!formData.email) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Invalid email format";
    if (!formData.phoneNo) newErrors.phoneNo = "Phone number is required";
    else if (!/^\d{10}$/.test(formData.phoneNo)) newErrors.phoneNo = "Phone number must be 10 digits";
    if (!formData.address) newErrors.address = "Address is required";
    if (!formData.amount) newErrors.amount = "Amount is required";
    else if (parseFloat(formData.amount) <= 0) newErrors.amount = "Amount must be greater than 0";
    if (!formData.bankName) newErrors.bankName = "Bank name is required";
    if (!formData.accountNo) newErrors.accountNo = "Account number is required";
    if (!formData.ifscCode) newErrors.ifscCode = "IFSC code is required";
    else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode)) newErrors.ifscCode = "Invalid IFSC code format";
    if (!formData.comment) newErrors.comment = "Comment is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData((prev) => ({
      ...prev,
      files: [...prev.files, ...files],
    }));
    e.target.value = ''; // Reset file input
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
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        toast.success('Supplier added successfully');
        setIsModalOpen(false);
        resetForm();
        fetchSuppliers();
      } else {
        toast.error(response.data.message || 'Failed to add supplier');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || 'Error adding supplier');
      } else {
        toast.error('Error adding supplier');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewFiles = (supplierId: number) => {
    setSelectedSupplierId(supplierId);
    fetchSupplierDocuments(supplierId);
    setIsDocumentsModalOpen(true);
  };

  const handleDownloadFile = async (documentUrl: string, documentId: number) => {
    try {
      // Fetch the file as a blob
      const response = await fetch(documentUrl, { mode: 'cors' });
      if (!response.ok) {
        throw new Error('Failed to fetch the file');
      }
      const blob = await response.blob();

      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob);

      // Create a temporary link element to trigger the download
      const link = document.createElement('a');
      link.href = url;
      link.download = `Supplier_Document_${documentId}${documentUrl.includes('.pdf') ? '.pdf' : documentUrl.includes('.jpg') ? '.jpg' : ''}`; // Guess extension
      document.body.appendChild(link);
      link.click();

      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to download the document');
      console.error('Download error:', error);
    }
  };

  const indexOfLastSupplier = currentPage * rowsPerPage;
  const indexOfFirstSupplier = indexOfLastSupplier - rowsPerPage;
  const currentSuppliers = filteredSuppliers.slice(indexOfFirstSupplier, indexOfLastSupplier);
  const totalPages = Math.ceil(filteredSuppliers.length / rowsPerPage);

  return (
    <>
      <Breadcrumb pageName="Manage Suppliers" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 mb-4 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md gap-2">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <FaUserPlus className="text-indigo-600 w-5 h-5" />
          <span>Suppliers List:</span>
          <span className="font-medium text-indigo-700 dark:text-indigo-400">{filteredSuppliers.length}</span>
        </h3>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <FaUserPlus className="w-4 h-4" />
          Add Supplier
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
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition duration-150"
            >
              <FaTimes className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold mb-3 bg-blue-300 p-1 rounded text-black dark:text-gray-100 flex items-center gap-1">
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
                    className={`w-full p-1 text-sm rounded-md border ${errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white transition duration-150`}
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
                    className={`w-full p-1 text-sm rounded-md border ${errors.email ? 'border-red-500' : 'border-gray-+.300 dark:border-gray-600'} focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white transition duration-150`}
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
                    className={`w-full p-1 text-sm rounded-md border ${errors.phoneNo ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white transition duration-150`}
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
                    className={`w-full p-1 text-sm rounded-md border ${errors.address ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white transition duration-150`}
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
                    className={`w-full p-1 text-sm rounded-md border ${errors.amount ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white transition duration-150`}
                    required
                  />
                  {errors.amount && <p className="text-red-500 text-xs mt-0.5">{errors.amount}</p>}
                </div>
                <div className="mb-2">
                  <label className="flex items-center gap-1 text-xs font-medium text-black dark:text-gray-200 mb-1">
                    {/* <FaPiggyBank className="text-indigo-500" /> */}
                    Bank Name <RequiredAsterisk />
                  </label>
                  <input
                    type="text"
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleInputChange}
                    className={`w-full p-1 text-sm rounded-md border ${errors.bankName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white transition duration-150`}
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
                    className={`w-full p-1 text-sm rounded-md border ${errors.accountNo ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white transition duration-150`}
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
                    className={`w-full p-1 text-sm rounded-md border ${errors.ifscCode ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white transition duration-150`}
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
                  className={`w-full p-1 text-sm rounded-md border ${errors.comment ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white transition duration-150`}
                  rows={2}
                  required
                />
                {errors.comment && <p className="text-red-500 text-xs mt-0.5">{errors.comment}</p>}
              </div>
              <div className="mb-2">
                <label className="flex items-center gap-1 text-xs font-medium text-black dark:text-gray-200 mb-1">
                  <FaFileUpload className="text-indigo-500" />
                  Upload Supplier Agreement Files
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
                    className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition duration-150 flex items-center gap-1"
                  >
                    <FaFileUpload className="w-4 h-4" />
                    Add Files
                  </button>
                </div>
                {formData.files.length > 0 && (
                  <div className="mt-2">
                    <ul className="list-disc pl-5 text-xs text-gray-700 dark:text-gray-300">
                      {formData.files.map((file, index) => (
                        <li key={index} className="flex items-center justify-between">
                          <span>{file.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(index)}
                            className="text-red-500 hover:text-red-700 transition duration-150"
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
                disabled={isSubmitting}
                className="px-4 py-1 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-150 flex items-center gap-1"
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="animate-spin w-4 h-4" />
                    Submitting...
                  </>
                ) : (
                  "Submit"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isDocumentsModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity duration-300">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-3 w-full max-w-3xl mx-2 transform transition-all duration-300 scale-95 sm:scale-100 shadow-lg relative">
            <button
              onClick={() => {
                setIsDocumentsModalOpen(false);
                setSelectedSupplierId(null);
                setSupplierDocuments([]);
              }}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition duration-150"
            >
              <FaTimes className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold mb-3 bg-blue-300 p-1 rounded text-black dark:text-gray-100 flex items-center gap-1">
              Supplier Documents
            </h2>
            <div className="max-h-[60vh] overflow-y-auto pr-1">
              {supplierDocuments.length > 0 ? (
                <table className="min-w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                  <thead>
                    <tr className="bg-indigo-600 text-white">
                      <th className="py-2 px-3 text-left text-xs font-semibold">Sr.</th>
                      <th className="py-2 px-3 text-left text-xs font-semibold">Document URL</th>
                      <th className="py-2 px-3 text-left text-xs font-semibold">Created On</th>
                      <th className="py-2 px-3 text-left text-xs font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierDocuments.map((doc, index) => (
                      <tr
                        key={doc.DocumentId}
                        className={`border-b border-gray-200 dark:border-gray-700 transition duration-150 ${
                          index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'
                        } hover:bg-indigo-100 dark:hover:bg-gray-700`}
                      >
                        <td className="py-2 px-3 text-xs text-black dark:text-gray-200">{index + 1}</td>
                        <td className="py-2 px-3 text-xs text-blue-600 dark:text-blue-400 truncate max-w-[200px]">
                          <a href={doc.DocumentUrl} target="_blank" rel="noopener noreferrer">
                            {doc.DocumentUrl}
                          </a>
                        </td>
                        <td className="py-2 px-3 text-xs text-black dark:text-gray-200">
                          {new Date(doc.CreatedOn).toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-xs text-black dark:text-gray-200 flex gap-2">
                          <button
                            onClick={() => window.open(doc.DocumentUrl, '_blank')}
                            className="px-2 py-1 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition duration-150 flex items-center gap-1"
                          >
                            <FaEye className="w-3 h-3" />
                            View
                          </button>
                          <button
                            onClick={() => handleDownloadFile(doc.DocumentUrl, doc.DocumentId)}
                            className="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition duration-150 flex items-center gap-1"
                          >
                            <FaDownload className="w-3 h-3" />
                            Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-center text-gray-600 dark:text-gray-400 text-xs">
                  No documents found for this supplier.
                </p>
              )}
            </div>
            <div className="flex justify-end mt-3">
              <button
                onClick={() => {
                  setIsDocumentsModalOpen(false);
                  setSelectedSupplierId(null);
                  setSupplierDocuments([]);
                }}
                className="px-4 py-1 text-sm font-medium text-black dark:text-gray-200 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition duration-150"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-3">
        <div className="mb-2 flex flex-col sm:flex-row items-center gap-2">
          <div className="relative flex-1 max-w-xs w-full">
            <FaSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
            <input
              type="text"
              placeholder="Search by Name, Email, or Phone"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1 text-sm rounded-md border border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white transition duration-150"
            />
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg shadow-md">
          <table className="min-w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <thead>
              <tr className="bg-indigo-600 text-white">
                <th className="py-2 px-3 text-left text-xs font-semibold">Sr.</th>
                <th className="py-2 px-3 text-left text-xs font-semibold">Name</th>
                <th className="py-2 px-3 text-left text-xs font-semibold">Email</th>
                <th className="py-2 px-3 text-left text-xs font-semibold">Phone No.</th>
                <th className="py-2 px-3 text-left text-xs font-semibold">Address</th>
                <th className="py-2 px-3 text-left text-xs font-semibold">Amount</th>
                <th className="py-2 px-3 text-left text-xs font-semibold">Bank Name</th>
                <th className="py-2 px-3 text-left text-xs font-semibold">Account No.</th>
                <th className="py-2 px-3 text-left text-xs font-semibold">IFSC Code</th>
                <th className="py-2 px-3 text-left text-xs font-semibold">Comment</th>
                <th className="py-2 px-3 text-left text-xs font-semibold">Created By</th>
                <th className="py-2 px-3 text-left text-xs font-semibold">Created On</th>
                <th className="py-2 px-3 text-left text-xs font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {currentSuppliers.length > 0 ? (
                currentSuppliers.map((supplier, index) => (
                  <tr
                    key={supplier.SupplierId || index}
                    className={`border-b border-gray-200 dark:border-gray-700 transition duration-150 ${
                      index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'
                    } hover:bg-indigo-100 dark:hover:bg-gray-700`}
                  >
                    <td className="py-2 px-3 text-xs text-black dark:text-gray-200">{indexOfFirstSupplier + index + 1}</td>
                    <td className="py-2 px-3 text-xs text-black dark:text-gray-200">{supplier.Name}</td>
                    <td className="py-2 px-3 text-xs text-black dark:text-gray-200">{supplier.Email}</td>
                    <td className="py-2 px-3 text-xs text-black dark:text-gray-200">{supplier.PhoneNo}</td>
                    <td className="py-2 px-3 text-xs text-black dark:text-gray-200">{supplier.Address}</td>
                    <td className="py-2 px-3 text-xs text-black dark:text-gray-200">{supplier.Amount}</td>
                    <td className="py-2 px-3 text-xs text-black dark:text-gray-200">{supplier.BankName}</td>
                    <td className="py-2 px-3 text-xs text-black dark:text-gray-200">{supplier.AccountNo}</td>
                    <td className="py-2 px-3 text-xs text-black dark:text-gray-200">{supplier.IFSCCode}</td>
                    <td className="py-2 px-3 text-xs text-black dark:text-gray-200">{supplier.Comment}</td>
                    <td className="py-2 px-3 text-xs text-black dark:text-gray-200">{supplier.CreatedBy}</td>
                    <td className="py-2 px-3 text-xs text-black dark:text-gray-200">
                      {new Date(supplier.CreatedOn).toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-xs text-black dark:text-gray-200 flex gap-2">
                      <button
                        onClick={() => handleViewFiles(supplier.SupplierId!)}
                        className="px-2 py-1 text-xs font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 transition duration-150 flex items-center gap-1"
                      >
                        <FaEye className="w-3 h-3" />
                        View Files
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={13} className="py-3 text-center text-gray-600 dark:text-gray-400 text-xs">
                    No suppliers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-2 px-3">
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Showing {indexOfFirstSupplier + 1} to {Math.min(indexOfLastSupplier, filteredSuppliers.length)} of {filteredSuppliers.length} suppliers
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