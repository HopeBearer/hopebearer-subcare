import { logger } from '../infrastructure/logger/logger';

export interface AIProgressEvent {
  stage: 'started' | 'tool_call' | 'tool_result' | 'generating' | 'completed' | 'error';
  messageKey: string;
  toolName?: string;
  loop?: number;
  data?: unknown;
}

export type AITaskStatus = 'idle' | 'running' | 'completed' | 'error';

export interface AITask {
  userId: string;
  status: AITaskStatus;
  progress: AIProgressEvent | null;
  result: unknown | null;
  error: { code: string; message: string } | null;
  startedAt: Date;
  completedAt?: Date;
}

export interface AITaskStatusResponse {
  status: AITaskStatus;
  progress?: AIProgressEvent | null;
  data?: unknown;
  error?: { code: string; message: string } | null;
  /** Previously cached recommendation data (from DB), attached when status is 'running' or 'idle' */
  cachedData?: unknown;
}

/**
 * In-memory task state manager for AI recommendation analysis.
 * Tracks per-user running/completed/error tasks so that:
 * - Duplicate requests are prevented while a task is running
 * - Frontend can query status on reconnect/remount
 * - Results are held until the daily cache takes over
 */
export class AITaskManager {
  private tasks: Map<string, AITask> = new Map();

  /** Auto-cleanup interval (remove stale completed tasks) */
  private cleanupTimer: ReturnType<typeof setInterval>;
  private static readonly STALE_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours
  private static readonly RUNNING_TIMEOUT_MS = 10 * 60 * 1000;   // 10 min safety limit

  constructor() {
    // Periodically clean up stale tasks to prevent memory leak
    this.cleanupTimer = setInterval(() => this.cleanupStale(), 30 * 60 * 1000);
  }

  /**
   * Get current task for a user
   */
  getTask(userId: string): AITask | null {
    const task = this.tasks.get(userId);
    if (!task) return null;

    // If task has been "running" for too long, treat it as failed
    if (task.status === 'running') {
      const elapsed = Date.now() - task.startedAt.getTime();
      if (elapsed > AITaskManager.RUNNING_TIMEOUT_MS) {
        logger.warn({
          domain: 'AI_TASK',
          action: 'timeout',
          userId,
          metadata: { elapsedMs: elapsed }
        });
        this.failTask(userId, { code: 'TIMEOUT', message: 'Analysis timed out' });
        return this.tasks.get(userId) || null;
      }
    }

    return task;
  }

  /**
   * Get task status response (safe for sending to client)
   */
  getStatusResponse(userId: string): AITaskStatusResponse {
    const task = this.getTask(userId);

    if (!task || task.status === 'idle') {
      return { status: 'idle' };
    }

    if (task.status === 'running') {
      return {
        status: 'running',
        progress: task.progress
      };
    }

    if (task.status === 'completed') {
      return {
        status: 'completed',
        data: task.result
      };
    }

    // error
    return {
      status: 'error',
      error: task.error
    };
  }

  /**
   * Check if a task is currently running for a user
   */
  isRunning(userId: string): boolean {
    const task = this.getTask(userId);
    return task?.status === 'running' || false;
  }

  /**
   * Mark task as started (running)
   */
  startTask(userId: string): void {
    this.tasks.set(userId, {
      userId,
      status: 'running',
      progress: { stage: 'started', messageKey: 'ai.progress.preparing' },
      result: null,
      error: null,
      startedAt: new Date()
    });

    logger.info({
      domain: 'AI_TASK',
      action: 'start',
      userId
    });
  }

  /**
   * Update the current progress of a running task
   */
  updateProgress(userId: string, progress: AIProgressEvent): void {
    const task = this.tasks.get(userId);
    if (task && task.status === 'running') {
      task.progress = progress;
    }
  }

  /**
   * Mark task as completed with result
   */
  completeTask(userId: string, result: unknown): void {
    this.tasks.set(userId, {
      userId,
      status: 'completed',
      progress: null,
      result,
      error: null,
      startedAt: this.tasks.get(userId)?.startedAt || new Date(),
      completedAt: new Date()
    });

    logger.info({
      domain: 'AI_TASK',
      action: 'complete',
      userId
    });
  }

  /**
   * Mark task as failed
   */
  failTask(userId: string, error: { code: string; message: string }): void {
    const existing = this.tasks.get(userId);
    this.tasks.set(userId, {
      userId,
      status: 'error',
      progress: null,
      result: null,
      error,
      startedAt: existing?.startedAt || new Date(),
      completedAt: new Date()
    });

    logger.warn({
      domain: 'AI_TASK',
      action: 'fail',
      userId,
      metadata: { error }
    });
  }

  /**
   * Remove stale tasks (completed/error older than threshold)
   */
  private cleanupStale(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [userId, task] of this.tasks.entries()) {
      if (task.status === 'completed' || task.status === 'error') {
        const completedAt = task.completedAt?.getTime() || task.startedAt.getTime();
        if (now - completedAt > AITaskManager.STALE_TIMEOUT_MS) {
          this.tasks.delete(userId);
          cleaned++;
        }
      }
    }

    if (cleaned > 0) {
      logger.debug({
        domain: 'AI_TASK',
        action: 'cleanup',
        metadata: { cleaned, remaining: this.tasks.size }
      });
    }
  }

  /**
   * Destroy the manager (cleanup timers)
   */
  destroy(): void {
    clearInterval(this.cleanupTimer);
    this.tasks.clear();
  }
}
