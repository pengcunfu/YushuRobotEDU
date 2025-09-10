import { apiService } from './api';

export interface PromptTemplate {
  id?: string;
  title: string;
  content: string;
  description?: string;
  category?: string;
  tags: string[];
  type: 'system' | 'user' | 'assistant' | 'general';
  status: 'draft' | 'published' | 'archived';
  priority: number;
  view_count?: number;
  usage_count?: number;
  is_public: boolean;
  variables?: string;
  example_input?: string;
  example_output?: string;
  model_type?: string;
  temperature: number;
  max_tokens?: number;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PromptQuery {
  page?: number;
  per_page?: number;
  keyword?: string;
  category?: string;
  status?: string;
  type?: string;
}

export interface PromptResponse {
  items: PromptTemplate[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export const promptService = {
  // 获取提示词模板列表
  async getPromptList(params: PromptQuery = {}) {
    return await apiService.get('/api/prompt/', params);
  },

  // 获取提示词模板详情
  async getPromptDetail(id: string) {
    return await apiService.get(`/api/prompt/${id}`);
  },

  // 创建提示词模板
  async createPrompt(data: Omit<PromptTemplate, 'id' | 'created_at' | 'updated_at' | 'view_count' | 'usage_count'>) {
    return await apiService.post('/api/prompt/', data);
  },

  // 更新提示词模板
  async updatePrompt(id: string, data: Partial<PromptTemplate>) {
    return await apiService.put(`/api/prompt/${id}`, data);
  },

  // 删除提示词模板
  async deletePrompt(id: string) {
    return await apiService.delete(`/api/prompt/${id}`);
  },

  // 搜索提示词模板
  async searchPrompt(keyword: string) {
    return await apiService.get('/api/prompt/search/', { keyword });
  },

  // 获取提示词模板分类
  async getPromptCategories() {
    return await apiService.get('/api/prompt/categories/list');
  },

  // 获取提示词模板类型
  async getPromptTypes() {
    return await apiService.get('/api/prompt/types/list');
  },

  // 获取热门提示词模板
  async getPopularPrompts(limit: number = 10) {
    return await apiService.get('/api/prompt/popular/list', { limit });
  },

  // 记录提示词模板使用
  async recordPromptUsage(id: string) {
    return await apiService.post(`/api/prompt/${id}/usage`);
  }
};
