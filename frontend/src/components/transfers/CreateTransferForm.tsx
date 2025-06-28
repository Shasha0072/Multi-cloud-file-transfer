// frontend/src/components/transfers/CreateTransferForm.tsx
import React, { useState, useEffect } from 'react';
import accountService from '../../services/accountService';
import transferService, { CreateTransferData } from '../../services/transferService';
import { CloudAccount } from '../../types';

interface CreateTransferFormProps {
  onTransferCreated: () => void;
  preselectedSource?: CloudAccount;
  preselectedDestination?: CloudAccount;
}

const CreateTransferForm: React.FC<CreateTransferFormProps> = ({
  onTransferCreated,
  preselectedSource,
  preselectedDestination
}) => {
  const [accounts, setAccounts] = useState<CloudAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form state
  const [formData, setFormData] = useState<CreateTransferData>({
    sourceAccountId: preselectedSource?.id || '',
    destinationAccountId: preselectedDestination?.id || '',
    sourcePath: '',
    destinationPath: '',
    fileName: '',
    priority: 5,
    options: {
      overwrite: false,
      preserveMetadata: true,
      encryption: false
    }
  });

  // File browser state
  const [sourceFiles, setSourceFiles] = useState<any[]>([]);
  const [sourcePath, setSourcePath] = useState('');
  const [loadingSourceFiles, setLoadingSourceFiles] = useState(false);
  const [showFileBrowser, setShowFileBrowser] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (formData.sourceAccountId) {
      loadSourceFiles();
    }
  }, [formData.sourceAccountId, sourcePath]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const accountsList = await accountService.getAccounts();
      // Only show active accounts
      const activeAccounts = accountsList.filter(acc => acc.connectionStatus === 'active');
      setAccounts(activeAccounts);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSourceFiles = async () => {
    if (!formData.sourceAccountId) return;
    
    try {
      setLoadingSourceFiles(true);
      const result = await transferService.getAccountFiles(formData.sourceAccountId, sourcePath);
      setSourceFiles(result.files);
    } catch (err: any) {
      console.error('Failed to load files:', err.message);
    } finally {
      setLoadingSourceFiles(false);
    }
  };

  const handleFileSelect = (file: any) => {
    if (file.type === 'folder') {
      setSourcePath(file.path);
      return;
    }

    setFormData(prev => ({
      ...prev,
      sourcePath: file.path,
      fileName: file.name,
      destinationPath: prev.destinationPath || file.name
    }));
    setShowFileBrowser(false);
  };

  const navigateToParent = () => {
    const parentPath = sourcePath.split('/').slice(0, -1).join('/');
    setSourcePath(parentPath);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.sourceAccountId || !formData.destinationAccountId) {
      setError('Please select both source and destination accounts');
      return;
    }

    if (!formData.sourcePath || !formData.destinationPath) {
      setError('Please specify both source and destination paths');
      return;
    }

    if (formData.sourceAccountId === formData.destinationAccountId) {
      setError('Source and destination accounts must be different');
      return;
    }

    try {
      setCreating(true);
      setError('');
      
      const result = await transferService.createTransfer(formData);
      
      setSuccess(`Transfer created successfully! ID: ${result.transferId}`);
      
      // Reset form
      setFormData({
        sourceAccountId: '',
        destinationAccountId: '',
        sourcePath: '',
        destinationPath: '',
        fileName: '',
        priority: 5,
        options: {
          overwrite: false,
          preserveMetadata: true,
          encryption: false
        }
      });
      setSourcePath('');
      setSourceFiles([]);
      
      // Notify parent
      onTransferCreated();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const getAccountName = (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    return account ? `${account.accountName} (${account.provider})` : 'Select account';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div className="flex items-center mb-6">
        <svg className="h-6 w-6 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        <h2 className="text-xl font-semibold text-gray-900">Create New Transfer</h2>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-700 text-sm">{error}</div>
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
          <div className="text-green-700 text-sm">{success}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Account Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Source Account
            </label>
            <select
              value={formData.sourceAccountId}
              onChange={(e) => setFormData(prev => ({ ...prev, sourceAccountId: e.target.value }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select source account</option>
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {getAccountName(account.id)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Destination Account
            </label>
            <select
              value={formData.destinationAccountId}
              onChange={(e) => setFormData(prev => ({ ...prev, destinationAccountId: e.target.value }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select destination account</option>
              {accounts.filter(acc => acc.id !== formData.sourceAccountId).map(account => (
                <option key={account.id} value={account.id}>
                  {getAccountName(account.id)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* File Selection */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Source File/Path
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={formData.sourcePath}
                onChange={(e) => setFormData(prev => ({ ...prev, sourcePath: e.target.value }))}
                placeholder="Enter file path or use browser"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
              {formData.sourceAccountId && (
                <button
                  type="button"
                  onClick={() => setShowFileBrowser(!showFileBrowser)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Browse
                </button>
              )}
            </div>
          </div>

          {/* File Browser */}
          {showFileBrowser && formData.sourceAccountId && (
            <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Browse Files: /{sourcePath}
                </span>
                {sourcePath && (
                  <button
                    type="button"
                    onClick={navigateToParent}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    ← Back
                  </button>
                )}
              </div>
              
              {loadingSourceFiles ? (
                <div className="text-center py-4">
                  <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                </div>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {sourceFiles.map((file, index) => (
                    <div
                      key={index}
                      onClick={() => handleFileSelect(file)}
                      className="flex items-center p-2 rounded hover:bg-white cursor-pointer text-sm"
                    >
                      <span className="mr-2">
                        {file.type === 'folder' ? '📁' : '📄'}
                      </span>
                      <span className="flex-1">{file.name}</span>
                      {file.type === 'file' && (
                        <span className="text-gray-500 text-xs">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Destination Path
            </label>
            <input
              type="text"
              value={formData.destinationPath}
              onChange={(e) => setFormData(prev => ({ ...prev, destinationPath: e.target.value }))}
              placeholder="Enter destination path"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </div>

        {/* Transfer Options */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700">Transfer Options</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority (1-10)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.options?.overwrite}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  options: { ...prev.options, overwrite: e.target.checked }
                }))}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">Overwrite existing files</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.options?.preserveMetadata}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  options: { ...prev.options, preserveMetadata: e.target.checked }
                }))}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">Preserve file metadata</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.options?.encryption}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  options: { ...prev.options, encryption: e.target.checked }
                }))}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">Enable encryption</span>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={creating || accounts.length < 2}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {creating ? (
              <>
                <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Transfer...
              </>
            ) : (
              'Create Transfer'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTransferForm;