// frontend/src/hooks/useWebSocket.ts
import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface TransferProgress {
  jobId: string;
  transferred: number;
  totalSize: number;
  progress: number;
  speed: number;
  eta: number;
  overallProgress: number;
}

interface TransferStatusUpdate {
  jobId: string;
  status: string;
  message?: string;
}

interface UseWebSocketReturn {
  connected: boolean;
  subscribeToTransfer: (transferId: string) => void;
  unsubscribeFromTransfer: (transferId: string) => void;
  onTransferProgress: (callback: (data: TransferProgress) => void) => void;
  onTransferStatus: (callback: (data: TransferStatusUpdate) => void) => void;
  disconnect: () => void;
}

const useWebSocket = (): UseWebSocketReturn => {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const progressCallbackRef = useRef<((data: TransferProgress) => void) | null>(null);
  const statusCallbackRef = useRef<((data: TransferStatusUpdate) => void) | null>(null);

  useEffect(() => {
    // Initialize socket connection only if user is authenticated
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:3000';
    
    const socket = io(wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected');
      setConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setConnected(false);
    });

    socket.on('transfer:progress', (data: TransferProgress) => {
      if (progressCallbackRef.current) {
        progressCallbackRef.current(data);
      }
    });

    socket.on('transfer:status', (data: TransferStatusUpdate) => {
      if (statusCallbackRef.current) {
        statusCallbackRef.current(data);
      }
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setConnected(false);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  const subscribeToTransfer = (transferId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe:transfer', transferId);
      console.log(`Subscribed to transfer: ${transferId}`);
    }
  };

  const unsubscribeFromTransfer = (transferId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('unsubscribe:transfer', transferId);
      console.log(`Unsubscribed from transfer: ${transferId}`);
    }
  };

  const onTransferProgress = (callback: (data: TransferProgress) => void) => {
    progressCallbackRef.current = callback;
  };

  const onTransferStatus = (callback: (data: TransferStatusUpdate) => void) => {
    statusCallbackRef.current = callback;
  };

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };

  return {
    connected,
    subscribeToTransfer,
    unsubscribeFromTransfer,
    onTransferProgress,
    onTransferStatus,
    disconnect,
  };
};

export default useWebSocket;