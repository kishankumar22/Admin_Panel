import React, { useState, useRef, useEffect } from "react";
import Breadcrumb from "../../components/Breadcrumbs/Breadcrumb";
import { usePermissions } from "../../context/PermissionsContext";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import { FaPlus, FaSave, FaSpinner, FaTimes } from "react-icons/fa";

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
    fetchPages
  } = usePermissions();

  useEffect(() => {
    const fetchData = async () => {
      await fetchRoles();
      await fetchPages();
      await fetchPermissions();
    };
    fetchData();
  }, []);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredPages, setFilteredPages] = useState(pages); // Added state for filtered pages
  const [isSearchLoading, setIsSearchLoading] = useState(false); // Added for search loader
  const [dropdownOpen, setDropdownOpen] = useState<{ [key: number]: { [key: number]: boolean } }>({});
  const dropdownRefs = useRef<{ [key: number]: { [key: number]: HTMLDivElement | null } }>({});
  const buttonRefs = useRef<{ [key: number]: { [key: number]: HTMLButtonElement | null } }>({});

  // Handle search with loader
  useEffect(() => {
    setIsSearchLoading(true);
    const filtered = pages.filter((page) =>
      page.pageName.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredPages(filtered);
    const timer = setTimeout(() => {
      setIsSearchLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, pages]);

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
      <Breadcrumb pageName="Manage Role Assign" />
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
              <FaPlus className="inline-block mr-1" />
              Go to Create Page
            </button>
          </Link>

          <button
            onClick={savePermissions}
            className="bg-blue-500 text-white px-4 py-1 rounded text-xs hover:bg-blue-600 transition duration-200"
          >
            <FaSave className="inline-block mr-1" />
            Save
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-md">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-200 text-gray-600 uppercase text-xs leading-normal">
              <th className="px-2 py-1 text-left">Sr.</th>
              <th className="px-2 py-1 text-left">Page</th>
              {roles.map(
                (role) =>
                  role.role_id !== userRole && role.role_id !== 2 && (
                    <th key={role.role_id} className="px-2 py-1 text-left">
                      {role.name}
                    </th>
                  )
              )}
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm">
            {isSearchLoading ? (
              <tr>
                <td colSpan={roles.length + 1} className=" text-center">
                  <div className="flex flex-col items-center justify-center min-h-[200px] bg-gray-50 border-t border-gray-200">
                    <FaSpinner className="animate-spin h-8 w-8 text-blue-600 mb-3" />
                    <p className="text-sm font-medium text-gray-600">Searching...</p>
                  </div>
                </td>
              </tr>
            ) : filteredPages.length > 0 ? (
              filteredPages.map((page, index) => (
                <tr key={page.pageId} className="border-b border-gray-200 hover:bg-gray-100">
                  <td className="py-1 px-2">{index+1}</td>
                  <td className="py-1 px-2">{page.pageName}</td>
                  {roles.map(
                    (role) =>
                      role.role_id !== userRole && role.role_id !== 2 && (
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
                                      selectedActions[role.role_id]?.[page.pageId]?.length === 4
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
                <td colSpan={roles.length + 1} className=" text-left text-xl text-gray-500">
  <div className="flex flex-col items-center justify-center min-h-[200px] bg-gray-50 border-t border-gray-200">
    <p className="mb-1">
      No pages found for the search query: <span className="font-bold">"{searchQuery}"</span>
    </p>
    <button 
      className="text-blue-500 hover:text-blue-700 text-md flex items-center gap-1"
      onClick={() => setSearchQuery('')}
    >
      <FaTimes className="text-red-500 text-sm" />
      <span>Clear search</span>
    </button>
  </div>
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