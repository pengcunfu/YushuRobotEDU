import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ReactNode } from 'react';

interface AppState {
  // 全局loading状态
  loading: boolean;
  setLoading: (loading: boolean) => void;

  // 侧边栏状态
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Header配置状态
  headerTitle: string;
  headerActions: ReactNode;
  setHeaderTitle: (title: string) => void;
  setHeaderActions: (actions: ReactNode) => void;

  // 错误处理
  error: string | null;
  setError: (error: string | null) => void;
  clearError: () => void;

  // 成功消息
  success: string | null;
  setSuccess: (message: string | null) => void;
  clearSuccess: () => void;
}

export const useStore = create<AppState>()(
  devtools(
    (set) => ({
      // 初始状态
      loading: false,
      sidebarCollapsed: false,
      headerTitle: '管理平台',
      headerActions: null,
      error: null,
      success: null,

      // Actions
      setLoading: (loading) => set({ loading }),
      
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      
      setHeaderTitle: (title) => set({ headerTitle: title }),
      setHeaderActions: (actions) => set({ headerActions: actions }),
      
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
      
      setSuccess: (success) => set({ success }),
      clearSuccess: () => set({ success: null }),
    }),
    { name: 'yushu-robot-store' }
  )
);
