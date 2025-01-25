import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosInstance from '../config';

interface Notification {
  notification_id: number;
  notification_message: string;
  notification_url: string | null;
  created_by: string;
  created_on: string;
  modify_by?: string | null;
  modify_on?: string | null;
}

interface NotificationContextProps {
  notifications: Notification[];
  fetchNotifications: () => void;
  addNotification: (formData: FormData) => Promise<void>;
  editNotification: (id: number, formData: FormData) => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

// Provider Component
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Fetch notifications from the backend
  const fetchNotifications = async () => {
    try {
      const response = await axiosInstance.get('/notifications/all-notification');
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Add a new notification
  const addNotification = async (formData: FormData) => {
    try {
      const response = await axiosInstance.post('/notifications/add-notification', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setNotifications((prev) => [...prev, response.data.data]); // Add the new notification
    } catch (error: any) {
      console.error('Error adding notification:', error.response?.data || error.message);
      throw error; // Throw error for handling in the component
    }
  };

  // Edit an existing notification
  const editNotification = async (id: number, formData: FormData) => {
    try {
      const response = await axiosInstance.put(`/notifications/edit/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.notification_id === id ? response.data.data : notification
        )
      );
    } catch (error: any) {
      console.error('Error editing notification:', error.response?.data || error.message);
      throw error; // Throw error for handling in the component
    }
  };

  // Delete a notification
  const deleteNotification = async (id: number) => {
    try {
      await axiosInstance.delete(`/notifications/delete/${id}`);
      setNotifications((prev) => prev.filter((notification) => notification.notification_id !== id));
    } catch (error: any) {
      console.error('Error deleting notification:', error.response?.data || error.message);
      throw error; // Throw error for handling in the component
    }
  };

  useEffect(() => {
    fetchNotifications(); // Fetch notifications on mount
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        fetchNotifications,
        addNotification,
        editNotification,
        deleteNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

// Custom Hook for consuming the context
export const useNotifications = (): NotificationContextProps => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
