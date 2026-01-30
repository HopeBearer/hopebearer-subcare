import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../services/AuthService';
import { z } from 'zod';
import { StatusCodes } from 'http-status-codes';
import { BusinessCode } from '../../constants/BusinessCode';

// 注册请求验证 schema
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

// 登录请求验证 schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  captchaId: z.string(),
  captchaCode: z.string(),
});

// 刷新 Token 请求验证 schema
const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

// 忘记密码请求验证 schema
const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

// 重置密码请求验证 schema
const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// 验证 Token 请求验证 schema
const verifyTokenSchema = z.object({
  token: z.string().min(1),
});

const sendVerificationCodeSchema = z.object({
  email: z.string().email(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string(), // Min length check moved to after decryption or assume encrypted string is long enough
  verificationCode: z.string().length(6),
});

/**
 * 认证控制器
 * 处理所有与认证相关的 HTTP 请求
 */
export class AuthController {
  constructor(private authService: AuthService) {}

// ... existing register, getCaptcha, login, refresh methods ...

  /**
   * 处理用户注册
   * POST /auth/register
   */
  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 验证请求体
      const validatedData = registerSchema.parse(req.body);
      // 调用服务层注册逻辑
      const result = await this.authService.register(validatedData);
      
      // 返回创建成功响应
      res.status(StatusCodes.CREATED).json({
        status: 'success',
        code: BusinessCode.CREATED,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 获取验证码
   * GET /auth/captcha
   */
  getCaptcha = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = this.authService.generateCaptcha();
      
      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: {
            captchaId: result.captchaId,
            captchaImage: result.data
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 修改密码
   * POST /auth/change-password
   */
  changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.userId;
      const validatedData = changePasswordSchema.parse(req.body);
      
      await this.authService.changePassword(userId, validatedData);

      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 获取公钥 (Deprecated - Returns empty)
   * GET /auth/public-key
   */
  getPublicKey = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: { publicKey: "" },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 处理用户登录
   * POST /auth/login
   */
  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 验证请求体
      const validatedData = loginSchema.parse(req.body);
      // 调用服务层登录逻辑
      const result = await this.authService.login(validatedData);
      
      // 返回登录成功响应
      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 处理 Token 刷新
   * POST /auth/refresh
   */
  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 验证请求体
      const validatedData = refreshTokenSchema.parse(req.body);
      // 调用服务层刷新逻辑
      const result = await this.authService.refresh(validatedData.refreshToken);

      // 返回新 Token
      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 处理忘记密码
   * POST /auth/forgot-password
   */
  forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 验证请求体
      const validatedData = forgotPasswordSchema.parse(req.body);
      // 调用服务层忘记密码逻辑
      await this.authService.forgotPassword(validatedData.email);

      // 无论用户是否存在，都返回成功，防止邮箱枚举
      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 验证重置 Token
   * POST /auth/verify-reset-token
   */
  verifyResetToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = verifyTokenSchema.parse(req.body);
      const isValid = await this.authService.verifyResetToken(validatedData.token);

      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        data: { valid: isValid },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 处理重置密码
   * POST /auth/reset-password
   */
  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = resetPasswordSchema.parse(req.body);
      await this.authService.resetPassword(validatedData.token, validatedData.password);

      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        message: 'Password successfully reset.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 发送验证码
   * POST /auth/verification-code/send
   */
  sendVerificationCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = sendVerificationCodeSchema.parse(req.body);
      await this.authService.sendEmailVerificationCode(email);
      
      res.status(StatusCodes.OK).json({
        status: 'success',
        code: BusinessCode.SUCCESS,
        message: 'Verification code sent',
      });
    } catch (error) {
      next(error);
    }
  };
}
