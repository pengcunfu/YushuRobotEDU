import React, { useState, useEffect } from 'react';
import {
  SearchOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  BarsOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  CopyOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { PromptModal } from './components/PromptModal';
import { promptService } from '@/services/promptService';
import './PromptManagement.css';

interface PromptTemplate {
  id: string;
  title: string;
  content: string;
  description?: string;
  category?: string;
  tags: string[];
  type: 'system' | 'user' | 'assistant' | 'general';
  status: 'draft' | 'published' | 'archived';
  priority: number;
  view_count: number;
  usage_count: number;
  is_public: boolean;
  variables?: string;
  example_input?: string;
  example_output?: string;
  model_type?: string;
  temperature: number;
  max_tokens?: number;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

interface SearchForm {
  keyword: string;
  category: string;
  status: string;
  type: string;
}

interface Pagination {
  page: number;
  per_page: number;
  total: number;
  pages: number;
}

export const PromptManagement: React.FC = () => {
  const [promptList, setPromptList] = useState<PromptTemplate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [promptTypes, setPromptTypes] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showModal, setShowModal] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptTemplate | null>(null);
  const [isEdit, setIsEdit] = useState(false);
  const [, setLoading] = useState(false);
  
  const [searchForm, setSearchForm] = useState<SearchForm>({
    keyword: '',
    category: '',
    status: '',
    type: ''
  });
  
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    per_page: 20,
    total: 0,
    pages: 0
  });

  // 获取提示词模板列表
  const loadPromptList = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        per_page: pagination.per_page,
        ...searchForm
      };
      
      const response = await promptService.getPromptList(params);
      
      if (response.success) {
        setPromptList(response.data.items);
        setPagination(prev => ({
          ...prev,
          total: response.data.total,
          pages: response.data.pages
        }));
      }
    } catch (error) {
      console.error('获取提示词模板列表失败:', error);
      alert('获取提示词模板列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取分类列表
  const loadCategories = async () => {
    try {
      const response = await promptService.getPromptCategories();
      if (response.success) {
        setCategories(response.data.categories);
      }
    } catch (error) {
      console.error('获取分类失败:', error);
    }
  };

  // 获取类型列表
  const loadPromptTypes = async () => {
    try {
      const response = await promptService.getPromptTypes();
      if (response.success) {
        setPromptTypes(response.data.types);
      }
    } catch (error) {
      console.error('获取类型失败:', error);
    }
  };

  // 搜索处理
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    loadPromptList();
  };

  // 分页处理
  const changePage = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  // 显示创建模态框
  const showCreateModal = () => {
    setSelectedPrompt(null);
    setIsEdit(true);
    setShowModal(true);
  };

  // 查看提示词模板
  const viewPrompt = (prompt: PromptTemplate) => {
    setSelectedPrompt(prompt);
    setIsEdit(false);
    setShowModal(true);
  };

  // 编辑提示词模板
  const editPrompt = (prompt: PromptTemplate) => {
    setSelectedPrompt(prompt);
    setIsEdit(true);
    setShowModal(true);
  };

  // 复制提示词内容
  const copyPrompt = async (prompt: PromptTemplate) => {
    try {
      await navigator.clipboard.writeText(prompt.content);
      alert('提示词内容已复制到剪贴板');
    } catch (error) {
      console.error('复制失败:', error);
      alert('复制失败');
    }
  };

  // 删除提示词模板
  const deletePrompt = async (prompt: PromptTemplate) => {
    if (!window.confirm(`确定要删除提示词模板"${prompt.title}"吗？`)) {
      return;
    }
    
    try {
      const response = await promptService.deletePrompt(prompt.id);
      if (response.success) {
        alert('删除成功');
        loadPromptList();
      } else {
        alert(response.message || '删除失败');
      }
    } catch (error) {
      console.error('删除提示词模板失败:', error);
      alert('删除失败');
    }
  };

  // 关闭模态框
  const closeModal = () => {
    setShowModal(false);
    setSelectedPrompt(null);
  };

  // 保存处理
  const handleSave = (result: any) => {
    if (result && result.success) {
      alert(result.message || '提示词模板保存成功');
      loadPromptList();
      closeModal();
    }
  };

  // 工具函数
  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      system: '系统',
      user: '用户',
      assistant: '助手',
      general: '通用'
    };
    return types[type] || type;
  };

  const getStatusLabel = (status: string) => {
    const statuses: Record<string, string> = {
      draft: '草稿',
      published: '已发布',
      archived: '已归档'
    };
    return statuses[status] || status;
  };

  const getStatusClass = (status: string) => {
    return `status-${status}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // 页面加载
  useEffect(() => {
    loadPromptList();
    loadCategories();
    loadPromptTypes();
  }, [pagination.page]);

  useEffect(() => {
    loadPromptList();
  }, []);

  return (
    <div className="prompt-management">
      {/* 页面头部 */}
      <div className="page-header">
        <h1>提示词管理</h1>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={showCreateModal}>
            <PlusOutlined />
            新增提示词
          </button>
        </div>
      </div>

      {/* 搜索和过滤 */}
      <div className="search-filters">
        <div className="search-bar">
          <input
            type="text"
            placeholder="搜索提示词..."
            className="search-input"
            value={searchForm.keyword}
            onChange={(e) => setSearchForm(prev => ({ ...prev, keyword: e.target.value }))}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button className="search-btn" onClick={handleSearch}>
            <SearchOutlined />
          </button>
        </div>
        
        <div className="filters">
          <select 
            value={searchForm.category} 
            onChange={(e) => {
              setSearchForm(prev => ({ ...prev, category: e.target.value }));
              handleSearch();
            }}
          >
            <option value="">全部分类</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          
          <select 
            value={searchForm.type} 
            onChange={(e) => {
              setSearchForm(prev => ({ ...prev, type: e.target.value }));
              handleSearch();
            }}
          >
            <option value="">全部类型</option>
            {promptTypes.map(type => (
              <option key={type} value={type}>{getTypeLabel(type)}</option>
            ))}
          </select>
          
          <select 
            value={searchForm.status} 
            onChange={(e) => {
              setSearchForm(prev => ({ ...prev, status: e.target.value }));
              handleSearch();
            }}
          >
            <option value="">全部状态</option>
            <option value="draft">草稿</option>
            <option value="published">已发布</option>
            <option value="archived">已归档</option>
          </select>
        </div>
      </div>

      {/* 提示词列表 */}
      <div className="prompt-list">
        <div className="list-header">
          <span>共 {pagination.total} 条记录</span>
          <div className="view-controls">
            <button 
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <AppstoreOutlined />
            </button>
            <button 
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <BarsOutlined />
            </button>
          </div>
        </div>
        
        <div className={`prompt-items ${viewMode}`}>
          {promptList.map(item => (
            <div key={item.id} className="prompt-item">
              <div className="item-header">
                <h3 className="item-title" onClick={() => viewPrompt(item)}>
                  {item.title}
                </h3>
                <div className="item-actions">
                  <button className="action-btn" onClick={() => viewPrompt(item)}>
                    <EyeOutlined />
                  </button>
                  <button className="action-btn" onClick={() => copyPrompt(item)}>
                    <CopyOutlined />
                  </button>
                  <button className="action-btn" onClick={() => editPrompt(item)}>
                    <EditOutlined />
                  </button>
                  <button className="action-btn danger" onClick={() => deletePrompt(item)}>
                    <DeleteOutlined />
                  </button>
                </div>
              </div>
              
              <div className="item-content">
                <p className="item-description">{item.description || '暂无描述'}</p>
                <div className="item-meta">
                  <span className="meta-item">
                    <span className="meta-label">分类:</span>
                    <span className="meta-value">{item.category || '未分类'}</span>
                  </span>
                  <span className="meta-item">
                    <span className="meta-label">类型:</span>
                    <span className="meta-value">{getTypeLabel(item.type)}</span>
                  </span>
                  <span className="meta-item">
                    <span className="meta-label">状态:</span>
                    <span className={`meta-value ${getStatusClass(item.status)}`}>
                      {getStatusLabel(item.status)}
                    </span>
                  </span>
                </div>
                
                <div className="prompt-preview">
                  <div className="preview-content">
                    {item.content.length > 100 ? 
                      `${item.content.substring(0, 100)}...` : 
                      item.content
                    }
                  </div>
                </div>
                
                <div className="item-stats">
                  <span className="stat-item">
                    <EyeOutlined />
                    {item.view_count}
                  </span>
                  <span className="stat-item">
                    <BarChartOutlined />
                    {item.usage_count}
                  </span>
                  <span className="stat-item">
                    <SettingOutlined />
                    T:{item.temperature}
                  </span>
                  <span className="stat-item">
                    <ClockCircleOutlined />
                    {formatDate(item.created_at)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 分页 */}
        <div className="pagination">
          <button 
            className="page-btn" 
            disabled={pagination.page <= 1}
            onClick={() => changePage(pagination.page - 1)}
          >
            上一页
          </button>
          
          <span className="page-info">
            第 {pagination.page} 页 / 共 {pagination.pages} 页
          </span>
          
          <button 
            className="page-btn" 
            disabled={pagination.page >= pagination.pages}
            onClick={() => changePage(pagination.page + 1)}
          >
            下一页
          </button>
        </div>
      </div>

      {/* 提示词详情模态框 */}
      {showModal && (
        <PromptModal
          prompt={selectedPrompt}
          isEdit={isEdit}
          onClose={closeModal}
          onSave={handleSave}
        />
      )}
    </div>
  );
};
