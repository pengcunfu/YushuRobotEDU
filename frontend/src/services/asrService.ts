import { apiService } from './api';

export interface ASRProvider {
  name: string;
  description: string;
  supported_formats: string[];
  supported_languages: string[];
  available: boolean;
}

export interface ProvidersResponse {
  providers: string[];
  provider_info: Record<string, ASRProvider>;
}

export interface ASRResponse {
  success: boolean;
  text?: string;
  confidence?: number;
  duration?: number;
  provider?: string;
  error_msg?: string;
}

export const asrService = {
  /**
   * 获取可用的ASR提供商
   */
  getProviders: async (): Promise<ProvidersResponse> => {
    return apiService.get('/api/asr/providers');
  },

  /**
   * 语音识别
   */
  recognizeAudio: async (
    provider: string,
    audioFile: File,
    language: string = 'zh',
    sampleRate: number = 16000
  ): Promise<ASRResponse> => {
    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('provider', provider);
    formData.append('language', language);
    formData.append('sample_rate', sampleRate.toString());

    // 对于文件上传，需要特殊处理
    return apiService.postFormData('/api/asr/recognize', formData);
  },

  /**
   * 获取提供商详细信息
   */
  getProviderInfo: async (provider: string): Promise<ASRProvider> => {
    return apiService.get(`/api/asr/providers/${provider}`);
  },
};