// frontend/src/pages/FileBrowserPage.tsx
import React, { useState, useEffect } from 'react';
import Layout from '../components/common/Layout';
import AccountSidebar from '../components/files/AccountSidebar';
import FileBrowser from '../components/files/FileBrowser';
import FileOperationModal from '../components/files/FileOperationModal';
import accountService from '../services/accountService';
import { CloudAccount } from '../types';

const FileBrowserPage: React.FC = () => {
  const [accounts, setAccounts] = useState<CloudAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<CloudAccount | null>(null);
  const [currentPath, setCurrentPath] = useState('');
  const [loading, setLoading] = useState(true);
  const [showOperationModal, setShowOperationModal] = useState(false);
  const [operationType, setOperationType] = useState<'upload' | 'newFolder' | 'rename' | 'delete'>('upload');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const accountsList = await accountService.getAccounts();
      const activeAccounts = accountsList.filter(acc => acc.connectionStatus === 'active');
      setAccounts(activeAccounts);
      
      // Auto-select first account if available
      if (activeAccounts.length > 0 && !selectedAccount) {
        setSelectedAccount(activeAccounts[0]);
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSelect = (account: CloudAccount) => {
    setSelectedAccount(account);
    setCurrentPath(''); // Reset to root when switching accounts
    setSelectedFiles([]); // Clear selection
  };

  const handlePathChange = (newPath: string) => {
    setCurrentPath(newPath);
    setSelectedFiles([]); // Clear selection when navigating
  };

  const handleFileOperation = (operation: 'upload' | 'newFolder' | 'rename' | 'delete') => {
    setOperationType(operation);
    setShowOperationModal(true);
  };

  const handleOperationComplete = () => {
    setShowOperationModal(false);
    setSelectedFiles([]);
    // Trigger refresh of file browser
  };

  if (loading) {
    return (
      <Layout title="File Browser">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="File Browser">
      <div className="flex h-screen">
        {/* Account Sidebar */}
        <div className="w-64 bg-white shadow-lg border-r border-gray-200">
          <AccountSidebar
            accounts={accounts}
            selectedAccount={selectedAccount}
            onAccountSelect={handleAccountSelect}
          />
        </div>

        {/* Main File Browser Area */}
        <div className="flex-1 flex flex-col">
          {selectedAccount ? (
            <FileBrowser
              account={selectedAccount}
              currentPath={currentPath}
              onPathChange={handlePathChange}
              selectedFiles={selectedFiles}
              onFileSelection={setSelectedFiles}
              onFileOperation={handleFileOperation}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No Account Selected</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {accounts.length > 0 
                    ? 'Select a cloud account from the sidebar to browse files.'
                    : 'No active cloud accounts found. Please add a cloud account first.'
                  }
                </p>
                {accounts.length === 0 && (
                  <div className="mt-6">
                    <button
                      onClick={() => window.location.href = '/accounts'}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Add Cloud Account
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* File Operation Modal */}
        {showOperationModal && selectedAccount && (
          <FileOperationModal
            account={selectedAccount}
            currentPath={currentPath}
            operation={operationType}
            selectedFiles={selectedFiles}
            onComplete={handleOperationComplete}
            onCancel={() => setShowOperationModal(false)}
          />
        )}
      </div>
    </Layout>
  );
};

export default FileBrowserPage;