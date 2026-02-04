import { LLMProvider } from './interfaces/LLMProvider';
import { OpenAIProvider } from './OpenAIProvider';
import { EncryptionUtil } from '../../utils/EncryptionUtil';

/**
 * API format enum - matches database ApiFormat enum
 */
export type ApiFormat = 'OPENAI' | 'ANTHROPIC' | 'CUSTOM';

/**
 * Configuration for creating an LLM provider
 * 
 * baseUrl and apiFormat should come from AIProvider table in database
 * This design allows adding new providers without modifying code
 */
export interface AIConfig {
  apiKey: string;       // Encrypted API key
  model: string;        // Model ID (e.g., 'gpt-4o', 'deepseek-chat')
  baseUrl: string;      // Base URL from AIProvider.baseUrl or custom override
  apiFormat: ApiFormat; // API format from AIProvider.apiFormat
  
  // Optional: for logging/debugging purposes only
  providerSlug?: string;
}

export class LLMFactory {
  /**
   * Create an LLM provider instance based on API format
   * 
   * This is a data-driven approach:
   * - baseUrl comes from AIProvider table or user's custom config
   * - apiFormat determines which client implementation to use
   * - Adding new OpenAI-compatible providers only requires database configuration
   * 
   * @param config - Configuration from database (AIProvider + UserAIConfig)
   * @returns LLM provider instance
   */
  static createProvider(config: AIConfig): LLMProvider {
    const decryptedKey = EncryptionUtil.decrypt(config.apiKey);
    
    // Validate required fields
    if (!config.baseUrl) {
      throw new Error(
        `[LLMFactory] baseUrl is required. ` +
        `Provider "${config.providerSlug || 'unknown'}" must have a valid baseUrl in AIProvider table.`
      );
    }
    
    if (!config.model) {
      throw new Error(
        `[LLMFactory] model is required. ` +
        `Please select a model for provider "${config.providerSlug || 'unknown'}".`
      );
    }
    
    // Route to appropriate implementation based on API format
    switch (config.apiFormat) {
      case 'OPENAI':
        // All OpenAI-compatible APIs (OpenAI, DeepSeek, OpenRouter, Groq, etc.)
        // use the same provider implementation with different baseUrl
        return new OpenAIProvider(decryptedKey, config.model, config.baseUrl);
      
      case 'ANTHROPIC':
        // Anthropic has a different API format
        // TODO: Implement AnthropicProvider when needed
        throw new Error(
          `[LLMFactory] Anthropic API format is not yet implemented. ` +
          `Please use an OpenAI-compatible provider for now.`
        );
      
      case 'CUSTOM':
        // Custom format requires specific adapter implementation
        throw new Error(
          `[LLMFactory] Custom API format requires specific implementation. ` +
          `Contact administrator to add support for this provider.`
        );
      
      default:
        throw new Error(
          `[LLMFactory] Unknown API format: ${config.apiFormat}. ` +
          `Valid formats are: OPENAI, ANTHROPIC, CUSTOM.`
        );
    }
  }
}
