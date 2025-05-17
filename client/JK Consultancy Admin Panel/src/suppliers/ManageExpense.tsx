import React from 'react';
import Breadcrumb from '../components/Breadcrumbs/Breadcrumb';

const ManageExpense: React.FC = () => {
    return (
        <>
             <Breadcrumb pageName="Manage Expenses" />
            {/* Content goes here */}
            <h1>Manage expense</h1>
        </>
    );
};

export default ManageExpense;