import React from 'react';
import { FaTimes, FaExclamationTriangle } from 'react-icons/fa';

interface DeleteConfirmationModalProps {
  onClose: () => void;
  onConfirm: () => void;
  message: string;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ 
  onClose, 
  onConfirm,
  message
}) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <FaExclamationTriangle className="text-red-500 mr-2" />
            <h2 className="text-xl font-bold">Confirm Deletion</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FaTimes />
          </button>
        </div>

        <p className="mb-6">{message}</p>

        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;