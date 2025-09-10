import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  InputNumber,
  Switch,
  Select,
  Space,
  Button,
  Row,
  Col,
  message,
  Tabs
} from 'antd';
import {
  UserOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  MessageOutlined,
  SettingOutlined
} from '@ant-design/icons';

const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

interface AgentConfigFormProps {
  initialValues?: any;
  onSave?: (values: any) => void;
  onCancel?: () => void;
}

// 智能体类型
const AGENT_TYPES = [
  { value: 'assistant', label: '助手型', description: '通用助手，能够回答问题和执行任务' },
  { value: 'companion', label: '陪伴型', description: '情感陪伴，适合聊天和互动' },
  { value: 'educator', label: '教育型', description: '教育辅助，专注于知识传授' },
  { value: 'entertainer', label: '娱乐型', description: '娱乐互动，提供趣味内容' },
  { value: 'professional', label: '专业型', description: '专业领域专家，提供专业建议' }
];

// 性格特征
const PERSONALITY_TRAITS = [
  { value: 'friendly', label: '友好', color: 'green' },
  { value: 'professional', label: '专业', color: 'blue' },
  { value: 'humorous', label: '幽默', color: 'orange' },
  { value: 'patient', label: '耐心', color: 'cyan' },
  { value: 'creative', label: '创意', color: 'purple' },
  { value: 'logical', label: '逻辑', color: 'geekblue' },
  { value: 'empathetic', label: '共情', color: 'magenta' },
  { value: 'energetic', label: '活力', color: 'red' }
];

// 知识领域
const KNOWLEDGE_DOMAINS = [
  { value: 'general', label: '通用知识', description: '日常生活常识' },
  { value: 'technology', label: '科技', description: '计算机、AI、编程等' },
  { value: 'science', label: '科学', description: '物理、化学、生物等' },
  { value: 'education', label: '教育', description: '教学方法、课程设计等' },
  { value: 'business', label: '商业', description: '管理、营销、金融等' },
  { value: 'health', label: '健康', description: '医疗、养生、运动等' },
  { value: 'entertainment', label: '娱乐', description: '音乐、电影、游戏等' },
  { value: 'culture', label: '文化', description: '历史、文学、艺术等' }
];

// 语言风格
const LANGUAGE_STYLES = [
  { value: 'formal', label: '正式', description: '严谨、专业的表达方式' },
  { value: 'casual', label: '随意', description: '轻松、自然的对话风格' },
  { value: 'academic', label: '学术', description: '严肃、准确的学术表达' },
  { value: 'conversational', label: '对话', description: '亲切、互动的交流方式' },
  { value: 'creative', label: '创意', description: '富有想象力的表达' },
  { value: 'concise', label: '简洁', description: '简明扼要的回答方式' }
];

export const AgentConfigForm: React.FC<AgentConfigFormProps> = ({
  initialValues,
  onSave
}) => {
  const [form] = Form.useForm();
  const [testingAgent, setTestingAgent] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('basic');

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue(initialValues);
    }
  }, [initialValues, form]);


  const handleTestAgent = async () => {
    setTestingAgent(true);
    // 模拟智能体测试
    setTimeout(() => {
      setTestingAgent(false);
      message.success('智能体测试完成！响应正常。');
    }, 3000);
  };

  const handleFinish = (values: any) => {
    console.log('智能体配置提交:', values);
    onSave?.(values);
  };


  const renderBasicSettings = () => (
    <div>
        <Row gutter={16}>
          <Col span={16}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="name"
                  label="智能体名称"
                  rules={[{ required: true, message: '请输入智能体名称' }]}
                >
                  <Input placeholder="例如：小助手、小美" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="version"
                  label="版本号"
                  rules={[{ required: true, message: '请输入版本号' }]}
                >
                  <Input placeholder="例如：1.0.0" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              name="description"
              label="描述"
              rules={[{ required: true, message: '请输入智能体描述' }]}
            >
              <TextArea 
                rows={3} 
                placeholder="描述智能体的功能和特点..."
                maxLength={200}
                showCount
              />
            </Form.Item>
          </Col>
          
        </Row>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="type"
              label="智能体类型"
              rules={[{ required: true, message: '请选择智能体类型' }]}
            >
              <Select placeholder="请选择类型">
            {AGENT_TYPES.map(type => (
              <Option key={type.value} value={type.value}>
                {type.label}
              </Option>
            ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="language"
              label="主要语言"
              rules={[{ required: true, message: '请选择主要语言' }]}
            >
              <Select placeholder="请选择语言">
                <Option value="zh-CN">中文（简体）</Option>
                <Option value="zh-TW">中文（繁体）</Option>
                <Option value="en-US">English</Option>
                <Option value="ja-JP">日本語</Option>
                <Option value="ko-KR">한국어</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="enabled"
              label="启用状态"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="knowledge_domains"
          label="专长领域"
          rules={[{ required: true, message: '请选择至少一个知识领域' }]}
        >
          <Select 
            mode="multiple" 
            placeholder="请选择知识领域"
            maxTagCount={4}
          >
            {KNOWLEDGE_DOMAINS.map(domain => (
              <Option key={domain.value} value={domain.value}>
                {domain.label}
              </Option>
            ))}
          </Select>
        </Form.Item>
    </div>
  );

  const renderPersonalitySettings = () => (
    <div>
        <Form.Item
          name={['personality', 'traits']}
          label="性格标签"
          rules={[{ required: true, message: '请选择至少一个性格特征' }]}
        >
          <Select 
            mode="multiple" 
            placeholder="请选择性格特征"
            maxTagCount={5}
          >
            {PERSONALITY_TRAITS.map(trait => (
              <Option key={trait.value} value={trait.value}>
                {trait.label}
              </Option>
            ))}
          </Select>
        </Form.Item>
        
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name={['personality', 'friendliness']}
              label="友好度"
              tooltip="控制智能体的友好程度"
            >
              <Select placeholder="请选择友好度">
                <Option value={1}>冷淡</Option>
                <Option value={2}>较冷淡</Option>
                <Option value={3}>略显冷淡</Option>
                <Option value={4}>中性偏冷</Option>
                <Option value={5}>适中</Option>
                <Option value={6}>中性偏热</Option>
                <Option value={7}>较友好</Option>
                <Option value={8}>友好</Option>
                <Option value={9}>很友好</Option>
                <Option value={10}>热情</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name={['personality', 'humor']}
              label="幽默感"
              tooltip="控制智能体的幽默程度"
            >
              <Select placeholder="请选择幽默感">
                <Option value={1}>严肃</Option>
                <Option value={2}>较严肃</Option>
                <Option value={3}>略显严肃</Option>
                <Option value={4}>中性偏严肃</Option>
                <Option value={5}>适中</Option>
                <Option value={6}>中性偏幽默</Option>
                <Option value={7}>较幽默</Option>
                <Option value={8}>幽默</Option>
                <Option value={9}>很幽默</Option>
                <Option value={10}>非常幽默</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name={['personality', 'formality']}
              label="正式度"
              tooltip="控制智能体的正式程度"
            >
              <Select placeholder="请选择正式度">
                <Option value={1}>随意</Option>
                <Option value={2}>较随意</Option>
                <Option value={3}>略显随意</Option>
                <Option value={4}>中性偏随意</Option>
                <Option value={5}>适中</Option>
                <Option value={6}>中性偏正式</Option>
                <Option value={7}>较正式</Option>
                <Option value={8}>正式</Option>
                <Option value={9}>很正式</Option>
                <Option value={10}>非常正式</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name={['language_style', 'style']}
              label="表达风格"
              rules={[{ required: true, message: '请选择语言风格' }]}
            >
              <Select placeholder="请选择语言风格">
                {LANGUAGE_STYLES.map(style => (
                  <Option key={style.value} value={style.value}>
                    {style.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name={['language_style', 'verbosity']}
              label="详细程度"
              tooltip="控制回答的详细程度"
            >
              <Select placeholder="请选择详细程度">
                <Option value="brief">简洁 - 简短回答</Option>
                <Option value="moderate">适中 - 平衡详细度</Option>
                <Option value="detailed">详细 - 完整解释</Option>
                <Option value="comprehensive">全面 - 深入分析</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Form.Item
          name={['language_style', 'greeting']}
          label="个性化问候语"
        >
          <TextArea 
            rows={2} 
            placeholder="设置智能体的专属问候语..."
            maxLength={100}
            showCount
          />
        </Form.Item>
    </div>
  );

  const renderAdvancedSettings = () => (
    <div>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name={['behavior', 'response_time']}
              label="响应延迟(秒)"
              tooltip="模拟思考时间，让对话更自然"
            >
              <Select placeholder="请选择响应延迟">
                <Option value={0}>即时 (0秒)</Option>
                <Option value={0.5}>很快 (0.5秒)</Option>
                <Option value={1}>快速 (1秒)</Option>
                <Option value={1.5}>较快 (1.5秒)</Option>
                <Option value={2}>适中 (2秒)</Option>
                <Option value={2.5}>较慢 (2.5秒)</Option>
                <Option value={3}>慢速 (3秒)</Option>
                <Option value={3.5}>很慢 (3.5秒)</Option>
                <Option value={4}>缓慢 (4秒)</Option>
                <Option value={5}>非常缓慢 (5秒)</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name={['behavior', 'proactivity']}
              label="主动性"
              tooltip="智能体主动发起对话的程度"
            >
              <Select placeholder="请选择主动性">
                <Option value={1}>被动</Option>
                <Option value={2}>较被动</Option>
                <Option value={3}>略显被动</Option>
                <Option value={4}>中性偏被动</Option>
                <Option value={5}>适中</Option>
                <Option value={6}>中性偏主动</Option>
                <Option value={7}>较主动</Option>
                <Option value={8}>主动</Option>
                <Option value={9}>很主动</Option>
                <Option value={10}>非常主动</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name={['behavior', 'memory_span']}
              label="记忆跨度"
              tooltip="记住对话历史的轮数"
            >
              <InputNumber
                min={1}
                max={50}
                style={{ width: '100%' }}
                addonAfter="轮"
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={6}>
            <Form.Item
              name={['behavior', 'emotion_recognition']}
              label="情感识别"
              valuePropName="checked"
              tooltip="是否启用情感识别功能"
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name={['behavior', 'context_awareness']}
              label="上下文感知"
              valuePropName="checked"
              tooltip="是否保持对话上下文的理解"
            >
              <Switch />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={6}>
            <Form.Item
              name={['safety', 'content_filter']}
              label="内容过滤"
              valuePropName="checked"
              tooltip="过滤不当内容"
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name={['safety', 'privacy_protection']}
              label="隐私保护"
              valuePropName="checked"
              tooltip="保护用户隐私信息"
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name={['safety', 'safe_mode']}
              label="安全模式"
              valuePropName="checked"
              tooltip="启用安全模式限制"
            >
              <Switch />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item
          name={['safety', 'restricted_topics']}
          label="限制话题"
          tooltip="设置智能体不应讨论的话题"
        >
          <Select mode="tags" placeholder="输入限制话题...">
            <Option value="politics">政治</Option>
            <Option value="violence">暴力</Option>
            <Option value="adult">成人内容</Option>
            <Option value="illegal">违法活动</Option>
          </Select>
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name={['integration', 'llm_provider']}
              label="LLM提供商"
              tooltip="选择智能体使用的大语言模型"
            >
              <Select placeholder="请选择LLM提供商">
                <Option value="aliyun">阿里云通义千问</Option>
                <Option value="baidu">百度文心一言</Option>
                <Option value="tencent">腾讯混元</Option>
                <Option value="xunfei">讯飞星火</Option>
                <Option value="douyin">抖音云雀</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name={['integration', 'tts_provider']}
              label="TTS提供商"
              tooltip="选择语音合成服务提供商"
            >
              <Select placeholder="请选择TTS提供商">
                <Option value="baidu">百度语音合成</Option>
                <Option value="xunfei">讯飞语音合成</Option>
                <Option value="aliyun">阿里云语音合成</Option>
                <Option value="tencent">腾讯云语音合成</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={6}>
            <Form.Item
              name={['integration', 'robot_control']}
              label="机器人控制"
              valuePropName="checked"
              tooltip="是否允许控制机器人动作"
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name={['integration', 'external_api']}
              label="外部API调用"
              valuePropName="checked"
              tooltip="是否允许调用外部API"
            >
              <Switch />
            </Form.Item>
          </Col>
        </Row>
    </div>
  );

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      initialValues={{
        name: 'YushuBot',
        version: '1.0.0',
        type: 'assistant',
        language: 'zh-CN',
        enabled: true,
        knowledge_domains: ['general', 'technology'],
        personality: {
          traits: ['friendly', 'professional'],
          friendliness: 7,
          humor: 5,
          formality: 6
        },
        language_style: {
          style: 'conversational',
          verbosity: 'moderate'
        },
        behavior: {
          response_time: 1,
          proactivity: 5,
          memory_span: 10,
          emotion_recognition: true,
          context_awareness: true
        },
        safety: {
          content_filter: true,
          privacy_protection: true,
          safe_mode: false
        },
        integration: {
          robot_control: false,
          external_api: false
        },
        ...initialValues
      }}
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane 
          tab={
            <Space>
              <SettingOutlined />
              <span>基本设置</span>
            </Space>
          } 
          key="basic"
        >
          {renderBasicSettings()}
        </TabPane>
        
        <TabPane 
          tab={
            <Space>
              <UserOutlined />
              <span>个性设置</span>
            </Space>
          } 
          key="personality"
        >
          {renderPersonalitySettings()}
        </TabPane>
        
        <TabPane 
          tab={
            <Space>
              <ThunderboltOutlined />
              <span>高级设置</span>
            </Space>
          } 
          key="advanced"
        >
          {renderAdvancedSettings()}
        </TabPane>
      </Tabs>


      {/* 操作按钮 */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 8 }}>
        <Button 
          type="default" 
          icon={<MessageOutlined />}
          loading={testingAgent}
          onClick={handleTestAgent}
        >
          测试对话
        </Button>
        <Button type="primary" htmlType="submit" icon={<CheckCircleOutlined />}>
          保存配置
        </Button>
      </div>
    </Form>
  );
};
