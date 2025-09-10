import { apiService } from './api';
import { ChatRequest, ChatResponse, ProvidersResponse, StreamChunk } from '@/types';

export const llmService = {
  // 获取可用的LLM提供商
  getProviders: async (): Promise<ProvidersResponse> => {
    return apiService.get('/api/llm/providers');
  },

  // 发送聊天消息（非流式）
  chat: async (request: ChatRequest): Promise<ChatResponse> => {
    return apiService.post('/api/llm/chat', request);
  },

  // 发送聊天消息（流式）
  chatStream: async (
    request: ChatRequest,
    onChunk: (chunk: StreamChunk) => void,
    onComplete?: () => void,
    onError?: (error: string) => void
  ): Promise<void> => {
    try {
      const response = await fetch('/api/llm/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...request, stream: true }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取响应流');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              onChunk(data);
              
              if (data.type === 'done') {
                onComplete?.();
                return;
              } else if (data.type === 'error') {
                onError?.(data.error || '未知错误');
                return;
              }
            } catch (e) {
              console.warn('解析SSE数据失败:', line);
            }
          }
        }
      }
    } catch (error) {
      console.error('流式聊天请求失败:', error);
      onError?.(error instanceof Error ? error.message : '网络错误');
    }
  },

  // 获取LLM配置
  getConfig: async () => {
    return apiService.get('/api/llm/config');
  },

  // 更新LLM配置
  updateConfig: async (config: any) => {
    return apiService.put('/api/llm/config', { config });
  },

  // LLM服务健康检查
  healthCheck: async () => {
    return apiService.get('/api/llm/health');
  }
};
