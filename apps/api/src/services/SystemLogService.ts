import { SystemLogRepository, SystemLogFilter } from "../repositories/SystemLogRepository";

export class SystemLogService {
  constructor(private systemLogRepository: SystemLogRepository) {}

  async getLogs(filter: SystemLogFilter, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    return this.systemLogRepository.findAll(filter, skip, limit);
  }

  async getLogById(id: string) {
    return this.systemLogRepository.findById(id);
  }

  /**
   * 导出日志为 CSV 格式
   */
  async exportLogs(filter: SystemLogFilter, maxRows: number = 5000): Promise<string> {
    const { items } = await this.systemLogRepository.findAll(filter, 0, maxRows);

    const headers = ['ID', 'Level', 'Domain', 'Action', 'UserID', 'IP', 'RequestID', 'Error', 'CreatedAt'];
    const rows = items.map((log) => [
      log.id,
      log.level,
      log.domain,
      log.action,
      log.userId || '',
      log.ip || '',
      log.requestId || '',
      (log.error || '').replace(/"/g, '""'),
      log.createdAt.toISOString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  }
}
