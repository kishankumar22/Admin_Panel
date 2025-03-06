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

  useEffect(() => {
    const clickHandler = (event: MouseEvent) => {
      if (!sidebar.current || !trigger.current) return;

      // Use type assertion to treat target as a Node
      const target = event.target as Node;

      if (
        !sidebarOpen ||
        sidebar.current.contains(target) ||
        trigger.current.contains(target)
      ) {
        return;
      }

      setSidebarOpen(false);
    };

    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  }, [sidebarOpen]); // Add sidebarOpen as a dependency

  useEffect(() => {
    const keyHandler = ({ keyCode }: KeyboardEvent) => {
      if (!sidebarOpen || keyCode !== 27) return;
      setSidebarOpen(false);
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  }, [sidebarOpen]); // Add sidebarOpen as a dependency

  useEffect(() => {
    localStorage.setItem('sidebar-expanded', sidebarExpanded.toString());
    if (sidebarExpanded) {
      document.querySelector('body')?.classList.add('sidebar-expanded');
    } else {
      document.querySelector('body')?.classList.remove('sidebar-expanded');
    }
  }, [sidebarExpanded]);

  const { user } = useAuth();
  const role = user?.roleId || 'admin';

  return (
    <aside
      ref={sidebar}
      className={`absolute left-0 top-0 z-9999 flex h-screen w-72.5 flex-col overflow-y-hidden bg-black duration-300 ease-linear dark:bg-boxdark lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
    >
      <div className="flex items-center justify-between gap-2 px-6 py-5 lg:py-6.5">
        <NavLink to="/" className="text-center">
          <h1 className="text-sm font-extrabold text-white ml-12">ADMIN PANEL</h1>
        </NavLink>
        <button
          ref={trigger}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-controls="sidebar"
          aria-expanded={sidebarOpen}
          className="block lg:hidden"
        >
          {/* <-- button */}
          <svg
            className="fill-current"
            width="20"
            height="18"
            viewBox="0 0 20 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M19 8.175H2.98748L9.36248 1.6875C9.69998 1.35 9.69998 0.825 9.362 48 0.4875C9.02498 0.15 8.49998 0.15 8.16248 0.4875L0.399976 8.3625C0.0624756 8.7 0.0624756 9.225 0.399976 9.5625L8.16248 17.4375C8.31248 17.5875 8.53748 17.7 8.76248 17.7C8.98748 17.7 9.17498 17.625 9.36248 17.475C9.69998 17.1375 9.69998 16.6125 9.36248 16.275L3.02498 9.8625H19C19.45 9.8625 19.825 9.4875 19.825 9.0375C19.825 8.55 19.45 8.175 19 8.175Z"
              fill=""
            />
          </svg>
        </button>
      </div>

      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
        <nav className="px-4 lg:px-6">
          <div>
            <ul className="mb-2 flex flex-col gap-1.5">
              <ul className="mt-4 mb- flex flex-col gap-2.5 pl-6">
                <li>
                  <NavLink
                    to="/"
                    className={({ isActive }) =>
                      'group relative flex items-center gap-2.5 rounded-md text-md font-medium text-bodydark2 duration-300 ease-in-out hover:text-white ' +
                      (isActive && '!text-white')
                    }
                  >
                    <RxDashboard className="w-5 h-5 -ml-2" />
                    Dashboard
                  </NavLink>
                </li>
              </ul>
              {role !== 3 && (
                <SidebarLinkGroup
                  activeCondition={pathname === '/forms' || pathname.includes('forms')}
                >
                  {(handleClick, open) => (
                    <React.Fragment>
                      <NavLink
                        to="#"
                        className={`group relative flex items-center gap-2.5 rounded-sm py-2   px-4 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4 `}
                        onClick={(e) => {
                          e.preventDefault();
                          sidebarExpanded ? handleClick() : setSidebarExpanded(true);
                        }}
                      >
                        <MdOutlineMiscellaneousServices className="w-6 h-6" />
                        JK Management
                        <IoIosArrowDown
                          className={`absolute right-4 top-1/2 -translate-y-1/2 fill-current ${open && 'rotate-180'
                            }`}
                        />
                      </NavLink>
                     <div className={`translate transform overflow-hidden ${!open && 'hidden'}`}>
                        <ul className="mt-4 mb-5.5 flex flex-col gap-2.5 pl-6">
                          <li>
                            <NavLink
                              to="/addnotifications"
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md px-4 font-medium text-white text-opacity-75 duration-300 ease-in-out hover:text-white hover:bg-gray-500 p-1 dark:hover:bg-gray-500' +
                                (isActive && '!text-white')
                              }
                            >
                              <MdOutlineNotificationAdd />
                              Add Notification
                            </NavLink>
                          </li>
                          <li>
                            <NavLink
                              to="/addbanner"
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md px-4 font-medium text-white text-opacity-75 duration-300 ease-in-out hover:text-white hover:bg-gray-500 p-1 dark:hover:bg-gray-500' +
                                (isActive && '!text-white')
                              }
                            >
                              <RiImageAddFill />
                              Update Banner Image
                            </NavLink>
                          </li>
                          <li>
                            <NavLink
                              to="/addpicingallery"
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md px-4 font-medium text-white text-opacity-75 duration-300 ease-in-out hover:text-white hover:bg-gray-500 p-1 dark:hover:bg-gray-500' +
                                (isActive && '!text-white')
                              }
                            >
                              <BiSolidImageAdd />
                              Update Gallery Image
                            </NavLink>
                          </li>
                          <li>
                            <NavLink
                              to="/addimportentlinks"
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md px-4 font-medium text-white text-opacity-75 duration-300 ease-in-out hover:text-white hover:bg-gray-500 p-1 dark:hover:bg-gray-500 ' +
                                (isActive && '!text-white')
                              }
                            >
                              <BiImageAdd />
                              Update Logo Image
                            </NavLink>
                          </li>
                          <li>
                            <NavLink
                              to="/addfaculity"
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md px-4 font-medium text-white text-opacity-75 duration-500 ease-in-out hover:text-white hover:bg-gray-500 p-1 dark:hover:bg-gray-500 ' +
                                (isActive && '!text-white')
                              }
                            >
                              <CgProfile />
                              Add Faculty
                            </NavLink>
                          </li>
                          <li>
                            <NavLink
                              to="/latestpost"
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md px-4 font-medium text-white text-opacity-75 duration-300 ease-in-out hover:text-white  hover:bg-gray-500 p-1 dark:hover:bg-gray-500 ' +
                                (isActive && '!text-white')
                              }
                            >
                              <MdOutlinePostAdd />
                              Add Latest Post
                            </NavLink>
                          </li>
                        </ul>
                      </div>
                    </React.Fragment>
                  )}
                </SidebarLinkGroup>
              )}
            </ul>
            <ul>
              <li>
                <NavLink
                  to="/adduser"
                  className={({ isActive }) =>
                    'group relative flex items-center gap-2.5 rounded-md px-4 font-medium text-white text-opacity-75 duration-300 ease-in-out hover:text-white hover:bg-gray-500 p-1 dark:hover:bg-gray-500 ' +
                    (isActive && '!text-white')
                  }
                >
                  <MdOutlinePostAdd />
                  Add User
                </NavLink>
              </li>
            </ul>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;