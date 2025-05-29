import React, { useState, useEffect, useCallback } from 'react';
import { FaTimes, FaSpinner } from 'react-icons/fa';
import axiosInstance from '../config';

interface Supplier {
  SupplierId: number;
  Name: string;
}

interface Expense {
  SuppliersExpenseID: number;
  SupplierId: number;
  SupplierName: string;
  Reason: string;
  ExpenseAmount: number;
  TotalPaid: number;
  RemainingAmount: number;
  Deleted: boolean;
}

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
  reason?: string;
}

interface SupplierPaymentProps {
  supplier: Supplier;
  onClose: () => void;
}

const SupplierPayment: React.FC<SupplierPaymentProps> = ({ supplier, onClose }) => {
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [filteredPaymentHistory, setFilteredPaymentHistory] = useState<PaymentHistory[]>([]);
  const [totals, setTotals] = useState<{
    TotalExpense: number;
    TotalPaid: number;
    TotalRemaining: number;
  }>({
    TotalExpense: 0,
    TotalPaid: 0,
    TotalRemaining: 0,
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>(''); // New state for fromDate
  const [toDate, setToDate] = useState<string>(''); // New state for toDate

  // Fetch supplier expenses and payment history
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null); // Reset error state before fetching
    try {
      // Fetch expenses to calculate totals
      const expensesResponse = await axiosInstance.get(`/supplier/${supplier.SupplierId}/payments`);
      const expenses: Expense[] = expensesResponse.data.expenses;

      // Calculate totals
      const totalExpense = expenses.reduce((sum, expense) => sum + expense.ExpenseAmount, 0);
      const totalPaid = expenses.reduce((sum, expense) => sum + expense.TotalPaid, 0);
      const totalRemaining = expenses.reduce((sum, expense) => sum + expense.RemainingAmount, 0);
      setTotals({ TotalExpense: totalExpense, TotalPaid: totalPaid, TotalRemaining: totalRemaining });

      // Fetch payment history with search term and date range
      const historyResponse = await axiosInstance.get(`/supplier/${supplier.SupplierId}/paymentsHistory`, {
        params: {
          reason: searchTerm || undefined,
          fromDate: fromDate || undefined, // Include fromDate in params
          toDate: toDate || undefined, // Include toDate in params
        },
      });

      const history: PaymentHistory[] = historyResponse.data.map((payment: any) => ({
        ExpensePaymentID: payment.ExpensePaymentID,
        amount: payment.PaidAmount,
        mode: payment.PaymentMode,
        transactionNo: payment.TransactionId,
        receivedDate: new Date(payment.PaymentDate).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit',
        }),
        receivedBy: payment.CreatedBy,
        createdBy: payment.CreatedBy,
        createdOn: new Date(payment.CreatedOn).toLocaleString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }).replace(',', ''),
        paymentImage: payment.PaymentImage,
        comment: payment.Comment || '',
        reason: payment.Reason || '',
      }));

      setPaymentHistory(history);
      setFilteredPaymentHistory(history);
    } catch (err) {
      setError('Failed to fetch data'); // Only set error on actual fetch failure
      setPaymentHistory([]);
      setFilteredPaymentHistory([]);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [supplier.SupplierId, searchTerm, fromDate, toDate]); // Add fromDate and toDate to dependencies

  // Initial fetch and re-fetch on search term or date change
  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(debounce);
  }, [fetchData]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-4 w-full max-w-6xl  shadow-lg">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition"
        >
          <FaTimes className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Header */}
        <h2 className="text-lg sm:text-xl font-semibold mb-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-1.5 px-3 rounded-md">
         Payment History For   {supplier.Name}
           <button
            onClick={onClose}
            className="ml-2 align-middle text-red-600 hover:text-red-800 transition inline-block"
            title="Close"
            style={{ verticalAlign: 'middle', float: 'right' }} 
            >
            <FaTimes className="w-5 h-5" />
            </button>
        </h2>

        {/* Search, Date Filters, and Totals */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search by reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-1 focus:ring-blue-500 w-full sm:w-48"
            />
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-1 focus:ring-blue-500 w-full sm:w-36"
              />
              <span className="text-gray-600 dark:text-gray-400 text-sm">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-1 focus:ring-blue-500 w-full sm:w-36"
              />
            </div>
          </div>

          {/* Totals */}
          <div className="flex flex-wrap gap-2 text-xs sm:text-[.783rem] bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-200">Total Expense Amount: </span>
              <span className="font-semibold text-gray-900 dark:text-white">₹{totals.TotalExpense.toFixed(2)}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-200">Total Paid Amount: </span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">₹{totals.TotalPaid.toFixed(2)}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-200">Total Remaining Amount: </span>
              <span className="font-semibold text-red-600 dark:text-red-400">₹{totals.TotalRemaining.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment History Table */}
        <div className="overflow-x-auto rounded-lg shadow-sm">
          <table className="min-w-full text-xs sm:text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                <th className="py-2 px-2 sm:px-3 text-left font-semibold">Reason</th>
                <th className="py-2 px-2 sm:px-3 text-left font-semibold">Amount</th>
                <th className="py-2 px-2 sm:px-3 text-left font-semibold">Mode</th>
                <th className="py-2 px-2 sm:px-3 text-left font-semibold">Trans #</th>
                <th className="py-2 px-2 sm:px-3 text-left font-semibold">Received Dt.</th>
                <th className="py-2 px-2 sm:px-3 text-left font-semibold">Received By</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-gray-600 dark:text-gray-400">
                    <FaSpinner className="animate-spin w-5 h-5 sm:w-6 sm:h-6 mx-auto" />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="py-2 text-center text-red-600 dark:text-red-400">
                    {/* {error} */}
                  </td>
                </tr>
              ) : filteredPaymentHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-2 text-center text-gray-600 dark:text-gray-400">
                    {searchTerm || fromDate || toDate ? 'No search found' : 'No payment history found'}
                  </td>
                </tr>
              ) : (
                filteredPaymentHistory.map((payment) => (
                  <tr
                    key={payment.ExpensePaymentID}
                    className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <td className="py-2 px-2 sm:px-3">{payment.reason}</td>
                    <td className="py-2 px-2 sm:px-3">₹{payment.amount.toFixed(2)}</td>
                    <td className="py-2 px-2 sm:px-3">{payment.mode}</td>
                    <td className="py-2 px-2 sm:px-3">{payment.transactionNo || '-'}</td>
                    <td className="py-2 px-2 sm:px-3">{payment.receivedDate}</td>
                    <td className="py-2 px-2 sm:px-3">{payment.receivedBy}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Cancel Button */}
        <div className="mt-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-1 focus:ring-red-500 transition text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupplierPayment;