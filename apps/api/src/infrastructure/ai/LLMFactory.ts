import { LLMProvider } from './interfaces/LLMProvider';
import { OpenAIProvider } from './OpenAIProvider';
import { EncryptionUtil } from '../../utils/EncryptionUtil';

interface AIConfig {
  provider: string;
  apiKey: string; // Encrypted
  model?: string;
  baseUrl?: string;
}

export class LLMFactory {
  static createProvider(config: AIConfig): LLMProvider {
    const decryptedKey = EncryptionUtil.decrypt(config.apiKey);
    
    switch (config.provider.toLowerCase()) {
      case 'openai':
        return new OpenAIProvider(decryptedKey, config.model || 'gpt-4o', config.baseUrl);
      
      case 'deepseek':
        // DeepSeek is API-compatible with OpenAI
        return new OpenAIProvider(decryptedKey, config.model || 'deepseek-chat', config.baseUrl || 'https://api.deepseek.com/v1');
      
      case 'anthropic':
        throw new Error('Anthropic provider not implemented yet');

      default:
        throw new Error(`Unsupported AI provider: ${config.provider}`);
    }
  }
}
