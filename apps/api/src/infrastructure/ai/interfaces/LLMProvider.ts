export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
  };
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>; // JSON Schema
  };
}

export interface LLMProvider {
  /**
   * 发送聊天请求
   */
  chat(messages: LLMMessage[], tools?: ToolDefinition[]): Promise<LLMResponse>;
  
  /**
   * 检查 API Key 是否有效
   */
  checkHealth(): Promise<boolean>;
}
