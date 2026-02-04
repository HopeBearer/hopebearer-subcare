import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { AIProviderRepository, ModelFetchStrategy, ApiFormat } from '../repositories/AIProviderRepository';
import { AppError } from '../utils/AppError';
import { StatusCodes } from 'http-status-codes';
import { AIProviderDTO, AIModelDTO, AIModelFilter, ModelSyncResult } from '@subcare/types';

// Configuration file types
interface ModelConfig {
  modelId: string;
  name: string;
  description?: string;
  contextLength?: number;
  maxTokens?: number;
  inputModalities?: string[];
  outputModalities?: string[];
  pricingPrompt?: string;
  pricingCompletion?: string;
  isFree?: boolean;
}

interface ProviderConfig {
  name: string;
  slug: string;
  baseUrl: string;
  modelsUrl?: string;
  logoUrl?: string;
  website?: string;
  description?: string;
  modelFetchStrategy: ModelFetchStrategy;
  apiFormat: ApiFormat;
  isBuiltIn?: boolean;
  sortOrder?: number;
  models?: ModelConfig[];
}

interface ProvidersConfig {
  version: string;
  description?: string;
  providers: ProviderConfig[];
}

// OpenRouter API response types
interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  architecture?: {
    modality?: string;
    input_modalities?: string[];
    output_modalities?: string[];
  };
  pricing?: {
    prompt?: string;
    completion?: string;
  };
  top_provider?: {
    max_completion_tokens?: number;
  };
  supported_parameters?: string[];
}

interface OpenRouterModelsResponse {
  data: OpenRouterModel[];
}

export class AIProviderService {
  constructor(private repository: AIProviderRepository) {}

  /**
   * Get all active providers
   */
  async getProviders(): Promise<AIProviderDTO[]> {
    const providers = await this.repository.findAllProviders();
    return providers.map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      baseUrl: p.baseUrl,
      modelsUrl: p.modelsUrl ?? undefined,
      logoUrl: p.logoUrl ?? undefined,
      description: p.description ?? undefined,
      website: p.website ?? undefined,
      modelFetchStrategy: p.modelFetchStrategy,
      apiFormat: p.apiFormat,
      isBuiltIn: p.isBuiltIn,
      isActive: p.isActive,
      sortOrder: p.sortOrder
    }));
  }

  /**
   * Get provider by ID
   */
  async getProviderById(id: string): Promise<AIProviderDTO | null> {
    const provider = await this.repository.findProviderById(id);
    if (!provider) return null;

    return {
      id: provider.id,
      name: provider.name,
      slug: provider.slug,
      baseUrl: provider.baseUrl,
      modelsUrl: provider.modelsUrl ?? undefined,
      logoUrl: provider.logoUrl ?? undefined,
      description: provider.description ?? undefined,
      website: provider.website ?? undefined,
      modelFetchStrategy: provider.modelFetchStrategy,
      apiFormat: provider.apiFormat,
      isBuiltIn: provider.isBuiltIn,
      isActive: provider.isActive,
      sortOrder: provider.sortOrder
    };
  }

  /**
   * Get provider by slug
   */
  async getProviderBySlug(slug: string): Promise<AIProviderDTO | null> {
    const provider = await this.repository.findProviderBySlug(slug);
    if (!provider) return null;

    return {
      id: provider.id,
      name: provider.name,
      slug: provider.slug,
      baseUrl: provider.baseUrl,
      modelsUrl: provider.modelsUrl ?? undefined,
      logoUrl: provider.logoUrl ?? undefined,
      description: provider.description ?? undefined,
      website: provider.website ?? undefined,
      modelFetchStrategy: provider.modelFetchStrategy,
      apiFormat: provider.apiFormat,
      isBuiltIn: provider.isBuiltIn,
      isActive: provider.isActive,
      sortOrder: provider.sortOrder
    };
  }

  /**
   * Get models for a provider
   */
  async getModelsByProviderId(providerId: string, filters?: AIModelFilter): Promise<AIModelDTO[]> {
    const provider = await this.repository.findProviderById(providerId);
    if (!provider) {
      throw new AppError('PROVIDER_NOT_FOUND', StatusCodes.NOT_FOUND, {
        message: 'AI Provider not found'
      });
    }

    const models = await this.repository.findModelsByProviderId(providerId, {
      isFree: filters?.isFree,
      supportsImages: filters?.supportsImages,
      supportsTools: filters?.supportsTools,
      search: filters?.search
    });

    return models.map(m => ({
      id: m.id,
      modelId: m.modelId,
      name: m.name,
      description: m.description ?? undefined,
      providerId: m.providerId,
      providerSlug: provider.slug,
      contextLength: m.contextLength ?? undefined,
      maxTokens: m.maxTokens ?? undefined,
      inputModalities: m.inputModalities as string[] ?? undefined,
      outputModalities: m.outputModalities as string[] ?? undefined,
      pricingPrompt: m.pricingPrompt ?? undefined,
      pricingCompletion: m.pricingCompletion ?? undefined,
      pricingCurrency: m.pricingCurrency,
      isFree: m.isFree,
      supportedParams: m.supportedParams as string[] ?? undefined
    }));
  }

  /**
   * Get models by provider slug
   */
  async getModelsByProviderSlug(slug: string, filters?: AIModelFilter): Promise<AIModelDTO[]> {
    const provider = await this.repository.findProviderBySlug(slug);
    if (!provider) {
      throw new AppError('PROVIDER_NOT_FOUND', StatusCodes.NOT_FOUND, {
        message: 'AI Provider not found'
      });
    }
    return this.getModelsByProviderId(provider.id, filters);
  }

  /**
   * Fetch models for a provider using API Key (strategy-based)
   * 
   * - DYNAMIC: Uses the API Key to fetch from provider API in real-time
   * - PUBLIC: Returns cached models from database (synced separately)
   * - MANUAL: Returns manually maintained models from database
   */
  async fetchModelsWithApiKey(
    providerId: string,
    apiKey: string
  ): Promise<{
    models: AIModelDTO[];
    strategy: ModelFetchStrategy;
    source: 'api' | 'cache';
  }> {
    const provider = await this.repository.findProviderById(providerId);
    if (!provider) {
      throw new AppError('PROVIDER_NOT_FOUND', StatusCodes.NOT_FOUND, {
        message: 'AI Provider not found'
      });
    }

    const strategy = provider.modelFetchStrategy;

    // For PUBLIC and MANUAL strategies, return cached models
    if (strategy === 'PUBLIC' || strategy === 'MANUAL') {
      const models = await this.getModelsByProviderId(providerId);
      return {
        models,
        strategy,
        source: 'cache'
      };
    }

    // For DYNAMIC strategy, fetch from provider API using user's API Key
    try {
      const modelsUrl = provider.modelsUrl || `${provider.baseUrl}/models`;
      
      console.log(`[AIProviderService] Fetching models from ${modelsUrl} for ${provider.name}`);
      
      const response = await axios.get(modelsUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const rawModels = response.data?.data || response.data || [];
      
      // Transform to DTO format
      const models: AIModelDTO[] = rawModels.map((model: any) => ({
        id: model.id || model.modelId,
        modelId: model.id || model.modelId,
        name: model.name || model.id,
        description: model.description,
        providerId: provider.id,
        providerSlug: provider.slug,
        contextLength: model.context_length || model.contextLength,
        maxTokens: model.max_tokens || model.maxTokens,
        inputModalities: model.input_modalities || model.architecture?.input_modalities,
        outputModalities: model.output_modalities || model.architecture?.output_modalities,
        pricingCurrency: 'USD',
        isFree: false
      }));

      return {
        models,
        strategy,
        source: 'api'
      };
    } catch (error: any) {
      // Handle API errors
      if (error.response?.status === 401) {
        throw new AppError('INVALID_API_KEY', StatusCodes.UNAUTHORIZED, {
          message: 'Invalid API Key. Please check your API key and try again.'
        });
      }
      if (error.response?.status === 403) {
        throw new AppError('API_FORBIDDEN', StatusCodes.FORBIDDEN, {
          message: 'API access forbidden. Your API key may not have permission to list models.'
        });
      }
      
      console.error(`[AIProviderService] Failed to fetch models from ${provider.name}:`, error.message);
      throw new AppError('FETCH_MODELS_FAILED', StatusCodes.BAD_GATEWAY, {
        message: `Failed to fetch models from ${provider.name}. Please check your API key.`
      });
    }
  }

  /**
   * Sync models from provider API
   */
  async syncModelsFromProvider(providerId: string): Promise<ModelSyncResult> {
    const provider = await this.repository.findProviderById(providerId);
    if (!provider) {
      throw new AppError('PROVIDER_NOT_FOUND', StatusCodes.NOT_FOUND, {
        message: 'AI Provider not found'
      });
    }

    // Skip providers without sync capability
    if (provider.slug !== 'openrouter' && !provider.modelsUrl) {
      return {
        added: 0,
        updated: 0,
        removed: 0,
        providerId: provider.id,
        providerName: provider.name
      };
    }

    console.log(`[AIProviderService] Syncing models for provider: ${provider.name}`);

    let modelsToSync: Array<{
      modelId: string;
      name: string;
      description?: string;
      contextLength?: number;
      maxTokens?: number;
      inputModalities?: string[];
      outputModalities?: string[];
      pricingPrompt?: string;
      pricingCompletion?: string;
      supportedParams?: string[];
      isFree?: boolean;
      rawData?: Record<string, unknown>;
    }> = [];

    // Fetch models based on provider type
    if (provider.slug === 'openrouter') {
      modelsToSync = await this.fetchOpenRouterModels();
    } else {
      // Generic OpenAI-compatible API
      modelsToSync = await this.fetchOpenAICompatibleModels(provider.modelsUrl!);
    }

    // Bulk upsert models
    const { added, updated } = await this.repository.bulkUpsertModels(providerId, modelsToSync);

    // Mark models not in the response as inactive
    const syncedModelIds = modelsToSync.map(m => m.modelId);
    const removed = await this.repository.markModelsInactive(providerId, syncedModelIds);

    console.log(`[AIProviderService] Sync complete for ${provider.name}: added=${added}, updated=${updated}, removed=${removed}`);

    return {
      added,
      updated,
      removed,
      providerId: provider.id,
      providerName: provider.name
    };
  }

  /**
   * Sync all providers
   */
  async syncAllProviders(): Promise<ModelSyncResult[]> {
    const providers = await this.repository.findAllProviders();
    const results: ModelSyncResult[] = [];

    for (const provider of providers) {
      try {
        const result = await this.syncModelsFromProvider(provider.id);
        results.push(result);
      } catch (error) {
        console.error(`[AIProviderService] Failed to sync provider ${provider.name}:`, error);
        results.push({
          added: 0,
          updated: 0,
          removed: 0,
          providerId: provider.id,
          providerName: provider.name
        });
      }
    }

    return results;
  }

  /**
   * Fetch models from OpenRouter API
   */
  private async fetchOpenRouterModels(): Promise<Array<{
    modelId: string;
    name: string;
    description?: string;
    contextLength?: number;
    maxTokens?: number;
    inputModalities?: string[];
    outputModalities?: string[];
    pricingPrompt?: string;
    pricingCompletion?: string;
    supportedParams?: string[];
    isFree?: boolean;
    rawData?: Record<string, unknown>;
  }>> {
    try {
      const response = await axios.get<OpenRouterModelsResponse>(
        'https://openrouter.ai/api/v1/models',
        { timeout: 30000 }
      );

      return response.data.data.map(model => ({
        modelId: model.id,
        name: model.name,
        description: model.description,
        contextLength: model.context_length,
        maxTokens: model.top_provider?.max_completion_tokens,
        inputModalities: model.architecture?.input_modalities,
        outputModalities: model.architecture?.output_modalities,
        pricingPrompt: model.pricing?.prompt,
        pricingCompletion: model.pricing?.completion,
        supportedParams: model.supported_parameters,
        isFree: model.pricing?.prompt === '0' && model.pricing?.completion === '0',
        rawData: model as unknown as Record<string, unknown>
      }));
    } catch (error) {
      console.error('[AIProviderService] Failed to fetch OpenRouter models:', error);
      throw new AppError('SYNC_FAILED', StatusCodes.BAD_GATEWAY, {
        message: 'Failed to fetch models from OpenRouter'
      });
    }
  }

  /**
   * Fetch models from OpenAI-compatible API (generic)
   */
  private async fetchOpenAICompatibleModels(modelsUrl: string): Promise<Array<{
    modelId: string;
    name: string;
    description?: string;
  }>> {
    try {
      const response = await axios.get(modelsUrl, { timeout: 30000 });
      const models = response.data?.data || [];

      return models.map((model: { id: string; name?: string }) => ({
        modelId: model.id,
        name: model.name || model.id
      }));
    } catch (error) {
      console.error('[AIProviderService] Failed to fetch models from:', modelsUrl, error);
      // Don't throw, just return empty - some providers may require auth
      return [];
    }
  }

  /**
   * Seed built-in providers from configuration file
   * 
   * Reads from config/ai-providers.json to avoid hardcoding
   */
  async seedBuiltInProviders(): Promise<void> {
    // Load configuration from file
    const configPath = path.join(__dirname, '../../config/ai-providers.json');
    
    if (!fs.existsSync(configPath)) {
      console.warn(`[AIProviderService] Config file not found: ${configPath}`);
      console.warn('[AIProviderService] Skipping provider seeding. Run: pnpm seed:ai-providers');
      return;
    }

    try {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      const config: ProvidersConfig = JSON.parse(configContent);
      
      console.log(`[AIProviderService] Loading providers from config (version: ${config.version})`);

      for (const providerConfig of config.providers) {
        const { models, ...providerInfo } = providerConfig;
        
        // Upsert provider
        const provider = await this.repository.upsertProvider({
          ...providerInfo,
          isBuiltIn: providerInfo.isBuiltIn ?? false,
          sortOrder: providerInfo.sortOrder ?? 0
        });

        // If provider has pre-defined models (MANUAL strategy), seed them
        if (models && models.length > 0) {
          for (const model of models) {
            await this.repository.upsertModel(provider.id, {
              ...model,
              source: 'MANUAL'
            });
          }
          console.log(`[AIProviderService] Seeded ${models.length} models for ${provider.name}`);
        }
      }

      console.log(`[AIProviderService] Built-in providers seeded successfully (${config.providers.length} providers)`);
    } catch (error) {
      console.error('[AIProviderService] Failed to load provider config:', error);
      throw new AppError('CONFIG_LOAD_FAILED', StatusCodes.INTERNAL_SERVER_ERROR, {
        message: 'Failed to load AI providers configuration'
      });
    }
  }
}
