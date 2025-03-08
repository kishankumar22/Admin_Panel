  import React, { useEffect, useState, useRef } from "react";
  import Breadcrumb from "../../components/Breadcrumbs/Breadcrumb";
  import axiosInstance from "../../config";

  const actions = ["Add", "Delete", "Edit"];

  const AssignRolePage: React.FC = () => {
    interface Role {
      name: string;
      role_id: number;
    }

    const [roles, setRoles] = useState<Role[]>([]);
    const [selectedActions, setSelectedActions] = useState<{ [key: string]: string[] }>({});
    const [dropdownOpen, setDropdownOpen] = useState<{ [key: string]: boolean }>({});
    const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
    const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

    useEffect(() => {
      fetchRoles();
    }, []);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        Object.keys(dropdownRefs.current).forEach((key) => {
          if (
            dropdownRefs.current[key] &&
            !dropdownRefs.current[key]?.contains(event.target as Node) &&
            !buttonRefs.current[key]?.contains(event.target as Node)
          ) {
            setDropdownOpen((prev) => ({ ...prev, [key]: false }));
          }
        });
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchRoles = async () => {
      try {
        const response = await axiosInstance.get("/getrole");
        setRoles(response.data.role);
      } catch (error) {
        console.error("Error fetching roles:", error);
      }
    };

    const handleActionChange = (role: string, action: string) => {
      setSelectedActions((prev) => {
        const updated = { ...prev };
        if (!updated[role]) updated[role] = [];

        if (action === "selectall") {
          updated[role] = [...actions];
        } else if (action === "deselect") {
          updated[role] = [];
        } else {
          if (updated[role].includes(action)) {
            updated[role] = updated[role].filter((a) => a !== action);
          } else {
            updated[role].push(action);
          }
        }
        return { ...updated };
      });
    };

    return (
      <>
        <Breadcrumb pageName="Assign page to role" />
  <div className="flex justify-between">
    <input type="search" placeholder=" serach page ...."className="p-1  rounded-md" />
    <button type="submit" className=" bg-green-200 px-4  rounded-md">save </button>
  </div>

        <div className="mt-4 rounded-md">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-200 text-gray-600 uppercase text-xs font-thin leading-normal">
                <th className="px-2 py-1.5 text-left">Page</th>
                {roles.map((role) => (
                  <th key={role.role_id} className="px-2 py-1.5 text-left">
                    {role.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm font-light">
              <tr className="border-b text-xs h-14 border-gray-200 hover:bg-gray-100">
                <td className="px-2">Add Notification</td>
                {roles.map((role) => (
                  <td key={role.role_id} className="px-6 py-1.5 relative">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedActions[role.name]?.length === actions.length}
                        onChange={() =>
                          handleActionChange(
                            role.name,
                            selectedActions[role.name]?.length === actions.length ? "deselect" : "selectall"
                          )
                        }
                        className="cursor-pointer"
                        disabled={role.role_id === 2}
                      />
                      <button
                        ref={(el) => (buttonRefs.current[role.name] = el)}
                        className="p-1 border rounded-md w-40 text-left"
                        onClick={() =>
                          setDropdownOpen((prev) => ({ ...prev, [role.name]: !prev[role.name] }))
                        }
                        disabled={role.role_id === 2}
                      >
                        Select Action
                      </button>
                      {dropdownOpen[role.name] && (
                        <div
                          ref={(el) => (dropdownRefs.current[role.name] = el)}
                          className="absolute z-20 bg-white border rounded-md shadow-lg mt-2 w-48 p-1"
                          style={{
                            top: buttonRefs.current[role.name]?.offsetHeight
                              ? buttonRefs.current[role.name]?.offsetHeight
                              : 40, // Fallback value if undefined
                            left: buttonRefs.current[role.name]?.offsetLeft ?? 0, // Safe fallback with ??
                          }}
                        >
                          <div className="flex justify-between px-2">
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedActions[role.name]?.length === actions.length}
                                onChange={() => handleActionChange(role.name, "selectall")}
                                className="cursor-pointer"
                                disabled={role.role_id === 2}
                              />
                              <span className="ml-2">Select All</span>
                            </label>
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedActions[role.name]?.length === 0}
                                onChange={() => handleActionChange(role.name, "deselect")}
                                className="cursor-pointer"
                                disabled={role.role_id === 2}
                              />
                              <span className="ml-2">Deselect All</span>
                            </label>
                          </div>
                          <hr className="my-2" />
                          {actions.map((action) => (
                            <label key={action} className="flex items-center cursor-pointer px-2">
                              <input
                                type="checkbox"
                                checked={selectedActions[role.name]?.includes(action)}
                                onChange={() => handleActionChange(role.name, action)}
                                className="cursor-pointer"
                                disabled={role.role_id === 2}
                              />
                              <span className="ml-2">{action}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="mt-1.5 flex gap-2">
                      {selectedActions[role.name]?.map((action, i) => (
                        <span key={i} className="px-1  text-xs ">
                          <input
                                type="checkbox"
                                checked={selectedActions[role.name]?.includes(action)}
                                onChange={() => handleActionChange(role.name, action)}
                                className="cursor-pointer"
                                disabled={role.role_id === 2}
                              /> {action}
                        </span>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </>
    );
  };

  export default AssignRolePage;