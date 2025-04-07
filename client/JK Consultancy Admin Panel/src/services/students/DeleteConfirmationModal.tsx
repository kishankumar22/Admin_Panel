import React from 'react';
import { FaTimes, FaExclamationTriangle } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface DeleteConfirmationModalProps {
  onClose: () => void;
  onConfirm: () => Promise<void>; // Changed to async function
  message: string;
  isDeleting?: boolean;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ 
  onClose, 
  onConfirm,
  message,
  isDeleting = false
}) => {
  const handleDelete = async () => {
    try {
      await onConfirm();
      toast.success('Deleted successfully!', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      onClose(); // Close the modal after successful deletion
    } catch (error) {
      toast.error('Failed to delete. Please try again.', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  };

  return (
    <>
      <ToastContainer />
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <FaExclamationTriangle className="text-red-500 mr-2" />
              <h2 className="text-xl font-bold">Confirm Deletion</h2>
            </div>
            <button 
              onClick={onClose} 
              className="text-gray-500 hover:text-gray-700"
              disabled={isDeleting}
            >
              <FaTimes />
            </button>
          </div>

          <p className="mb-6">{message}</p>

          <div className="flex justify-end space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-red-300"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default DeleteConfirmationModal;