export const CATEGORY_COLORS: Record<string, string> = {
  entertainment: '#A5A6F6', // Lavender
  streaming: '#E879F9',     // Fuchsia - 流媒体 (Netflix, Spotify, etc.)
  tools: '#FCD34D',         // Amber
  productivity: '#34D399',  // Emerald
  cloud: '#60A5FA',         // Blue
  utility: '#F87171',       // Red
  education: '#818CF8',     // Indigo
  social: '#FB923C',        // Orange
  developer: '#22D3EE',     // Cyan
  ai: '#A78BFA',            // Purple
  security: '#F472B6',      // Pink
  gaming: '#4ADE80',        // Green
  fitness: '#FB7185',       // Rose
  news: '#94A3B8',          // Slate
  reading: '#FBBF24',       // Yellow
  hosting: '#38BDF8',       // Sky
  music: '#C084FC',         // Violet
  communication: '#2DD4BF', // Teal
  other: '#9CA3AF',         // Gray
};

export const getCategoryColor = (category: string): string => {
  const key = category?.toLowerCase() || 'other';
  return CATEGORY_COLORS[key] || CATEGORY_COLORS.other;
};
