import React from 'react';
import { FaTimes } from 'react-icons/fa';

interface PaymentHistory {
  ExpensePaymentID: number;
  amount: number;
  mode: string;
  transactionNo: string | null;
  receivedDate: string;
  receivedBy: string;
  createdBy: string;
  createdOn: string;
  paymentImage: string | null;
  comment: string | null;
}

interface PaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentHistory: PaymentHistory[];
  supplierName: string;
  expenseId: number | null;
}

const PaymentHistoryModal: React.FC<PaymentHistoryModalProps> = ({
  isOpen,
  onClose,
  paymentHistory,
  supplierName,
  expenseId,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity duration-300">
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-4xl mx-2 shadow-lg relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition duration-150"
        >
          <FaTimes className="w-5 h-5" />
        </button>

        {/* Header */}
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">
          Payment History for Expense ID: {expenseId} ({supplierName})
        </h3>

        {/* Payment History Table */}
        <div className="overflow-x-auto rounded-lg shadow-md">
          <table className="min-w-full text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <thead>
              <tr className="bg-indigo-600 text-white">
                {[
                  'Amount',
                  'Mode',
                  'Trans #',
                  'Received Date',
                  'Received By',
                  'Created By',
                  'Created On',
                  'Comment',
                  'Payment Slip',
                ].map((title) => (
                  <th
                    key={title}
                    className="py-2 px-3 text-left font-semibold whitespace-nowrap"
                  >
                    {title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paymentHistory.length > 0 ? (
                paymentHistory.map((history, index) => (
                  <tr
                    key={history.ExpensePaymentID}
                    className={`border-b border-gray-200 dark:border-gray-700 transition duration-150 ${
                      index % 2 === 0
                        ? 'bg-gray-50 dark:bg-gray-800'
                        : 'bg-white dark:bg-gray-900'
                    } hover:bg-indigo-50 dark:hover:bg-gray-700`}
                  >
                    <td className="py-2 px-3 text-gray-800 dark:text-gray-200 whitespace-nowrap">
                      ₹{history.amount.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-gray-800 dark:text-gray-200 whitespace-nowrap">
                      {history.mode}
                    </td>
                    <td className="py-2 px-3 text-gray-800 dark:text-gray-200 whitespace-nowrap">
                      {history.transactionNo || '-'}
                    </td>
                    <td className="py-2 px-3 text-gray-800 dark:text-gray-200 whitespace-nowrap">
                      {history.receivedDate}
                    </td>
                    <td className="py-2 px-3 text-gray-800 dark:text-gray-200 whitespace-nowrap">
                      {history.receivedBy}
                    </td>
                    <td className="py-2 px-3 text-gray-800 dark:text-gray-200 whitespace-nowrap">
                      {history.createdBy}
                    </td>
                    <td className="py-2 px-3 text-gray-800 dark:text-gray-200 whitespace-nowrap">
                      {history.createdOn}
                    </td>
                    <td className="py-2 px-3 text-gray-800 dark:text-gray-200 whitespace-nowrap">
                      {history.comment || '-'}
                    </td>
                    <td className="py-2 px-3 text-gray-800 dark:text-gray-200 whitespace-nowrap">
                      {history.paymentImage ? (
                        <a
                          href={history.paymentImage}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          View Slip
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={9}
                    className="py-3 text-center text-gray-600 dark:text-gray-400 text-xs"
                  >
                    No payment history available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaymentHistoryModal;