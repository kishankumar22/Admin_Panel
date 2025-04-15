// context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

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
  login: (token: string, userDetails: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userDetails = localStorage.getItem('user');
    setIsLoggedIn(!!token);
    if (userDetails) {
      try {
        setUser(JSON.parse(userDetails));
      } catch (error) {
        console.error('Error parsing user details from local storage:', error);
        setUser(null);
      }
    }
  }, []);

  const login = (token: string, userDetails: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userDetails));
    setIsLoggedIn(true);
    setUser(userDetails);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUser(null);
    window.location.reload();
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};