export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;  // Required when role is 'tool'
  tool_calls?: ToolCall[]; // Present in assistant messages that request tool calls
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface LLMResponse {
  content: string;
  tool_calls?: ToolCall[];
  finish_reason?: 'stop' | 'tool_calls' | 'length' | 'content_filter';
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

  /**
   * 获取可用模型列表
   */
  getModels(): Promise<string[]>;
}
