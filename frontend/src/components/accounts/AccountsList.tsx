import React, { useState, useEffect } from "react";
import accountService from "../../services/accountService";
import { CloudAccount } from "../../types";

interface AccountsListProps {
  onAccountSelect?: (account: CloudAccount) => void;
  refreshTrigger?: number;
}

const AccountsList: React.FC<AccountsListProps> = ({
  onAccountSelect,
  refreshTrigger,
}) => {
  const [accounts, setAccounts] = useState<CloudAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [testingAccount, setTestingAccount] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<{[key: string]: {success: boolean, message: string}}>({});

  useEffect(() => {
    loadAccounts();
  }, [refreshTrigger]);

  // Clear test results after 5 seconds
  useEffect(() => {
    if (Object.keys(testResults).length > 0) {
      const timer = setTimeout(() => {
        setTestResults({});
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [testResults]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const accountsList = await accountService.getAccounts();
      setAccounts(accountsList);
      setError("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (accountId: string) => {
    try {
      setTestingAccount(accountId);
      setError("");
      
      const result = await accountService.testAccount(accountId);
      
      // Show success message
      setTestResults({
        ...testResults,
        [accountId]: {
          success: true,
          message: result.message || "Connection test successful!"
        }
      });
      
      // Refresh accounts to get updated status
      await loadAccounts();
    } catch (err: any) {
      // Show error message
      setTestResults({
        ...testResults,
        [accountId]: {
          success: false,
          message: err.message || "Connection test failed"
        }
      });
    } finally {
      setTestingAccount(null);
    }
  };

  const handleDeleteAccount = async (
    accountId: string,
    accountName: string
  ) => {
    if (window.confirm(`Are you sure you want to delete "${accountName}"?`)) {
      try {
        await accountService.deleteAccount(accountId);
        await loadAccounts(); // Refresh list
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "aws-s3":
        return "🪣";
      case "google-drive":
        return "📱";
      case "azure-blob":
        return "☁️";
      case "dropbox":
        return "📦";
      default:
        return "💾";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-600 bg-green-100";
      case "error":
        return "text-red-600 bg-red-100";
      case "pending":
        return "text-yellow-600 bg-yellow-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <svg
          className="animate-spin h-8 w-8 text-blue-600"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-700 text-sm">{error}</div>
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="text-center py-8">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No cloud accounts
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding your first cloud storage account.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="bg-white rounded-lg shadow border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onAccountSelect?.(account)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">
                    {getProviderIcon(account.provider)}
                  </span>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      {account.accountName}
                    </h3>
                    <p className="text-sm text-gray-500 capitalize">
                      {account.provider.replace("-", " ")}
                    </p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                    account.connectionStatus
                  )}`}
                >
                  {account.connectionStatus}
                </span>
              </div>

              {/* Test Results */}
              {testResults[account.id] && (
                <div className={`mt-2 text-xs p-2 rounded ${
                  testResults[account.id].success 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  <div className="flex items-center">
                    {testResults[account.id].success ? (
                      <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                    {testResults[account.id].message}
                  </div>
                </div>
              )}

              {account.errorMessage && (
                <div className="mt-2 text-xs text-red-600">
                  {account.errorMessage}
                </div>
              )}

              <div className="mt-4 flex justify-between items-center">
                <span className="text-xs text-gray-500">
                  Added {new Date(account.createdAt).toLocaleDateString()}
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTestConnection(account.id);
                    }}
                    disabled={testingAccount === account.id}
                    className="text-blue-600 hover:text-blue-800 text-xs font-medium disabled:opacity-50 flex items-center"
                  >
                    {testingAccount === account.id ? (
                      <>
                        <svg className="animate-spin h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Testing...
                      </>
                    ) : (
                      'Test'
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAccount(account.id, account.accountName);
                    }}
                    className="text-red-600 hover:text-red-800 text-xs font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AccountsList;