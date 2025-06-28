// frontend/src/components/files/FileBrowser.tsx
import React, { useState, useEffect } from 'react';
import BreadcrumbNavigation from './BreadcrumbNavigation';
import FileToolbar from './FileToolbar';
import FileGrid from './FileGrid';
import FileList from './FileList';
import transferService from '../../services/transferService';
import { CloudAccount } from '../../types';

interface File {
  name: string;
  path: string;
  size: number;
  modified: string;
  type: 'file' | 'folder';
}

interface FileBrowserProps {
  account: CloudAccount;
  currentPath: string;
  onPathChange: (path: string) => void;
  selectedFiles: string[];
  onFileSelection: (files: string[]) => void;
  onFileOperation: (operation: 'upload' | 'newFolder' | 'rename' | 'delete') => void;
}

const FileBrowser: React.FC<FileBrowserProps> = ({
  account,
  currentPath,
  onPathChange,
  selectedFiles,
  onFileSelection,
  onFileOperation
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'modified' | 'type'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'files' | 'folders'>('all');

  useEffect(() => {
    loadFiles();
  }, [account.id, currentPath]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await transferService.getAccountFiles(account.id, currentPath);
      setFiles(response.files);
    } catch (err: any) {
      setError(err.message || 'Failed to load files');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    onFileSelection([]); // Clear selection
    loadFiles();
  };

  const handleFileDoubleClick = (file: File) => {
    if (file.type === 'folder') {
      const newPath = currentPath ? `${currentPath}/${file.name}` : file.name;
      onPathChange(newPath);
    } else {
      // Handle file preview/download
      handleFileDownload(file);
    }
  };

  const handleFileDownload = async (file: File) => {
    try {
      const url = `/api/accounts/${account.id}/files/download?filePath=${encodeURIComponent(file.path)}`;
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      link.click();
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleFileSelection = (filePath: string, isSelected: boolean) => {
    if (isSelected) {
      onFileSelection([...selectedFiles, filePath]);
    } else {
      onFileSelection(selectedFiles.filter(path => path !== filePath));
    }
  };

  const handleSelectAll = () => {
    if (selectedFiles.length === filteredFiles.length) {
      onFileSelection([]); // Deselect all
    } else {
      onFileSelection(filteredFiles.map(file => file.path)); // Select all
    }
  };

  // Filter and sort files
  const filteredFiles = files
    .filter(file => {
      // Apply search filter
      if (searchQuery && !file.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Apply type filter
      if (filterType === 'files' && file.type !== 'file') return false;
      if (filterType === 'folders' && file.type !== 'folder') return false;
      
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'modified':
          comparison = new Date(a.modified).getTime() - new Date(b.modified).getTime();
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Breadcrumb Navigation */}
      <BreadcrumbNavigation
        currentPath={currentPath}
        onPathChange={onPathChange}
        accountName={account.accountName}
      />

      {/* File Toolbar */}
      <FileToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSortBy}
        onSortOrderChange={setSortOrder}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterType={filterType}
        onFilterChange={setFilterType}
        selectedCount={selectedFiles.length}
        totalCount={filteredFiles.length}
        onSelectAll={handleSelectAll}
        onRefresh={handleRefresh}
        onFileOperation={onFileOperation}
      />

      {/* File Content Area */}
      <div className="flex-1 p-4 overflow-auto">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Error Loading Files</h3>
              <p className="mt-1 text-sm text-gray-500">{error}</p>
              <button
                onClick={handleRefresh}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {searchQuery || filterType !== 'all' ? 'No files match your criteria' : 'Folder is empty'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery || filterType !== 'all' 
                  ? 'Try adjusting your search or filter settings.'
                  : 'Upload files or create folders to get started.'
                }
              </p>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <FileGrid
            files={filteredFiles}
            selectedFiles={selectedFiles}
            onFileSelect={handleFileSelection}
            onFileDoubleClick={handleFileDoubleClick}
          />
        ) : (
          <FileList
            files={filteredFiles}
            selectedFiles={selectedFiles}
            onFileSelect={handleFileSelection}
            onFileDoubleClick={handleFileDoubleClick}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={setSortBy}
          />
        )}
      </div>
    </div>
  );
};

export default FileBrowser;