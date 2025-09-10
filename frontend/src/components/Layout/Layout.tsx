import React from 'react';
import { Layout as AntLayout } from 'antd';
import { Sidebar } from './Sidebar';
import { useStore } from '@/stores/useStore';

const { Content } = AntLayout;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { sidebarCollapsed } = useStore();

  return (
    <AntLayout className="min-h-screen">
      <Sidebar />
      <AntLayout className={`transition-all duration-200 ${sidebarCollapsed ? 'ml-[60px]' : 'ml-[200px]'} max-md:ml-0`}>
        <Content className="bg-gray-50">
          <div className="h-full">
            {children}
          </div>
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export { Layout };
