import { useState, useEffect } from 'react';
import axiosInstance from '../../config';
import { FaSpinner, FaReply, FaTimes, FaSearch, FaFilter } from 'react-icons/fa';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { user } = useAuth();
  
  const modifiedBy = user?.name || null;

  // Fetch enquiries from API
  useEffect(() => {
    const fetchEnquiries = async () => {
      try {
        setLoading(true);
        setShowLoading(true);
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
          setShowLoading(false);
        }, 300);
      }
    };

    fetchEnquiries();
  }, []);

  // Get unique courses for filter
  const uniqueCourses = ['all', ...new Set(enquiries.map(enquiry => enquiry.course))];

  // Apply filters when dependencies change
  useEffect(() => {
    const filterEnquiries = () => {
      setIsFilterLoading(true);
      let filtered = [...enquiries];

      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(enquiry =>
          enquiry.fullName.toLowerCase().includes(query) ||
          enquiry.mobileNumber.includes(query) ||
          enquiry.email.toLowerCase().includes(query)
        );
      }

      // Apply course filter
      if (courseFilter !== 'all') {
        filtered = filtered.filter(enquiry => enquiry.course === courseFilter);
      }

      // Apply date range filter
      if (startDate && endDate) {
        filtered = filtered.filter(enquiry => {
          const createdDate = new Date(enquiry.createdAt);
          return (
            createdDate >= new Date(startDate) &&
            createdDate <= new Date(endDate + 'T23:59:59.999Z')
          );
        });
      }

      // Apply status filter
      if (activeFilter === 'pending') {
        filtered = filtered.filter(enquiry => !enquiry.isContacted);
      } else if (activeFilter === 'resolved') {
        filtered = filtered.filter(enquiry => enquiry.isContacted);
      }

      setFilteredEnquiries(filtered);
      setTimeout(() => setIsFilterLoading(false), 300);
    };

    filterEnquiries();
  }, [activeFilter, searchQuery, courseFilter, startDate, endDate, enquiries]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setCourseFilter('all');
    setStartDate('');
    setEndDate('');
    setActiveFilter('all');
  };

  const handleReplyClick = (enquiry: CourseEnquiryData) => {
    setSelectedEnquiry(enquiry);
    setShowReplyModal(true);
    setReplyMessage('');
  };

  const handleSendReply = async () => {
    if (!selectedEnquiry || !replyMessage.trim()) return;
    
    setReplySending(true);
    try {
      const response = await axiosInstance.post('/updateEnquiryStatus', {
        id: selectedEnquiry.id,
        isContacted: true,
        modifiedAt: new Date().toISOString(),
        modifiedby: modifiedBy
      });
      
      const emailResponse = await axiosInstance.post('/sendEnquiryReply', {
        to: selectedEnquiry.email,
        subject: `Reply to your enquiry about ${selectedEnquiry.course}`,
        message: replyMessage,
        enquiryId: selectedEnquiry.id
      });
      
      if (response.data && emailResponse.data) {
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
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="flex flex-col items-center space-y-1">
          <FaSpinner className="animate-spin text-3xl text-blue-600" />
          <div className="text-base font-medium text-gray-800">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 bg-red-50 rounded-lg mt-2 text-red-700 max-w-xl mx-auto">
        <h2 className="text-lg font-semibold mb-1">Error</h2>
        <p className="mb-2 text-sm">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-blue-600 text-white py-1 px-3 rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="">
      <Breadcrumb pageName="Manage Queries" />
      
      {/* Filters Section */}
      <div className="bg-white shadow-sm rounded-lg p-2 mb-4">
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
          {/* Search Box */}
          <div className="relative w-full sm:w-1/3">
            <FaSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, mobile, or email..."
              className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm text-gray-800"
              title="Search enquiries by name, mobile number, or email"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {/* Course Filter */}
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm text-gray-800"
             title='Filter by course name'
            >
              {uniqueCourses.map(course => (
                <option key={course} value={course}>
                  {course === 'all' ? 'All Courses' : course}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as FilterType)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm text-gray-800"
            title='Filter by enquiry status'
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
            </select>

            {/* Date Range Filter */}
            <div className="flex gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm text-gray-800"
                title='Filter by start date'
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm text-gray-800"
                title='Filter by end date'
              />
            </div>

            {/* Clear Filters */}
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors flex items-center text-sm"
            title='Clear all filters'
            >
              <FaFilter className="mr-1" size={12} />
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Counts Display */}
      <div className="mb-2 text-gray-800 text-sm">
        Showing <span className="font-semibold">{filteredEnquiries.length}</span> of{' '}
        <span className="font-semibold">{enquiries.length}</span> enquiries
      </div>

      {/* Enquiries Table */}
      <div className="w-full">
        {isFilterLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="flex flex-col items-center space-y-1">
              <FaSpinner className="animate-spin text-blue-600 text-4xl" />
              <span className="text-sm text-gray-800">Filtering...</span>
            </div>
          </div>
        ) : filteredEnquiries.length === 0 ? (
          <div className="text-center p-4 bg-gray-100 rounded-lg text-gray-800 text-sm">
            No enquiries found.
          </div>
        ) : (
          <div className="overflow-x-auto shadow-sm rounded-lg bg-white">
            <table className="min-w-full">
              <thead>
                <tr className="bg-blue-600 text-white text-sm font-semibold">
                  <th className="py-2 px-3 text-left">ID</th>
                  <th className="py-2 px-3 text-left">Full Name</th>
                  <th className="py-2 px-3 text-left">Mobile</th>
                  <th className="py-2 px-3 text-left">Email</th>
                  <th className="py-2 px-3 text-left">Course</th>
                  <th className="py-2 px-3 text-left">Status</th>
                  <th className="py-2 px-3 text-left">Created At</th>
                  <th className="py-2 px-3 text-left">Modified At</th>
                  <th className="py-2 px-3 text-left">Modified By</th>
                  <th className="py-2 px-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEnquiries.map((enquiry, index) => (
                  <tr 
                    key={enquiry.id}
                    className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-gray-200 transition-colors`}
                  >
                    <td className="py-2 px-3 text-sm text-gray-800">{index+1}</td>
                    <td className="py-2 px-3 text-sm text-gray-800">{enquiry.fullName}</td>
                    <td className="py-2 px-3 text-sm text-gray-800">{enquiry.mobileNumber}</td>
                    <td className="py-2 px-3 text-sm text-gray-800">{enquiry.email}</td>
                    <td className="py-2 px-3 text-sm text-gray-800">{enquiry.course}</td>
                    <td className="py-2 px-3 text-sm">
                      <span 
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          enquiry.isContacted 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {enquiry.isContacted ? 'Contacted' : 'Pending'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-sm text-gray-800">
                      {new Date(enquiry.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2 px-3 text-sm text-gray-800">
                      {enquiry.modifiedAt ? new Date(enquiry.modifiedAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-2 px-3 text-sm text-gray-800">
                      {enquiry.modifiedby || '-'}
                    </td>
                    <td className="py-2 px-3 text-sm">
                      <button
                        onClick={() => handleReplyClick(enquiry)}
                        className="flex items-center bg-blue-100 text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-200 transition-colors text-xs"
                      >
                        <FaReply className="mr-1" size={10} />
                        Reply
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
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-4">
            <button 
              onClick={closeModal}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              <FaTimes size={16} />
            </button>
            
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Reply to Enquiry</h3>
            
            <div className="mb-3 text-sm text-gray-600">
              <div className="mb-1"><strong>To:</strong> {selectedEnquiry.fullName} ({selectedEnquiry.email})</div>
              <div><strong>Course:</strong> {selectedEnquiry.course}</div>
            </div>
            
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Reply</label>
              <textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[100px] text-sm text-gray-800"
                placeholder="Type your reply here..."
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={closeModal}
                className="px-3 py-1.5 text-sm text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendReply}
                disabled={replySending || !replyMessage.trim()}
                className={`px-3 py-1.5 text-sm text-white rounded-lg ${
                  replySending || !replyMessage.trim()
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                } transition-colors flex items-center`}
              >
                {replySending ? (
                  <>
                    <FaSpinner className="animate-spin mr-1" size={12} />
                    Sending...
                  </>
                ) : (
                  'Send'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseEnquiry;