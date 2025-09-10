import React, { ReactNode } from 'react';
import { Layout } from 'antd';
import { useStore } from '@/stores/useStore';

const { Header: AntHeader } = Layout;

interface HeaderProps {
  title?: string;
  actions?: ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, actions }) => {
  const { headerTitle, headerActions } = useStore();

  // 优先使用props传入的值，否则使用store中的值
  const displayTitle = title || headerTitle;
  const displayActions = actions || headerActions;

  return (
    <AntHeader className="bg-white border-b border-gray-200 px-6 flex items-center justify-between shadow-sm">
      {/* 左侧标题区域 */}
      <div className="flex items-center">
        <h1 className="text-xl font-semibold text-gray-800 m-0">
          {displayTitle}
        </h1>
      </div>

      {/* 右侧操作按钮区域 */}
      <div className="flex items-center">
        {displayActions}
      </div>
    </AntHeader>
  );
};
