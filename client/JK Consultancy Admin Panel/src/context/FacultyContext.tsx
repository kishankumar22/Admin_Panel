import React, { createContext, useContext, useEffect, useState } from "react";
import axiosInstance from "../config";
import { toast } from "react-toastify";

export interface Faculty {
  IsVisible: boolean | undefined;
  id?: number;
  faculty_name: string;
  qualification: string;
  designation: string;
  profilePicUrl?: string;
  created_by: string;
  created_on: string;
  modify_by?: string;
  modify_on?: string;
  // Add isVisible field
}

interface FacultyContextType {
  faculties: Faculty[];
  fetchFaculties: () => Promise<void>;
  addFaculty: (faculty: Omit<Faculty, "id" | "created_on" | "modify_on">, file?: File) => Promise<void>;
  updateFaculty: (id: number, faculty: Omit<Faculty, "id" | "created_on" | "modify_on">, file?: File) => Promise<void>;
  deleteFaculty: (id: number) => Promise<void>;
  toggleVisibility: (id: number, modifyBy: string) => Promise<void>; // Add toggleVisibility
}

const FacultyContext = createContext<FacultyContextType | undefined>(undefined);

export const FacultyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [faculties, setFaculties] = useState<Faculty[]>([]);

  const fetchFaculties = async () => {
    try {
      const res = await axiosInstance.get<Faculty[]>("/faculty");
      setFaculties(res.data);
    } catch (error) {
      console.error(error);
      toast.error("Error fetching faculties");
    }
  };

  const addFaculty = async (faculty: Omit<Faculty, "id" | "created_on" | "modify_on">, file?: File) => {
    try {
      const formData = new FormData();
      formData.append("faculty_name", faculty.faculty_name);
      formData.append("qualification", faculty.qualification);
      formData.append("designation", faculty.designation);
      formData.append("created_by", faculty.created_by);
      if (file) {
        formData.append("file", file);
      }

      await axiosInstance.post("/faculty/add", formData);
      toast.success("Faculty added successfully!");
      fetchFaculties();
    } catch (error) {
      console.error(error);
      toast.error("Error adding faculty");
    }
  };

  const updateFaculty = async (id: number, faculty: Omit<Faculty, "id" | "created_on" | "modify_on">, file?: File) => {
    try {
      const formData = new FormData();
      formData.append("faculty_name", faculty.faculty_name);
      formData.append("qualification", faculty.qualification);
      formData.append("designation", faculty.designation);
      formData.append("created_by", faculty.created_by);
      formData.append("modify_by", faculty.modify_by || "Admin");
      if (file) {
        formData.append("file", file);
      }

      await axiosInstance.put(`/faculty/update/${id}`, formData);
      toast.success("Faculty updated successfully!");
      fetchFaculties();
    } catch (error) {
      console.error(error);
      toast.error("Error updating faculty");
    }
  };

  const deleteFaculty = async (id: number) => {
    try {
      await axiosInstance.delete(`/faculty/delete/${id}`);
      toast.success("Faculty deleted successfully!");
      fetchFaculties();
    } catch (error) {
      console.error(error);
      toast.error("Error deleting faculty");
    }
  };

  const toggleVisibility = async (id: number, modifyBy: string) => {
    try {
      await axiosInstance.put(`/faculty/toggle-visibility/${id}`, { modify_by: modifyBy });
      toast.success("Faculty visibility updated successfully!");
      fetchFaculties();
    } catch (error) {
      console.error(error);
      toast.error("Error updating faculty visibility");
    }
  };

  useEffect(() => {
    fetchFaculties();
  }, []);

  return (
    <FacultyContext.Provider
      value={{ faculties, fetchFaculties, addFaculty, updateFaculty, deleteFaculty, toggleVisibility }}
    >
      {children}
    </FacultyContext.Provider>
  );
};

export const useFaculty = () => {
  const context = useContext(FacultyContext);
  if (!context) {
    throw new Error("useFaculty must be used within a FacultyProvider");
  }
  return context;
};