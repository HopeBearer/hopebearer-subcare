import { FeedbackRepository, FeedbackFilter } from '../repositories/FeedbackRepository';
import { SystemLogRepository } from '../repositories/SystemLogRepository';

export class FeedbackService {
  constructor(
    private feedbackRepository: FeedbackRepository,
    private systemLogRepository: SystemLogRepository,
  ) {}

  /**
   * 获取反馈列表（管理员视角）
   */
  async getAll(filter: FeedbackFilter, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const { items, total } = await this.feedbackRepository.findAll(filter, skip, limit);

    return {
      items: items.map((f) => ({
        id: f.id,
        userId: f.userId,
        type: f.type,
        title: f.title,
        content: f.content,
        status: f.status,
        priority: f.priority,
        adminNote: f.adminNote,
        user: f.user ? { id: f.user.id, email: f.user.email, name: f.user.name } : null,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      })),
      total,
    };
  }

  /**
   * 获取反馈详情
   */
  async getById(id: string) {
    const feedback = await this.feedbackRepository.findById(id);
    if (!feedback) throw new Error('Feedback not found');
    return feedback;
  }

  /**
   * 用户创建反馈
   */
  async create(data: {
    userId: string;
    type: string;
    title: string;
    content: string;
    priority?: string;
  }) {
    const feedback = await this.feedbackRepository.create(data);

    await this.systemLogRepository.create({
      level: 'INFO',
      domain: 'SYSTEM',
      action: 'create_feedback',
      userId: data.userId,
      metadata: { feedbackId: feedback.id, type: data.type, title: data.title },
    });

    return feedback;
  }

  /**
   * 管理员更新反馈（状态、优先级、管理员备注）
   */
  async updateByAdmin(id: string, data: {
    status?: string;
    priority?: string;
    adminNote?: string;
  }, adminUserId?: string) {
    const existing = await this.feedbackRepository.findById(id);
    if (!existing) throw new Error('Feedback not found');

    const updated = await this.feedbackRepository.update(id, data);

    await this.systemLogRepository.create({
      level: 'AUDIT',
      domain: 'SYSTEM',
      action: 'update_feedback',
      userId: adminUserId || null,
      metadata: {
        feedbackId: id,
        changes: data,
        oldStatus: existing.status,
        oldPriority: existing.priority,
      },
    });

    return updated;
  }

  /**
   * 软删除反馈
   */
  async delete(id: string, adminUserId?: string) {
    const existing = await this.feedbackRepository.findById(id);
    if (!existing) throw new Error('Feedback not found');

    await this.feedbackRepository.softDelete(id);

    await this.systemLogRepository.create({
      level: 'AUDIT',
      domain: 'SYSTEM',
      action: 'delete_feedback',
      userId: adminUserId || null,
      metadata: { feedbackId: id, title: existing.title },
    });

    return { deleted: true };
  }

  /**
   * 获取反馈统计
   */
  async getStats() {
    return this.feedbackRepository.getStats();
  }

  /**
   * 获取用户自己的反馈列表
   */
  async getMyFeedbacks(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    return this.feedbackRepository.findByUserId(userId, skip, limit);
  }
}
