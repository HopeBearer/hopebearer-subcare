import { prisma } from "@subcare/database";

// Type assertion for new models - these will be properly typed after prisma generate
// After running `prisma generate`, you can replace `db` with `prisma` and remove type assertions
const db: any = prisma;

// Note: These types will be available after running `prisma generate`
// For now, we use inline types. After schema migration, you can import from @subcare/database

// Model fetch strategy enum
export type ModelFetchStrategy = 'DYNAMIC' | 'PUBLIC' | 'MANUAL';

// API format enum
export type ApiFormat = 'OPENAI' | 'ANTHROPIC' | 'CUSTOM';

// Model source enum
export type ModelSource = 'MANUAL' | 'API';

interface AIProvider {
  id: string;
  name: string;
  slug: string;
  baseUrl: string;
  modelsUrl: string | null;
  logoUrl: string | null;
  description: string | null;
  website: string | null;
  modelFetchStrategy: ModelFetchStrategy;
  apiFormat: ApiFormat;
  isBuiltIn: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface AIModel {
  id: string;
  modelId: string;
  name: string;
  description: string | null;
  providerId: string;
  source: ModelSource;
  contextLength: number | null;
  maxTokens: number | null;
  inputModalities: unknown;
  outputModalities: unknown;
  pricingPrompt: string | null;
  pricingCompletion: string | null;
  pricingCurrency: string;
  supportedParams: unknown;
  isActive: boolean;
  isFree: boolean;
  rawData: unknown;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface AIModelWhereInput {
  providerId?: string;
  deletedAt?: Date | null;
  isActive?: boolean;
  isFree?: boolean;
  OR?: Array<{
    name?: { contains: string };
    modelId?: { contains: string };
    description?: { contains: string };
  }>;
}

export class AIProviderRepository {
  // =====================
  // Provider Methods
  // =====================

  async findAllProviders(includeInactive = false): Promise<AIProvider[]> {
    return db.aIProvider.findMany({
      where: {
        deletedAt: null,
        ...(includeInactive ? {} : { isActive: true })
      },
      orderBy: { sortOrder: 'asc' }
    });
  }

  async findProviderById(id: string): Promise<AIProvider | null> {
    return db.aIProvider.findUnique({
      where: { id }
    });
  }

  async findProviderBySlug(slug: string): Promise<AIProvider | null> {
    return db.aIProvider.findUnique({
      where: { slug }
    });
  }

  async upsertProvider(data: {
    slug: string;
    name: string;
    baseUrl: string;
    modelsUrl?: string;
    logoUrl?: string;
    description?: string;
    website?: string;
    modelFetchStrategy?: ModelFetchStrategy;
    apiFormat?: ApiFormat;
    isBuiltIn?: boolean;
    isActive?: boolean;
    sortOrder?: number;
  }): Promise<AIProvider> {
    return db.aIProvider.upsert({
      where: { slug: data.slug },
      update: {
        name: data.name,
        baseUrl: data.baseUrl,
        modelsUrl: data.modelsUrl,
        logoUrl: data.logoUrl,
        description: data.description,
        website: data.website,
        modelFetchStrategy: data.modelFetchStrategy,
        apiFormat: data.apiFormat,
        isBuiltIn: data.isBuiltIn,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
        updatedAt: new Date()
      },
      create: {
        slug: data.slug,
        name: data.name,
        baseUrl: data.baseUrl,
        modelsUrl: data.modelsUrl,
        logoUrl: data.logoUrl,
        description: data.description,
        website: data.website,
        modelFetchStrategy: data.modelFetchStrategy ?? 'DYNAMIC',
        apiFormat: data.apiFormat ?? 'OPENAI',
        isBuiltIn: data.isBuiltIn ?? false,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0
      }
    });
  }

  // =====================
  // Model Methods
  // =====================

  async findModelsByProviderId(
    providerId: string,
    filters?: {
      isFree?: boolean;
      supportsImages?: boolean;
      supportsTools?: boolean;
      search?: string;
      isActive?: boolean;
    }
  ): Promise<AIModel[]> {
    const where: AIModelWhereInput = {
      providerId,
      deletedAt: null,
      isActive: filters?.isActive ?? true
    };

    if (filters?.isFree !== undefined) {
      where.isFree = filters.isFree;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { modelId: { contains: filters.search } },
        { description: { contains: filters.search } }
      ];
    }

    const models = await db.aIModel.findMany({
      where,
      orderBy: [
        { isFree: 'desc' }, // Free models first
        { name: 'asc' }
      ]
    });

    // Filter by capabilities if needed
    if (filters?.supportsImages) {
      return models.filter((m: AIModel) => {
        const inputs = m.inputModalities as string[] | null;
        return inputs?.includes('image');
      });
    }

    if (filters?.supportsTools) {
      return models.filter((m: AIModel) => {
        const params = m.supportedParams as string[] | null;
        return params?.includes('tools');
      });
    }

    return models;
  }

  async findModelById(id: string): Promise<AIModel | null> {
    return db.aIModel.findUnique({
      where: { id }
    });
  }

  async findModelByProviderAndModelId(providerId: string, modelId: string): Promise<AIModel | null> {
    return db.aIModel.findUnique({
      where: {
        providerId_modelId: { providerId, modelId }
      }
    });
  }

  async upsertModel(providerId: string, data: {
    modelId: string;
    name: string;
    description?: string;
    source?: ModelSource;
    contextLength?: number;
    maxTokens?: number;
    inputModalities?: string[];
    outputModalities?: string[];
    pricingPrompt?: string;
    pricingCompletion?: string;
    pricingCurrency?: string;
    supportedParams?: string[];
    isFree?: boolean;
    isActive?: boolean;
    rawData?: Record<string, unknown>;
  }): Promise<AIModel> {
    return db.aIModel.upsert({
      where: {
        providerId_modelId: { providerId, modelId: data.modelId }
      },
      update: {
        name: data.name,
        description: data.description,
        source: data.source,
        contextLength: data.contextLength,
        maxTokens: data.maxTokens,
        inputModalities: data.inputModalities,
        outputModalities: data.outputModalities,
        pricingPrompt: data.pricingPrompt,
        pricingCompletion: data.pricingCompletion,
        pricingCurrency: data.pricingCurrency ?? 'USD',
        supportedParams: data.supportedParams,
        isFree: data.isFree ?? false,
        isActive: data.isActive ?? true,
        rawData: data.rawData,
        updatedAt: new Date()
      },
      create: {
        providerId,
        modelId: data.modelId,
        name: data.name,
        description: data.description,
        source: data.source ?? 'MANUAL',
        contextLength: data.contextLength,
        maxTokens: data.maxTokens,
        inputModalities: data.inputModalities,
        outputModalities: data.outputModalities,
        pricingPrompt: data.pricingPrompt,
        pricingCompletion: data.pricingCompletion,
        pricingCurrency: data.pricingCurrency ?? 'USD',
        supportedParams: data.supportedParams,
        isFree: data.isFree ?? false,
        isActive: data.isActive ?? true,
        rawData: data.rawData
      }
    });
  }

  async bulkUpsertModels(providerId: string, models: Array<{
    modelId: string;
    name: string;
    description?: string;
    contextLength?: number;
    maxTokens?: number;
    inputModalities?: string[];
    outputModalities?: string[];
    pricingPrompt?: string;
    pricingCompletion?: string;
    pricingCurrency?: string;
    supportedParams?: string[];
    isFree?: boolean;
    rawData?: Record<string, unknown>;
  }>): Promise<{ added: number; updated: number }> {
    let added = 0;
    let updated = 0;

    for (const model of models) {
      const existing = await this.findModelByProviderAndModelId(providerId, model.modelId);
      await this.upsertModel(providerId, model);
      
      if (existing) {
        updated++;
      } else {
        added++;
      }
    }

    return { added, updated };
  }

  async markModelsInactive(providerId: string, excludeModelIds: string[]): Promise<number> {
    const result = await db.aIModel.updateMany({
      where: {
        providerId,
        modelId: { notIn: excludeModelIds },
        isActive: true
      },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });
    return result.count;
  }

  async getModelCount(providerId: string): Promise<number> {
    return db.aIModel.count({
      where: {
        providerId,
        isActive: true,
        deletedAt: null
      }
    });
  }
}
