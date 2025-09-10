/**
 * 文档处理工作流页面
 * 支持多格式文件上传、解析、AI生成和TTS合成的完整工作流程
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  Card,
  Steps,
  Button,
  Space,
  Typography,
  App
} from 'antd';
import {
  InboxOutlined,
  FileTextOutlined,
  EditOutlined,
  RobotOutlined,
  SoundOutlined,
  ReloadOutlined,
  HistoryOutlined,
  SettingOutlined
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { documentService } from '@/services/documentService';
import { Header } from '@/components/Layout/Header';
import { ProcessingHistoryModal } from './components/ProcessingHistoryModal';
import { PPTChoiceModal, type PPTProcessMode } from './components/PPTChoiceModal';
import { PPTPresentation } from './components/PPTPresentation';
import {
  UploadStep,
  ParseStep,
  EditStep,
  GenerateStep,
  TTSStep
} from './components/steps';
import {
  WorkflowStep
} from '@/types/document';
import type {
  DocumentInfo,
  DocumentWorkflowState,
  TTSSettings,
  VoiceOption,
  AudioSegment,
  PlaybackState
} from '@/types/document';
import './DocumentWorkflow.css';

const { Title, Paragraph } = Typography;

// 默认TTS设置
const defaultTTSSettings: TTSSettings = {
  voice: 'zh_male_beijingxiaoye_emo_v2_mars_bigtts',
  speed: 1.0,
  pitch: 1.0,
  volume: 1.0,
  format: 'wav',
  splitText: true
};

// 音色选项
const voiceOptions: VoiceOption[] = [
  { id: 'zh_male_beijingxiaoye_emo_v2_mars_bigtts', name: '北京小爷', gender: 'male', language: 'zh' },
  { id: 'zh_female_xiaoxin_emo_v2_mars_bigtts', name: '小欣', gender: 'female', language: 'zh' },
  { id: 'zh_male_xiaofeng_emo_v2_mars_bigtts', name: '小峰', gender: 'male', language: 'zh' },
  { id: 'zh_female_xiaoli_emo_v2_mars_bigtts', name: '小丽', gender: 'female', language: 'zh' },
  { id: 'zh_male_dongbeixiaogang_emo_v2_mars_bigtts', name: '东北小刚', gender: 'male', language: 'zh' }
];

export const DocumentWorkflow: React.FC = () => {
  const { message } = App.useApp();

  // 工作流状态
  const [currentStep, setCurrentStep] = useState<WorkflowStep>(WorkflowStep.UPLOAD);
  const [workflowState, setWorkflowState] = useState<DocumentWorkflowState>({
    upload: { completed: false },
    parse: { completed: false },
    edit: { completed: false },
    generate: { completed: false, streaming: false },
    tts: { completed: false, audioSegments: [], currentSegment: 0, totalSegments: 0, streaming: false }
  });

  // 加载状态
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  // 文档内容
  const [documentContent, setDocumentContent] = useState<string>('');
  const [generatedContent, setGeneratedContent] = useState<string>('');

  // TTS设置
  const [ttsSettings, setTTSSettings] = useState<TTSSettings>(defaultTTSSettings);

  // 音频播放状态
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    currentSegment: 0,
    totalSegments: 0,
    currentTime: 0,
    totalTime: 0,
    volume: 80,
    speed: 1.0
  });

  const audioRef = useRef<HTMLAudioElement>(null);
  const currentAudioIndex = useRef<number>(0);

  // 模态框状态
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [pptChoiceModalVisible, setPptChoiceModalVisible] = useState(false);
  const [showPPTPresentation, setShowPPTPresentation] = useState(false);
  const [uploadedDocument, setUploadedDocument] = useState<DocumentInfo | null>(null);

  // 工作流步骤定义
  const workflowSteps = [
    {
      key: WorkflowStep.UPLOAD,
      title: '文件上传',
      description: '上传PDF、PPTX、PPT或图片文件',
      icon: <InboxOutlined />
    },
    {
      key: WorkflowStep.PARSE,
      title: '内容解析',
      description: '提取文档内容和图片信息',
      icon: <FileTextOutlined />
    },
    {
      key: WorkflowStep.EDIT,
      title: '内容编辑',
      description: '编辑和完善解析内容',
      icon: <EditOutlined />
    },
    {
      key: WorkflowStep.GENERATE,
      title: 'AI生成文稿',
      description: '使用AI生成讲解文稿',
      icon: <RobotOutlined />
    },
    {
      key: WorkflowStep.TTS,
      title: '语音合成',
      description: '将文稿转换为语音',
      icon: <SoundOutlined />
    }
  ];

  // 获取当前步骤索引
  const getCurrentStepIndex = () => {
    return workflowSteps.findIndex(step => step.key === currentStep);
  };

  // 检查是否为PPT文件
  const isPPTFile = (filename: string) => {
    const ext = filename.toLowerCase().split('.').pop();
    return ext === 'ppt' || ext === 'pptx';
  };

  // 更新工作流状态
  const updateWorkflowState = useCallback((step: WorkflowStep, updates: any) => {
    setWorkflowState(prev => {
      // 只更新存在于DocumentWorkflowState中的步骤
      if (step in prev) {
        return {
          ...prev,
          [step]: { ...prev[step as keyof DocumentWorkflowState], ...updates }
        };
      }
      return prev;
    });
  }, []);


  // 设置加载状态
  const setStepLoading = useCallback((step: string, loading: boolean) => {
    setLoading(prev => ({ ...prev, [step]: loading }));
  }, []);

  // 文件上传处理
  const handleFileUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options;
    
    try {
      setStepLoading('upload', true);
      const documentInfo = await documentService.uploadDocument(file as File);
      
      updateWorkflowState(WorkflowStep.UPLOAD, {
        completed: true,
        document: documentInfo,
        error: undefined
      });
      
      message.success('文件上传成功');
      setUploadedDocument(documentInfo);
      onSuccess?.(documentInfo);
      
      // 检查是否为PPT文件
      if (isPPTFile(documentInfo.filename)) {
        // 显示PPT处理方式选择对话框
        setPptChoiceModalVisible(true);
      } else {
        // 非PPT文件，直接进入解析流程
        setCurrentStep(WorkflowStep.PARSE);
        handleDocumentParse(documentInfo);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '上传失败';
      updateWorkflowState(WorkflowStep.UPLOAD, {
        completed: false,
        error: errorMessage
      });
      message.error(errorMessage);
      onError?.(new Error(errorMessage));
    } finally {
      setStepLoading('upload', false);
    }
  };

  // 文档解析
  const handleDocumentParse = async (documentInfo: DocumentInfo) => {
    try {
      setStepLoading('parse', true);
      const parseResult = await documentService.parseDocument(documentInfo.id);
      
      console.log('Parse result:', parseResult);
      
      if (parseResult && parseResult.success) {
        updateWorkflowState(WorkflowStep.PARSE, {
          completed: true,
          result: parseResult,
          error: undefined
        });
        
        setDocumentContent(parseResult.text_content || '');
        message.success(`文档解析成功，提取了${parseResult.word_count || 0}个字符`);
        setCurrentStep(WorkflowStep.EDIT);
      } else {
        const errorMsg = parseResult?.error_message || '解析失败';
        throw new Error(errorMsg);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '解析失败';
      updateWorkflowState(WorkflowStep.PARSE, {
        completed: false,
        error: errorMessage
      });
      message.error(errorMessage);
    } finally {
      setStepLoading('parse', false);
    }
  };

  // 完成内容编辑
  const handleContentEdit = () => {
    if (!documentContent.trim()) {
      message.warning('请输入文档内容');
      return;
    }

    updateWorkflowState(WorkflowStep.EDIT, {
      completed: true,
      content: documentContent,
      error: undefined
    });
    
    message.success('内容编辑完成');
    setCurrentStep(WorkflowStep.GENERATE);
  };

  // AI生成文稿
  const handleAIGeneration = async () => {
    if (!workflowState.upload.document) {
      message.error('请先上传文档');
      return;
    }

    try {
      setStepLoading('generate', true);
      updateWorkflowState(WorkflowStep.GENERATE, { streaming: true });
      setGeneratedContent('');

      await documentService.generateContentStream(
        {
          document_id: workflowState.upload.document.id,
          content: documentContent,
          stream: true
        },
        // onChunk
        (chunk: string) => {
          setGeneratedContent(prev => prev + chunk);
        },
        // onError
        (error: string) => {
          updateWorkflowState(WorkflowStep.GENERATE, {
            streaming: false,
            error
          });
          message.error(`AI生成失败: ${error}`);
        },
        // onComplete
        () => {
          updateWorkflowState(WorkflowStep.GENERATE, {
            completed: true,
            streaming: false,
            error: undefined
          });
          message.success('AI文稿生成完成');
          setCurrentStep(WorkflowStep.TTS);
        }
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'AI生成失败';
      updateWorkflowState(WorkflowStep.GENERATE, {
        completed: false,
        streaming: false,
        error: errorMessage
      });
      message.error(errorMessage);
    } finally {
      setStepLoading('generate', false);
    }
  };

  // TTS语音合成
  const handleTTSSynthesis = async () => {
    if (!generatedContent.trim()) {
      message.warning('请先生成AI文稿');
      return;
    }

    try {
      setStepLoading('tts', true);
      updateWorkflowState(WorkflowStep.TTS, {
        streaming: true,
        audioSegments: [],
        currentSegment: 0,
        totalSegments: 0
      });

      const audioSegments: AudioSegment[] = [];

      await documentService.synthesizeSpeechStream(
        {
          text: generatedContent,
          voice: ttsSettings.voice,
          speed: ttsSettings.speed,
          pitch: ttsSettings.pitch,
          volume: ttsSettings.volume,
          format: ttsSettings.format,
          stream: true,
          split_text: ttsSettings.splitText
        },
        // onAudioChunk
        (audioData: string, segment: number, total: number) => {
          audioSegments.push({
            index: segment - 1,
            text: `第${segment}段`,
            audioData
          });

          updateWorkflowState(WorkflowStep.TTS, {
            audioSegments: [...audioSegments],
            currentSegment: segment,
            totalSegments: total
          });
        },
        // onError
        (error: string) => {
          updateWorkflowState(WorkflowStep.TTS, {
            streaming: false,
            error
          });
          message.error(`TTS合成失败: ${error}`);
        },
        // onComplete
        () => {
          updateWorkflowState(WorkflowStep.TTS, {
            completed: true,
            streaming: false,
            error: undefined
          });
          
          setPlaybackState(prev => ({
            ...prev,
            totalSegments: audioSegments.length
          }));
          
          message.success(`TTS合成完成，共生成${audioSegments.length}段音频`);
        }
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'TTS合成失败';
      updateWorkflowState(WorkflowStep.TTS, {
        completed: false,
        streaming: false,
        error: errorMessage
      });
      message.error(errorMessage);
    } finally {
      setStepLoading('tts', false);
    }
  };

  // 播放音频段
  const playAudioSegment = async (index: number) => {
    const segment = workflowState.tts.audioSegments[index];
    if (!segment || !audioRef.current) return;

    try {
      // 将base64音频数据转换为blob URL
      const audioBlob = new Blob(
        [Uint8Array.from(atob(segment.audioData), c => c.charCodeAt(0))],
        { type: 'audio/wav' }
      );
      const audioUrl = URL.createObjectURL(audioBlob);
      
      audioRef.current.src = audioUrl;
      await audioRef.current.play();
      
      setPlaybackState(prev => ({
        ...prev,
        isPlaying: true,
        currentSegment: index
      }));
      
      currentAudioIndex.current = index;
      
    } catch (error) {
      message.error('音频播放失败');
      console.error('Audio play error:', error);
    }
  };

  // 暂停音频播放
  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setPlaybackState(prev => ({ ...prev, isPlaying: false }));
    }
  };

  // PPT处理方式选择处理
  const handlePPTModeSelect = (mode: PPTProcessMode) => {
    setPptChoiceModalVisible(false);
    
    if (mode === 'presentation') {
      // 进入PPT讲解模式
      setShowPPTPresentation(true);
    } else {
      // 进入解析模式
      if (uploadedDocument) {
        setCurrentStep(WorkflowStep.PARSE);
        handleDocumentParse(uploadedDocument);
      }
    }
  };

  // 从PPT讲解返回
  const handleBackFromPresentation = () => {
    setShowPPTPresentation(false);
    resetWorkflow();
  };

  // 重置工作流
  const resetWorkflow = useCallback(() => {
    setCurrentStep(WorkflowStep.UPLOAD);
    setWorkflowState({
      upload: { completed: false },
      parse: { completed: false },
      edit: { completed: false },
      generate: { completed: false, streaming: false },
      tts: { completed: false, audioSegments: [], currentSegment: 0, totalSegments: 0, streaming: false }
    });
    setDocumentContent('');
    setGeneratedContent('');
    setPlaybackState({
      isPlaying: false,
      currentSegment: 0,
      totalSegments: 0,
      currentTime: 0,
      totalTime: 0,
      volume: 80,
      speed: 1.0
    });
    setUploadedDocument(null);
    setPptChoiceModalVisible(false);
    setShowPPTPresentation(false);
  }, []);


  // 如果正在显示PPT讲解页面，则渲染PPT组件
  if (showPPTPresentation && uploadedDocument) {
    return (
      <PPTPresentation
        document={uploadedDocument}
        onBack={handleBackFromPresentation}
      />
    );
  }

  return (
    <div >
      <Header 
        title="文档处理"
        actions={
          <Space>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={resetWorkflow}
              title="重新开始工作流"
            >
              重新开始
            </Button>
            <Button 
              type="text" 
              icon={<HistoryOutlined />}
              title="处理历史"
              onClick={() => setHistoryModalVisible(true)}
            >
              历史
            </Button>
            <Button 
              type="text" 
              icon={<SettingOutlined />}
              title="工作流设置"
            >
              设置
            </Button>
          </Space>
        }
      />
      
      <div className="workflow-content" style={{ padding: '16px' }}>
        <div className="workflow-header">
          <Title level={2}>文档智能处理工作流</Title>
          <Paragraph>
            支持PDF、PPTX、PPT和图片文件的上传、解析、AI生成文稿和语音合成
          </Paragraph>
        </div>

      {/* 步骤指示器 */}
      <Card style={{ marginBottom: 24 }}>
        <Steps
          current={getCurrentStepIndex()}
          items={workflowSteps.map(step => {
            const stepState = workflowState[step.key as keyof DocumentWorkflowState];
            return {
              title: step.title,
              description: step.description,
              icon: step.icon,
              status: stepState?.error ? 'error' : 
                     stepState?.completed ? 'finish' : 
                     currentStep === step.key ? 'process' : 'wait'
            };
          })}
        />
      </Card>

      {/* 步骤1: 文件上传 */}
      {currentStep === WorkflowStep.UPLOAD && (
        <UploadStep
          loading={loading.upload || false}
          error={workflowState.upload.error}
          onFileUpload={handleFileUpload}
        />
      )}

      {/* 步骤2: 内容解析 */}
      {currentStep === WorkflowStep.PARSE && (
        <ParseStep
          loading={loading.parse || false}
          result={workflowState.parse.result}
          error={workflowState.parse.error}
          onContinue={() => setCurrentStep(WorkflowStep.EDIT)}
        />
      )}

      {/* 步骤3: 内容编辑 */}
      {currentStep === WorkflowStep.EDIT && (
        <EditStep
          content={documentContent}
          onContentChange={setDocumentContent}
          onComplete={handleContentEdit}
          onBack={() => setCurrentStep(WorkflowStep.PARSE)}
        />
      )}

      {/* 步骤4: AI生成文稿 */}
      {currentStep === WorkflowStep.GENERATE && (
        <GenerateStep
          documentContent={documentContent}
          generatedContent={generatedContent}
          streaming={workflowState.generate.streaming || false}
          completed={workflowState.generate.completed || false}
          error={workflowState.generate.error}
          onContentChange={setGeneratedContent}
          onGenerate={handleAIGeneration}
          onContinue={() => setCurrentStep(WorkflowStep.TTS)}
          onBack={() => setCurrentStep(WorkflowStep.EDIT)}
        />
      )}

      {/* 步骤5: TTS语音合成 */}
      {currentStep === WorkflowStep.TTS && (
        <TTSStep
          generatedContent={generatedContent}
          ttsSettings={ttsSettings}
          streaming={workflowState.tts.streaming || false}
          currentSegment={workflowState.tts.currentSegment || 0}
          totalSegments={workflowState.tts.totalSegments || 0}
          audioSegments={workflowState.tts.audioSegments || []}
          playbackState={playbackState}
          error={workflowState.tts.error}
          voiceOptions={voiceOptions}
          onContentChange={setGeneratedContent}
          onSettingsChange={(updates) => setTTSSettings(prev => ({ ...prev, ...updates }))}
          onSynthesize={handleTTSSynthesis}
          onPlaySegment={playAudioSegment}
          onPauseAudio={pauseAudio}
        />
      )}

      {/* 隐藏的音频元素 */}
      <audio 
        ref={audioRef}
        onEnded={() => {
          // 自动播放下一段
          const nextIndex = currentAudioIndex.current + 1;
          if (nextIndex < workflowState.tts.audioSegments.length) {
            playAudioSegment(nextIndex);
          } else {
            setPlaybackState(prev => ({ 
              ...prev, 
              isPlaying: false,
              currentSegment: 0 
            }));
          }
        }}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setPlaybackState(prev => ({
              ...prev,
              currentTime: audioRef.current?.currentTime || 0,
              totalTime: audioRef.current?.duration || 0
            }));
          }
        }}
      />

        {/* 处理记录历史模态框 */}
        <ProcessingHistoryModal
          visible={historyModalVisible}
          onCancel={() => setHistoryModalVisible(false)}
        />

        {/* PPT处理方式选择模态框 */}
        <PPTChoiceModal
          visible={pptChoiceModalVisible}
          filename={uploadedDocument?.filename}
          onCancel={() => setPptChoiceModalVisible(false)}
          onSelect={handlePPTModeSelect}
        />
      </div>
    </div>
  );
};
