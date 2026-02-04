import axios, { AxiosInstance, AxiosError } from 'axios';
import { LLMProvider, LLMMessage, LLMResponse, ToolDefinition, ToolCall } from './interfaces/LLMProvider';
import { AppError } from '../../utils/AppError';
import { StatusCodes } from 'http-status-codes';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export class OpenAIProvider implements LLMProvider {
  private client: AxiosInstance;
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-4o', baseUrl: string = 'https://api.openai.com/v1') {
    this.model = model;
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 120000 // 2 minutes timeout for AI calls
    });
  }

  /**
   * Sleep helper for retry delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if error is retryable (network errors, timeouts, 5xx errors)
   */
  private isRetryableError(error: AxiosError): boolean {
    // Network errors (ECONNRESET, ETIMEDOUT, etc.)
    if (!error.response) {
      return true;
    }
    // Server errors (5xx)
    const status = error.response.status;
    return status >= 500 && status < 600;
  }

  /**
   * Convert error to appropriate AppError
   */
  private handleError(error: unknown): never {
    const axiosError = error as AxiosError<{ error?: { message?: string; code?: string } }>;
    const errorMessage = axiosError.response?.data?.error?.message || axiosError.message || 'Failed to communicate with AI provider';
    const errorCode = axiosError.response?.data?.error?.code;
    
    console.error('[OpenAIProvider] Final Error:', {
      status: axiosError.response?.status,
      message: errorMessage,
      code: errorCode,
      url: axiosError.config?.url,
      baseURL: axiosError.config?.baseURL
    });

    // Map HTTP status to appropriate error
    const status = axiosError.response?.status;
    if (status === 401) {
      throw new AppError('AI_UNAUTHORIZED', StatusCodes.UNAUTHORIZED, {
        message: 'Invalid API Key. Please check your AI provider configuration.',
        params: { provider: this.model }
      });
    }
    if (status === 403) {
      throw new AppError('AI_FORBIDDEN', StatusCodes.FORBIDDEN, {
        message: 'API access denied. Your API key may not have the required permissions.',
        params: { provider: this.model }
      });
    }
    if (status === 404) {
      throw new AppError('AI_MODEL_NOT_FOUND', StatusCodes.NOT_FOUND, {
        message: `Model "${this.model}" not found. Please check if the model is available.`,
        params: { model: this.model }
      });
    }
    if (status === 429) {
      throw new AppError('AI_RATE_LIMIT', StatusCodes.TOO_MANY_REQUESTS, {
        message: 'API rate limit exceeded. Please try again later.',
        params: { provider: this.model }
      });
    }

    throw new AppError('AI_PROVIDER_ERROR', StatusCodes.BAD_GATEWAY, {
      message: errorMessage,
      params: { 
        provider: this.model,
        code: errorCode 
      }
    });
  }

  async chat(messages: LLMMessage[], tools?: ToolDefinition[]): Promise<LLMResponse> {
    let lastError: unknown = null;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await this.executeChat(messages, tools);
      } catch (error: unknown) {
        lastError = error;
        
        // Check if it's an AxiosError and retryable
        const isAxiosError = error && typeof error === 'object' && 'isAxiosError' in error;
        if (isAxiosError && attempt < MAX_RETRIES && this.isRetryableError(error as AxiosError)) {
          const axiosError = error as AxiosError;
          const delay = RETRY_DELAY_MS * attempt; // Exponential backoff
          console.warn(`[OpenAIProvider] Request failed (attempt ${attempt}/${MAX_RETRIES}), retrying in ${delay}ms...`, {
            message: axiosError.message,
            code: axiosError.code
          });
          await this.sleep(delay);
          continue;
        }
        
        // Not retryable or max retries reached, convert to AppError and throw
        this.handleError(error);
      }
    }
    
    // Should not reach here, but just in case
    this.handleError(lastError);
    throw new Error('Unexpected error'); // TypeScript needs this
  }

  private async executeChat(messages: LLMMessage[], tools?: ToolDefinition[]): Promise<LLMResponse> {
    // 转换消息格式为 OpenAI API 格式
    const apiMessages = messages.map(msg => {
      if (msg.role === 'tool') {
        return {
          role: 'tool' as const,
          content: msg.content,
          tool_call_id: msg.tool_call_id
        };
      }
      if (msg.role === 'assistant' && msg.tool_calls) {
        return {
          role: 'assistant' as const,
          content: msg.content || null,
          tool_calls: msg.tool_calls
        };
      }
      return {
        role: msg.role,
        content: msg.content
      };
    });

    const payload: any = {
      model: this.model,
      messages: apiMessages,
      temperature: 0.7,
    };

    if (tools && tools.length > 0) {
      payload.tools = tools;
      payload.tool_choice = "auto";
    }

    const response = await this.client.post('/chat/completions', payload);
    const data = response.data;
    const message = data.choices[0].message;
    const finishReason = data.choices[0].finish_reason;

    // 解析 tool_calls
    let toolCalls: ToolCall[] | undefined;
    if (message.tool_calls && message.tool_calls.length > 0) {
      toolCalls = message.tool_calls.map((tc: any) => ({
        id: tc.id,
        type: tc.type,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments
        }
      }));
    }

    return {
      content: message.content || '',
      tool_calls: toolCalls,
      finish_reason: finishReason === 'tool_calls' ? 'tool_calls' : 
                     finishReason === 'stop' ? 'stop' :
                     finishReason === 'length' ? 'length' : 'stop',
      usage: {
        totalTokens: data.usage?.total_tokens || 0,
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0
      }
    };
  }

  async checkHealth(): Promise<boolean> {
    try {
      // Small test request
      await this.client.post('/chat/completions', {
        model: this.model,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1
      });
      return true;
    } catch (_error) {
      return false;
    }
  }

  async getModels(): Promise<string[]> {
    try {
      const response = await this.client.get('/models');
      const data = response.data;
      if (Array.isArray(data.data)) {
        return data.data.map((m: any) => m.id);
      }
      return [];
    } catch (error) {
      console.error('[OpenAIProvider] Failed to fetch models:', error);
      return [];
    }
  }
}
