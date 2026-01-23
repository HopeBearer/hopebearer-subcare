import { prisma } from '@subcare/database';

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'AUDIT';

interface LogPayload {
  level: LogLevel;
  domain: string;
  action: string;
  userId?: string;
  ip?: string;
  requestId?: string;
  metadata?: any;
  error?: any;
}

export const logger = {
  log(payload: LogPayload) {
    // Fire and forget to avoid blocking main thread
    prisma.systemLog.create({
      data: {
        level: payload.level,
        domain: payload.domain,
        action: payload.action,
        userId: payload.userId,
        ip: payload.ip,
        requestId: payload.requestId,
        metadata: payload.metadata ?? undefined,
        error: payload.error ? String(payload.error) : null,
      },
    }).catch((err) => {
      console.error('Failed to write system log:', err);
    });
  },

  info(data: Omit<LogPayload, 'level'>) {
    this.log({ level: 'INFO', ...data });
  },
  
  warn(data: Omit<LogPayload, 'level'>) {
    this.log({ level: 'WARN', ...data });
  },

  error(data: Omit<LogPayload, 'level'>) {
    this.log({ level: 'ERROR', ...data });
  },

  audit(data: Omit<LogPayload, 'level'>) {
    this.log({ level: 'AUDIT', ...data });
  },
  
  debug(data: Omit<LogPayload, 'level'>) {
      this.log({ level: 'DEBUG', ...data });
  }
};
