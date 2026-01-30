import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore, useNotificationStore } from '@/store'; 
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const { user, accessToken, isAuthenticated } = useAuthStore();
  const { incrementUnread, decrementUnread, resetUnread } = useNotificationStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('[useSocket] Hook triggered. Auth state:', { isAuthenticated, hasToken: !!accessToken, userId: user?.id });

    // Only connect if authenticated
    if (!isAuthenticated || !accessToken || !user) {
        console.log('[useSocket] Not authenticated, skipping connection.');
        if (socketRef.current) {
            console.log('[useSocket] Disconnecting existing socket.');
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        return;
    }

    console.log('[useSocket] Attempting to connect to socket...');

    // Connect via proxy path
    // Use direct URL for development to avoid Next.js proxy issues with WebSockets
    const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
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
      console.log('[useSocket] Socket connected successfully. ID:', socket.id);
    });

    socket.on('connect_error', (err) => {
      // Suppress authentication errors as requested to keep console clean
      if (err.message && (err.message.includes('Authentication error') || err.message.includes('Invalid token'))) {
        return;
      }
      console.error('[useSocket] Socket connection error:', err);
    });

    socket.on('disconnect', (reason) => {
       console.log('[useSocket] Socket disconnected:', reason);
    });

    socket.on('notification:new', (data) => {
      console.log('[useSocket] New Notification received:', data);
      
      // Update store
      incrementUnread();

      // Refresh notification list if active
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      
      toast(data.title || 'New Notification', {
        description: data.content,
        action: data.actionLabel ? {
            label: data.actionLabel,
            onClick: () => {
                if (data.link) {
                    window.location.href = data.link; // or router.push
                }
            }
        } : undefined,
      });
    });

    socket.on('notification:read', (data) => {
      console.log('[useSocket] Notification read event received:', data);
      
      if (data && data.id) {
          decrementUnread();
      } else {
          resetUnread();
      }
      
      // Refresh notification list if active
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    socketRef.current = socket;

    return () => {
      console.log('[useSocket] Cleanup: disconnecting socket.');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, accessToken, user, queryClient, incrementUnread, decrementUnread, resetUnread]);

  return socketRef.current;
};
