import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, App as AntApp, message } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { Layout } from '@/components/Layout/Layout';
import { useStore } from '@/stores/useStore';
import './App.css';

// 创建 React Query 客户端
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// 懒加载页面组件
const ConfigCenter = React.lazy(() => 
  import('@/pages/Config/ConfigCenter').then(module => ({ default: module.ConfigCenter }))
);
const ChatInterface = React.lazy(() => 
  import('@/pages/Chat/ChatInterface').then(module => ({ default: module.ChatInterface }))
);
const SpeechRecognition = React.lazy(() => 
  import('@/pages/ASR/SpeechRecognition').then(module => ({ default: module.default }))
);
const TextToSpeech = React.lazy(() => 
  import('@/pages/TTS/TextToSpeech').then(module => ({ default: module.TextToSpeech }))
);
const DocumentWorkflow = React.lazy(() =>
  import('@/pages/Documents/DocumentWorkflow').then(module => ({ default: module.DocumentWorkflow }))
);
const KnowledgeManagement = React.lazy(() => 
  import('@/pages/Knowledge/KnowledgeManagement').then(module => ({ default: module.KnowledgeManagement }))
);
const PromptManagement = React.lazy(() => 
  import('@/pages/Prompt/PromptManagement').then(module => ({ default: module.PromptManagement }))
);

function App() {
  const { error, success, clearError, clearSuccess } = useStore();

  // 处理全局错误消息
  React.useEffect(() => {
    if (error) {
      message.error(error);
      clearError();
    }
  }, [error, clearError]);

  // 处理全局成功消息
  React.useEffect(() => {
    if (success) {
      message.success(success);
      clearSuccess();
    }
  }, [success, clearSuccess]);

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider locale={zhCN}>
        <AntApp>
          <Router future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
            <div className="App">
              <Layout>
                <React.Suspense 
                  fallback={
                    <div className="flex items-center justify-center h-64">
                      <div className="text-lg">加载中...</div>
                    </div>
                  }
                >
                  <Routes>
                    <Route path="/" element={<Navigate to="/configs" replace />} />
                    <Route path="/configs" element={<ConfigCenter />} />
                    <Route path="/chat" element={<ChatInterface />} />
                    <Route path="/asr" element={<SpeechRecognition />} />
                    <Route path="/tts" element={<TextToSpeech />} />
                    <Route path="/documents" element={<DocumentWorkflow />} />
                    <Route path="/knowledge" element={<KnowledgeManagement />} />
                    <Route path="/prompt" element={<PromptManagement />} />
                  </Routes>
                </React.Suspense>
              </Layout>
            </div>
          </Router>
        </AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

export default App;
