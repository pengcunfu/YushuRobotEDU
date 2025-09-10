/**
 * 配置中心主页面
 * 左侧菜单显示配置模块，右侧显示对应的配置表单
 */

import React, { useState } from 'react';
import {
  Layout,
  Menu,
  Alert,
  Button,
  Space
} from 'antd';
import {
  SettingOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
  AudioOutlined,
  SoundOutlined,
  RobotOutlined,
  SaveOutlined,
  ReloadOutlined,
  DownloadOutlined,
  UploadOutlined
} from '@ant-design/icons';
import { DatabaseConfigForm } from './components/DatabaseConfigForm';
import { LLMConfigForm } from './components/LLMConfigForm';
import { ASRConfigForm } from './components/ASRConfigForm';
import { TTSConfigForm } from './components/TTSConfigForm';
import { RobotConfigForm } from './components/RobotConfigForm';
import { AgentConfigForm } from './components/AgentConfigForm';
import { Header } from '@/components/Layout/Header';

const { Sider, Content } = Layout;

// 配置模块菜单项
const configModules = [
  {
    key: 'default',
    label: '基础配置',
    icon: <SettingOutlined />,
    description: '系统基础设置',
    component: 'DefaultConfigForm'
  },
  {
    key: 'database',
    label: '数据库配置',
    icon: <DatabaseOutlined />,
    description: 'MongoDB、Redis等数据库配置',
    component: 'DatabaseConfigForm'
  },
  {
    key: 'robot',
    label: '机器人配置',
    icon: <RobotOutlined />,
    description: '机器人连接和控制配置',
    component: 'RobotConfigForm'
  },
  {
    key: 'llm',
    label: '大语言模型',
    icon: <ThunderboltOutlined />,
    description: 'LLM服务配置',
    component: 'LLMConfigForm'
  },
  {
    key: 'asr',
    label: '语音识别',
    icon: <AudioOutlined />,
    description: 'ASR语音识别配置',
    component: 'ASRConfigForm'
  },
  {
    key: 'tts',
    label: '语音合成',
    icon: <SoundOutlined />,
    description: 'TTS语音合成配置',
    component: 'TTSConfigForm'
  }
];

export const ConfigCenter: React.FC = () => {
  const [selectedModule, setSelectedModule] = useState<string>('database');



  // 渲染配置表单组件
  const renderConfigForm = () => {

    // 根据选中的模块渲染对应的配置表单
    switch (selectedModule) {
      case 'database':
        return (
          <DatabaseConfigForm
            module={{
              name: 'database',
              title: '数据库配置',
              description: 'MongoDB、Redis、MySQL、PostgreSQL等数据库连接配置'
            }}
            onUpdate={() => {
              // 配置更新后的回调
              console.log('数据库配置已更新');
            }}
          />
        );
      
      case 'default':
        return (
          <AgentConfigForm 
            onSave={(values) => {
              console.log('基础配置已保存:', values);
            }}
          />
        );
      
      case 'robot':
        return (
          <RobotConfigForm 
            onSave={(values) => {
              console.log('机器人配置已保存:', values);
            }}
          />
        );
      
      case 'llm':
        return (
          <LLMConfigForm 
            onSave={(values) => {
              console.log('LLM配置已保存:', values);
            }}
          />
        );
      
      case 'asr':
        return (
          <ASRConfigForm 
            onSave={(values) => {
              console.log('ASR配置已保存:', values);
            }}
          />
        );
      
      case 'tts':
        return (
          <TTSConfigForm 
            onSave={(values) => {
              console.log('TTS配置已保存:', values);
            }}
          />
        );
      
      default:
        return (
          <div className="p-6">
            <Alert
              message="未知配置模块"
              description="请选择一个有效的配置模块"
              type="warning"
              showIcon
            />
          </div>
        );
    }
  };

  return (
    <div className="config-center">
      <Header 
        title="配置中心"
        actions={
          <Space>
            <Button 
              type="text" 
              icon={<SaveOutlined />}
              title="保存配置"
            >
              保存配置
            </Button>
            <Button 
              type="text" 
              icon={<ReloadOutlined />}
              title="重新加载"
            >
              重载
            </Button>
            <Button 
              type="text" 
              icon={<DownloadOutlined />}
              title="导出配置"
            >
              导出
            </Button>
            <Button 
              type="text" 
              icon={<UploadOutlined />}
              title="导入配置"
            >
              导入
            </Button>
          </Space>
        }
      />
      
      <Layout className="h-screen">
      {/* 左侧菜单 */}
      <Sider width={240} style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}>
        <Menu
          mode="inline"
          selectedKeys={[selectedModule]}
          className="config-center-menu"
          style={{ border: 'none', padding: '0' }}
          onSelect={({ key }) => setSelectedModule(key)}
          items={configModules.map(module => ({
            key: module.key,
            icon: module.icon,
            label: (
              <div>
                <div style={{ fontWeight: 500, marginBottom: '2px' }}>
                  {module.label}
                </div>
                <div style={{ fontSize: '12px', color: '#999', lineHeight: '1.2' }}>
                  {module.description}
                </div>
              </div>
            )
          }))}
        />
      </Sider>

      {/* 右侧内容区域 */}
      <Content className="bg-white">
        <div className="p-6  h-full overflow-auto">

          {/* 配置表单内容 */}
          {renderConfigForm()}
        </div>
      </Content>
      </Layout>
    </div>
  );
};