import React from 'react';
import { NavLink } from 'react-router-dom';
import DefaultLayout from '../layout/DefaultLayout';

const Unauthorized: React.FC = () => {
  return (
    <>
      <DefaultLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-red-600 mb-4">Unauthorized Access</h1>
            <p className="text-lg text-gray-700 mb-6">
              You don't have permission to access this page.
            </p>
            <NavLink
              to="/"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Return to Dashboard
            </NavLink>
          </div>
        </div>
      </DefaultLayout>
    </>
  );
};

export default Unauthorized;