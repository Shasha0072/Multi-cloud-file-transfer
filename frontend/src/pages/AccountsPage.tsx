import React, { useState } from "react";
import Layout from "../components/common/Layout";
import AccountsList from "../components/accounts/AccountsList";
import AddAccountForm from "../components/accounts/AddAccountForm";

const AccountsPage: React.FC = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleAddSuccess = () => {
    setShowAddForm(false);
    setRefreshTrigger((prev) => prev + 1); // Trigger accounts list refresh
  };

  return (
    <Layout title="Cloud Accounts">
      <div className="space-y-6">
        {/* Header with Add Button */}
        <div className="flex justify-between items-center">
          <p className="text-gray-600">
            Manage your cloud storage accounts for file transfers.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
          >
            <svg
              className="h-5 w-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Add Account
          </button>
        </div>

        {/* Add Account Form */}
        {showAddForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 w-full max-w-2xl">
              <AddAccountForm
                onSuccess={handleAddSuccess}
                onCancel={() => setShowAddForm(false)}
              />
            </div>
          </div>
        )}

        {/* Accounts List */}
        <AccountsList refreshTrigger={refreshTrigger} />
      </div>
    </Layout>
  );
};

export default AccountsPage;
