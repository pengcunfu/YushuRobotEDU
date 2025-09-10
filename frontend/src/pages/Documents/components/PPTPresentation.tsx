/**
 * PPT讲解页面组件 - 改进版本，支持主显示区域和右侧缩略图
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Button, 
  Space, 
  Typography, 
  Progress, 
  Spin, 
  Alert,
  Modal,
  Slider,
  Select,
  message,
  Image,
  Row,
  Col,
  Tooltip,
  Divider
} from 'antd';
import {
  SettingOutlined,
  FullscreenOutlined,
  HomeOutlined,
  LeftOutlined,
  RightOutlined,
  FileTextOutlined,
  ArrowLeftOutlined,
  LoadingOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  SoundOutlined,
  StopOutlined
} from '@ant-design/icons';
import { Header } from '@/components/Layout/Header';
import type { DocumentInfo } from '@/types/document';
import { slideService } from '@/services/slideService';
import './PPTPresentation.css';

const { Text, Title } = Typography;
const { Option } = Select;

interface PPTPresentationProps {
  document: DocumentInfo;
  onBack: () => void;
}

interface SlideData {
  id: string;
  title: string;
  content: string;
  image_url?: string;
}

export const PPTPresentation: React.FC<PPTPresentationProps> = ({
  document,
  onBack
}) => {
  // 状态管理
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionStatus, setConversionStatus] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [voiceSettingsVisible, setVoiceSettingsVisible] = useState(false);
  
  // 讲解相关状态
  const [isGeneratingNarration, setIsGeneratingNarration] = useState(false);
  const [narrationStatus, setNarrationStatus] = useState<string>('');
  const [hasNarration, setHasNarration] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentAudioPage, setCurrentAudioPage] = useState<number | null>(null);
  
  // 语音设置
  const [voiceSettings, setVoiceSettings] = useState({
    voice: 'zh_male_beijingxiaoye_emo_v2_mars_bigtts',
    speed: 1.0,
    pitch: 1.0,
    volume: 80
  });
  
  // 引用
  const containerRef = useRef<HTMLDivElement>(null);
  const mainImageRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // 音色选项
  const voiceOptions = [
    { value: 'zh_male_beijingxiaoye_emo_v2_mars_bigtts', label: '北京小爷（男声）' },
    { value: 'zh_female_xiaoxin_emo_v2_mars_bigtts', label: '小欣（女声）' },
    { value: 'zh_male_xiaofeng_emo_v2_mars_bigtts', label: '小峰（男声）' },
    { value: 'zh_female_xiaoli_emo_v2_mars_bigtts', label: '小丽（女声）' }
  ];

  // 加载文档数据
  const loadDocument = useCallback(async () => {
    try {
      setLoading(true);
      setError(undefined);

      // 检查是否为PPT文件
      const fileExtension = document.filename.toLowerCase().split('.').pop();
      const isPPTFile = fileExtension === 'ppt' || fileExtension === 'pptx';

      if (isPPTFile) {
        // PPT文件：尝试获取图片版本
        try {
          const slideData = await slideService.getDocumentSlides(document.id);
          
          if (slideData.slides && slideData.slides.length > 0) {
            // 检查是否有图片
            const hasImages = await checkSlidesImages(slideData.slides);
            
            if (hasImages) {
              await setupSlideData(slideData, true); // 要求图片
            } else {
              // 启动PPT转换
              await waitForPPTConversion();
            }
          } else {
            // 启动PPT转换
            await waitForPPTConversion();
          }
        } catch (slideError) {
          console.error('获取PPT数据失败:', slideError);
          // 如果获取幻灯片数据失败，尝试纯文本模式
          try {
            const slideData = await slideService.getDocumentSlides(document.id);
            await setupSlideData(slideData, false); // 不要求图片
            message.warning('PPT转换服务不可用，仅显示文本内容');
          } catch (textError) {
            throw new Error('无法获取文档内容');
          }
        }
      } else {
        throw new Error('不支持的文件格式');
      }
    } catch (error) {
      console.error('加载PPT失败:', error);
      setError(error instanceof Error ? error.message : '加载失败');
    } finally {
      setLoading(false);
      setIsConverting(false);
    }
  }, [document.id]);

  // 等待PPT转换完成（简化版，不重试）
  const waitForPPTConversion = async () => {
    try {
      setIsConverting(true);
      setConversionStatus('正在转换PPT，请耐心等待...');
      
      // 直接等待转换完成，不启动进度监控
      const documentData = await slideService.waitForPPTConversion(document.id, 120000); // 2分钟超时
      
      setConversionStatus('转换完成！');
      await setupSlideData(documentData);
      
    } catch (error) {
      setIsConverting(false);
      throw error;
    }
  };

  // 检查幻灯片图片是否已生成
  const checkSlidesImages = async (slides: any[]): Promise<boolean> => {
    if (!slides || slides.length === 0) return false;
    
    try {
      // 检查前3张图片是否存在
      const checkPromises = slides.slice(0, 3).map(slide => 
        slide.image_url ? slideService.checkImageExists(slide.image_url) : Promise.resolve(false)
      );
      
      const results = await Promise.all(checkPromises);
      return results.some(exists => exists);
    } catch (error) {
      console.error('检查图片存在性失败:', error);
      return false;
    }
  };

  // 设置幻灯片数据
  const setupSlideData = async (slideData: any, requireImages: boolean = true) => {
    if (!slideData.slides || slideData.slides.length === 0) {
      throw new Error('未找到幻灯片内容');
    }

    // 如果要求图片但第一张没有图片，抛出错误
    if (requireImages && (!slideData.slides[0].image_url || 
        !(await slideService.checkImageExists(slideData.slides[0].image_url)))) {
      throw new Error('幻灯片图片未准备就绪');
    }

    const processedSlides = slideData.slides.map((slide: any, index: number) => ({
      id: slide.id || `slide-${index + 1}`,
      title: slide.title || `第 ${index + 1} 页`,
      content: slide.content || slide.text_content || '',
      image_url: slide.image_url
    }));

    setSlides(processedSlides);
    setCurrentSlideIndex(0);
  };

  // 导航控制
  const goToSlide = useCallback((index: number) => {
    if (index >= 0 && index < slides.length) {
      setCurrentSlideIndex(index);
    }
  }, [slides.length]);

  const goToPrevSlide = useCallback(() => {
    goToSlide(currentSlideIndex - 1);
  }, [currentSlideIndex, goToSlide]);

  const goToNextSlide = useCallback(() => {
    goToSlide(currentSlideIndex + 1);
  }, [currentSlideIndex, goToSlide]);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          goToPrevSlide();
          break;
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          event.preventDefault();
          goToNextSlide();
          break;
        case 'Home':
          event.preventDefault();
          goToSlide(0);
          break;
        case 'End':
          event.preventDefault();
          goToSlide(slides.length - 1);
          break;
        case 'Escape':
          if (isFullscreen) {
            exitFullscreen();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevSlide, goToNextSlide, goToSlide, slides.length, isFullscreen]);

  // 全屏控制
  const enterFullscreen = useCallback(async () => {
    if (containerRef.current && containerRef.current.requestFullscreen) {
      try {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch (error) {
        message.warning('进入全屏失败');
      }
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    if (window.document.fullscreenElement) {
      try {
        await window.document.exitFullscreen();
        setIsFullscreen(false);
      } catch (error) {
        message.warning('退出全屏失败');
      }
    }
  }, []);

  // 监听全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!window.document.fullscreenElement);
    };

    window.document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => window.document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // 生成PPT讲解
  const generateNarration = async () => {
    try {
      setIsGeneratingNarration(true);
      setNarrationStatus('正在生成讲解文本...');
      
      const options = {
        voiceSettings: {
          voice: voiceSettings.voice,
          speed: voiceSettings.speed,
          pitch: voiceSettings.pitch,
          volume: voiceSettings.volume / 100, // 转换为0-1范围
          format: 'wav'
        },
        narrationStyle: '讲解'
      };
      
      const result = await slideService.generatePPTNarration(document.id, options);
      
      if (result.success) {
        setNarrationStatus(`讲解生成完成！成功生成${result.data?.successCount}页音频`);
        setHasNarration(true);
        message.success(result.message);
      } else {
        throw new Error(result.message || '生成失败');
      }
      
    } catch (error) {
      console.error('生成讲解失败:', error);
      setNarrationStatus('讲解生成失败');
      message.error(error instanceof Error ? error.message : '生成讲解失败');
    } finally {
      setIsGeneratingNarration(false);
      setTimeout(() => setNarrationStatus(''), 3000);
    }
  };

  // 播放当前页面音频
  const playCurrentSlideAudio = async () => {
    const pageNumber = currentSlideIndex + 1;
    
    try {
      if (isPlayingAudio && currentAudioPage === pageNumber) {
        // 如果正在播放当前页面音频，则暂停
        if (audioRef.current) {
          audioRef.current.pause();
          setIsPlayingAudio(false);
          setCurrentAudioPage(null);
        }
        return;
      }
      
      // 停止当前播放的音频
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      
      // 获取音频URL
      const audioUrl = slideService.getSlideAudioUrl(document.id, pageNumber);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        await audioRef.current.play();
        setIsPlayingAudio(true);
        setCurrentAudioPage(pageNumber);
      }
      
    } catch (error) {
      console.error('播放音频失败:', error);
      message.warning(`第${pageNumber}页音频播放失败，可能尚未生成`);
    }
  };

  // 停止音频播放
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlayingAudio(false);
      setCurrentAudioPage(null);
    }
  };

  // 检查讲解状态
  const checkNarrationStatus = async () => {
    try {
      const status = await slideService.getNarrationStatus(document.id);
      setHasNarration(status.hasNarration);
    } catch (error) {
      console.error('检查讲解状态失败:', error);
    }
  };

  // 音频播放结束事件
  const handleAudioEnded = () => {
    setIsPlayingAudio(false);
    setCurrentAudioPage(null);
    
    // 自动播放下一页音频
    const nextPage = currentSlideIndex + 1;
    if (nextPage < slides.length) {
      setTimeout(() => {
        setCurrentSlideIndex(nextPage);
        // 延迟播放下一页音频
        setTimeout(() => {
          const nextPageNumber = nextPage + 1;
          const audioUrl = slideService.getSlideAudioUrl(document.id, nextPageNumber);
          if (audioRef.current) {
            audioRef.current.src = audioUrl;
            audioRef.current.play().then(() => {
              setIsPlayingAudio(true);
              setCurrentAudioPage(nextPageNumber);
            }).catch(() => {
              // 如果下一页音频播放失败，则停止自动播放
              console.log('下一页音频不存在，停止自动播放');
            });
          }
        }, 500);
      }, 1000);
    }
  };

  // 组件挂载时加载数据
  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  // 组件挂载时检查讲解状态
  useEffect(() => {
    if (slides.length > 0) {
      checkNarrationStatus();
    }
  }, [slides]);

  // 当前幻灯片
  const currentSlide = slides[currentSlideIndex];

  // 渲染加载状态
  if (loading || isConverting) {
    return (
      <div className="ppt-loading">
        <Header 
          title={`PPT讲解 - ${document.filename}`}
          actions={
      <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={onBack}
            >
        返回
      </Button>
          }
        />
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: 'calc(100vh - 64px)',
          padding: '20px'
        }}>
          <Spin size="large" indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <Title level={4} style={{ color: '#1890ff', marginBottom: '8px' }}>
              {isConverting ? '正在转换PPT...' : '正在加载...'}
            </Title>
            {conversionStatus && (
              <Text type="secondary" style={{ fontSize: '16px' }}>
                {conversionStatus}
              </Text>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 渲染错误状态
  if (error) {
    return (
      <div className="ppt-error">
        <Header 
          title={`PPT讲解 - ${document.filename}`}
          actions={
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={onBack}
            >
              返回
            </Button>
          }
        />
        <div style={{ 
          padding: '40px', 
          textAlign: 'center',
          height: 'calc(100vh - 64px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
        <Alert
          message="加载失败"
          description={error}
          type="error"
          showIcon
            style={{ marginBottom: '20px', maxWidth: '500px' }}
          />
          <Space>
            <Button onClick={loadDocument} type="primary">
              重新加载
            </Button>
            <Button onClick={onBack}>
              返回
            </Button>
          </Space>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`ppt-presentation-container ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* 头部导航 */}
      {!isFullscreen && (
        <Header 
          title={`PPT讲解 - ${document.filename}`}
          actions={
            <Space>
              <Text type="secondary">
                {currentSlideIndex + 1} / {slides.length}
              </Text>
              <Button 
                icon={<SettingOutlined />} 
                onClick={() => setVoiceSettingsVisible(true)}
                type="text"
              >
                语音设置
              </Button>
              <Button 
                icon={<SoundOutlined />} 
                onClick={generateNarration}
                loading={isGeneratingNarration}
                type="primary"
                disabled={isGeneratingNarration}
              >
                {isGeneratingNarration ? '生成中...' : hasNarration ? '重新生成讲解' : '开始讲解'}
              </Button>
              <Button 
                icon={<FullscreenOutlined />} 
                onClick={enterFullscreen}
                type="text"
              >
                全屏
              </Button>
              <Button 
                icon={<ArrowLeftOutlined />} 
                onClick={onBack}
              >
                返回
              </Button>
            </Space>
          }
        />
      )}

      {/* 主内容区域 */}
      <div className="ppt-main-content" style={{ 
        height: isFullscreen ? '100vh' : 'calc(100vh - 64px)',
        display: 'flex',
        background: '#f0f2f5'
      }}>
        {/* 主显示区域 */}
        <div className="ppt-main-display" style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          marginRight: '16px',
          background: 'white',
          borderRadius: isFullscreen ? 0 : '8px',
          margin: isFullscreen ? 0 : '16px 0 16px 16px',
          overflow: 'hidden',
          boxShadow: isFullscreen ? 'none' : '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          {/* 幻灯片显示区 */}
          <div className="slide-display-area" style={{ 
            flex: 1, 
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fff',
            minHeight: '60%'
          }}>
            {currentSlide && (
              <>
                {/* 幻灯片图片 */}
                {currentSlide.image_url ? (
                  <div ref={mainImageRef} style={{ 
                    width: '100%', 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    padding: '20px'
                  }}>
                  <Image 
                      src={currentSlide.image_url}
                      alt={currentSlide.title}
                    style={{ 
                        maxWidth: '100%', 
                      maxHeight: '100%', 
                        objectFit: 'contain'
                      }}
                      fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4gPHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9IiNmYWZhZmEiIHN0cm9rZT0iI2Q5ZDlkOSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtZGFzaGFycmF5PSI1LDUiLz4gPHRleHQgeD0iMjAwIiB5PSIyMDAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9IjAuM2VtIj7lm77niYfliqDovb3lpLHotKU8L3RleHQ+IDwvc3ZnPg=="
                      onError={(e) => {
                        console.error('Image failed to load:', currentSlide.image_url);
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        // 显示错误提示
                        const container = target.parentElement;
                        if (container && !container.querySelector('.image-error-placeholder')) {
                          const errorDiv = window.document.createElement('div');
                          errorDiv.className = 'image-error-placeholder';
                          errorDiv.style.cssText = `
                            width: 100%;
                            height: 400px;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            background: #fafafa;
                            border: 2px dashed #d9d9d9;
                            border-radius: 8px;
                            color: #999;
                          `;
                          errorDiv.innerHTML = '<div style="font-size: 48px; margin-bottom: 16px;">📷</div><div>图片加载失败</div>';
                          container.appendChild(errorDiv);
                        }
                      }}
                    />
                  </div>
                ) : (
                      <div style={{ 
                    width: '100%',
                    height: '100%',
                        display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center',
                        justifyContent: 'center', 
                    padding: '40px',
                    background: '#fafafa'
                  }}>
                    <FileTextOutlined style={{ fontSize: '64px', color: '#1890ff', marginBottom: '20px' }} />
                    <Title level={4} style={{ textAlign: 'center', marginBottom: '16px' }}>
                      {currentSlide.title}
                    </Title>
                    <Text style={{ textAlign: 'center', fontSize: '16px', lineHeight: '1.6' }}>
                      {currentSlide.content || '暂无文本内容'}
                    </Text>
                      </div>
                )}

                {/* 导航按钮 */}
                <div className="slide-navigation">
                  <Tooltip title="上一页 (←)">
                    <Button
                      className="nav-button nav-prev"
                      icon={<LeftOutlined />}
                      onClick={goToPrevSlide}
                      disabled={currentSlideIndex === 0}
                      size="large"
                      type="primary"
                      shape="circle"
                      style={{
                        position: 'absolute',
                        left: '20px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: 10
                      }}
                    />
                  </Tooltip>
                  
                  <Tooltip title="下一页 (→)">
                    <Button
                      className="nav-button nav-next"
                      icon={<RightOutlined />}
                      onClick={goToNextSlide}
                      disabled={currentSlideIndex === slides.length - 1}
                      size="large"
                      type="primary"
                      shape="circle"
                      style={{
                        position: 'absolute',
                        right: '20px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: 10
                      }}
                    />
                  </Tooltip>
                </div>
              </>
            )}
          </div>

          {/* 底部控制栏 */}
          <div className="ppt-control-panel" style={{
            padding: '16px 24px',
            background: 'white',
            borderTop: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Space>
              <Tooltip title="首页 (Home)">
              <Button 
                  icon={<HomeOutlined />} 
                  onClick={() => goToSlide(0)}
                disabled={currentSlideIndex === 0}
              />
              </Tooltip>
              {hasNarration && (
                <>
                  <Tooltip title={isPlayingAudio && currentAudioPage === currentSlideIndex + 1 ? "暂停讲解" : "播放讲解"}>
                    <Button 
                      icon={isPlayingAudio && currentAudioPage === currentSlideIndex + 1 ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                      onClick={playCurrentSlideAudio}
                      type="primary"
                      ghost
                    />
                  </Tooltip>
                  {isPlayingAudio && (
                    <Tooltip title="停止播放">
              <Button 
                        icon={<StopOutlined />}
                        onClick={stopAudio}
                        danger
                      />
                    </Tooltip>
                  )}
                </>
              )}
              <Text strong>{currentSlide?.title || `第 ${currentSlideIndex + 1} 页`}</Text>
            </Space>

            <div style={{ flex: 1, margin: '0 24px' }}>
              <Progress 
                percent={((currentSlideIndex + 1) / slides.length) * 100} 
                showInfo={false}
                strokeColor="#1890ff"
              />
            </div>

            <Space>
              <Text type="secondary">
                {currentSlideIndex + 1} / {slides.length}
              </Text>
              {isFullscreen && (
                <Tooltip title="退出全屏 (Esc)">
                  <Button 
                    icon={<FullscreenOutlined />} 
                    onClick={exitFullscreen}
                  />
                </Tooltip>
              )}
            </Space>
          </div>
        </div>

        {/* 右侧缩略图边栏 */}
        {!isFullscreen && (
          <div className="thumbnail-sidebar" style={{
            width: '240px',
            background: 'white',
            borderRadius: '8px',
            margin: '16px 16px 16px 0',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <div className="thumbnail-header" style={{
              padding: '16px',
              borderBottom: '1px solid #f0f0f0',
              background: '#fafafa'
            }}>
              <Text strong style={{ fontSize: '14px' }}>幻灯片预览</Text>
            </div>
            
            <div className="thumbnail-list" style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px'
            }}>
              {slides.map((slide, index) => (
                <div
                  key={slide.id}
                  className={`thumbnail-item ${index === currentSlideIndex ? 'active' : ''}`}
                  onClick={() => goToSlide(index)}
                  style={{
                    marginBottom: '12px',
                    border: `2px solid ${index === currentSlideIndex ? '#1890ff' : 'transparent'}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    overflow: 'hidden',
                    background: index === currentSlideIndex ? '#e6f7ff' : '#fafafa'
                  }}
                >
                  <div style={{ position: 'relative' }}>
                    {slide.image_url ? (
                      <Image
                        src={slide.image_url}
                        alt={slide.title}
                        width="100%"
                        height={120}
                        style={{ objectFit: 'cover' }}
                        preview={false}
                        fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4gPHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxMjAiIGZpbGw9IiNmNWY1ZjUiLz4gPHRleHQgeD0iMTAwIiB5PSI2MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zZW0iPueslOiJsemhtTwvdGV4dD4gPC9zdmc+"
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '120px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#f5f5f5'
                      }}>
                        <FileTextOutlined style={{ fontSize: '24px', color: '#1890ff', marginBottom: '8px' }} />
                        <Text style={{ fontSize: '12px', textAlign: 'center' }}>
                          第 {index + 1} 页
                        </Text>
                      </div>
                    )}
                    
                    <div style={{
                      position: 'absolute',
                      top: '4px',
                      left: '4px',
                      background: 'rgba(0, 0, 0, 0.6)',
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      {index + 1}
                    </div>
                  </div>
                  
                  <div style={{ padding: '8px' }}>
                    <Text style={{ 
                      fontSize: '12px',
                      display: 'block',
                      textAlign: 'center',
                      fontWeight: index === currentSlideIndex ? 600 : 400
                    }}>
                      {slide.title}
                    </Text>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
        
      {/* 隐藏的音频播放器 */}
      <audio
        ref={audioRef}
        onEnded={handleAudioEnded}
        onError={() => {
          setIsPlayingAudio(false);
          setCurrentAudioPage(null);
        }}
        style={{ display: 'none' }}
      />

      {/* 讲解生成状态提示 */}
      {(isGeneratingNarration || narrationStatus) && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '20px 40px',
          borderRadius: '8px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          {isGeneratingNarration && <Spin size="small" />}
          <Text style={{ color: 'white', fontSize: '16px' }}>
            {narrationStatus || '正在生成讲解...'}
          </Text>
          </div>
      )}

      {/* 语音设置模态框 */}
      <Modal
        title="语音设置"
        open={voiceSettingsVisible}
        onCancel={() => setVoiceSettingsVisible(false)}
        footer={null}
        className="voice-settings-modal"
      >
        <div style={{ padding: '16px 0' }}>
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Text strong>选择音色：</Text>
              <Select
                value={voiceSettings.voice}
                onChange={(value) => setVoiceSettings(prev => ({ ...prev, voice: value }))}
                style={{ width: '100%', marginTop: '8px' }}
              >
                {voiceOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Col>
            
            <Col span={24}>
              <Text strong>语速：{voiceSettings.speed}</Text>
              <Slider
                min={0.5}
                max={2.0}
                step={0.1}
                value={voiceSettings.speed}
                onChange={(value) => setVoiceSettings(prev => ({ ...prev, speed: value }))}
                style={{ marginTop: '8px' }}
              />
            </Col>
            
            <Col span={24}>
              <Text strong>音调：{voiceSettings.pitch}</Text>
              <Slider
                min={0.5}
                max={2.0}
                step={0.1}
                value={voiceSettings.pitch}
                onChange={(value) => setVoiceSettings(prev => ({ ...prev, pitch: value }))}
                style={{ marginTop: '8px' }}
              />
            </Col>
            
            <Col span={24}>
              <Text strong>音量：{voiceSettings.volume}%</Text>
              <Slider
                min={0}
                max={100}
                value={voiceSettings.volume}
                onChange={(value) => setVoiceSettings(prev => ({ ...prev, volume: value }))}
                style={{ marginTop: '8px' }}
              />
            </Col>
          </Row>
          
          <Divider />
          
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setVoiceSettingsVisible(false)}>
                取消
              </Button>
              <Button 
                type="primary" 
                onClick={() => {
                  setVoiceSettingsVisible(false);
                  message.success('语音设置已保存');
                }}
              >
                确定
              </Button>
            </Space>
          </div>
        </div>
      </Modal>
    </div>
  );
};