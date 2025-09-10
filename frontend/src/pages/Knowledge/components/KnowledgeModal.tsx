import React, { useState, useEffect } from 'react';
import { CloseOutlined, SaveOutlined } from '@ant-design/icons';
import { Knowledge, knowledgeService } from '@/services/knowledgeService';
import './KnowledgeModal.css';

interface KnowledgeModalProps {
  knowledge: Knowledge | null;
  isEdit: boolean;
  onClose: () => void;
  onSave: (result: any) => void;
}

export const KnowledgeModal: React.FC<KnowledgeModalProps> = ({
  knowledge,
  isEdit,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<Partial<Knowledge>>({
    title: '',
    content: '',
    description: '',
    category: '',
    tags: [],
    type: 'text',
    status: 'published',
    priority: 0,
    is_public: true,
    source_url: '',
    source_type: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (knowledge) {
      setFormData({
        ...knowledge,
        tags: knowledge.tags || []
      });
      setTagInput(knowledge.tags?.join(', ') || '');
    } else {
      setFormData({
        title: '',
        content: '',
        description: '',
        category: '',
        tags: [],
        type: 'text',
        status: 'published',
        priority: 0,
        is_public: true,
        source_url: '',
        source_type: ''
      });
      setTagInput('');
    }
  }, [knowledge]);

  const handleInputChange = (field: keyof Knowledge, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTagsChange = (value: string) => {
    setTagInput(value);
    const tags = value.split(',').map(tag => tag.trim()).filter(tag => tag);
    setFormData(prev => ({
      ...prev,
      tags
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.content) {
      alert('标题和内容不能为空');
      return;
    }

    try {
      setLoading(true);
      let result;
      
      if (isEdit && knowledge?.id) {
        result = await knowledgeService.updateKnowledge(knowledge.id, formData);
      } else {
        result = await knowledgeService.createKnowledge(formData as Omit<Knowledge, 'id' | 'created_at' | 'updated_at' | 'view_count' | 'usage_count'>);
      }
      
      onSave(result);
    } catch (error: any) {
      alert(error.response?.data?.message || '保存失败');
      console.error('保存知识库失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const modalTitle = isEdit ? 
    (knowledge ? '查看知识库' : '编辑知识库') : 
    '新增知识库';

  const isViewOnly = !isEdit && !!knowledge;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{modalTitle}</h2>
          <button className="modal-close" onClick={onClose}>
            <CloseOutlined />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label htmlFor="title">标题 *</label>
            <input
              id="title"
              type="text"
              value={formData.title || ''}
              onChange={e => handleInputChange('title', e.target.value)}
              disabled={isViewOnly}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">描述</label>
            <input
              id="description"
              type="text"
              value={formData.description || ''}
              onChange={e => handleInputChange('description', e.target.value)}
              disabled={isViewOnly}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="category">分类</label>
              <input
                id="category"
                type="text"
                value={formData.category || ''}
                onChange={e => handleInputChange('category', e.target.value)}
                disabled={isViewOnly}
              />
            </div>

            <div className="form-group">
              <label htmlFor="type">类型</label>
              <select
                id="type"
                value={formData.type || 'text'}
                onChange={e => handleInputChange('type', e.target.value)}
                disabled={isViewOnly}
              >
                <option value="text">文本</option>
                <option value="document">文档</option>
                <option value="link">链接</option>
                <option value="faq">FAQ</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="status">状态</label>
              <select
                id="status"
                value={formData.status || 'published'}
                onChange={e => handleInputChange('status', e.target.value)}
                disabled={isViewOnly}
              >
                <option value="draft">草稿</option>
                <option value="published">已发布</option>
                <option value="archived">已归档</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="priority">优先级</label>
              <input
                id="priority"
                type="number"
                value={formData.priority || 0}
                onChange={e => handleInputChange('priority', parseInt(e.target.value) || 0)}
                disabled={isViewOnly}
                min="0"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="tags">标签（用逗号分隔）</label>
            <input
              id="tags"
              type="text"
              value={tagInput}
              onChange={e => handleTagsChange(e.target.value)}
              disabled={isViewOnly}
              placeholder="标签1, 标签2, 标签3"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="source_url">来源链接</label>
              <input
                id="source_url"
                type="url"
                value={formData.source_url || ''}
                onChange={e => handleInputChange('source_url', e.target.value)}
                disabled={isViewOnly}
              />
            </div>

            <div className="form-group">
              <label htmlFor="source_type">来源类型</label>
              <input
                id="source_type"
                type="text"
                value={formData.source_type || ''}
                onChange={e => handleInputChange('source_type', e.target.value)}
                disabled={isViewOnly}
              />
            </div>
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.is_public || false}
                onChange={e => handleInputChange('is_public', e.target.checked)}
                disabled={isViewOnly}
              />
              公开访问
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="content">内容 *</label>
            <textarea
              id="content"
              value={formData.content || ''}
              onChange={e => handleInputChange('content', e.target.value)}
              disabled={isViewOnly}
              rows={10}
              required
            />
          </div>

          {/* 统计信息（仅查看模式显示） */}
          {isViewOnly && knowledge && (
            <div className="stats-info">
              <div className="stat-item">
                <span className="stat-label">查看次数:</span>
                <span className="stat-value">{knowledge.view_count || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">使用次数:</span>
                <span className="stat-value">{knowledge.usage_count || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">创建时间:</span>
                <span className="stat-value">
                  {knowledge.created_at ? new Date(knowledge.created_at).toLocaleString() : '-'}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">更新时间:</span>
                <span className="stat-value">
                  {knowledge.updated_at ? new Date(knowledge.updated_at).toLocaleString() : '-'}
                </span>
              </div>
            </div>
          )}
        </form>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            取消
          </button>
          {!isViewOnly && (
            <button 
              type="submit" 
              className="btn btn-primary" 
              onClick={handleSubmit}
              disabled={loading}
            >
              <SaveOutlined />
              {loading ? '保存中...' : '保存'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
