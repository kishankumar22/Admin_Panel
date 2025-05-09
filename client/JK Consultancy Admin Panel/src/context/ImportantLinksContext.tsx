import React, { createContext, useContext, useEffect, useState} from 'react';
import axiosInstance from '../config';
import { toast } from 'react-toastify';

interface ImportantLink {
  id: number;
  logoName: string;
  LOGOUrl: string;
  linksUrl: string;
  publicId?: string;
  logoPosition: number;
  created_by: string;
  created_on: string;
  modify_by?: string | null;
  modify_on?: string | null;
  IsVisible: boolean;
}

interface ImportantLinksContextType {
  links: ImportantLink[];
  fetchLinks: () => Promise<void>;
  uploadLink: (
    logoName: string,
    linksUrl: string,
    created_by: string,
    logo: File | null,
    logoPosition: number
  ) => Promise<void>;
  updateLink: (
    id: number,
    logoName: string,
    linksUrl: string,
    modify_by: string,
    logo: File | null,
    logoPosition: number
  ) => Promise<void>;
  deleteLink: (id: number) => Promise<void>;
  toggleVisibility: (id: number, modifyBy: string) => Promise<void>;
}

const ImportantLinksContext = createContext<ImportantLinksContextType | undefined>(undefined);

export const ImportantLinksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [links, setLinks] = useState<ImportantLink[]>([]);

  // Fetch all links
  const fetchLinks = async () => {
    try {
      const response = await axiosInstance.get('/important-links/all');
      setLinks(response.data || []); // Ensure empty array if response.data is undefined
      // console.log('Links fetched successfully:', response.data.length);
    } catch (error: any) {
      console.error('Error fetching links:', error.response?.data || error.message);
      toast.error('Failed to fetch links');
      throw new Error('Failed to fetch links');
    }
  };

  // Upload a new link
  const uploadLink = async (
    logoName: string,
    linksUrl: string,
    created_by: string,
    logo: File | null,
    logoPosition: number
  ) => {
    try {
      const formData = new FormData();
      formData.append('logoName', logoName);
      formData.append('linksUrl', linksUrl);
      formData.append('created_by', created_by);
      formData.append('logoPosition', logoPosition.toString());
      if (logo) formData.append('file', logo);

      const response = await axiosInstance.post('/important-links/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await fetchLinks(); // Refresh links after upload
      toast.success(response.data.message || 'Link uploaded successfully');
      console.log('Link uploaded:', logoName);
    } catch (error: any) {
      console.error('Error uploading link:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'Failed to upload link');
      throw new Error(error.response?.data?.message || 'Failed to upload link');
    }
  };

  // Update an existing link
  const updateLink = async (
    id: number,
    logoName: string,
    linksUrl: string,
    modify_by: string,
    logo: File | null,
    logoPosition: number
  ) => {
    try {
      const formData = new FormData();
      formData.append('logoName', logoName);
      formData.append('linksUrl', linksUrl);
      formData.append('modify_by', modify_by);
      formData.append('logoPosition', logoPosition.toString());
      if (logo) formData.append('file', logo);

      const response = await axiosInstance.put(`/important-links/update/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await fetchLinks(); // Refresh links after update
      toast.success(response.data.message || 'Link updated successfully');
      console.log('Link updated:', logoName);
    } catch (error: any) {
      console.error('Error updating link:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'Failed to update link');
      throw new Error(error.response?.data?.message || 'Failed to update link');
    }
  };

  // Delete a link
  const deleteLink = async (id: number) => {
    try {
      const response = await axiosInstance.delete(`/important-links/delete/${id}`);
      await fetchLinks(); // Refresh links after deletion
      toast.success(response.data.message || 'Link deleted successfully');
      console.log('Link deleted:', id);
    } catch (error: any) {
      console.error('Error deleting link:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'Failed to delete link');
      throw new Error(error.response?.data?.message || 'Failed to delete link');
    }
  };

  // Toggle visibility of a link
  const toggleVisibility = async (id: number, modifyBy: string) => {
    try {
      const response = await axiosInstance.put(`/important-links/toggle-visibility/${id}`, { modify_by: modifyBy });
      await fetchLinks(); // Refresh links after toggling visibility
      toast.success(response.data.message || 'Link visibility updated successfully');
      console.log('Link visibility toggled:', id);
    } catch (error: any) {
      console.error('Error toggling link visibility:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'Failed to update link visibility');
      throw new Error(error.response?.data?.message || 'Failed to update link visibility');
    }
  };

  useEffect(() => {
    fetchLinks(); // Fetch links on mount
  }, []);

  return (
    <ImportantLinksContext.Provider
      value={{ links, fetchLinks, uploadLink, updateLink, deleteLink, toggleVisibility }}
    >
      {children}
    </ImportantLinksContext.Provider>
  );
};

export const useImportantLinks = (): ImportantLinksContextType => {
  const context = useContext(ImportantLinksContext);
  if (!context) {
    throw new Error('useImportantLinks must be used within an ImportantLinksProvider');
  }
  return context;
};