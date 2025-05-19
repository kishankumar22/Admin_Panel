import React, { useState, useEffect } from 'react';
import { FaUserPlus, FaEnvelope, FaPhone, FaBuilding, FaMoneyBillWave, FaCreditCard, FaComment, FaFileUpload, FaTimes, FaSpinner } from 'react-icons/fa';
import axiosInstance from '../config';
import { toast } from 'react-toastify';
import { RequiredAsterisk } from './ManageSupplier';

interface Supplier {
  SupplierId: number;
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
}

interface EditSupplierModalProps {
  supplier: Supplier;
  onClose: () => void;
  onSuccess: () => void;
  modifiedBy: string;
}

const EditSupplierModal: React.FC<EditSupplierModalProps> = ({ supplier, onClose, onSuccess, modifiedBy }) => {
  const [formData, setFormData] = useState({
    name: supplier.Name,
    email: supplier.Email,
    phoneNo: supplier.PhoneNo,
    address: supplier.Address,
    amount: supplier.Amount.toString(),
    bankName: supplier.BankName,
    accountNo: supplier.AccountNo,
    ifscCode: supplier.IFSCCode,
    comment: supplier.Comment,
    files: [] as File[],
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.name) newErrors.name = 'Name is required';
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
    data.append('modifiedBy', modifiedBy);
    formData.files.forEach((file) => {
      data.append('files', file);
    });

    try {
      const response = await axiosInstance.put(`/supplier/${supplier.SupplierId}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success(response.data.message, { position: 'top-right', autoClose: 3000 });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error updating supplier:', err);
      toast.error(err.response?.data?.message || 'Failed to update supplier', {
        position: 'top-right',
        autoClose: 3000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity duration-300">
      <div className="bg-white dark:bg-gray-900 rounded-xl p-3 w-full max-w-2xl mx-2 transform transition-all duration-300 scale-95 sm:scale-100 shadow-lg relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-red-700 dark:text-gray-400 dark:hover:text-gray-200 transition duration-150 z-10"
        >
          <FaTimes className="w-6 h-6 mr-3 mt-2" />
        </button>
        <h2 className="text-lg font-semibold mb-3 bg-gradient-to-r from-indigo-200 to-blue-200 p-1 rounded text-black dark:text-gray-100 flex items-center gap-1">
          <FaUserPlus className="text-indigo-600" />
          Edit Supplier
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
                id="file-upload-edit"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => document.getElementById('file-upload-edit')?.click()}
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
            onClick={onClose}
            className="px-4 py-1 text-sm font-medium text-black dark:text-gray-200 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition duration-150"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-1 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-150 flex items-center gap-1 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <FaSpinner className="animate-spin w-4 h-4" />
                Updating...
              </>
            ) : (
              'Update'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditSupplierModal;