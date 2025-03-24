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
  documents?: string;
  monthlySalary?: number;
  yearlyLeave?: number;
  created_by: string;
  created_on: string;
  modify_by?: string;
  modify_on?: string;
}

interface FacultyContextType {
  faculties: Faculty[];
  fetchFaculties: () => Promise<void>;
  addFaculty: (faculty: Omit<Faculty, "id" | "created_on" | "modify_on">, profilePic?: File, documents?: File[], documentTitles?: string[]) => Promise<void>;
  updateFaculty: (id: number, faculty: Omit<Faculty, "id" | "created_on" | "modify_on">, profilePic?: File, documents?: File[], documentTitles?: string[], existingDocuments?: { title: string; url: string }[]) => Promise<void>;
  deleteFaculty: (id: number) => Promise<void>;
  toggleVisibility: (id: number, modifyBy: string) => Promise<void>;
}

const FacultyContext = createContext<FacultyContextType | undefined>(undefined);

export const FacultyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [faculties, setFaculties] = useState<Faculty[]>([]);

  const fetchFaculties = async () => {
    try {
      const res = await axiosInstance.get<Faculty[]>("/faculty");
      setFaculties(res.data);
    } catch (error) {
      console.error("Error fetching faculties:", error);
      toast.error("Error fetching faculties");
    }
  };

  const addFaculty = async (
    faculty: Omit<Faculty, "id" | "created_on" | "modify_on">,
    profilePic?: File,
    documents?: File[],
    documentTitles?: string[]
  ) => {
    try {
      const formData = new FormData();
      formData.append("faculty_name", faculty.faculty_name);
      formData.append("qualification", faculty.qualification);
      formData.append("designation", faculty.designation);
      formData.append("created_by", faculty.created_by);
      if (faculty.monthlySalary !== undefined) formData.append("monthlySalary", faculty.monthlySalary.toString());
      if (faculty.yearlyLeave !== undefined) formData.append("yearlyLeave", faculty.yearlyLeave.toString());
      formData.append("IsVisible", faculty.IsVisible?.toString() ?? "true");
      if (documentTitles && documentTitles.length > 0) {
        formData.append("documentTitles", JSON.stringify(documentTitles));
      }

      if (profilePic) formData.append("profilePic", profilePic);
      if (documents && documents.length > 0) {
        documents.forEach((doc) => formData.append("documents", doc));
      }

      await axiosInstance.post("/faculty/add", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Faculty added successfully!");
      await fetchFaculties(); // Ensure this runs only once
    } catch (error) {
      console.error("Error adding faculty:", error);
      toast.error("Error adding faculty");
    }
  };

  const updateFaculty = async (
    id: number,
    faculty: Omit<Faculty, "id" | "created_on" | "modify_on">,
    profilePic?: File,
    documents?: File[],
    documentTitles?: string[],
    existingDocuments?: { title: string; url: string }[]
  ) => {
    try {
      const formData = new FormData();
      formData.append("faculty_name", faculty.faculty_name);
      formData.append("qualification", faculty.qualification);
      formData.append("designation", faculty.designation);
      formData.append("created_by", faculty.created_by);
      formData.append("modify_by", faculty.modify_by || "Admin");
      if (faculty.monthlySalary !== undefined) formData.append("monthlySalary", faculty.monthlySalary.toString());
      if (faculty.yearlyLeave !== undefined) formData.append("yearlyLeave", faculty.yearlyLeave.toString());
      if (faculty.IsVisible !== undefined) formData.append("IsVisible", faculty.IsVisible.toString());
      if (documentTitles && documentTitles.length > 0) {
        formData.append("documentTitles", JSON.stringify(documentTitles));
      }
      if (existingDocuments && existingDocuments.length > 0) {
        formData.append("existingDocuments", JSON.stringify(existingDocuments));
      }

      if (profilePic) formData.append("profilePic", profilePic);
      if (documents && documents.length > 0) {
        documents.forEach((doc) => formData.append("documents", doc));
      }

      await axiosInstance.put(`/faculty/update/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Faculty updated successfully!");
      await fetchFaculties(); // Ensure this runs only once
    } catch (error) {
      console.error("Error updating faculty:", error);
      toast.error("Error updating faculty");
    }
  };

  const deleteFaculty = async (id: number) => {
    try {
      await axiosInstance.delete(`/faculty/delete/${id}`);
      toast.success("Faculty deleted successfully!");
      await fetchFaculties();
    } catch (error) {
      console.error("Error deleting faculty:", error);
      toast.error("Error deleting faculty");
    }
  };

  const toggleVisibility = async (id: number, modifyBy: string) => {
    try {
      await axiosInstance.put(`/faculty/toggle-visibility/${id}`, { modify_by: modifyBy });
      toast.success("Faculty visibility updated successfully!");
      await fetchFaculties();
    } catch (error) {
      console.error("Error toggling visibility:", error);
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