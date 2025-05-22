import React, { useState, useRef, useEffect } from "react";
import Breadcrumb from "../../components/Breadcrumbs/Breadcrumb";
import { usePermissions } from "../../context/PermissionsContext";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import { FaPlus, FaSave } from "react-icons/fa";

const AssignRolePage: React.FC = () => {
  const { user } = useAuth();
  const userRole = user?.roleId;
  const {
    roles,
    pages,
    selectedActions,
    handleActionChange,
    savePermissions,
    fetchPermissions,
    fetchRoles,
    fetchPages  } = usePermissions();
//  console.log(roles)
//  console.log(pages)
 useEffect(() => {
    const fetchData = async () => {
      await fetchRoles();
      await fetchPages();
      await fetchPermissions();
    };
    fetchData();
  }, []);
  

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [dropdownOpen, setDropdownOpen] = useState<{ [key: number]: { [key: number]: boolean } }>({});
  const dropdownRefs = useRef<{ [key: number]: { [key: number]: HTMLDivElement | null } }>({});
  const buttonRefs = useRef<{ [key: number]: { [key: number]: HTMLButtonElement | null } }>({});

  // Filter pages based on the search query
  const filteredPages = pages.filter((page) =>
    page.pageName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle click outside dropdown
  const handleClickOutside = (event: MouseEvent) => {
    Object.keys(dropdownRefs.current).forEach((roleId) => {
      Object.keys(dropdownRefs.current[+roleId] || {}).forEach((pageId) => {
        if (
          dropdownRefs.current[+roleId]?.[+pageId] &&
          !dropdownRefs.current[+roleId]?.[+pageId]?.contains(event.target as Node) &&
          !buttonRefs.current[+roleId]?.[+pageId]?.contains(event.target as Node)
        ) {
          setDropdownOpen((prev) => ({
            ...prev,
            [+roleId]: { ...prev[+roleId], [+pageId]: false },
          }));
        }
      });
    });
  };

  // Attach click outside listener
  React.useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <Breadcrumb pageName="Assign page to role" />
      <div className="flex items-center justify-between mb-4">
      <input
        type="search"
        className="py-0.5 px-3 bg-white border border-gray-300 rounded-md text-sm w-80 placeholder:text-[.8rem] focus:outline-none focus:ring-4 focus:ring-blue-500 transition duration-200"
        placeholder="Search Pages here..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      <div className="flex items-center space-x-2">
        <Link to="/page-management">
          <button className="bg-orange-500 text-white px-4 py-1 rounded text-xs hover:bg-orange-600 transition duration-200">
            <FaPlus className="inline-block mr-1" /> {/* Create Page Icon */}
            Go to Create Page
          </button>
        </Link>

        <button
          onClick={savePermissions}
          className="bg-blue-500 text-white px-4 py-1 rounded text-xs hover:bg-blue-600 transition duration-200"
        >
          <FaSave className="inline-block mr-1" /> {/* Save Icon */}
          Save
        </button>
      </div>
    </div>


      <div className="mt-4 rounded-md">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-200 text-gray-600 uppercase text-xs leading-normal">
              <th className="px-2 py-1 text-left">Page</th>
              {roles.map(
                (role) =>
                  role.role_id !== userRole && role.role_id !== 2 && ( // Exclude userRole and role_id 2 (Administrator)
                    <th key={role.role_id} className="px-2 py-1 text-left">
                      {role.name}
                    </th>
                  )
              )}
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm">
            {filteredPages.length > 0 ? (
              filteredPages.map((page) => (
                <tr key={page.pageId} className="border-b border-gray-200 hover:bg-gray-100">
                  <td className="py-1 px-2">{page.pageName}</td>
                  {roles.map(
                    (role) =>
                      role.role_id !== userRole && role.role_id !== 2 && ( // Exclude userRole and role_id 2 (Administrator)
                        <td key={role.role_id} className="px-2 py-1 relative">
                          <button
                            ref={(el) => (buttonRefs.current[role.role_id] = { [page.pageId]: el })}
                            onClick={() =>
                              setDropdownOpen((prev) => ({
                                ...prev,
                                [role.role_id]: {
                                  ...prev[role.role_id],
                                  [page.pageId]: !prev[role.role_id]?.[page.pageId],
                                },
                              }))
                            }
                            className="bg-gray-200 text-black px-2 py-1 rounded text-xs"
                          >
                            Select Actions
                          </button>
                          {dropdownOpen[role.role_id]?.[page.pageId] && (
                            <div
                              ref={(el) => (dropdownRefs.current[role.role_id] = { [page.pageId]: el })}
                              className="absolute z-10 mt-1 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5"
                            >
                              <div className="py-1">
                                <label className="flex items-center px-2 py-1 text-xs text-gray-700 hover:bg-gray-100">
                                  <input
                                    type="checkbox"
                                    checked={
                                      selectedActions[role.role_id]?.[page.pageId]?.length === 4 // 4 actions
                                    }
                                    onChange={() =>
                                      handleActionChange(
                                        role.role_id,
                                        page.pageId,
                                        selectedActions[role.role_id]?.[page.pageId]?.length === 4
                                          ? "deselect"
                                          : "selectall"
                                      )
                                    }
                                    className="mr-2"
                                  />
                                  Select All
                                </label>
                                {["Add", "Delete", "Edit", "View"].map((action) => (
                                  <label
                                    key={action}
                                    className="flex items-center px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedActions[role.role_id]?.[page.pageId]?.includes(action)}
                                      onChange={() =>
                                        handleActionChange(role.role_id, page.pageId, action)
                                      }
                                      className="mr-2"
                                    />
                                    {action}
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="mt-1 text-xs text-gray-600">
                            {selectedActions[role.role_id]?.[page.pageId]?.join(", ")}
                          </div>
                        </td>
                      )
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={roles.length + 1} className="py-4 text-center text-gray-500">
                  No pages found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default AssignRolePage;