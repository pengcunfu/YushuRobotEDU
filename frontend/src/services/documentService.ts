/**
 * 文档处理服务API
 */

import { api } from './api';
import type {
  DocumentInfo,
  ParseResult,
  ContentEditRequest,
  GenerationRequest,
  TTSRequest,
  TTSSegmentRequest
} from '@/types/document';

export class DocumentService {
  /**
   * 上传文档
   */
  static async uploadDocument(file: File): Promise<DocumentInfo> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${api.baseURL}/api/documents/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || '文件上传失败');
    }

    return response.json();
  }

  /**
   * 解析文档
   */
  static async parseDocument(documentId: string): Promise<ParseResult> {
    try {
      const response = await api.post(`/api/documents/parse/${documentId}`);
      console.log('Raw API response for parseDocument:', response);
      
      // 确保返回正确的数据结构
      if (response && typeof response === 'object') {
        return response;
      } else {
        console.error('Invalid response format for parseDocument:', response);
        return {
          success: false,
          error_message: '解析响应格式错误',
          text_content: '',
          word_count: 0,
          images: []
        };
      }
    } catch (error) {
      console.error('API call failed for parseDocument:', error);
      throw error;
    }
  }

  /**
   * 编辑文档内容
   */
  static async editContent(
    documentId: string,
    request: ContentEditRequest
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.put(`/api/documents/content/${documentId}`, request);
      console.log('Raw API response for editContent:', response);
      
      if (response && typeof response === 'object') {
        return response;
      } else {
        return { success: false, message: '编辑响应格式错误' };
      }
    } catch (error) {
      console.error('API call failed for editContent:', error);
      throw error;
    }
  }

  /**
   * AI生成内容（非流式）
   */
  static async generateContent(request: GenerationRequest): Promise<{
    success: boolean;
    content: string;
    error?: string;
  }> {
    try {
      const response = await api.post('/api/documents/generate', {
        ...request,
        stream: false
      });
      console.log('Raw API response for generateContent:', response);
      
      if (response && typeof response === 'object') {
        return response;
      } else {
        return { success: false, content: '', error: '生成响应格式错误' };
      }
    } catch (error) {
      console.error('API call failed for generateContent:', error);
      throw error;
    }
  }

  /**
   * AI生成内容（流式）
   */
  static async generateContentStream(
    request: GenerationRequest,
    onChunk: (chunk: string) => void,
    onError?: (error: string) => void,
    onComplete?: () => void
  ): Promise<void> {
    try {
      const response = await fetch(`${api.baseURL}/api/documents/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...request,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法获取响应流');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const chunk = line.slice(6);
            if (chunk.trim()) {
              onChunk(chunk);
            }
          }
        }
      }

      onComplete?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '生成失败';
      onError?.(errorMessage);
    }
  }

  /**
   * TTS流式合成
   */
  static async synthesizeSpeechStream(
    request: TTSRequest,
    onAudioChunk: (audioData: string, segment: number, total: number) => void,
    onError?: (error: string) => void,
    onComplete?: () => void
  ): Promise<void> {
    try {
      const response = await fetch(`${api.baseURL}/api/documents/tts/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法获取响应流');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'audio') {
                onAudioChunk(data.data, data.segment, data.total);
              } else if (data.type === 'error') {
                onError?.(data.message);
                return;
              }
            } catch (parseError) {
              console.warn('解析响应数据失败:', parseError);
            }
          }
        }
      }

      onComplete?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'TTS合成失败';
      onError?.(errorMessage);
    }
  }

  /**
   * TTS分段合成
   */
  static async synthesizeSpeechSegments(request: TTSSegmentRequest): Promise<{
    success: boolean;
    total_segments: number;
    successful_segments: number;
    results: Array<{
      segment_index: number;
      text: string;
      success: boolean;
      error_message?: string;
      audio_data?: string;
      audio_size: number;
    }>;
  }> {
    try {
      const response = await api.post('/api/documents/tts/segments', request);
      console.log('Raw API response for synthesizeSpeechSegments:', response);
      
      if (response && typeof response === 'object') {
        return response;
      } else {
        return {
          success: false,
          total_segments: 0,
          successful_segments: 0,
          results: []
        };
      }
    } catch (error) {
      console.error('API call failed for synthesizeSpeechSegments:', error);
      throw error;
    }
  }

  /**
   * 获取支持的格式
   */
  static async getSupportedFormats(): Promise<{
    document_formats: string[];
    max_file_size_mb: number;
    tts_formats: string[];
    image_formats: string[];
  }> {
    try {
      const response = await api.get('/api/documents/supported-formats');
      console.log('Raw API response for getSupportedFormats:', response);
      
      if (response && typeof response === 'object') {
        return response;
      } else {
        return {
          document_formats: [],
          max_file_size_mb: 10,
          tts_formats: [],
          image_formats: []
        };
      }
    } catch (error) {
      console.error('API call failed for getSupportedFormats:', error);
      throw error;
    }
  }

  /**
   * 获取文档信息
   */
  static async getDocumentInfo(documentId: string): Promise<{
    id: string;
    filename: string;
    file_size: number;
    document_type: string;
    upload_time: number;
    file_exists: boolean;
  }> {
    try {
      const response = await api.get(`/api/documents/${documentId}/info`);
      console.log('Raw API response for getDocumentInfo:', response);
      
      if (response && typeof response === 'object') {
        return response;
      } else {
        return {
          id: documentId,
          filename: '',
          file_size: 0,
          document_type: '',
          upload_time: 0,
          file_exists: false
        };
      }
    } catch (error) {
      console.error('API call failed for getDocumentInfo:', error);
      throw error;
    }
  }

  /**
   * 删除文档
   */
  static async deleteDocument(documentId: string): Promise<{
    success: boolean;
    message: string;
    deleted_files: string[];
  }> {
    try {
      const response = await api.delete(`/api/documents/${documentId}`);
      console.log('Raw API response for deleteDocument:', response);
      
      if (response && typeof response === 'object') {
        return response;
      } else {
        return {
          success: false,
          message: '删除响应格式错误',
          deleted_files: []
        };
      }
    } catch (error) {
      console.error('API call failed for deleteDocument:', error);
      throw error;
    }
  }

  /**
   * 获取处理记录
   */
  static async getProcessingRecords(limit: number = 50, skip: number = 0): Promise<{
    success: boolean;
    records: Array<{
      id: string;
      document_id: string;
      type: string;
      status: string;
      original_filename?: string;
      created_time: string;
      details: Record<string, any>;
    }>;
    total: number;
  }> {
    try {
      const response = await api.get(`/api/documents/records?limit=${limit}&skip=${skip}`);
      console.log('Raw API response for records:', response);
      
      // 确保返回正确的数据结构
      if (response && typeof response === 'object') {
        return response;
      } else {
        console.error('Invalid response format:', response);
        return {
          success: false,
          records: [],
          total: 0
        };
      }
    } catch (error) {
      console.error('API call failed for getProcessingRecords:', error);
      throw error;
    }
  }

  /**
   * 获取指定文档的处理记录
   */
  static async getDocumentRecords(documentId: string): Promise<{
    success: boolean;
    document_id: string;
    records: Array<{
      id: string;
      document_id: string;
      type: string;
      status: string;
      created_time: string;
      details: Record<string, any>;
    }>;
    total: number;
  }> {
    const response = await api.get(`/api/documents/records/${documentId}`);
    return response.data;
  }

  /**
   * 获取统计信息
   */
  static async getStatistics(): Promise<{
    success: boolean;
    statistics: {
      total_documents: number;
      total_records: number;
      recent_24h: number;
      success_rate: number;
      document_types: Record<string, number>;
      processing_status: Record<string, number>;
    };
  }> {
    try {
      const response = await api.get('/api/documents/statistics');
      console.log('Raw API response for statistics:', response);
      
      // 确保返回正确的数据结构
      if (response && typeof response === 'object') {
        return response;
      } else {
        console.error('Invalid response format:', response);
        return {
          success: false,
          statistics: {
            total_documents: 0,
            total_records: 0,
            recent_24h: 0,
            success_rate: 0,
            document_types: {},
            processing_status: {}
          }
        };
      }
    } catch (error) {
      console.error('API call failed for getStatistics:', error);
      throw error;
    }
  }

  /**
   * 健康检查
   */
  static async healthCheck(): Promise<{
    success: boolean;
    service: string;
    upload_dir: string;
    upload_dir_exists: boolean;
    supported_formats: number;
    parser_available: boolean;
    database_connected: boolean;
  }> {
    try {
      const response = await api.get('/api/documents/health');
      console.log('Raw API response for healthCheck:', response);
      
      if (response && typeof response === 'object') {
        return response;
      } else {
        return {
          success: false,
          service: 'document-service',
          upload_dir: '',
          upload_dir_exists: false,
          supported_formats: 0,
          parser_available: false,
          database_connected: false
        };
      }
    } catch (error) {
      console.error('API call failed for healthCheck:', error);
      throw error;
    }
  }
}

// 导出默认实例
export const documentService = DocumentService;
