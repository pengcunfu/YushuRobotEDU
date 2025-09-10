import React, { useState, useRef, useEffect } from 'react';
import {
  Card,
  Input,
  Button,
  Select,
  Space,
  Spin,
  Alert,
  Typography,
  Tag,
  Slider,
  InputNumber,
  Row,
  Col,
  App
} from 'antd';
import {
  SendOutlined,
  ClearOutlined,
  SettingOutlined,
  RobotOutlined,
  UserOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { llmService } from '@/services/llmService';
import { Header } from '@/components/Layout/Header';
import { ChatMessage, ChatRequest, StreamChunk } from '@/types';
import './ChatInterface.css';

const { TextArea } = Input;
const { Text } = Typography;
const { Option } = Select;

export const ChatInterface: React.FC = () => {
  const { message } = App.useApp();

  // 状态管理
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('douyin');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [temperature, setTemperature] = useState<number>(0.7);
  const [maxTokens, setMaxTokens] = useState<number>(2048);
  const [showSettings, setShowSettings] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState<string>('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<any>(null);

  // 获取可用提供商
  const { data: providersData, isLoading: providersLoading, refetch: refetchProviders } = useQuery({
    queryKey: ['llmProviders'],
    queryFn: llmService.getProviders,
  });

  // 清空对话
  const handleClearMessages = () => {
    setMessages([]);
    message.success('对话已清空');
  };


  // 发送消息mutation (保留非流式使用)
  const chatMutation = useMutation({
    mutationFn: llmService.chat,
    onSuccess: (response) => {
      if (response.success && response.response) {
        const assistantMessage: ChatMessage = {
          id: Date.now().toString() + '_assistant',
          role: 'assistant',
          content: response.response,
          timestamp: new Date().toISOString(),
          provider: response.provider,
          model: response.model
        };
        setMessages(prev => [...prev, assistantMessage]);
        message.success('消息发送成功');
      } else {
        message.error(response.error || '发送失败');
      }
    },
    onError: (error: any) => {
      message.error(`发送失败: ${error.message}`);
    }
  });

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 设置默认模型
  useEffect(() => {
    const models = providersData?.provider_info?.[selectedProvider]?.models;
    if (models && models.length > 0) {
      setSelectedModel(models[0]);
    }
  }, [selectedProvider, providersData]);

  // 发送消息（流式）
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) {
      message.warning('请输入消息内容');
      return;
    }

    if (!providersData?.providers.includes(selectedProvider)) {
      message.error('请选择可用的AI提供商');
      return;
    }

    // 添加用户消息
    const userMessage: ChatMessage = {
      id: Date.now().toString() + '_user',
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsStreaming(true);
    setCurrentStreamingMessage('');

    // 发送流式请求
    const request: ChatRequest = {
      message: userMessage.content,
      provider: selectedProvider,
      model: selectedModel,
      temperature,
      max_tokens: maxTokens
    };

    let assistantMessageId = Date.now().toString() + '_assistant';
    let fullContent = '';

    await llmService.chatStream(
      request,
      // onChunk
      (chunk: StreamChunk) => {
        if (chunk.type === 'chunk' && chunk.content) {
          fullContent += chunk.content;
          setCurrentStreamingMessage(fullContent);
        }
      },
      // onComplete
      () => {
        setIsStreaming(false);
        setCurrentStreamingMessage('');
        
        const assistantMessage: ChatMessage = {
          id: assistantMessageId,
          role: 'assistant',
          content: fullContent,
          timestamp: new Date().toISOString(),
          provider: selectedProvider,
          model: selectedModel
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        message.success('对话完成');
      },
      // onError
      (error: string) => {
        setIsStreaming(false);
        setCurrentStreamingMessage('');
        message.error(`发送失败: ${error}`);
      }
    );
  };

  // 处理键盘事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 当AI开始回答时，移除输入框焦点以避免双光标
  useEffect(() => {
    if ((chatMutation.isPending || isStreaming) && inputRef.current) {
      inputRef.current.blur();
    }
  }, [chatMutation.isPending, isStreaming]);

  // 获取可用提供商列表
  const availableProviders = providersData?.providers || [];
  const providerInfo = providersData?.provider_info || {};

  return (
    <div >
      <Header 
        title="智能对话"
        actions={
          <Space>
            <Button 
              type="text" 
              icon={<ReloadOutlined />}
              title="刷新提供商"
              onClick={() => refetchProviders()}
              loading={providersLoading}
            >
              刷新
            </Button>
            <Button 
              type="text" 
              icon={<SettingOutlined />}
              title="模型设置"
              onClick={() => setShowSettings(!showSettings)}
              style={{ color: showSettings ? '#1890ff' : undefined }}
            >
              设置
            </Button>
            <Button 
              type="text" 
              icon={<ClearOutlined />}
              title="清空对话"
              onClick={handleClearMessages}
              disabled={messages.length === 0}
            >
              清空
            </Button>
          </Space>
        }
      />
      
      <div className="chat-content" style={{ padding: '12px' }}>

      {/* 提供商状态 */}
      {providersLoading ? (
        <Card className="provider-status-card" size="small">
          <Spin size="small" /> 正在加载AI提供商...
        </Card>
      ) : availableProviders.length === 0 ? (
        <Alert
          message="暂无可用的AI提供商"
          description="请在配置中心配置至少一个AI服务提供商的API密钥"
          type="warning"
          showIcon
          style={{ borderRadius: '8px' }}
        />
      ) : (
        <Card className="provider-status-card" size="small">
          <Space wrap size="small">
            <Text strong style={{ fontSize: '13px' }}>可用提供商:</Text>
            {availableProviders.map(provider => (
              <Tag
                key={provider}
                className={`provider-tag ${provider === selectedProvider ? 'active' : ''}`}
                onClick={() => setSelectedProvider(provider)}
              >
                {providerInfo[provider]?.name || provider}
              </Tag>
            ))}
          </Space>
        </Card>
      )}

      {/* 设置面板 */}
      {showSettings && (
        <Card title="对话设置" className="settings-card" size="small">
          <Row gutter={[12, 8]}>
            <Col xs={24} sm={12} md={6}>
              <div className="settings-item">
                <span className="settings-label">AI提供商</span>
                <Select
                  size="small"
                  value={selectedProvider}
                  onChange={setSelectedProvider}
                  style={{ width: '100%' }}
                  disabled={availableProviders.length === 0}
                >
                  {availableProviders.map(provider => (
                    <Option key={provider} value={provider}>
                      {providerInfo[provider]?.name || provider}
                    </Option>
                  ))}
                </Select>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div className="settings-item">
                <span className="settings-label">模型</span>
                <Select
                  size="small"
                  value={selectedModel}
                  onChange={setSelectedModel}
                  style={{ width: '100%' }}
                  disabled={!providerInfo[selectedProvider]?.models?.length}
                >
                  {(providerInfo[selectedProvider]?.models || []).map(model => (
                    <Option key={model} value={model}>
                      {model}
                    </Option>
                  ))}
                </Select>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div className="settings-item">
                <span className="settings-label">温度参数: {temperature}</span>
                <Slider
                  min={0}
                  max={2}
                  step={0.1}
                  value={temperature}
                  onChange={setTemperature}
                />
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div className="settings-item">
                <span className="settings-label">最大Token数</span>
                <InputNumber
                  size="small"
                  min={100}
                  max={8192}
                  value={maxTokens}
                  onChange={(value) => setMaxTokens(value || 2048)}
                  style={{ width: '100%' }}
                />
              </div>
            </Col>
          </Row>
        </Card>
      )}

      {/* 聊天区域 */}
      <div className="chat-messages">
        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="empty-messages">
              <RobotOutlined style={{ fontSize: 36, color: '#d9d9d9', marginBottom: 12 }} />
              <Text type="secondary" style={{ fontSize: '14px' }}>开始与AI对话吧！</Text>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.role}`}>
                <div className="message-avatar">
                  {msg.role === 'user' ? (
                    <UserOutlined />
                  ) : (
                    <RobotOutlined />
                  )}
                </div>
                <div className="message-content">
                  <div className="message-header">
                    <Text strong className={msg.role === 'user' ? 'user-name' : 'assistant-name'}>
                      {msg.role === 'user' ? '我' : 'AI助手'}
                    </Text>
                    <Text type="secondary" className="message-time">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </Text>
                    {msg.provider && (
                      <Tag style={{ fontSize: '11px', padding: '1px 6px' }}>
                        {providerInfo[msg.provider]?.name || msg.provider}
                      </Tag>
                    )}
                  </div>
                  <div 
                    className="message-text"
                    tabIndex={-1}
                    contentEditable={false}
                    suppressContentEditableWarning={true}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            ))
          )}
          {(chatMutation.isPending || isStreaming) && (
            <div className="message assistant">
              <div className="message-avatar">
                <RobotOutlined />
              </div>
              <div className="message-content">
                <div className="message-header">
                  <Text strong className="assistant-name">AI助手</Text>
                  <Text type="secondary" className="message-time">
                    {isStreaming ? '正在回复...' : '正在思考...'}
                  </Text>
                  {isStreaming && (
                    <Tag style={{ fontSize: '11px', padding: '1px 6px' }}>
                      {providerInfo[selectedProvider]?.name || selectedProvider}
                    </Tag>
                  )}
                </div>
                <div 
                  className="message-text"
                  tabIndex={-1}
                  contentEditable={false}
                  suppressContentEditableWarning={true}
                >
                  {isStreaming ? (
                    <>
                      {currentStreamingMessage}
                      <span className="streaming-cursor">|</span>
                    </>
                  ) : (
                    <>
                      <Spin size="small" /> 正在生成回复...
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 输入区域 */}
      <div className="chat-input">
        <Space.Compact style={{ width: '100%' }}>
          <TextArea
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入你的问题... (Enter发送，Shift+Enter换行)"
            autoSize={{ minRows: 1, maxRows: 3 }}
            disabled={chatMutation.isPending || isStreaming || availableProviders.length === 0}
            style={{ flex: 1, fontSize: '14px' }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSendMessage}
            loading={chatMutation.isPending || isStreaming}
            disabled={!inputMessage.trim() || chatMutation.isPending || isStreaming || availableProviders.length === 0}
            style={{ height: 'auto', borderRadius: '0 6px 6px 0' }}
          >
            发送
          </Button>
        </Space.Compact>
      </div>
      </div>
    </div>
  );
};
