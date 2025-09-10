import { apiService } from './api';

export interface Knowledge {
  id?: string;
  title: string;
  content: string;
  description?: string;
  category?: string;
  tags: string[];
  type: 'text' | 'document' | 'link' | 'faq';
  status: 'draft' | 'published' | 'archived';
  priority: number;
  view_count?: number;
  usage_count?: number;
  is_public: boolean;
  source_url?: string;
  source_type?: string;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface KnowledgeQuery {
  page?: number;
  per_page?: number;
  keyword?: string;
  category?: string;
  status?: string;
  type?: string;
}

export interface KnowledgeResponse {
  items: Knowledge[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export const knowledgeService = {
  // 获取知识库列表
  async getKnowledgeList(params: KnowledgeQuery = {}) {
    return await apiService.get('/api/knowledge/', params);
  },

  // 获取知识库详情
  async getKnowledgeDetail(id: string) {
    return await apiService.get(`/api/knowledge/${id}`);
  },

  // 创建知识库
  async createKnowledge(data: Omit<Knowledge, 'id' | 'created_at' | 'updated_at' | 'view_count' | 'usage_count'>) {
    return await apiService.post('/api/knowledge/', data);
  },

  // 更新知识库
  async updateKnowledge(id: string, data: Partial<Knowledge>) {
    return await apiService.put(`/api/knowledge/${id}`, data);
  },

  // 删除知识库
  async deleteKnowledge(id: string) {
    return await apiService.delete(`/api/knowledge/${id}`);
  },

  // 搜索知识库
  async searchKnowledge(keyword: string) {
    return await apiService.get('/api/knowledge/search/', { keyword });
  },

  // 获取知识库分类
  async getKnowledgeCategories() {
    return await apiService.get('/api/knowledge/categories/list');
  },

  // 获取热门知识库
  async getPopularKnowledge(limit: number = 10) {
    return await apiService.get('/api/knowledge/popular/list', { limit });
  },

  // 记录知识库使用
  async recordKnowledgeUsage(id: string) {
    return await apiService.post(`/api/knowledge/${id}/usage`);
  }
};
