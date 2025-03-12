import React, { createContext, useContext, useEffect, useState } from "react";

import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../config";

interface Role {
  name: string;
  role_id: number;
}

interface Page {
  pageId: number;
  pageName: string;
  pageUrl: string;
  created_by: string;
  created_on: Date;
}

interface Permission {
  roleId: number;
  pageId: number;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

type ActionSelection = {
  [roleId: number]: { [pageId: number]: string[] };
};

interface PermissionsContextType {
  roles: Role[];
  pages: Page[];
  permissions: Permission[];
  selectedActions: ActionSelection;
  fetchRoles: () => Promise<void>;
  fetchPages: () => Promise<void>;
  fetchPermissions: () => Promise<void>;
  handleActionChange: (roleId: number, pageId: number, action: string) => void;
  savePermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const createdBy = user?.name ;
  const modify_by = user?.name;

  const [roles, setRoles] = useState<Role[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedActions, setSelectedActions] = useState<ActionSelection>({});

  // Fetch Roles
  const fetchRoles = async () => {
    try {
      const response = await axiosInstance.get("/getrole");
      setRoles(response.data.role);
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
  };

  // Fetch Pages
  const fetchPages = async () => {
    try {
      const response = await axiosInstance.get("/pages");
      setPages(response.data);
    } catch (err) {
      toast.error("Error fetching pages");
      console.error(err);
    }
  };

  // Fetch Existing Permissions
  const fetchPermissions = async () => {
    try {
      const response = await axiosInstance.get("/permissions");
      setPermissions(response.data);

      // Convert permissions to selectedActions format
      const formattedPermissions: ActionSelection = {};
      response.data.forEach((perm: Permission) => {
        if (!formattedPermissions[perm.roleId]) formattedPermissions[perm.roleId] = {};
        formattedPermissions[perm.roleId][perm.pageId] = [];

        if (perm.canCreate) formattedPermissions[perm.roleId][perm.pageId].push("Add");
        if (perm.canRead) formattedPermissions[perm.roleId][perm.pageId].push("View");
        if (perm.canUpdate) formattedPermissions[perm.roleId][perm.pageId].push("Edit");
        if (perm.canDelete) formattedPermissions[perm.roleId][perm.pageId].push("Delete");
      });

      setSelectedActions(formattedPermissions);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      toast.error("Error fetching permissions");
    }
  };

  // Handle Action Selection
  const handleActionChange = (roleId: number, pageId: number, action: string) => {
    setSelectedActions((prev) => {
      const updated = { ...prev };
      if (!updated[roleId]) updated[roleId] = {};
      if (!updated[roleId][pageId]) updated[roleId][pageId] = [];

      if (action === "selectall") {
        updated[roleId][pageId] = ["Add", "Delete", "Edit", "View"];
      } else if (action === "deselect") {
        updated[roleId][pageId] = [];
      } else {
        if (updated[roleId][pageId].includes(action)) {
          updated[roleId][pageId] = updated[roleId][pageId].filter((a) => a !== action);
        } else {
          updated[roleId][pageId].push(action);
        }
      }
      return { ...updated };
    });
  };

  // Save Permissions
  const savePermissions = async () => {
    try {
      const permissionsToSave = Object.keys(selectedActions).flatMap((roleId) =>
        Object.keys(selectedActions[+roleId]).map((pageId) => ({
          roleId: +roleId,
          pageId: +pageId,
          canCreate: selectedActions[+roleId][+pageId]?.includes("Add"),
          canRead: selectedActions[+roleId][+pageId]?.includes("View"),
          canUpdate: selectedActions[+roleId][+pageId]?.includes("Edit"),
          canDelete: selectedActions[+roleId][+pageId]?.includes("Delete"),
          created_by: createdBy,
          modify_by: modify_by,
          modify_on: new Date().toISOString(),
        }))
      );

      await axiosInstance.post("/save-permissions", { permissions: permissionsToSave });
      toast.success("Permissions saved successfully!");
      fetchPermissions(); // Refresh after save
    } catch (error) {
      toast.error("Error saving permissions");
      console.error(error);
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchPages();
    fetchPermissions();
  }, []);

  return (
    <PermissionsContext.Provider
      value={{
        roles,
        pages,
        permissions,
        selectedActions,
        fetchRoles,
        fetchPages,
        fetchPermissions,
        handleActionChange,
        savePermissions,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error("usePermissions must be used within a PermissionsProvider");
  }
  return context;
};