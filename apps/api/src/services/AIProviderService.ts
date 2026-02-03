import axios from 'axios';
import { AIProviderRepository } from '../repositories/AIProviderRepository';
import { AppError } from '../utils/AppError';
import { StatusCodes } from 'http-status-codes';
import { AIProviderDTO, AIModelDTO, AIModelFilter, ModelSyncResult } from '@subcare/types';

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
   * Sync models from provider API
   */
  async syncModelsFromProvider(providerId: string): Promise<ModelSyncResult> {
    const provider = await this.repository.findProviderById(providerId);
    if (!provider) {
      throw new AppError('PROVIDER_NOT_FOUND', StatusCodes.NOT_FOUND, {
        message: 'AI Provider not found'
      });
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
    } else if (provider.modelsUrl) {
      // Generic OpenAI-compatible API
      modelsToSync = await this.fetchOpenAICompatibleModels(provider.modelsUrl);
    } else {
      console.log(`[AIProviderService] No modelsUrl for provider: ${provider.name}, skipping sync`);
      return {
        added: 0,
        updated: 0,
        removed: 0,
        providerId: provider.id,
        providerName: provider.name
      };
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
   * Seed built-in providers
   */
  async seedBuiltInProviders(): Promise<void> {
    const builtInProviders = [
      {
        name: 'OpenAI',
        slug: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        modelsUrl: 'https://api.openai.com/v1/models',
        website: 'https://openai.com',
        description: 'OpenAI API - GPT-4, GPT-4o, and more',
        isBuiltIn: true,
        sortOrder: 1
      },
      {
        name: 'OpenRouter',
        slug: 'openrouter',
        baseUrl: 'https://openrouter.ai/api/v1',
        modelsUrl: 'https://openrouter.ai/api/v1/models',
        website: 'https://openrouter.ai',
        description: 'Access 200+ AI models through one unified API',
        isBuiltIn: true,
        sortOrder: 2
      },
      {
        name: 'DeepSeek',
        slug: 'deepseek',
        baseUrl: 'https://api.deepseek.com/v1',
        website: 'https://deepseek.com',
        description: 'DeepSeek AI - Cost-effective and powerful models',
        isBuiltIn: true,
        sortOrder: 3
      },
      {
        name: 'Anthropic',
        slug: 'anthropic',
        baseUrl: 'https://api.anthropic.com/v1',
        website: 'https://anthropic.com',
        description: 'Claude models - Safe and capable AI assistant',
        isBuiltIn: true,
        sortOrder: 4
      }
    ];

    for (const provider of builtInProviders) {
      await this.repository.upsertProvider(provider);
    }

    console.log('[AIProviderService] Built-in providers seeded successfully');
  }
}
