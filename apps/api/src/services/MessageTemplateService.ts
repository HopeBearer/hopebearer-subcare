import { MessageTemplateRepository } from "../repositories/MessageTemplateRepository";
import { Prisma } from "@subcare/database";
import { AppError } from "../utils/AppError";
import { StatusCodes } from "http-status-codes";

export class MessageTemplateService {
  constructor(private messageTemplateRepository: MessageTemplateRepository) {}

  async createTemplate(data: Prisma.MessageTemplateCreateInput) {
    const existing = await this.messageTemplateRepository.findByKey(data.key);
    if (existing) {
      throw new AppError("TEMPLATE_EXISTS", StatusCodes.CONFLICT, { message: "Template key already exists" });
    }
    return this.messageTemplateRepository.create(data);
  }

  async updateTemplate(id: string, data: Prisma.MessageTemplateUpdateInput) {
    return this.messageTemplateRepository.update(id, data);
  }

  async getTemplate(id: string) {
    return this.messageTemplateRepository.findById(id);
  }
  
  async getTemplateByKey(key: string) {
    return this.messageTemplateRepository.findByKey(key);
  }

  async getAllTemplates() {
    return this.messageTemplateRepository.findAll();
  }

  async deleteTemplate(id: string) {
    return this.messageTemplateRepository.delete(id);
  }
}
