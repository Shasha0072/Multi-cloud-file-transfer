// frontend/src/components/files/AccountSidebar.tsx
import React from 'react';
import { CloudAccount } from '../../types';

interface AccountSidebarProps {
  accounts: CloudAccount[];
  selectedAccount: CloudAccount | null;
  onAccountSelect: (account: CloudAccount) => void;
}

const AccountSidebar: React.FC<AccountSidebarProps> = ({
  accounts,
  selectedAccount,
  onAccountSelect
}) => {
  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'aws-s3':
        return '🪣';
      case 'google-drive':
        return '📱';
      case 'azure-blob':
        return '☁️';
      case 'dropbox':
        return '📦';
      default:
        return '💾';
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'aws-s3':
        return 'AWS S3';
      case 'google-drive':
        return 'Google Drive';
      case 'azure-blob':
        return 'Azure Blob';
      case 'dropbox':
        return 'Dropbox';
      default:
        return provider;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Cloud Accounts</h2>
          <button
            onClick={() => window.location.href = '/accounts'}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Manage Accounts"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Account List */}
      <div className="flex-1 overflow-y-auto">
        {accounts.length === 0 ? (
          <div className="p-4 text-center">
            <div className="text-gray-400 mb-2">
              <svg className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">No accounts available</p>
            <button
              onClick={() => window.location.href = '/accounts'}
              className="mt-2 text-xs text-blue-600 hover:text-blue-800"
            >
              Add Account
            </button>
          </div>
        ) : (
          <div className="py-2">
            {accounts.map((account) => (
              <button
                key={account.id}
                onClick={() => onAccountSelect(account)}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-l-4 transition-colors ${
                  selectedAccount?.id === account.id
                    ? 'bg-blue-50 border-blue-500'
                    : 'border-transparent'
                }`}
              >
                <div className="flex items-center">
                  <span className="text-2xl mr-3">
                    {getProviderIcon(account.provider)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {account.accountName}
                      </p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(account.connectionStatus)}`}>
                        {account.connectionStatus}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {getProviderName(account.provider)}
                    </p>
                    {account.lastSync && (
                      <p className="text-xs text-gray-400">
                        Last sync: {new Date(account.lastSync).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                {account.errorMessage && (
                  <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                    {account.errorMessage}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          {accounts.length} account{accounts.length !== 1 ? 's' : ''} connected
        </div>
      </div>
    </div>
  );
};

export default AccountSidebar;