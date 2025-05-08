import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  fetchNotifications: () => Promise<void>;
  addNotification: (formData: FormData) => Promise<void>;
  editNotification: (id: number, formData: FormData) => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  searchNotifications: (query: string) => Notification[];
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Fetch notifications from the backend
  const fetchNotifications = async () => {
    try {
      const response = await axiosInstance.get('/notifications/all-notification');
      setNotifications(response.data || []); // Ensure empty array if response.data is undefined
    } catch (error: any) {
      console.error('Error fetching notifications:', error.response?.data || error.message);
      throw new Error('Failed to fetch notifications');
    }
  };

  // Add a new notification
  const addNotification = async (formData: FormData) => {
    try {
      await axiosInstance.post('/notifications/add-notification', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await fetchNotifications(); // Refresh notifications after adding
    } catch (error: any) {
      console.error('Error adding notification:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to add notification');
    }
  };

  // Edit an existing notification
  const editNotification = async (id: number, formData: FormData) => {
    try {
      await axiosInstance.put(`/notifications/edit/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await fetchNotifications(); // Refresh notifications after editing
    } catch (error: any) {
      console.error('Error editing notification:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to edit notification');
    }
  };

  // Delete a notification
  const deleteNotification = async (id: number) => {
    try {
      await axiosInstance.delete(`/notifications/delete/${id}`);
      await fetchNotifications(); // Refresh notifications after deletion
    } catch (error: any) {
      console.error('Error deleting notification:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to delete notification');
    }
  };

  // Search notifications based on a query
  const searchNotifications = useCallback(
    (query: string): Notification[] => {
      if (!query) return notifications;
      return notifications.filter(
        (notification) =>
          notification.notification_message.toLowerCase().includes(query.toLowerCase()) ||
          notification.created_by.toLowerCase().includes(query.toLowerCase())
      );
    },
    [notifications]
  );

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
        searchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextProps => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};