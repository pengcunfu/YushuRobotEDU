/**
 * 数据库配置表单组件
 * 支持MongoDB、Redis、MySQL、PostgreSQL的配置管理
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Switch,
  Button,
  message,
  Tabs,
  Space,
  Row,
  Col,
  InputNumber,
  Badge,
  Spin
} from 'antd';
import {
  DatabaseOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  ExperimentOutlined
} from '@ant-design/icons';
import { configCenterService } from '@/services/configCenterService';

const { Password } = Input;

interface DatabaseConfigFormProps {
  module: {
    name: string;
    title: string;
    description: string;
  };
}

export const DatabaseConfigForm: React.FC<DatabaseConfigFormProps> = ({
  module
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [configData, setConfigData] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<Record<string, 'success' | 'error' | 'unknown'>>({});

  // 加载配置数据
  const loadConfigData = async () => {
    setLoading(true);
    try {
      const data = await configCenterService.getModuleConfig(module.name);
      setConfigData(data);
      form.setFieldsValue(data.config);
    } catch (error) {
      message.error('加载配置失败');
      console.error('加载配置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigData();
  }, [module.name]);


  // 测试连接
  const testConnection = async (dbType: string) => {
    setTesting(prev => ({ ...prev, [dbType]: true }));
    try {
      const values = form.getFieldsValue();
      const response = await fetch('/api/config-center/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          db_type: dbType,
          connection_config: values[dbType]
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setConnectionStatus(prev => ({ ...prev, [dbType]: 'success' }));
        message.success(`${dbType.toUpperCase()}连接测试成功`);
      } else {
        setConnectionStatus(prev => ({ ...prev, [dbType]: 'error' }));
        message.error(`${dbType.toUpperCase()}连接测试失败: ${result.message || '未知错误'}`);
      }
    } catch (error) {
      setConnectionStatus(prev => ({ ...prev, [dbType]: 'error' }));
      message.error(`${dbType.toUpperCase()}连接测试失败`);
    } finally {
      setTesting(prev => ({ ...prev, [dbType]: false }));
    }
  };

  // 获取连接状态徽章
  const getStatusBadge = (dbType: string) => {
    const status = connectionStatus[dbType] || 'unknown';
    const statusConfig = {
      success: { status: 'success', text: '连接正常' },
      error: { status: 'error', text: '连接失败' },
      unknown: { status: 'default', text: '未测试' }
    };
    
    const config = statusConfig[status];
    return <Badge status={config.status as any} text={config.text} />;
  };


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Spin size="large" />
        <div className="mt-4 text-gray-500">加载配置中...</div>
      </div>
    );
  }

  const renderMongoDBConfig = () => (
    <div>
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            label="启用MongoDB"
            name={['mongodb', 'enabled']}
            valuePropName="checked"
            tooltip="是否启用MongoDB数据库，用于文档处理记录存储"
          >
            <Switch />
          </Form.Item>
        </Col>
        <Col span={24}>
          <Form.Item
            label="连接URL"
            name={['mongodb', 'url']}
            rules={[{ required: true, message: '请输入MongoDB连接URL' }]}
            tooltip="MongoDB连接字符串，格式：mongodb://host:port"
          >
            <Input placeholder="mongodb://8.153.175.16:27017" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="数据库名称"
            name={['mongodb', 'database']}
            rules={[{ required: true, message: '请输入数据库名称' }]}
          >
            <Input placeholder="yushu_documents" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="连接超时(秒)"
            name={['mongodb', 'timeout']}
            tooltip="连接超时时间，单位：秒"
          >
            <InputNumber min={1} max={60} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="用户名"
            name={['mongodb', 'username']}
            tooltip="如果MongoDB需要认证，请填写用户名"
          >
            <Input placeholder="可选" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="密码"
            name={['mongodb', 'password']}
            tooltip="如果MongoDB需要认证，请填写密码"
          >
            <Password 
              placeholder="可选"
              iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
            />
          </Form.Item>
        </Col>
      </Row>

      <Button 
          icon={<ExperimentOutlined />}
          onClick={() => testConnection('mongodb')}
          loading={testing.mongodb}
        >
          测试连接
        </Button>
    </div>
  );

  const renderRedisConfig = () => (
    <div>
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            label="启用Redis"
            name={['redis', 'enabled']}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="主机地址"
            name={['redis', 'host']}
            rules={[{ required: true, message: '请输入Redis主机地址' }]}
          >
            <Input placeholder="8.153.175.16" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="端口"
            name={['redis', 'port']}
            rules={[{ required: true, message: '请输入端口号' }]}
          >
            <InputNumber min={1} max={65535} placeholder="6379" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="数据库索引"
            name={['redis', 'db']}
          >
            <InputNumber min={0} max={15} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="密码"
            name={['redis', 'password']}
          >
            <Password 
              placeholder="可选"
              iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
            />
          </Form.Item>
        </Col>
      </Row>
      <Button 
          icon={<ExperimentOutlined />}
          onClick={() => testConnection('redis')}
          loading={testing.redis}
        >
          测试连接
        </Button>
    </div>
  );

  const renderMySQLConfig = () => (
    <div>
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            label="启用MySQL"
            name={['mysql', 'enabled']}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="主机地址"
            name={['mysql', 'host']}
            rules={[{ required: true, message: '请输入MySQL主机地址' }]}
          >
            <Input placeholder="8.153.175.16" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="端口"
            name={['mysql', 'port']}
            rules={[{ required: true, message: '请输入端口号' }]}
          >
            <InputNumber min={1} max={65535} placeholder="3306" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="数据库名"
            name={['mysql', 'database']}
            rules={[{ required: true, message: '请输入数据库名' }]}
          >
            <Input placeholder="yushu_app" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="用户名"
            name={['mysql', 'username']}
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="root" />
          </Form.Item>
        </Col>
        <Col span={24}>
          <Form.Item
            label="密码"
            name={['mysql', 'password']}
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Password 
              placeholder="数据库密码"
              iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
            />
          </Form.Item>
        </Col>
      </Row>
      <Button 
          icon={<ExperimentOutlined />}
          onClick={() => testConnection('mysql')}
          loading={testing.mysql}
        >
          测试连接
        </Button>
    </div>
  );

  const renderPostgreSQLConfig = () => (
    <div>

    <Row gutter={16}>
      <Col span={24}>
        <Form.Item
          label="启用PostgreSQL"
          name={['postgresql', 'enabled']}
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          label="主机地址"
          name={['postgresql', 'host']}
          rules={[{ required: true, message: '请输入PostgreSQL主机地址' }]}
        >
          <Input placeholder="8.153.175.16" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          label="端口"
          name={['postgresql', 'port']}
          rules={[{ required: true, message: '请输入端口号' }]}
        >
          <InputNumber min={1} max={65535} placeholder="5432" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          label="数据库名"
          name={['postgresql', 'database']}
          rules={[{ required: true, message: '请输入数据库名' }]}
        >
          <Input placeholder="yushu_app" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          label="用户名"
          name={['postgresql', 'username']}
          rules={[{ required: true, message: '请输入用户名' }]}
        >
          <Input placeholder="postgres" />
        </Form.Item>
      </Col>
      <Col span={24}>
        <Form.Item
          label="密码"
          name={['postgresql', 'password']}
          rules={[{ required: true, message: '请输入密码' }]}
        >
          <Password 
            placeholder="数据库密码"
            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
          />
        </Form.Item>
      </Col>
    </Row>

    <Button 
        icon={<ExperimentOutlined />}
        onClick={() => testConnection('postgresql')}
        loading={testing.postgresql}
      >
        测试连接
      </Button>
    </div>
  );

  return (
    <div>
      <Form
          form={form}
          layout="vertical"
        >
          <Tabs 
            defaultActiveKey="mongodb"
            items={[
              {
                key: 'mongodb',
                label: (
                  <Space>
                    <DatabaseOutlined />
                    MongoDB
                    <Badge 
                      status={configData?.config?.mongodb?.enabled ? 'success' : 'default'} 
                    />
                  </Space>
                ),
                children: renderMongoDBConfig()
              },
              {
                key: 'redis',
                label: (
                  <Space>
                    <DatabaseOutlined />
                    Redis
                    <Badge 
                      status={configData?.config?.redis?.enabled ? 'success' : 'default'} 
                    />
                  </Space>
                ),
                children: renderRedisConfig()
              },
              {
                key: 'mysql',
                label: (
                  <Space>
                    <DatabaseOutlined />
                    MySQL
                    <Badge 
                      status={configData?.config?.mysql?.enabled ? 'success' : 'default'} 
                    />
                  </Space>
                ),
                children: renderMySQLConfig()
              },
              {
                key: 'postgresql',
                label: (
                  <Space>
                    <DatabaseOutlined />
                    PostgreSQL
                    <Badge 
                      status={configData?.config?.postgresql?.enabled ? 'success' : 'default'} 
                    />
                  </Space>
                ),
                children: renderPostgreSQLConfig()
              }
            ]}
          />
        </Form>
    </div>
  );
};
