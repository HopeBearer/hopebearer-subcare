import jwt from 'jsonwebtoken';
import { User } from '@subcare/database';

/**
 * Token 服务
 * 负责生成和验证 JWT Token (Access Token 和 Refresh Token)
 */
export class TokenService {
  private readonly ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'access-secret';
  private readonly REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret';
  private readonly ACCESS_TOKEN_EXPIRES_IN = '15m'; // Access Token 有效期 15 分钟
  private readonly REFRESH_TOKEN_EXPIRES_IN = '7d'; // Refresh Token 有效期 7 天

  /**
   * 为用户生成 Access Token 和 Refresh Token
   * @param user 用户实体
   * @returns 包含 access token 和 refresh token 的对象
   */
  generateTokens(user: User) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    // 生成 Access Token
    const accessToken = jwt.sign(payload, this.ACCESS_TOKEN_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
    });

    // 生成 Refresh Token
    const refreshToken = jwt.sign(payload, this.REFRESH_TOKEN_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
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
