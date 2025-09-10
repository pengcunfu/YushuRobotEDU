/**
 * 幻灯片处理服务
 */

import { apiService } from './api';

// 幻灯片信息接口
export interface SlideInfo {
  id: string;
  page_number: number;
  title: string;
  content: string;
  image_url?: string;
  thumbnail_url?: string;
  notes?: string;
}

// 幻灯片内容接口
export interface SlideContent {
  document_id: string;
  filename: string;
  file_path: string;
  download_url: string;
  slides?: SlideInfo[];
}

// 讲解请求接口
export interface NarrationRequest {
  slide_id: string;
  slide_content: string;
  slide_title?: string;
  narration_style: string;
}

// 讲解响应接口
export interface NarrationResponse {
  slide_id: string;
  narration: string;
  duration?: number;
}

export const slideService = {
  // 获取文档的幻灯片数据
  async getDocumentSlides(documentId: string): Promise<SlideContent> {
    return await apiService.get(`/api/slides/${documentId}`);
  },

  // 生成幻灯片讲解内容
  async generateNarration(request: NarrationRequest): Promise<NarrationResponse> {
    return await apiService.post('/api/slides/narration', request);
  },

  // 处理文档生成幻灯片
  async processDocument(documentId: string, filePath: string): Promise<SlideContent> {
    return await apiService.post('/api/slides/process', {
      document_id: documentId,
      file_path: filePath,
      extract_images: true,
      generate_thumbnails: true
    });
  },

  // 获取幻灯片图片URL
  getSlideImageUrl(filename: string): string {
    const baseURL = import.meta.env.VITE_API_URL || 'http://8.153.175.16t:8000';
    return `${baseURL}/api/slides/images/${filename}`;
  },

  // 获取缩略图URL
  getThumbnailUrl(filename: string): string {
    const baseURL = import.meta.env.VITE_API_URL || 'http://8.153.175.16t:8000';
    return `${baseURL}/api/slides/thumbnails/${filename}`;
  },

  // 获取文档下载URL
  getDocumentDownloadUrl(documentId: string): string {
    const baseURL = import.meta.env.VITE_API_URL || 'http://8.153.175.16t:8000';
    return `${baseURL}/api/slides/${documentId}/download`;
  },

  // 更新幻灯片状态
  async updateSlideStatus(documentId: string, currentSlide: number): Promise<any> {
    return await apiService.post(`/api/slides/${documentId}/status`, { current_slide: currentSlide });
  },

  // 获取指定幻灯片的图片URL
  getSlideImageUrlByIndex(documentId: string, slideIndex: number): string {
    const baseURL = import.meta.env.VITE_API_URL || 'http://8.153.175.16t:8000';
    return `${baseURL}/api/slides/images/${documentId}_page_${slideIndex + 1}.png`;
  },

  // 获取指定幻灯片的缩略图URL
  getSlideThumbnailUrlByIndex(documentId: string, slideIndex: number): string {
    const baseURL = import.meta.env.VITE_API_URL || 'http://8.153.175.16t:8000';
    return `${baseURL}/api/slides/thumbnails/${documentId}_thumb_${slideIndex + 1}.png`;
  },

  // 预加载幻灯片图片
  preloadSlideImages(documentId: string, totalSlides: number): void {
    for (let i = 0; i < totalSlides; i++) {
      const img = new Image();
      img.src = this.getSlideImageUrlByIndex(documentId, i);
    }
  },

  // 检查幻灯片图片是否存在
  async checkSlideImageExists(documentId: string, slideIndex: number): Promise<boolean> {
    try {
      const url = this.getSlideImageUrlByIndex(documentId, slideIndex);
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      console.error('检查幻灯片图片失败:', error);
      return false;
    }
  },

  // 检查PPT转换状态（单次检查，不重试）
  async waitForPPTConversion(documentId: string, maxWaitTime: number = 120000): Promise<SlideContent> {
    const startTime = Date.now();
    const checkInterval = 3000; // 3秒检查一次
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const slideData = await this.getDocumentSlides(documentId);
        
        // 检查是否有图片生成
        if (slideData.slides && slideData.slides.length > 0) {
          // 检查第一张图片是否可访问
          const firstSlide = slideData.slides[0];
          if (firstSlide.image_url) {
            const imageExists = await this.checkImageExists(firstSlide.image_url);
            if (imageExists) {
              console.log(`PPT转换完成，共生成 ${slideData.slides.length} 张图片`);
              return slideData;
            }
          }
        }
        
        // 等待一段时间后再检查
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      } catch (error) {
        console.warn('PPT转换检查失败:', error);
        // 等待一段时间后再检查
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }
    }
    
    throw new Error('PPT转换超时，请稍后重试或联系管理员');
  },

  // 检查图片URL是否可访问
  async checkImageExists(imageUrl: string): Promise<boolean> {
    try {
      const response = await fetch(imageUrl, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      return false;
    }
  },

  // 获取PPT转换进度
  async getPPTConversionProgress(documentId: string): Promise<{ completed: boolean; progress: number; error?: string }> {
    try {
      const slideData = await this.getDocumentSlides(documentId);
      
      if (!slideData.slides || slideData.slides.length === 0) {
        return { completed: false, progress: 0 };
      }

      let completedSlides = 0;
      const totalSlides = slideData.slides.length;

      // 检查每张幻灯片的图片是否生成
      for (const slide of slideData.slides) {
        if (slide.image_url) {
          const imageExists = await this.checkImageExists(slide.image_url);
          if (imageExists) {
            completedSlides++;
          }
        }
      }

      const progress = Math.round((completedSlides / totalSlides) * 100);
      const completed = completedSlides === totalSlides;

      return { completed, progress };
    } catch (error) {
      console.error('获取PPT转换进度失败:', error);
      return { completed: false, progress: 0, error: error instanceof Error ? error.message : '获取进度失败' };
    }
  },

  // 生成PPT讲解音频
  async generatePPTNarration(documentId: string, options: {
    voiceSettings?: {
      voice?: string;
      speed?: number;
      pitch?: number;
      volume?: number;
      format?: string;
    };
    narrationStyle?: string;
  } = {}): Promise<{
    success: boolean;
    message: string;
    data?: {
      documentId: string;
      totalSlides: number;
      successCount: number;
      failedCount: number;
      generatedFiles: string[];
      narrationStyle: string;
    };
  }> {
    try {
      const response = await fetch(`/api/slides/${documentId}/narration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voice_settings: options.voiceSettings,
          narration_style: options.narrationStyle || '讲解'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('生成PPT讲解失败:', error);
      throw error;
    }
  },

  // 获取PPT讲解状态
  async getNarrationStatus(documentId: string): Promise<{
    documentId: string;
    totalAudioFiles: number;
    audioFiles: Array<{
      pageNumber: number;
      filename: string;
      size: number;
      url: string;
    }>;
    hasNarration: boolean;
  }> {
    try {
      const response = await fetch(`/api/slides/${documentId}/narration/status`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        documentId: data.document_id,
        totalAudioFiles: data.total_audio_files,
        audioFiles: data.audio_files.map((file: any) => ({
          pageNumber: file.page_number,
          filename: file.filename,
          size: file.size,
          url: file.url
        })),
        hasNarration: data.has_narration
      };
    } catch (error) {
      console.error('获取讲解状态失败:', error);
      throw error;
    }
  },

  // 获取指定页面的音频URL
  getSlideAudioUrl(documentId: string, pageNumber: number): string {
    return `/api/slides/${documentId}/audio/${pageNumber}`;
  },

  // 删除PPT讲解音频
  async deletePPTNarration(documentId: string): Promise<{
    success: boolean;
    message: string;
    deletedFiles: string[];
  }> {
    try {
      const response = await fetch(`/api/slides/${documentId}/narration`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('删除PPT讲解失败:', error);
      throw error;
    }
  }
};
