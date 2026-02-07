import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore, useNotificationStore } from '@/store';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

// 全局 socket 实例，保持单例
let globalSocket: Socket | null = null;
let globalSocketUserId: string | null = null;

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(globalSocket);
  const { user, accessToken, isAuthenticated } = useAuthStore();
  const { incrementUnread, decrementUnread, resetUnread, consumeLocalRead } = useNotificationStore();
  const queryClient = useQueryClient();
  const isInitializing = useRef(false);

  useEffect(() => {
    // Only connect if authenticated
    if (!isAuthenticated || !accessToken || !user) {
      console.log('[useSocket] Not authenticated, skipping connection.');
      if (globalSocket) {
        console.log('[useSocket] Disconnecting existing socket.');
        globalSocket.disconnect();
        globalSocket = null;
        globalSocketUserId = null;
        setSocket(null);
      }
      return;
    }

    // 如果已有相同用户的连接，复用它
    if (globalSocket && globalSocketUserId === user.id && globalSocket.connected) {
      console.log('[useSocket] Reusing existing socket connection.');
      setSocket(globalSocket);
      return;
    }

    // 防止重复初始化
    if (isInitializing.current) {
      return;
    }
    isInitializing.current = true;

    console.log('[useSocket] Attempting to connect to socket...');

    // Socket URL is configured via NEXT_PUBLIC_SOCKET_URL environment variable
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || '';
    console.log('[useSocket] Connecting to:', socketUrl || '(current origin)');

    const newSocket = io(socketUrl, {
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

    newSocket.on('connect', () => {
      console.log('[useSocket] Socket connected successfully. ID:', newSocket.id);
      globalSocket = newSocket;
      globalSocketUserId = user.id;
      setSocket(newSocket);
      isInitializing.current = false;
    });

    newSocket.on('connect_error', (err) => {
      isInitializing.current = false;
      if (err.message && (err.message.includes('Authentication error') || err.message.includes('Invalid token'))) {
        return;
      }
      console.error('[useSocket] Socket connection error:', err);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[useSocket] Socket disconnected:', reason);
      // 不立即清除 globalSocket，让重连逻辑有机会恢复
    });

    newSocket.on('notification:new', (data) => {
      console.log('[useSocket] New Notification received:', data);
      incrementUnread();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast(data.title || 'New Notification', {
        description: data.content,
        action: data.actionLabel ? {
          label: data.actionLabel,
          onClick: () => {
            if (data.link) {
              window.location.href = data.link;
            }
          }
        } : undefined,
      });
    });

    newSocket.on('notification:read', (data) => {
      console.log('[useSocket] Notification read event received:', data);
      if (data && data.id) {
        const handledLocally = consumeLocalRead(data.id);
        if (!handledLocally) {
          decrementUnread();
        }
      } else {
        resetUnread();
      }
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    // 不在 cleanup 中断开连接，保持全局连接
    return () => {
      // 只有在用户登出时才断开（通过 isAuthenticated 判断）
    };
  }, [isAuthenticated, accessToken, user, queryClient, incrementUnread, decrementUnread, resetUnread]);

  return socket;
};
