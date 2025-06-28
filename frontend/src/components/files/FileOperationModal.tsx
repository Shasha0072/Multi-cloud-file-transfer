// frontend/src/components/files/FileOperationModal.tsx
import React, { useState } from 'react';
import { CloudAccount } from '../../types';

interface FileOperationModalProps {
  account: CloudAccount;
  currentPath: string;
  operation: 'upload' | 'newFolder' | 'rename' | 'delete';
  selectedFiles: string[];
  onComplete: () => void;
  onCancel: () => void;
}

const FileOperationModal: React.FC<FileOperationModalProps> = ({
  account,
  currentPath,
  operation,
  selectedFiles,
  onComplete,
  onCancel
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [folderName, setFolderName] = useState('');
  const [newName, setNewName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('file', selectedFile);
      if (currentPath) {
        formData.append('path', currentPath);
      }

      const response = await fetch(`/api/accounts/${account.id}/files/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      onComplete();
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      setError('Please enter a folder name');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Note: This would need to be implemented in the backend
      const response = await fetch(`/api/accounts/${account.id}/folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          path: currentPath,
          name: folderName
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create folder');
      }

      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to create folder');
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async () => {
    if (!newName.trim()) {
      setError('Please enter a new name');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Note: This would need to be implemented in the backend
      const response = await fetch(`/api/accounts/${account.id}/files/rename`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          oldPath: selectedFiles[0],
          newName: newName
        })
      });

      if (!response.ok) {
        throw new Error('Failed to rename file');
      }

      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to rename file');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      setError('');

      // Note: This would need to be implemented in the backend
      const response = await fetch(`/api/accounts/${account.id}/files`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          paths: selectedFiles
        })
      });

      if (!response.ok) {
        throw new Error('Failed to delete files');
      }

      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to delete files');
    } finally {
      setLoading(false);
    }
  };

  const getModalTitle = () => {
    switch (operation) {
      case 'upload':
        return 'Upload File';
      case 'newFolder':
        return 'Create New Folder';
      case 'rename':
        return 'Rename File';
      case 'delete':
        return 'Delete Files';
      default:
        return 'File Operation';
    }
  };

  const renderModalContent = () => {
    switch (operation) {
      case 'upload':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select File
              </label>
              <input
                type="file"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {selectedFile && (
                <p className="mt-2 text-sm text-gray-600">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload to
              </label>
              <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                {account.accountName}/{currentPath || 'root'}
              </p>
            </div>
            {uploadProgress > 0 && (
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        );

      case 'newFolder':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Folder Name
              </label>
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="Enter folder name"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                {account.accountName}/{currentPath || 'root'}
              </p>
            </div>
          </div>
        );

      case 'rename':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Name
              </label>
              <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                {selectedFiles[0]?.split('/').pop()}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter new name"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
            </div>
          </div>
        );

      case 'delete':
        return (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Confirm Deletion
                  </h3>
                  <p className="mt-2 text-sm text-red-700">
                    Are you sure you want to delete {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}? This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Files to delete:
              </label>
              <div className="max-h-32 overflow-y-auto bg-gray-50 rounded-md p-2">
                {selectedFiles.map((filePath) => (
                  <p key={filePath} className="text-sm text-gray-600 py-1">
                    {filePath.split('/').pop()}
                  </p>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const handleSubmit = () => {
    switch (operation) {
      case 'upload':
        handleUpload();
        break;
      case 'newFolder':
        handleCreateFolder();
        break;
      case 'rename':
        handleRename();
        break;
      case 'delete':
        handleDelete();
        break;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {getModalTitle()}
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {renderModalContent()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
              operation === 'delete'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 mr-2 inline" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                {operation === 'upload' && 'Upload'}
                {operation === 'newFolder' && 'Create'}
                {operation === 'rename' && 'Rename'}
                {operation === 'delete' && 'Delete'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileOperationModal;