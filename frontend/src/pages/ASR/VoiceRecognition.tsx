import React, { useState, useRef, useEffect } from 'react';
import {
  Card,
  Button,
  Select,
  Space,
  Upload,
  Alert,
  Typography,
  Divider,
  Tag,
  Progress,
  Row,
  Col,
  App,
  List,
  Spin
} from 'antd';
import {
  AudioOutlined,
  UploadOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { asrService } from '@/services/asrService';
import { ASRResponse, ASRProvider } from '@/types';
import './VoiceRecognition.css';

const { Text, Title } = Typography;
const { Option } = Select;

interface RecognitionResult {
  id: string;
  text: string;
  provider: string;
  duration: number;
  confidence: number;
  timestamp: string;
  filename: string;
}

export const VoiceRecognition: React.FC = () => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  
  // 状态管理
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedProvider, setSelectedProvider] = useState<string>('baidu');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('zh');
  const [selectedFormat, setSelectedFormat] = useState<string>('wav');
  const [sampleRate, setSampleRate] = useState<number>(16000);
  const [showSettings, setShowSettings] = useState(false);
  const [results, setResults] = useState<RecognitionResult[]>([]);
  
  // 录音相关引用
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 获取可用提供商
  const { data: providersData, isLoading: providersLoading, refetch: refetchProviders } = useQuery({
    queryKey: ['asrProviders'],
    queryFn: asrService.getProviders,
  });

  // 语音识别mutation
  const recognizeMutation = useMutation({
    mutationFn: ({ audioFile, provider, format, sampleRate, language }: {
      audioFile: File;
      provider: string;
      format: string;
      sampleRate: number;
      language: string;
    }) => asrService.recognizeAudio(audioFile, provider, format, sampleRate, language),
    onSuccess: (response: ASRResponse, variables) => {
      if (response.success && response.text) {
        const result: RecognitionResult = {
          id: Date.now().toString(),
          text: response.text,
          provider: response.provider || variables.provider,
          duration: response.duration || 0,
          confidence: response.confidence || 0,
          timestamp: new Date().toISOString(),
          filename: variables.audioFile.name
        };
        setResults(prev => [result, ...prev]);
        message.success('语音识别成功');
      } else {
        message.error(response.error || '识别失败');
      }
    },
    onError: (error: any) => {
      message.error(`识别失败: ${error.message}`);
    }
  });

  // 开始录音
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioFile = new File([audioBlob], `recording_${Date.now()}.wav`, { type: 'audio/wav' });
        
        // 自动进行语音识别
        recognizeMutation.mutate({
          audioFile,
          provider: selectedProvider,
          format: selectedFormat,
          sampleRate,
          language: selectedLanguage
        });
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
      
      // 开始计时
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      message.success('开始录音');
    } catch (error) {
      message.error('无法访问麦克风，请检查权限设置');
    }
  };

  // 暂停/恢复录音
  const togglePauseRecording = () => {
    if (mediaRecorderRef.current) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
        setIsPaused(false);
        message.success('继续录音');
      } else {
        mediaRecorderRef.current.pause();
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        setIsPaused(true);
        message.success('暂停录音');
      }
    }
  };

  // 停止录音
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      setIsRecording(false);
      setIsPaused(false);
      message.success('录音结束，正在识别...');
    }
  };

  // 文件上传处理
  const handleFileUpload = (file: File) => {
    // 检查文件类型
    const allowedTypes = ['audio/wav', 'audio/mp3', 'audio/m4a', 'audio/flac'];
    if (!allowedTypes.includes(file.type)) {
      message.error('不支持的音频格式，请上传 WAV、MP3、M4A 或 FLAC 格式的文件');
      return false;
    }
    
    // 检查文件大小（10MB）
    if (file.size > 10 * 1024 * 1024) {
      message.error('文件过大，请上传小于10MB的音频文件');
      return false;
    }
    
    // 推断音频格式
    const formatMap: { [key: string]: string } = {
      'audio/wav': 'wav',
      'audio/mp3': 'mp3',
      'audio/mpeg': 'mp3',
      'audio/m4a': 'm4a',
      'audio/flac': 'flac'
    };
    
    const format = formatMap[file.type] || 'wav';
    
    recognizeMutation.mutate({
      audioFile: file,
      provider: selectedProvider,
      format,
      sampleRate,
      language: selectedLanguage
    });
    
    return false; // 阻止默认上传行为
  };

  // 删除识别结果
  const deleteResult = (id: string) => {
    setResults(prev => prev.filter(result => result.id !== id));
    message.success('已删除');
  };

  // 清空所有结果
  const clearAllResults = () => {
    setResults([]);
    message.success('已清空所有结果');
  };

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 获取可用提供商列表
  const availableProviders = providersData?.providers || [];
  const providerInfo = providersData?.provider_info || {};

  // 清理资源
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="voice-recognition">
      <div className="recognition-header">
        <Title level={4} style={{ margin: 0, color: '#1677ff', fontSize: '18px' }}>
          <AudioOutlined /> 语音识别
        </Title>
        <Space size="small" className="header-button-group">
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => refetchProviders()}
            loading={providersLoading}
          >
            刷新
          </Button>
          <Button
            size="small"
            icon={<SettingOutlined />}
            onClick={() => setShowSettings(!showSettings)}
            type={showSettings ? 'primary' : 'default'}
          >
            设置
          </Button>
          <Button
            size="small"
            icon={<DeleteOutlined />}
            onClick={clearAllResults}
            disabled={results.length === 0}
            danger
          >
            清空
          </Button>
        </Space>
      </div>

      {/* 提供商状态 */}
      {providersLoading ? (
        <Card className="provider-status-card" size="small">
          <Spin size="small" /> 正在加载语音识别提供商...
        </Card>
      ) : availableProviders.length === 0 ? (
        <Alert
          message="暂无可用的语音识别提供商"
          description="请在配置中心配置至少一个语音识别服务提供商的API密钥"
          type="warning"
          showIcon
          style={{ borderRadius: '8px' }}
        />
      ) : (
        <Card className="provider-status-card" size="small">
          <Space wrap size="small">
            <Text strong style={{ fontSize: '13px' }}>可用提供商:</Text>
            {availableProviders.map(provider => (
              <Tag
                key={provider}
                className={`provider-tag ${provider === selectedProvider ? 'active' : ''}`}
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
        <Card title="识别设置" className="settings-card" size="small">
          <Row gutter={[12, 8]}>
            <Col xs={24} sm={12} md={6}>
              <div className="settings-item">
                <span className="settings-label">语音识别提供商</span>
                <Select
                  size="small"
                  value={selectedProvider}
                  onChange={setSelectedProvider}
                  style={{ width: '100%' }}
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
            <Col xs={24} sm={12} md={6}>
              <div className="settings-item">
                <span className="settings-label">语言</span>
                <Select
                  size="small"
                  value={selectedLanguage}
                  onChange={setSelectedLanguage}
                  style={{ width: '100%' }}
                >
                  {(providerInfo[selectedProvider]?.supported_languages || ['zh']).map(lang => (
                    <Option key={lang} value={lang}>
                      {lang === 'zh' ? '中文' : lang === 'en' ? '英文' : lang}
                    </Option>
                  ))}
                </Select>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div className="settings-item">
                <span className="settings-label">音频格式</span>
                <Select
                  size="small"
                  value={selectedFormat}
                  onChange={setSelectedFormat}
                  style={{ width: '100%' }}
                >
                  {(providerInfo[selectedProvider]?.supported_formats || ['wav']).map(format => (
                    <Option key={format} value={format}>
                      {format.toUpperCase()}
                    </Option>
                  ))}
                </Select>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div className="settings-item">
                <span className="settings-label">采样率</span>
                <Select
                  size="small"
                  value={sampleRate}
                  onChange={setSampleRate}
                  style={{ width: '100%' }}
                >
                  <Option value={8000}>8000 Hz</Option>
                  <Option value={16000}>16000 Hz</Option>
                  <Option value={22050}>22050 Hz</Option>
                  <Option value={44100}>44100 Hz</Option>
                </Select>
              </div>
            </Col>
          </Row>
        </Card>
      )}

      {/* 录音控制区域 */}
      <Row gutter={8}>
        <Col xs={24} md={12}>
          <div className="recording-controls">
            {!isRecording ? (
              <Button
                type="primary"
                icon={<AudioOutlined />}
                onClick={startRecording}
                disabled={availableProviders.length === 0}
                className="record-button"
              >
                开始录音
              </Button>
            ) : (
              <Space size="small">
                <Button
                  size="small"
                  icon={isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
                  onClick={togglePauseRecording}
                  className="pause-button"
                >
                  {isPaused ? '继续' : '暂停'}
                </Button>
                <Button
                  size="small"
                  icon={<StopOutlined />}
                  onClick={stopRecording}
                  danger
                  className="stop-button"
                >
                  停止
                </Button>
              </Space>
            )}
            
            {isRecording && (
              <div className="recording-status">
                <div className="recording-indicator">
                  <div className="recording-dot" />
                  <Text strong style={{ color: '#ff4d4f', fontSize: '13px' }}>
                    {isPaused ? '录音已暂停' : '正在录音...'}
                  </Text>
                </div>
                <div className="recording-time">
                  {formatTime(recordingTime)}
                </div>
              </div>
            )}
          </div>
        </Col>
        
        <Col xs={24} md={12}>
          <div className="upload-container">
            <Upload.Dragger
              beforeUpload={handleFileUpload}
              accept="audio/*"
              showUploadList={false}
              disabled={recognizeMutation.isPending || availableProviders.length === 0}
            >
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽音频文件到此区域</p>
              <p className="ant-upload-hint">
                支持 WAV、MP3、M4A、FLAC 格式，文件大小不超过10MB
              </p>
            </Upload.Dragger>
            
            {recognizeMutation.isPending && (
              <div style={{ marginTop: 12 }}>
                <Progress percent={100} status="active" showInfo={false} />
                <Text type="secondary" style={{ fontSize: '12px' }}>正在识别中...</Text>
              </div>
            )}
          </div>
        </Col>
      </Row>

      {/* 识别结果 */}
      <div className="results-container">
        {results.length === 0 ? (
          <div className="empty-results">
            <AudioOutlined style={{ fontSize: 36, color: '#d9d9d9', marginBottom: 12 }} />
            <Text type="secondary" style={{ fontSize: '14px' }}>暂无识别结果</Text>
          </div>
        ) : (
          <div className="results-list">
            <List
              dataSource={results}
              renderItem={(result) => {
                const confidenceLevel = result.confidence >= 0.8 ? 'high' : result.confidence >= 0.6 ? 'medium' : 'low';
                return (
                  <List.Item
                    actions={[
                      <Button
                        key="delete"
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => deleteResult(result.id)}
                        danger
                      >
                        删除
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <div className="result-header">
                          <Text strong style={{ fontSize: '14px' }}>{result.text}</Text>
                          <Space size="small">
                            <Tag style={{ fontSize: '11px' }}>{providerInfo[result.provider]?.name || result.provider}</Tag>
                            <Tag className={`confidence-display confidence-${confidenceLevel}`}>
                              置信度: {(result.confidence * 100).toFixed(1)}%
                            </Tag>
                            <Tag style={{ fontSize: '11px' }}>耗时: {result.duration.toFixed(2)}s</Tag>
                          </Space>
                        </div>
                      }
                      description={
                        <div className="result-meta">
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            文件: {result.filename} | 
                            时间: {new Date(result.timestamp).toLocaleString()}
                          </Text>
                        </div>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
