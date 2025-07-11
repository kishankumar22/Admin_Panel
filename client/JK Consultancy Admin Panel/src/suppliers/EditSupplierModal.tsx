import React, { useState, useEffect } from 'react';
import {
  FaUserPlus,
  FaEnvelope,
  FaPhone,
  FaBuilding,
  FaCreditCard,
  FaComment,
  FaFileUpload,
  FaTimes,
  FaSpinner,
  FaEye,
} from 'react-icons/fa';
import axiosInstance from '../config';
import { toast } from 'react-toastify';
import { RequiredAsterisk } from './ManageSupplier';
import DocumentViewerModal from './DocumentViewerModal';

interface Document {
  DocumentId: number;
  SupplierId: number;
  DocumentUrl: string;
  PublicId: string;
  CreatedOn: string;
  DocumentType: string;
}

interface Supplier {
  SupplierId: number;
  Name: string;
  Email: string;
  PhoneNo: string;
  Address: string;
  BankName: string;
  AccountNo: string;
  IFSCCode: string;
  Comment: string;
}

interface EditSupplierModalProps {
  supplier: Supplier;
  onClose: () => void;
  onSuccess: () => void;
  modifiedBy: string;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error in EditSupplierModal:', error, errorInfo);
    toast.error('An error occurred while rendering the modal', {
      position: 'top-right',
      autoClose: 1500,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-red-500">
          <p>Something went wrong. Please try again or contact support.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const EditSupplierModal: React.FC<EditSupplierModalProps> = ({
  supplier,
  onClose,
  onSuccess,
  modifiedBy,
}) => {
  const [formData, setFormData] = useState({
    name: supplier.Name || '',
    email: supplier.Email || '',
    phoneNo: supplier.PhoneNo || '',
    address: supplier.Address || '',
    bankName: supplier.BankName || '',
    accountNo: supplier.AccountNo || '',
    ifscCode: supplier.IFSCCode || '',
    comment: supplier.Comment || '',
    files: [] as File[],
  });
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<{ [key: string]: boolean }>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [viewDocument, setViewDocument] = useState<Document | null>(null);

  // Fetch documents when modal opens
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        if (!supplier.SupplierId) {
          throw new Error('SupplierId is missing');
        }
        const response = await axiosInstance.get(`/supplier/${supplier.SupplierId}/documents`);
        setDocuments(response.data.documents || []);
      } catch (error) {
        console.error('Error fetching documents:', error);
        toast.error('Failed to fetch documents', { position: 'top-right', autoClose: 3000 });
        setDocuments([]);
      }
    };
    fetchDocuments();
  }, [supplier.SupplierId]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.phoneNo) newErrors.phoneNo = 'Phone number is required';
    else if (!/^\d{10}$/.test(formData.phoneNo)) newErrors.phoneNo = 'Phone number must be 10 digits';
    if (!formData.address) newErrors.address = 'Address is required';
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

  const handleDeleteDocument = async (publicId: string, isLocal: boolean) => {
    setIsDeleting((prev) => ({ ...prev, [publicId]: true }));
    try {
      const endpoint = isLocal
        ? `/documents/local/${encodeURIComponent(publicId)}`
        : `/documents/${encodeURIComponent(publicId)}`;
      const response = await axiosInstance.delete(endpoint);
      setDocuments((prev) => prev.filter((doc) => doc.PublicId !== publicId));
      toast.success(response.data.message || 'Document deleted successfully', {
        position: 'top-right',
        autoClose: 1500,
      });
    } catch (error: any) {
      console.error('Error deleting document:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete document';
      toast.error(errorMessage, { position: 'top-right', autoClose: 1500 });
    } finally {
      setIsDeleting((prev) => ({ ...prev, [publicId]: false }));
    }
  };

  const handleViewDocument = (doc: Document) => {
    setViewDocument(doc);
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
    data.append('modifiedBy', modifiedBy);
    formData.files.forEach((file) => {
      data.append('files', file);
    });

    try {
      const response = await axiosInstance.put(`/supplier/${supplier.SupplierId}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        // Refresh documents after successful update
        const fetchDocuments = async () => {
          const response = await axiosInstance.get(`/supplier/${supplier.SupplierId}/documents`);
          setDocuments(response.data.documents || []);
        };
        await fetchDocuments();
        toast.success('Supplier updated successfully', { position: 'top-right', autoClose: 1000 });
        onSuccess();
        onClose();
      } else {
        toast.error(response.data.message || 'Failed to update supplier', {
          position: 'top-right',
          autoClose: 1500,
        });
      }
    } catch (error: any) {
      console.error('Error updating supplier:', error);
      toast.error(error.response?.data?.message || 'Error updating supplier', {
        position: 'top-right',
        autoClose: 1500,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDocumentPreview = (doc: Document) => {
    const isLocal = doc.DocumentUrl.startsWith('/SupplierDocs');
    const url = isLocal ? `http://localhost:3002/api${doc.DocumentUrl}` : doc.DocumentUrl;
    const isImage = ['jpg', 'jpeg', 'png', 'gif'].includes(doc.DocumentType.toLowerCase());
    const isPdf = doc.DocumentType.toLowerCase() === 'pdf';

    return (
      <div className="flex items-center gap-1">
        {isImage ? (
          <img src={url} alt="Document" className="w-8 h-8 object-cover rounded" />
        ) : isPdf ? (
          <span className="text-blue-600">PDF</span>
        ) : (
          <span className="text-blue-600">File</span>
        )}
      </div>
    );
  };

  return (
    <ErrorBoundary>
      <div className="fixed inset-0 bg-black bg-opacity-60 top-6 flex items-center justify-center z-50 transition-opacity duration-300">
        <div className="bg-white dark:bg-gray-900 rounded-xl p-3 w-full max-w-5xl mx-2 transform transition-all duration-300 scale-95 sm:scale-100 shadow-lg relative">
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
                  Bank Name
                </label>
                <input
                  type="text"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleInputChange}
                  className={`w-full p-1 text-sm rounded-md border ${
                    errors.bankName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white transition duration-150`}
                />
                {errors.bankName && <p className="text-red-500 text-xs mt-0.5">{errors.bankName}</p>}
              </div>
              <div className="mb-2">
                <label className="flex items-center gap-1 text-xs font-medium text-black dark:text-gray-200 mb-1">
                  <FaCreditCard className="text-indigo-500" />
                  Account No.
                </label>
                <input
                  type="text"
                  name="accountNo"
                  value={formData.accountNo}
                  onChange={handleInputChange}
                  className={`w-full p-1 text-sm rounded-md border ${
                    errors.accountNo ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white transition duration-150`}
                />
                {errors.accountNo && <p className="text-red-500 text-xs mt-0.5">{errors.accountNo}</p>}
              </div>
              <div className="mb-2">
                <label className="flex items-center gap-1 text-xs font-medium text-black dark:text-gray-200 mb-1">
                  <FaCreditCard className="text-indigo-500" />
                  IFSC Code
                </label>
                <input
                  type="text"
                  name="ifscCode"
                  value={formData.ifscCode}
                  onChange={handleInputChange}
                  className={`w-full p-1 text-sm rounded-md border ${
                    errors.ifscCode ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white transition duration-150`}
                />
                {errors.ifscCode && <p className="text-red-500 text-xs mt-0.5">{errors.ifscCode}</p>}
              </div>
            </div>
            <div className="mb-2">
              <label className="flex items-center gap-1 text-xs font-medium text-black dark:text-gray-200 mb-1">
                <FaComment className="text-indigo-500" />
                Comment
              </label>
              <textarea
                name="comment"
                value={formData.comment}
                onChange={handleInputChange}
                className={`w-full p-1 text-sm rounded-md border ${
                  errors.comment ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                } focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white transition duration-150`}
                rows={2}
              />
              {errors.comment && <p className="text-red-500 text-xs mt-0.5">{errors.comment}</p>}
            </div>
            <div className="mb-2">
              <label className="flex items-center gap-1 text-xs font-medium text-black dark:text-gray-200 mb-1">
                <FaFileUpload className="text-indigo-500" />
                Upload Supplier Agreement Files
                {(formData.files.length > 0 || documents.length > 0) && (
                  <span className="ml-2 text-xs text-indigo-600">
                    ({formData.files.length + documents.length}{' '}
                    {formData.files.length + documents.length === 1 ? 'file' : 'files'})
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
                  accept="*/*"
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
              {(formData.files.length > 0 || documents.length > 0) && (
                <div className="mt-2 p-2 w-72 bg-gray-100 dark:bg-gray-800 rounded-md">
                  <ul className="space-y-2">
                    {documents.map((doc, index) => (
                      <li
                        key={`doc-${doc.DocumentId}`}
                        className="flex items-center justify-between gap-2 text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 p-2 rounded-md shadow-sm"
                      >
                        <span className="truncate">{index + 1}. </span>
                        <span className="truncate flex-1">
                          {doc.DocumentUrl.split('/').pop() || 'Document'}
                        </span>
                        <div className="flex items-center gap-2">
                          {renderDocumentPreview(doc)}
                          <button
                            type="button"
                            onClick={() => handleViewDocument(doc)}
                            className="text-blue-500 hover:text-blue-700 transition duration-150 flex-shrink-0"
                            title="View Document"
                          >
                            <FaEye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(doc.PublicId, doc.DocumentUrl.startsWith('/SupplierDocs'))}
                            disabled={isDeleting[doc.PublicId]}
                            className="text-red-500 hover:text-red-700 transition duration-150 flex-shrink-0 disabled:opacity-50"
                          >
                            {isDeleting[doc.PublicId] ? (
                              <FaSpinner className="animate-spin w-4 h-4" />
                            ) : (
                              <FaTimes className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </li>
                    ))}
                    {formData.files.map((file, index) => (
                      <li
                        key={`file-${index}`}
                        className="flex items-center justify-between gap-2 text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 p-2 rounded-md shadow-sm"
                      >
                        <span className="truncate">{documents.length + index + 1}. </span>
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
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-1 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-150 flex items-center gap-1 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className="animate-spin w-4 h-4" />
                  Submitting...
                </>
              ) : (
                'Update'
              )}
            </button>
          </div>
        </div>
      </div>
      {viewDocument && (
        <DocumentViewerModal
          document={viewDocument}
          onClose={() => setViewDocument(null)}
        />
      )}
    </ErrorBoundary>
  );
};

export default EditSupplierModal;