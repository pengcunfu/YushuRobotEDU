import React from 'react';
import { Layout, Menu } from 'antd';
import {
  SettingOutlined,
  MessageOutlined,
  AudioOutlined,
  SoundOutlined,
  FileTextOutlined,
  BookOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '@/stores/useStore';

const { Sider } = Layout;

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { sidebarCollapsed, setSidebarCollapsed } = useStore();

  const menuItems = [
    {
      key: '/configs',
      icon: <SettingOutlined />,
      label: <Link to="/configs">配置中心</Link>,
    },
    {
      key: '/chat',
      icon: <MessageOutlined />,
      label: <Link to="/chat">智能对话</Link>,
    },
    {
      key: '/asr',
      icon: <AudioOutlined />,
      label: <Link to="/asr">语音识别</Link>,
    },
    {
      key: '/tts',
      icon: <SoundOutlined />,
      label: <Link to="/tts">语音合成</Link>,
    },
    {
      key: '/documents',
      icon: <FileTextOutlined />,
      label: <Link to="/documents">文档处理</Link>,
    },
    {
      key: '/knowledge',
      icon: <BookOutlined />,
      label: <Link to="/knowledge">知识库管理</Link>,
    },
    {
      key: '/prompt',
      icon: <BulbOutlined />,
      label: <Link to="/prompt">提示词管理</Link>,
    },
  ];

  return (
    <Sider
      collapsed={sidebarCollapsed}
      width={200}
      collapsedWidth={60}
      className="fixed left-0 top-0 bottom-0 z-10 bg-white shadow-lg max-md:hidden"
      theme="light"
    >
      {/* Logo区域 - 点击可折叠/展开菜单 */}
      <div 
        className="h-16 flex items-center justify-center border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        title={sidebarCollapsed ? "展开菜单" : "折叠菜单"}
      >
        {!sidebarCollapsed ? (
          <div className="text-xl font-bold text-blue-600">
            YushuRobot
          </div>
        ) : (
          <div className="text-xl font-bold text-blue-600">
            YR
          </div>
        )}
      </div>

      {/* 导航菜单 */}
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        className="border-none bg-transparent"
        theme="light"
      />
    </Sider>
  );
};
