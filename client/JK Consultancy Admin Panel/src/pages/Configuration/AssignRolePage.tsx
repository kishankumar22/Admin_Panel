import React, { useEffect, useState, useRef } from "react";
import Breadcrumb from "../../components/Breadcrumbs/Breadcrumb";
import axiosInstance from "../../config";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";

const actions = ["Add", "Delete", "Edit", "View"];

const AssignRolePage: React.FC = () => {
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

  // Explicitly define types
  type ActionSelection = {
    [role: string]: { [pageId: number]: string[] };
  };

  type DropdownState = {
    [role: string]: { [pageId: number]: boolean };
  };

  const [roles, setRoles] = useState<Role[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedActions, setSelectedActions] = useState<ActionSelection>({});
  const [dropdownOpen, setDropdownOpen] = useState<DropdownState>({});
  const dropdownRefs = useRef<{ [role: string]: { [pageId: number]: HTMLDivElement | null } }>({});
  const buttonRefs = useRef<{ [role: string]: { [pageId: number]: HTMLButtonElement | null } }>({});

  useEffect(() => {
    fetchRoles();
    fetchPages();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await axiosInstance.get("/getrole");
      setRoles(response.data.role);
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
  };

  const fetchPages = async () => {
    try {
      const response = await axiosInstance.get('/pages');
      setPages(response.data);
    } catch (err) {
      toast.error('Error fetching pages');
      console.error(err);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      Object.keys(dropdownRefs.current).forEach((role) => {
        Object.keys(dropdownRefs.current[role] || {}).forEach((pageId) => {
          if (
            dropdownRefs.current[role]?.[+pageId] &&
            !dropdownRefs.current[role]?.[+pageId]?.contains(event.target as Node) &&
            !buttonRefs.current[role]?.[+pageId]?.contains(event.target as Node)
          ) {
            setDropdownOpen((prev) => ({
              ...prev,
              [role]: { ...prev[role], [+pageId]: false },
            }));
          }
        });
      });
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleActionChange = (role: string, pageId: number, action: string) => {
    setSelectedActions((prev) => {
      const updated = { ...prev };
      if (!updated[role]) updated[role] = {};
      if (!updated[role][pageId]) updated[role][pageId] = [];

      if (action === "selectall") {
        updated[role][pageId] = [...actions];
      } else if (action === "deselect") {
        updated[role][pageId] = [];
      } else {
        if (updated[role][pageId].includes(action)) {
          updated[role][pageId] = updated[role][pageId].filter((a) => a !== action);
        } else {
          updated[role][pageId].push(action);
        }
      }
      return { ...updated };
    });
  };

  const toggleDropdown = (role: string, pageId: number) => {
    setDropdownOpen((prev) => ({
      ...prev,
      [role]: { ...prev[role], [pageId]: !prev[role]?.[pageId] },
    }));
  };

  const savePermissions = async () => {
    try {
      const permissionsToSave = Object.keys(selectedActions).flatMap((role) =>
        Object.keys(selectedActions[role]).map((pageId) => ({
          roleId: roles.find((r) => r.name === role)?.role_id || 0,
          pageId: +pageId,
          canCreate: selectedActions[role][+pageId].includes("Add"),
          canRead: selectedActions[role][+pageId].includes("View"),
          canUpdate: selectedActions[role][+pageId].includes("Edit"),
          canDelete: selectedActions[role][+pageId].includes("Delete"),
          created_by: "admin", // Replace with actual user
        }))
      );
  
      await axiosInstance.post('/save-permissions', { permissions: permissionsToSave });
      toast.success('Permissions saved successfully!');
    } catch (error) {
      toast.error('Error saving permissions');
      console.error(error);
    }
  };

  return (
    <>
      <Breadcrumb pageName="Assign page to role" />
      <div className="flex justify-between items-center p-2 bg-gray-100 rounded-lg shadow-md dark:bg-gray-700">
        <input
          type="search"
          placeholder="Search page..."
          className="p-1 w-64 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition duration-200"
        />
        <div className="flex space-x-2 ml-auto">
          <Link to="/page-management">
            <button className="bg-orange-500 text-white px-4 py-1 rounded"> Go to Create page </button>
          </Link>
          <button
            type="submit"
            onClick={()=>savePermissions}
            className="bg-green-500 text-white px-3 py-1 rounded-md text-sm hover:bg-green-600 transition duration-200"
          >
            Save
          </button>
        </div>
      </div>
      <div className="mt-4 rounded-md">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-200 text-gray-600 uppercase text-xs font-thin leading-normal">
              <th className="px-2 py-1.5 text-left">Page</th>
              {roles.map((role) => (
                <th key={role.role_id} className="px-2 py-1.5 text-left">{role.name}</th>
              ))}
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm font-light">
            {pages.map((page) => (
              <tr key={page.pageId} className="border-b text-xs h-14 border-gray-200 hover:bg-gray-100">
                <td className="py-1 px-2 align-middle">{page.pageName}</td>
                {roles.map((role) => (
                  <td key={role.role_id} className="px-6 py-1.5 relative">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedActions[role.name]?.[page.pageId]?.length === actions.length}
                        onChange={() =>
                          handleActionChange(
                            role.name,
                            page.pageId,
                            selectedActions[role.name]?.[page.pageId]?.length === actions.length ? "deselect" : "selectall"
                          )
                        }
                        className="cursor-pointer"
                      />
                      <button
                        ref={(el) => {
                          if (!buttonRefs.current[role.name]) buttonRefs.current[role.name] = {};
                          buttonRefs.current[role.name][page.pageId] = el;
                        }}
                        className="p-1 border rounded-md w-40 text-left "
                        onClick={() => toggleDropdown(role.name, page.pageId)}
                      >
                        Select Action
                      </button>
                      {dropdownOpen[role.name]?.[page.pageId] && (
                        
                        <div
                          ref={(el) => {
                            if (!dropdownRefs.current[role.name]) dropdownRefs.current[role.name] = {};
                            dropdownRefs.current[role.name][page.pageId] = el;
                          }}
                          className="absolute z-20 bg-white border rounded-md shadow-lg mt-25 w-48 p-1"
                        >
                          {actions.map((action) => (
                            <label key={action} className="flex items-center cursor-pointer px-2">
                              <input
                                type="checkbox"
                                checked={selectedActions[role.name]?.[page.pageId]?.includes(action)}
                                onChange={() => handleActionChange(role.name, page.pageId, action)}
                                className="cursor-pointer"
                              />
                              <span className="ml-2">{action}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="mt-1.5 flex gap-2">
                      {selectedActions[role.name]?.[page.pageId]?.map((action, i) => (
                        <span key={i} className="px-1 text-xs">
                          ✅ {action}
                        </span>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default AssignRolePage;



// import React, { useEffect, useState, useRef } from "react";
// import Breadcrumb from "../../components/Breadcrumbs/Breadcrumb";
// import axiosInstance from "../../config";
// import { toast } from "react-toastify";
// import { Link } from "react-router-dom";

// const actions = ["Add", "Delete", "Edit", "View"];

// const AssignRolePage: React.FC = () => {
//   interface Role {
//     name: string;
//     role_id: number;
//   }

//   interface Page {
//     pageId: number;
//     pageName: string;
//     pageUrl: string;
//     created_by: string;
//     created_on: Date;
//   }

//   interface Permission {
//     roleId: number;
//     pageId: number;
//     canCreate: boolean;
//     canRead: boolean;
//     canUpdate: boolean;
//     canDelete: boolean;
//   }

//   type ActionSelection = {
//     [roleId: number]: { [pageId: number]: string[] };
//   };

//   const [roles, setRoles] = useState<Role[]>([]);
//   const [pages, setPages] = useState<Page[]>([]);
//   const [permissions, setPermissions] = useState<Permission[]>([]);
//   const [selectedActions, setSelectedActions] = useState<ActionSelection>({});
//   const [dropdownOpen, setDropdownOpen] = useState<{ [key: number]: { [key: number]: boolean } }>({});
//   const dropdownRefs = useRef<{ [key: number]: { [key: number]: HTMLDivElement | null } }>({});
//   const buttonRefs = useRef<{ [key: number]: { [key: number]: HTMLButtonElement | null } }>({});

//   useEffect(() => {
//     fetchRoles();
//     fetchPages();
//     fetchPermissions();
//   }, []);

//   // Fetch Roles
//   const fetchRoles = async () => {
//     try {
//       const response = await axiosInstance.get("/getrole");
//       setRoles(response.data.role);
//     } catch (error) {
//       console.error("Error fetching roles:", error);
//     }
//   };

//   // Fetch Pages
//   const fetchPages = async () => {
//     try {
//       const response = await axiosInstance.get('/pages');
//       setPages(response.data);
//     } catch (err) {
//       toast.error('Error fetching pages');
//       console.error(err);
//     }
//   };

//   // Fetch Existing Permissions
//   const fetchPermissions = async () => {
//     try {
//       const response = await axiosInstance.get('/permissions');
//       setPermissions(response.data);
      
//       // Convert permissions to selectedActions format
//       const formattedPermissions: ActionSelection = {};
//       response.data.forEach((perm: Permission) => {
//         if (!formattedPermissions[perm.roleId]) formattedPermissions[perm.roleId] = {};
//         formattedPermissions[perm.roleId][perm.pageId] = [];

//         if (perm.canCreate) formattedPermissions[perm.roleId][perm.pageId].push("Add");
//         if (perm.canRead) formattedPermissions[perm.roleId][perm.pageId].push("View");
//         if (perm.canUpdate) formattedPermissions[perm.roleId][perm.pageId].push("Edit");
//         if (perm.canDelete) formattedPermissions[perm.roleId][perm.pageId].push("Delete");
//       });

//       setSelectedActions(formattedPermissions);
//     } catch (error) {
//       console.error("Error fetching permissions:", error);
//       toast.error("Error fetching permissions");
//     }
//   };

//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       Object.keys(dropdownRefs.current).forEach((roleId) => {
//         Object.keys(dropdownRefs.current[roleId] || {}).forEach((pageId) => {
//           if (
//             dropdownRefs.current[roleId]?.[+pageId] &&
//             !dropdownRefs.current[roleId]?.[+pageId]?.contains(event.target as Node) &&
//             !buttonRefs.current[roleId]?.[+pageId]?.contains(event.target as Node)
//           ) {
//             setDropdownOpen((prev) => ({
//               ...prev,
//               [roleId]: { ...prev[roleId], [+pageId]: false },
//             }));
//           }
//         });
//       });
//     };

//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   // Handle Action Selection
//   const handleActionChange = (roleId: number, pageId: number, action: string) => {
//     setSelectedActions((prev) => {
//       const updated = { ...prev };
//       if (!updated[roleId]) updated[roleId] = {};
//       if (!updated[roleId][pageId]) updated[roleId][pageId] = [];

//       if (action === "selectall") {
//         updated[roleId][pageId] = [...actions];
//       } else if (action === "deselect") {
//         updated[roleId][pageId] = [];
//       } else {
//         if (updated[roleId][pageId].includes(action)) {
//           updated[roleId][pageId] = updated[roleId][pageId].filter((a) => a !== action);
//         } else {
//           updated[roleId][pageId].push(action);
//         }
//       }
//       return { ...updated };
//     });
//   };

//   // Save Permissions
//   const savePermissions = async () => {
//     try {
//       const permissionsToSave = Object.keys(selectedActions).flatMap((roleId) =>
//         Object.keys(selectedActions[+roleId]).map((pageId) => ({
//           roleId: +roleId,
//           pageId: +pageId,
//           canCreate: selectedActions[+roleId][+pageId]?.includes("Add"),
//           canRead: selectedActions[+roleId][+pageId]?.includes("View"),
//           canUpdate: selectedActions[+roleId][+pageId]?.includes("Edit"),
//           canDelete: selectedActions[+roleId][+pageId]?.includes("Delete"),
//           created_by: "admin", // Replace with actual user
//         }))
//       );

//       await axiosInstance.post('/save-permissions', { permissions: permissionsToSave });
//       toast.success('Permissions saved successfully!');
//       fetchPermissions(); // Refresh after save
//     } catch (error) {
//       toast.error('Error saving permissions');
//       console.error(error);
//     }
//   };

//   return (
//     <>
//       <Breadcrumb pageName="Assign page to role" />
//       <div className="mt-4 rounded-md">
//         <table className="min-w-full bg-white border border-gray-200">
//           <thead>
//             <tr className="bg-gray-200 text-gray-600 uppercase text-xs font-thin leading-normal">
//               <th className="px-2 py-1.5 text-left">Page</th>
//               {roles.map((role) => (
//                 <th key={role.role_id} className="px-2 py-1.5 text-left">{role.name}</th>
//               ))}
//             </tr>
//           </thead>
//           <tbody className="text-gray-600 text-sm font-light">
//             {pages.map((page) => (
//               <tr key={page.pageId} className="border-b text-xs h-14 border-gray-200 hover:bg-gray-100">
//                 <td className="py-1 px-2">{page.pageName}</td>
//                 {roles.map((role) => (
//                   <td key={role.role_id} className="px-6 py-1.5 relative">
//                     <button
//                       onClick={() => handleActionChange(role.role_id, page.pageId, "selectall")}
//                       className="bg-green-500 text-white px-2 py-1 rounded text-xs"
//                     >
//                       Select All
//                     </button>
//                     {actions.map((action) => (
//                       <label key={action} className="ml-2 text-xs">
//                         <input
//                           type="checkbox"
//                           checked={selectedActions[role.role_id]?.[page.pageId]?.includes(action)}
//                           onChange={() => handleActionChange(role.role_id, page.pageId, action)}
//                         />
//                         {action}
//                       </label>
//                     ))}
//                   </td>
//                 ))}
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//       <button onClick={savePermissions} className="mt-4 bg-blue-500 text-white px-4 py-2 rounded">
//         Save
//       </button>
//     </>
//   );
// };

// export default AssignRolePage;
