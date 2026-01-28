import { PrismaClient, Category, Prisma } from "@subcare/database";

const prisma = new PrismaClient();

export class CategoryRepository {
  async findAllByUserId(userId: string): Promise<Category[]> {
    return prisma.category.findMany({
      where: {
        OR: [
          { userId: userId },
          { userId: null } // System default categories
        ]
      }
    });
  }

  async create(data: Prisma.CategoryCreateInput): Promise<Category> {
    return prisma.category.create({ data });
  }
  
  async deleteByUserId(userId: string): Promise<Prisma.BatchPayload> {
    return prisma.category.deleteMany({
      where: { userId }
    });
  }
}
