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
  Row,
  Col,
  Tooltip,
  Divider,
  Tag,
  Slider,
  Progress,
  Badge
} from 'antd';
import {
  InfoCircleOutlined,
  RobotOutlined,
  CheckCircleOutlined,
  WifiOutlined,
  ExperimentOutlined
} from '@ant-design/icons';

const { Option } = Select;
const { Text, Title } = Typography;

interface RobotConfigFormProps {
  initialValues?: any;
  onSave?: (values: any) => void;
  onCancel?: () => void;
}

// 网络接口选项
const NETWORK_INTERFACES = [
  { value: 'eth0', label: 'eth0 (以太网)', description: '有线网络接口' },
  { value: 'wlan0', label: 'wlan0 (WiFi)', description: '无线网络接口' },
  { value: 'lo', label: 'lo (本地回环)', description: '本地回环接口' }
];

// 机器人型号
const ROBOT_MODELS = [
  { value: 'go2', label: 'Unitree Go2', description: '四足机器人Go2系列' },
  { value: 'g1', label: 'Unitree G1', description: '人形机器人G1系列' },
  { value: 'h1', label: 'Unitree H1', description: '人形机器人H1系列' },
  { value: 'b2', label: 'Unitree B2', description: '四足机器人B2系列' }
];

// 连接状态
const CONNECTION_STATUS = {
  connected: { color: 'success', text: '已连接' },
  disconnected: { color: 'error', text: '未连接' },
  connecting: { color: 'processing', text: '连接中' },
  error: { color: 'error', text: '连接错误' }
};

export const RobotConfigForm: React.FC<RobotConfigFormProps> = ({
  initialValues,
  onSave,
  onCancel
}) => {
  const [form] = Form.useForm();
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [batteryLevel, setBatteryLevel] = useState<number>(85);
  const [robotModel, setRobotModel] = useState<string>('go2');

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue(initialValues);
      if (initialValues.model) {
        setRobotModel(initialValues.model);
      }
    }
  }, [initialValues, form]);

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus('connecting');
    
    // 模拟连接测试
    setTimeout(() => {
      const isConnected = Math.random() > 0.3; // 70% 成功率
      setConnectionStatus(isConnected ? 'connected' : 'error');
      setTestingConnection(false);
      
      if (isConnected) {
        setBatteryLevel(Math.floor(Math.random() * 100));
      }
    }, 3000);
  };

  const handleModelChange = (model: string) => {
    setRobotModel(model);
  };

  const handleFinish = (values: any) => {
    console.log('机器人配置提交:', values);
    onSave?.(values);
  };

  const renderMovementSettings = () => (
    <div style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name={['movement', 'forward_speed']}
            label={
              <Space>
                <span>前进速度</span>
                <Tooltip title="机器人向前移动的速度，单位：m/s">
                  <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                </Tooltip>
              </Space>
            }
            rules={[{ required: true, message: '请设置前进速度' }]}
          >
            <Slider
              min={0.1}
              max={2.0}
              step={0.1}
              marks={{
                0.1: '0.1',
                0.5: '0.5',
                1.0: '1.0',
                2.0: '2.0'
              }}
              tooltip={{ formatter: (value) => `${value} m/s` }}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name={['movement', 'backward_speed']}
            label={
              <Space>
                <span>后退速度</span>
                <Tooltip title="机器人向后移动的速度，通常为负值，单位：m/s">
                  <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                </Tooltip>
              </Space>
            }
            rules={[{ required: true, message: '请设置后退速度' }]}
          >
            <Slider
              min={-2.0}
              max={-0.1}
              step={0.1}
              marks={{
                '-2.0': '-2.0',
                '-1.0': '-1.0',
                '-0.5': '-0.5',
                '-0.1': '-0.1'
              }}
              tooltip={{ formatter: (value) => `${value} m/s` }}
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name={['movement', 'turn_speed']}
            label={
              <Space>
                <span>转向速度</span>
                <Tooltip title="机器人转向的角速度，单位：rad/s">
                  <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                </Tooltip>
              </Space>
            }
            rules={[{ required: true, message: '请设置转向速度' }]}
          >
            <Slider
              min={0.1}
              max={3.0}
              step={0.1}
              marks={{
                0.1: '0.1',
                1.0: '1.0',
                2.0: '2.0',
                3.0: '3.0'
              }}
              tooltip={{ formatter: (value) => `${value} rad/s` }}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name={['movement', 'action_duration']}
            label={
              <Space>
                <span>动作持续时间</span>
                <Tooltip title="单个动作指令的执行时间，单位：秒">
                  <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                </Tooltip>
              </Space>
            }
            rules={[{ required: true, message: '请设置动作持续时间' }]}
          >
            <InputNumber
              min={0.1}
              max={10.0}
              step={0.1}
              addonAfter="秒"
            />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );

  const renderConnectionSettings = () => (
    <div style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name={['connection', 'ip']}
            label="机器人IP地址"
            rules={[
              { required: true, message: '请输入机器人IP地址' },
              { pattern: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/, message: '请输入有效的IP地址' }
            ]}
          >
            <Input placeholder="例如：192.168.123.161" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name={['connection', 'port']}
            label="通信端口"
            rules={[
              { required: true, message: '请输入通信端口' },
              { type: 'number', min: 1, max: 65535, message: '端口范围：1-65535' }
            ]}
          >
            <InputNumber min={1} max={65535} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="network_interface"
            label="网络接口"
            rules={[{ required: true, message: '请选择网络接口' }]}
          >
            <Select placeholder="请选择网络接口">
              {NETWORK_INTERFACES.map(networkInterface => (
                <Option key={networkInterface.value} value={networkInterface.value}>
                  {networkInterface.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="model"
            label="机器人型号"
            rules={[{ required: true, message: '请选择机器人型号' }]}
          >
            <Select placeholder="请选择机器人型号" onChange={handleModelChange}>
              {ROBOT_MODELS.map(model => (
                <Option key={model.value} value={model.value}>
                  {model.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>
    </div>
  );

  const renderStatusPanel = () => (
    <div style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col span={8}>
          <div style={{ textAlign: 'center' }}>
            <Badge 
              status={CONNECTION_STATUS[connectionStatus as keyof typeof CONNECTION_STATUS]?.color as any} 
              text={CONNECTION_STATUS[connectionStatus as keyof typeof CONNECTION_STATUS]?.text}
            />
            <div style={{ marginTop: 8 }}>
              <Button
                type="primary"
                size="small"
                loading={testingConnection}
                onClick={handleTestConnection}
                icon={<WifiOutlined />}
              >
                测试连接
              </Button>
            </div>
          </div>
        </Col>
        <Col span={8}>
          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">电池电量</Text>
            <div style={{ marginTop: 4 }}>
              <Progress
                type="circle"
                size={60}
                percent={batteryLevel}
                format={() => `${batteryLevel}%`}
                strokeColor={
                  batteryLevel > 60 ? '#52c41a' : 
                  batteryLevel > 30 ? '#faad14' : '#ff4d4f'
                }
              />
            </div>
          </div>
        </Col>
        <Col span={8}>
          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">机器人型号</Text>
            <div style={{ marginTop: 8 }}>
              <Tag color="blue" style={{ fontSize: '14px', padding: '4px 8px' }}>
                {ROBOT_MODELS.find(m => m.value === robotModel)?.label || '未选择'}
              </Tag>
            </div>
          </div>
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
        available: false,
        model: 'go2',
        connection: {
          ip: '192.168.123.161',
          port: 8080
        },
        network_interface: 'eth0',
        movement: {
          forward_speed: 0.2,
          backward_speed: -0.2,
          turn_speed: 1.0,
          action_duration: 1.0
        },
        ...initialValues
      }}
    >


      {/* 基础设置 */}
      <div style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="available"
              label="启用机器人功能"
              valuePropName="checked"
              tooltip="启用后将激活机器人控制功能"
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col span={16}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Space size="large">
                <RobotOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
                <div>
                  <Title level={4} style={{ marginBottom: 0 }}>Unitree 机器人</Title>
                  <Text type="secondary">智能四足/人形机器人控制系统</Text>
                </div>
              </Space>
            </div>
          </Col>
        </Row>
      </div>

      {/* 状态面板 */}
      {renderStatusPanel()}

      {/* 连接设置 */}
      {renderConnectionSettings()}

      {/* 运动参数设置 */}
      {renderMovementSettings()}

      {/* 高级设置 */}
      <div style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="auto_reconnect"
              label="自动重连"
              valuePropName="checked"
              tooltip="连接断开时自动尝试重新连接"
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="heartbeat_interval"
              label="心跳间隔(秒)"
              tooltip="发送心跳包的间隔时间"
            >
              <InputNumber min={1} max={60} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="command_timeout"
              label="指令超时(秒)"
              tooltip="单个指令的最大执行时间"
            >
              <InputNumber min={1} max={30} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="log_level"
              label="日志级别"
              tooltip="设置机器人控制日志的详细程度"
            >
              <Select placeholder="请选择日志级别">
                <Option value="DEBUG">DEBUG - 调试信息</Option>
                <Option value="INFO">INFO - 一般信息</Option>
                <Option value="WARNING">WARNING - 警告信息</Option>
                <Option value="ERROR">ERROR - 错误信息</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="safety_mode"
              label="安全模式"
              valuePropName="checked"
              tooltip="启用安全模式将限制机器人的最大速度和动作范围"
            >
              <Switch />
            </Form.Item>
          </Col>
        </Row>
      </div>

      {/* 操作按钮 */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 8 }}>
        <Button 
          type="default" 
          icon={<ExperimentOutlined />}
          onClick={() => console.log('运行测试序列')}
        >
          测试序列
        </Button>
        <Button type="primary" htmlType="submit" icon={<CheckCircleOutlined />}>
          保存配置
        </Button>
      </div>
    </Form>
  );
};
