import { useEffect, useSyncExternalStore } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore, useNotificationStore } from '@/store';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

// ============ 全局唯一 socket（使用 globalThis 防止 Next.js HMR 重复创建）============
const SOCKET_KEY = Symbol.for('__subcare_socket__');
const SOCKET_USER_KEY = Symbol.for('__subcare_socket_user__');

function getGlobalSocket(): Socket | null {
  return (globalThis as any)[SOCKET_KEY] || null;
}
function setGlobalSocket(s: Socket | null) {
  (globalThis as any)[SOCKET_KEY] = s;
}
function getGlobalSocketUserId(): string | null {
  return (globalThis as any)[SOCKET_USER_KEY] || null;
}
function setGlobalSocketUserId(id: string | null) {
  (globalThis as any)[SOCKET_USER_KEY] = id;
}

// ============ 订阅机制：让所有组件响应式获取 socket 变化 ============
const subscribers = new Set<() => void>();

function emitChange() {
  subscribers.forEach(cb => cb());
}

function subscribe(callback: () => void) {
  subscribers.add(callback);
  return () => { subscribers.delete(callback); };
}

function getSnapshot(): Socket | null {
  return getGlobalSocket();
}

function getServerSnapshot(): Socket | null {
  return null; // SSR 时不存在 socket
}

// ============ 公开 API ============

/**
 * 纯读取 hook：获取当前全局 socket
 * 不负责创建 socket，仅订阅 socket 状态变化
 * 可在任意组件中调用，不会产生额外连接
 */
export function useSocket(): Socket | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * 初始化 hook：创建并管理全局唯一 socket 连接 + 注册通知事件
 * ⚠️ 仅在应用最顶层（Layout）调用一次
 */
export function useSocketInit() {
  const { user, accessToken, isAuthenticated } = useAuthStore();
  const { incrementUnread, decrementUnread, resetUnread, consumeLocalRead } = useNotificationStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    // 未登录 → 断开已有连接
    if (!isAuthenticated || !accessToken || !user) {
      const existing = getGlobalSocket();
      if (existing) {
        console.log('[Socket] Disconnecting (not authenticated).');
        existing.disconnect();
        setGlobalSocket(null);
        setGlobalSocketUserId(null);
        emitChange();
      }
      return;
    }

    // 已有相同用户的连接 → 跳过
    const existing = getGlobalSocket();
    if (existing && getGlobalSocketUserId() === user.id && existing.connected) {
      console.log('[Socket] Already connected, skipping.');
      return;
    }

    // 如果用户切换，先断开旧连接
    if (existing) {
      console.log('[Socket] Disconnecting stale socket for user switch.');
      existing.disconnect();
      setGlobalSocket(null);
      setGlobalSocketUserId(null);
    }

    // 创建唯一 socket
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || '';
    console.log('[Socket] Creating global socket →', socketUrl || '(current origin)');

    const newSocket = io(socketUrl, {
      path: '/socket.io',
      auth: { token: accessToken },
      query: { userId: user.id },
      transports: ['polling', 'websocket'],  // polling first → 更可靠；连接后自动 upgrade 到 websocket
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    newSocket.on('connect', () => {
      console.log('[Socket] Connected. ID:', newSocket.id);
      setGlobalSocket(newSocket);
      setGlobalSocketUserId(user.id);
      emitChange(); // 通知所有 useSocket() 消费者
    });

    newSocket.on('connect_error', (err) => {
      if (err.message?.includes('Authentication error') || err.message?.includes('Invalid token')) {
        return;
      }
      console.error('[Socket] Connection error:', err);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    // ---- 通知事件（全局只注册一次）----
    newSocket.on('notification:new', (data) => {
      console.log('[Socket] notification:new', data);
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
      console.log('[Socket] notification:read', data);
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

    // cleanup: 组件卸载时不断开（Layout 不会卸载），登出通过 isAuthenticated 处理
    return () => {};
  }, [isAuthenticated, accessToken, user, queryClient, incrementUnread, decrementUnread, resetUnread, consumeLocalRead]);
}
