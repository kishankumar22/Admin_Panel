// src/context/BannerContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import axiosInstance from '../config';
import { toast } from 'react-toastify';

interface Banner {
  bannerPosition: number;
  bannerUrl: string | undefined;
  id: number;
  bannerName: string;
  created_by: string;
  created_on: string;
  modify_by?: string;
  modify_on?: string;
}

interface BannerContextType {
  banners: Banner[];
  fetchBanners: () => Promise<void>;
  uploadBanner: (file: File, bannerName: string, bannerPosition: string, createdBy: string) => Promise<void>;
  deleteBanner: (id: number) => Promise<void>;
  updateBanner: (id: number, bannerName: string, bannerPosition: string, file?: File, modifyBy?: string) => Promise<void>;
  swapImage: (selectedBannerId: number, newBannerId: number) => Promise<void>;
}

const BannerContext = createContext<BannerContextType | undefined>(undefined);

export const BannerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [banners, setBanners] = useState<Banner[]>([]);

  const fetchBanners = async () => {
    try {
      const res = await axiosInstance.get<Banner[]>('/banner/banners');
      setBanners(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Error fetching banners');
    }
  };

  const uploadBanner = async (file: File, bannerName: string, bannerPosition: string, createdBy: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bannerName', bannerName);
    formData.append('bannerPosition', bannerPosition);
    formData.append('created_by', createdBy);

    try {
      await axiosInstance.post('/banner/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Banner uploaded successfully!');
      fetchBanners();
    } catch (error) {
      console.error(error);
      toast.error('Error uploading banner');
    }
  };

  const deleteBanner = async (id: number) => {
    try {
      await axiosInstance.delete(`/banner/delete/${id}`);
      toast.success('Banner deleted successfully!');
      fetchBanners();
    } catch (error) {
      console.error(error);
      toast.error('Error deleting banner');
    }
  };

  const updateBanner = async (id: number, bannerName: string, bannerPosition: string, file?: File, modifyBy?: string) => {
    const formData = new FormData();
    formData.append('bannerName', bannerName);
    formData.append('bannerPosition', bannerPosition);
    if (file) {
      formData.append('file', file);
    }
    if (modifyBy) {
      formData.append('modify_by', modifyBy);
    }

    try {
      await axiosInstance.put(`/banner/update/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Banner updated successfully!');
      fetchBanners();
    } catch (error) {
      console.error(error);
      toast.error('Error updating banner');
    }
  };

  const swapImage = async (selectedBannerId: number, newBannerId: number) => {
    try {
      await axiosInstance.post(`/banner/swap/${selectedBannerId}/${newBannerId}`);
      toast.success('Banner position swapped successfully!');
      fetchBanners();
    } catch (error) {
      console.error(error);
      toast.error('Error swapping banner position');
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  return (
    <BannerContext.Provider value={{ banners, fetchBanners, uploadBanner, deleteBanner, updateBanner, swapImage }}>
      {children}
    </BannerContext.Provider>
  );
};

export const useBanner = () => {
  const context = useContext(BannerContext);
  if (!context) {
    throw new Error('useBanner must be used within a BannerProvider');
  }
  return context;
};