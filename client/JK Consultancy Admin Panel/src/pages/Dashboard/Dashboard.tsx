import React, { useState, useEffect } from 'react';
import { Link } from "react-router-dom";
import { 
  Users, 
  GraduationCap, 
  TrendingUp, 
  UserCheck, 
  Activity,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import axiosInstance from '../../config';
import DashboardLoader from './DashboardLoader';

interface Student {
  id: number;
  fName: string;
  lName: string | null;
  rollNumber: string;
  gender: string;
  course: {
    courseName: string;
  };
  status: boolean;
  isLateral: boolean;
  admissionDate: string;
  academicDetails: {
    id: number;
    feesAmount: number;
    adminAmount: number;
    sessionYear: string;
    courseYear: string;
  }[];
}

const ModernStatCard: React.FC<{
  title: string;
  total: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  color: string;
  bgColor: string;
  darkBgColor: string;
}> = ({ title, total, icon, trend = 'neutral', color, bgColor, darkBgColor }) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500 dark:text-green-400" />;
      case 'down': return <TrendingUp className="w-4 h-4 text-red-500 dark:text-red-400 transform rotate-180" />;
      default: return <Activity className="w-4 h-4 text-gray-500 dark:text-gray-400" />;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 dark:border-gray-700 group hover:scale-105">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-3 rounded-2xl ${bgColor} ${darkBgColor} group-hover:scale-110 transition-transform duration-300`}>
          <div className={color}>
            {icon}
          </div>
        </div>
        <div className="flex items-center space-x-1">
          {getTrendIcon()}
        </div>
      </div>
      
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wide">{title}</h3>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{total}</p>
      </div>
      
      <div className="mt-4 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full ${bgColor.replace('bg-', 'bg-').replace('/10', '/50')} ${darkBgColor.replace('dark:bg-', 'dark:bg-').replace('/20', '/60')} transition-all duration-1000 ease-out`}
          style={{ width: trend === 'up' ? '75%' : trend === 'down' ? '40%' : '60%' }}
        />
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true); // Start with loading true
  const [error, setError] = useState<string | null>(null);
  const [sessionYear, setSessionYear] = useState<string>('All');
  const [courseYear, setCourseYear] = useState<string>('All');
  const [dataLoaded, setDataLoaded] = useState(false); // Add this state

  // Get unique session years from students data
  const getUniqueSessionYears = () => {
    const sessionYears = new Set<string>();
    students.forEach(student => {
      student.academicDetails.forEach(detail => {
        sessionYears.add(detail.sessionYear);
      });
    });
    return ['All', ...Array.from(sessionYears).sort()];
  };

  // Set default session year to the maximum from data
  useEffect(() => {
    if (students.length > 0) {
      const maxSessionYear = getUniqueSessionYears().filter(year => year !== 'All').sort().pop() || 'All';
      setSessionYear(maxSessionYear);
    }
  }, [students]);

 const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const studentResponse = await axiosInstance.get('/students');
      setStudents(studentResponse.data);
      setFilteredStudents(studentResponse.data);
      setDataLoaded(true); // Mark data as loaded
    } catch (error) {
      console.error('Error fetching student data:', error);
      setError('Failed to fetch student data. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  // Filter students based on session year and course year with loading
  const handleFilterChange = () => {
    setLoading(true);
    let filtered = students;

    if (sessionYear !== 'All') {
      filtered = filtered.filter(student => 
        student.academicDetails.some(detail => detail.sessionYear === sessionYear)
      );
    }

    if (courseYear !== 'All') {
      filtered = filtered.filter(student => 
        student.academicDetails.some(detail => detail.courseYear === courseYear)
      );
    }

    setTimeout(() => {
      setFilteredStudents(filtered);
      setLoading(false);
    }, 500); // Simulate loading delay
  };

  // Fetch data on component mount and handle filter changes
  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    handleFilterChange();
  }, [sessionYear, courseYear]);

  // Calculate student metrics based on filtered students
  const totalStudents = filteredStudents.length;
  const activeStudents = filteredStudents.filter((student) => student.status === true).length;
  const bPharmaStudents = filteredStudents.filter(
    (student) => student.course.courseName === "B. Pharma"
  ).length;
  const dPharmaStudents = filteredStudents.filter(
    (student) => student.course.courseName === "D. Pharma"
  ).length;
  const maleStudents = filteredStudents.filter(
    (student) => student.gender.toLowerCase() === "male"
  ).length;
  const femaleStudents = filteredStudents.filter(
    (student) => student.gender.toLowerCase() === "female"
  ).length;
  const lateralEntries = filteredStudents.filter(
    (student) => student.isLateral === true
  ).length;

  if (loading || !dataLoaded) {
    return <DashboardLoader />;
  }

  return (
    <div className="bg-gradient-to-br from-slate-50  via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
 <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="mx-auto px-3 sm:px-4 sm:flex-wrap lg:px-8">
        
        {/* Mobile Layout - Stacked */}
        <div className="block sm:hidden py-3 space-y-3">
          {/* Icon + Title */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-lg flex-shrink-0">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-base font-bold text-gray-900 dark:text-white truncate">
                Admin Dashboard
              </h1>
              <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                Welcome back, manage your institution
              </p>
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-16">
                Session:
              </label>
              <select
                value={sessionYear}
                onChange={(e) => setSessionYear(e.target.value)}
                className="flex-1 px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {getUniqueSessionYears().map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-16">
                Course:
              </label>
              <select
                value={courseYear}
                onChange={(e) => setCourseYear(e.target.value)}
                className="flex-1 px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All</option>
                <option value="1st">1st</option>
                <option value="2nd">2nd</option>
                <option value="3rd">3rd</option>
                <option value="4th">4th</option>
              </select>
            </div>
          </div>
          
          {/* Last Updated + Refresh */}
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <p className="text-gray-600 dark:text-gray-400">Last updated</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {new Date().toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={fetchData}
              className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Tablet & Desktop Layout - Compact Single Row */}
        <div className="hidden sm:flex items-center justify-between py-3 gap-4">
          
          {/* Left: Icon + Title */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            <div className="p-2 bg-blue-600 rounded-lg">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                Admin Dashboard
              </h1>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Welcome back, manage your institution
              </p>
            </div>
          </div>
          
          {/* Center: Filters - Compact */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="flex items-center gap-1">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Session:
              </label>
              <select
                value={sessionYear}
                onChange={(e) => setSessionYear(e.target.value)}
                className="px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px]"
              >
                {getUniqueSessionYears().map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-1">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Course:
              </label>
              <select
                value={courseYear}
                onChange={(e) => setCourseYear(e.target.value)}
                className="px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[80px]"
              >
                <option value="All">All</option>
                <option value="1st">1st</option>
                <option value="2nd">2nd</option>
                <option value="3rd">3rd</option>
                <option value="4th">4th</option>
              </select>
            </div>
          </div>
          
          {/* Right: Last Updated + Refresh */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-sm text-right">
              <p className="text-gray-600 dark:text-gray-400">Last updated</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {new Date().toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={fetchData}
              className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md mb-3">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
      </div>
    </div>


      {/* Main Content */}
      <div className="mx-auto sm:px-6 lg:px-2 py-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
          <ModernStatCard
            title="Total Students"
            total={totalStudents.toString()}
            icon={<Users className="w-6 h-6" />}
            trend="up"
            color="text-blue-600 dark:text-blue-400"
            bgColor="bg-blue-100"
            darkBgColor="dark:bg-blue-900/20"
          />
          <ModernStatCard
            title="Active Students"
            total={activeStudents.toString()}
            icon={<Users className="w-6 h-6" />}
            trend="up"
            color="text-cyan-600 dark:text-cyan-400"
            bgColor="bg-cyan-100"
            darkBgColor="dark:bg-cyan-900/20"
          />
          <ModernStatCard
            title="B. Pharma Students"
            total={bPharmaStudents.toString()}
            icon={<GraduationCap className="w-6 h-6" />}
            trend="neutral"
            color="text-indigo-600 dark:text-indigo-400"
            bgColor="bg-indigo-100"
            darkBgColor="dark:bg-indigo-900/20"
          />
          <ModernStatCard
            title="D. Pharma Students"
            total={dPharmaStudents.toString()}
            icon={<GraduationCap className="w-6 h-6" />}
            trend="neutral"
            color="text-purple-600 dark:text-purple-400"
            bgColor="bg-purple-100"
            darkBgColor="dark:bg-purple-900/20"
          />
          <ModernStatCard
            title="Male Students"
            total={maleStudents.toString()}
            icon={<Users className="w-6 h-6" />}
            trend="up"
            color="text-green-600 dark:text-green-400"
            bgColor="bg-green-100"
            darkBgColor="dark:bg-green-900/20"
          />
          <ModernStatCard
            title="Female Students"
            total={femaleStudents.toString()}
            icon={<Users className="w-6 h-6" />}
            trend="neutral"
            color="text-pink-600 dark:text-pink-400"
            bgColor="bg-pink-100"
            darkBgColor="dark:bg-pink-900/20"
          />
          <ModernStatCard
            title="Lateral Entries"
            total={lateralEntries.toString()}
            icon={<UserCheck className="w-6 h-6" />}
            trend="up"
            color="text-teal-600 dark:text-teal-400"
            bgColor="bg-teal-100"
            darkBgColor="dark:bg-teal-900/20"
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-8 border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link 
              to="/student" 
              className="flex items-center space-x-3 p-4 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/40 rounded-xl transition-colors duration-200"
            >
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Add Student</span>
            </Link>

            <Link 
              to="/managePayment" 
              className="flex items-center space-x-3 p-4 bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/40 rounded-xl transition-colors duration-200"
            >
              <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-900 dark:text-blue-100">Process Payment</span>
            </Link>

            <Link 
              to="/manageExpense" 
              className="flex items-center space-x-3 p-4 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:hover:bg-purple-900/40 rounded-xl transition-colors duration-200"
            >
              <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-900 dark:text-blue-100">Manage Expenses</span>
            </Link>

            <Link 
              to="/reports" 
              className="flex items-center space-x-3 p-4 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/30 dark:hover:bg-orange-900/40 rounded-xl transition-colors duration-200"
            >
              <BarChart3 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <span className="text-sm font-medium text-orange-900 dark:text-blue-100">View Reports</span>
            </Link>
          </div>
        </div>

       
       </div>
       {/* Footer */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
          <p>© 2025 Admin Panel. All rights reserved.</p>
        </div>
    </div>
    
  );
};

export default Dashboard;