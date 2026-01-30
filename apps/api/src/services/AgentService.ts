import { prisma } from '@subcare/database';
import { LLMFactory } from '../infrastructure/ai/LLMFactory';
import { LLMMessage } from '../infrastructure/ai/interfaces/LLMProvider';
import { EncryptionUtil } from '../utils/EncryptionUtil';
import { AppError } from '../utils/AppError';
import { StatusCodes } from 'http-status-codes';

interface AIRecommendationRequest {
  userId: string;
  focus?: string; // e.g. "save_money", "discover_tools"
  forceRefresh?: boolean;
}

export class AgentService {
  
  /**
   * Configure or Update AI Provider for User
   */
  async configureAI(userId: string, data: { provider: string, apiKey: string, model?: string, baseUrl?: string }) {
    // 1. Encrypt API Key
    const encryptedKey = EncryptionUtil.encrypt(data.apiKey);

    // 2. Upsert config
    return prisma.userAIConfig.upsert({
      where: {
        userId_provider: {
          userId,
          provider: data.provider
        }
      },
      update: {
        apiKey: encryptedKey,
        model: data.model,
        baseUrl: data.baseUrl,
        isActive: true
      },
      create: {
        userId,
        provider: data.provider,
        apiKey: encryptedKey,
        model: data.model,
        baseUrl: data.baseUrl,
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
   * Generate Subscription Recommendations
   */
  async getRecommendations(req: AIRecommendationRequest) {
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
        // If cached is older than today, we proceed to refresh automatically
      }
    }

    // 2. Get User's Active AI Config
    const config = await prisma.userAIConfig.findFirst({
      where: { userId: req.userId, isActive: true }
    });

    if (!config) {
      throw new AppError('AI_NOT_CONFIGURED', StatusCodes.BAD_REQUEST, { 
        message: 'Please configure an AI provider first (OpenAI or DeepSeek)' 
      });
    }

    // 2. Gather User Context
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

    // 3. Build Prompt
    const totalSpent = subscriptions.reduce((sum, sub) => sum + Number(sub.price), 0); // Simplified (ignore currency conversion for MVP prompt)
    
    const context = {
      userProfile: {
        baseCurrency: user.currency,
        monthlyBudget: Number(user.monthlyBudget),
        currentTotalMonthlySpend: totalSpent
      },
      subscriptions: subscriptions
    };

    const systemPrompt = `
You are SubCare AI, an expert subscription manager and financial advisor.
Your goal is to analyze the user's subscriptions and provide actionable recommendations.

User's Base Currency: ${user.currency}
IMPORTANT: All monetary values (prices, savings) MUST be converted to ${user.currency}.
If you are unsure about the exact exchange rate, use a reasonable approximation.

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
      "potentialSavings": number (numeric value in ${user.currency})
    }
  ],
  "recommendations": [
    {
      "name": "Service Name",
      "reason": { "en": "...", "zh": "..." },
      "price": {
        "en": "Price in ${user.currency} (Format: 'CNY 70/mo', use ISO code)",
        "zh": "价格 (${user.currency}) (格式: 'CNY 70/月', 使用ISO代码)"
      },
      "save": {
        "en": "Savings in ${user.currency} (Format: 'CNY 20/mo', use ISO code)",
        "zh": "节省金额 (格式: 'CNY 20/月', 使用ISO代码)"
      },
      "link": "URL to official website or plan page (e.g. 'https://www.spotify.com/premium')",
      "icon": "Emoji icon representing the service (e.g. 🎵, 🎬)"
    }
  ]
}
`;

    const userMessage = `
Here is my current subscription data:
${JSON.stringify(context, null, 2)}

User Focus: ${req.focus || 'General Audit'}
Please analyze and provide recommendations.
`;

    // 4. Call AI
    const provider = LLMFactory.createProvider({
      provider: config.provider,
      apiKey: config.apiKey, // Factory handles decryption
      model: config.model || undefined,
      baseUrl: config.baseUrl || undefined
    });

    const response = await provider.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ]);

    // 5. Parse JSON
    try {
      // Clean markdown if present (```json ... ```)
      const cleanJson = response.content.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedContent = JSON.parse(cleanJson);

      // Upsert to Cache Table
      try {
        await prisma.aIRecommendation.upsert({
          where: { userId: req.userId },
          update: { 
            content: parsedContent,
            updatedAt: new Date() // Reset updated time
          },
          create: {
            userId: req.userId,
            content: parsedContent
          }
        });
      } catch (dbError) {
        console.warn('Failed to cache AI recommendation:', dbError);
        // Don't fail the request if caching fails
      }

      return parsedContent;
    } catch (e) {
      console.error('AI Response Parse Error:', response.content);
      throw new AppError('AI_RESPONSE_ERROR', StatusCodes.INTERNAL_SERVER_ERROR, { 
        message: 'Failed to parse AI response',
        params: { raw: response.content }
      });
    }
  }
}
