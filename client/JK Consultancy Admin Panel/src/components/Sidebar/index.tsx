import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import SidebarLinkGroup from './SidebarLinkGroup';
import { MdOutlineNotificationAdd, MdOutlinePostAdd } from "react-icons/md";
import { RiImageAddFill } from "react-icons/ri";
import { BiSolidImageAdd } from "react-icons/bi";
import { RxDashboard } from "react-icons/rx";
import { MdOutlineMiscellaneousServices } from "react-icons/md";
import { IoIosArrowDown } from "react-icons/io";
import { BiImageAdd } from "react-icons/bi";
import { CgProfile } from "react-icons/cg";
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (arg: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const location = useLocation();
  const { pathname } = location;

  const trigger = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLDivElement>(null);

  const storedSidebarExpanded = localStorage.getItem('sidebar-expanded');
  const [sidebarExpanded, setSidebarExpanded] = useState(
    storedSidebarExpanded === null ? false : storedSidebarExpanded === 'true'
  );
  const [openDropdown, setOpenDropdown] = useState<string | null>(null); // Track which dropdown is open

  useEffect(() => {
    const clickHandler = (event: MouseEvent) => {
      if (!sidebar.current || !trigger.current) return;
      const target = event.target as Node;
      if (!sidebarOpen || sidebar.current.contains(target) || trigger.current.contains(target)) {
        return;
      }
      setSidebarOpen(false);
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  }, [sidebarOpen]);

  useEffect(() => {
    const keyHandler = ({ keyCode }: KeyboardEvent) => {
      if (!sidebarOpen || keyCode !== 27) return;
      setSidebarOpen(false);
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  }, [sidebarOpen]);

  useEffect(() => {
    localStorage.setItem('sidebar-expanded', sidebarExpanded.toString());
    document.querySelector('body')?.classList.toggle('sidebar-expanded', sidebarExpanded);
  }, [sidebarExpanded]);

  const { user } = useAuth();
  const role = user?.roleId || 'admin';

  const handleDropdownClick = (dropdownId: string) => {
    setOpenDropdown(openDropdown === dropdownId ? null : dropdownId);
    if (!sidebarExpanded) setSidebarExpanded(true);
  };

  return (
    <aside
      ref={sidebar}
      className={`absolute left-0 top-0 z-9999 flex h-screen w-52 flex-col overflow-y-hidden bg-black duration-300 ease-linear dark:bg-boxdark lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-3">
        <NavLink to="/" className="text-center">
          <h1 className="text-sm font-bold text-white">ADMIN PANEL</h1>
        </NavLink>
        <button
          ref={trigger}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-controls="sidebar"
          aria-expanded={sidebarOpen}
          className="block lg:hidden"
        >
          <svg className="fill-current" width="18" height="16" viewBox="0 0 20 18">
            <path
              d="M19 8.175H2.98748L9.36248 1.6875C9.69998 1.35 9.69998 0.825 9.36248 0.4875C9.02498 0.15 8.49998 0.15 8.16248 0.4875L0.399976 8.3625C0.0624756 8.7 0.0624756 9.225 0.399976 9.5625L8.16248 17.4375C8.31248 17.5875 8.53748 17.7 8.76248 17.7C8.98748 17.7 9.17498 17.625 9.36248 17.475C9.69998 17.1375 9.69998 16.6125 9.36248 16.275L3.02498 9.8625H19C19.45 9.8625 19.825 9.4875 19.825 9.0375C19.825 8.55 19.45 8.175 19 8.175Z"
              fill=""
            />
          </svg>
        </button>
      </div>

      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
        <nav className="px-2">
          <ul className="flex flex-col gap-0.5">
            <li>
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `group flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-bodydark2 hover:text-white ${isActive && '!text-white'}`
                }
              >
                <RxDashboard className="w-4 h-4" />
                Dashboard
              </NavLink>
            </li>

            {role !== 3 && (
              <SidebarLinkGroup activeCondition={pathname === '/forms' || pathname.includes('forms')}>
                {() => (
                  <>
                    <NavLink
                      to="#"
                      className={`group flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-bodydark1 hover:bg-graydark dark:hover:bg-meta-4`}
                      onClick={(e) => {
                        e.preventDefault();
                        handleDropdownClick('jk-management');
                      }}
                    >
                      <MdOutlineMiscellaneousServices className="w-4 h-4" />
                      JK Management
                      <IoIosArrowDown
                        className={`absolute right-3  -translate-y-1/2 transition-transform duration-200 ${openDropdown === 'jk-management' && 'rotate-180'}`}
                      />
                    </NavLink>
                    <div
                      className={`overflow-hidden transition-all duration-200 ease-in-out ${
                        openDropdown === 'jk-management' ? 'max-h-96' : 'max-h-0'
                      }`}
                    >
                      <ul className="mt-1 flex flex-col gap-0.5 pl-4">
                        <li>
                          <NavLink
                            to="/addnotifications"
                            className={({ isActive }) =>
                              `group flex items-center gap-2 px-2 py-1 text-sm text-white text-opacity-75 hover:text-white hover:bg-gray-500 dark:hover:bg-gray-500 ${isActive && '!text-white'}`
                            }
                          >
                            <MdOutlineNotificationAdd className="w-3.5 h-3.5" />
                            Add Notification
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            to="/addbanner"
                            className={({ isActive }) =>
                              `group flex items-center gap-2 px-2 py-1 text-sm text-white text-opacity-75 hover:text-white hover:bg-gray-500 dark:hover:bg-gray-500 ${isActive && '!text-white'}`
                            }
                          >
                            <RiImageAddFill className="w-3.5 h-3.5" />
                            Update Banner
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            to="/addpicingallery"
                            className={({ isActive }) =>
                              `group flex items-center gap-2 px-2 py-1 text-sm text-white text-opacity-75 hover:text-white hover:bg-gray-500 dark:hover:bg-gray-500 ${isActive && '!text-white'}`
                            }
                          >
                            <BiSolidImageAdd className="w-3.5 h-3.5" />
                            Update Gallery
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            to="/addimportentlinks"
                            className={({ isActive }) =>
                              `group flex items-center gap-2 px-2 py-1 text-sm text-white text-opacity-75 hover:text-white hover:bg-gray-500 dark:hover:bg-gray-500 ${isActive && '!text-white'}`
                            }
                          >
                            <BiImageAdd className="w-3.5 h-3.5" />
                            Update Logo
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            to="/addfaculity"
                            className={({ isActive }) =>
                              `group flex items-center gap-2 px-2 py-1 text-sm text-white text-opacity-75 hover:text-white hover:bg-gray-500 dark:hover:bg-gray-500 ${isActive && '!text-white'}`
                            }
                          >
                            <CgProfile className="w-3.5 h-3.5" />
                            Add Faculty
                          </NavLink>
                        </li>
                        <li>
                          <NavLink
                            to="/latestpost"
                            className={({ isActive }) =>
                              `group flex items-center gap-2 px-2 py-1 text-sm text-white text-opacity-75 hover:text-white hover:bg-gray-500 dark:hover:bg-gray-500 ${isActive && '!text-white'}`
                            }
                          >
                            <MdOutlinePostAdd className="w-3.5 h-3.5" />
                            Add Latest Post
                          </NavLink>
                        </li>
                      </ul>
                    </div>
                  </>
                )}
              </SidebarLinkGroup>
            )}

            <li>
              <NavLink
                to="/adduser"
                className={({ isActive }) =>
                  `group flex items-center gap-2 px-3 py-1.5 text-sm text-white text-opacity-75 hover:text-white hover:bg-gray-500 dark:hover:bg-gray-500 ${isActive && '!text-white'}`
                }
              >
                <MdOutlinePostAdd className="w-4 h-4" />
                Add User
              </NavLink>
            </li>

            <SidebarLinkGroup activeCondition={pathname === '/configuration' || pathname.includes('configuration')}>
              {() => (
                <>
                  <NavLink
                    to="#"
                    className={`group flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-bodydark1 hover:bg-graydark dark:hover:bg-meta-4`}
                    onClick={(e) => {
                      e.preventDefault();
                      handleDropdownClick('configuration');
                    }}
                  >
                    <MdOutlineMiscellaneousServices className="w-4 h-4" />
                    Configuration
                    <IoIosArrowDown
                      className={`absolute right-3  -translate-y-1/2 transition-transform duration-200 ${openDropdown === 'configuration' && 'rotate-180'}`}
                    />
                  </NavLink>
                  <div
                    className={`overflow-hidden transition-all duration-200 ease-in-out ${
                      openDropdown === 'configuration' ? 'max-h-96' : 'max-h-0'
                    }`}
                  >
                    <ul className="mt-1 flex flex-col gap-0.5 pl-4">
                      <li>
                        <NavLink
                          to="/assign-page-to-role"
                          className={({ isActive }) =>
                            `group flex items-center gap-2 px-2 py-1 text-sm text-white text-opacity-75 hover:text-white hover:bg-gray-500 dark:hover:bg-gray-500 ${isActive && '!text-white'}`
                          }
                        >
                          <MdOutlinePostAdd className="w-3.5 h-3.5" />
                          Assign Page to Role
                        </NavLink>
                      </li>
                      <li>
                        <NavLink
                          to="/page-management"
                          className={({ isActive }) =>
                            `group flex items-center gap-2 px-2 py-1 text-sm text-white text-opacity-75 hover:text-white hover:bg-gray-500 dark:hover:bg-gray-500 ${isActive && '!text-white'}`
                          }
                        >
                          <MdOutlinePostAdd className="w-3.5 h-3.5" />
                          Create Page
                        </NavLink>
                      </li>
                    </ul>
                  </div>
                </>
              )}
            </SidebarLinkGroup>
          </ul>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;