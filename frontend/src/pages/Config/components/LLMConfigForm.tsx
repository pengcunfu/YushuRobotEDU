import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  InputNumber,
  Switch,
  Select,
  Space,
  Typography,
  Button,
  Tabs,
  Row,
  Col,
  Tooltip,
  Divider
} from 'antd';
import {
  InfoCircleOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  ThunderboltOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';

const { Option } = Select;
const { Text } = Typography;
const { TabPane } = Tabs;

interface LLMConfigFormProps {
  initialValues?: any;
  onSave?: (values: any) => void;
  onCancel?: () => void;
}

// LLM提供商配置
const LLM_PROVIDERS = {
  aliyun: {
    name: '阿里云通义千问',
    description: '阿里巴巴达摩院研发的大语言模型',
    icon: '🔮',
    models: [
      { value: 'qwen-turbo', label: 'Qwen-Turbo', description: '快速响应，适合日常对话' },
      { value: 'qwen-plus', label: 'Qwen-Plus', description: '平衡性能和效果' },
      { value: 'qwen-max', label: 'Qwen-Max', description: '最高质量，适合复杂任务' },
      { value: 'qwen-max-longcontext', label: 'Qwen-Max-LongContext', description: '支持长文本' }
    ],
    fields: {
      api_key: { label: 'API Key', required: true, type: 'password' },
      model: { label: '模型', required: true, type: 'select' },
      temperature: { label: '温度参数', min: 0, max: 2, step: 0.1, default: 0.7 },
      max_tokens: { label: '最大Token数', min: 1, max: 8192, default: 2048 }
    }
  },
  baidu: {
    name: '百度文心一言',
    description: '百度基于文心大模型的AI对话系统',
    icon: '🧠',
    models: [
      { value: 'ernie-3.5', label: 'ERNIE-3.5', description: '通用对话模型' },
      { value: 'ernie-4.0', label: 'ERNIE-4.0', description: '高级推理模型' },
      { value: 'ernie-lite', label: 'ERNIE-Lite', description: '轻量级快速模型' },
      { value: 'ernie-speed', label: 'ERNIE-Speed', description: '极速响应模型' }
    ],
    fields: {
      access_token: { label: 'Access Token', required: true, type: 'password' },
      model: { label: '模型', required: true, type: 'select' },
      temperature: { label: '温度参数', min: 0, max: 1, step: 0.1, default: 0.7 },
      max_tokens: { label: '最大Token数', min: 1, max: 4096, default: 2048 }
    }
  },
  douyin: {
    name: '抖音云雀',
    description: '字节跳动旗下的大语言模型服务',
    icon: '🎵',
    models: [
      { value: 'skylark-chat', label: 'Skylark-Chat', description: '对话专用模型' },
      { value: 'skylark-lite', label: 'Skylark-Lite', description: '轻量级模型' }
    ],
    fields: {
      api_key: { label: 'API Key', required: true, type: 'password' },
      secret_key: { label: 'Secret Key', required: true, type: 'password' },
      model: { label: '模型', required: true, type: 'select' },
      base_url: { label: 'API地址', required: true, default: 'https://open.douyin.com/api/v1/llm' },
      temperature: { label: '温度参数', min: 0, max: 2, step: 0.1, default: 0.7 },
      max_tokens: { label: '最大Token数', min: 1, max: 4096, default: 2048 }
    }
  },
  tencent: {
    name: '腾讯混元',
    description: '腾讯自研的大语言模型',
    icon: '🐧',
    models: [
      { value: 'hunyuan-lite', label: 'Hunyuan-Lite', description: '轻量级模型' },
      { value: 'hunyuan-standard', label: 'Hunyuan-Standard', description: '标准版模型' },
      { value: 'hunyuan-pro', label: 'Hunyuan-Pro', description: '专业版模型' }
    ],
    fields: {
      secret_id: { label: 'Secret ID', required: true, type: 'password' },
      secret_key: { label: 'Secret Key', required: true, type: 'password' },
      app_id: { label: 'App ID', required: true },
      model: { label: '模型', required: true, type: 'select' },
      endpoint: { label: 'API端点', required: true, default: 'hunyuan.tencentcloudapi.com' },
      temperature: { label: '温度参数', min: 0, max: 2, step: 0.1, default: 0.7 },
      max_tokens: { label: '最大Token数', min: 1, max: 4096, default: 2048 }
    }
  },
  xunfei: {
    name: '讯飞星火',
    description: '科大讯飞的认知智能大模型',
    icon: '⭐',
    models: [
      { value: 'spark-lite', label: 'Spark-Lite', description: '轻量级模型' },
      { value: 'spark-v2', label: 'Spark-V2', description: '通用版模型' },
      { value: 'spark-v3', label: 'Spark-V3', description: '高级版模型' },
      { value: 'spark-v3.5', label: 'Spark-V3.5', description: '最新版模型' }
    ],
    fields: {
      api_key: { label: 'API Key', required: true, type: 'password' },
      api_secret: { label: 'API Secret', required: true, type: 'password' },
      app_id: { label: 'App ID', required: true },
      model: { label: '模型', required: true, type: 'select' },
      domain: { label: '模型域名', required: true, type: 'select' },
      gpt_url: { label: 'WebSocket URL', required: true, default: 'wss://spark-api.xf-yun.com/v3.1/chat' },
      temperature: { label: '温度参数', min: 0, max: 2, step: 0.1, default: 0.7 },
      max_tokens: { label: '最大Token数', min: 1, max: 8192, default: 4096 }
    }
  }
};

// 域名映射（讯飞特有）
const XUNFEI_DOMAINS = [
  { value: 'lite', label: 'lite (Spark-Lite)' },
  { value: 'generalv2', label: 'generalv2 (Spark-V2)' },
  { value: 'generalv3', label: 'generalv3 (Spark-V3)' },
  { value: 'generalv3.5', label: 'generalv3.5 (Spark-V3.5)' }
];

export const LLMConfigForm: React.FC<LLMConfigFormProps> = ({
  initialValues,
  onSave,
  onCancel
}) => {
  const [form] = Form.useForm();
  const [activeProvider, setActiveProvider] = useState<string>('aliyun');
  const [testingProvider, setTestingProvider] = useState<string>('');

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue(initialValues);
      if (initialValues.default_provider) {
        setActiveProvider(initialValues.default_provider);
      }
    }
  }, [initialValues, form]);

  const handleProviderChange = (provider: string) => {
    setActiveProvider(provider);
  };

  const handleTestConnection = async (provider: string) => {
    setTestingProvider(provider);
    // 模拟测试连接
    setTimeout(() => {
      setTestingProvider('');
      // 这里可以添加实际的连接测试逻辑
    }, 2000);
  };

  const renderProviderForm = (providerKey: string, provider: any) => {
    return (
      <div key={providerKey}>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>{provider.description}</Text>
        
        <Row gutter={16}>
          {Object.entries(provider.fields).map(([fieldKey, fieldConfig]: [string, any]) => (
            <Col span={fieldConfig.type === 'select' ? 24 : 12} key={fieldKey}>
              {fieldConfig.type === 'password' ? (
                <Form.Item
                  name={[providerKey, fieldKey]}
                  label={fieldConfig.label}
                  rules={[{ required: fieldConfig.required, message: `请输入${fieldConfig.label}` }]}
                >
                  <Input.Password
                    placeholder={`请输入${fieldConfig.label}`}
                    iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                  />
                </Form.Item>
              ) : fieldConfig.type === 'select' && fieldKey === 'model' ? (
                <Form.Item
                  name={[providerKey, fieldKey]}
                  label={fieldConfig.label}
                  rules={[{ required: fieldConfig.required, message: `请选择${fieldConfig.label}` }]}
                >
                  <Select placeholder={`请选择${fieldConfig.label}`}>
                    {provider.models.map((model: any) => (
                      <Option key={model.value} value={model.value}>
                        <Space direction="vertical" size={0}>
                          <Text strong>{model.label}</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {model.description}
                          </Text>
                        </Space>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              ) : fieldConfig.type === 'select' && fieldKey === 'domain' ? (
                <Form.Item
                  name={[providerKey, fieldKey]}
                  label={fieldConfig.label}
                  rules={[{ required: fieldConfig.required, message: `请选择${fieldConfig.label}` }]}
                >
                  <Select placeholder={`请选择${fieldConfig.label}`}>
                    {XUNFEI_DOMAINS.map((domain) => (
                      <Option key={domain.value} value={domain.value}>
                        {domain.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              ) : fieldConfig.min !== undefined ? (
                <Form.Item
                  name={[providerKey, fieldKey]}
                  label={
                    <Space>
                      <span>{fieldConfig.label}</span>
                      <Tooltip title={`范围: ${fieldConfig.min} - ${fieldConfig.max}`}>
                        <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                      </Tooltip>
                    </Space>
                  }
                  rules={[{ required: fieldConfig.required, message: `请输入${fieldConfig.label}` }]}
                >
                  <InputNumber
                    min={fieldConfig.min}
                    max={fieldConfig.max}
                    step={fieldConfig.step || 1}
                    placeholder={`默认: ${fieldConfig.default}`}
                  />
                </Form.Item>
              ) : (
                <Form.Item
                  name={[providerKey, fieldKey]}
                  label={fieldConfig.label}
                  rules={[{ required: fieldConfig.required, message: `请输入${fieldConfig.label}` }]}
                >
                  <Input placeholder={fieldConfig.default || `请输入${fieldConfig.label}`} />
                </Form.Item>
              )}
            </Col>
          ))}
        </Row>
        
        <Button
            loading={testingProvider === providerKey}
            onClick={() => handleTestConnection(providerKey)}
            icon={<ThunderboltOutlined />}
          >
            测试连接
          </Button>
      </div>
    );
  };

  const handleFinish = (values: any) => {
    console.log('LLM配置提交:', values);
    onSave?.(values);
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      initialValues={{
        enabled: true,
        default_provider: 'aliyun',
        timeout: 30,
        max_history: 10,
        ...initialValues
      }}
    >
      {/* 基础设置 */}
      <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="enabled"
              label="启用LLM服务"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="default_provider"
              label="默认提供商"
              rules={[{ required: true, message: '请选择默认提供商' }]}
            >
              <Select 
                placeholder="请选择默认提供商"
                onChange={handleProviderChange}
              >
                {Object.entries(LLM_PROVIDERS).map(([key, provider]) => (
                  <Option key={key} value={key}>
                    <Space>
                      <span>{provider.icon}</span>
                      <span>{provider.name}</span>
                    </Space>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item
              name="timeout"
              label="超时时间(秒)"
              rules={[{ required: true, message: '请输入超时时间' }]}
            >
                  <InputNumber min={1} max={300} />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item
              name="max_history"
              label="最大历史数"
              rules={[{ required: true, message: '请输入最大历史数' }]}
            >
                  <InputNumber min={1} max={50} />
            </Form.Item>
          </Col>
        </Row>

      {/* 提供商配置 */}
      <Tabs activeKey={activeProvider} onChange={setActiveProvider}>
          {Object.entries(LLM_PROVIDERS).map(([key, provider]) => (
            <TabPane 
              tab={
                <Space>
                  <span>{provider.icon}</span>
                  <span>{provider.name}</span>
                </Space>
              } 
              key={key}
            >
              {renderProviderForm(key, provider)}
            </TabPane>
          ))}
        </Tabs>


    </Form>
  );
};
