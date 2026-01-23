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
}
