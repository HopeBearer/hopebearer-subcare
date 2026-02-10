'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminService, ExchangeRateData, ExchangeRateItem } from '@/services';
import {
  RefreshCw,
  Loader2,
  Pencil,
  Save,
  X,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function AdminExchangeRatesPage() {
  const [data, setData] = useState<ExchangeRateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const result = await adminService.getExchangeRates();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error);
      toast.error('获取汇率数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await adminService.syncExchangeRates();
      setData(result);
      toast.success('汇率同步成功');
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error('同步失败');
    } finally {
      setSyncing(false);
    }
  };

  const handleEdit = (item: ExchangeRateItem) => {
    setEditingId(item.id);
    setEditRate(String(item.rate));
  };

  const handleSave = async (id: string) => {
    const numRate = Number(editRate);
    if (isNaN(numRate) || numRate <= 0) {
      toast.error('请输入有效的汇率');
      return;
    }
    setSaving(true);
    try {
      await adminService.updateExchangeRate(id, numRate);
      setEditingId(null);
      await fetchData();
      toast.success('汇率已更新');
    } catch (error) {
      console.error('Update failed:', error);
      toast.error('更新失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        {data?.lastUpdated && (
          <p className="text-sm text-secondary flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            最后更新: {new Date(data.lastUpdated).toLocaleString('zh-CN')}
          </p>
        )}
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('w-4 h-4', syncing && 'animate-spin')} />
          {syncing ? '同步中...' : '同步汇率'}
        </button>
      </div>

      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          汇率数据来源于 Fixer.io，基准货币为 <strong>EUR</strong>（欧元）。系统每日 01:00 UTC 自动同步。
          共 <strong>{data?.total || 0}</strong> 种货币。
        </p>
      </div>

      {/* Rates Table */}
      <div className="bg-surface rounded-2xl border border-base shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base bg-gray-50/50 dark:bg-gray-800/50">
                <th className="text-left px-6 py-3 font-medium text-secondary">货币代码</th>
                <th className="text-right px-6 py-3 font-medium text-secondary">汇率 (1 EUR =)</th>
                <th className="text-left px-6 py-3 font-medium text-secondary">基准</th>
                <th className="text-left px-6 py-3 font-medium text-secondary">更新时间</th>
                <th className="text-right px-6 py-3 font-medium text-secondary">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base">
              {data?.rates.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-3">
                    <span className="font-mono font-semibold text-gray-900 dark:text-white">
                      {item.currency}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    {editingId === item.id ? (
                      <input
                        type="number"
                        step="any"
                        value={editRate}
                        onChange={(e) => setEditRate(e.target.value)}
                        className="w-40 px-3 py-1 text-right border border-primary rounded-lg bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSave(item.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                    ) : (
                      <span className="font-mono text-gray-700 dark:text-gray-300">
                        {item.rate.toFixed(item.rate < 1 ? 6 : 4)}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-secondary">{item.base}</td>
                  <td className="px-6 py-3 text-secondary text-xs">
                    {new Date(item.updatedAt).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-6 py-3 text-right">
                    {editingId === item.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleSave(item.id)}
                          disabled={saving}
                          className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
