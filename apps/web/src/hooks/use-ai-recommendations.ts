'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSocket } from '@/hooks/use-socket';
import { RecommendationResponse } from '@subcare/types';

// Progress event from backend
export interface AIProgressEvent {
  stage: 'started' | 'tool_call' | 'tool_result' | 'generating' | 'completed' | 'error';
  messageKey: string;  // i18n key for frontend translation
  toolName?: string;
  loop?: number;
  data?: unknown;
}

// Status response from backend TaskManager
export interface AITaskStatusResponse {
  status: 'idle' | 'running' | 'completed' | 'error';
  progress?: AIProgressEvent | null;
  data?: RecommendationResponse;
  error?: { code: string; message: string } | null;
  /** Previously cached recommendation from DB (sent when running/idle) */
  cachedData?: RecommendationResponse;
}

export interface UseAIRecommendationsReturn {
  isConnected: boolean;
  isLoading: boolean;
  progress: AIProgressEvent | null;
  data: RecommendationResponse | null;
  error: { code: string; message: string } | null;
  /** Whether the initial status query has been completed */
  statusChecked: boolean;
  /** Query current backend task status (call on mount/reconnect) */
  queryStatus: () => void;
  fetchRecommendations: (options?: { model?: string; focus?: string; forceRefresh?: boolean }) => void;
}

export const useAIRecommendations = (): UseAIRecommendationsReturn => {
  // Reuse the global shared socket (same as chat, notifications, etc.)
  const socket = useSocket();

  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<AIProgressEvent | null>(null);
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [statusChecked, setStatusChecked] = useState(false);

  // Prevent duplicate status queries
  const statusQueried = useRef(false);

  // Track connection state based on shared socket
  useEffect(() => {
    if (!socket) {
      setIsConnected(false);
      statusQueried.current = false;
      setStatusChecked(false);
      return;
    }

    // If socket is already connected, set state immediately
    setIsConnected(socket.connected);

    const handleConnect = () => {
      setIsConnected(true);
      // Reset flags so status can be re-queried on reconnect
      statusQueried.current = false;
      setStatusChecked(false);
    };
    const handleDisconnect = () => setIsConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket]);

  // Register AI Recommendation event listeners on the shared socket
  useEffect(() => {
    if (!socket) return;

    const handleProgress = (event: AIProgressEvent) => {
      setIsLoading(true);
      setProgress(event);
    };

    const handleComplete = (response: { status: string; data: RecommendationResponse }) => {
      setData(response.data);
      setIsLoading(false);
      setProgress(null);
      setError(null);
    };

    const handleError = (err: { code: string; message: string }) => {
      setError(err);
      setIsLoading(false);
      setProgress(null);
    };

    // Status query response handler
    const handleStatusResult = (response: AITaskStatusResponse) => {
      // If there's cached data from DB, restore it so UI can show old cards
      // This ensures consistent UX: progress overlay on top of existing data
      if (response.cachedData) {
        setData(response.cachedData as RecommendationResponse);
      }

      switch (response.status) {
        case 'running':
          // Task is in progress on backend — restore loading state
          setIsLoading(true);
          if (response.progress) {
            setProgress(response.progress);
          }
          break;

        case 'completed':
          // Backend has a completed result — use it directly
          if (response.data) {
            setData(response.data as RecommendationResponse);
          }
          setIsLoading(false);
          setProgress(null);
          setError(null);
          break;

        case 'error':
          if (response.error) {
            setError(response.error);
          }
          setIsLoading(false);
          setProgress(null);
          break;

        case 'idle':
        default:
          // No task running — if cachedData was already set above, 
          // the component will display it and the auto-fetch effect won't fire
          // (because data is already present)
          break;
      }

      // Mark status as checked so components know the query has completed
      setStatusChecked(true);
    };

    socket.on('ai:recommendations:progress', handleProgress);
    socket.on('ai:recommendations:complete', handleComplete);
    socket.on('ai:recommendations:error', handleError);
    socket.on('ai:recommendations:status:result', handleStatusResult);

    return () => {
      socket.off('ai:recommendations:progress', handleProgress);
      socket.off('ai:recommendations:complete', handleComplete);
      socket.off('ai:recommendations:error', handleError);
      socket.off('ai:recommendations:status:result', handleStatusResult);
    };
  }, [socket]);

  /**
   * Query current backend task status.
   * Should be called on mount/reconnect to check if a task is already running.
   */
  const queryStatus = useCallback(() => {
    if (!socket || !socket.connected) return;
    if (statusQueried.current) return;
    
    statusQueried.current = true;
    socket.emit('ai:recommendations:status');
  }, [socket]);

  const fetchRecommendations = useCallback((options?: { 
    model?: string; 
    focus?: string; 
    forceRefresh?: boolean 
  }) => {
    if (!socket || !socket.connected) {
      setError({ code: 'NOT_CONNECTED', message: 'WebSocket not connected' });
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress({ stage: 'started', messageKey: 'ai.progress.connecting' });
    socket.emit('ai:recommendations:request', {
      model: options?.model,
      focus: options?.focus,
      forceRefresh: options?.forceRefresh ?? false
    });
  }, [socket]);

  return {
    isConnected,
    isLoading,
    progress,
    data,
    error,
    statusChecked,
    queryStatus,
    fetchRecommendations
  };
};
