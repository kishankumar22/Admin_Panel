
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
  academicDetails: {
    id: number;
    feesAmount: number;
    adminAmount: number;
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const studentResponse = await axiosInstance.get('/students');
      setStudents(studentResponse.data);
      // console.log(studentResponse.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching student data:', error);
      setError('Failed to fetch student data. Please try again.');
      setLoading(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  // Calculate student metrics
  const totalStudents = students.length;
  const activeStudents = students.filter((student) => student.status === true).length;
  const bPharmaStudents = students.filter(
    (student) => student.course.courseName === "B. Pharma"
  ).length;
  const dPharmaStudents = students.filter(
    (student) => student.course.courseName === "D. Pharma"
  ).length;
  const maleStudents = students.filter(
    (student) => student.gender.toLowerCase() === "male"
  ).length;
  const femaleStudents = students.filter(
    (student) => student.gender.toLowerCase() === "female"
  ).length;
  const lateralEntries = students.filter(
    (student) => student.isLateral === true
  ).length;

  if (loading) {
    return <DashboardLoader />;
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">Welcome back, manage your institution</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-300">Last updated</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{new Date().toLocaleDateString()}</p>
              </div>
              <button
                onClick={fetchData}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                <span>Refresh Data</span>
              </button>
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
            </div>
          </div>
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

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
          <p>© 2025 Admin Panel. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
