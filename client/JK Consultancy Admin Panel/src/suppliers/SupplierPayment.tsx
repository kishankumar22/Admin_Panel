import React from 'react';
import Breadcrumb from '../components/Breadcrumbs/Breadcrumb';
import { FaUserPlus } from 'react-icons/fa';

const SupplierPayment: React.FC = () => {
    return (
        <>
        <Breadcrumb pageName="Suppliers Payment" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 mb-4 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md gap-2">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <FaUserPlus className="text-indigo-600 w-5 h-5" />
            <span>Payment List:</span>
            <span className="font-medium text-indigo-700 dark:text-indigo-400">11</span>
          </h3>
        
          <button
            className="flex items-center gap-1 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {/* Payment icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <rect x="2" y="6" width="20" height="13" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
              <path d="M2 10h20" stroke="currentColor" strokeWidth="2"/>
              <circle cx="7" cy="14" r="1.5" fill="currentColor"/>
            </svg>
            Supplier Payment
          </button>
        </div>
         
        </>
    );
};

export default SupplierPayment;