import { UserRole } from "@subcare/types";

/**
 * 创建用户的数据传输对象 (DTO)
 */
export interface CreateUserDTO {
  email: string;
  password: string;
  name?: string;
  verificationCode: string;
  role?: UserRole; // 可选，数据库默认为 USER
}

/**
 * 用户登录的数据传输对象 (DTO)
 */
export interface LoginUserDTO {
  email: string;
  password: string;
  captchaId?: string;
  captchaCode?: string;
}
