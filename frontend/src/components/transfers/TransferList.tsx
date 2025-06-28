// frontend/src/components/transfers/TransferList.tsx
import React, { useState, useEffect } from 'react';
import transferService, { Transfer } from '../../services/transferService';

interface TransferListProps {
  refreshTrigger?: number;
}

const TransferList: React.FC<TransferListProps> = ({ refreshTrigger }) => {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTransfers, setTotalTransfers] = useState(0);
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadTransfers();
  }, [currentPage, statusFilter, sortBy, sortOrder, refreshTrigger]);

  // Auto-refresh for running transfers
  useEffect(() => {
    const hasRunningTransfers = transfers.some(t => t.status === 'running' || t.status === 'queued');
    
    if (hasRunningTransfers) {
      const interval = setInterval(() => {
        loadTransfers();
      }, 3000); // Refresh every 3 seconds
      
      return () => clearInterval(interval);
    }
  }, [transfers]);

  const loadTransfers = async () => {
    try {
      setLoading(true);
      const response = await transferService.getTransfers({
        page: currentPage,
        limit: 10,
        status: statusFilter || undefined,
        sortBy,
        sortOrder
      });
      
      setTransfers(response.transfers);
      setTotalPages(response.pagination.pages);
      setTotalTransfers(response.pagination.total);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTransfer = async (transferId: string) => {
    if (!window.confirm('Are you sure you want to cancel this transfer?')) {
      return;
    }

    try {
      setActionLoading(transferId);
      await transferService.cancelTransfer(transferId);
      await loadTransfers(); // Refresh list
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRetryTransfer = async (transferId: string) => {
    try {
      setActionLoading(transferId);
      await transferService.retryTransfer(transferId);
      await loadTransfers(); // Refresh list
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'running':
        return 'text-blue-600 bg-blue-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'cancelled':
        return 'text-gray-600 bg-gray-100';
      case 'queued':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'running':
        return '🔄';
      case 'failed':
        return '❌';
      case 'cancelled':
        return '⏹️';
      case 'queued':
        return '⏳';
      default:
        return '❓';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
    
    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
  };

  const formatSpeed = (bytesPerSecond: number) => {
    if (!bytesPerSecond) return '-';
    return `${formatFileSize(bytesPerSecond)}/s`;
  };

  if (loading && transfers.length === 0) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Transfer History</h2>
          <p className="text-sm text-gray-500">{totalTransfers} total transfers</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="queued">Queued</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Sort Options */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field);
              setSortOrder(order as 'asc' | 'desc');
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="created_at-desc">Newest First</option>
            <option value="created_at-asc">Oldest First</option>
            <option value="file_size-desc">Largest Files</option>
            <option value="file_size-asc">Smallest Files</option>
            <option value="status-asc">Status A-Z</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-700 text-sm">{error}</div>
        </div>
      )}

      {/* Transfer Cards */}
      {transfers.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No transfers found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {statusFilter ? `No transfers with status "${statusFilter}"` : 'Get started by creating your first transfer.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {transfers.map((transfer) => (
            <div key={transfer.id} className="bg-white rounded-lg shadow border border-gray-200 p-6">
              {/* Transfer Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{getStatusIcon(transfer.status)}</span>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{transfer.fileName}</h3>
                    <p className="text-sm text-gray-500">
                      {transfer.sourceAccount?.accountName} → {transfer.destinationAccount?.accountName}
                    </p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(transfer.status)}`}>
                  {transfer.status.toUpperCase()}
                </span>
              </div>

              {/* Progress Bar (for running transfers) */}
              {transfer.status === 'running' && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress: {transfer.progress}%</span>
                    <span>{formatSpeed(transfer.transferSpeed || 0)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${transfer.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Transfer Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">File Size:</span>
                  <div className="font-medium">{formatFileSize(transfer.fileSize || 0)}</div>
                </div>
                <div>
                  <span className="text-gray-500">Priority:</span>
                  <div className="font-medium">{transfer.priority}</div>
                </div>
                <div>
                  <span className="text-gray-500">Created:</span>
                  <div className="font-medium">{new Date(transfer.createdAt).toLocaleDateString()}</div>
                </div>
                <div>
                  <span className="text-gray-500">
                    {transfer.status === 'running' ? 'Running Time:' : 
                     transfer.status === 'completed' ? 'Duration:' : 'Status:'}
                  </span>
                  <div className="font-medium">
                    {transfer.startedAt ? formatDuration(transfer.startedAt, transfer.completedAt) : '-'}
                  </div>
                </div>
              </div>

              {/* Paths */}
              <div className="mt-4 space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">Source:</span>
                  <div className="font-mono text-xs bg-gray-50 p-2 rounded break-all">{transfer.sourcePath}</div>
                </div>
                <div>
                  <span className="text-gray-500">Destination:</span>
                  <div className="font-mono text-xs bg-gray-50 p-2 rounded break-all">{transfer.destinationPath}</div>
                </div>
              </div>

              {/* Error Message */}
              {transfer.errorMessage && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="text-red-700 text-sm">
                    <strong>Error:</strong> {transfer.errorMessage}
                  </div>
                  {transfer.retryCount > 0 && (
                    <div className="text-red-600 text-xs mt-1">
                      Retry attempts: {transfer.retryCount}/{transfer.maxRetries}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 mt-4">
                {transfer.status === 'failed' && transfer.retryCount < transfer.maxRetries && (
                  <button
                    onClick={() => handleRetryTransfer(transfer.id)}
                    disabled={actionLoading === transfer.id}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
                  >
                    {actionLoading === transfer.id ? (
                      <>
                        <svg className="animate-spin h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Retrying...
                      </>
                    ) : (
                      'Retry'
                    )}
                  </button>
                )}

                {['queued', 'running'].includes(transfer.status) && (
                  <button
                    onClick={() => handleCancelTransfer(transfer.id)}
                    disabled={actionLoading === transfer.id}
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center"
                  >
                    {actionLoading === transfer.id ? (
                      <>
                        <svg className="animate-spin h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Cancelling...
                      </>
                    ) : (
                      'Cancel'
                    )}
                  </button>
                )}

                <button
                  onClick={() => window.open(`/transfers/${transfer.id}`, '_blank')}
                  className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing page <span className="font-medium">{currentPage}</span> of{' '}
                <span className="font-medium">{totalPages}</span>
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                        currentPage === pageNum
                          ? 'z-10 bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                          : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransferList;