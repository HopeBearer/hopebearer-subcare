
import { prisma, ExchangeRate } from "@subcare/database";

/**
 * 汇率数据仓库
 * 封装对 ExchangeRate 表的数据库操作
 */
export class ExchangeRateRepository {
    /**
     * 批量更新或创建汇率
     * @param rates 汇率数据列表 { currency, rate, base }
     */
    async upsertRates(rates: { currency: string; rate: number; base: string }[]) {
        // 逐个更新，或者使用事务
        // 由于是每日任务，且数据量不大，可以使用事务确保一致性
        await prisma.$transaction(
            rates.map((r) =>
                prisma.exchangeRate.upsert({
                    where: { currency: r.currency },
                    update: {
                        rate: r.rate,
                        base: r.base,
                    },
                    create: {
                        currency: r.currency,
                        rate: r.rate,
                        base: r.base,
                    },
                })
            )
        );
    }

    /**
     * 获取所有汇率
     */
    async findAll(): Promise<ExchangeRate[]> {
        return prisma.exchangeRate.findMany();
    }

    /**
     * 获取特定货币的汇率
     */
    async findByCurrency(currency: string): Promise<ExchangeRate | null> {
        return prisma.exchangeRate.findUnique({
            where: { currency },
        });
    }

    /**
     * 获取最近更新时间
     */
    async getLastUpdateTime(): Promise<Date | null> {
        const rate = await prisma.exchangeRate.findFirst({
            orderBy: { updatedAt: 'desc' }
        });
        return rate?.updatedAt || null;
    }
}
