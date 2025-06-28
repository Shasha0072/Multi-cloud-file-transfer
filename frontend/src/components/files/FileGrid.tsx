// frontend/src/components/files/FileGrid.tsx
import React from 'react';

interface File {
  name: string;
  path: string;
  size: number;
  modified: string;
  type: 'file' | 'folder';
}

interface FileGridProps {
  files: File[];
  selectedFiles: string[];
  onFileSelect: (filePath: string, isSelected: boolean) => void;
  onFileDoubleClick: (file: File) => void;
}

const FileGrid: React.FC<FileGridProps> = ({
  files,
  selectedFiles,
  onFileSelect,
  onFileDoubleClick
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
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString();
    }
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

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
      {files.map((file) => {
        const isSelected = selectedFiles.includes(file.path);
        return (
          <div
            key={file.path}
            className={`relative group cursor-pointer rounded-lg p-3 transition-all duration-200 ${
              isSelected
                ? 'bg-blue-50 ring-2 ring-blue-500'
                : 'hover:bg-gray-50 hover:shadow-md'
            }`}
            onClick={(e) => handleFileClick(file, e)}
            onDoubleClick={(e) => handleFileDoubleClick(file, e)}
          >
            {/* Selection Checkbox */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => {}} // Handled by onClick
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
            </div>

            {/* File Icon */}
            <div className="flex justify-center mb-2">
              <span className="text-4xl">{getFileIcon(file)}</span>
            </div>

            {/* File Name */}
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>
                {file.name}
              </p>
              
              {/* File Details */}
              <div className="mt-1 text-xs text-gray-500">
                {file.type === 'file' && (
                  <p>{formatFileSize(file.size)}</p>
                )}
                <p>{formatDate(file.modified)}</p>
              </div>
            </div>

            {/* Hover Actions */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-10 rounded-lg">
              <div className="flex space-x-2">
                {file.type === 'file' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle download
                      const url = `/api/accounts/files/download?filePath=${encodeURIComponent(file.path)}`;
                      window.open(url, '_blank');
                    }}
                    className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
                    title="Download"
                  >
                    <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-4-4m4 4l4-4m-6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                )}
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle info/details
                    console.log('Show file details:', file);
                  }}
                  className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
                  title="File Info"
                >
                  <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FileGrid;