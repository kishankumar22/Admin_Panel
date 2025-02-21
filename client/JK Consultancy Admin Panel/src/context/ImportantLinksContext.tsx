import React, { createContext, useContext, useEffect, useState } from 'react';
import axiosInstance from '../config';
import { toast } from 'react-toastify';

interface ImportantLink {
  [x: string]: any;
  LOGOUrl: string | undefined;
  id: number;
  logoName: string;
  linksUrl: string;
  created_by: string;
  created_on: string;
  modify_by?: string;
  modify_on?: string;
  logoUrl?: string;
  logoPosition: number;
  isVisible: boolean; // Track visibility
}

interface ImportantLinksContextType {
  links: ImportantLink[];
  fetchLinks: () => Promise<void>;
  uploadLink: (
    logoName: string,
    linksUrl: string,
    created_by: string,
    logo: File | null,
    logoPosition: number,
    isVisible: boolean // Add isVisible parameter
  ) => Promise<void>;
  deleteLink: (id: number) => Promise<void>;
  updateLink: (

    id: number,
    logoName: string,
    linksUrl: string,
    modify_by: string,
    logo: File | null,
    logoPosition: number
  ) => Promise<void>;
  toggleVisibility: (id: number, modifyBy: string, isVisible: boolean) => Promise<void>; // Add isVisible parameter
}

const ImportantLinksContext = createContext<ImportantLinksContextType | undefined>(undefined);

export const ImportantLinksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [links, setLinks] = useState<ImportantLink[]>([]);

  const fetchLinks = async () => {
    try {
      const response = await axiosInstance.get(`/important-links/all`);
      setLinks(response.data);
    } catch (error) {
      console.error('Error fetching links:', error);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  // Upload a new link
  const uploadLink = async (
    logoName: string,
    linksUrl: string,
    created_by: string,
    logo: File | null,
    logoPosition: number,
    isVisible: boolean // Add isVisible parameter
  ) => {
    try {
      const formData = new FormData();
      formData.append('logoName', logoName);
      formData.append('linksUrl', linksUrl);
      formData.append('created_by', created_by);
      formData.append('logoPosition', logoPosition.toString());
      formData.append('isVisible', JSON.stringify(isVisible)); // Include isVisible in the request
      if (logo) formData.append('file', logo);

      const response = await axiosInstance.post(`important-links/upload`, formData);
      setLinks((prev) => [...prev, response.data]);
    } catch (error) {
      console.error('Error uploading link:', error);
    }
  };

  // Delete a link by ID
  const deleteLink = async (id: number) => {
    try {
      await axiosInstance.delete(`important-links/delete/${id}`);
      setLinks((prev) => prev.filter((link) => link.id !== id));
    } catch (error) {
      console.error('Error deleting link:', error);
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

      const response = await axiosInstance.put(`important-links/update/${id}`, formData);
      setLinks((prev) => prev.map((link) => (link.id === id ? response.data : link)));
    } catch (error) {
      console.error('Error updating link:', error);
    }
  };

  // Toggle visibility of a link
  const toggleVisibility = async (id: number, modifyBy: string, isVisible: boolean) => {
    try {
      await axiosInstance.put(`/important-links/toggle-visibility/${id}`, { modify_by: modifyBy, isVisible });
      toast.success('Link visibility updated successfully!');
      fetchLinks(); // Refresh the links after toggling visibility
    } catch (error) {
      console.error(error);
      toast.error('Error updating link visibility');
    }
  };

  return (
    <ImportantLinksContext.Provider value={{ links, fetchLinks, uploadLink, deleteLink, updateLink, toggleVisibility }}>
      {children}
    </ImportantLinksContext.Provider>
  );
};

export const useImportantLinks = () => {
  const context = useContext(ImportantLinksContext);
  if (!context) {
    throw new Error('useImportantLinks must be used within an ImportantLinksProvider');
  }
  return context;
};