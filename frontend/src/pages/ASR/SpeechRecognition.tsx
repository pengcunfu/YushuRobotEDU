import React, { useState, useCallback, useEffect } from 'react';
import {
  Upload,
  Button,
  Card,
  Select,
  Alert,
  Typography,
  Row,
  Col,
  Space,
  Progress,
  Tag,
  Input,
  App,
} from 'antd';
import {
  UploadOutlined,
  PlayCircleOutlined,
  StopOutlined,
  AudioOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  CopyOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { asrService } from '../../services/asrService';
import { Header } from '@/components/Layout/Header';
import type { UploadFile } from 'antd/es/upload/interface';
import './SpeechRecognition.css';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface ProviderInfo {
  name: string;
  description: string;
  supported_formats: string[];
  supported_languages: string[];
  available: boolean;
}

interface ASRResponse {
  success: boolean;
  text?: string;
  confidence?: number;
  duration?: number;
  provider?: string;
  error_msg?: string;
}

const SpeechRecognition: React.FC = () => {
  const { message } = App.useApp();


  
  // 状态管理
  const [selectedProvider, setSelectedProvider] = useState<string>('douyin');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('zh');
  const [audioFile, setAudioFile] = useState<UploadFile | null>(null);
  const [recognitionResult, setRecognitionResult] = useState<string>('');
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognitionProgress, setRecognitionProgress] = useState(0);
  const [providersInfo, setProvidersInfo] = useState<Record<string, ProviderInfo>>({});

  // 获取提供商列表
  const { data: providersData, isLoading: providersLoading, error: providersError } = useQuery({
    queryKey: ['asr-providers'],
    queryFn: asrService.getProviders,
  });

  // 处理提供商数据
  useEffect(() => {
    if (providersData?.provider_info) {
      setProvidersInfo(providersData.provider_info);
    }
  }, [providersData]);

  // 处理提供商错误
  useEffect(() => {
    if (providersError) {
      message.error(`获取ASR提供商失败: ${(providersError as any).message}`);
    }
  }, [providersError]);

  // 语音识别Mutation
  const recognitionMutation = useMutation({
    mutationFn: ({ provider, file, language }: { provider: string; file: File; language: string }) =>
      asrService.recognizeAudio(provider, file, language),
    onSuccess: (data: ASRResponse) => {
      if (data.success && data.text) {
        setRecognitionResult(data.text);
        message.success('语音识别完成！');
      } else {
        message.error(data.error_msg || '识别失败');
      }
      setIsRecognizing(false);
      setRecognitionProgress(0);
    },
    onError: (error: any) => {
      message.error(`识别失败: ${error.message}`);
      setIsRecognizing(false);
      setRecognitionProgress(0);
    },
  });

  // 文件上传处理
  const handleFileUpload = useCallback((file: UploadFile) => {
    setAudioFile(file);
    setRecognitionResult('');
    return false; // 阻止自动上传
  }, []);

  // 文件删除处理
  const handleFileRemove = useCallback(() => {
    setAudioFile(null);
    setRecognitionResult('');
  }, []);

  // 开始识别
  const handleStartRecognition = useCallback(async () => {
    if (!audioFile || !audioFile.originFileObj) {
      message.warning('请先选择音频文件');
      return;
    }

    if (!selectedProvider) {
      message.warning('请选择语音识别提供商');
      return;
    }

    setIsRecognizing(true);
    setRecognitionProgress(0);
    setRecognitionResult('');

    // 模拟进度更新
    const progressInterval = setInterval(() => {
      setRecognitionProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 500);

    try {
      await recognitionMutation.mutateAsync({
        provider: selectedProvider,
        file: audioFile.originFileObj,
        language: selectedLanguage,
      });
      setRecognitionProgress(100);
    } catch (error) {
      clearInterval(progressInterval);
    }
  }, [audioFile, selectedProvider, selectedLanguage, recognitionMutation]);

  // 复制结果
  const handleCopyResult = useCallback(() => {
    if (recognitionResult) {
      navigator.clipboard.writeText(recognitionResult);
      message.success('已复制到剪贴板');
    }
  }, [recognitionResult]);

  // 下载结果
  const handleDownloadResult = useCallback(() => {
    if (recognitionResult) {
      const blob = new Blob([recognitionResult], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `语音识别结果_${new Date().getTime()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      message.success('文件已下载');
    }
  }, [recognitionResult]);

  // 获取当前提供商信息
  const currentProviderInfo = providersInfo[selectedProvider];
  const availableProviders = Object.keys(providersInfo).filter(
    (key) => providersInfo[key].available
  );

  return (
    <div >
      <Header 
        title="语音识别"
        actions={
          <Space>
            <Button 
              type="text" 
              icon={<InfoCircleOutlined />}
              title="使用说明"
            >
              说明
            </Button>
            <Button 
              type="text" 
              icon={<DownloadOutlined />}
              title="下载结果"
              onClick={handleDownloadResult}
              disabled={!recognitionResult}
            >
              下载
            </Button>
            <Button 
              type="text" 
              icon={<SettingOutlined />}
              title="识别设置"
            />
          </Space>
        }
      />
      
      <div className="speech-recognition-content" style={{ padding: '16px' }}>
        <div className="speech-recognition-header">
          <Title level={2}>
            <AudioOutlined /> 语音识别
          </Title>
          <Paragraph type="secondary">
            上传音频文件，使用AI技术将语音转换为文字
          </Paragraph>
        </div>

      <Row gutter={[24, 24]}>
        {/* 左侧配置区域 */}
        <Col xs={24} lg={8}>
          <Card title={<><SettingOutlined /> 识别设置</>} className="config-card">
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              {/* 提供商选择 */}
              <div>
                <Text strong>识别提供商</Text>
                <Select
                  value={selectedProvider}
                  onChange={setSelectedProvider}
                  style={{ width: '100%', marginTop: 8 }}
                  loading={providersLoading}
                  placeholder="选择语音识别提供商"
                >
                  {availableProviders.map((provider) => (
                    <Option key={provider} value={provider}>
                      <Space>
                        {providersInfo[provider]?.name || provider}
                        <Tag color="green">
                          可用
                        </Tag>
                      </Space>
                    </Option>
                  ))}
                </Select>
                {currentProviderInfo && (
                  <Alert
                    message={currentProviderInfo.description}
                    type="info"
                    showIcon
                    style={{ marginTop: 8 }}
                    icon={<InfoCircleOutlined />}
                  />
                )}
              </div>

              {/* 语言选择 */}
              <div>
                <Text strong>识别语言</Text>
                <Select
                  value={selectedLanguage}
                  onChange={setSelectedLanguage}
                  style={{ width: '100%', marginTop: 8 }}
                  placeholder="选择识别语言"
                >
                  <Option value="zh">中文</Option>
                  <Option value="en">英文</Option>
                </Select>
              </div>

              {/* 支持格式信息 */}
              {currentProviderInfo && (
                <div>
                  <Text strong>支持格式</Text>
                  <div style={{ marginTop: 8 }}>
                    {currentProviderInfo.supported_formats.map((format) => (
                      <Tag key={format} color="blue" style={{ margin: '2px' }}>
                        {format.toUpperCase()}
                      </Tag>
                    ))}
                  </div>
                </div>
              )}
            </Space>
          </Card>
        </Col>

        {/* 右侧操作区域 */}
        <Col xs={24} lg={16}>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {/* 文件上传 */}
            <Card title={<><UploadOutlined /> 音频文件</>}>
              <Upload
                accept=".wav,.mp3,.m4a,.flac,.aac,.amr,.ogg"
                beforeUpload={handleFileUpload}
                onRemove={handleFileRemove}
                fileList={audioFile ? [audioFile] : []}
                maxCount={1}
                showUploadList={{
                  showDownloadIcon: false,
                  showPreviewIcon: false,
                }}
              >
                <Button icon={<UploadOutlined />} size="large">
                  选择音频文件
                </Button>
              </Upload>

              {audioFile && (
                <div style={{ marginTop: 16 }}>
                  <Alert
                    message={`已选择文件：${audioFile.name}`}
                    type="success"
                    showIcon
                    action={
                      <Button
                        type="primary"
                        icon={isRecognizing ? <StopOutlined /> : <PlayCircleOutlined />}
                        onClick={handleStartRecognition}
                        loading={isRecognizing}
                        disabled={!audioFile || !selectedProvider}
                      >
                        {isRecognizing ? '识别中...' : '开始识别'}
                      </Button>
                    }
                  />
                </div>
              )}

              {isRecognizing && (
                <div style={{ marginTop: 16 }}>
                  <Text>识别进度</Text>
                  <Progress
                    percent={recognitionProgress}
                    status={recognitionProgress === 100 ? 'success' : 'active'}
                    strokeColor={{
                      from: '#108ee9',
                      to: '#87d068',
                    }}
                  />
                </div>
              )}
            </Card>

            {/* 识别结果 */}
            <Card
              title={<><AudioOutlined /> 识别结果</>}
              extra={
                recognitionResult && (
                  <Space>
                    <Button
                      icon={<CopyOutlined />}
                      onClick={handleCopyResult}
                      size="small"
                    >
                      复制
                    </Button>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={handleDownloadResult}
                      size="small"
                    >
                      下载
                    </Button>
                  </Space>
                )
              }
            >
              {recognitionResult ? (
                <TextArea
                  value={recognitionResult}
                  onChange={(e) => setRecognitionResult(e.target.value)}
                  placeholder="识别结果将显示在这里..."
                  autoSize={{ minRows: 6, maxRows: 15 }}
                  style={{ fontSize: '16px', lineHeight: '1.6' }}
                />
              ) : (
                <div className="empty-result">
                  <AudioOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
                  <p style={{ color: '#999', marginTop: 16 }}>
                    上传音频文件并开始识别，结果将显示在这里
                  </p>
                </div>
              )}
            </Card>
          </Space>
        </Col>
      </Row>
      </div>
    </div>
  );
};

export default SpeechRecognition;
