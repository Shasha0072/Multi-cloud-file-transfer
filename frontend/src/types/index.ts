export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  subscriptionTier: string;
  usageQuota: number;
  usageCurrent: number;
  createdAt: string;
}

export interface CloudAccount {
  id: string;
  provider: 'aws-s3' | 'google-drive' | 'azure-blob' | 'dropbox';
  accountName: string;
  connectionStatus: 'active' | 'error' | 'pending';
  lastSync?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface Transfer {
  id: string;
  fileName: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  fileSize: number;
  transferredBytes: number;
  transferSpeed: number;
  error?: string;
  sourceAccount: {
    id: string;
    name: string;
    provider: string;
  };
  destinationAccount: {
    id: string;
    name: string;
    provider: string;
  };
  sourceFilePath: string;
  destinationFilePath: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}