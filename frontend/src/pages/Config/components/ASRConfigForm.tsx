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
  Divider,
  Upload,
  message
} from 'antd';
import {
  InfoCircleOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  AudioOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';

const { Option } = Select;
const { Text } = Typography;
const { TabPane } = Tabs;
const { Dragger } = Upload;

interface ASRConfigFormProps {
  initialValues?: any;
  onSave?: (values: any) => void;
  onCancel?: () => void;
}

// ASR提供商配置
const ASR_PROVIDERS = {
  baidu: {
    name: '百度语音识别',
    description: '百度AI开放平台提供的语音识别服务',
    icon: '🎯',
    languages: [
      { value: 1537, label: '普通话(输入法模型)', description: '适合日常对话识别' },
      { value: 1737, label: '英语', description: '英语语音识别' },
      { value: 1637, label: '粤语', description: '广东话识别' },
      { value: 1837, label: '四川话', description: '四川方言识别' }
    ],
    formats: ['wav', 'pcm', 'amr', 'm4a'],
    sampleRates: [8000, 16000],
    fields: {
      app_id: { label: 'App ID', required: true },
      api_key: { label: 'API Key', required: true, type: 'password' },
      secret_key: { label: 'Secret Key', required: true, type: 'password' },
      cuid: { label: '用户标识', required: true, default: 'default_user', description: '用户唯一标识符' },
      dev_pid: { label: '语言模型', required: true, type: 'language', default: 1537 },
      sample_rate: { label: '采样率', required: true, type: 'sampleRate', default: 16000 },
      format: { label: '音频格式', required: true, type: 'format', default: 'wav' }
    }
  },
  xunfei: {
    name: '讯飞语音识别',
    description: '科大讯飞提供的语音识别服务',
    icon: '⭐',
    languages: [
      { value: 'zh_cn', label: '中文', description: '中文普通话' },
      { value: 'en_us', label: '英语', description: '美式英语' }
    ],
    accents: [
      { value: 'mandarin', label: '普通话', description: '标准普通话' },
      { value: 'cantonese', label: '粤语', description: '广东话' }
    ],
    domains: [
      { value: 'pro_ost_ed', label: '教育领域', description: '教育相关内容识别' },
      { value: 'pro_ost_fin', label: '金融领域', description: '金融相关内容识别' },
      { value: 'pro_ost_med', label: '医疗领域', description: '医疗相关内容识别' }
    ],
    formats: ['wav', 'mp3'],
    sampleRates: [8000, 16000],
    fields: {
      app_id: { label: 'App ID', required: true },
      api_key: { label: 'API Key', required: true, type: 'password' },
      api_secret: { label: 'API Secret', required: true, type: 'password' },
      host: { label: 'API主机', required: true, default: 'ost-api.xfyun.cn' },
      language: { label: '语言设置', required: true, type: 'language', default: 'zh_cn' },
      accent: { label: '方言设置', required: true, type: 'accent', default: 'mandarin' },
      domain: { label: '领域设置', required: true, type: 'domain', default: 'pro_ost_ed' },
      sample_rate: { label: '采样率', required: true, type: 'sampleRate', default: 16000 },
      format: { label: '音频格式', required: true, type: 'format', default: 'wav' }
    }
  },
  aliyun: {
    name: '阿里云语音识别',
    description: '阿里云智能语音服务',
    icon: '☁️',
    languages: [
      { value: 'zh-cn', label: '中文', description: '中文普通话' },
      { value: 'en-us', label: '英语', description: '美式英语' }
    ],
    formats: ['wav', 'mp3', 'opus'],
    sampleRates: [8000, 16000],
    fields: {
      access_key_id: { label: 'Access Key ID', required: true, type: 'password' },
      access_key_secret: { label: 'Access Key Secret', required: true, type: 'password' },
      app_key: { label: 'App Key', required: true },
      region: { label: '服务区域', required: true, default: 'cn-shanghai' },
      endpoint: { label: '服务端点', required: true, default: 'nls-meta.cn-shanghai.aliyuncs.com' },
      format: { label: '音频格式', required: true, type: 'format', default: 'wav' },
      sample_rate: { label: '采样率', required: true, type: 'sampleRate', default: 16000 },
      enable_punctuation: { label: '启用标点符号', type: 'boolean', default: true },
      enable_inverse_text_normalization: { label: '启用逆文本标准化', type: 'boolean', default: true }
    }
  },
  tencent: {
    name: '腾讯云语音识别',
    description: '腾讯云智聆语音识别',
    icon: '🐧',
    engineModels: [
      { value: '16k_zh', label: '16k中文通用', description: '16k采样率中文通用模型' },
      { value: '8k_zh', label: '8k中文通用', description: '8k采样率中文通用模型' },
      { value: '16k_en', label: '16k英文通用', description: '16k采样率英文通用模型' }
    ],
    voiceFormats: [
      { value: 1, label: 'wav' },
      { value: 4, label: 'm4a' },
      { value: 6, label: 'mp3' }
    ],
    fields: {
      secret_id: { label: 'Secret ID', required: true, type: 'password' },
      secret_key: { label: 'Secret Key', required: true, type: 'password' },
      region: { label: '地域', required: true, default: 'ap-beijing' },
      engine_model_type: { label: '引擎模型', required: true, type: 'engineModel', default: '16k_zh' },
      voice_format: { label: '音频格式', required: true, type: 'voiceFormat', default: 1 },
      filter_dirty: { label: '过滤脏词', type: 'select', default: 0, options: [0, 1] },
      filter_modal: { label: '过滤语气词', type: 'select', default: 1, options: [0, 1] },
      filter_punc: { label: '过滤标点符号', type: 'select', default: 0, options: [0, 1] },
      convert_num_mode: { label: '数字智能转换', type: 'select', default: 1, options: [0, 1] }
    }
  },
  douyin: {
    name: '抖音语音识别',
    description: '火山引擎提供的语音识别服务',
    icon: '🎵',
    languages: [
      { value: 'zh-CN', label: '中文', description: '中文普通话' },
      { value: 'en-US', label: '英语', description: '美式英语' }
    ],
    formats: ['wav', 'mp3'],
    sampleRates: [8000, 16000],
    fields: {
      access_key: { label: 'Access Key', required: true, type: 'password' },
      secret_key: { label: 'Secret Key', required: true, type: 'password' },
      app_id: { label: 'App ID', required: true },
      cluster: { label: '集群', required: true, default: 'volcengine_streaming_common' },
      language: { label: '语言', required: true, type: 'language', default: 'zh-CN' },
      format: { label: '音频格式', required: true, type: 'format', default: 'wav' },
      sample_rate: { label: '采样率', required: true, type: 'sampleRate', default: 16000 },
      bits: { label: '位深度', required: true, type: 'select', default: 16, options: [16, 24] }
    }
  }
};

export const ASRConfigForm: React.FC<ASRConfigFormProps> = ({
  initialValues,
  onSave,
  onCancel
}) => {
  const [form] = Form.useForm();
  const [activeProvider, setActiveProvider] = useState<string>('baidu');
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

  const handleTestASR = async (provider: string) => {
    setTestingProvider(provider);
    // 模拟语音识别测试
    setTimeout(() => {
      setTestingProvider('');
      message.success('语音识别测试完成！');
    }, 3000);
  };

  const uploadProps = {
    name: 'file',
    multiple: false,
    accept: '.wav,.mp3,.m4a,.amr',
    beforeUpload: (file: any) => {
      const isAudio = file.type.startsWith('audio/') || 
                     file.name.endsWith('.wav') || 
                     file.name.endsWith('.mp3') || 
                     file.name.endsWith('.m4a') || 
                     file.name.endsWith('.amr');
      if (!isAudio) {
        message.error('只能上传音频文件！');
      }
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('音频文件大小不能超过 10MB！');
      }
      return false; // 阻止自动上传
    },
    onChange: (info: any) => {
      console.log('文件变化:', info);
    }
  };

  const renderProviderForm = (providerKey: string, provider: any) => {
    return (
      <div key={providerKey}>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>{provider.description}</Text>
        
        {/* 测试音频上传 */}
        <div style={{ marginBottom: 16 }}>
          <Dragger {...uploadProps} style={{ padding: '20px 0' }}>
            <p className="ant-upload-drag-icon">
              <AudioOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
            </p>
            <p className="ant-upload-text">点击或拖拽音频文件到此区域进行测试</p>
            <p className="ant-upload-hint">
              支持 WAV、MP3、M4A、AMR 格式，文件大小不超过 10MB
            </p>
          </Dragger>
        </div>
        
        <Row gutter={16}>
          {Object.entries(provider.fields).map(([fieldKey, fieldConfig]: [string, any]) => (
            <Col 
              span={
                fieldConfig.type === 'language' || fieldConfig.type === 'format' ? 12 : 
                fieldConfig.type === 'boolean' ? 8 : 
                fieldKey.includes('filter_') || fieldKey.includes('convert_') ? 8 : 
                12
              } 
              key={fieldKey}
            >
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
              ) : fieldConfig.type === 'language' ? (
                <Form.Item
                  name={[providerKey, fieldKey]}
                  label={fieldConfig.label}
                  rules={[{ required: fieldConfig.required, message: `请选择${fieldConfig.label}` }]}
                >
                  <Select placeholder={`请选择${fieldConfig.label}`}>
                    {(provider.languages || []).map((lang: any) => (
                      <Option key={lang.value} value={lang.value}>
                        <Space direction="vertical" size={0}>
                          <Text strong>{lang.label}</Text>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {lang.description}
                          </Text>
                        </Space>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              ) : fieldConfig.type === 'accent' ? (
                <Form.Item
                  name={[providerKey, fieldKey]}
                  label={fieldConfig.label}
                  rules={[{ required: fieldConfig.required, message: `请选择${fieldConfig.label}` }]}
                >
                  <Select placeholder={`请选择${fieldConfig.label}`}>
                    {(provider.accents || []).map((accent: any) => (
                      <Option key={accent.value} value={accent.value}>
                        <Space direction="vertical" size={0}>
                          <Text strong>{accent.label}</Text>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {accent.description}
                          </Text>
                        </Space>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              ) : fieldConfig.type === 'domain' ? (
                <Form.Item
                  name={[providerKey, fieldKey]}
                  label={fieldConfig.label}
                  rules={[{ required: fieldConfig.required, message: `请选择${fieldConfig.label}` }]}
                >
                  <Select placeholder={`请选择${fieldConfig.label}`}>
                    {(provider.domains || []).map((domain: any) => (
                      <Option key={domain.value} value={domain.value}>
                        <Space direction="vertical" size={0}>
                          <Text strong>{domain.label}</Text>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {domain.description}
                          </Text>
                        </Space>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              ) : fieldConfig.type === 'format' ? (
                <Form.Item
                  name={[providerKey, fieldKey]}
                  label={fieldConfig.label}
                  rules={[{ required: fieldConfig.required, message: `请选择${fieldConfig.label}` }]}
                >
                  <Select placeholder={`请选择${fieldConfig.label}`}>
                    {provider.formats.map((format: string) => (
                      <Option key={format} value={format}>
                        {format.toUpperCase()}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              ) : fieldConfig.type === 'sampleRate' ? (
                <Form.Item
                  name={[providerKey, fieldKey]}
                  label={fieldConfig.label}
                  rules={[{ required: fieldConfig.required, message: `请选择${fieldConfig.label}` }]}
                >
                  <Select placeholder={`请选择${fieldConfig.label}`}>
                    {provider.sampleRates.map((rate: number) => (
                      <Option key={rate} value={rate}>
                        {rate} Hz
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              ) : fieldConfig.type === 'engineModel' ? (
                <Form.Item
                  name={[providerKey, fieldKey]}
                  label={fieldConfig.label}
                  rules={[{ required: fieldConfig.required, message: `请选择${fieldConfig.label}` }]}
                >
                  <Select placeholder={`请选择${fieldConfig.label}`}>
                    {(provider.engineModels || []).map((model: any) => (
                      <Option key={model.value} value={model.value}>
                        <Space direction="vertical" size={0}>
                          <Text strong>{model.label}</Text>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {model.description}
                          </Text>
                        </Space>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              ) : fieldConfig.type === 'voiceFormat' ? (
                <Form.Item
                  name={[providerKey, fieldKey]}
                  label={fieldConfig.label}
                  rules={[{ required: fieldConfig.required, message: `请选择${fieldConfig.label}` }]}
                >
                  <Select placeholder={`请选择${fieldConfig.label}`}>
                    {(provider.voiceFormats || []).map((format: any) => (
                      <Option key={format.value} value={format.value}>
                        {format.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              ) : fieldConfig.type === 'boolean' ? (
                <Form.Item
                  name={[providerKey, fieldKey]}
                  label={fieldConfig.label}
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              ) : fieldConfig.type === 'select' && fieldConfig.options ? (
                <Form.Item
                  name={[providerKey, fieldKey]}
                  label={
                    <Space>
                      <span>{fieldConfig.label}</span>
                      {fieldConfig.description && (
                        <Tooltip title={fieldConfig.description}>
                          <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                        </Tooltip>
                      )}
                    </Space>
                  }
                  rules={[{ required: fieldConfig.required, message: `请选择${fieldConfig.label}` }]}
                >
                  <Select placeholder={`请选择${fieldConfig.label}`}>
                    {fieldConfig.options.map((option: any) => (
                      <Option key={option} value={option}>
                        {option === 0 ? '否' : option === 1 ? '是' : option}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              ) : (
                <Form.Item
                  name={[providerKey, fieldKey]}
                  label={
                    <Space>
                      <span>{fieldConfig.label}</span>
                      {fieldConfig.description && (
                        <Tooltip title={fieldConfig.description}>
                          <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                        </Tooltip>
                      )}
                    </Space>
                  }
                  rules={[{ required: fieldConfig.required, message: `请输入${fieldConfig.label}` }]}
                >
                  <Input placeholder={fieldConfig.default || `请输入${fieldConfig.label}`} />
                </Form.Item>
              )}
            </Col>
          ))}
        </Row>
        
        <Space style={{ marginTop: 16 }}>
          <Button
            loading={testingProvider === providerKey}
            onClick={() => handleTestASR(providerKey)}
            icon={<PlayCircleOutlined />}
          >
            测试识别
          </Button>
        </Space>
      </div>
    );
  };

  const handleFinish = (values: any) => {
    console.log('ASR配置提交:', values);
    onSave?.(values);
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      initialValues={{
        enabled: true,
        default_provider: 'baidu',
        timeout: 30,
        max_file_size: 10485760, // 10MB
        ...initialValues
      }}
    >
      {/* 基础设置 */}
      <Row gutter={16}>
          <Col span={6}>
            <Form.Item
              name="enabled"
              label="启用ASR服务"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="default_provider"
              label="默认提供商"
              rules={[{ required: true, message: '请选择默认提供商' }]}
            >
              <Select 
                placeholder="请选择默认提供商"
                onChange={handleProviderChange}
              >
                {Object.entries(ASR_PROVIDERS).map(([key, provider]) => (
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
          <Col span={6}>
            <Form.Item
              name="timeout"
              label="超时时间(秒)"
              rules={[{ required: true, message: '请输入超时时间' }]}
            >
              <InputNumber min={1} max={300} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="max_file_size"
              label="最大文件大小(字节)"
              rules={[{ required: true, message: '请输入最大文件大小' }]}
            >
              <InputNumber 
                min={1048576} // 1MB
                max={104857600} // 100MB
                formatter={(value) => `${Math.round((value || 0) / 1048576)}MB`}
                parser={(value) => {
                  const parsed = Math.round((parseFloat(value?.replace('MB', '') || '0')) * 1048576);
                  return Math.max(1048576, Math.min(104857600, parsed)) as any;
                }}
              />
            </Form.Item>
          </Col>
        </Row>

      {/* 提供商配置 */}
      <Tabs activeKey={activeProvider} onChange={setActiveProvider}>
          {Object.entries(ASR_PROVIDERS).map(([key, provider]) => (
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
