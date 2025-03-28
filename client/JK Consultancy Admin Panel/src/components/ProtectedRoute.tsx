import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface User {
  user_id: number;
  email: string;
  name: string;
  mobileNo: number;
  roleId: number;
  created_by: string;
  created_on: Date;
  modify_by: string;
  modify_on: Date;
}

interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null;
}

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isLoggedIn, user } = useAuth() as AuthContextType;
  const location = useLocation(); // To get the current path

  // console.log('ProtectedRoute Debug:');
  // console.log('isLoggedIn:', isLoggedIn);
  // console.log('user:', user);
  // console.log('user.roleId:', user?.roleId);
  // console.log('current path:', location.pathname);

  // If user is not logged in, redirect to signin
  if (!isLoggedIn || !user) {
    console.log('Redirecting to /auth/signin because user is not logged in');
    return <Navigate to="/auth/signin" replace />;
  }

  // Define allowed paths for Role ID 3
  const allowedPathsForRole3 = ['/', '/adduser'];

  // Define JK Management paths that should be restricted for Role ID 3
  const jkManagementPaths = [
    '/addnotifications',
    '/addbanner',
    '/addpicingallery',
    '/addimportentlinks',
    '/addfaculity',
    '/latestpost',
  ];

  // Check if user has Role ID 3 and is trying to access a restricted page
  if (user.roleId === 3) {
    const isTryingToAccessRestrictedPath = !allowedPathsForRole3.includes(location.pathname);
    const isTryingToAccessJKManagement = jkManagementPaths.includes(location.pathname);

    if (isTryingToAccessRestrictedPath) {
      console.log(`Redirecting to /unauthorized because roleId 3 user is trying to access ${location.pathname}`);
      return <Navigate to="/unauthorized" replace />;
    }

    // If trying to access JK Management paths, redirect to unauthorized
    if (isTryingToAccessJKManagement) {
      console.log(`Redirecting to /unauthorized because roleId 3 user is trying to access JK Management path: ${location.pathname}`);
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // console.log('Access granted');
  return <>{children}</>;
};

export default ProtectedRoute;