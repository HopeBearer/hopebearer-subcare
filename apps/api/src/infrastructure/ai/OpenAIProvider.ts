import axios, { AxiosInstance, AxiosError } from 'axios';
import { LLMProvider, LLMMessage, LLMResponse, ToolDefinition, ToolCall, StreamCallbacks } from './interfaces/LLMProvider';
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
   * Safely serialize response data for logging (avoid circular reference errors with streams)
   */
  private safeStringifyResponseData(data: unknown): string {
    if (!data) return '{}';
    // Stream objects (from responseType: 'stream') have circular refs — skip them
    if (typeof data === 'object' && data !== null && typeof (data as any).on === 'function') {
      return '[Stream object - not serializable]';
    }
    try {
      return JSON.stringify(data).substring(0, 500);
    } catch {
      return '[Unable to serialize response data]';
    }
  }

  /**
   * Safely extract error details from Axios error response
   * For streaming requests, response.data is a Stream (not parsed JSON),
   * so we can't directly access .error.message etc.
   */
  private extractErrorDetails(axiosError: AxiosError): {
    message: string;
    code?: string;
    type?: string;
  } {
    const responseData = axiosError.response?.data;
    // If responseData is a parsed object (non-streaming error), extract fields
    if (responseData && typeof responseData === 'object' && !(typeof (responseData as any).on === 'function')) {
      const data = responseData as { error?: { message?: string; code?: string; type?: string } };
      return {
        message: data.error?.message || axiosError.message || 'Failed to communicate with AI provider',
        code: data.error?.code,
        type: data.error?.type,
      };
    }
    // For stream errors or missing data, fall back to axios error message
    return {
      message: axiosError.message || 'Failed to communicate with AI provider',
    };
  }

  /**
   * Convert error to appropriate AppError
   */
  private handleError(error: unknown): never {
    const axiosError = error as AxiosError;
    const { message: errorMessage, code: errorCode, type: errorType } = this.extractErrorDetails(axiosError);
    
    console.error('[OpenAIProvider] Final Error:', {
      status: axiosError.response?.status,
      message: errorMessage,
      code: errorCode,
      type: errorType,
      url: axiosError.config?.url,
      baseURL: axiosError.config?.baseURL,
      responseData: this.safeStringifyResponseData(axiosError.response?.data)
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

  /**
   * 流式聊天请求
   */
  async chatStream(
    messages: LLMMessage[], 
    callbacks: StreamCallbacks,
    tools?: ToolDefinition[]
  ): Promise<LLMResponse> {
    // 转换消息格式
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
      stream: true
    };

    if (tools && tools.length > 0) {
      payload.tools = tools;
      payload.tool_choice = "auto";
    }

    try {
      const response = await this.client.post('/chat/completions', payload, {
        responseType: 'stream'
      });

      let content = '';
      let toolCalls: ToolCall[] = [];
      let finishReason: string = 'stop';
      const toolCallsInProgress: Map<number, { id: string; type: string; name: string; arguments: string }> = new Map();

      return new Promise((resolve, reject) => {
        let buffer = '';

        response.data.on('data', (chunk: Buffer) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;
              const finish = parsed.choices?.[0]?.finish_reason;

              if (finish) {
                finishReason = finish;
              }

              if (delta?.content) {
                content += delta.content;
                callbacks.onChunk?.(delta.content);
              }

              // Handle streaming tool calls
              if (delta?.tool_calls) {
                for (const tc of delta.tool_calls) {
                  const index = tc.index;
                  
                  if (!toolCallsInProgress.has(index)) {
                    toolCallsInProgress.set(index, {
                      id: tc.id || '',
                      type: tc.type || 'function',
                      name: tc.function?.name || '',
                      arguments: ''
                    });
                  }
                  
                  const existing = toolCallsInProgress.get(index)!;
                  
                  if (tc.id) existing.id = tc.id;
                  if (tc.function?.name) {
                    existing.name = tc.function.name;
                    // Notify tool call started
                    callbacks.onToolCall?.({
                      id: existing.id,
                      type: 'function',
                      function: { name: existing.name, arguments: '' }
                    }, 'started');
                  }
                  if (tc.function?.arguments) {
                    existing.arguments += tc.function.arguments;
                  }
                }
              }
            } catch (e) {
              // Ignore parse errors for partial JSON
            }
          }
        });

        response.data.on('end', () => {
          // Convert toolCallsInProgress to array
          toolCalls = Array.from(toolCallsInProgress.values()).map(tc => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.name,
              arguments: tc.arguments
            }
          }));

          resolve({
            content,
            tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
            finish_reason: finishReason === 'tool_calls' ? 'tool_calls' : 
                          finishReason === 'stop' ? 'stop' :
                          finishReason === 'length' ? 'length' : 'stop'
          });
        });

        response.data.on('error', (error: Error) => {
          reject(error);
        });
      });
    } catch (error) {
      this.handleError(error);
    }
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
