import { api } from '@/lib/api';

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  budgetLimit: number | null;
  userId: string | null; // null = system category
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryDTO {
  name: string;
  icon?: string;
  color?: string;
  budgetLimit?: number;
}

export interface UpdateCategoryDTO {
  name?: string;
  icon?: string;
  color?: string;
  budgetLimit?: number | null;
}

interface CategoriesResponse {
  status: string;
  code: number;
  data: {
    categories: Category[];
  };
}

interface CategoryResponse {
  status: string;
  code: number;
  data: {
    category: Category;
  };
}

export const categoryService = {
  /**
   * 获取用户可用的所有分类（系统默认 + 用户自定义）
   */
  async getCategories(): Promise<Category[]> {
    // 注意: api 拦截器已经解包了 response.data，所以这里 response 就是 ApiResponse
    const response = await api.get<CategoriesResponse>('/categories') as unknown as CategoriesResponse;
    return response.data.categories;
  },

  /**
   * 获取单个分类
   */
  async getCategoryById(id: string): Promise<Category> {
    const response = await api.get<CategoryResponse>(`/categories/${id}`) as unknown as CategoryResponse;
    return response.data.category;
  },

  /**
   * 创建用户自定义分类
   */
  async createCategory(data: CreateCategoryDTO): Promise<Category> {
    const response = await api.post<CategoryResponse>('/categories', data) as unknown as CategoryResponse;
    return response.data.category;
  },

  /**
   * 更新分类
   */
  async updateCategory(id: string, data: UpdateCategoryDTO): Promise<Category> {
    const response = await api.patch<CategoryResponse>(`/categories/${id}`, data) as unknown as CategoryResponse;
    return response.data.category;
  },

  /**
   * 删除分类
   */
  async deleteCategory(id: string): Promise<void> {
    await api.delete(`/categories/${id}`);
  },

  /**
   * 判断是否为系统分类
   */
  isSystemCategory(category: Category): boolean {
    return category.userId === null;
  }
};
