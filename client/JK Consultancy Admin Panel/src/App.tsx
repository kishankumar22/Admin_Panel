// App.tsx
import { useEffect, useState } from 'react';
import { Route, Routes, Navigate, useLocation } from 'react-router-dom';
import 'react-toastify/dist/ReactToastify.css';
import 'froala-editor/css/froala_editor.pkgd.min.css';
import 'froala-editor/css/froala_style.min.css';
import {Loader} from './common/Loader/index';
import PageTitle from './components/PageTitle';
import SignIn from './pages/Authentication/SignIn';
import SignUp from './pages/Authentication/SignUp';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import DefaultLayout from './layout/DefaultLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Addnotifications from './services/Addnotifications';
import AddBanner from './services/AddBanner';
import AddPicInGallery from './services/AddGallery';
import AddImportantLinks from './services/AddImportentLinks';
import AddFaculity from './services/AddFaculity';
import LatestPost from './services/LatestPost';
import ECommerce from './pages/Dashboard/ECommerce';
import AddUser from './services/AddUser';
import Unauthorized from './pages/Unauthorized';
import { useAuth } from './context/AuthContext';
import AssignRolePage from './pages/Configuration/AssignRolePage';
import CreatePage from './pages/Configuration/CreatePage';
// import AddStudent from './services/students/AddStudent';
import StudentManagement from './services/students/StudentManagement';
import ManagePayment from './services/students/ManagePayment';
import CashHandover from './services/students/PaymentHandover';
import PaymentHandover from './services/students/PaymentHandover';

const App: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const { pathname } = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
  }, []);

  // Define all routes
  const allRoutes = [
    {
      path: '/',
      element: (
        <>
          <PageTitle title="Admin Panel JK Website " />
          <ECommerce />
        </>
      ),
    },
    {
      path: '/addnotifications',
      element: (
        <>
          <PageTitle title="Add Notifications" />
          <Addnotifications />
        </>
      ),
    },
    {
      path: '/addbanner',
      element: (
        <>
          <PageTitle title="Add Banner" />
          <AddBanner />
        </>
      ),
    },
    {
      path: '/addpicingallery',
      element: (
        <>
          <PageTitle title="Add Pic in gallery" />
          <AddPicInGallery />
        </>
      ),
    },
    {
      path: '/addimportentlinks',
      element: (
        <>
          <PageTitle title="Add Important links" />
          <AddImportantLinks />
        </>
      ),
    },
    {
      path: '/addfaculity',
      element: (
        <>
          <PageTitle title="Add Faculity" />
          <AddFaculity />
        </>
      ),
    },
    {
      path: '/latestpost',
      element: (
        <>
          <PageTitle title="Add latestpost" />
          <LatestPost />
        </>
      ),
    },
    {
      path: '/profile',
      element: (
        <>
          <PageTitle title="Profile" />
          <Profile />
        </>
      ),
    },
    {
      path: '/settings',
      element: (
        <>
          <PageTitle title="Settings" />
          <Settings />
        </>
      ),
    },
    {
      path: '/adduser',
      element: (
        <>
          <PageTitle title="Add New User" />
          <AddUser />
        </>
      ),
    },
    {
      path: '/student',
      element: (
        <>
          <PageTitle title="Add New Students" />
          <StudentManagement />
        </>
      ),
    },
    {
      path: '/managePayment',
      element: (
        <>
          <PageTitle title="Manage Payement" />
          <ManagePayment />
        </>
      ),
    },
    {
      path: '/paymenthandover',
      element: (
        <>
          <PageTitle title="payment Handover" />
          <PaymentHandover />
        </>
      ),
    },
    {
      path: '/assign-page-to-role',
      element: (
        <>
          <PageTitle title="Assign Role Page" />
          <AssignRolePage />
        </>
      ),
    },
    {
      path: '/page-management',
      element: (
        <>
          <PageTitle title="Page management" />
          <CreatePage />
        </>
      ),
    },
  ];

  // Define routes to hide for Role ID 3
  const restrictedPathsForRole3 = [
    '/addnotifications',
    '/addbanner',
    '/addpicingallery',
    '/addimportentlinks',
    '/addfaculity',
    '/latestpost',
    '/profile',
    '/settings',
    '/student',
    '/managePayment',
    '/paymenthandover',
    '/assign-page-to-role',
  ];

  // Filter routes based on user role
  const getAllowedRoutes = () => {
    if (!user) return [];

    if (user.roleId === 1 || user.roleId === 2) {
      return allRoutes; // Full access for Role ID 1 and 2
    } else if (user.roleId === 3) {
      // Only allow Dashboard and Add User for Role ID 3
      return allRoutes.filter(route => !restrictedPathsForRole3.includes(route.path));
    }
    return [];
  };

  return loading ? (
    <Loader />
  ) : (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/auth/signin"
        element={
          <>
            <PageTitle title="Sign In" />
            <SignIn />
          </>
        }
      />
      <Route
        path="/auth/signup"
        element={
          <>
            <PageTitle title="Sign Up" />
            <SignUp />
          </>
        }
      />
      <Route
        path="/unauthorized"
        element={
          <>
            <PageTitle title="Unauthorized" />
            <Unauthorized />
          </>
        }
      />


      {/* Protected Routes */}
      <Route
        path="*"
        element={
          <ProtectedRoute>
            <DefaultLayout>
              <Routes>
                {getAllowedRoutes().map((route, index) => (
                  <Route
                    key={index}
                    path={route.path}
                    element={route.element}
                  />
                ))}
                {/* Default route for unmatched paths */}
                <Route
                  path="*"
                  element={<Navigate to="/" replace />}
                />
              </Routes>
            </DefaultLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default App;