// frontend/src/pages/TransfersPage.tsx
import React, { useState } from 'react';
import Layout from '../components/common/Layout';
import CreateTransferForm from '../components/transfers/CreateTransferForm';
import TransferList from '../components/transfers/TransferList';

const TransfersPage: React.FC = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleTransferCreated = () => {
    setRefreshTrigger(prev => prev + 1);
    setShowCreateForm(false);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl">
              File Transfers
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage file transfers between your cloud storage accounts
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {showCreateForm ? 'Cancel' : 'New Transfer'}
            </button>
          </div>
        </div>

        {/* Create Transfer Form */}
        {showCreateForm && (
          <div className="mb-8">
            <CreateTransferForm onTransferCreated={handleTransferCreated} />
          </div>
        )}

        {/* Transfer List */}
        <TransferList refreshTrigger={refreshTrigger} />
      </div>
    </Layout>
  );
};

export default TransfersPage;