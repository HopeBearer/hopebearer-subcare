import jwt from 'jsonwebtoken';
import { User } from '@subcare/database';
import type { SystemSettingService } from './SystemSettingService';

/**
 * Token 服务
 * 负责生成和验证 JWT Token (Access Token 和 Refresh Token)
 *
 * a6: sessionTimeoutMinutes 从系统设置动态读取，控制 Refresh Token 有效期
 */
export class TokenService {
  private readonly ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'access-secret';
  private readonly REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret';
  private readonly ACCESS_TOKEN_EXPIRES_IN = 15 * 60; // Access Token 有效期 15 分钟（秒）
  private readonly DEFAULT_REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60; // Refresh Token 默认有效期 7 天（秒）

  private systemSettingService?: SystemSettingService;

  /**
   * 注入 SystemSettingService（可选，不影响已有调用方式）
   */
  setSystemSettingService(service: SystemSettingService) {
    this.systemSettingService = service;
  }

  /**
   * 为用户生成 Access Token 和 Refresh Token
   * @param user 用户实体
   * @returns 包含 access token 和 refresh token 的对象
   */
  async generateTokens(user: User) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    // a6: 从系统设置读取会话超时（分钟），映射为 Refresh Token 有效期（秒）
    let refreshExpiresInSeconds: number = this.DEFAULT_REFRESH_TOKEN_EXPIRES_IN;
    if (this.systemSettingService) {
      const timeoutMinutes = await this.systemSettingService.getValue<number>('security.sessionTimeoutMinutes', 0);
      if (timeoutMinutes > 0) {
        refreshExpiresInSeconds = timeoutMinutes * 60;
      }
    }

    // 生成 Access Token
    const accessToken = jwt.sign(payload, this.ACCESS_TOKEN_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
    });

    // 生成 Refresh Token
    const refreshToken = jwt.sign(payload, this.REFRESH_TOKEN_SECRET, {
      expiresIn: refreshExpiresInSeconds,
    });

    return { accessToken, refreshToken };
  }

  /**
   * 验证 Access Token
   * @param token 待验证的 token
   * @returns 解码后的 payload
   */
  verifyAccessToken(token: string) {
    return jwt.verify(token, this.ACCESS_TOKEN_SECRET);
  }

  /**
   * 验证 Refresh Token
   * @param token 待验证的 token
   * @returns 解码后的 payload
   */
  verifyRefreshToken(token: string) {
    return jwt.verify(token, this.REFRESH_TOKEN_SECRET);
  }
}
