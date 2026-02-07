// Tool display configuration and helper functions
// This file contains the tool name mappings and result parsing utilities

export interface ToolResultItem {
  label: string;
  value: string;
}

// Tool display names mapping for i18n keys
export const TOOL_NAME_KEYS: Record<string, string> = {
  'lookup_subscription_service': 'lookup_subscription_service',
  'quick_add_subscription': 'quick_add_subscription',
  'search_my_subscriptions': 'search_my_subscriptions',
  'cancel_subscription': 'cancel_subscription',
  'get_subscription_history': 'get_subscription_history',
  'get_spending_summary': 'get_spending_summary',
  'convert_currency': 'convert_currency',
  'search_web': 'search_web',
  'update_subscription': 'update_subscription',
  'pause_subscription': 'pause_subscription',
  'resume_subscription': 'resume_subscription',
  'get_upcoming_renewals': 'get_upcoming_renewals',
  'list_categories': 'list_categories',
  'get_pending_bills': 'get_pending_bills',
  'confirm_bill_payment': 'confirm_bill_payment',
  'update_bill': 'update_bill'
};

// Tool icons mapping
export const TOOL_ICONS: Record<string, string> = {
  'lookup_subscription_service': '🔍',
  'quick_add_subscription': '➕',
  'search_my_subscriptions': '📋',
  'cancel_subscription': '❌',
  'get_subscription_history': '📊',
  'get_spending_summary': '💰',
  'convert_currency': '💱',
  'search_web': '🌐',
  'update_subscription': '✏️',
  'pause_subscription': '⏸️',
  'resume_subscription': '▶️',
  'get_upcoming_renewals': '📅',
  'list_categories': '📁',
  'get_pending_bills': '🧾',
  'confirm_bill_payment': '✅',
  'update_bill': '🛠️'
};

// Get tool icon by name
export function getToolIcon(toolName: string): string {
  return TOOL_ICONS[toolName] || '🔧';
}

// Format duration in human-readable format
export function formatDuration(ms?: number): string {
  if (!ms) return '';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// Parse tool result data safely
export function parseToolResult(result: any): any {
  if (!result) return null;
  try {
    return typeof result === 'string' ? JSON.parse(result) : result;
  } catch {
    return result;
  }
}

// Generate tool result summary for display
export function getToolResultSummary(
  toolName: string, 
  result: any,
  t: (key: string, options?: any) => string
): string {
  if (!result) return t('tools.results.no_data');
  
  try {
    const data = parseToolResult(result);
    
    switch (toolName) {
      case 'search_my_subscriptions':
        if (data.total !== undefined) {
          if (data.summary?.totalMonthlySpend) {
            return t('tools.results.search_my_subscriptions_with_spend', {
              total: data.total,
              currency: data.summary.currency || 'CNY',
              amount: data.summary.totalMonthlySpend
            });
          }
          return t('tools.results.search_my_subscriptions', { total: data.total });
        }
        break;
      case 'lookup_subscription_service':
        if (data.found && data.matches?.length > 0) {
          const match = data.matches[0];
          return t('tools.results.lookup_subscription_service_found', { 
            name: match.name || match.serviceName || data.query 
          });
        }
        if (data.found === false) {
          return t('tools.results.lookup_subscription_service_not_found', { 
            query: data.query || '' 
          });
        }
        return t('tools.results.lookup_complete');
      case 'quick_add_subscription':
        if (data.success) {
          return t('tools.results.quick_add_subscription_success', { 
            name: data.subscription?.name 
          });
        }
        if (data.duplicateCount) {
          return t('tools.results.quick_add_subscription_duplicate', { 
            count: data.duplicateCount 
          });
        }
        if (data.existingSubscriptions?.length) {
          return t('tools.results.quick_add_subscription_duplicate', { 
            count: data.existingSubscriptions.length 
          });
        }
        return data.error || t('tools.results.add_failed');
      case 'update_subscription':
      case 'pause_subscription':
      case 'resume_subscription':
        if (data.success) {
          return t('tools.results.operation_success', { 
            name: data.subscription?.name 
          });
        }
        return data.error || t('tools.results.operation_failed');
      case 'cancel_subscription':
        if (data.success) {
          return t('tools.results.cancel_subscription_success', { 
            name: data.subscription?.name 
          });
        }
        return data.error || t('tools.results.cancel_failed');
      case 'get_spending_summary':
        if (data.totalSpend !== undefined) {
          return t('tools.results.get_spending_summary', {
            currency: data.currency || 'CNY',
            total: data.totalSpend
          });
        }
        // Legacy fallback
        if (data.total !== undefined) {
          return t('tools.results.get_spending_summary', {
            currency: data.currency || 'CNY',
            total: data.total
          });
        }
        break;
      case 'get_upcoming_renewals':
        if (data.total !== undefined) {
          return t('tools.results.get_upcoming_renewals', { count: data.total });
        }
        if (Array.isArray(data.subscriptions)) {
          return t('tools.results.get_upcoming_renewals', { count: data.subscriptions.length });
        }
        // Legacy fallback
        if (Array.isArray(data.renewals)) {
          return t('tools.results.get_upcoming_renewals', { count: data.renewals.length });
        }
        break;
      case 'search_web':
        // Enhanced search result (new format)
        if (data.summary) {
          const priceCount = data.summary.pricesFound?.length || 0;
          const sourceCount = data.summary.sourcesAfterFilter || data.rankedResults?.length || 0;
          if (priceCount > 0) {
            return t('tools.results.search_web_evidence', {
              defaultValue: `找到 ${sourceCount} 个来源，提取 ${priceCount} 条价格`,
              sources: sourceCount,
              prices: priceCount
            });
          }
          return t('tools.results.search_web', { count: sourceCount });
        }
        // Legacy format fallback
        if (Array.isArray(data.results)) {
          return t('tools.results.search_web', { count: data.results.length });
        }
        if (data.error) {
          return data.message || data.error;
        }
        break;
      case 'get_pending_bills':
        if (data.total !== undefined) {
          return t('tools.results.get_pending_bills', { count: data.total });
        }
        if (Array.isArray(data.bills)) {
          return t('tools.results.get_pending_bills', { count: data.bills.length });
        }
        break;
      case 'confirm_bill_payment':
        if (data.success) {
          return t('tools.results.confirm_bill_payment_success', {
            name: data.bill?.subscriptionName || ''
          });
        }
        return data.error || t('tools.results.confirm_bill_payment_failed');
      case 'update_bill':
        if (data.success) {
          return t('tools.results.update_bill_success');
        }
        return data.error || t('tools.results.update_bill_failed');
      case 'convert_currency':
        if (data.converted_amount !== undefined) {
          return t('tools.results.convert_currency', {
            currency: data.target_currency,
            amount: data.converted_amount
          });
        }
        // Legacy fallback
        if (data.convertedAmount !== undefined) {
          return t('tools.results.convert_currency', {
            currency: data.to,
            amount: data.convertedAmount
          });
        }
        break;
      case 'get_subscription_history':
        if (data.subscription) {
          return t('tools.results.get_subscription_history', { 
            name: data.subscription.name 
          });
        }
        break;
      case 'list_categories':
        if (data.total !== undefined) {
          return t('tools.results.list_categories', { total: data.total });
        }
        break;
    }
    
    // Generic handling
    if (data.success === true) return t('tools.results.success');
    if (data.success === false) return data.error || t('tools.results.failed');
    if (data.error) return `${t('tools.results.error')}: ${data.error}`;
    
    return t('tools.results.completed');
  } catch {
    return t('tools.results.completed');
  }
}

// Generate detailed display items for tool results
export function getToolResultDisplay(
  toolName: string, 
  result: any,
  t: (key: string, options?: any) => string
): { items: ToolResultItem[] } {
  const items: ToolResultItem[] = [];
  
  if (!result) return { items };
  
  try {
    const data = parseToolResult(result);
    
    switch (toolName) {
      case 'search_my_subscriptions':
        items.push({ label: t('tools.labels.subscription_count'), value: `${data.total || 0} ${t('tools.labels.unit_items')}` });
        if (data.summary?.totalMonthlySpend) {
          items.push({ label: t('tools.labels.monthly_spend'), value: `${data.summary.currency || 'CNY'} ${data.summary.totalMonthlySpend}` });
        }
        if (data.subscriptions?.length > 0) {
          items.push({ 
            label: t('tools.labels.subscription_list'), 
            value: data.subscriptions.map((s: any) => s.name).slice(0, 5).join(', ') + (data.subscriptions.length > 5 ? '...' : '') 
          });
        }
        break;
        
      case 'lookup_subscription_service':
        if (data.found && data.matches?.length > 0) {
          const match = data.matches[0];
          items.push({ label: t('tools.labels.service_name'), value: match.name || match.serviceName || '-' });
          if (match.category) items.push({ label: t('tools.labels.category'), value: match.category });
          if (match.description) items.push({ label: t('tools.labels.description'), value: match.description.substring(0, 50) + (match.description.length > 50 ? '...' : '') });
        } else {
          items.push({ label: t('tools.labels.query'), value: data.query || '-' });
          items.push({ label: t('tools.labels.result'), value: t('tools.labels.no_match') });
        }
        break;
        
      case 'quick_add_subscription':
        if (data.success && data.subscription) {
          items.push({ label: t('tools.labels.subscription_name'), value: data.subscription.name });
          items.push({ label: t('tools.labels.price'), value: `${data.subscription.currency} ${data.subscription.price}/${data.subscription.billingCycle}` });
          if (data.subscription.category) items.push({ label: t('tools.labels.category'), value: data.subscription.category });
          if (data.pendingBill) {
            items.push({ label: t('tools.labels.pending_bill'), value: `${data.pendingBill.currency} ${data.pendingBill.amount}` });
            items.push({ label: t('tools.labels.billing_date'), value: data.pendingBill.billingDate });
          }
        } else if (data.existingSubscriptions?.length) {
          items.push({ label: t('tools.labels.status'), value: t('tools.labels.duplicate_found') });
          data.existingSubscriptions.forEach((sub: any, i: number) => {
            items.push({ label: `${t('tools.labels.subscription')} ${sub.displayId || `#${i + 1}`}`, value: `${sub.name} - ${sub.currency} ${sub.price}/${sub.billingCycle}` });
          });
        } else {
          items.push({ label: t('tools.labels.status'), value: data.error || t('tools.results.add_failed') });
        }
        break;
      case 'update_subscription':
        if (data.success && data.subscription) {
          items.push({ label: t('tools.labels.subscription_name'), value: data.subscription.name });
          items.push({ label: t('tools.labels.price'), value: `${data.subscription.currency} ${data.subscription.price}/${data.subscription.billingCycle}` });
          if (data.pendingBill) {
            items.push({ label: t('tools.labels.pending_bill'), value: `${data.pendingBill.currency} ${data.pendingBill.amount}` });
            items.push({ label: t('tools.labels.billing_date'), value: data.pendingBill.billingDate });
          }
        } else {
          items.push({ label: t('tools.labels.status'), value: data.error || t('tools.results.operation_failed') });
        }
        break;
      case 'get_pending_bills':
        if (data.bills?.length > 0) {
          items.push({ label: t('tools.labels.result_count'), value: `${data.bills.length} ${t('tools.labels.unit_items')}` });
          data.bills.slice(0, 5).forEach((bill: any, i: number) => {
            items.push({
              label: `${t('tools.labels.bill')} ${i + 1}`,
              value: `${bill.subscriptionName || '-'} - ${bill.currency} ${bill.amount} (${bill.billingDate})`
            });
          });
        }
        break;
      case 'get_spending_summary': {
        const spendTotal = data.totalSpend ?? data.total;
        if (spendTotal !== undefined) {
          items.push({ label: t('tools.labels.amount'), value: `${data.currency || 'CNY'} ${spendTotal}` });
          if (data.periodLabel) {
            items.push({ label: t('tools.labels.period', { defaultValue: '统计周期' }), value: data.periodLabel });
          }
          items.push({ label: t('tools.labels.calculation_basis'), value: t('tools.labels.monthly_equivalent') });
          if (data.subscriptionCount !== undefined) {
            items.push({ label: t('tools.labels.subscription_count'), value: `${data.subscriptionCount} ${t('tools.labels.unit_items')}` });
          }
          if (data.topSubscriptions?.length > 0) {
            items.push({
              label: t('tools.labels.top_subscriptions', { defaultValue: '最大支出' }),
              value: data.topSubscriptions.slice(0, 3).map((s: any) => `${s.name}(${data.currency || 'CNY'} ${s.amount})`).join(', ')
            });
          }
        }
        break;
      }
      case 'confirm_bill_payment':
        if (data.success && data.bill) {
          items.push({ label: t('tools.labels.subscription_name'), value: data.bill.subscriptionName || '-' });
          items.push({ label: t('tools.labels.amount'), value: `${data.bill.currency} ${data.bill.amount}` });
          items.push({ label: t('tools.labels.billing_date'), value: data.bill.billingDate });
        } else {
          items.push({ label: t('tools.labels.status'), value: data.error || t('tools.results.operation_failed') });
        }
        break;
      case 'update_bill':
        if (data.success && data.bill) {
          items.push({ label: t('tools.labels.bill_id'), value: data.bill.id });
          items.push({ label: t('tools.labels.amount'), value: `${data.bill.currency} ${data.bill.amount}` });
          items.push({ label: t('tools.labels.billing_date'), value: data.bill.billingDate });
        } else {
          items.push({ label: t('tools.labels.status'), value: data.error || t('tools.results.operation_failed') });
        }
        break;
        
      case 'search_web':
        // Enhanced search result (new format)
        if (data.summary) {
          items.push({ label: t('tools.labels.service', { defaultValue: '服务' }), value: data.summary.serviceName || '-' });
          items.push({ label: t('tools.labels.queries_used', { defaultValue: '搜索词' }), value: (data.summary.queriesUsed || []).join(' | ') });
          items.push({
            label: t('tools.labels.sources', { defaultValue: '来源' }),
            value: `${data.summary.totalSourcesFound || 0} → ${data.summary.sourcesAfterFilter || 0} (${t('tools.labels.top_tier', { defaultValue: '最高级别' })}: ${data.summary.topTier || '-'})`
          });
          if (data.summary.pricesFound?.length > 0) {
            data.summary.pricesFound.slice(0, 4).forEach((p: any, i: number) => {
              items.push({
                label: `💰 ${p.plan || t('tools.labels.price', { defaultValue: '价格' })}`,
                value: `${p.currency} ${p.amount}/${p.cycle}`
              });
            });
          } else {
            items.push({ label: t('tools.labels.price', { defaultValue: '价格' }), value: t('tools.labels.no_price_found', { defaultValue: '未提取到价格' }) });
          }
          if (data.rankedResults?.length > 0) {
            data.rankedResults.slice(0, 3).forEach((r: any, i: number) => {
              items.push({
                label: `${t('tools.labels.source')} ${i + 1} [${r.tier}]`,
                value: `${r.title || '-'} (${r.source})`
              });
            });
          }
        }
        // Legacy format fallback
        else if (data.results?.length > 0) {
          items.push({ label: t('tools.labels.result_count'), value: `${data.results.length} ${t('tools.labels.unit_items')}` });
          data.results.slice(0, 3).forEach((r: any, i: number) => {
            items.push({ label: `${t('tools.labels.source')} ${i + 1}`, value: r.title || r.url || '-' });
          });
        }
        // Error result
        else if (data.error) {
          items.push({ label: t('tools.labels.status'), value: data.message || data.error });
        }
        break;
        
      case 'convert_currency':
        if (data.converted_amount !== undefined) {
          items.push({ label: t('tools.labels.original', { defaultValue: '原始金额' }), value: `${data.original_currency} ${data.original_amount}` });
          items.push({ label: t('tools.labels.converted', { defaultValue: '转换结果' }), value: `${data.target_currency} ${data.converted_amount}` });
          items.push({ label: t('tools.labels.rate', { defaultValue: '汇率' }), value: `${data.exchange_rate}` });
        }
        // Legacy fallback
        else if (data.convertedAmount !== undefined) {
          items.push({ label: t('tools.labels.converted', { defaultValue: '转换结果' }), value: `${data.to} ${data.convertedAmount}` });
        }
        break;

      case 'get_upcoming_renewals': {
        const renewals = data.subscriptions || data.renewals || [];
        if (renewals.length > 0) {
          items.push({ label: t('tools.labels.result_count'), value: `${renewals.length} ${t('tools.labels.unit_items')}` });
          renewals.slice(0, 5).forEach((sub: any, i: number) => {
            const daysText = sub.daysUntilRenewal !== undefined ? ` (${sub.daysUntilRenewal}天后)` : '';
            items.push({
              label: `${t('tools.labels.subscription')} ${i + 1}`,
              value: `${sub.name} - ${sub.currency || 'CNY'} ${sub.price}/${sub.billingCycle}${daysText}`
            });
          });
        } else {
          items.push({ label: t('tools.labels.result'), value: t('tools.labels.no_upcoming', { defaultValue: '无即将续费的订阅' }) });
        }
        break;
      }
        
      case 'list_categories':
        items.push({ label: t('tools.labels.category_count'), value: `${data.total || 0} ${t('tools.labels.unit_items')}` });
        if (data.categories?.length > 0) {
          const systemCount = data.categories.filter((c: any) => c.isSystem).length;
          const userCount = data.categories.filter((c: any) => !c.isSystem).length;
          items.push({ label: t('tools.labels.system_categories'), value: `${systemCount} ${t('tools.labels.unit_items')}` });
          if (userCount > 0) {
            items.push({ label: t('tools.labels.custom_categories'), value: `${userCount} ${t('tools.labels.unit_items')}` });
          }
          const categoryNames = data.categories.slice(0, 6).map((c: any) => `${c.icon || ''} ${c.name}`).join(', ');
          items.push({ label: t('tools.labels.category_list'), value: categoryNames + (data.categories.length > 6 ? '...' : '') });
        }
        break;
        
      default:
        // Generic handling
        if (data.success !== undefined) {
          items.push({ label: t('tools.labels.status'), value: data.success ? t('tools.results.success') : t('tools.results.failed') });
        }
        if (data.error) {
          items.push({ label: t('tools.labels.error'), value: data.error });
        }
        if (data.subscription?.name) {
          items.push({ label: t('tools.labels.subscription'), value: data.subscription.name });
        }
    }
  } catch {
    // ignore
  }
  
  return { items };
}

// Sanitize tool result by removing sensitive data
export function sanitizeToolResult(result: any): any {
  if (!result) return null;
  
  try {
    const data = parseToolResult(result);
    
    // Recursively clean sensitive fields
    const sanitize = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      if (Array.isArray(obj)) return obj.map(sanitize);
      if (typeof obj !== 'object') return obj;
      
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Skip sensitive fields
        if (['_internalId', 'apiKey', 'api_key', 'secret', 'password', 'token'].includes(key)) {
          continue;
        }
        // Simplify ID fields (show only first 8 characters)
        if (key === 'id' && typeof value === 'string' && value.length > 16) {
          cleaned[key] = value.substring(0, 8) + '...';
          continue;
        }
        cleaned[key] = sanitize(value);
      }
      return cleaned;
    };
    
    return sanitize(data);
  } catch {
    return result;
  }
}
