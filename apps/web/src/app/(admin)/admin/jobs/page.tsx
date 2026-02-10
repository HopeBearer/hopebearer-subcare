'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  adminService,
  ScheduledJobItem,
  ScheduledJobDetail,
  JobExecutionItem,
} from '@/services';
import {
  Clock,
  Loader2,
  Play,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  ArrowLeft,
  Timer,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function StatusBadge({ status }: { status: string | null }) {
  const config: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
    SUCCESS: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2 },
    FAILED: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
    RUNNING: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Loader2 },
  };
  const c = config[status || ''] || { color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', icon: AlertCircle };
  const Icon = c.icon;

  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium', c.color)}>
      <Icon className={cn('w-3 h-3', status === 'RUNNING' && 'animate-spin')} />
      {status || 'N/A'}
    </span>
  );
}

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<ScheduledJobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<ScheduledJobDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [triggeringJob, setTriggeringJob] = useState<string | null>(null);
  const [togglingJob, setTogglingJob] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const result = await adminService.getScheduledJobs();
      setJobs(result.jobs);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      toast.error('获取任务列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleViewDetail = async (job: ScheduledJobItem) => {
    setDetailLoading(true);
    try {
      const detail = await adminService.getJobDetail(job.id);
      setSelectedJob(detail);
    } catch (error) {
      console.error('Failed to fetch job detail:', error);
      toast.error('获取任务详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleTrigger = async (name: string) => {
    setTriggeringJob(name);
    try {
      const result = await adminService.triggerJob(name);
      if (result.status === 'SUCCESS') {
        toast.success(`任务执行成功 (${result.duration}ms)`);
      } else {
        toast.error(`任务执行失败: ${result.error}`);
      }
      await fetchJobs();
      // Refresh detail if viewing
      if (selectedJob?.name === name) {
        const detail = await adminService.getJobDetail(selectedJob.id);
        setSelectedJob(detail);
      }
    } catch (error) {
      console.error('Trigger failed:', error);
      toast.error('触发任务失败');
    } finally {
      setTriggeringJob(null);
    }
  };

  const handleToggle = async (job: ScheduledJobItem) => {
    setTogglingJob(job.id);
    try {
      await adminService.toggleJob(job.id, !job.isEnabled);
      toast.success(job.isEnabled ? '任务已禁用' : '任务已启用');
      await fetchJobs();
    } catch (error) {
      console.error('Toggle failed:', error);
      toast.error('切换失败');
    } finally {
      setTogglingJob(null);
    }
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Detail View
  if (selectedJob) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedJob(null)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              {selectedJob.displayName}
            </h2>
            <p className="text-sm text-secondary mt-0.5">{selectedJob.description}</p>
          </div>
        </div>

        {/* Job Info Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-surface rounded-xl border border-base p-4">
            <p className="text-xs text-secondary">Cron 表达式</p>
            <code className="text-sm font-mono font-semibold text-gray-900 dark:text-white">{selectedJob.cronExpression}</code>
          </div>
          <div className="bg-surface rounded-xl border border-base p-4">
            <p className="text-xs text-secondary">最后运行</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {selectedJob.lastRunAt ? new Date(selectedJob.lastRunAt).toLocaleString('zh-CN') : '从未运行'}
            </p>
          </div>
          <div className="bg-surface rounded-xl border border-base p-4">
            <p className="text-xs text-secondary">最后状态</p>
            <StatusBadge status={selectedJob.lastRunStatus} />
          </div>
          <div className="bg-surface rounded-xl border border-base p-4">
            <p className="text-xs text-secondary">下次运行</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {selectedJob.nextRunAt ? new Date(selectedJob.nextRunAt).toLocaleString('zh-CN') : '-'}
            </p>
          </div>
        </div>

        {/* Execution History */}
        <div className="bg-surface rounded-2xl border border-base shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-base">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              执行历史 ({selectedJob.executionTotal})
            </h2>
          </div>
          {selectedJob.executions.length === 0 ? (
            <div className="py-12 text-center text-secondary">暂无执行记录</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-base bg-gray-50/50 dark:bg-gray-800/50">
                    <th className="text-left px-6 py-3 font-medium text-secondary">状态</th>
                    <th className="text-left px-6 py-3 font-medium text-secondary">开始时间</th>
                    <th className="text-left px-6 py-3 font-medium text-secondary">耗时</th>
                    <th className="text-left px-6 py-3 font-medium text-secondary">触发方式</th>
                    <th className="text-left px-6 py-3 font-medium text-secondary">错误</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base">
                  {selectedJob.executions.map((exec: JobExecutionItem) => (
                    <tr key={exec.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="px-6 py-3"><StatusBadge status={exec.status} /></td>
                      <td className="px-6 py-3 text-xs">{new Date(exec.startedAt).toLocaleString('zh-CN')}</td>
                      <td className="px-6 py-3 font-mono text-xs">{formatDuration(exec.duration)}</td>
                      <td className="px-6 py-3">
                        <span className={cn(
                          'px-2 py-0.5 rounded text-xs',
                          exec.triggeredBy === 'manual'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        )}>
                          {exec.triggeredBy === 'manual' ? '手动' : '定时'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-xs text-red-500 max-w-xs truncate">{exec.error || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-end">
        <button
          onClick={fetchJobs}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-secondary rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          刷新
        </button>
      </div>

      {/* Jobs Grid */}
      <div className="grid gap-4">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="bg-surface rounded-2xl border border-base shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{job.displayName}</h3>
                  <StatusBadge status={job.lastRunStatus} />
                  {!job.isEnabled && (
                    <span className="px-2 py-0.5 rounded-md text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                      已禁用
                    </span>
                  )}
                </div>
                <p className="text-sm text-secondary mb-3">{job.description}</p>

                <div className="flex flex-wrap gap-4 text-xs text-secondary">
                  <span className="flex items-center gap-1">
                    <Timer className="w-3.5 h-3.5" />
                    Cron: <code className="font-mono">{job.cronExpression}</code>
                  </span>
                  <span>
                    上次: {job.lastRunAt ? new Date(job.lastRunAt).toLocaleString('zh-CN') : '从未运行'}
                  </span>
                  {job.lastRunDuration && (
                    <span>耗时: {formatDuration(job.lastRunDuration)}</span>
                  )}
                  <span>
                    下次: {job.nextRunAt ? new Date(job.nextRunAt).toLocaleString('zh-CN') : '-'}
                  </span>
                  <span>执行次数: {job.executionCount}</span>
                </div>

                {job.lastRunError && (
                  <div className="mt-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/10 rounded-lg p-2 max-w-xl truncate">
                    {job.lastRunError}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 ml-4">
                {job.canTrigger && (
                  <button
                    onClick={() => handleTrigger(job.name)}
                    disabled={triggeringJob === job.name}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {triggeringJob === job.name ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                    立即执行
                  </button>
                )}
                <button
                  onClick={() => handleToggle(job)}
                  disabled={togglingJob === job.id}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                  title={job.isEnabled ? '禁用' : '启用'}
                >
                  {togglingJob === job.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : job.isEnabled ? (
                    <ToggleRight className="w-5 h-5 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                <button
                  onClick={() => handleViewDetail(job)}
                  disabled={detailLoading}
                  className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {jobs.length === 0 && (
          <div className="bg-surface rounded-2xl border border-base p-16 text-center text-secondary">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>暂无注册的定时任务</p>
          </div>
        )}
      </div>
    </div>
  );
}
