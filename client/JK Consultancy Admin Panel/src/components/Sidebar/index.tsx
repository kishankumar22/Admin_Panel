import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import SidebarLinkGroup from './SidebarLinkGroup';
import {  MdOutlineNotificationAdd, MdOutlinePostAdd, MdStore } from "react-icons/md";
import { RiImageAddFill } from "react-icons/ri";
import { BiSolidImageAdd } from "react-icons/bi";
import { RxDashboard } from "react-icons/rx";
import { MdOutlineMiscellaneousServices } from "react-icons/md";
import { IoIosArrowDown } from "react-icons/io";
import { BiImageAdd } from "react-icons/bi";
import { CgProfile } from "react-icons/cg";
import { useAuth } from '../../context/AuthContext';
import { MdCreateNewFolder, MdOutlineAssignmentTurnedIn, MdOutlineManageHistory } from "react-icons/md";
import { FaHandHoldingUsd, FaMoneyBill, FaUserPlus } from "react-icons/fa";
import { PiStudent } from "react-icons/pi";
import { IoIosPersonAdd } from "react-icons/io";
import { ClipboardList } from 'lucide-react';
import { usePermissions } from '../../context/PermissionsContext';

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
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const { user } = useAuth();
  const { permissions, pages } = usePermissions();
  const roleId = user?.roleId ;
   // Default to 1 (Admin) if roleId is undefined

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
  }, [sidebarOpen, setSidebarOpen]);

  useEffect(() => {
    const keyHandler = ({ keyCode }: KeyboardEvent) => {
      if (!sidebarOpen || keyCode !== 27) return;
      setSidebarOpen(false);
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  }, [sidebarOpen, setSidebarOpen]);

  useEffect(() => {
    localStorage.setItem('sidebar-expanded', sidebarExpanded.toString());
    document.querySelector('body')?.classList.toggle('sidebar-expanded', sidebarExpanded);
  }, [sidebarExpanded]);

  const handleDropdownClick = (dropdownId: string) => {
    setOpenDropdown(openDropdown === dropdownId ? null : dropdownId);
    if (!sidebarExpanded) setSidebarExpanded(true);
  };

  // Helper function to check if a page should be visible based on permissions
  const hasPagePermission = (pageUrl: string): boolean => {
    if (roleId === 2) return true; // Administrators see all pages
    const page = pages.find(p => p.pageUrl === pageUrl);
    if (!page) return false;
    const permission = permissions.find(p => p.pageId === page.pageId && p.roleId === roleId);
    if (!permission) return false;
    return permission.canCreate || permission.canRead || permission.canUpdate || permission.canDelete;
  };

  // Helper function to check if a dropdown group should be visible
  const hasGroupPermission = (pageUrls: string[]): boolean => {
    if (roleId === 2) return true; // Administrators see all groups
    return pageUrls.some(url => hasPagePermission(url));
  };

  // Define page URLs for each dropdown group
  const jkManagementPages = [
    '/addnotifications',
    '/addbanner',
    '/addpicingallery',
    '/addimportentlinks',
    '/addfaculity',
    '/latestpost'
  ];

  const studentManagementPages = [
    '/student',
    '/managePayment',
    '/paymenthandover',
    '/CourseQueries'
  ];

  const supplierManagementPages = [
    '/managesupplier',
    '/manageExpense'
  ];
  const placementManagementPages = [
    '/AddPlacement'
  ];

  const configurationPages = [
    '/assign-page-to-role',
    '/page-management'
  ];

  return (
    <aside
      ref={sidebar}
      className={`absolute left-0 top-0 z-9999 flex h-screen w-52 flex-col overflow-y-hidden bg-black duration-300 ease-linear dark:bg-boxdark lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-3">
        <NavLink to="/">
          <h1 className="text-sm font-bold text-blue-400 ml-8">ADMIN PANEL</h1>
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
            {/* Dashboard is always visible */}
            <li>
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `group rounded flex items-center gap-2 px-3 py-1.5 text-sm font-medium hover:bg-gray-400 text-white text-opacity-75 hover:text-white ${isActive && '!text-white bg-gray-500'}`
                }
              >
                <RxDashboard className="w-4 h-4" />
                Dashboard
              </NavLink>
            </li>

            {/* JK Management Dropdown */}
            {hasGroupPermission(jkManagementPages) && (
              <SidebarLinkGroup activeCondition={pathname === '/forms' || pathname.includes('forms')}>
                {() => (
                  <>
                    <NavLink
                      to="#"
                      className={`group flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md text-bodydark1 hover:bg-slate-600 dark:hover:bg-meta-4`}
                      onClick={(e) => {
                        e.preventDefault();
                        handleDropdownClick('jk-management');
                      }}
                    >
                      <MdOutlineManageHistory className="w-4 h-4" />
                      JK Management
                      <IoIosArrowDown
                        className={`absolute right-3 mt-4 -translate-y-1/2 transition-transform duration-300 ${openDropdown === 'jk-management' && 'rotate-180'}`}
                      />
                    </NavLink>
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${openDropdown === 'jk-management' ? 'max-h-96' : 'max-h-0'}`}
                    >
                      <ul className="mt-1 flex flex-col gap-0.5 pl-4">
                        {hasPagePermission('/addnotifications') && (
                          <li>
                            <NavLink
                              to="/addnotifications"
                              className={({ isActive }) =>
                                `group flex items-center rounded-md gap-2 px-2 py-1 text-sm text-white text-opacity-75 hover:text-white hover:bg-gray-500 dark:hover:bg-gray-500 ${isActive && '!text-white bg-gray-500'}`
                              }
                            >
                              <MdOutlineNotificationAdd className="w-3.5 h-3.5" />
                              Manage Notification
                            </NavLink>
                          </li>
                        )}
                        {hasPagePermission('/addbanner') && (
                          <li>
                            <NavLink
                              to="/addbanner"
                              className={({ isActive }) =>
                                `group flex items-center rounded-md gap-2 px-2 py-1 text-sm text-white text-opacity-75 hover:text-white hover:bg-gray-500 dark:hover:bg-gray-500 ${isActive && '!text-white bg-gray-500'}`
                              }
                            >
                              <RiImageAddFill className="w-3.5 h-3.5" />
                              Manage Banner
                            </NavLink>
                          </li>
                        )}
                        {hasPagePermission('/addpicingallery') && (
                          <li>
                            <NavLink
                              to="/addpicingallery"
                              className={({ isActive }) =>
                                `group flex items-center rounded-md gap-2 px-2 py-1 text-sm text-white text-opacity-75 hover:text-white hover:bg-gray-500 dark:hover:bg-gray-500 ${isActive && '!text-white bg-gray-500'}`
                              }
                            >
                              <BiSolidImageAdd className="w-3.5 h-3.5" />
                              Manage Gallery
                            </NavLink>
                          </li>
                        )}
                        {hasPagePermission('/addimportentlinks') && (
                          <li>
                            <NavLink
                              to="/addimportentlinks"
                              className={({ isActive }) =>
                                `group flex items-center rounded-md gap-2 px-2 py-1 text-sm text-white text-opacity-75 hover:text-white hover:bg-gray-500 dark:hover:bg-gray-500 ${isActive && '!text-white bg-gray-500'}`
                              }
                            >
                              <BiImageAdd className="w-3.5 h-3.5" />
                              Manage Link
                            </NavLink>
                          </li>
                        )}
                        {hasPagePermission('/addfaculity') && (
                          <li>
                            <NavLink
                              to="/addfaculity"
                              className={({ isActive }) =>
                                `group flex items-center rounded-md gap-2 px-2 py-1 text-sm text-white text-opacity-75 hover:text-white hover:bg-gray-500 dark:hover:bg-gray-500 ${isActive && '!text-white bg-gray-500'}`
                              }
                            >
                              <CgProfile className="w-3.5 h-3.5" />
                              Manage Faculty
                            </NavLink>
                          </li>
                        )}
                        {hasPagePermission('/latestpost') && (
                          <li>
                            <NavLink
                              to="/latestpost"
                              className={({ isActive }) =>
                                `group flex items-center rounded-md gap-2 px-2 py-1 text-sm text-white text-opacity-75 hover:text-white hover:bg-gray-500 dark:hover:bg-gray-500 ${isActive && '!text-white bg-gray-500'}`
                              }
                            >
                              <MdOutlinePostAdd className="w-3.5 h-3.5" />
                              Manage Post
                            </NavLink>
                          </li>
                        )}
                      </ul>
                    </div>
                  </>
                )}
              </SidebarLinkGroup>
            )}

            {/* Manage Student Dropdown */}
            {hasGroupPermission(studentManagementPages) && (
              <SidebarLinkGroup activeCondition={pathname === '/students' || pathname.includes('students')}>
                {() => (
                  <>
                    <NavLink
                      to="#"
                      className={`group flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md text-bodydark1 hover:bg-slate-600 dark:hover:bg-meta-4`}
                      onClick={(e) => {
                        e.preventDefault();
                        handleDropdownClick('students');
                      }}
                    >
                      <PiStudent className="w-4 h-4" />
                      Manage Student
                      <IoIosArrowDown
                        className={`absolute right-3 mt-4 -translate-y-1/2 transition-transform duration-300 ${openDropdown === 'students' && 'rotate-180'}`}
                      />
                    </NavLink>
                    <div
                      className={`overflow-hidden transition-all duration-200 ease-in-out ${openDropdown === 'students' ? 'max-h-96' : 'max-h-0'}`}
                    >
                      <ul className="mt-1 flex flex-col gap-0.5 pl-4">
                        {hasPagePermission('/student') && (
                          <li>
                            <NavLink
                              to="/student"
                              className={({ isActive }) =>
                                `group flex items-center rounded-md gap-2 px-2 py-1 text-sm text-white text-opacity-75 hover:text-white hover:bg-gray-500 dark:hover:bg-gray-500 ${isActive && '!text-white bg-gray-500'}`
                              }
                            >
                              <IoIosPersonAdd className="w-3.5 h-3.5" />
                              Manage Students
                            </NavLink>
                          </li>
                        )}
                        {hasPagePermission('/managePayment') && (
                          <li>
                            <NavLink
                              to="/managePayment"
                              className={({ isActive }) =>
                                `group flex items-center rounded-md gap-2 px-2 py-1 text-sm text-white text-opacity-75 hover:text-white hover:bg-gray-500 dark:hover:bg-gray-500 ${isActive && '!text-white bg-gray-500'}`
                              }
                            >
                              <FaMoneyBill className="w-3.5 h-3.5" />
                              Manage Payment
                            </NavLink>
                          </li>
                        )}
                        {hasPagePermission('/paymenthandover') && (
                          <li>
                            <NavLink
                              to="/paymenthandover"
                              className={({ isActive }) =>
                                `group flex items-center rounded-md gap-2 px-2 py-1 text-sm text-white text-opacity-75 hover:text-white hover:bg-gray-500 dark:hover:bg-gray-500 ${isActive && '!text-white bg-gray-500'}`
                              }
                            >
                              <FaHandHoldingUsd className="w-4 h-4" />
                              Manage Handover
                            </NavLink>
                          </li>
                        )}
                        {hasPagePermission('/CourseQueries') && (
                          <li>
                            <NavLink
                              to="/CourseQueries"
                              className={({ isActive }) =>
                                `group flex items-center rounded-md gap-2 px-2 py-1 text-sm text-white text-opacity-75 hover:text-white hover:bg-gray-500 dark:hover:bg-gray-500 ${isActive && '!text-white bg-gray-500'}`
                              }
                            >
                              <ClipboardList className="w-4 h-4" />
                              Manage Queries
                            </NavLink>
                          </li>
                        )}
                      </ul>
                    </div>
                  </>
                )}
              </SidebarLinkGroup>
            )}

            {/* Manage Supplier Dropdown */}
            {hasGroupPermission(supplierManagementPages) && (
              <SidebarLinkGroup activeCondition={pathname === '/managesupplier' || pathname.includes('managesupplier')}>
                {() => (
                  <>
                    <NavLink
                      to="#"
                      className={`group flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md text-bodydark1 hover:bg-slate-600 dark:hover:bg-meta-4`}
                      onClick={(e) => {
                        e.preventDefault();
                        handleDropdownClick('managesupplier');
                      }}
                    >
                
                  <MdStore className="w-4 h-4" />
                      Manage Supplier
                      <IoIosArrowDown
                        className={`absolute right-3 mt-4 -translate-y-1/2 transition-transform duration-300 ${openDropdown === 'managesupplier' && 'rotate-180'}`}
                      />
                    </NavLink>
                    <div
                      className={`overflow-hidden transition-all duration-200 ease-in-out ${openDropdown === 'managesupplier' ? 'max-h-96' : 'max-h-0'}`}
                    >
                      <ul className="mt-1 flex flex-col gap-0.5 pl-4">
                        {hasPagePermission('/managesupplier') && (
                          <li>
                            <NavLink
                              to="/managesupplier"
                              className={({ isActive }) =>
                                `group flex items-center rounded-md gap-2 px-2 py-1 text-sm text-white text-opacity-75 hover:text-white hover:bg-gray-500 dark:hover:bg-gray-500 ${isActive && '!text-white bg-gray-500'}`
                              }
                            >
                              <MdOutlineManageHistory className="w-3.5 h-3.5" />
                              Manage Supplier
                            </NavLink>
                          </li>
                        )}
                        {hasPagePermission('/manageExpense') && (
                          <li>
                            <NavLink
                              to="/manageExpense"
                              className={({ isActive }) =>
                                `group flex items-center rounded-md gap-2 px-2 py-1 text-sm text-white text-opacity-75 hover:text-white hover:bg-gray-500 dark:hover:bg-gray-500 ${isActive && '!text-white bg-gray-500'}`
                              }
                            >
                              <FaMoneyBill className="w-3.5 h-3.5" />
                              Manage Expense
                            </NavLink>
                          </li>
                        )}
                      </ul>
                    </div>
                  </>
                )}
              </SidebarLinkGroup>
            )}

            {/* Placement Management */}
            {hasGroupPermission(placementManagementPages) && (
              <SidebarLinkGroup activeCondition={pathname === '/AddPlacement' || pathname.includes('AddPlacement')}>
                {() => (
                  <>
                    <NavLink
                      to="#"
                      className={`group flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md text-bodydark1 hover:bg-slate-600 dark:hover:bg-meta-4`}
                      onClick={(e) => {
                        e.preventDefault();
                        handleDropdownClick('AddPlacement');
                      }}
                    >
                
                  <MdStore className="w-4 h-4" />
                      Manage Placement
                      <IoIosArrowDown
                        className={`absolute right-3 mt-4 -translate-y-1/2 transition-transform duration-300 ${openDropdown === 'AddPlacement' && 'rotate-180'}`}
                      />
                    </NavLink>
                    <div
                      className={`overflow-hidden transition-all duration-200 ease-in-out ${openDropdown === 'AddPlacement' ? 'max-h-96' : 'max-h-0'}`}
                    >
                      <ul className="mt-1 flex flex-col gap-0.5 pl-4">
                        {hasPagePermission('/AddPlacement') && (
                          <li>
                            <NavLink
                              to="/AddPlacement"
                              className={({ isActive }) =>
                                `group flex items-center rounded-md gap-2 px-2 py-1 text-sm text-white text-opacity-75 hover:text-white hover:bg-gray-500 dark:hover:bg-gray-500 ${isActive && '!text-white bg-gray-500'}`
                              }
                            >
                              <MdOutlineManageHistory className="w-3.5 h-3.5" />
                              Add Placement
                            </NavLink>
                          </li>
                        )}
                     
                      </ul>
                    </div>
                  </>
                )}
              </SidebarLinkGroup>
            )}

            {/* Configuration Dropdown */}
            {hasGroupPermission(configurationPages) && (
              <SidebarLinkGroup activeCondition={pathname === '/configuration' || pathname.includes('configuration')}>
                {() => (
                  <>
                    <NavLink
                      to="#"
                      className={`group flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md text-bodydark1 hover:bg-slate-600 dark:hover:bg-meta-4`}
                      onClick={(e) => {
                        e.preventDefault();
                        handleDropdownClick('configuration');
                      }}
                    >
                      <MdOutlineMiscellaneousServices className="w-4 h-4" />
                      Configuration
                      <IoIosArrowDown
                        className={`absolute right-3 mt-4 -translate-y-1/2 transition-transform duration-300 ${openDropdown === 'configuration' && 'rotate-180'}`}
                      />
                    </NavLink>
                    <div
                      className={`overflow-hidden transition-all duration-200 ease-in-out ${openDropdown === 'configuration' ? 'max-h-96' : 'max-h-0'}`}
                    >
                      <ul className="mt-1 flex flex-col gap-0.5 pl-4">
                        {hasPagePermission('/assign-page-to-role') && (
                          <li>
                            <NavLink
                              to="/assign-page-to-role"
                              className={({ isActive }) =>
                                `group flex items-center rounded-md gap-2 px-2 py-1 text-sm text-white text-opacity-75 hover:text-white hover:bg-gray-500 dark:hover:bg-gray-500 ${isActive && '!text-white bg-gray-500'}`
                              }
                            >
                              <MdOutlineAssignmentTurnedIn className="w-3.5 h-3.5" />
                              Assign Page to Role
                            </NavLink>
                          </li>
                        )}
                        {hasPagePermission('/page-management') && (
                          <li>
                            <NavLink
                              to="/page-management"
                              className={({ isActive }) =>
                                `group flex items-center rounded-md gap-2 px-2 py-1 text-sm text-white text-opacity-75 hover:text-white hover:bg-gray-500 dark:hover:bg-gray-500 ${isActive && '!text-white bg-gray-500'}`
                              }
                            >
                              <MdCreateNewFolder className="w-3.5 h-3.5" />
                              Create Page
                            </NavLink>
                          </li>
                        )}
                      </ul>
                    </div>
                  </>
                )}
              </SidebarLinkGroup>
            )}

            {/* Manage User */}
            {hasPagePermission('/adduser') && (
              <li>
                <NavLink
                  to="/adduser"
                  className={({ isActive }) =>
                    `group flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-white text-opacity-75 hover:text-white hover:bg-gray-500 dark:hover:bg-gray-500 ${isActive && '!text-white bg-gray-500'}`
                  }
                >
                  <FaUserPlus className="w-4 h-4" />
                  Manage User
                </NavLink>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;