import { useState, useEffect } from 'react';
import axiosInstance from '../../config';
import { FaSpinner, FaReply, FaTimes } from 'react-icons/fa';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import { useAuth } from '../../context/AuthContext';

// Define TypeScript interface for the enquiry data
interface CourseEnquiryData {
  id: number;
  fullName: string;
  mobileNumber: string;
  email: string;
  course: string;
  isContacted: boolean;
  createdAt: string;
  modifiedAt: string | null;
  modifiedby: string | null;
}

type FilterType = 'all' | 'pending' | 'resolved';

const CourseEnquiry = () => {
  const [enquiries, setEnquiries] = useState<CourseEnquiryData[]>([]);
  const [filteredEnquiries, setFilteredEnquiries] = useState<CourseEnquiryData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [showLoading, setShowLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState<CourseEnquiryData | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const { user } = useAuth();
  
  const modifiedBy = user?.name || null;

  useEffect(() => {
    const fetchEnquiries = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get('/getCourseEnquiry');
        
        if (response.data && response.data.data) {
          setEnquiries(response.data.data);
          setFilteredEnquiries(response.data.data);
        }
      } catch (err) {
        setError('Failed to fetch enquiries. Please try again later.');
        console.error('Error fetching enquiries:', err);
      } finally {
        setTimeout(() => {
          setLoading(false);
        }, 300);
        const minLoadingTime = setTimeout(() => {
          setShowLoading(false);
        }, 300);
        return () => clearTimeout(minLoadingTime);
      }
    };

    fetchEnquiries();
  }, []);

  // Filter enquiries when active filter changes
  useEffect(() => {
    const filterEnquiries = () => {
      setIsFilterLoading(true);
      if (activeFilter === 'all') {
        setFilteredEnquiries(enquiries);
      } else if (activeFilter === 'pending') {
        setFilteredEnquiries(enquiries.filter(enquiry => !enquiry.isContacted));
      } else {
        setFilteredEnquiries(enquiries.filter(enquiry => enquiry.isContacted));
      }
      setTimeout(() => setIsFilterLoading(false), 300);
    };

    filterEnquiries();
  }, [activeFilter, enquiries]);

  const handleReplyClick = (enquiry: CourseEnquiryData) => {
    setSelectedEnquiry(enquiry);
    setShowReplyModal(true);
    setReplyMessage('');
  };

  const handleSendReply = async () => {
    if (!selectedEnquiry || !replyMessage.trim()) return;
    
    setReplySending(true);
    try {
      // Update the isContacted status in the backend
      const response = await axiosInstance.post('/updateEnquiryStatus', {
        id: selectedEnquiry.id,
        isContacted: true,
        modifiedAt: new Date().toISOString(),
        modifiedby: modifiedBy
      });
      
      // Send the email reply
      const emailResponse = await axiosInstance.post('/sendEnquiryReply', {
        to: selectedEnquiry.email,
        subject: `Reply to your enquiry about ${selectedEnquiry.course}`,
        message: replyMessage,
        enquiryId: selectedEnquiry.id
      });
      
      if (response.data && emailResponse.data) {
        // Update the local state to reflect changes
        const updatedEnquiries = enquiries.map(enquiry => {
          if (enquiry.id === selectedEnquiry.id) {
            return {
              ...enquiry,
              isContacted: true,
              modifiedAt: new Date().toISOString(),
              modifiedby: modifiedBy
            };
          }
          return enquiry;
        });
        
        setEnquiries(updatedEnquiries);
        setShowReplyModal(false);
        setSelectedEnquiry(null);
        setReplyMessage('');
      }
    } catch (err) {
      console.error('Error sending reply:', err);
      alert('Failed to send reply. Please try again.');
    } finally {
      setReplySending(false);
    }
  };

  const closeModal = () => {
    setShowReplyModal(false);
    setSelectedEnquiry(null);
    setReplyMessage('');
  };

  if (loading || showLoading) {
    return (
      <div className="flex justify-center -m-4 items-center h-screen bg-gradient-to-br from-blue-200 via-purple-100 to-pink-100">
        <div className="flex flex-col items-center ">
          <FaSpinner className="animate-spin text-4xl text-purple-600" />
          <div className="text-xl font-semibold text-purple-700">Loading, please wait...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 bg-red-50 rounded-lg mt-4 text-red-700">
        <h2 className="text-lg font-semibold mb-1">Error</h2>
        <p className="mb-3 text-sm">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-blue-600 text-white py-1.5 px-3 rounded text-sm hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <Breadcrumb pageName="Course Queries"/>
      
      {/* Filter Buttons */}
      <div className="flex space-x-2 mt-2 mb-4">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeFilter === 'all' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          All Queries ({enquiries.length})
        </button>
        <button
          onClick={() => setActiveFilter('pending')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeFilter === 'pending' 
              ? 'bg-yellow-500 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Pending ({enquiries.filter(e => !e.isContacted).length})
        </button>
        <button
          onClick={() => setActiveFilter('resolved')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeFilter === 'resolved' 
              ? 'bg-green-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Resolved ({enquiries.filter(e => e.isContacted).length})
        </button>
      </div>
      
      <div className="mt-2 w-full">
        {isFilterLoading ? (
       <div className="flex justify-center items-center py-12">
  <div className="flex flex-col items-center space-y-2">
    <FaSpinner className="animate-spin text-purple-600 text-5xl" />
    <span className="text-sm text-gray-500">Loading, please wait...</span>
  </div>
</div>

        ) : filteredEnquiries.length === 0 ? (
          <div className="text-center p-4 bg-gray-100 rounded-lg">
            <p className="text-gray-600 text-sm">No enquiries found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto shadow-md rounded-lg bg-white">
            <table className="min-w-full">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="py-2.5 px-3 text-left text-sm font-semibold">ID</th>
                  <th className="py-2.5 px-3 text-left text-sm font-semibold">Full Name</th>
                  <th className="py-2.5 px-3 text-left text-sm font-semibold">Mobile Number</th>
                  <th className="py-2.5 px-3 text-left text-sm font-semibold">Email</th>
                  <th className="py-2.5 px-3 text-left text-sm font-semibold">Course</th>
                  <th className="py-2.5 px-3 text-left text-sm font-semibold">Status</th>
                  <th className="py-2.5 px-3 text-left text-sm font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEnquiries.map((enquiry) => (
                  <tr 
                    key={enquiry.id}
                    className="border-b hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-2.5 px-3 text-sm">{enquiry.id}</td>
                    <td className="py-2.5 px-3 text-sm">{enquiry.fullName}</td>
                    <td className="py-2.5 px-3 text-sm">{enquiry.mobileNumber}</td>
                    <td className="py-2.5 px-3 text-sm">{enquiry.email}</td>
                    <td className="py-2.5 px-3 text-sm">{enquiry.course}</td>
                    <td className="py-2.5 px-3 text-sm">
                      <span 
                        className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                          enquiry.isContacted 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {enquiry.isContacted ? 'Contacted' : 'Pending'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-sm">
                      <button
                        onClick={() => handleReplyClick(enquiry)}
                        className="flex items-center bg-blue-100 text-blue-700 px-3 py-1.5 rounded hover:bg-blue-200 transition-colors"
                      >
                        <FaReply className="mr-1.5" size={12} />
                        <span>Reply</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reply Modal */}
      {showReplyModal && selectedEnquiry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
            <button 
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <FaTimes size={20} />
            </button>
            
            <h3 className="text-xl font-semibold mb-4">Reply to Queries</h3>
            
            <div className="mb-4">
              <div className="mb-2 text-sm text-gray-600">
                <strong>To:</strong> {selectedEnquiry.fullName} ({selectedEnquiry.email})
              </div>
              <div className="mb-2 text-sm text-gray-600">
                <strong>Course:</strong> {selectedEnquiry.course}
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Reply
              </label>
              <textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
                placeholder="Type your reply here..."
              />
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={closeModal}
                className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendReply}
                disabled={replySending || !replyMessage.trim()}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                  replySending || !replyMessage.trim()
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                } transition-colors flex items-center`}
              >
                {replySending ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" size={14} />
                    Sending...
                  </>
                ) : (
                  'Send Reply'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CourseEnquiry;