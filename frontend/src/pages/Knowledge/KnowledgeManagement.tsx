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
  BarChartOutlined
} from '@ant-design/icons';
import { KnowledgeModal } from './components/KnowledgeModal';
import { knowledgeService } from '@/services/knowledgeService';
import './KnowledgeManagement.css';

interface Knowledge {
  id: string;
  title: string;
  content: string;
  description?: string;
  category?: string;
  tags: string[];
  type: 'text' | 'document' | 'link' | 'faq';
  status: 'draft' | 'published' | 'archived';
  priority: number;
  view_count: number;
  usage_count: number;
  is_public: boolean;
  source_url?: string;
  source_type?: string;
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

export const KnowledgeManagement: React.FC = () => {
  const [knowledgeList, setKnowledgeList] = useState<Knowledge[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showModal, setShowModal] = useState(false);
  const [selectedKnowledge, setSelectedKnowledge] = useState<Knowledge | null>(null);
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

  // 获取知识库列表
  const loadKnowledgeList = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        per_page: pagination.per_page,
        ...searchForm
      };
      
      const response = await knowledgeService.getKnowledgeList(params);
      
      if (response.success) {
        setKnowledgeList(response.data.items);
        setPagination(prev => ({
          ...prev,
          total: response.data.total,
          pages: response.data.pages
        }));
      }
    } catch (error) {
      console.error('获取知识库列表失败:', error);
      alert('获取知识库列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取分类列表
  const loadCategories = async () => {
    try {
      const response = await knowledgeService.getKnowledgeCategories();
      if (response.success) {
        setCategories(response.data.categories);
      }
    } catch (error) {
      console.error('获取分类失败:', error);
    }
  };

  // 搜索处理
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    loadKnowledgeList();
  };

  // 分页处理
  const changePage = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  // 显示创建模态框
  const showCreateModal = () => {
    setSelectedKnowledge(null);
    setIsEdit(false);
    setShowModal(true);
  };

  // 查看知识库
  const viewKnowledge = (knowledge: Knowledge) => {
    setSelectedKnowledge(knowledge);
    setIsEdit(false);
    setShowModal(true);
  };

  // 编辑知识库
  const editKnowledge = (knowledge: Knowledge) => {
    setSelectedKnowledge(knowledge);
    setIsEdit(true);
    setShowModal(true);
  };

  // 删除知识库
  const deleteKnowledge = async (knowledge: Knowledge) => {
    if (!window.confirm(`确定要删除知识库"${knowledge.title}"吗？`)) {
      return;
    }
    
    try {
      const response = await knowledgeService.deleteKnowledge(knowledge.id);
      if (response.success) {
        alert('删除成功');
        loadKnowledgeList();
      } else {
        alert(response.message || '删除失败');
      }
    } catch (error) {
      console.error('删除知识库失败:', error);
      alert('删除失败');
    }
  };

  // 关闭模态框
  const closeModal = () => {
    setShowModal(false);
    setSelectedKnowledge(null);
  };

  // 保存处理
  const handleSave = (result: any) => {
    if (result && result.success) {
      alert(result.message || '知识库保存成功');
      loadKnowledgeList();
      closeModal();
    }
  };

  // 工具函数
  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      text: '文本',
      document: '文档',
      link: '链接',
      faq: 'FAQ'
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
    loadKnowledgeList();
    loadCategories();
  }, [pagination.page]);

  useEffect(() => {
    loadKnowledgeList();
  }, []);

  return (
    <div className="knowledge-management">
      {/* 页面头部 */}
      <div className="page-header">
        <h1>知识库管理</h1>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={showCreateModal}>
            <PlusOutlined />
            新增知识库
          </button>
        </div>
      </div>

      {/* 搜索和过滤 */}
      <div className="search-filters">
        <div className="search-bar">
          <input
            type="text"
            placeholder="搜索知识库..."
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
          
          <select 
            value={searchForm.type} 
            onChange={(e) => {
              setSearchForm(prev => ({ ...prev, type: e.target.value }));
              handleSearch();
            }}
          >
            <option value="">全部类型</option>
            <option value="text">文本</option>
            <option value="document">文档</option>
            <option value="link">链接</option>
            <option value="faq">FAQ</option>
          </select>
        </div>
      </div>

      {/* 知识库列表 */}
      <div className="knowledge-list">
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
        
        <div className={`knowledge-items ${viewMode}`}>
          {knowledgeList.map(item => (
            <div key={item.id} className="knowledge-item">
              <div className="item-header">
                <h3 className="item-title" onClick={() => viewKnowledge(item)}>
                  {item.title}
                </h3>
                <div className="item-actions">
                  <button className="action-btn" onClick={() => viewKnowledge(item)}>
                    <EyeOutlined />
                  </button>
                  <button className="action-btn" onClick={() => editKnowledge(item)}>
                    <EditOutlined />
                  </button>
                  <button className="action-btn danger" onClick={() => deleteKnowledge(item)}>
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

      {/* 知识库详情模态框 */}
      {showModal && (
        <KnowledgeModal
          knowledge={selectedKnowledge}
          isEdit={isEdit}
          onClose={closeModal}
          onSave={handleSave}
        />
      )}
    </div>
  );
};
