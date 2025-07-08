import React, { useEffect, useState } from 'react';
import { Link } from "react-router-dom";
import { 
  Users, 
  CreditCard, 
  GraduationCap, 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle, 
  UserCheck, 
  Receipt, 
  IndianRupee, 
  Clock,
  Activity,
  BarChart3,
  Moon,
  Sun
} from 'lucide-react';
import axiosInstance from '../../config';
import DashboardLoader from './DashboardLoader';

interface Student {
  id: number;
  fName: string;
  lName: string | null;
  rollNumber: string;
  course: {
    courseName: string;
  };
  status: boolean;
  academicDetails: {
    id: number;
    feesAmount: number;
    adminAmount: number;
  }[];
}

interface StudentPayment {
  id: number;
  studentId: number;
  amount: number;
  amountType: string;
  studentAcademic: {
    id: number;
  };
}

interface CashHandover {
  id: number;
  paymentId: number;
  studentId: number;
  amount: number;
  receivedBy: string;
  handedOverTo: string;
  handoverDate: string;
  verified: boolean;
  student?: Student;
}

interface Expense {
  PendingAmount: number;
  SuppliersExpenseID: number;
  SupplierId: number;
  SupplierName: string;
  Amount: number;
  Deleted: boolean;
}

interface Payment {
  PaidAmount: number;
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
  const [payments, setPayments] = useState<StudentPayment[]>([]);
  const [cashHandovers, setCashHandovers] = useState<CashHandover[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    // Check local storage or system preference for initial dark mode state
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) {
      return savedMode === 'true';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    // Apply dark mode class to document
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Save preference to local storage
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentResponse, paymentResponse, handoverResponse, expenseResponse] = await Promise.all([
          axiosInstance.get('/students'),
          axiosInstance.get('/amountType'),
          axiosInstance.get('/payment-handovers'),
          axiosInstance.get('/expenses'),
        ]);
        
        setStudents(studentResponse.data);
        setPayments(paymentResponse.data.data);
        
        if (handoverResponse.data.success) {
          setCashHandovers(handoverResponse.data.data);
        }

        const expensesWithPending = await Promise.all(
          expenseResponse.data.map(async (expense: Expense) => {
            try {
              const paymentResponse = await axiosInstance.get(`/expense/${expense.SupplierId}/payments`, {
                params: { suppliersExpenseID: expense.SuppliersExpenseID },
              });
              
              const totalPaid = paymentResponse.data.reduce(
                (sum: number, payment: Payment) => sum + payment.PaidAmount, 
                0
              );
              
              return { ...expense, PendingAmount: expense.Amount - totalPaid };
            } catch (error) {
              console.error(`Error fetching payments for expense ${expense.SuppliersExpenseID}:`, error);
              return { ...expense, PendingAmount: expense.Amount };
            }
          })
        );
        
        setExpenses(expensesWithPending);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate metrics
  const totalStudents = students.length;

  const totalAdminAmount = students.reduce((sum, student) => {
    return sum + student.academicDetails.reduce((acc, detail) => acc + (detail.adminAmount || 0), 0);
  }, 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

  const totalFeesAmount = students.reduce((sum, student) => {
    return sum + student.academicDetails.reduce((acc, detail) => acc + (detail.feesAmount || 0), 0);
  }, 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

  const totalFineAmount = payments
    .filter(p => p.amountType === 'fineAmount')
    .reduce((sum, payment) => sum + payment.amount, 0)
    .toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

  const totalHandoverAmount = cashHandovers.reduce((sum, handover) => sum + (handover.amount || 0), 0)
    .toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  
  const totalVerifiedHandovers = cashHandovers.filter(h => h.verified).length;
  const totalStudentsWithHandovers = new Set(cashHandovers.map(h => h.studentId)).size;

  const totalExpenses = expenses.length;
  const totalExpenseAmount = expenses.reduce((sum, expense) => sum + expense.Amount, 0)
    .toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  const totalPendingAmount = expenses.reduce((sum, expense) => sum + (expense.PendingAmount || 0), 0)
    .toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

  if (loading) {
    return <DashboardLoader />;
  }

  return (
    <div className=" bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
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
              {/* <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button> */}
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-300">Last updated</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto sm:px-6 lg:px-2 py-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 mb-8">
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
            title="Admin Amount"
            total={totalAdminAmount}
            icon={<CreditCard className="w-6 h-6" />}
            trend="up"
            color="text-green-600 dark:text-green-400"
            bgColor="bg-green-100"
            darkBgColor="dark:bg-green-900/20"
          />

          <ModernStatCard
            title="Fees Amount"
            total={totalFeesAmount}
            icon={<GraduationCap className="w-6 h-6" />}
            trend="up"
            color="text-purple-600 dark:text-purple-400"
            bgColor="bg-purple-100"
            darkBgColor="dark:bg-purple-900/20"
          />

          <ModernStatCard
            title="Fine Amount"
            total={totalFineAmount}
            icon={<AlertTriangle className="w-6 h-6" />}
            trend="down"
            color="text-red-600 dark:text-red-400"
            bgColor="bg-red-100"
            darkBgColor="dark:bg-red-900/20"
          />

          <ModernStatCard
            title="Handover Amount"
            total={totalHandoverAmount}
            icon={<IndianRupee className="w-6 h-6" />}
            trend="up"
            color="text-emerald-600 dark:text-emerald-400"
            bgColor="bg-emerald-100"
            darkBgColor="dark:bg-emerald-900/20"
          />

          <ModernStatCard
            title="Verified Handovers"
            total={totalVerifiedHandovers.toString()}
            icon={<CheckCircle className="w-6 h-6" />}
            trend="up"
            color="text-teal-600 dark:text-teal-400"
            bgColor="bg-teal-100"
            darkBgColor="dark:bg-teal-900/20"
          />

          <ModernStatCard
            title="Students with Handovers"
            total={totalStudentsWithHandovers.toString()}
            icon={<UserCheck className="w-6 h-6" />}
            trend="up"
            color="text-cyan-600 dark:text-cyan-400"
            bgColor="bg-cyan-100"
            darkBgColor="dark:bg-cyan-900/20"
          />

          <ModernStatCard
            title="Total Expenses"
            total={totalExpenses.toString()}
            icon={<Receipt className="w-6 h-6" />}
            trend="up"
            color="text-orange-600 dark:text-orange-400"
            bgColor="bg-orange-100"
            darkBgColor="dark:bg-orange-900/20"
          />

          <ModernStatCard
            title="Expense Amount"
            total={totalExpenseAmount}
            icon={<TrendingUp className="w-6 h-6" />}
            trend="up"
            color="text-amber-600 dark:text-amber-400"
            bgColor="bg-amber-100"
            darkBgColor="dark:bg-amber-900/20"
          />

          <ModernStatCard
            title="Pending Amount"
            total={totalPendingAmount}
            icon={<Clock className="w-6 h-6" />}
            trend="down"
            color="text-rose-600 dark:text-rose-400"
            bgColor="bg-rose-100"
            darkBgColor="dark:bg-rose-900/20"
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
              <CreditCard className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-900 dark:text-green-100">Process Payment</span>
            </Link>

            <Link 
              to="/manageExpense" 
              className="flex items-center space-x-3 p-4 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:hover:bg-purple-900/40 rounded-xl transition-colors duration-200"
            >
              <Receipt className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-900 dark:text-purple-100">Manage Expenses</span>
            </Link>

            <Link 
              to="/reports" 
              className="flex items-center space-x-3 p-4 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/30 dark:hover:bg-orange-900/40 rounded-xl transition-colors duration-200"
            >
              <BarChart3 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <span className="text-sm font-medium text-orange-900 dark:text-orange-100">View Reports</span>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
          <p>© 2024 Admin Panel. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;