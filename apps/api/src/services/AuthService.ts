import { UserRepository } from "../repositories/UserRepository";
import { CreateUserDTO, LoginUserDTO } from "../dtos/auth.dto";
import { AppError } from "../utils/AppError";
import { StatusCodes } from "http-status-codes";
import * as bcrypt from "bcrypt";
import { User } from "@subcare/database";
import { TokenService } from "./TokenService";

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
  constructor(
    private userRepository: UserRepository,
    private tokenService: TokenService
  ) {}

  /**
   * 用户注册
   * @param data 注册数据
   * @returns 认证响应（用户数据和 Tokens）
   */
  async register(data: CreateUserDTO): Promise<AuthResponse> {
    // 检查邮箱是否已存在
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new AppError("User already exists", StatusCodes.CONFLICT);
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

    // 返回结果时移除敏感字段
    const { password, refreshToken: rt, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      tokens,
    };
  }

  /**
   * 用户登录
   * @param data 登录数据
   * @returns 认证响应
   */
  async login(data: LoginUserDTO): Promise<AuthResponse> {
    // 查找用户
    let user = await this.userRepository.findByEmail(data.email);
    if (!user) {
      throw new AppError("Invalid credentials", StatusCodes.UNAUTHORIZED);
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw new AppError("Invalid credentials", StatusCodes.UNAUTHORIZED);
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
      throw new AppError("Invalid refresh token", StatusCodes.UNAUTHORIZED);
    }

    // 查找用户
    let user = await this.userRepository.findById(payload.userId);
    if (!user || !user.refreshToken) {
      throw new AppError("Invalid refresh token", StatusCodes.UNAUTHORIZED);
    }

    // 验证提供的 Refresh Token 是否与数据库中存储的（哈希后）匹配
    // 这可以防止旧的 Refresh Token 被重复使用（Token Rotation 机制的一部分）
    const isRefreshTokenValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isRefreshTokenValid) {
      throw new AppError("Invalid refresh token", StatusCodes.UNAUTHORIZED);
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
}
