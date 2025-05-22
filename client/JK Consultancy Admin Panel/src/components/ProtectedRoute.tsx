import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';

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
  const { permissions, pages } = usePermissions();
  const location = useLocation();
  const currentPath = location.pathname;

  // If user is not logged in, redirect to signin
  if (!isLoggedIn || !user) {
    console.log('Redirecting to /auth/signin because user is not logged in');
    return <Navigate to="/auth/signin" replace />;
  }

  // Always allow access to Dashboard
  if (currentPath === '/') {
    return <>{children}</>;
  }

  // Administrators (roleId === 2) have access to all pages
  if (user.roleId === 2) {
    return <>{children}</>;
  }

  // Find the page by matching pageUrl with currentPath
  const page = pages.find(p => p.pageUrl === currentPath);
  if (!page) {
    console.log(`Redirecting to /unauthorized because page not found for path: ${currentPath}`);
    return <Navigate to="/unauthorized" replace />;
  }

  // Find permissions for the page and user's role
  const permission = permissions.find(p => p.pageId === page.pageId && p.roleId === user.roleId);
  if (!permission || !(permission.canCreate || permission.canRead || permission.canUpdate || permission.canDelete)) {
    console.log(`Redirecting to /unauthorized because user (roleId: ${user.roleId}) has no permissions for path: ${currentPath}`);
    return <Navigate to="/unauthorized" replace />;
  }

  // Access granted if permissions exist
  return <>{children}</>;
};

export default ProtectedRoute;