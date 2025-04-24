import { useState } from "react";
import Breadcrumb from "../../components/Breadcrumbs/Breadcrumb";

const CashHandover: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openHandoverModal = () => {
    setIsModalOpen(true);
  };

  const closeHandoverModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <Breadcrumb pageName="Cash Handover" />
      <div className="container mx-auto p-4 max-w-2xl">
        {/* Payment List Table */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Payment Records</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-200">
                <tr>
                  <th className="py-2 px-4 border">Receipt No.</th>
                  <th className="py-2 px-4 border">Student Name</th>
                  <th className="py-2 px-4 border">Amount</th>
                  <th className="py-2 px-4 border">Received By</th>
                  <th className="py-2 px-4 border">Payment Date</th>
                  <th className="py-2 px-4 border">Status</th>
                  <th className="py-2 px-4 border">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-gray-50">
                  <td className="py-2 px-4 border">RCP-001</td>
                  <td className="py-2 px-4 border">Kishan</td>
                  <td className="py-2 px-4 border">₹10,000</td>
                  <td className="py-2 px-4 border">Rahul</td>
                  <td className="py-2 px-4 border">01-Jul-2023</td>
                  <td className="py-2 px-4 border">
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
                      Collected
                    </span>
                  </td>
                  <td className="py-2 px-4 border">
                    <button
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm"
                      onClick={openHandoverModal}
                    >
                      Cash Handover
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Handover Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">Cash Handover Details</h3>
                <button
                  onClick={closeHandoverModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Auto-filled Section */}
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-sm text-gray-500">Receipt No.</p>
                    <p className="font-medium">RCP-001</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Student</p>
                    <p className="font-medium">Kishan</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Amount</p>
                    <p className="font-medium">₹10,000</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Received By</p>
                    <p className="font-medium">Rahul</p>
                  </div>
                </div>
              </div>

              {/* Editable Form */}
              <form>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Handover To*
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select Staff</option>
                      <option value="2">Kausar (Accountant)</option>
                      <option value="3">Ramesh (Manager)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Handover Date*
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      defaultValue="2023-07-02"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Remarks
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Kishan का फीस"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      OTP*
                    </label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter 4-digit OTP"
                      required
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={closeHandoverModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Confirm Handover
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CashHandover;