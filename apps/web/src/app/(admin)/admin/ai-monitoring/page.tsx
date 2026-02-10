'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  adminService,
  AdminAIChatStats,
  AdminConversationListResult,
  AdminUserAIConfigStats,
} from '@/services';
import {
  MessageSquare,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Bot,
  Users,
  Zap,
  MessagesSquare,
  Activity,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function StatCard({ title, value, subtitle, icon: Icon, color, bgColor }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="bg-surface rounded-2xl border border-base p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-secondary font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {subtitle && <p className="text-xs text-secondary mt-1">{subtitle}</p>}
        </div>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', bgColor)}>
          <Icon className={cn('w-5 h-5', color)} />
        </div>
      </div>
    </div>
  );
}

const ROLE_LABELS: Record<string, string> = {
  user: '用户消息',
  assistant: 'AI 回复',
  system: '系统消息',
  tool: '工具调用',
};

export default function AdminAIMonitoringPage() {
  const [chatStats, setChatStats] = useState<AdminAIChatStats | null>(null);
  const [configStats, setConfigStats] = useState<AdminUserAIConfigStats | null>(null);
  const [conversations, setConversations] = useState<AdminConversationListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [convLoading, setConvLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const [chat, config] = await Promise.all([
        adminService.getAIChatStats(),
        adminService.getUserAIConfigStats(),
      ]);
      setChatStats(chat);
      setConfigStats(config);
    } catch (error) {
      console.error('Failed to fetch AI stats:', error);
    }
  }, []);

  const fetchConversations = useCallback(async () => {
    setConvLoading(true);
    try {
      const data = await adminService.getAdminConversations({ page, limit: 15 });
      setConversations(data);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setConvLoading(false);
    }
  }, [page]);

  useEffect(() => {
    Promise.all([fetchStats(), fetchConversations()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const totalPages = conversations ? Math.ceil(conversations.total / 15) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-primary" />
        AI 对话监控
      </h1>

      {/* Chat Stats */}
      {chatStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="总对话数"
            value={chatStats.totalConversations.toLocaleString()}
            subtitle={`24h 新增 ${chatStats.conversationsLast24h}`}
            icon={MessagesSquare}
            color="text-blue-600"
            bgColor="bg-blue-50 dark:bg-blue-900/20"
          />
          <StatCard
            title="总消息数"
            value={chatStats.totalMessages.toLocaleString()}
            subtitle={`24h 新增 ${chatStats.messagesLast24h}`}
            icon={MessageSquare}
            color="text-green-600"
            bgColor="bg-green-50 dark:bg-green-900/20"
          />
          <StatCard
            title="7日活跃用户"
            value={chatStats.activeUsersLast7d}
            subtitle={`7日对话 ${chatStats.conversationsLast7d}`}
            icon={Users}
            color="text-purple-600"
            bgColor="bg-purple-50 dark:bg-purple-900/20"
          />
          <StatCard
            title="Token 消耗"
            value={chatStats.tokens.total.toLocaleString()}
            subtitle={`平均 ${chatStats.tokens.avgPerMessage}/消息`}
            icon={Zap}
            color="text-amber-600"
            bgColor="bg-amber-50 dark:bg-amber-900/20"
          />
        </div>
      )}

      {/* Two-Column: Message Role Distribution + User AI Config */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Message Role Distribution */}
        {chatStats && (
          <div className="bg-surface rounded-2xl border border-base p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              消息角色分布
            </h3>
            <div className="space-y-3">
              {chatStats.roleDistribution.map((item) => {
                const total = chatStats.roleDistribution.reduce((a, b) => a + b.count, 0);
                const pct = total > 0 ? ((item.count / total) * 100).toFixed(1) : '0';
                return (
                  <div key={item.role}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {ROLE_LABELS[item.role] || item.role}
                      </span>
                      <span className="text-sm font-mono text-gray-500">
                        {item.count.toLocaleString()} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/70 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* User AI Config Stats */}
        {configStats && (
          <div className="bg-surface rounded-2xl border border-base p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" />
              用户 AI 配置分布
            </h3>
            <div className="flex gap-6 mb-4">
              <div>
                <p className="text-xs text-secondary">总配置数</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{configStats.totalConfigs}</p>
              </div>
              <div>
                <p className="text-xs text-secondary">活跃配置</p>
                <p className="text-xl font-bold text-green-600">{configStats.activeConfigs}</p>
              </div>
            </div>
            <div className="space-y-3">
              {configStats.providerDistribution.map((item) => {
                const pct = configStats.totalConfigs > 0
                  ? ((item.count / configStats.totalConfigs) * 100).toFixed(1)
                  : '0';
                return (
                  <div key={item.provider}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                        {item.provider}
                      </span>
                      <span className="text-sm font-mono text-gray-500">
                        {item.count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500/70 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {configStats.providerDistribution.length === 0 && (
                <p className="text-sm text-secondary text-center py-4">暂无配置数据</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Conversations List */}
      <div className="bg-surface rounded-2xl border border-base shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-base">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            最近对话列表
          </h3>
        </div>

        {convLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-base bg-gray-50/50 dark:bg-gray-800/50">
                    <th className="text-left px-6 py-3 font-medium text-secondary">对话标题</th>
                    <th className="text-left px-6 py-3 font-medium text-secondary">用户</th>
                    <th className="text-left px-6 py-3 font-medium text-secondary">模型</th>
                    <th className="text-right px-6 py-3 font-medium text-secondary">消息数</th>
                    <th className="text-left px-6 py-3 font-medium text-secondary">最后更新</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base">
                  {conversations?.items.map((conv) => (
                    <tr key={conv.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-6 py-3">
                        <p className="font-medium text-gray-900 dark:text-white text-sm truncate max-w-xs">
                          {conv.title}
                        </p>
                      </td>
                      <td className="px-6 py-3 text-sm text-secondary">
                        {conv.user?.name || conv.user?.email || '-'}
                      </td>
                      <td className="px-6 py-3">
                        {conv.model ? (
                          <span className="text-xs font-mono px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-md text-gray-600 dark:text-gray-400">
                            {conv.model}
                          </span>
                        ) : (
                          <span className="text-xs text-secondary">默认</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-gray-700 dark:text-gray-300">
                        {conv.messageCount}
                      </td>
                      <td className="px-6 py-3 text-xs text-secondary whitespace-nowrap">
                        {new Date(conv.updatedAt).toLocaleString('zh-CN')}
                      </td>
                    </tr>
                  ))}
                  {(!conversations || conversations.items.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-secondary">
                        暂无对话数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {conversations && conversations.total > 0 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-base">
                <p className="text-sm text-secondary">共 {conversations.total} 条</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-secondary">{page} / {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
