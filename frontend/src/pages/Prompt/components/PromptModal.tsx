import React, { useState, useEffect } from 'react';
import { CloseOutlined, SaveOutlined, CopyOutlined } from '@ant-design/icons';
import { PromptTemplate, promptService } from '@/services/promptService';
import './PromptModal.css';

interface PromptModalProps {
  prompt: PromptTemplate | null;
  isEdit: boolean;
  onClose: () => void;
  onSave: (result: any) => void;
}

export const PromptModal: React.FC<PromptModalProps> = ({
  prompt,
  isEdit,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<Partial<PromptTemplate>>({
    title: '',
    content: '',
    description: '',
    category: '',
    tags: [],
    type: 'general',
    status: 'published',
    priority: 0,
    is_public: true,
    variables: '',
    example_input: '',
    example_output: '',
    model_type: '',
    temperature: 0.7,
    max_tokens: undefined
  });
  
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced' | 'examples'>('basic');

  useEffect(() => {
    if (prompt) {
      setFormData({
        ...prompt,
        tags: prompt.tags || []
      });
      setTagInput(prompt.tags?.join(', ') || '');
    } else {
      setFormData({
        title: '',
        content: '',
        description: '',
        category: '',
        tags: [],
        type: 'general',
        status: 'published',
        priority: 0,
        is_public: true,
        variables: '',
        example_input: '',
        example_output: '',
        model_type: '',
        temperature: 0.7,
        max_tokens: undefined
      });
      setTagInput('');
    }
  }, [prompt]);

  const handleInputChange = (field: keyof PromptTemplate, value: any) => {
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
      
      if (isEdit && prompt?.id) {
        result = await promptService.updatePrompt(prompt.id, formData);
      } else {
        result = await promptService.createPrompt(formData as Omit<PromptTemplate, 'id' | 'created_at' | 'updated_at' | 'view_count' | 'usage_count'>);
      }
      
      onSave(result);
    } catch (error: any) {
      alert(error.response?.data?.message || '保存失败');
      console.error('保存提示词模板失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(formData.content || '');
      alert('内容已复制到剪贴板');
    } catch (error) {
      alert('复制失败');
    }
  };

  const modalTitle = isEdit ? 
    (prompt ? '编辑提示词模板' : '新增提示词模板') : 
    '查看提示词模板';

  const isViewOnly = !isEdit && !!prompt;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content prompt-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{modalTitle}</h2>
          <div className="header-actions">
            {!isViewOnly && (
              <button className="icon-btn" onClick={copyContent} title="复制内容">
                <CopyOutlined />
              </button>
            )}
            <button className="modal-close" onClick={onClose}>
              <CloseOutlined />
            </button>
          </div>
        </div>

        <div className="modal-tabs">
          <button 
            className={`tab-btn ${activeTab === 'basic' ? 'active' : ''}`}
            onClick={() => setActiveTab('basic')}
          >
            基本信息
          </button>
          <button 
            className={`tab-btn ${activeTab === 'advanced' ? 'active' : ''}`}
            onClick={() => setActiveTab('advanced')}
          >
            高级设置
          </button>
          <button 
            className={`tab-btn ${activeTab === 'examples' ? 'active' : ''}`}
            onClick={() => setActiveTab('examples')}
          >
            示例
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {activeTab === 'basic' && (
            <>
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
                    value={formData.type || 'general'}
                    onChange={e => handleInputChange('type', e.target.value)}
                    disabled={isViewOnly}
                  >
                    <option value="system">系统</option>
                    <option value="user">用户</option>
                    <option value="assistant">助手</option>
                    <option value="general">通用</option>
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
                <label htmlFor="content">提示词内容 *</label>
                <textarea
                  id="content"
                  value={formData.content || ''}
                  onChange={e => handleInputChange('content', e.target.value)}
                  disabled={isViewOnly}
                  rows={12}
                  required
                  placeholder="请输入提示词内容..."
                />
              </div>
            </>
          )}

          {activeTab === 'advanced' && (
            <>
              <div className="form-group">
                <label htmlFor="model_type">适用模型类型</label>
                <input
                  id="model_type"
                  type="text"
                  value={formData.model_type || ''}
                  onChange={e => handleInputChange('model_type', e.target.value)}
                  disabled={isViewOnly}
                  placeholder="如: GPT-3.5, GPT-4, Claude等"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="temperature">温度参数 (0.0-2.0)</label>
                  <input
                    id="temperature"
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={formData.temperature || 0.7}
                    onChange={e => handleInputChange('temperature', parseFloat(e.target.value) || 0.7)}
                    disabled={isViewOnly}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="max_tokens">最大Token数</label>
                  <input
                    id="max_tokens"
                    type="number"
                    min="1"
                    value={formData.max_tokens || ''}
                    onChange={e => handleInputChange('max_tokens', parseInt(e.target.value) || undefined)}
                    disabled={isViewOnly}
                    placeholder="留空表示使用默认值"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="variables">变量定义 (JSON格式)</label>
                <textarea
                  id="variables"
                  value={formData.variables || ''}
                  onChange={e => handleInputChange('variables', e.target.value)}
                  disabled={isViewOnly}
                  rows={4}
                  placeholder='{"variable_name": "description", "another_var": "another description"}'
                />
              </div>
            </>
          )}

          {activeTab === 'examples' && (
            <>
              <div className="form-group">
                <label htmlFor="example_input">示例输入</label>
                <textarea
                  id="example_input"
                  value={formData.example_input || ''}
                  onChange={e => handleInputChange('example_input', e.target.value)}
                  disabled={isViewOnly}
                  rows={6}
                  placeholder="输入示例用法..."
                />
              </div>

              <div className="form-group">
                <label htmlFor="example_output">示例输出</label>
                <textarea
                  id="example_output"
                  value={formData.example_output || ''}
                  onChange={e => handleInputChange('example_output', e.target.value)}
                  disabled={isViewOnly}
                  rows={6}
                  placeholder="期望的输出结果..."
                />
              </div>
            </>
          )}

          {/* 统计信息（仅查看模式显示） */}
          {isViewOnly && prompt && (
            <div className="stats-info">
              <div className="stat-item">
                <span className="stat-label">查看次数:</span>
                <span className="stat-value">{prompt.view_count || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">使用次数:</span>
                <span className="stat-value">{prompt.usage_count || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">创建时间:</span>
                <span className="stat-value">
                  {prompt.created_at ? new Date(prompt.created_at).toLocaleString() : '-'}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">更新时间:</span>
                <span className="stat-value">
                  {prompt.updated_at ? new Date(prompt.updated_at).toLocaleString() : '-'}
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
