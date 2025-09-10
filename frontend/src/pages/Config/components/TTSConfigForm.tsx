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
  Slider
} from 'antd';
import {
  InfoCircleOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  CheckCircleOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';

const { Option } = Select;
const { Text } = Typography;
const { TabPane } = Tabs;

interface TTSConfigFormProps {
  initialValues?: any;
  onSave?: (values: any) => void;
  onCancel?: () => void;
}

// TTS提供商配置
const TTS_PROVIDERS = {
  baidu: {
    name: '百度语音合成',
    description: '百度AI开放平台提供的语音合成服务',
    icon: '🎯',
    voices: [
      { value: 'female', label: '度小美', description: '温柔女声，适合客服场景' },
      { value: 'male', label: '度小宇', description: '温暖男声，适合播报场景' },
      { value: 'duyaya', label: '度逍遥', description: '磁性男声，适合有声读物' },
      { value: 'duyanyan', label: '度丫丫', description: '可爱童声，适合儿童应用' }
    ],
    formats: ['mp3', 'wav', 'amr'],
    fields: {
      app_id: { label: 'App ID', required: true },
      api_key: { label: 'API Key', required: true, type: 'password' },
      secret_key: { label: 'Secret Key', required: true, type: 'password' },
      default_voice: { label: '默认发音人', required: true, type: 'voice' },
      default_speed: { label: '默认语速', min: 0, max: 15, default: 5, description: '语速，取值0-15' },
      default_pitch: { label: '默认音调', min: 0, max: 15, default: 5, description: '音调，取值0-15' },
      default_volume: { label: '默认音量', min: 0, max: 15, default: 5, description: '音量，取值0-15' },
      format: { label: '音频格式', required: true, type: 'format', default: 'mp3' }
    }
  },
  xunfei: {
    name: '讯飞语音合成',
    description: '科大讯飞提供的语音合成服务',
    icon: '⭐',
    voices: [
      { value: 'female', label: '叶子(x4_yezi)', description: '温暖女声' },
      { value: 'male', label: '凌风(x4_lingfeng)', description: '成熟男声' },
      { value: 'xiaoyan', label: '小燕', description: '亲切女声' },
      { value: 'xiaoyu', label: '小宇', description: '青年男声' }
    ],
    formats: ['wav', 'mp3'],
    fields: {
      app_id: { label: 'App ID', required: true },
      api_key: { label: 'API Key', required: true, type: 'password' },
      api_secret: { label: 'API Secret', required: true, type: 'password' },
      host: { label: 'API主机', required: true, default: 'ws-api.xfyun.cn' },
      path: { label: 'API路径', required: true, default: '/v2/tts' },
      default_voice: { label: '默认发音人', required: true, type: 'voice' },
      vcn: { label: '发音人标识', required: true, default: 'x4_yezi' },
      auf: { label: '音频编码', required: true, default: 'audio/L16;rate=16000' },
      aue: { label: '音频格式', required: true, default: 'raw' },
      tte: { label: '文本编码', required: true, default: 'utf8' },
      default_speed: { label: '默认语速', min: 0, max: 100, default: 50, description: '语速，取值0-100' },
      default_pitch: { label: '默认音调', min: 0, max: 100, default: 50, description: '音调，取值0-100' },
      default_volume: { label: '默认音量', min: 0, max: 100, default: 100, description: '音量，取值0-100' },
      format: { label: '输出格式', required: true, type: 'format', default: 'wav' }
    }
  },
  aliyun: {
    name: '阿里云语音合成',
    description: '阿里云智能语音服务',
    icon: '☁️',
    voices: [
      { value: 'Xiaoyun', label: '小云', description: '标准女声' },
      { value: 'Xiaogang', label: '小刚', description: '标准男声' },
      { value: 'Ruoxi', label: '若汐', description: '温柔女声' },
      { value: 'Siqi', label: '思琪', description: '可爱女声' }
    ],
    formats: ['wav', 'mp3'],
    fields: {
      access_key_id: { label: 'Access Key ID', required: true, type: 'password' },
      access_key_secret: { label: 'Access Key Secret', required: true, type: 'password' },
      app_key: { label: 'App Key', required: true },
      region: { label: '服务区域', required: true, default: 'cn-shanghai' },
      endpoint: { label: '服务端点', required: true, default: 'nls-gateway-cn-shanghai.aliyuncs.com' },
      default_voice: { label: '默认发音人', required: true, type: 'voice' },
      default_speed: { label: '默认语速', min: -500, max: 500, default: 0, description: '语速，取值-500~500' },
      default_pitch: { label: '默认音调', min: -500, max: 500, default: 0, description: '音调，取值-500~500' },
      default_volume: { label: '默认音量', min: 0, max: 100, default: 50, description: '音量，取值0-100' },
      format: { label: '音频格式', required: true, type: 'format', default: 'wav' },
      sample_rate: { label: '采样率', required: true, default: 16000, type: 'select', options: [8000, 16000, 24000] }
    }
  },
  tencent: {
    name: '腾讯云语音合成',
    description: '腾讯云智聆口语评测',
    icon: '🐧',
    voices: [
      { value: '101001', label: '智逍遥', description: '成熟男声' },
      { value: '101002', label: '智瑜', description: '温柔女声' },
      { value: '101003', label: '智聆', description: '知性女声' },
      { value: '101004', label: '智美', description: '甜美女声' }
    ],
    formats: ['wav', 'mp3'],
    fields: {
      secret_id: { label: 'Secret ID', required: true, type: 'password' },
      secret_key: { label: 'Secret Key', required: true, type: 'password' },
      region: { label: '地域', required: true, default: 'ap-beijing' },
      default_voice: { label: '默认发音人', required: true, type: 'voice' },
      model_type: { label: '模型类型', required: true, default: 1, type: 'select', options: [1] },
      voice_type: { label: '音色类型', required: true, default: 0, type: 'select', options: [0, 1, 2] },
      primary_language: { label: '主语言', required: true, default: 1, type: 'select', options: [1, 2] },
      sample_rate: { label: '采样率', required: true, default: 16000, type: 'select', options: [8000, 16000, 22050] },
      default_speed: { label: '默认语速', min: -2, max: 6, default: 0, description: '语速，取值-2~6' },
      default_volume: { label: '默认音量', min: -10, max: 10, default: 0, description: '音量，取值-10~10' },
      format: { label: '音频格式', required: true, type: 'format', default: 'wav' }
    }
  },
  douyin: {
    name: '抖音语音合成',
    description: '火山引擎提供的语音合成服务',
    icon: '🎵',
    voices: [
      { value: 'BV001_streaming', label: '通用女声', description: '自然流畅的女声' },
      { value: 'BV002_streaming', label: '通用男声', description: '自然流畅的男声' },
      { value: 'BV003_streaming', label: '磁性男声', description: '富有磁性的男声' },
      { value: 'BV004_streaming', label: '甜美女声', description: '甜美可爱的女声' }
    ],
    formats: ['wav', 'mp3'],
    fields: {
      access_key: { label: 'Access Key', required: true, type: 'password' },
      secret_key: { label: 'Secret Key', required: true, type: 'password' },
      app_id: { label: 'App ID', required: true },
      cluster: { label: '集群', required: true, default: 'volcano_tts' },
      default_voice: { label: '默认发音人', required: true, type: 'voice' },
      language: { label: '语言', required: true, default: 'zh-CN' },
      default_speed: { label: '默认语速', min: 0.2, max: 3.0, step: 0.1, default: 1.0, description: '语速，取值0.2~3.0' },
      default_pitch: { label: '默认音调', min: 0.1, max: 3.0, step: 0.1, default: 1.0, description: '音调，取值0.1~3.0' },
      default_volume: { label: '默认音量', min: 0.1, max: 3.0, step: 0.1, default: 1.0, description: '音量，取值0.1~3.0' },
      format: { label: '音频格式', required: true, type: 'format', default: 'wav' },
      sample_rate: { label: '采样率', required: true, default: 16000, type: 'select', options: [8000, 16000, 24000] },
      bits: { label: '位深度', required: true, default: 16, type: 'select', options: [16, 24] }
    }
  }
};

export const TTSConfigForm: React.FC<TTSConfigFormProps> = ({
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

  const handleTestVoice = async (provider: string) => {
    setTestingProvider(provider);
    // 模拟语音测试
    setTimeout(() => {
      setTestingProvider('');
      // 这里可以添加实际的语音测试逻辑
    }, 3000);
  };

  const renderProviderForm = (providerKey: string, provider: any) => {
    return (
      <div key={providerKey}>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>{provider.description}</Text>
        
        <Row gutter={16}>
          {Object.entries(provider.fields).map(([fieldKey, fieldConfig]: [string, any]) => (
            <Col 
              span={
                fieldConfig.type === 'voice' || fieldKey.includes('default_') ? 24 : 
                fieldConfig.type === 'format' ? 12 : 
                fieldKey.includes('speed') || fieldKey.includes('pitch') || fieldKey.includes('volume') ? 8 : 
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
              ) : fieldConfig.type === 'voice' ? (
                <Form.Item
                  name={[providerKey, fieldKey]}
                  label={fieldConfig.label}
                  rules={[{ required: fieldConfig.required, message: `请选择${fieldConfig.label}` }]}
                >
                  <Select placeholder={`请选择${fieldConfig.label}`}>
                    {provider.voices.map((voice: any) => (
                      <Option key={voice.value} value={voice.value}>
                        <Space direction="vertical" size={0}>
                          <Text strong>{voice.label}</Text>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {voice.description}
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
              ) : fieldConfig.type === 'select' && fieldConfig.options ? (
                <Form.Item
                  name={[providerKey, fieldKey]}
                  label={fieldConfig.label}
                  rules={[{ required: fieldConfig.required, message: `请选择${fieldConfig.label}` }]}
                >
                  <Select placeholder={`请选择${fieldConfig.label}`}>
                    {fieldConfig.options.map((option: any) => (
                      <Option key={option} value={option}>
                        {option}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              ) : fieldConfig.min !== undefined && fieldConfig.max !== undefined && 
                   fieldKey.includes('speed') || fieldKey.includes('pitch') || fieldKey.includes('volume') ? (
                <Form.Item
                  name={[providerKey, fieldKey]}
                  label={
                    <Space>
                      <span>{fieldConfig.label}</span>
                      <Tooltip title={fieldConfig.description}>
                        <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                      </Tooltip>
                    </Space>
                  }
                  rules={[{ required: fieldConfig.required, message: `请设置${fieldConfig.label}` }]}
                >
                  <Slider
                    min={fieldConfig.min}
                    max={fieldConfig.max}
                    step={fieldConfig.step || (fieldConfig.max > 100 ? 10 : 1)}
                    marks={{
                      [fieldConfig.min]: fieldConfig.min,
                      [fieldConfig.default || fieldConfig.min]: '默认',
                      [fieldConfig.max]: fieldConfig.max
                    }}
                    tooltip={{ formatter: (value) => `${value}` }}
                  />
                </Form.Item>
              ) : fieldConfig.min !== undefined ? (
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
        
        <Space style={{ marginTop: 16 }}>
          <Button
            loading={testingProvider === providerKey}
            onClick={() => handleTestVoice(providerKey)}
            icon={<PlayCircleOutlined />}
          >
            试听语音
          </Button>
        </Space>
      </div>
    );
  };

  const handleFinish = (values: any) => {
    console.log('TTS配置提交:', values);
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
        max_text_length: 10000,
        ...initialValues
      }}
    >
      {/* 基础设置 */}
      <Row gutter={16}>
          <Col span={6}>
            <Form.Item
              name="enabled"
              label="启用TTS服务"
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
                {Object.entries(TTS_PROVIDERS).map(([key, provider]) => (
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
              name="max_text_length"
              label="最大文本长度"
              rules={[{ required: true, message: '请输入最大文本长度' }]}
            >
              <InputNumber min={100} max={50000} />
            </Form.Item>
          </Col>
        </Row>

      {/* 提供商配置 */}
      <Tabs activeKey={activeProvider} onChange={setActiveProvider}>
          {Object.entries(TTS_PROVIDERS).map(([key, provider]) => (
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

      <Divider />


    </Form>
  );
};
