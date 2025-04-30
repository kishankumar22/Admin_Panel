import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import axiosInstance from '../../config';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Modal } from 'flowbite-react';
import { Loader1 } from '../../common/Loader/index';

interface PromoteStudentModalProps {
  studentId: number;
  onClose: () => void;
  onSuccess: () => void;
  modifiedBy: string;
}

interface StudentInfo {
  id: number;
  fName: string;
  lName: string;
  rollNumber: string;
  collegeName: string;
  courseName: string;
  isLateral: boolean;
}

interface AcademicHistory {
  id: number;
  courseYear: string;
  sessionYear: string;
  adminAmount: number;
  feesAmount: number;
  paymentMode: string;
  numberOfEMI?: number;
  ledgerNumber?: string;
  emiDetails?: Array<{
    emiNumber: number;
    amount: number;
    dueDate: string;
  }>;
}

interface PromotionFormData {
  academicId: number;
  currentCourseYear: string;
  currentSessionYear: string;
  newCourseYear: string;
  newSessionYear: string;
  adminAmount: number;
  feesAmount: number;
  paymentMode: string;
  numberOfEMI: number | null;
  ledgerNumber: string;
  emiDetails: Array<{ emiNumber: number; amount: number; dueDate: string }>;
  isDepromote: boolean;
  confirmLateralChange: boolean;
}

const PromoteStudentModal: React.FC<PromoteStudentModalProps> = ({ 
  studentId, 
  onClose, 
  onSuccess, 
  modifiedBy 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [academicHistory, setAcademicHistory] = useState<AcademicHistory[]>([]);
  const [emiDetails, setEmiDetails] = useState<Array<{ emiNumber: number; amount: number; dueDate: string }>>([]);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string>('');
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [courseYearOptions, setCourseYearOptions] = useState<string[]>([]);
  const [showLateralConfirmModal, setShowLateralConfirmModal] = useState(false);

  const [formData, setFormData] = useState<PromotionFormData>({
    academicId: 0,
    currentCourseYear: '',
    currentSessionYear: '',
    newCourseYear: '',
    newSessionYear: '',
    adminAmount: 0,
    feesAmount: 0,
    paymentMode: 'One-Time',
    numberOfEMI: null,
    ledgerNumber: '',
    emiDetails: [],
    isDepromote: false,
    confirmLateralChange: false
  });

  const courseYearOrder = ['1st', '2nd', '3rd', '4th'];
  
  const currentYear = new Date().getFullYear();
  const sessionYears = Array.from({ length: 10 }, (_, i) => {
    const startYear = currentYear - 5 + i;
    return `${startYear}-${startYear + 1}`;
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError('');

        // Fetch student information
        const studentResponse = await axiosInstance.get(`/students/${studentId}`);
        const studentData = studentResponse.data;
        
        // Fetch academic history
        const academicResponse = await axiosInstance.get(`/students/${studentId}/academic-details`);
        const academicData = academicResponse.data.data;
        
        if (!academicData || academicData.length === 0) {
          setError('No academic records found for this student.');
          setIsLoading(false);
          return;
        }

        setAcademicHistory(academicData);

        // Find the latest academic record
        const latestAcademicRecord = findLatestAcademicRecord(academicData);
        
        if (!latestAcademicRecord) {
          setError('Could not determine the latest academic record.');
          setIsLoading(false);
          return;
        }

        // Set student info
        setStudentInfo({
          id: studentId,
          fName: studentData.fName || studentData.FName,
          lName: studentData.lName || studentData.LName || '',
          rollNumber: studentData.rollNumber || studentData.RollNumber,
          collegeName: studentData.college?.collegeName || '',
          courseName: studentData.course?.courseName || '',
          isLateral: studentData.isLateral || false
        });

        // Set initial form data
        const nextCourseYearIndex = courseYearOrder.indexOf(latestAcademicRecord.courseYear) + 1;
        const nextCourseYear = nextCourseYearIndex < courseYearOrder.length ? courseYearOrder[nextCourseYearIndex] : '';
        
        // Find the next logical session year
        const currentSessionIndex = sessionYears.indexOf(latestAcademicRecord.sessionYear);
        const nextSessionYear = currentSessionIndex !== -1 && currentSessionIndex + 1 < sessionYears.length 
          ? sessionYears[currentSessionIndex + 1] 
          : '';

        setFormData({
          academicId: latestAcademicRecord.id,
          currentCourseYear: latestAcademicRecord.courseYear,
          currentSessionYear: latestAcademicRecord.sessionYear,
          newCourseYear: nextCourseYear,
          newSessionYear: nextSessionYear,
          adminAmount: latestAcademicRecord.adminAmount,
          feesAmount: latestAcademicRecord.feesAmount,
          paymentMode: latestAcademicRecord.paymentMode || 'One-Time',
          numberOfEMI: latestAcademicRecord.numberOfEMI || null,
          ledgerNumber: latestAcademicRecord.ledgerNumber || '',
          emiDetails: latestAcademicRecord.emiDetails || [],
          isDepromote: false,
          confirmLateralChange: false,
        });

        // Determine available course year options
        const currentCourseYearIndex = courseYearOrder.indexOf(latestAcademicRecord.courseYear);
        
        // By default, only the next course year is available for promotion
        let availableCourseYears: string[] = [];
        
        // Add next year for promotion if available
        if (currentCourseYearIndex < courseYearOrder.length - 1) {
          availableCourseYears.push(courseYearOrder[currentCourseYearIndex + 1]);
        }
        
        // For 2nd year students, add option to depromote to 1st year
        if (latestAcademicRecord.courseYear === '2nd') {
          // Check if there's already a 1st year record
          const hasFirstYearRecord = academicData.some((record: { courseYear: string; }) => record.courseYear === '1st');
          
          if (!hasFirstYearRecord) {
            availableCourseYears.push('1st');
          }
        }
        
        // For lateral entry students in 2nd year, always allow depromoting to 1st
        if (studentData.isLateral && latestAcademicRecord.courseYear === '2nd') {
          // Check if 1st year is already in the options
          if (!availableCourseYears.includes('1st')) {
            availableCourseYears.push('1st');
          }
        }
        
        setCourseYearOptions(availableCourseYears);

        // Initialize EMI details if needed
        if (latestAcademicRecord.paymentMode === 'EMI' && latestAcademicRecord.numberOfEMI) {
          // Fetch EMI details for the academic record
          try {
            const emiResponse = await axiosInstance.get(`/students/${studentId}/academic-details/${latestAcademicRecord.id}/emi`);
            const emiData = emiResponse.data.data || [];
            
            const formattedEmiDetails = emiData.map((emi: any) => ({
              emiNumber: emi.emiNumber,
              amount: emi.amount,
              dueDate: emi.dueDate ? new Date(emi.dueDate).toISOString().split('T')[0] : '',
            }));
            
            setEmiDetails(formattedEmiDetails);
          } catch (emiError) {
            console.error('Failed to fetch EMI details:', emiError);
            // Create default EMI details as fallback
            const newEmiDetails = Array.from({ length: latestAcademicRecord.numberOfEMI }, (_, i) => ({
              emiNumber: i + 1,
              amount: 0,
              dueDate: '',
            }));
            setEmiDetails(newEmiDetails);
          }
        }
      } catch (error: any) {
        setError(error.response?.data?.message || 'Failed to load student data');
        toast.error(error.response?.data?.message || 'Failed to load student data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [studentId]);

  const findLatestAcademicRecord = (academicData: AcademicHistory[]): AcademicHistory | null => {
    if (academicData.length === 0) return null;
    
    // Sort by course year in descending order
    const sortedByCourseYear = [...academicData].sort((a, b) => {
      return courseYearOrder.indexOf(b.courseYear) - courseYearOrder.indexOf(a.courseYear);
    });
    
    // Get the highest course year records
    const highestCourseYear = sortedByCourseYear[0].courseYear;
    const highestCourseYearRecords = sortedByCourseYear.filter(
      record => record.courseYear === highestCourseYear
    );
    
    // If there's only one record with the highest course year, return it
    if (highestCourseYearRecords.length === 1) return highestCourseYearRecords[0];
    
    // If there are multiple records with the highest course year,
    // sort by session year to find the most recent
    return highestCourseYearRecords.sort((a, b) => {
      // Extract start years for comparison
      const aStartYear = parseInt(a.sessionYear.split('-')[0]);
      const bStartYear = parseInt(b.sessionYear.split('-')[0]);
      return bStartYear - aStartYear;
    })[0];
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (name === 'newCourseYear') {
      const newCourseYearValue = value;
      const currentCourseYearIndex = courseYearOrder.indexOf(formData.currentCourseYear);
      const newCourseYearIndex = courseYearOrder.indexOf(newCourseYearValue);
      
      // Determine if this is a demotion
      const isDepromoting = newCourseYearIndex < currentCourseYearIndex;
      
      // Update isDepromote flag and reset confirmLateralChange if needed
      setFormData(prev => ({ 
        ...prev, 
        isDepromote: isDepromoting,
        // Reset the lateral change confirmation when changing course year
        confirmLateralChange: false
      }));
      
      // Get existing course years in academic history
      const existingCourseYears = academicHistory.map(record => record.courseYear);
      
      // Special handling for lateral entry students
      if (isDepromoting && studentInfo?.isLateral && formData.currentCourseYear === '2nd' && newCourseYearValue === '1st') {
        // Allow demotion for lateral entry from 2nd to 1st, but session year must stay the same
        setFormData(prev => ({ 
          ...prev, 
          [name]: value,
          newSessionYear: formData.currentSessionYear, // Force same session year for demotion
          confirmLateralChange: false // Reset confirmation when changing course year
        }));
        return;
      }
      
      // Regular demotion (not lateral entry)
      if (isDepromoting) {
        // Check if the selected course year already exists in academic history
        if (existingCourseYears.includes(newCourseYearValue)) {
          setWarningMessage(
            `This student already has records for ${newCourseYearValue} year. Cannot demote to a year that already has records.`
          );
          setShowWarningModal(true);
          return;
        }
        
        // Check if trying to depromote from 3rd or 4th directly to 1st
        if (currentCourseYearIndex > 1 && newCourseYearIndex === 0) {
          setWarningMessage(
            `Cannot demote directly from ${formData.currentCourseYear} to 1st year. Only 2nd year students can be demoted to 1st year.`
          );
          setShowWarningModal(true);
          return;
        }
        
        // For demotion, session year must stay the same
        setFormData(prev => ({ 
          ...prev, 
          [name]: value,
          newSessionYear: formData.currentSessionYear, // Force same session year for demotion
          confirmLateralChange: false // Reset confirmation when changing course year
        }));
        return;
      }
      
      // Regular promotion logic
      
      // Check if the selected course year already exists in academic history
      if (existingCourseYears.includes(newCourseYearValue)) {
        setWarningMessage(
          `This student is already enrolled in ${newCourseYearValue} year. Cannot promote to the same course year.`
        );
        setShowWarningModal(true);
        return;
      }

      // Check if skipping years forward
      if (newCourseYearIndex > currentCourseYearIndex + 1) {
        const skippedYears = courseYearOrder.slice(currentCourseYearIndex + 1, newCourseYearIndex);
        setWarningMessage(
          `You are trying to skip ${skippedYears.join(', ')} year(s). Students must be promoted sequentially.`
        );
        setShowWarningModal(true);
        return;
      }

      setFormData(prev => ({ ...prev, [name]: value }));
      return;
    }

    if (name === 'newSessionYear') {
      const newSessionYearValue = value;
      
      // If this is a demotion, force session year to be the same as current
      if (formData.isDepromote) {
        if (newSessionYearValue !== formData.currentSessionYear) {
          setWarningMessage(
            `For demotion, the session year must remain the same as the current session (${formData.currentSessionYear}).`
          );
          setShowWarningModal(true);
          return;
        }
      } else {
        // Regular promotion session year validations
        const currentSessionIndex = sessionYears.indexOf(formData.currentSessionYear);
        const newSessionIndex = sessionYears.indexOf(newSessionYearValue);

        // Check if trying to select an earlier or the same session year
        if (newSessionIndex <= currentSessionIndex) {
          setWarningMessage(
            `Cannot select session year ${newSessionYearValue} as it is earlier than or the same as the current session year (${formData.currentSessionYear}).`
          );
          setShowWarningModal(true);
          return;
        }

        // Check if skipping session years
        if (newSessionIndex > currentSessionIndex + 1) {
          const skippedSessions = sessionYears.slice(currentSessionIndex + 1, newSessionIndex);
          setWarningMessage(
            `You are trying to skip ${skippedSessions.join(', ')} session(s). Please select the next sequential session year.`
          );
          setShowWarningModal(true);
          return;
        }
        
        // Check if future session year beyond current year + 1
        const maxAllowedYear = currentYear + 1;
        const selectedStartYear = parseInt(newSessionYearValue.split('-')[0]);
        if (selectedStartYear > currentYear) {
          setWarningMessage(
            `Cannot use future session year beyond ${currentYear}-${maxAllowedYear}.`
          );
          setShowWarningModal(true);
          return;
        }
      }

      setFormData(prev => ({ ...prev, [name]: value }));
      return;
    }

    if (name === 'paymentMode') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        numberOfEMI: value === 'EMI' ? (prev.numberOfEMI || 0) : null,
        emiDetails: value === 'EMI' ? prev.emiDetails : [],
      }));
      
      if (value !== 'EMI') setEmiDetails([]);
      return;
    }

    if (name === 'numberOfEMI') {
      const newNumEMIs = value === '' ? null : parseInt(value);
      setFormData(prev => ({ ...prev, [name]: newNumEMIs }));
      
      if (newNumEMIs && newNumEMIs > 0) {
        const newEmiDetails = Array.from({ length: newNumEMIs }, (_, i) => ({
          emiNumber: i + 1,
          amount: emiDetails[i]?.amount || 0,
          dueDate: emiDetails[i]?.dueDate || '',
        }));
        setEmiDetails(newEmiDetails);
      } else {
        setEmiDetails([]);
      }
      return;
    }

    if (type === 'number') {
      const numValue = value === '' ? 0 : parseFloat(value);
      setFormData(prev => ({ ...prev, [name]: numValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleEmiChange = (index: number, field: 'amount' | 'dueDate', value: string | number) => {
    setEmiDetails(prev => {
      const newEmiDetails = [...prev];
      newEmiDetails[index] = {
        ...newEmiDetails[index],
        [field]: field === 'amount' 
          ? (value === '' ? 0 : parseFloat(value as string)) 
          : value as string,
      };
      return newEmiDetails;
    });
  };

  const validateForm = (): boolean => {
    // Reset error state
    setError('');
    
    // Check required fields
    if (!formData.newCourseYear) {
      setError('New course year is required');
      return false;
    }
    
    if (!formData.newSessionYear) {
      setError('New session year is required');
      return false;
    }
    
    // Validate payment information
    if (formData.adminAmount < 0) {
      setError('Admin amount cannot be negative');
      return false;
    }
    
    if (formData.feesAmount < 0) {
      setError('Fees amount cannot be negative');
      return false;
    }
    
    // Validate EMI details if payment mode is EMI
    if (formData.paymentMode === 'EMI') {
      if (!formData.numberOfEMI || formData.numberOfEMI <= 0) {
        setError('Number of EMIs must be greater than 0');
        return false;
      }
      
      // Check if all EMI details are filled correctly
      for (let i = 0; i < emiDetails.length; i++) {
        if (emiDetails[i].amount <= 0) {
          setError(`Amount for EMI ${i + 1} must be greater than 0`);
          return false;
        }
        
        if (!emiDetails[i].dueDate) {
          setError(`Due date for EMI ${i + 1} is required`);
          return false;
        }
      }
    }
    
    return true;
  };

  const handlePromote = () => {
    if (!validateForm()) {
      toast.error(error);
      return;
    }
    
    // Check if this is a lateral entry demotion, if so, show lateral confirm modal first
    if (formData.isDepromote && studentInfo?.isLateral && formData.currentCourseYear === '2nd' && formData.newCourseYear === '1st') {
      setShowLateralConfirmModal(true);
    } else {
      setShowConfirmationModal(true);
    }
  };

  const confirmPromotion = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      // Prepare the data for the promotion
      const promotionData = {
        currentAcademicId: formData.academicId,
        newCourseYear: formData.newCourseYear,
        newSessionYear: formData.newSessionYear,
        adminAmount: formData.adminAmount,
        feesAmount: formData.feesAmount,
        paymentMode: formData.paymentMode,
        numberOfEMI: formData.paymentMode === 'EMI' ? formData.numberOfEMI : null,
        emiDetails: formData.paymentMode === 'EMI' ? emiDetails : [],
        ledgerNumber: formData.ledgerNumber,
        modifiedBy,
        isDepromote: formData.isDepromote, // Pass the depromote flag to the API
        confirmLateralChange: formData.confirmLateralChange // Pass lateral change confirmation
      };

      // Make the API call to promote the student
      const response = await axiosInstance.post(
        `/students/${studentId}/promote`,
        promotionData
      );

      if (response.data.success) {
        const actionText = formData.isDepromote ? 'demoted' : 'promoted';
        toast.success(`Student ${actionText} successfully!`);
        onSuccess();
        onClose();
      } else {
        throw new Error(response.data.message || 'Failed to update student');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || error.message || 'An error occurred while updating the student');
      toast.error(error.response?.data?.message || 'Failed to update student');
    } finally {
      setIsSubmitting(false);
      setShowConfirmationModal(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const RequiredAsterisk = () => <span className="text-red-500">*</span>;

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-999 backdrop-blur-sm">
        <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
          <Loader1 size="lg" className="text-blue-500" />
          <p className="mt-2">Loading student data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-999 backdrop-blur-sm">
      <div className="bg-white p-3 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-lg">
        <div className="flex justify-between items-center mb-2 bg-gradient-to-r from-green-500 to-teal-600 text-white p-2 rounded-t-lg">
          <h2 className="text-base font-bold">
            {formData.isDepromote ? 'Demote' : 'Promote'} Student: {studentInfo?.fName} {studentInfo?.lName} ({studentInfo?.rollNumber})
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-red-700 text-lg p-1 rounded focus:ring-2 focus:ring-green-300 transition-colors"
          >
            <FaTimes />
          </button>
        </div>

        {error && (
          <div className="mb-2 p-1 bg-red-100 text-xs text-red-700 rounded border-l-4 border-red-500 animated fadeIn">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {/* Current Status Section */}
          <div className="bg-gray-50 p-2 rounded border border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 border-b pb-1 mb-1">Current Academic Status</h3>
            <div className="grid grid-cols-2 gap-1">
              <div>
                <p className="text-xs text-gray-600">Current Course Year:</p>
                <p className="text-sm font-medium">{formData.currentCourseYear}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Current Session Year:</p>
                <p className="text-sm font-medium">{formData.currentSessionYear}</p>
              </div>
              {studentInfo?.collegeName && (
                <div>
                  <p className="text-xs text-gray-600">College:</p>
                  <p className="text-sm font-medium">{studentInfo.collegeName}</p>
                </div>
              )}
              {studentInfo?.courseName && (
                <div>
                  <p className="text-xs text-gray-600">Course:</p>
                  <p className="text-sm font-medium">{studentInfo.courseName}</p>
                </div>
              )}
              {studentInfo?.isLateral && (
                <div>
                  <p className="text-xs text-gray-600">Admission Type:</p>
                  <p className="text-sm font-medium text-orange-600">Lateral Entry</p>
                </div>
              )}
            </div>
          </div>

          {/* Promotion/Demotion Section */}
          <div className={`p-2 rounded border ${formData.isDepromote ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
            <h3 className="text-sm font-medium text-gray-700 border-b pb-1 mb-1">
              {formData.isDepromote ? 'Demotion' : 'Promotion'} Details
            </h3>
            <div className="grid grid-cols-2 gap-1 mb-2">
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  New Course Year <RequiredAsterisk />
                </label>
                <select
                  name="newCourseYear"
                  value={formData.newCourseYear}
                  onChange={handleChange}
                  className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-green-300"
                  required
                >
                  <option value="">Select Course Year</option>
                  {/* Only show available options based on our filtered options */}
                  {courseYearOptions.length > 0 ? (
                    courseYearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))
                  ) : (
                    courseYearOrder.map((year) => (
                      <option key={year} value={year} disabled={year === formData.currentCourseYear}>
                        {year}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  New Session Year <RequiredAsterisk />
                </label>
                <select
                  name="newSessionYear"
                  value={formData.newSessionYear}
                  onChange={handleChange}
                  className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-green-300"
                  required
                  disabled={formData.isDepromote} // Disable session year selection for demotion as it must remain the same
                >
                  <option value="">Select Session Year</option>
                  {sessionYears.map((year) => (
                    <option 
                      key={year} 
                      value={year}
                      disabled={
                        (formData.isDepromote && year !== formData.currentSessionYear) || // For demotion, only current session is valid
                        (!formData.isDepromote && (
                          year === formData.currentSessionYear || // For promotion, cannot stay in same session
                          parseInt(year.split('-')[0]) > currentYear // Cannot use future sessions beyond current year + 1
                        ))
                      }
                    >
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Payment Section */}
          <div className="bg-blue-50 p-2 rounded border border-blue-200">
            <h3 className="text-sm font-medium text-gray-700 border-b pb-1 mb-1">Payment Details</h3>
            <div className="grid grid-cols-2 gap-1">
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Admin Amount <RequiredAsterisk />
                </label>
                <input
                  type="number"
                  name="adminAmount"
                  value={formData.adminAmount}
                  onChange={handleChange}
                  className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300"
                  min="0"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Fees Amount <RequiredAsterisk />
                </label>
                <input
                  type="number"
                  name="feesAmount"
                  value={formData.feesAmount}
                  onChange={handleChange}
                  className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300"
                  min="0"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Ledger Number</label>
                <input
                  type="text"
                  name="ledgerNumber"
                  value={formData.ledgerNumber}
                  onChange={handleChange}
                  className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div className="flex items-center">
                <label className="mr-1 block text-xs font-medium text-gray-700">
                  Payment Mode <RequiredAsterisk />
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="paymentMode"
                    value="One-Time"
                    checked={formData.paymentMode === 'One-Time'}
                    onChange={handleChange}
                    className="h-3 w-3 text-blue-600"
                  />
                  <span className="ml-0.5 text-xs">One-Time</span>
                </label>
                <label className="flex items-center ml-1">
                  <input
                    type="radio"
                    name="paymentMode"
                    value="EMI"
                    checked={formData.paymentMode === 'EMI'}
                    onChange={handleChange}
                    className="h-3 w-3 text-blue-600"
                  />
                  <span className="ml-0.5 text-xs">EMI</span>
                </label>
              </div>

              {formData.paymentMode === 'EMI' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Number of EMIs <RequiredAsterisk />
                  </label>
                  <select
                    name="numberOfEMI"
                    value={formData.numberOfEMI || ''}
                    onChange={handleChange}
                    className="w-full border p-1 rounded mt-0.5 text-xs focus:ring-2 focus:ring-blue-300"
                    required
                  >
                    <option value="">Select</option>
                    {[2, 3, 4, 5, 6].map((num) => (
                      <option key={num} value={num}>
                        {num}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.paymentMode === 'EMI' && formData.numberOfEMI && formData.numberOfEMI > 0 && (
                <div className="col-span-2 mt-1">
                  <h4 className="text-xs font-medium text-gray-700 mb-0.5">EMI Schedule</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-1 py-0.5 text-left text-xs font-medium text-gray-700">EMI</th>
                          <th className="px-1 py-0.5 text-left text-xs font-medium text-gray-700">Amount</th>
                          <th className="px-1 py-0.5 text-left text-xs font-medium text-gray-700">Due Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {emiDetails.map((emi, index) => (
                          <tr key={index}>
                            <td className="px-1 py-0.5">
                              <input
                                type="text"
                                value={`EMI ${emi.emiNumber}`}
                                disabled
                                className="w-full border p-0.5 rounded text-xs bg-gray-100"
                              />
                            </td>
                            <td className="px-1 py-0.5">
                              <input
                                type="number"
                                value={emi.amount}
                                onChange={(e) => handleEmiChange(index, 'amount', e.target.value)}
                                className="w-full border p-0.5 rounded text-xs focus:ring-2 focus:ring-blue-300"
                                min="0"
                                required
                              />
                            </td>
                            <td className="px-1 py-0.5">
                              <input
                                type="date"
                                value={emi.dueDate}
                                onChange={(e) => handleEmiChange(index, 'dueDate', e.target.value)}
                                className="w-full border p-0.5 rounded text-xs focus:ring-2 focus:ring-blue-300"
                                required
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-1">
            <button
              onClick={onClose}
              className="px-3 py-1 bg-gray-300 text-xs text-gray-800 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={handlePromote}
              disabled={isSubmitting}
              className={`px-3 py-1 text-white text-xs rounded disabled:bg-gray-300 disabled:cursor-not-allowed ${
                formData.isDepromote ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader1 size="sm" className="inline-block mr-0.5" />
                  Processing...
                </>
              ) : (
                formData.isDepromote ? 'Demote Student' : 'Promote Student'
              )}
            </button>
          </div>
        </div>

        {/* Warning Modal */}
        <Modal
          show={showWarningModal}
          onClose={() => setShowWarningModal(false)}
          size="md"
          className="fixed inset-0 pt-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
        >
          <Modal.Header className="bg-yellow-500 text-white py-1 text-sm">Warning</Modal.Header>
          <Modal.Body className="py-2">
            <div className="text-xs text-gray-600">{warningMessage}</div>
          </Modal.Body>
          <Modal.Footer className="py-1">
            <button
              onClick={() => setShowWarningModal(false)}
              className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
            >
              Understood
            </button>
          </Modal.Footer>
        </Modal>

        {/* Lateral Entry Change Confirmation Modal */}
        <Modal
          show={showLateralConfirmModal}
          onClose={() => setShowLateralConfirmModal(false)}
          size="md"
          className="fixed inset-0 pt-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
        >
          <Modal.Header className="bg-orange-500 text-white py-1 text-sm">
            Lateral Entry Status Change
          </Modal.Header>
          <Modal.Body className="py-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">
                You are about to demote a <span className="font-bold">lateral entry</span> student to 1st year.
              </p>
              
              <div className="bg-yellow-50 p-2 rounded text-xs border border-yellow-300">
                <p><strong>Student:</strong> {studentInfo?.fName} {studentInfo?.lName} ({studentInfo?.rollNumber})</p>
                <p><strong>Current Status:</strong> Lateral Entry (Direct 2nd Year Admission)</p>
                <p><strong>Action:</strong> Demoting from 2nd year to 1st year</p>
              </div>
              
              <div className="bg-gray-50 p-2 rounded border border-gray-200">
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={formData.confirmLateralChange}
                    onChange={() => setFormData(prev => ({...prev, confirmLateralChange: !prev.confirmLateralChange}))}
                    className="mt-0.5 mr-2"
                  />
                  <span className="text-xs">
                    I confirm that this student's <span className="font-bold text-red-600">lateral entry status should be removed</span> as they are being demoted to 1st year.
                  </span>
                </label>
              </div>
              
              <p className="text-xs text-gray-600">
                If there's already a 1st year record for this student, it will be updated instead of creating a new record.
              </p>
            </div>
          </Modal.Body>
          <Modal.Footer className="py-1">
            <button
              onClick={() => setShowLateralConfirmModal(false)}
              className="px-2 py-0.5 bg-gray-300 text-gray-800 text-xs rounded hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setShowLateralConfirmModal(false);
                setShowConfirmationModal(true);
              }}
              className="px-2 py-0.5 bg-orange-500 text-white text-xs rounded hover:bg-orange-600"
              disabled={!formData.confirmLateralChange}
            >
              Proceed to Confirmation
            </button>
          </Modal.Footer>
        </Modal>

        {/* Confirmation Modal */}
        <Modal
          show={showConfirmationModal}
          onClose={() => setShowConfirmationModal(false)}
          size="md"
          className="fixed inset-0 pt-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
        >
          <Modal.Header className={`text-white py-1 text-sm ${formData.isDepromote ? 'bg-yellow-500' : 'bg-green-500'}`}>
            {formData.isDepromote ? 'Confirm Demotion' : 'Confirm Promotion'}
          </Modal.Header>
          <Modal.Body className="py-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Please confirm student {formData.isDepromote ? 'demotion' : 'promotion'} with the following details:
              </p>
              
              <div className="bg-gray-50 p-2 rounded text-xs">
                <p><strong>Student:</strong> {studentInfo?.fName} {studentInfo?.lName} ({studentInfo?.rollNumber})</p>
                {studentInfo?.isLateral && formData.isDepromote && formData.newCourseYear === '1st' && (
                  <p className={`font-medium ${formData.confirmLateralChange ? 'text-green-600' : 'text-orange-600'}`}>
                    <strong>Note:</strong> {formData.confirmLateralChange 
                      ? 'Lateral entry status will be removed' 
                      : 'Lateral entry status will be retained'}
                  </p>
                )}
                <p>
                  <strong>{formData.isDepromote ? 'Demoting' : 'Promoting'} from:</strong> {formData.currentCourseYear} year, {formData.currentSessionYear} session
                </p>
                <p>
                  <strong>{formData.isDepromote ? 'Demoting' : 'Promoting'} to:</strong> {formData.newCourseYear} year, {formData.newSessionYear} session
                </p>
                <p><strong>Admin Amount:</strong> {formatCurrency(formData.adminAmount)}</p>
                <p><strong>Fees Amount:</strong> {formatCurrency(formData.feesAmount)}</p>
                <p><strong>Payment Mode:</strong> {formData.paymentMode}</p>
                {formData.paymentMode === 'EMI' && (
                  <p><strong>Number of EMIs:</strong> {formData.numberOfEMI}</p>
                )}
                {formData.ledgerNumber && (
                  <p><strong>Ledger Number:</strong> {formData.ledgerNumber}</p>
                )}
              </div>
              
              <p className="text-xs text-red-500">
                {formData.isDepromote && formData.currentCourseYear === '2nd' && formData.newCourseYear === '1st'
                  ? "If a 1st year record already exists, it will be updated. Otherwise, a new record will be created."
                  : "This action will create a new academic record for the student."} 
                Are you sure you want to continue?
              </p>
            </div>
          </Modal.Body>
          <Modal.Footer className="py-1">
            <button
              onClick={() => setShowConfirmationModal(false)}
              className="px-2 py-0.5 bg-gray-300 text-gray-800 text-xs rounded hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={confirmPromotion}
              className={`px-2 py-0.5 text-white text-xs rounded ${
                formData.isDepromote ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600'
              }`}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader1 size="sm" className="inline-block mr-0.5" />
                  Processing...
                </>
              ) : (
                formData.isDepromote ? 'Confirm Demotion' : 'Confirm Promotion'
              )}
            </button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
};

export default PromoteStudentModal;