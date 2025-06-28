// frontend/src/components/files/FileList.tsx
import React from 'react';

interface File {
  name: string;
  path: string;
  size: number;
  modified: string;
  type: 'file' | 'folder';
}

interface FileListProps {
  files: File[];
  selectedFiles: string[];
  onFileSelect: (filePath: string, isSelected: boolean) => void;
  onFileDoubleClick: (file: File) => void;
  sortBy: 'name' | 'size' | 'modified' | 'type';
  sortOrder: 'asc' | 'desc';
  onSort: (sortBy: 'name' | 'size' | 'modified' | 'type') => void;
}

const FileList: React.FC<FileListProps> = ({
  files,
  selectedFiles,
  onFileSelect,
  onFileDoubleClick,
  sortBy,
  sortOrder,
  onSort
}) => {
  const getFileIcon = (file: File) => {
    if (file.type === 'folder') {
      return '📁';
    }

    const extension = file.name.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'svg':
        return '🖼️';
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'xls':
      case 'xlsx':
        return '📊';
      case 'ppt':
      case 'pptx':
        return '📽️';
      case 'zip':
      case 'rar':
      case '7z':
        return '🗜️';
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'wmv':
        return '🎬';
      case 'mp3':
      case 'wav':
      case 'flac':
        return '🎵';
      case 'txt':
        return '📄';
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
      case 'html':
      case 'css':
      case 'json':
        return '💻';
      default:
        return '📄';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const handleFileClick = (file: File, event: React.MouseEvent) => {
    event.preventDefault();
    const isSelected = selectedFiles.includes(file.path);
    onFileSelect(file.path, !isSelected);
  };

  const handleFileDoubleClick = (file: File, event: React.MouseEvent) => {
    event.preventDefault();
    onFileDoubleClick(file);
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return (
        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
        </svg>
      );
    }

    return sortOrder === 'asc' ? (
      <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
      </svg>
    ) : (
      <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
      </svg>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Table Header */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-12 gap-4 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          <div className="col-span-1">
            {/* Select All Checkbox */}
            <input
              type="checkbox"
              checked={selectedFiles.length === files.length && files.length > 0}
              onChange={() => {}} // Handled by parent
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
          </div>
          
          <div 
            className="col-span-5 flex items-center cursor-pointer hover:text-gray-700"
            onClick={() => onSort('name')}
          >
            <span>Name</span>
            {getSortIcon('name')}
          </div>
          
          <div 
            className="col-span-2 flex items-center cursor-pointer hover:text-gray-700"
            onClick={() => onSort('size')}
          >
            <span>Size</span>
            {getSortIcon('size')}
          </div>
          
          <div 
            className="col-span-2 flex items-center cursor-pointer hover:text-gray-700"
            onClick={() => onSort('type')}
          >
            <span>Type</span>
            {getSortIcon('type')}
          </div>
          
          <div 
            className="col-span-2 flex items-center cursor-pointer hover:text-gray-700"
            onClick={() => onSort('modified')}
          >
            <span>Modified</span>
            {getSortIcon('modified')}
          </div>
        </div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-gray-200">
        {files.map((file) => {
          const isSelected = selectedFiles.includes(file.path);
          return (
            <div
              key={file.path}
              className={`grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                isSelected ? 'bg-blue-50' : ''
              }`}
              onClick={(e) => handleFileClick(file, e)}
              onDoubleClick={(e) => handleFileDoubleClick(file, e)}
            >
              {/* Checkbox */}
              <div className="col-span-1 flex items-center">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}} // Handled by onClick
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
              </div>

              {/* Name with Icon */}
              <div className="col-span-5 flex items-center">
                <span className="text-xl mr-3">{getFileIcon(file)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate" title={file.path}>
                    {file.path}
                  </p>
                </div>
              </div>

              {/* Size */}
              <div className="col-span-2 flex items-center">
                <span className="text-sm text-gray-900">
                  {file.type === 'folder' ? '-' : formatFileSize(file.size)}
                </span>
              </div>

              {/* Type */}
              <div className="col-span-2 flex items-center">
                <span className="text-sm text-gray-900 capitalize">
                  {file.type === 'folder' ? 'Folder' : file.name.split('.').pop() || 'File'}
                </span>
              </div>

              {/* Modified */}
              <div className="col-span-2 flex items-center">
                <span className="text-sm text-gray-900">
                  {formatDate(file.modified)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FileList;