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
  user: User | null; // Store user details
  login: (token: string, userDetails: User) => void; // Update login to accept user details
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [user, setUser ] = useState<User | null>(null); // State to hold user details

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userDetails = localStorage.getItem('user'); // Retrieve user details from local storage
    setIsLoggedIn(!!token);
    if (userDetails) {
      try {
        setUser (JSON.parse(userDetails)); // Parse and set user details
      } catch (error) {
        console.error('Error parsing user details from local storage:', error);
        setUser (null); // Reset user if parsing fails
      }
    }
  }, []);

  const login = (token: string, userDetails: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userDetails)); // Store user details in local storage
    setIsLoggedIn(true);
    setUser (userDetails); // Set user details in state
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user'); // Remove user details from local storage
    setIsLoggedIn(false);
    setUser (null); // Clear user details from state
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