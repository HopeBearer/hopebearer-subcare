import { UserRepository } from "../repositories/UserRepository";
import { CreateUserDTO, LoginUserDTO } from "../dtos/auth.dto";
import { AppError } from "../utils/AppError";
import { StatusCodes } from "http-status-codes";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { User, prisma } from "@subcare/database";
import { TokenService } from "./TokenService";
import { CaptchaService } from "./CaptchaService";
import { VerificationCodeService } from "./VerificationCodeService";
import { NotificationService } from "../modules/notification/notification.service";

/**
 * 认证响应接口
 */
export interface AuthResponse {
  user: Omit<User, 'password' | 'refreshToken'>;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

/**
 * 认证服务
 * 处理注册、登录、刷新 Token 等认证逻辑
 */
export class AuthService {
  private captchaService: CaptchaService;
  private verificationCodeService: VerificationCodeService;

  constructor(
    private userRepository: UserRepository,
    private tokenService: TokenService,
    private notificationService: NotificationService
  ) {
    this.captchaService = new CaptchaService();
    this.verificationCodeService = new VerificationCodeService();
  }

  /**
   * Get Public Key for encryption
   */
  getPublicKey() {
    // Encryption removed
    return { publicKey: "" };
  }

  /**
   * 用户注册
   * @param data 注册数据
   * @returns 认证响应（用户数据和 Tokens）
   */
  async register(data: CreateUserDTO): Promise<AuthResponse> {
    // 检查邮箱是否已存在
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new AppError("USER_ALREADY_EXISTS", StatusCodes.CONFLICT, { message: "User already exists" });
    }

    // 密码加密
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // 创建用户
    let user = await this.userRepository.create({
      ...data,
      password: hashedPassword,
    });

    // 生成 Tokens
    const tokens = this.tokenService.generateTokens(user);
    // 对 Refresh Token 进行哈希存储，提高安全性
    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);

    // 更新用户的 Refresh Token
    user = await this.userRepository.update(user.id, {
      refreshToken: hashedRefreshToken,
    });
    
    // 发送欢迎通知
    await this.notificationService.notify({
        userId: user.id,
        key: "notification.auth.welcome",
        data: { username: user.name || user.email },
        title: "Welcome to SubCare!", // Fallback/Email
        content: "We are glad to have you on board. Start tracking your subscriptions today.", // Fallback/Email
        type: "system",
        // channels: ["in-app", "email"] // Removed hardcoded
    }).catch(err => console.error('Failed to send welcome notification', err));

    // 返回结果时移除敏感字段
    const { password, refreshToken: rt, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      tokens,
    };
  }

  /**
   * 生成验证码
   */
  generateCaptcha() {
    return this.captchaService.generate();
  }

  /**
   * 发送邮箱验证码
   * @param email 用户邮箱
   */
  async sendEmailVerificationCode(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AppError("USER_NOT_FOUND", StatusCodes.NOT_FOUND, { message: "User not found" });
    }

    const code = this.verificationCodeService.generate(email);

    await this.notificationService.notify({
      userId: user.id,
      key: 'notification.auth.verify_code',
      data: { code, expireMinutes: '5' },
      title: 'Security Verification Code',
      content: `Your verification code is: ${code}. It expires in 5 minutes.`,
      type: 'security',
      channels: ['email']
    });
  }

  /**
   * 修改密码 (Logged in user)
   * @param userId Current user ID
   * @param data Change password data
   */
  async changePassword(userId: string, data: any): Promise<void> {
    const { currentPassword, newPassword, verificationCode } = data;

    // No encryption on payload, assuming HTTPS transport security.
    const decryptedCurrentPassword = currentPassword;
    const decryptedNewPassword = newPassword;

    // 1. Verify User exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError("USER_NOT_FOUND", StatusCodes.NOT_FOUND, { message: "User not found" });
    }

    // 2. Verify Current Password
    const isPasswordValid = await bcrypt.compare(decryptedCurrentPassword, user.password);
    if (!isPasswordValid) {
      throw new AppError("INVALID_PASSWORD", StatusCodes.BAD_REQUEST, { message: "Invalid current password" });
    }

    // 3. Verify Verification Code
    const isCodeValid = this.verificationCodeService.verify(user.email, verificationCode);
    if (!isCodeValid) {
      throw new AppError("INVALID_VERIFICATION_CODE", StatusCodes.BAD_REQUEST, { message: "Invalid verification code" });
    }

    // 4. Update Password
    if (decryptedNewPassword.length < 8) {
      throw new AppError("INVALID_PASSWORD", StatusCodes.BAD_REQUEST, { message: "New password must be at least 8 characters" });
    }
    const hashedPassword = await bcrypt.hash(decryptedNewPassword, 10);
    
    await this.userRepository.update(userId, {
      password: hashedPassword
    });

    // 5. Notify
    await this.notificationService.notify({
      userId: user.id,
      key: 'notification.auth.password_changed',
      data: { time: new Date().toLocaleString() },
      title: 'Password Changed',
      content: 'Your password has been changed successfully.',
      type: 'security',
      channels: ['email']
    });
  }

  /**
   * 用户登录
   * @param data 登录数据
   * @returns 认证响应
   */
  async login(data: LoginUserDTO): Promise<AuthResponse> {
    // 验证图形验证码
    if (data.captchaId && data.captchaCode) {
      const isValid = this.captchaService.verify(data.captchaId, data.captchaCode);
      if (!isValid) {
        throw new AppError("CAPTCHA_INVALID", StatusCodes.BAD_REQUEST, { message: "Invalid captcha code" });
      }
    } else {
      // Enforce captcha if you want, or make it optional. 
      // For security, it's better to enforce it if provided, or enforce generally.
      // Let's enforce it if the frontend is sending it, but maybe allow without for API testing if needed,
      // or strictly require it. The requirement was "replace with free verification", so likely mandatory.
      // However, existing tests might break. Let's make it mandatory if we want to prevent bots.

      // Checking if we should enforce it. The user said "add a machine test", so let's enforce it.
      throw new AppError("CAPTCHA_REQUIRED", StatusCodes.BAD_REQUEST, { message: "Captcha is required" });
    }

    // 查找用户
    let user = await this.userRepository.findByEmail(data.email);
    if (!user) {
      throw new AppError("USER_NOT_FOUND", StatusCodes.BAD_REQUEST, { message: "User not found" });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw new AppError("INVALID_PASSWORD", StatusCodes.BAD_REQUEST, { message: "Invalid password" });
    }

    // 生成新 Tokens
    const tokens = this.tokenService.generateTokens(user);
    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);

    // 更新 Refresh Token
    user = await this.userRepository.update(user.id, {
      refreshToken: hashedRefreshToken,
    });

    const { password, refreshToken: rt, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      tokens,
    };
  }

  /**
   * 刷新 Token
   * 使用有效的 Refresh Token 获取新的 Access Token 和 Refresh Token
   * @param refreshToken 客户端提供的 Refresh Token
   * @returns 认证响应
   */
  async refresh(refreshToken: string): Promise<AuthResponse> {
    let payload: any;
    try {
      // 验证 Token 签名和有效期
      payload = this.tokenService.verifyRefreshToken(refreshToken);
    } catch (error) {
      throw new AppError("REFRESH_TOKEN_INVALID", StatusCodes.UNAUTHORIZED, { message: "Invalid refresh token" });
    }

    // 查找用户
    let user = await this.userRepository.findById(payload.userId);
    if (!user || !user.refreshToken) {
      throw new AppError("REFRESH_TOKEN_INVALID", StatusCodes.UNAUTHORIZED, { message: "Invalid refresh token" });
    }

    // 验证提供的 Refresh Token 是否与数据库中存储的（哈希后）匹配
    // 这可以防止旧的 Refresh Token 被重复使用（Token Rotation 机制的一部分）
    const isRefreshTokenValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isRefreshTokenValid) {
      throw new AppError("REFRESH_TOKEN_INVALID", StatusCodes.UNAUTHORIZED, { message: "Invalid refresh token" });
    }

    // 生成新 Tokens
    const tokens = this.tokenService.generateTokens(user);
    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);

    // 更新数据库中的 Refresh Token
    user = await this.userRepository.update(user.id, {
      refreshToken: hashedRefreshToken,
    });

    const { password, refreshToken: rt, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      tokens,
    };
  }

  /**
   * 忘记密码 (Request Password Reset)
   * Sends an email with a reset link if the user exists.
   * @param email User email
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    
    // Always return success to prevent user enumeration
    if (!user) {
      return;
    }

    // 1. Generate random token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // 2. Hash token for storage
    const tokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // 3. Store in DB (Expire in 15 mins)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Delete existing tokens for this email to keep it clean (optional but good practice)
    await prisma.passwordResetToken.deleteMany({
      where: { email: user.email },
    });

    await prisma.passwordResetToken.create({
      data: {
        email: user.email,
        token: tokenHash,
        expiresAt,
      },
    });

    // 4. Send Email
    // Construct reset link (Frontend URL)
    // NOTE: In production, FRONTEND_URL should be an env var
    const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    await this.notificationService.notify({
      userId: user.id,
      key: 'notification.auth.reset_request',
      data: { resetUrl, expireMinutes: '15' },
      title: '重置您的密码',
      content: `您申请了重置密码。请复制以下链接到浏览器中访问以重置您的密码。此链接15分钟内有效。\n\n${resetUrl}`,
      type: 'security',
      channels: ['email'] // Only email is appropriate for this
    });
  }

  /**
   * Verify Reset Token
   * Checks if the token is valid and not expired
   * @param token Plain token from URL
   */
  async verifyResetToken(token: string): Promise<boolean> {
    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const record = await prisma.passwordResetToken.findUnique({
      where: { token: tokenHash },
    });

    if (!record) {
      return false;
    }

    if (record.expiresAt < new Date()) {
        // Expired, maybe delete it?
        await prisma.passwordResetToken.delete({ where: { id: record.id } }).catch(() => {});
        return false;
    }

    return true;
  }

  /**
   * Reset Password
   * @param token Plain token
   * @param newPassword New password
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    if (newPassword.length < 8) {
       throw new AppError("INVALID_PASSWORD", StatusCodes.BAD_REQUEST, { message: "Password must be at least 8 characters" });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const record = await prisma.passwordResetToken.findUnique({
      where: { token: tokenHash },
    });

    if (!record || record.expiresAt < new Date()) {
      throw new AppError("INVALID_TOKEN", StatusCodes.BAD_REQUEST, { message: "Token is invalid or expired" });
    }

    // Find user
    const user = await this.userRepository.findByEmail(record.email);
    if (!user) {
        throw new AppError("USER_NOT_FOUND", StatusCodes.BAD_REQUEST, { message: "User not found" });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userRepository.update(user.id, {
        password: hashedPassword
    });

    // Delete token (Consume)
    await prisma.passwordResetToken.delete({
        where: { id: record.id }
    });
    
    // Notify user
    await this.notificationService.notify({
        userId: user.id,
        key: 'notification.auth.reset_success',
        data: {},
        title: '密码修改成功',
        content: '您的密码已成功修改。',
        type: 'security',
        channels: ['email', 'in-app']
    });
  }
}
