'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store';
import { RecommendationResponse } from '@subcare/types';

// Progress event from backend
export interface AIProgressEvent {
  stage: 'started' | 'tool_call' | 'tool_result' | 'generating' | 'completed' | 'error';
  messageKey: string;  // i18n key for frontend translation
  toolName?: string;
  loop?: number;
  data?: any;
}

export interface UseAIRecommendationsReturn {
  isConnected: boolean;
  isLoading: boolean;
  progress: AIProgressEvent | null;
  data: RecommendationResponse | null;
  error: { code: string; message: string } | null;
  fetchRecommendations: (options?: { model?: string; focus?: string; forceRefresh?: boolean }) => void;
}

export const useAIRecommendations = (): UseAIRecommendationsReturn => {
  const socketRef = useRef<Socket | null>(null);
  const { user, accessToken, isAuthenticated } = useAuthStore();
  
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<AIProgressEvent | null>(null);
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  useEffect(() => {
    // Only connect if authenticated
    if (!isAuthenticated || !accessToken || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Socket URL is configured via NEXT_PUBLIC_SOCKET_URL environment variable
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || '';

    const socket = io(socketUrl, {
      path: '/socket.io',
      auth: {
        token: accessToken,
      },
      query: {
        userId: user.id
      },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('connect_error', (err) => {
      // Suppress authentication errors
      if (err.message?.includes('Authentication error') || err.message?.includes('Invalid token')) {
        return;
      }
      setIsConnected(false);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // AI Recommendations events
    socket.on('ai:recommendations:progress', (event: AIProgressEvent) => {
      setProgress(event);
    });

    socket.on('ai:recommendations:complete', (response: { status: string; data: RecommendationResponse }) => {
      setData(response.data);
      setIsLoading(false);
      setProgress(null);
      setError(null);
    });

    socket.on('ai:recommendations:error', (err: { code: string; message: string }) => {
      setError(err);
      setIsLoading(false);
      setProgress(null);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [isAuthenticated, accessToken, user]);

  const fetchRecommendations = useCallback((options?: { 
    model?: string; 
    focus?: string; 
    forceRefresh?: boolean 
  }) => {
    if (!socketRef.current || !isConnected) {
      setError({ code: 'NOT_CONNECTED', message: 'WebSocket not connected' });
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress({ stage: 'started', messageKey: 'ai.progress.connecting' });
    socketRef.current.emit('ai:recommendations:request', {
      model: options?.model,
      focus: options?.focus,
      forceRefresh: options?.forceRefresh ?? true
    });
  }, [isConnected]);

  return {
    isConnected,
    isLoading,
    progress,
    data,
    error,
    fetchRecommendations
  };
};
