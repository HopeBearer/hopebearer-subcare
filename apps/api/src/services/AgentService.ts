import { prisma } from '@subcare/database';
import { LLMFactory } from '../infrastructure/ai/LLMFactory';
import { LLMMessage, LLMResponse, ToolDefinition } from '../infrastructure/ai/interfaces/LLMProvider';
import { EncryptionUtil } from '../utils/EncryptionUtil';
import { AppError } from '../utils/AppError';
import { calculateMonthlyEquivalent } from '../utils/billing-utils';
import { StatusCodes } from 'http-status-codes';
import { ToolExecutor } from '../infrastructure/ai/tools/ToolExecutor';
import { TOOL_DEFINITIONS } from '../infrastructure/ai/tools/ToolDefinitions';
import { CurrencyService } from './CurrencyService';
import { DashboardService } from './DashboardService';

interface AIRecommendationRequest {
  userId: string;
  focus?: string; // e.g. "save_money", "discover_tools"
  forceRefresh?: boolean;
  cacheOnly?: boolean;
}

// Progress callback for WebSocket updates
export interface AIProgressEvent {
  stage: 'started' | 'tool_call' | 'tool_result' | 'generating' | 'completed' | 'error';
  messageKey: string;  // i18n key for frontend translation
  toolName?: string;
  loop?: number;
  data?: any;
}

export type AIProgressCallback = (event: AIProgressEvent) => void;

interface AgentServiceDeps {
  toolExecutor: ToolExecutor;
  currencyService: CurrencyService;
  dashboardService?: DashboardService;
}

// Tool call limits
const MAX_TOOL_CALLS = 8;
const MAX_SEARCH_CALLS = 2;

export class AgentService {
  private toolExecutor: ToolExecutor | null = null;
  private currencyService: CurrencyService | null = null;
  private dashboardService: DashboardService | null = null;

  /**
   * 设置依赖（用于依赖注入）
   */
  setDependencies(deps: AgentServiceDeps) {
    this.toolExecutor = deps.toolExecutor;
    this.currencyService = deps.currencyService;
    this.dashboardService = deps.dashboardService || null;
  }
  
  /**
   * Configure or Update AI Provider for User
   * 
   * @param userId - User ID
   * @param data - Configuration data
   *   - provider: Provider slug (e.g., 'openai', 'deepseek')
   *   - providerId: Provider ID (optional, will be looked up from slug if not provided)
   *   - apiKey: User's API Key
   *   - model: Selected model ID
   *   - baseUrl: Custom base URL (optional, will use provider's default if not provided)
   */
  async configureAI(userId: string, data: { 
    provider: string;
    providerId?: string;
    apiKey: string;
    model?: string;
    baseUrl?: string;
  }) {
    // 1. Encrypt API Key
    const encryptedKey = EncryptionUtil.encrypt(data.apiKey);

    // 2. Resolve providerId and baseUrl from AIProvider if not provided
    let providerId = data.providerId;
    let resolvedBaseUrl = data.baseUrl;

    if (!providerId || !resolvedBaseUrl) {
      // Look up provider by slug
      const providerRecord = await prisma.aIProvider.findUnique({
        where: { slug: data.provider }
      });

      if (providerRecord) {
        if (!providerId) {
          providerId = providerRecord.id;
        }
        if (!resolvedBaseUrl) {
          resolvedBaseUrl = providerRecord.baseUrl;
        }
      }
    }

    // 3. Deactivate other configs for this user
    await prisma.userAIConfig.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false }
    });

    // 4. Upsert config
    return prisma.userAIConfig.upsert({
      where: {
        userId_provider: {
          userId,
          provider: data.provider
        }
      },
      update: {
        apiKey: encryptedKey,
        providerId,
        model: data.model,
        baseUrl: resolvedBaseUrl,
        isActive: true
      },
      create: {
        userId,
        provider: data.provider,
        providerId,
        apiKey: encryptedKey,
        model: data.model,
        baseUrl: resolvedBaseUrl,
        isActive: true
      }
    });
  }

  /**
   * Get AI Config (Masked)
   */
  async getConfig(userId: string) {
    const configs = await prisma.userAIConfig.findMany({
      where: { userId }
    });

    return configs.map(c => ({
      provider: c.provider,
      model: c.model,
      baseUrl: c.baseUrl,
      isActive: c.isActive,
      isConfigured: true // Don't return API Key
    }));
  }

  /**
   * Fetch available models from the provider
   */
  async getModels(data: { provider?: string, apiKey?: string, baseUrl?: string, userId?: string }) {
    let { provider, apiKey, baseUrl } = data;
    const { userId } = data;
    let isEncrypted = false;
    let apiFormat: string = 'OPENAI'; // Default to OpenAI format

    // If userId provided but no apiKey/provider, try to load from saved config
    if (userId && (!apiKey || !provider)) {
       const activeConfig = await prisma.userAIConfig.findFirst({
         where: { userId, isActive: true },
         include: { aiProvider: true }
       });
       if (activeConfig) {
          if (!provider) provider = activeConfig.provider;
          if (!apiKey) {
            apiKey = activeConfig.apiKey; // This is encrypted!
            isEncrypted = true;
          }
          if (!baseUrl) baseUrl = activeConfig.baseUrl || activeConfig.aiProvider?.baseUrl || undefined;
          // Get apiFormat from aiProvider
          apiFormat = (activeConfig.aiProvider as { apiFormat?: string } | null)?.apiFormat || 'OPENAI';
       }
    }

    if (!provider || !apiKey) {
        throw new AppError('MISSING_CREDENTIALS', StatusCodes.BAD_REQUEST, {
            message: 'Provider and API Key are required (or configure them in settings)'
         });
    }

    // Lookup provider from database to get baseUrl and apiFormat
    if (!baseUrl) {
      const providerFromDb = await prisma.aIProvider.findFirst({
        where: { slug: provider }
      });
      if (providerFromDb) {
        baseUrl = providerFromDb.baseUrl;
        apiFormat = (providerFromDb as { apiFormat?: string }).apiFormat || 'OPENAI';
      }
    }

    if (!baseUrl) {
      throw new AppError('AI_PROVIDER_ERROR', StatusCodes.BAD_REQUEST, {
        message: `Provider "${provider}" not found in database or missing baseUrl.`
      });
    }

    // LLMFactory expects ENCRYPTED key because it decrypts it internally.
    const finalApiKey = isEncrypted ? apiKey : EncryptionUtil.encrypt(apiKey);
    
    // Note: For getModels, we use a placeholder model since we're just fetching the list
    const llmProvider = LLMFactory.createProvider({
      apiKey: finalApiKey,
      model: 'placeholder', // Not used for getModels call
      baseUrl: baseUrl,
      apiFormat: apiFormat as 'OPENAI' | 'ANTHROPIC' | 'CUSTOM',
      providerSlug: provider
    });

    return await llmProvider.getModels();
  }

  /**
   * Generate Subscription Recommendations (with Tool Calling support)
   * @param req - Request parameters
   * @param onProgress - Optional callback for WebSocket progress updates
   */
  async getRecommendations(
    req: AIRecommendationRequest & { model?: string },
    onProgress?: AIProgressCallback
  ) {
    // Notify start
    onProgress?.({ stage: 'started', messageKey: 'ai.progress.preparing' });
    
    // 1. Check Cache if not forcing refresh
    if (!req.forceRefresh) {
      const cached = await prisma.aIRecommendation.findUnique({
        where: { userId: req.userId }
      });

      if (cached) {
        const today = new Date().toDateString();
        const cachedDate = cached.updatedAt.toDateString();
        
        // If cached today, return it
        if (today === cachedDate) {
          return cached.content;
        }
      }

      if (req.cacheOnly) {
        throw new AppError('AI_RECOMMENDATION_CACHE_MISS', StatusCodes.NOT_FOUND, {
          message: 'No cached recommendation for today'
        });
      }
    }

    // 2. Get User's Active AI Config with AIProvider relation
    const config = await prisma.userAIConfig.findFirst({
      where: { userId: req.userId, isActive: true },
      include: {
        aiProvider: true  // Include the related AIProvider to get baseUrl
      }
    });

    if (!config) {
      throw new AppError('AI_NOT_CONFIGURED', StatusCodes.BAD_REQUEST, { 
        message: 'Please configure an AI provider first (OpenAI or DeepSeek)' 
      });
    }

    // 2.1 Resolve the correct baseUrl and apiFormat from AIProvider
    // Priority: config.baseUrl > aiProvider.baseUrl
    let resolvedBaseUrl = config.baseUrl;
    // Type assertion for apiFormat since Prisma client might not be regenerated yet
    let resolvedApiFormat: string | undefined = (config.aiProvider as { apiFormat?: string } | null)?.apiFormat;
    
    if (!resolvedBaseUrl && config.aiProvider) {
      resolvedBaseUrl = config.aiProvider.baseUrl;
    }
    
    // If no aiProvider relation, lookup by slug for backward compatibility
    if (!resolvedBaseUrl || !resolvedApiFormat) {
      const providerFromDb = await prisma.aIProvider.findFirst({
        where: { slug: config.provider }
      });
      if (providerFromDb) {
        if (!resolvedBaseUrl) resolvedBaseUrl = providerFromDb.baseUrl;
        if (!resolvedApiFormat) resolvedApiFormat = (providerFromDb as { apiFormat?: string }).apiFormat;
      }
    }
    
    // Validate required fields
    if (!resolvedBaseUrl) {
      throw new AppError('AI_PROVIDER_ERROR', StatusCodes.BAD_REQUEST, {
        message: `Provider "${config.provider}" not found in database. Please configure the provider first.`
      });
    }
    
    // Default to OPENAI format for backward compatibility
    const apiFormat = resolvedApiFormat || 'OPENAI';

    // 3. Gather User Context
    const subscriptions = await prisma.subscription.findMany({
      where: { userId: req.userId, status: 'ACTIVE' },
      select: {
        name: true,
        price: true,
        currency: true,
        billingCycle: true,
        categoryName: true,
        description: true,
        usage: true
      }
    });

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        currency: true,
        monthlyBudget: true
      }
    });

    if (!user) throw new Error('User not found');

    // 4. Pre-convert subscription prices to user's base currency
    const normalizedSubscriptions = await this.normalizeSubscriptionCurrencies(
      subscriptions,
      user.currency
    );

    const normalizedWithMonthly = normalizedSubscriptions.map(sub => ({
      ...sub,
      monthlyEquivalent: calculateMonthlyEquivalent(
        sub.convertedPrice,
        String(sub.billingCycle || 'monthly')
      )
    }));

    // Calculate monthly-equivalent total for consistent comparisons
    const totalSpent = normalizedWithMonthly.reduce(
      (sum, sub) => sum + sub.monthlyEquivalent,
      0
    );

    // Also get actual payment total from DashboardService for reference
    // This ensures the AI knows both perspectives: ongoing cost vs actual this-month payment
    let actualMonthlyPayment: number | undefined;
    try {
      if (this.dashboardService) {
        const dashboardStats = await this.dashboardService.getStats(req.userId);
        actualMonthlyPayment = Number(dashboardStats.expenses.total.amount.toFixed(2));
      }
    } catch (e) {
      console.warn('[AgentService] Failed to get actual monthly payment:', e);
    }
    
    const context = {
      userProfile: {
        baseCurrency: user.currency,
        monthlyBudget: Number(user.monthlyBudget),
        currentTotalMonthlySpend: Number(totalSpent.toFixed(2)),
        currentTotalMonthlySpendNote: 'Monthly-equivalent total (annual plans divided by 12, etc.)',
        ...(actualMonthlyPayment !== undefined && {
          actualMonthlyPayment,
          actualMonthlyPaymentNote: 'Actual payment records this month (matches dashboard total)'
        })
      },
      subscriptions: normalizedWithMonthly.map(sub => ({
        name: sub.name,
        price: sub.convertedPrice,
        monthlyEquivalent: Number(sub.monthlyEquivalent.toFixed(2)),
        originalPrice: sub.originalPrice,
        originalCurrency: sub.originalCurrency,
        currency: user.currency,
        billingCycle: sub.billingCycle,
        categoryName: sub.categoryName,
        description: sub.description,
        usage: sub.usage
      }))
    };

    // 5. Build System Prompt with Tool Instructions
    const systemPrompt = this.buildSystemPrompt(user.currency, this.toolExecutor !== null);

    const userMessage = `
Here is my current subscription data (prices already converted to ${user.currency}):
${JSON.stringify(context, null, 2)}

User Focus: ${req.focus || 'General Audit'}
Please analyze and provide recommendations.
`;

    // 6. Create LLM Provider (data-driven, no hardcoded provider logic)
    const selectedModel = req.model || config.model;
    if (!selectedModel) {
      throw new AppError('AI_MODEL_ERROR', StatusCodes.BAD_REQUEST, {
        message: 'No AI model selected. Please configure a model in settings.'
      });
    }
    
    const llmProvider = LLMFactory.createProvider({
      apiKey: config.apiKey,
      model: selectedModel,
      baseUrl: resolvedBaseUrl,
      apiFormat: apiFormat as 'OPENAI' | 'ANTHROPIC' | 'CUSTOM',
      providerSlug: config.provider  // For logging only
    });
    
    onProgress?.({ stage: 'generating', messageKey: 'ai.progress.connecting' });

    // 7. Execute with Tool Calling Loop
    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ];

    // Only use tools if toolExecutor is available
    const tools = this.toolExecutor ? TOOL_DEFINITIONS : undefined;
    
    const finalResponse = await this.executeWithToolLoop(
      llmProvider,
      messages,
      tools,
      req.userId,
      onProgress  // Pass progress callback
    );

    // 8. Parse JSON Response
    try {
      const parsedContent = this.extractJsonFromResponse(finalResponse);

      // 8.1 Validate and clamp savings to prevent unreasonable values
      this.validateAndClampSavings(parsedContent, totalSpent);

      // Upsert to Cache Table
      try {
        await prisma.aIRecommendation.upsert({
          where: { userId: req.userId },
          update: { 
            content: parsedContent,
            updatedAt: new Date()
          },
          create: {
            userId: req.userId,
            content: parsedContent
          }
        });
      } catch (dbError) {
        console.warn('Failed to cache AI recommendation:', dbError);
      }

      return parsedContent;
    } catch (e) {
      console.error('AI Response Parse Error:', finalResponse);
      throw new AppError('AI_RESPONSE_ERROR', StatusCodes.INTERNAL_SERVER_ERROR, { 
        message: 'Failed to parse AI response',
        params: { raw: finalResponse }
      });
    }
  }

  /**
   * Extract JSON from AI response that may contain extra text
   */
  private extractJsonFromResponse(response: string): any {
    // Try direct parse first (cleanest case)
    try {
      return JSON.parse(response.trim());
    } catch {
      // Continue with extraction
    }

    // Try to extract JSON from markdown code block
    const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1].trim());
      } catch {
        // Continue
      }
    }

    // Try to find JSON object by looking for { ... }
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // Continue
      }
    }

    // Last resort: try removing common prefixes and parse
    const cleanJson = response
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .replace(/^[\s\S]*?(\{)/m, '{') // Remove everything before first {
      .trim();
    
    return JSON.parse(cleanJson);
  }

  /**
   * Validate and clamp savings values to prevent unreasonable AI output.
   * Mutates the parsed content in-place.
   * 
   * Rules:
   * - Each potentialSavings must be >= 0
   * - Total savings must not exceed totalMonthlySpend
   * - If total exceeds limit, proportionally scale down all values
   */
  private validateAndClampSavings(content: any, totalMonthlySpend: number): void {
    if (!content?.insights || !Array.isArray(content.insights)) return;

    // 1. Clamp each individual value to >= 0
    for (const insight of content.insights) {
      if (typeof insight.potentialSavings === 'number') {
        insight.potentialSavings = Math.max(0, insight.potentialSavings);
      } else {
        insight.potentialSavings = 0;
      }
    }

    // 2. Check total against monthly spend
    const totalSavings = content.insights.reduce(
      (sum: number, i: any) => sum + (i.potentialSavings || 0), 0
    );

    if (totalSavings <= 0 || totalMonthlySpend <= 0) return;

    // Cap total savings at 80% of monthly spend (a realistic maximum)
    const maxAllowedSavings = totalMonthlySpend * 0.8;

    if (totalSavings > maxAllowedSavings) {
      // Proportionally scale down all savings
      const scaleFactor = maxAllowedSavings / totalSavings;
      for (const insight of content.insights) {
        if (insight.potentialSavings > 0) {
          insight.potentialSavings = Number((insight.potentialSavings * scaleFactor).toFixed(2));
        }
      }
      console.warn(
        `[AgentService] Savings clamped: AI claimed ${totalSavings.toFixed(2)} but monthly spend is ${totalMonthlySpend.toFixed(2)}. Scaled to ${maxAllowedSavings.toFixed(2)}`
      );
    }
  }

  /**
   * Build system prompt with or without tool instructions
   */
  private buildSystemPrompt(userCurrency: string, hasTools: boolean): string {
    const toolInstructions = hasTools ? `
## Available Tools
You have access to the following tools to enhance your analysis:

1. **convert_currency**: Convert amounts between currencies using real-time exchange rates
   - Use this when you need precise currency conversions

2. **search_web**: Search the internet for current pricing, promotions, or alternatives
   - Use sparingly (limited quota) - only for important price checks or finding alternatives
   - Good for: checking current promotion, finding cheaper alternatives

3. **get_subscription_history**: Query a user's subscription payment history
   - Use to detect price increases over time
   - Helps identify subscriptions that have become more expensive

**Tool Usage Guidelines:**
- Use tools only when necessary for accurate analysis
- Limit web searches to 1-2 per analysis (quota limited)
- Currency conversion is already done for the data provided, use tool only if additional conversion needed
- After using tools, incorporate the results into your final recommendation
` : '';

    return `
You are SubCare AI, an expert subscription manager and financial advisor.
Your goal is to analyze the user's subscriptions and provide actionable recommendations.
${toolInstructions}
User's Base Currency: ${userCurrency}
All prices in the subscription data have been pre-converted to ${userCurrency}.

## Savings Calculation Rules (CRITICAL)
- "potentialSavings" means how much LESS the user would pay per month if they follow your advice.
- It must be calculated as: (current monthly cost) - (recommended alternative monthly cost).
- potentialSavings MUST be >= 0. If no savings, set to 0.
- For each insight, potentialSavings MUST NOT exceed the monthlyEquivalent of the related subscription(s).
- The SUM of all potentialSavings across all insights MUST NOT exceed the user's currentTotalMonthlySpend.
- For "praise" type insights (things the user is doing well), set potentialSavings to 0.
- Only claim savings you can justify with concrete price comparisons. Do NOT invent or exaggerate numbers.
- If you are unsure about exact pricing, use conservative estimates or set potentialSavings to 0.

Output Format: JSON only. No markdown ticks.
IMPORTANT: You must provide content in both English ("en") and Chinese ("zh").

Schema:
{
  "summary": {
    "en": "Brief analysis (English)",
    "zh": "简要分析（中文）"
  },
  "insights": [
    {
      "type": "warning" | "suggestion" | "praise",
      "title": { "en": "...", "zh": "..." },
      "description": { "en": "...", "zh": "..." },
      "potentialSavings": number (monthly savings in ${userCurrency}, MUST be >= 0 and <= related subscription cost)
    }
  ],
  "recommendations": [
    {
      "name": "Service Name",
      "reason": { "en": "...", "zh": "..." },
      "price": {
        "en": "Price in ${userCurrency} (Format: 'CNY 70/mo', use ISO code)",
        "zh": "价格 (${userCurrency}) (格式: 'CNY 70/月', 使用ISO代码)"
      },
      "save": {
        "en": "Savings in ${userCurrency} (Format: 'CNY 20/mo', use ISO code)",
        "zh": "节省金额 (格式: 'CNY 20/月', 使用ISO代码)"
      },
      "link": "URL to official website or plan page (e.g. 'https://www.spotify.com/premium')",
      "icon": "Emoji icon representing the service (e.g. 🎵, 🎬)"
    }
  ]
}
`;
  }

  /**
   * Execute LLM call with tool calling loop
   * @param onProgress - Optional callback for WebSocket progress updates
   */
  private async executeWithToolLoop(
    provider: ReturnType<typeof LLMFactory.createProvider>,
    messages: LLMMessage[],
    tools: ToolDefinition[] | undefined,
    userId: string,
    onProgress?: AIProgressCallback
  ): Promise<string> {
    let toolCallCount = 0;
    let searchCallCount = 0;
    let loopCount = 0;
    const MAX_LOOP_COUNT = 10; // Safety limit to prevent infinite loops

    while (true) {
      loopCount++;
      
      // Safety check: prevent infinite loops
      if (loopCount > MAX_LOOP_COUNT) {
        onProgress?.({ stage: 'error', messageKey: 'ai.progress.timeout' });
        // Return whatever content we have from the last response, or a fallback message
        return messages.length > 0 
          ? (messages[messages.length - 1].content || '{"error": "Max iterations reached"}')
          : '{"error": "Max iterations reached"}';
      }

      // Disable tools if we've exceeded the limit
      const effectiveTools = toolCallCount >= MAX_TOOL_CALLS ? undefined : tools;
      
      onProgress?.({ 
        stage: 'generating', 
        messageKey: loopCount === 1 ? 'ai.progress.analyzing' : 'ai.progress.integrating',
        loop: loopCount 
      });
      
      const response = await provider.chat(messages, effectiveTools);

      // If no tool calls, return the final content
      if (!response.tool_calls || response.tool_calls.length === 0) {
        onProgress?.({ stage: 'completed', messageKey: 'ai.progress.completed' });
        return response.content;
      }

      // Check tool call limits
      toolCallCount += response.tool_calls.length;
      if (toolCallCount > MAX_TOOL_CALLS) {
        messages.push({
          role: 'system',
          content: 'Tool call limit reached. Please provide your final JSON recommendation now without using any more tools.'
        });
        continue;
      }

      // Add assistant message with tool calls to history
      messages.push({
        role: 'assistant',
        content: response.content || '',
        tool_calls: response.tool_calls
      });

      // Execute each tool call
      for (const toolCall of response.tool_calls) {
        // Notify progress: tool call starting
        onProgress?.({ 
          stage: 'tool_call', 
          messageKey: 'ai.progress.executing_tool',
          toolName: toolCall.function.name,
          loop: loopCount
        });

        // Check search limit
        if (toolCall.function.name === 'search_web') {
          searchCallCount++;
          if (searchCallCount > MAX_SEARCH_CALLS) {
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({
                error: 'SEARCH_LIMIT',
                message: 'Search limit reached for this analysis. Please use your internal knowledge.'
              })
            });
            continue;
          }
        }

        try {
          const params = JSON.parse(toolCall.function.arguments);

          const result = await this.toolExecutor!.execute(
            toolCall.function.name,
            params,
            { userId }
          );

          // Notify progress: tool call completed
          onProgress?.({ 
            stage: 'tool_result', 
            messageKey: 'ai.progress.tool_completed',
            toolName: toolCall.function.name,
            loop: loopCount
          });

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result)
          });
        } catch (error: any) {
          console.error(`[AgentService] Tool execution error:`, error);
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              error: 'EXECUTION_ERROR',
              message: error.message || 'Tool execution failed'
            })
          });
        }
      }
    }
  }

  /**
   * Normalize subscription currencies to user's base currency
   */
  private async normalizeSubscriptionCurrencies(
    subscriptions: Array<{
      name: string;
      price: any;
      currency: string;
      billingCycle: string;
      categoryName: string;
      description: string | null;
      usage: string;
    }>,
    targetCurrency: string
  ): Promise<Array<{
    name: string;
    originalPrice: number;
    originalCurrency: string;
    convertedPrice: number;
    billingCycle: string;
    categoryName: string;
    description: string | null;
    usage: string;
  }>> {
    const results = [];

    for (const sub of subscriptions) {
      const originalPrice = Number(sub.price);
      let convertedPrice = originalPrice;

      if (sub.currency !== targetCurrency && this.currencyService) {
        try {
          convertedPrice = await this.currencyService.convert(
            originalPrice,
            sub.currency,
            targetCurrency
          );
        } catch (error) {
          console.warn(`[AgentService] Currency conversion failed for ${sub.name}:`, error);
          // Keep original price if conversion fails
        }
      }

      results.push({
        name: sub.name,
        originalPrice,
        originalCurrency: sub.currency,
        convertedPrice: Number(convertedPrice.toFixed(2)),
        billingCycle: sub.billingCycle,
        categoryName: sub.categoryName,
        description: sub.description,
        usage: sub.usage
      });
    }

    return results;
  }
}
