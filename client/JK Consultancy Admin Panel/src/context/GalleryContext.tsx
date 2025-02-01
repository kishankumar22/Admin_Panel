// src/context/GalleryContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import axiosInstance from '../config';
import { toast } from 'react-toastify';

interface Gallery {
  galleryPosition: number;
  galleryUrl: string | undefined;
  id: number;
  galleryName: string;
  created_by: string;
  created_on: string;
  modify_by?: string;
  modify_on?: string;
  IsVisible: boolean;
}

interface GalleryContextType {
  galleries: Gallery[];
  fetchGalleries: () => Promise<void>;
  uploadGallery: (file: File, galleryName: string, galleryPosition: string, createdBy: string) => Promise<void>;
  deleteGallery: (id: number) => Promise<void>;
  updateGallery: (id: number, galleryName: string, galleryPosition: string, file?: File, modifyBy?: string) => Promise<void>;
  toggleVisibility: (id: number, modifyBy: string) => Promise<void>;
}

const GalleryContext = createContext<GalleryContextType | undefined>(undefined);

export const GalleryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [galleries, setGalleries] = useState<Gallery[]>([]);

  const fetchGalleries = async () => {
    try {
      const res = await axiosInstance.get<Gallery[]>('/gallery');
      setGalleries(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Error fetching galleries');
    }
  };

  const uploadGallery = async (file: File, galleryName: string, galleryPosition: string, createdBy: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('galleryName', galleryName);
    formData.append('galleryPosition', galleryPosition);
    formData.append('created_by', createdBy);

    try {
      await axiosInstance.post('/gallery/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Gallery uploaded successfully!');
      fetchGalleries();
    } catch (error) {
      console.error(error);
      toast.error('Error uploading gallery');
    }
  };
  const deleteGallery = async (id: number) => {
    console.log('Deleting gallery with ID:', id); // Debugging
    try {
      await axiosInstance.delete(`/gallery/delete/${id}`);
      toast.success('Gallery deleted successfully!');
      fetchGalleries();
    } catch (error) {
      console.error(error);
      toast.error('Error deleting gallery');
    }
  };

  const updateGallery = async (id: number, galleryName: string, galleryPosition: string, file?: File, modifyBy?: string) => {
    const formData = new FormData();
    formData.append('galleryName', galleryName);
    formData.append('galleryPosition', galleryPosition);
    if (file) {
      formData.append('file', file);
    }
    if (modifyBy) {
      formData.append('modify_by', modifyBy);
    }

    try {
      await axiosInstance.put(`/gallery/update/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Gallery updated successfully!');
      fetchGalleries();
    } catch (error) {
      console.error(error);
      toast.error('Error updating gallery');
    }
  };

  const toggleVisibility = async (id: number, modifyBy: string) => {
    try {
      await axiosInstance.put(`/gallery/toggle-visibility/${id}`, { modify_by: modifyBy });
      toast.success('Gallery visibility updated successfully!');
      fetchGalleries();
    } catch (error) {
      console.error(error);
      toast.error('Error updating gallery visibility');
    }
  };

  useEffect(() => {
    fetchGalleries();
  }, []);

  return (
    <GalleryContext.Provider value={{ galleries, fetchGalleries, uploadGallery, deleteGallery, updateGallery, toggleVisibility }}>
      {children}
    </GalleryContext.Provider>
  );
};

export const useGallery = () => {
  const context = useContext(GalleryContext);
  if (!context) {
    throw new Error('useGallery must be used within a GalleryProvider');
  }
  return context;
};