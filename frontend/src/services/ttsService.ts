import { apiService } from './api';
import { TTSRequest, TTSResponse, TTSProvidersResponse, VoicesResponse } from '@/types';

// 流式TTS事件类型
export interface TTSStreamEvent {
  type: 'start' | 'audio_chunk' | 'complete' | 'error' | 'end' | 'heartbeat';
  session_id: string;
  data?: string; // base64编码的音频数据
  chunk_count?: number;
  total_size?: number;
  is_final?: boolean;
  error?: string;
  message?: string;
  provider?: string;
  voice?: string;
  text_length?: number;
  timestamp?: number;
}

// 流式TTS回调函数类型
export type TTSStreamCallback = (event: TTSStreamEvent) => void;

export const ttsService = {
  // 获取可用的TTS提供商
  getProviders: async (): Promise<TTSProvidersResponse> => {
    return apiService.get('/api/tts/providers');
  },

  // 获取指定提供商的发音人列表
  getVoices: async (provider: string): Promise<VoicesResponse> => {
    return apiService.get(`/api/tts/voices/${provider}`);
  },

  // 文本转语音合成（传统方式）
  synthesizeText: async (request: TTSRequest): Promise<TTSResponse> => {
    return apiService.post('/api/tts/synthesize', request);
  },

  // 流式文本转语音合成
  synthesizeTextStream: (request: TTSRequest, callback: TTSStreamCallback): EventSource => {
    const baseURL = import.meta.env.VITE_API_URL || 'http://8.153.175.16t:8000';
    const url = `${baseURL}/api/tts/synthesize/stream`;
    
    // 创建EventSource连接
    const eventSource = new EventSource(url, {
      withCredentials: false
    });
    
    // 发送请求参数
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    }).catch(error => {
      console.error('Failed to send stream request:', error);
      callback({
        type: 'error',
        session_id: '',
        error: `Failed to start stream: ${error.message}`
      });
    });
    
    // 监听消息
    eventSource.onmessage = (event) => {
      try {
        const data: TTSStreamEvent = JSON.parse(event.data);
        callback(data);
      } catch (error) {
        console.error('Failed to parse stream event:', error);
        callback({
          type: 'error',
          session_id: '',
          error: `Failed to parse event: ${error}`
        });
      }
    };
    
    // 监听错误
    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      callback({
        type: 'error',
        session_id: '',
        error: 'Stream connection error'
      });
    };
    
    return eventSource;
  },

  // 改进的流式合成方法，使用fetch和ReadableStream
  synthesizeTextStreamAdvanced: async (
    request: TTSRequest, 
    callback: TTSStreamCallback
  ): Promise<void> => {
    const baseURL = import.meta.env.VITE_API_URL || 'http://8.153.175.16t:8000';
    const url = `${baseURL}/api/tts/synthesize/stream`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(request)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }
      
      const decoder = new TextDecoder();
      let buffer = '';
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }
          
          buffer += decoder.decode(value, { stream: true });
          
          // 处理Server-Sent Events格式
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // 保留最后一行（可能不完整）
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const eventData = JSON.parse(line.slice(6));
                callback(eventData);
              } catch (error) {
                console.error('Failed to parse event data:', error, line);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
      
    } catch (error) {
      console.error('Stream request failed:', error);
      callback({
        type: 'error',
        session_id: '',
        error: `Stream request failed: ${error}`
      });
    }
  },

  // 下载合成的音频文件
  downloadAudio: (downloadUrl: string): string => {
    // 返回完整的下载URL
    const baseURL = import.meta.env.VITE_API_URL || 'http://8.153.175.16t:8000';
    return `${baseURL}${downloadUrl}`;
  },

  // 从base64数据创建音频URL
  createAudioUrlFromBase64: (base64Data: string, format: string = 'wav'): string => {
    const mimeType = format === 'mp3' ? 'audio/mpeg' : 'audio/wav';
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    return URL.createObjectURL(blob);
  },

  // 获取TTS配置
  getConfig: async () => {
    return apiService.get('/api/tts/config');
  },

  // 更新TTS配置
  updateConfig: async (config: any) => {
    return apiService.put('/api/tts/config', { config });
  },

  // TTS服务健康检查
  healthCheck: async () => {
    return apiService.get('/api/tts/health');
  }
};
