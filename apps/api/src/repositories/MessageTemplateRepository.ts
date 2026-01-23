import { prisma, MessageTemplate, Prisma } from "@subcare/database";

export class MessageTemplateRepository {
  async create(data: Prisma.MessageTemplateCreateInput): Promise<MessageTemplate> {
    return prisma.messageTemplate.create({
      data,
    });
  }

  async update(id: string, data: Prisma.MessageTemplateUpdateInput): Promise<MessageTemplate> {
    return prisma.messageTemplate.update({
      where: { id },
      data,
    });
  }

  async findByKey(key: string): Promise<MessageTemplate | null> {
    return prisma.messageTemplate.findUnique({
      where: { key },
    });
  }

  async findById(id: string): Promise<MessageTemplate | null> {
    return prisma.messageTemplate.findUnique({
      where: { id },
    });
  }

  async findAll(): Promise<MessageTemplate[]> {
    return prisma.messageTemplate.findMany();
  }

  async delete(id: string): Promise<MessageTemplate> {
    return prisma.messageTemplate.delete({
      where: { id },
    });
  }
}
