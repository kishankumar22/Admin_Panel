import React from 'react';
import { FaTimes } from 'react-icons/fa';

interface SupplierPaymentProps {
  supplier: {
    SupplierId: number;
    Name: string;
  };
  onClose: () => void;
}

const SupplierPayment: React.FC<SupplierPaymentProps> = ({ supplier, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity duration-300">
      <div className="bg-white dark:bg-gray-900 rounded-xl p-3 w-full max-w-md mx-2 transform transition-all duration-300 scale-95 sm:scale-100 shadow-lg relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 mt-1 text-black hover:text-red-700 dark:text-gray-400 dark:hover:text-gray-200 transition duration-150 z-10"
        >
          <FaTimes className="w-6 h-6 mr-3 mt-1" />
        </button>
        <h2 className="text-base sm:text-lg font-semibold mb-4 px-3 py-1 rounded-md bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-500 text-white shadow">
          Supplier Details
        </h2>
        <div className="text-sm text-gray-800 dark:text-gray-200">
          <p><span className="font-medium">Supplier ID:</span> {supplier.SupplierId}</p>
          <p><span className="font-medium">Name:</span> {supplier.Name}</p>
        </div>
      </div>
    </div>
  );
};

export default SupplierPayment;