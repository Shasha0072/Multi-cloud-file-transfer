// frontend/src/components/files/BreadcrumbNavigation.tsx
import React from 'react';

interface BreadcrumbNavigationProps {
  currentPath: string;
  onPathChange: (path: string) => void;
  accountName: string;
}

const BreadcrumbNavigation: React.FC<BreadcrumbNavigationProps> = ({
  currentPath,
  onPathChange,
  accountName
}) => {
  const pathSegments = currentPath ? currentPath.split('/').filter(Boolean) : [];

  const handleSegmentClick = (index: number) => {
    if (index === -1) {
      // Clicked on root (account name)
      onPathChange('');
    } else {
      // Clicked on a path segment
      const newPath = pathSegments.slice(0, index + 1).join('/');
      onPathChange(newPath);
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center space-x-2">
        {/* Home/Back Button */}
        <button
          onClick={() => onPathChange('')}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          title="Go to root"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 21v-4a2 2 0 012-2h4a2 2 0 012 2v4" />
          </svg>
        </button>

        {/* Breadcrumb Path */}
        <nav className="flex items-center space-x-2 text-sm">
          {/* Account Root */}
          <button
            onClick={() => handleSegmentClick(-1)}
            className={`font-medium transition-colors ${
              currentPath === '' 
                ? 'text-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {accountName}
          </button>

          {/* Path Segments */}
          {pathSegments.map((segment, index) => (
            <React.Fragment key={index}>
              {/* Separator */}
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              
              {/* Path Segment */}
              <button
                onClick={() => handleSegmentClick(index)}
                className={`font-medium transition-colors ${
                  index === pathSegments.length - 1
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {segment}
              </button>
            </React.Fragment>
          ))}
        </nav>

        {/* Path Input (for advanced users) */}
        <div className="flex-1 flex justify-end">
          <div className="max-w-md">
            <input
              type="text"
              value={currentPath}
              onChange={(e) => onPathChange(e.target.value)}
              placeholder="Enter path..."
              className="block w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BreadcrumbNavigation;