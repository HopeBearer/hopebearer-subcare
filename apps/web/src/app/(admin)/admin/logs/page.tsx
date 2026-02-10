'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminService, SystemLogItem, SystemLogFilters } from '@/services';
import {
  ScrollText,
  Search,
  Eye,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  Info,
  Bug,
  Shield,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Select } from '@/components/ui/select';

const levelColors: Record<string, { bg: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
  ERROR: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', icon: AlertCircle },
  WARN: { bg: 'bg-yellow-100 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-300', icon: AlertTriangle },
  INFO: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', icon: Info },
  DEBUG: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', icon: Bug },
  AUDIT: { bg: 'bg-purple-100 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', icon: Shield },
};

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<SystemLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<SystemLogItem | null>(null);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState<SystemLogFilters>({
    page: 1,
    limit: 20,
  });

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminService.getLogs(filters);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / (filters.limit || 20));
  const currentPage = filters.page || 1;

  const handleExport = async () => {
    try {
      setExporting(true);
      await adminService.exportLogs(filters);
      toast.success('日志导出成功');
    } catch (error) {
      console.error('Failed to export logs:', error);
      toast.error('日志导出失败');
    } finally {
      setExporting(false);
    }
  };

  const handleFilterChange = (key: keyof SystemLogFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
      page: 1, // Reset page on filter change
    }));
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-36">
          <Select
            value={filters.level || ''}
            onChange={(value) => handleFilterChange('level', value)}
            placeholder="全部级别"
            options={[
              { label: '全部级别', value: '' },
              { label: 'ERROR', value: 'ERROR' },
              { label: 'WARN', value: 'WARN' },
              { label: 'INFO', value: 'INFO' },
              { label: 'DEBUG', value: 'DEBUG' },
              { label: 'AUDIT', value: 'AUDIT' },
            ]}
          />
        </div>
        <div className="w-44">
          <Select
            value={filters.domain || ''}
            onChange={(value) => handleFilterChange('domain', value)}
            placeholder="全部域"
            options={[
              { label: '全部域', value: '' },
              { label: 'AUTH', value: 'AUTH' },
              { label: 'API', value: 'API' },
              { label: 'EMAIL', value: 'EMAIL' },
              { label: 'NOTIFICATION', value: 'NOTIFICATION' },
              { label: 'PAYMENT', value: 'PAYMENT' },
              { label: 'SYSTEM', value: 'SYSTEM' },
            ]}
          />
        </div>
        <input
          type="date"
          value={filters.startDate || ''}
          onChange={(e) => handleFilterChange('startDate', e.target.value)}
          className="px-3 py-2 text-sm border border-base rounded-xl bg-surface text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="开始日期"
        />
        <input
          type="date"
          value={filters.endDate || ''}
          onChange={(e) => handleFilterChange('endDate', e.target.value)}
          className="px-3 py-2 text-sm border border-base rounded-xl bg-surface text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="结束日期"
        />
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm text-secondary">共 {total} 条记录</span>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            导出 CSV
          </button>
        </div>
      </div>

      {/* Log Table */}
      <div className="bg-surface rounded-2xl border border-base shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-4 py-3 font-medium text-secondary w-24">级别</th>
                <th className="text-left px-4 py-3 font-medium text-secondary w-28">域</th>
                <th className="text-left px-4 py-3 font-medium text-secondary">动作</th>
                <th className="text-left px-4 py-3 font-medium text-secondary w-36">用户</th>
                <th className="text-left px-4 py-3 font-medium text-secondary w-40">时间</th>
                <th className="text-right px-4 py-3 font-medium text-secondary w-16">详情</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const levelStyle = levelColors[log.level] || levelColors.INFO;
                const LevelIcon = levelStyle.icon;

                return (
                  <tr
                    key={log.id}
                    className={cn(
                      'border-b border-base last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer',
                      selectedLog?.id === log.id && 'bg-primary/5'
                    )}
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                          levelStyle.bg,
                          levelStyle.text
                        )}
                      >
                        <LevelIcon className="w-3 h-3" />
                        {log.level}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-secondary">{log.domain}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-900 dark:text-white text-xs">{log.action}</span>
                      {log.error && (
                        <p className="text-xs text-red-500 truncate max-w-xs mt-0.5">{log.error}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {log.user ? (
                        <div className="min-w-0">
                          <p className="text-xs text-gray-900 dark:text-white truncate">{log.user.name || '-'}</p>
                          <p className="text-xs text-secondary truncate">{log.user.email}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-secondary">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-secondary">
                      {new Date(log.createdAt).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-primary transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-secondary">
                    <ScrollText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>没有找到日志记录</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-base">
            <span className="text-xs text-secondary">
              第 {currentPage} / {totalPages} 页
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, currentPage - 1) }))}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setFilters((prev) => ({ ...prev, page: Math.min(totalPages, currentPage + 1) }))}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setSelectedLog(null)}>
          <div className="bg-surface rounded-2xl border border-base shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-base">
              <h3 className="font-semibold text-gray-900 dark:text-white">日志详情</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-60px)] space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-secondary mb-1">ID</p>
                  <p className="text-sm font-mono text-gray-900 dark:text-white break-all">{selectedLog.id}</p>
                </div>
                <div>
                  <p className="text-xs text-secondary mb-1">级别</p>
                  <span className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                    levelColors[selectedLog.level]?.bg,
                    levelColors[selectedLog.level]?.text
                  )}>
                    {selectedLog.level}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-secondary mb-1">域</p>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedLog.domain}</p>
                </div>
                <div>
                  <p className="text-xs text-secondary mb-1">动作</p>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedLog.action}</p>
                </div>
                <div>
                  <p className="text-xs text-secondary mb-1">用户</p>
                  {selectedLog.user ? (
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white">{selectedLog.user.name || '-'}</p>
                      <p className="text-xs text-secondary">{selectedLog.user.email}</p>
                    </div>
                  ) : (
                    <p className="text-sm font-mono text-gray-900 dark:text-white">{selectedLog.userId || '-'}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-secondary mb-1">IP</p>
                  <p className="text-sm font-mono text-gray-900 dark:text-white">{selectedLog.ip || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-secondary mb-1">请求 ID</p>
                  <p className="text-sm font-mono text-gray-900 dark:text-white break-all">{selectedLog.requestId || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-secondary mb-1">时间</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {new Date(selectedLog.createdAt).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>

              {/* Error */}
              {selectedLog.error && (
                <div>
                  <p className="text-xs text-secondary mb-1">错误信息</p>
                  <pre className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-3 text-xs text-red-700 dark:text-red-300 overflow-x-auto whitespace-pre-wrap break-all">
                    {selectedLog.error}
                  </pre>
                </div>
              )}

              {/* Metadata JSON */}
              {selectedLog.metadata && (
                <div>
                  <p className="text-xs text-secondary mb-1">Metadata</p>
                  <pre className="bg-gray-50 dark:bg-gray-800 border border-base rounded-xl p-3 text-xs text-gray-700 dark:text-gray-300 overflow-x-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
