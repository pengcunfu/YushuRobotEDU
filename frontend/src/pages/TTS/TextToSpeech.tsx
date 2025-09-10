import React, { useState, useRef, useEffect } from 'react';
import {
  Card,
  Button,
  Select,
  Space,
  Alert,
  Typography,
  Divider,
  Tag,
  Row,
  Col,
  App,
  Slider,
  Input,
  Spin,
  Switch
} from 'antd';
import {
  SoundOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SettingOutlined,
  StopOutlined,
  ClockCircleOutlined,
  FileOutlined,
  ThunderboltOutlined,
  CalendarOutlined,
  HistoryOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ttsService, TTSStreamEvent } from '@/services/ttsService';
import { Header } from '@/components/Layout/Header';
import { TTSHistoryModal } from './components/TTSHistoryModal';
import { TTSResponse } from '@/types';
import './TextToSpeech.css';

const { TextArea } = Input;
const { Text } = Typography;
const { Option } = Select;

interface SynthesisResult {
  id: string;
  text: string;
  provider: string;
  voice: string;
  duration: number;
  audio_length: number;
  file_size: number;
  download_url?: string;
  timestamp: string;
  status?: 'pending' | 'streaming' | 'completed' | 'error';
  error?: string;
  audio_chunks?: Uint8Array[];
  stream_audio_url?: string;
  mediaSource?: MediaSource;
  sourceBuffer?: SourceBuffer;
  audioContext?: AudioContext;
}

export const TextToSpeech: React.FC = () => {
  const { message } = App.useApp();

  // 状态管理
  const [inputText, setInputText] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('douyin');
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('zh');
  const [selectedFormat, setSelectedFormat] = useState<string>('wav');
  const [speed, setSpeed] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(1.0);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [results, setResults] = useState<SynthesisResult[]>([]);
  const [currentPlaying, setCurrentPlaying] = useState<string | null>(null);
  const [useStreaming, setUseStreaming] = useState<boolean>(true);
  const [streamingStatus, setStreamingStatus] = useState<string>('');
  const [streamingAudio, setStreamingAudio] = useState<string | null>(null);
  
  // 音频播放引用
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamingAudioRef = useRef<HTMLAudioElement | null>(null);

  // 获取可用提供商
  const { data: providersData, isLoading: providersLoading, refetch: refetchProviders } = useQuery({
    queryKey: ['ttsProviders'],
    queryFn: ttsService.getProviders,
  });

  // 获取发音人列表
  const { data: voicesData, isLoading: voicesLoading } = useQuery({
    queryKey: ['ttsVoices', selectedProvider],
    queryFn: () => ttsService.getVoices(selectedProvider),
    enabled: !!selectedProvider && !!providersData?.providers.includes(selectedProvider),
  });

  // 清空结果
  const clearResults = () => {
    // 停止当前播放的音频
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (streamingAudioRef.current) {
      streamingAudioRef.current.pause();
      streamingAudioRef.current.currentTime = 0;
    }
    setResults([]);
    setCurrentPlaying(null);
    setStreamingStatus('');
    setStreamingAudio(null);
    message.success('已清空所有合成结果');
  };


  // 文本转语音mutation
  const synthesizeMutation = useMutation({
    mutationFn: ttsService.synthesizeText,
    onSuccess: (response: TTSResponse) => {
      if (response.success && response.download_url) {
        const result: SynthesisResult = {
          id: Date.now().toString(),
          text: response.text || inputText,
          provider: response.provider || selectedProvider,
          voice: selectedVoice,
          duration: response.duration || 0,
          audio_length: response.audio_length || 0,
          file_size: response.file_size || 0,
          download_url: response.download_url,
          timestamp: new Date().toISOString()
        };
        setResults(prev => [result, ...prev]);
        message.success('语音合成成功');
      } else {
        message.error(response.error || '合成失败');
      }
    },
    onError: (error: any) => {
      message.error(`合成失败: ${error.message}`);
    }
  });

  // 开始合成（流式）
  const handleSynthesizeStream = async () => {
    if (!inputText.trim()) {
      message.warning('请输入要合成的文本内容');
      return;
    }

    if (!providersData?.providers.includes(selectedProvider)) {
      message.error('请选择可用的TTS提供商');
      return;
    }

    if (inputText.length > 10000) {
      message.error('文本长度不能超过10000个字符');
      return;
    }

    const request = {
      text: inputText.trim(),
      provider: selectedProvider,
      voice: selectedVoice,
      speed,
      pitch,
      volume,
      language: selectedLanguage,
      audio_format: selectedFormat
    };

    // 创建新的合成结果
    const resultId = Date.now().toString();
    const newResult: SynthesisResult = {
      id: resultId,
      text: request.text,
      provider: selectedProvider,
      voice: selectedVoice,
      duration: 0,
      audio_length: 0,
      file_size: 0,
      timestamp: new Date().toISOString(),
      status: 'pending',
      audio_chunks: []
    };

    setResults(prev => [newResult, ...prev]);
    setStreamingStatus('正在连接...');

    try {
      // 使用改进的流式合成方法
      await ttsService.synthesizeTextStreamAdvanced(request, (event: TTSStreamEvent) => {
        handleStreamEvent(event, resultId);
      });
    } catch (error) {
      console.error('流式合成失败:', error);
      message.error(`流式合成失败: ${error}`);
      updateResult(resultId, { status: 'error', error: String(error) });
      setStreamingStatus('');
    }
  };

  // 处理流式事件
  const handleStreamEvent = (event: TTSStreamEvent, resultId: string) => {
    console.log('Stream event:', event);
    
    switch (event.type) {
      case 'start':
        setStreamingStatus(`开始合成 (${event.provider})`);
        updateResult(resultId, { status: 'streaming' });
        break;
        
      case 'audio_chunk':
        if (event.data) {
          try {
            // 解码base64音频数据
            const audioData = atob(event.data);
            const audioArray = new Uint8Array(audioData.length);
            for (let i = 0; i < audioData.length; i++) {
              audioArray[i] = audioData.charCodeAt(i);
            }
            
            // 更新结果并处理流式播放
            setResults(prev => prev.map(result => {
              if (result.id === resultId) {
                const newChunks = [...(result.audio_chunks || []), audioArray];
                const totalSize = newChunks.reduce((sum, chunk) => sum + chunk.length, 0);
                
                // 创建完整音频blob用于播放
                const combinedArray = new Uint8Array(totalSize);
                let offset = 0;
                for (const chunk of newChunks) {
                  combinedArray.set(chunk, offset);
                  offset += chunk.length;
                }
                
                const mimeType = selectedFormat === 'mp3' ? 'audio/mpeg' : 'audio/wav';
                const blob = new Blob([combinedArray], { type: mimeType });
                const audioUrl = URL.createObjectURL(blob);
                
                // 如果是第一个音频块，开始播放
                if (event.chunk_count === 1) {
                  playStreamingAudio(resultId, audioUrl);
                } else {
                  // 更新正在播放的音频源
                  updateStreamingAudio(resultId, audioUrl);
                }
                
                return {
                  ...result,
                  audio_chunks: newChunks,
                  file_size: totalSize,
                  stream_audio_url: audioUrl
                };
              }
              return result;
            }));
            
            setStreamingStatus(`接收数据块 ${event.chunk_count} (${Math.round((event.total_size || 0) / 1024)}KB)`);
          } catch (error) {
            console.error('处理音频块失败:', error);
          }
        }
        break;
        
      case 'complete':
        setStreamingStatus('合成完成');
        updateResult(resultId, { 
          status: 'completed',
          duration: 0 // TODO: 计算实际时长
        });
        message.success('流式语音合成完成');
        setTimeout(() => setStreamingStatus(''), 2000);
        break;
        
      case 'error':
        setStreamingStatus('');
        updateResult(resultId, { 
          status: 'error', 
          error: event.error || '未知错误' 
        });
        message.error(`合成失败: ${event.error}`);
        break;
        
      case 'end':
        setStreamingStatus('');
        break;
        
      case 'heartbeat':
        // 心跳，保持连接
        break;
        
      default:
        console.log('未知事件类型:', event.type);
    }
  };

  // 更新结果辅助函数
  const updateResult = (resultId: string, updates: Partial<SynthesisResult>) => {
    setResults(prev => prev.map(result => 
      result.id === resultId ? { ...result, ...updates } : result
    ));
  };

  // 开始流式音频播放
  const playStreamingAudio = (resultId: string, audioUrl: string) => {
    try {
      // 停止当前播放
      if (streamingAudioRef.current) {
        streamingAudioRef.current.pause();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }

      // 创建新的音频元素
      streamingAudioRef.current = new Audio(audioUrl);
      
      streamingAudioRef.current.onplay = () => {
        setCurrentPlaying(resultId);
        setStreamingAudio(resultId);
      };
      
      streamingAudioRef.current.onended = () => {
        setCurrentPlaying(null);
        setStreamingAudio(null);
      };
      
      streamingAudioRef.current.onerror = (error) => {
        console.error('流式音频播放错误:', error);
        setCurrentPlaying(null);
        setStreamingAudio(null);
      };

      // 开始播放
      streamingAudioRef.current.play().catch(error => {
        console.error('开始播放失败:', error);
        // 如果自动播放失败，等待用户手动点击播放
        message.info('音频已准备就绪，点击播放按钮开始播放');
      });
      
      console.log('🎵 开始流式播放音频');
    } catch (error) {
      console.error('流式播放设置失败:', error);
    }
  };

  // 更新流式音频源
  const updateStreamingAudio = (resultId: string, newAudioUrl: string) => {
    try {
      if (streamingAudio === resultId && streamingAudioRef.current) {
        const currentTime = streamingAudioRef.current.currentTime;
        const wasPlaying = !streamingAudioRef.current.paused;
        
        // 创建新的音频元素
        const newAudio = new Audio(newAudioUrl);
        
        newAudio.onloadeddata = () => {
          // 设置播放位置为之前的位置（如果可能）
          if (currentTime > 0 && currentTime < newAudio.duration) {
            newAudio.currentTime = currentTime;
          }
          
          // 如果之前在播放，继续播放
          if (wasPlaying) {
            newAudio.play().catch(error => {
              console.error('继续播放失败:', error);
            });
          }
        };
        
        newAudio.onplay = () => {
          setCurrentPlaying(resultId);
          setStreamingAudio(resultId);
        };
        
        newAudio.onended = () => {
          setCurrentPlaying(null);
          setStreamingAudio(null);
        };
        
        newAudio.onerror = (error) => {
          console.error('更新后的音频播放错误:', error);
        };

        // 停止旧的音频
        streamingAudioRef.current.pause();
        
        // 替换为新的音频
        streamingAudioRef.current = newAudio;
        
        console.log('🔄 更新流式音频源');
      }
    } catch (error) {
      console.error('更新流式音频失败:', error);
    }
  };

  // 开始合成（传统方式）
  const handleSynthesize = async () => {
    if (useStreaming) {
      return handleSynthesizeStream();
    }

    if (!inputText.trim()) {
      message.warning('请输入要合成的文本内容');
      return;
    }

    if (!providersData?.providers.includes(selectedProvider)) {
      message.error('请选择可用的TTS提供商');
      return;
    }

    if (inputText.length > 10000) {
      message.error('文本长度不能超过10000个字符');
      return;
    }

    const request = {
      text: inputText.trim(),
      provider: selectedProvider,
      voice: selectedVoice,
      speed,
      pitch,
      volume,
      language: selectedLanguage,
      audio_format: selectedFormat
    };

    synthesizeMutation.mutate(request);
  };

  // 播放音频
  const playAudio = (result: SynthesisResult) => {
    if (currentPlaying === result.id) {
      // 暂停当前播放
      if (audioRef.current) {
        audioRef.current.pause();
        setCurrentPlaying(null);
      }
      return;
    }

    // 停止当前播放
    if (audioRef.current) {
      audioRef.current.pause();
    }

    // 确定音频URL
    let audioUrl: string;
    
    if (result.stream_audio_url) {
      // 流式音频
      audioUrl = result.stream_audio_url;
    } else if (result.download_url) {
      // 传统下载音频
      audioUrl = ttsService.downloadAudio(result.download_url);
    } else {
      message.error('无可播放的音频数据');
      return;
    }

    audioRef.current = new Audio(audioUrl);
    
    audioRef.current.onplay = () => {
      setCurrentPlaying(result.id);
    };
    
    audioRef.current.onended = () => {
      setCurrentPlaying(null);
    };
    
    audioRef.current.onerror = () => {
      message.error('音频播放失败');
      setCurrentPlaying(null);
    };
    
    audioRef.current.play().catch(() => {
      message.error('音频播放失败');
      setCurrentPlaying(null);
    });
  };

  // 停止播放
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (streamingAudioRef.current) {
      streamingAudioRef.current.pause();
      streamingAudioRef.current.currentTime = 0;
    }
    setCurrentPlaying(null);
    setStreamingAudio(null);
  };

  // 下载音频
  const downloadAudio = (result: SynthesisResult) => {
    let audioUrl: string;
    let filename: string;
    
    if (result.stream_audio_url) {
      // 流式音频
      audioUrl = result.stream_audio_url;
      filename = `tts_stream_${result.provider}_${Date.now()}.${selectedFormat}`;
    } else if (result.download_url) {
      // 传统下载音频
      audioUrl = ttsService.downloadAudio(result.download_url);
      filename = `tts_${result.provider}_${Date.now()}.${selectedFormat}`;
    } else {
      message.error('无可下载的音频数据');
      return;
    }
    
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('开始下载音频文件');
  };

  // 删除合成结果
  const deleteResult = (id: string) => {
    if (currentPlaying === id) {
      stopAudio();
    }
    setResults(prev => prev.filter(result => result.id !== id));
    message.success('已删除');
  };


  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化音频时长
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 获取可用提供商列表
  const availableProviders = providersData?.providers || [];
  const providerInfo = providersData?.provider_info || {};
  const availableVoices = voicesData?.voices || [];

  // 设置默认发音人
  useEffect(() => {
    if (availableVoices.length > 0 && !selectedVoice) {
      setSelectedVoice(availableVoices[0].id);
    }
  }, [availableVoices, selectedVoice]);

  // 清理音频资源
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (streamingAudioRef.current) {
        streamingAudioRef.current.pause();
      }
    };
  }, []);

  return (
    <div >
      <Header 
        title="语音合成"
        actions={
          <Space>
            <Space>
              <Text strong>合成模式:</Text>
              <Switch
                checked={useStreaming}
                onChange={setUseStreaming}
                checkedChildren="流式"
                unCheckedChildren="传统"
                size="small"
              />
            </Space>
            <Button 
              type="text" 
              icon={<ReloadOutlined />}
              title="刷新提供商"
              onClick={async () => {
                try {
                  await refetchProviders();
                  message.success('提供商列表已刷新');
                } catch (error) {
                  message.error('刷新提供商失败');
                }
              }}
              loading={providersLoading}
            >
              刷新提供商
            </Button>
            <Button 
              type="text" 
              icon={<DeleteOutlined />}
              title="清空结果"
              onClick={clearResults}
              danger
            >
              清空结果
            </Button>
            <Button 
              type="text" 
              icon={<HistoryOutlined />}
              title="合成历史"
              onClick={() => setHistoryModalVisible(true)}
            >
              历史
            </Button>
            <Button 
              type="text" 
              icon={<SettingOutlined />}
              title="高级设置"
              onClick={() => setShowSettings(!showSettings)}
              style={{ color: showSettings ? '#1890ff' : undefined }}
            >
              设置
            </Button>
          </Space>
        }
      />
      
      <div className="tts-content" style={{ padding: '16px' }}>

      {/* 流式模式状态 */}
      {streamingStatus && (
        <Card size="small" style={{ marginTop: 16, marginBottom: 16 }}>
          <Space align="center">
            <Spin size="small" />
            <Text>{streamingStatus}</Text>
          </Space>
        </Card>
      )}

      {streamingAudio && (
        <Card size="small" style={{ marginTop: 16, marginBottom: 16 }}>
          <Space align="center">
            <Tag color="purple" icon={<SoundOutlined />}>
              正在流式播放
            </Tag>
          </Space>
        </Card>
      )}


      {/* 提供商状态 */}
      {providersLoading ? (
        <Card>
          <Spin /> 正在加载语音合成提供商...
        </Card>
      ) : availableProviders.length === 0 ? (
        <Alert
          message="暂无可用的语音合成提供商"
          description="请在配置中心配置至少一个语音合成服务提供商的API密钥"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space wrap>
            <Text strong>可用提供商:</Text>
            {availableProviders.map(provider => (
              <Tag
                key={provider}
                color={provider === selectedProvider ? 'blue' : 'default'}
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedProvider(provider)}
              >
                {providerInfo[provider]?.name || provider}
              </Tag>
            ))}
          </Space>
        </Card>
      )}

      {/* 设置面板 */}
      {showSettings && (
        <Card title="合成设置" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8}>
              <div style={{ marginBottom: 16 }}>
                <Text strong>语音合成提供商</Text>
                <Select
                  value={selectedProvider}
                  onChange={setSelectedProvider}
                  style={{ width: '100%', marginTop: 4 }}
                  disabled={availableProviders.length === 0}
                >
                  {availableProviders.map(provider => (
                    <Option key={provider} value={provider}>
                      {providerInfo[provider]?.name || provider}
                    </Option>
                  ))}
                </Select>
              </div>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <div style={{ marginBottom: 16 }}>
                <Text strong>发音人</Text>
                <Select
                  value={selectedVoice}
                  onChange={setSelectedVoice}
                  style={{ width: '100%', marginTop: 4 }}
                  loading={voicesLoading}
                  disabled={availableVoices.length === 0}
                >
                  {availableVoices.map(voice => (
                    <Option key={voice.id} value={voice.id}>
                      {voice.name} ({voice.gender})
                    </Option>
                  ))}
                </Select>
              </div>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <div style={{ marginBottom: 16 }}>
                <Text strong>语言</Text>
                <Select
                  value={selectedLanguage}
                  onChange={setSelectedLanguage}
                  style={{ width: '100%', marginTop: 4 }}
                >
                  {(providerInfo[selectedProvider]?.supported_languages || ['zh']).map(lang => (
                    <Option key={lang} value={lang}>
                      {lang === 'zh' ? '中文' : lang === 'en' ? '英文' : lang}
                    </Option>
                  ))}
                </Select>
              </div>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <div style={{ marginBottom: 16 }}>
                <Text strong>语速: {speed}</Text>
                <Slider
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  value={speed}
                  onChange={setSpeed}
                  style={{ marginTop: 4 }}
                />
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div style={{ marginBottom: 16 }}>
                <Text strong>音调: {pitch}</Text>
                <Slider
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  value={pitch}
                  onChange={setPitch}
                  style={{ marginTop: 4 }}
                />
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div style={{ marginBottom: 16 }}>
                <Text strong>音量: {volume}</Text>
                <Slider
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  value={volume}
                  onChange={setVolume}
                  style={{ marginTop: 4 }}
                />
              </div>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <div style={{ marginBottom: 16 }}>
                <Text strong>音频格式</Text>
                <Select
                  value={selectedFormat}
                  onChange={setSelectedFormat}
                  style={{ width: '100%', marginTop: 4 }}
                >
                  {(providerInfo[selectedProvider]?.supported_formats || ['wav']).map(format => (
                    <Option key={format} value={format}>
                      {format.toUpperCase()}
                    </Option>
                  ))}
                </Select>
              </div>
            </Col>
          </Row>
        </Card>
      )}

      {/* 文本输入区域 */}
      <Card title="文本输入" size="small" style={{ marginBottom: 16 }}>
        <TextArea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="请输入要转换为语音的文本内容..."
          autoSize={{ minRows: 4, maxRows: 8 }}
          maxLength={10000}
          showCount
          style={{ marginBottom: 16 }}
        />
        <div className="synthesis-controls">
          <Button
            type="primary"
            size="large"
            icon={<SoundOutlined />}
            onClick={handleSynthesize}
            loading={synthesizeMutation.isPending || (useStreaming && streamingStatus !== '')}
            disabled={!inputText.trim() || availableProviders.length === 0}
            className="synthesize-button"
          >
            {useStreaming ? '开始流式合成' : '开始合成'}
          </Button>
          {currentPlaying && (
            <Button
              size="large"
              icon={<StopOutlined />}
              onClick={stopAudio}
              className="stop-button"
            >
              停止播放
            </Button>
          )}
        </div>
      </Card>

      {/* 合成结果 */}
      <Card title={`合成结果 (${results.length})`} size="small">
        {results.length === 0 ? (
          <div className="empty-results">
            <SoundOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
            <Text type="secondary">暂无合成结果</Text>
          </div>
        ) : (
          <div className="results-grid">
            {results.map((result) => (
              <Card
                key={result.id}
                className={`result-card ${currentPlaying === result.id ? 'playing' : ''}`}
                hoverable
                actions={[
                  <Button
                    key="play"
                    type="text"
                    icon={currentPlaying === result.id ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                    onClick={() => playAudio(result)}
                    className="action-button"
                    disabled={result.status === 'pending' || result.status === 'error' || (!result.stream_audio_url && !result.download_url)}
                  >
                    {currentPlaying === result.id ? '暂停' : '播放'}
                  </Button>,
                  <Button
                    key="download"
                    type="text"
                    icon={<DownloadOutlined />}
                    onClick={() => downloadAudio(result)}
                    className="action-button"
                    disabled={result.status === 'pending' || result.status === 'error' || (!result.stream_audio_url && !result.download_url)}
                  >
                    下载
                  </Button>,
                  <Button
                    key="delete"
                    type="text"
                    icon={<DeleteOutlined />}
                    onClick={() => deleteResult(result.id)}
                    danger
                    className="action-button"
                  >
                    删除
                  </Button>
                ]}
              >
                <div className="result-content">
                  <div className="result-text-wrapper">
                    <Text strong className="result-text">{result.text}</Text>
                    {result.error && (
                      <Alert
                        message={result.error}
                        type="error"
                        style={{ marginTop: 8 }}
                      />
                    )}
                  </div>
                  
                  <div className="result-tags">
                    <Space size={[8, 8]} wrap>
                      <Tag color="blue" className="provider-tag">
                        {providerInfo[result.provider]?.name || result.provider}
                      </Tag>
                      <Tag color="green" className="voice-tag">
                        {result.voice}
                      </Tag>
                      {/* 状态标签 */}
                      {result.status === 'pending' && (
                        <Tag color="orange">
                          <Spin size="small" style={{ marginRight: 4 }} />
                          等待中
                        </Tag>
                      )}
                      {result.status === 'streaming' && (
                        <Tag color="blue">
                          <Spin size="small" style={{ marginRight: 4 }} />
                          流式合成中
                        </Tag>
                      )}
                      {result.status === 'completed' && (
                        <Tag color="green">已完成</Tag>
                      )}
                      {result.status === 'error' && (
                        <Tag color="red">失败</Tag>
                      )}
                      {result.stream_audio_url && (
                        <Tag color="purple">流式音频</Tag>
                      )}
                      <Tag className="duration-tag">
                        <ClockCircleOutlined style={{ marginRight: 4 }} />
                        {formatDuration(result.audio_length)}
                      </Tag>
                      <Tag className="size-tag">
                        <FileOutlined style={{ marginRight: 4 }} />
                        {formatFileSize(result.file_size)}
                      </Tag>
                      <Tag className="time-tag">
                        <ThunderboltOutlined style={{ marginRight: 4 }} />
                        {result.duration.toFixed(2)}s
                      </Tag>
                    </Space>
                  </div>
                  
                  <div className="result-meta">
                    <Text type="secondary" className="timestamp">
                      <CalendarOutlined style={{ marginRight: 4 }} />
                      {new Date(result.timestamp).toLocaleString()}
                    </Text>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

        {/* 历史记录对话框 */}
        <TTSHistoryModal
          visible={historyModalVisible}
          onClose={() => setHistoryModalVisible(false)}
        />
      </div>
    </div>
  );
};
