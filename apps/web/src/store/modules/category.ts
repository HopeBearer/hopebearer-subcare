import { create } from 'zustand';
import { categoryService, Category } from '@/services/modules/category';

interface CategoryState {
  categories: Category[];
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  
  /** Fetch categories (only once — skips if already loaded or loading) */
  fetchCategories: () => Promise<void>;
  
  /** Force refresh categories (ignores lock) */
  refreshCategories: () => Promise<void>;
  
  /** Get category options formatted for Select components */
  getCategoryOptions: () => { label: string; value: string }[];
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  isLoaded: false,
  isLoading: false,
  error: null,

  fetchCategories: async () => {
    const state = get();
    // Lock: skip if already loaded or currently loading
    if (state.isLoaded || state.isLoading) return;

    set({ isLoading: true, error: null });
    try {
      const categories = await categoryService.getCategories();
      set({ categories, isLoaded: true, isLoading: false });
    } catch (error: any) {
      console.error('[CategoryStore] Failed to fetch categories:', error);
      set({ error: error.message || 'Failed to fetch categories', isLoading: false });
    }
  },

  refreshCategories: async () => {
    set({ isLoading: true, error: null });
    try {
      const categories = await categoryService.getCategories();
      set({ categories, isLoaded: true, isLoading: false });
    } catch (error: any) {
      console.error('[CategoryStore] Failed to refresh categories:', error);
      set({ error: error.message || 'Failed to fetch categories', isLoading: false });
    }
  },

  getCategoryOptions: () => {
    return get().categories.map(c => ({
      label: c.name,
      value: c.name,
    }));
  },
}));
