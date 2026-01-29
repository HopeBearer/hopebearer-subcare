export const CATEGORY_COLORS: Record<string, string> = {
  entertainment: '#A5A6F6', // Lavender
  tools: '#FCD34D',       // Amber
  productivity: '#34D399', // Emerald
  cloud: '#60A5FA',       // Blue
  utility: '#F87171',     // Red
  education: '#818CF8',   // Indigo
  other: '#9CA3AF',       // Gray
};

export const getCategoryColor = (category: string): string => {
  const key = category?.toLowerCase() || 'other';
  return CATEGORY_COLORS[key] || CATEGORY_COLORS.other;
};
