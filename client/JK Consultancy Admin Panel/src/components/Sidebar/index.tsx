import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import SidebarLinkGroup from './SidebarLinkGroup';
import { MdOutlineNotificationAdd, MdOutlinePostAdd } from "react-icons/md";
import { RiImageAddFill } from "react-icons/ri";
import { BiSolidImageAdd } from "react-icons/bi";
import { RxDashboard } from "react-icons/rx";
import { MdOutlineMiscellaneousServices } from "react-icons/md";
import { IoIosArrowDown } from "react-icons/io";
// import logo from '../../../src/images/icon/logo.jpg'

import { BiImageAdd } from "react-icons/bi";
import { CgProfile } from "react-icons/cg";

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (arg: boolean) => void;
}

const Sidebar = ({ sidebarOpen, setSidebarOpen }: SidebarProps) => {
  const location = useLocation();
  const { pathname } = location;

  const trigger = useRef<any>(null);
  const sidebar = useRef<any>(null);

  const storedSidebarExpanded = localStorage.getItem('sidebar-expanded');
  const [sidebarExpanded, setSidebarExpanded] = useState(
    storedSidebarExpanded === null ? false : storedSidebarExpanded === 'true'
  );

  // close on click outside
  useEffect(() => {
    const clickHandler = ({ target }: MouseEvent) => {
      if (!sidebar.current || !trigger.current) return;
      if (
        !sidebarOpen ||
        sidebar.current.contains(target) ||
        trigger.current.contains(target)
      )
        return;
      setSidebarOpen(false);
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  });

  // close if the esc key is pressed
  useEffect(() => {
    const keyHandler = ({ keyCode }: KeyboardEvent) => {
      if (!sidebarOpen || keyCode !== 27) return;
      setSidebarOpen(false);
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  });

  useEffect(() => {
    localStorage.setItem('sidebar-expanded', sidebarExpanded.toString());
    if (sidebarExpanded) {
      document.querySelector('body')?.classList.add('sidebar-expanded');
    } else {
      document.querySelector('body')?.classList.remove('sidebar-expanded');
    }
  }, [sidebarExpanded]);

  return (
    <aside
      ref={sidebar}
      className={`absolute left-0 top-0 z-9999 flex h-screen w-72.5 flex-col overflow-y-hidden bg-black duration-300 ease-linear dark:bg-boxdark lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
    >
      {/* <!-- SIDEBAR HEADER --> */}
      <div className="flex items-center justify-between gap-2 px-6 py-5 lg:py-6.5">
        <NavLink to="/" className='text-center'>
        {/* <img src={logo} className='rounded-full w-20 h-20' alt="" /> */}
        <h1 className='text-sm font-extrabold  text-white ml-12'>ADMIN PANEL</h1>
         </NavLink>

        <button
          ref={trigger}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-controls="sidebar"
          aria-expanded={sidebarOpen}
          className="block lg:hidden"
        >
          <svg
            className="fill-current"
            width="20"
            height="18"
            viewBox="0 0 20 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M19 8.175H2.98748L9.36248 1.6875C9.69998 1.35 9.69998 0.825 9.36248 0.4875C9.02498 0.15 8.49998 0.15 8.16248 0.4875L0.399976 8.3625C0.0624756 8.7 0.0624756 9.225 0.399976 9.5625L8.16248 17.4375C8.31248 17.5875 8.53748 17.7 8.76248 17.7C8.98748 17.7 9.17498 17.625 9.36248 17.475C9.69998 17.1375 9.69998 16.6125 9.36248 16.275L3.02498 9.8625H19C19.45 9.8625 19.825 9.4875 19.825 9.0375C19.825 8.55 19.45 8.175 19 8.175Z"
              fill=""
            />
          </svg>
        </button>
      </div>
      {/* <!-- SIDEBAR HEADER --> */}

      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
        {/* <!-- Sidebar Menu --> */}
        <nav className=" px-4  lg:px-6">
          {/* <!-- Menu Group --> */}
          <div>
         <ul className="mb-6 flex flex-col gap-1.5">
              {/* <!-- Menu Item Dashboard --> */}
              <ul className="mt-4 mb- flex flex-col gap-2.5 pl-6">
                          <li>
                            <NavLink
                              to="/"
                              className={({ isActive }) =>
                                'group relative flex items-center  gap-2.5 rounded-md text-md font-medium text-bodydark2 duration-300 ease-in-out hover:text-white ' +
                                (isActive && '!text-white')
                              }
                            >
                              <RxDashboard className='w-5 h-5  -ml-2'/>
                              Dashboard
                            </NavLink>
                          </li>
                        </ul>
              
              {/* <!-- Menu Item Dashboard --> */}


              {/* <!-- Menu Item Profile --> */}

              {/* <!-- Menu Item Forms --> */}
              <SidebarLinkGroup
                activeCondition={
                  pathname === '/forms' || pathname.includes('forms')
                }
              >
                {(handleClick, open) => {
                  return (
                    <React.Fragment>
                      <NavLink
                        to="#"
                        className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4 ${(pathname === '/forms' ||
                            pathname.includes('forms')) &&
                          'bg-graydark dark:bg-meta-4'
                          }`}
                        onClick={(e) => {
                          e.preventDefault();
                          sidebarExpanded
                            ? handleClick()
                            : setSidebarExpanded(true);
                        }}
                      >
                       <MdOutlineMiscellaneousServices className='w-6 h-6' />
                        JK Management
                        <IoIosArrowDown  className={`absolute right-4 top-1/2 -translate-y-1/2 fill-current ${open && 'rotate-180'
                            }`} />
                      </NavLink>
                      {/* <!-- Dropdown Menu Start --> */}
                      <div
                        className={`translate transform overflow-hidden ${!open && 'hidden'
                          }`}
                      >
                        <ul className="mt-4 mb-5.5 flex flex-col gap-2.5 pl-6">
                          {/* <!-- Menu Item addnotifications --> */}
                          <li>
                            <NavLink
                              to="/addnotifications"
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md px-4 font-medium text-white text-opacity-75 duration-300 ease-in-out hover:text-white ' +
                                (isActive && '!text-white')
                              }
                            >
                              <MdOutlineNotificationAdd />
                              Add Notification
                            </NavLink>
                          </li>
                          {/* <!-- Menu Item addnotifications --> */}
                          {/* <!-- Menu Item addbanner --> */}
                          <li>
                            <NavLink
                              to="/addbanner"
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md px-4 font-medium text-white text-opacity-75 duration-300 ease-in-out hover:text-white ' +
                                (isActive && '!text-white')
                              }
                            >
                              <RiImageAddFill />
                              Update Banner Image
                            </NavLink>
                          </li>
                          {/* <!-- Menu Item addbanner --> */}
                          {/* <!-- Menu Item add Pic in gallery --> */}
                          <li>
                            <NavLink
                              to="/addpicingallery"
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md px-4 font-medium text-white text-opacity-75 duration-300 ease-in-out hover:text-white ' +
                                (isActive && '!text-white')
                              }
                            >
                              <BiSolidImageAdd />
                              Update Gallery Image
                            </NavLink>
                          </li>
                          {/* <!-- Menu Item addpic in gallery --> */}
                          {/* <!-- Menu Item add Pic in gallery --> */}
                          <li>
                            <NavLink
                              to="/addimportentlinks"
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md px-4 font-medium text-white text-opacity-75 duration-300 ease-in-out hover:text-white ' +
                                (isActive && '!text-white')
                              }
                            >
                              <BiImageAdd />
                              Update Logo Image
                            </NavLink>
                          </li>
                          {/* <!-- Menu Item addpic in gallery --> */}
                          {/* <!-- Menu Item add Faculity  --> */}
                          <li>
                            <NavLink
                              to="/addfaculity"
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md px-4 font-medium text-white text-opacity-75 duration-300 ease-in-out hover:text-white ' +
                                (isActive && '!text-white')
                              }
                            >
                              <CgProfile />
                              Add Faculity
                            </NavLink>
                          </li>
                          {/* <!-- Menu Item addfaculity in gallery --> */}
                          {/* <!-- Menu Item start here add latestpost  --> */}
                          <li>
                            <NavLink
                              to="/latestpost"
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md px-4 font-medium text-white text-opacity-75 duration-300 ease-in-out hover:text-white ' +
                                (isActive && '!text-white')
                              }
                            >
                              <MdOutlinePostAdd />
                              Add Latest Post
                            </NavLink>
                          </li>
                          
                          {/* <!-- Menu Item  end here add latestpost  --> */}

                          {/* <!-- Menu Item Profile --> */}
                        </ul>
                      </div>
                      {/* <!-- Dropdown Menu End --> */}
                    </React.Fragment>
                    
                  );
                }}
              </SidebarLinkGroup>
            </ul>
          </div>

          {/* <!-- Others Group --> */}
          <ul>
          <li>
                            <NavLink
                              to="/adduser"
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md px-4 font-medium text-white text-opacity-75 duration-300 ease-in-out hover:text-white ' +
                                (isActive && '!text-white')
                              }
                            >
                              <MdOutlinePostAdd />
                              Add User
                            </NavLink>
                          </li>
          </ul>
          
        </nav>
        {/* <!-- Sidebar Menu --> */}
      </div>
    </aside>
  );
};

export default Sidebar;
