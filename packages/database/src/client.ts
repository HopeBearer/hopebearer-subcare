import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  const client = new PrismaClient();

  return client.$extends({
    query: {
      $allModels: {
        async delete({ model, args, query }) {
          return (client as any)[model].update({
            ...args,
            data: { deletedAt: new Date() },
          });
        },
        async deleteMany({ model, args, query }) {
          return (client as any)[model].updateMany({
            ...args,
            data: { deletedAt: new Date() },
          });
        },
        async findUnique({ model, args, query }) {
          // Prisma doesn't support adding non-unique fields to findUnique.
          // We must change findUnique to findFirst if we want to filter by deletedAt.
          args.where = { ...args.where, deletedAt: null };
          return (client as any)[model].findFirst(args);
        },
        async findFirst({ model, args, query }) {
          args.where = { ...args.where, deletedAt: null };
          return query(args);
        },
        async findMany({ model, args, query }) {
          args.where = { ...args.where, deletedAt: null };
          return query(args);
        },
        async count({ model, args, query }) {
           args.where = { ...args.where, deletedAt: null };
           return query(args);
        },
      },
    },
  }) as unknown as PrismaClient;
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export { Prisma } from "@prisma/client";
export * from "@prisma/client";
