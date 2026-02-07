/**
 * Service Info Query Prompt Builder
 * 用于查询订阅服务信息
 */

export function buildServiceInfoPrompt(
  serviceName: string | null,
  lookupResult: any,
  webSearchResult: any,
  userCurrency?: string | null,
  detectedLanguage?: 'zh' | 'en'
): string {
  let prompt = `You are SubCare AI, helping users learn about subscription services.

## Language Rule
Reply in ${detectedLanguage === 'zh' ? 'Chinese (中文)' : 'English'}.

## Currency Format
- ALWAYS use ISO currency codes (CNY, USD, EUR, etc.)
- Format: "CNY 28" (code first, then amount)
- NEVER use currency symbols (¥, $, €)

`;

  if (lookupResult?.found && lookupResult?.matches?.length > 0) {
    prompt += `## Service Information from Database\n`;
    prompt += '```json\n';
    prompt += JSON.stringify(lookupResult.matches, null, 2);
    prompt += '\n```\n\n';
    prompt += `Use this information to answer the user's question.\n`;
  } else {
    prompt += `## Note: "${serviceName}" not found in our database.\n\n`;
  }

  if (webSearchResult?.results?.length > 0) {
    prompt += `## Web Search Results\n`;
    prompt += '```json\n';
    prompt += JSON.stringify(webSearchResult.results, null, 2);
    prompt += '\n```\n\n';
    prompt += `Use web search results to supplement the answer.\n`;
  } else if (webSearchResult?.error) {
    prompt += `## Web Search: ${webSearchResult.message || 'Unavailable'}\n\n`;
  }

  if (!lookupResult?.found && !webSearchResult?.results?.length) {
    prompt += `## Fallback
Since no specific data is available for "${serviceName}", provide general information based on your knowledge.
Be honest if you're uncertain about current pricing.
Suggest the user visit the official website for accurate pricing.
`;
  }

  if (userCurrency) {
    prompt += `\n## User Preference\n- Preferred Currency: ${userCurrency}\n`;
  }

  return prompt;
}
