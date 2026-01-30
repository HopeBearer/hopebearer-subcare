import axios, { AxiosInstance } from 'axios';
import { LLMProvider, LLMMessage, LLMResponse, ToolDefinition } from './interfaces/LLMProvider';

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
      }
    });
  }

  async chat(messages: LLMMessage[], tools?: ToolDefinition[]): Promise<LLMResponse> {
    try {
      const payload: any = {
        model: this.model,
        messages: messages,
        temperature: 0.7,
      };

      if (tools && tools.length > 0) {
        payload.tools = tools;
        payload.tool_choice = "auto";
      }

      const response = await this.client.post('/chat/completions', payload);
      const data = response.data;

      return {
        content: data.choices[0].message.content || '',
        usage: {
          totalTokens: data.usage?.total_tokens || 0,
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0
        }
      };
    } catch (error: any) {
      console.error('[OpenAIProvider] Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || 'Failed to communicate with AI provider');
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
    } catch (error) {
      return false;
    }
  }
}
