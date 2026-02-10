'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminService, AdminUserDetail } from '@/services';
import {
  Users,
  Search,
  Shield,
  ShieldCheck,
  UserX,
  Trash2,
  Eye,
  Loader2,
  X,
  CreditCard,
  Bell,
  Bot,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select } from '@/components/ui/select';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminService.getUsers();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleViewDetail = async (userId: string) => {
    try {
      setDetailLoading(true);
      const detail = await adminService.getUserDetail(userId);
      setSelectedUser(detail);
    } catch (error) {
      console.error('Failed to fetch user detail:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!confirm(`确定要将此用户角色更改为 ${newRole} 吗？`)) return;

    try {
      setActionLoading(userId);
      await adminService.changeUserRole(userId, newRole);
      await fetchUsers();
      if (selectedUser?.id === userId) {
        const detail = await adminService.getUserDetail(userId);
        setSelectedUser(detail);
      }
    } catch (error) {
      console.error('Failed to change role:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisableUser = async (userId: string) => {
    if (!confirm('确定要禁用此用户吗？')) return;

    try {
      setActionLoading(userId);
      await adminService.disableUser(userId);
      await fetchUsers();
    } catch (error) {
      console.error('Failed to disable user:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('⚠️ 此操作不可撤销！确定要删除此用户及其所有数据吗？')) return;

    try {
      setActionLoading(userId);
      await adminService.deleteUser(userId);
      if (selectedUser?.id === userId) {
        setSelectedUser(null);
      }
      await fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // Filter users
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      !search ||
      user.email?.toLowerCase().includes(search.toLowerCase()) ||
      user.name?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索邮箱或姓名..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-base rounded-xl bg-surface text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="w-36">
          <Select
            value={roleFilter}
            onChange={(value) => setRoleFilter(value)}
            options={[
              { label: '全部角色', value: 'ALL' },
              { label: '普通用户', value: 'USER' },
              { label: '管理员', value: 'ADMIN' },
            ]}
          />
        </div>
        <span className="text-sm text-secondary">
          共 {filteredUsers.length} 位用户
        </span>
      </div>

      <div className="flex gap-6">
        {/* User Table */}
        <div className="flex-1 bg-surface rounded-2xl border border-base shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-4 py-3 font-medium text-secondary">用户</th>
                <th className="text-left px-4 py-3 font-medium text-secondary">角色</th>
                <th className="text-left px-4 py-3 font-medium text-secondary">状态</th>
                <th className="text-left px-4 py-3 font-medium text-secondary">注册时间</th>
                <th className="text-right px-4 py-3 font-medium text-secondary">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className={cn(
                    'border-b border-base last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors',
                    selectedUser?.id === user.id && 'bg-primary/5'
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                        {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {user.name || '未设置'}
                        </p>
                        <p className="text-xs text-secondary truncate">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                        user.role === 'ADMIN'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      )}
                    >
                      {user.role === 'ADMIN' ? (
                        <ShieldCheck className="w-3 h-3" />
                      ) : (
                        <Shield className="w-3 h-3" />
                      )}
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-block w-2 h-2 rounded-full',
                        user.isActive ? 'bg-green-500' : 'bg-red-400'
                      )}
                    />
                    <span className="ml-1.5 text-xs text-secondary">
                      {user.isActive ? '活跃' : '已禁用'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-secondary">
                    {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleViewDetail(user.id)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-primary transition-colors"
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          handleRoleChange(user.id, user.role === 'ADMIN' ? 'USER' : 'ADMIN')
                        }
                        disabled={actionLoading === user.id}
                        className="p-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-400 hover:text-purple-600 transition-colors disabled:opacity-50"
                        title={user.role === 'ADMIN' ? '降为用户' : '升为管理员'}
                      >
                        {actionLoading === user.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDisableUser(user.id)}
                        disabled={actionLoading === user.id}
                        className="p-1.5 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-gray-400 hover:text-yellow-600 transition-colors disabled:opacity-50"
                        title="禁用用户"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={actionLoading === user.id}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                        title="删除用户"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-secondary">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>没有找到符合条件的用户</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* User Detail Panel */}
        {selectedUser && (
          <div className="w-80 bg-surface rounded-2xl border border-base shadow-sm p-5 h-fit sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">用户详情</h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Basic Info */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {selectedUser.name?.[0]?.toUpperCase() || selectedUser.email?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedUser.name || '未设置'}
                    </p>
                    <p className="text-xs text-secondary">{selectedUser.email}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
                    <CreditCard className="w-4 h-4 text-primary mx-auto mb-1" />
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {selectedUser._count?.subscriptions || 0}
                    </p>
                    <p className="text-xs text-secondary">订阅数</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
                    <CreditCard className="w-4 h-4 text-green-500 mx-auto mb-1" />
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {selectedUser._count?.paymentRecords || 0}
                    </p>
                    <p className="text-xs text-secondary">支付记录</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
                    <Bell className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {selectedUser._count?.notifications || 0}
                    </p>
                    <p className="text-xs text-secondary">通知数</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
                    <Bot className="w-4 h-4 text-purple-500 mx-auto mb-1" />
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {selectedUser._count?.aiConfigs || 0}
                    </p>
                    <p className="text-xs text-secondary">AI 配置</p>
                  </div>
                </div>

                {/* Subscriptions Preview */}
                {selectedUser.subscriptions && selectedUser.subscriptions.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-secondary mb-2">
                      订阅列表 ({selectedUser.subscriptions.length})
                    </h4>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {selectedUser.subscriptions.slice(0, 5).map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-gray-50 dark:bg-gray-800/30"
                        >
                          <span className="text-xs text-gray-900 dark:text-white truncate flex-1">
                            {sub.name}
                          </span>
                          <span
                            className={cn(
                              'text-xs px-1.5 py-0.5 rounded-full ml-2',
                              sub.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                            )}
                          >
                            {sub.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Info Details */}
                <div className="text-xs space-y-2 pt-2 border-t border-base">
                  <div className="flex justify-between">
                    <span className="text-secondary">角色</span>
                    <span className="text-gray-900 dark:text-white font-medium">{selectedUser.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">货币</span>
                    <span className="text-gray-900 dark:text-white">{selectedUser.currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">月预算</span>
                    <span className="text-gray-900 dark:text-white">{selectedUser.monthlyBudget}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">注册时间</span>
                    <span className="text-gray-900 dark:text-white">
                      {new Date(selectedUser.createdAt).toLocaleString('zh-CN')}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
