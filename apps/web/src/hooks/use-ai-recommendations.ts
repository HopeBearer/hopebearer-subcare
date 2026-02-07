'use client';

import { useEffect, useState, useCallback } from 'react';
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

export interface UseAIRecommendationsReturn {
  isConnected: boolean;
  isLoading: boolean;
  progress: AIProgressEvent | null;
  data: RecommendationResponse | null;
  error: { code: string; message: string } | null;
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

  // Track connection state based on shared socket
  useEffect(() => {
    if (!socket) {
      setIsConnected(false);
      return;
    }

    // If socket is already connected, set state immediately
    setIsConnected(socket.connected);

    const handleConnect = () => setIsConnected(true);
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

    socket.on('ai:recommendations:progress', handleProgress);
    socket.on('ai:recommendations:complete', handleComplete);
    socket.on('ai:recommendations:error', handleError);

    return () => {
      socket.off('ai:recommendations:progress', handleProgress);
      socket.off('ai:recommendations:complete', handleComplete);
      socket.off('ai:recommendations:error', handleError);
    };
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
      forceRefresh: options?.forceRefresh ?? true
    });
  }, [socket]);

  return {
    isConnected,
    isLoading,
    progress,
    data,
    error,
    fetchRecommendations
  };
};
