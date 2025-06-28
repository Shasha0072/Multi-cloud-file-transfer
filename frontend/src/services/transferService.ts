// frontend/src/services/transferService.ts
import api from './api';

export interface CreateTransferData {
  sourceAccountId: string;
  destinationAccountId: string;
  sourcePath: string;
  destinationPath: string;
  fileName?: string;
  priority?: number;
  scheduledAt?: string;
  options?: {
    overwrite?: boolean;
    preserveMetadata?: boolean;
    encryption?: boolean;
  };
}

export interface Transfer {
  id: string;
  userId: string;
  sourceAccountId: string;
  destinationAccountId: string;
  sourcePath: string;
  destinationPath: string;
  fileName: string;
  fileSize?: number;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  transferredBytes: number;
  transferSpeed?: number;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  priority: number;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  sourceAccount?: any;
  destinationAccount?: any;
}

export interface TransferProgress {
  jobId: string;
  transferred: number;
  totalSize: number;
  progress: number;
  speed: number;
  eta: number;
  overallProgress: number;
}

class TransferService {
  async getTransfers(params?: {
    page?: number;
    limit?: number;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    transfers: Transfer[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.page) {
      const offset = (params.page - 1) * (params.limit || 20);
      searchParams.append('offset', offset.toString());
    }
    if (params?.status) searchParams.append('status', params.status);

    const response = await api.get(`/transfers?${searchParams.toString()}`);
    
    // Transform backend response to frontend format
    const backendTransfers = response.data.transfers || [];
    const transformedTransfers: Transfer[] = backendTransfers.map((t: any) => ({
      id: t.id.toString(),
      userId: t.userId || '',
      sourceAccountId: t.sourceAccount?.id?.toString() || '',
      destinationAccountId: t.destinationAccount?.id?.toString() || '',
      sourcePath: t.sourceFilePath || '',
      destinationPath: t.destinationFilePath || '',
      fileName: t.fileName || '',
      fileSize: t.fileSize || 0,
      status: t.status as 'queued' | 'running' | 'completed' | 'failed' | 'cancelled',
      progress: t.progress || 0,
      transferredBytes: t.transferredBytes || 0,
      transferSpeed: t.transferSpeed || 0,
      errorMessage: t.error || '',
      retryCount: 0,
      maxRetries: 3,
      priority: 5,
      scheduledAt: t.scheduledAt,
      startedAt: t.startedAt,
      completedAt: t.completedAt,
      createdAt: t.createdAt || new Date().toISOString(),
      sourceAccount: t.sourceAccount,
      destinationAccount: t.destinationAccount
    }));

    const limit = params?.limit || 20;
    const currentPage = params?.page || 1;
    const total = response.data.statistics?.total || transformedTransfers.length;
    
    return {
      transfers: transformedTransfers,
      pagination: {
        page: currentPage,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async createTransfer(transferData: CreateTransferData): Promise<{
    transferId: string;
    status: string;
    message: string;
  }> {
    // Transform frontend data to match backend API
    const backendData = {
      sourceAccountId: parseInt(transferData.sourceAccountId),
      destinationAccountId: parseInt(transferData.destinationAccountId),
      sourceFilePath: transferData.sourcePath,
      destinationFilePath: transferData.destinationPath,
      fileName: transferData.fileName || transferData.sourcePath.split('/').pop() || 'unknown'
    };

    const response = await api.post('/transfers', backendData);
    return {
      transferId: response.data.transfer.id.toString(),
      status: response.data.transfer.status,
      message: response.data.message
    };
  }

  async getTransfer(transferId: string): Promise<Transfer> {
    const response = await api.get(`/transfers/${transferId}`);
    return response.data;
  }

  async cancelTransfer(transferId: string): Promise<{ message: string }> {
    const response = await api.delete(`/transfers/${transferId}`);
    return response.data;
  }

  async retryTransfer(transferId: string): Promise<{ message: string }> {
    const response = await api.post(`/transfers/${transferId}/retry`);
    return response.data;
  }

  // Get files from a cloud account (for file browser)
  async getAccountFiles(accountId: string, path: string = ''): Promise<{
    files: Array<{
      name: string;
      path: string;
      size: number;
      modified: string;
      type: 'file' | 'folder';
    }>;
    currentPath: string;
  }> {
    const response = await api.get(`/accounts/${parseInt(accountId)}/files`, {
      params: { path }
    });
    return {
      files: response.data.files,
      currentPath: response.data.path
    };
  }

  // Upload file to account (for direct upload feature)
  async uploadFile(
    accountId: string, 
    file: File, 
    destinationPath: string,
    onProgress?: (progress: number) => void
  ): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('destinationPath', destinationPath);

    const response = await api.post(`/accounts/${accountId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
    return response.data;
  }
}

export default new TransferService();