import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore, useNotificationStore } from '@/store'; 
import { toast } from 'sonner';

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const { user, accessToken, isAuthenticated } = useAuthStore();
  const { incrementUnread } = useNotificationStore();

  useEffect(() => {
    // Only connect if authenticated
    if (!isAuthenticated || !accessToken || !user) {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        return;
    }

    // Connect via proxy path
    // The relative path '/' with path option '/socket.io' will 
    // be intercepted by Next.js rewrite rule -> http://localhost:3001/socket.io
    const socket = io({
      path: '/socket.io',
      auth: {
        token: accessToken,
      },
      query: {
        userId: user.id
      },
      transports: ['websocket'], // Prefer WebSocket
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('Socket connected', socket.id);
    });

    socket.on('connect_error', (err) => {
        console.warn('Socket connect error', err.message);
    });

    socket.on('notification:new', (data) => {
      console.log('New Notification:', data);
      
      // Update store
      incrementUnread();

      // Show toast
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

      // TODO: Invalidate query or update store for unread count
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, accessToken, user]);

  return socketRef.current;
};
