/**
 * TTS语音合成步骤组件
 */

import React from 'react';
import { Card, Row, Col, Input, Button, Space, Select, Slider, Typography, Progress, Tag, Alert } from 'antd';
import { SoundOutlined, PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';
import type { TTSSettings, VoiceOption, AudioSegment, PlaybackState } from '@/types/document';

const { TextArea } = Input;
const { Text } = Typography;
const { Option } = Select;

interface TTSStepProps {
  generatedContent: string;
  ttsSettings: TTSSettings;
  streaming: boolean;
  currentSegment: number;
  totalSegments: number;
  audioSegments: AudioSegment[];
  playbackState: PlaybackState;
  error?: string;
  voiceOptions: VoiceOption[];
  onContentChange: (content: string) => void;
  onSettingsChange: (settings: Partial<TTSSettings>) => void;
  onSynthesize: () => void;
  onPlaySegment: (index: number) => void;
  onPauseAudio: () => void;
}

export const TTSStep: React.FC<TTSStepProps> = ({
  generatedContent,
  ttsSettings,
  streaming,
  currentSegment,
  totalSegments,
  audioSegments,
  playbackState,
  error,
  voiceOptions,
  onContentChange,
  onSettingsChange,
  onSynthesize,
  onPlaySegment,
  onPauseAudio
}) => {
  return (
    <Card title="步骤5: 语音合成" style={{ marginBottom: 24 }}>
      {/* TTS设置 */}
      <Card size="small" title="语音设置" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Text strong>音色选择</Text>
            <Select
              value={ttsSettings.voice}
              onChange={(value) => onSettingsChange({ voice: value })}
              style={{ width: '100%', marginTop: 8 }}
            >
              {voiceOptions.map(voice => (
                <Option key={voice.id} value={voice.id}>
                  <Tag color={voice.gender === 'male' ? 'blue' : 'pink'}>
                    {voice.gender === 'male' ? '男' : '女'}
                  </Tag>
                  {voice.name}
                </Option>
              ))}
            </Select>
          </Col>
          
          <Col span={6}>
            <Text strong>语速: {ttsSettings.speed}</Text>
            <Slider
              min={0.5}
              max={2.0}
              step={0.1}
              value={ttsSettings.speed}
              onChange={(value) => onSettingsChange({ speed: value })}
              style={{ marginTop: 8 }}
            />
          </Col>
          
          <Col span={6}>
            <Text strong>音调: {ttsSettings.pitch}</Text>
            <Slider
              min={0.5}
              max={2.0}
              step={0.1}
              value={ttsSettings.pitch}
              onChange={(value) => onSettingsChange({ pitch: value })}
              style={{ marginTop: 8 }}
            />
          </Col>
          
          <Col span={6}>
            <Text strong>音量: {ttsSettings.volume}</Text>
            <Slider
              min={0.1}
              max={2.0}
              step={0.1}
              value={ttsSettings.volume}
              onChange={(value) => onSettingsChange({ volume: value })}
              style={{ marginTop: 8 }}
            />
          </Col>
        </Row>
      </Card>
      
      {/* 生成的文稿 */}
      <Card size="small" title="待合成文稿" style={{ marginBottom: 16 }}>
        <TextArea
          value={generatedContent}
          onChange={(e) => onContentChange(e.target.value)}
          rows={6}
          placeholder="请输入要合成的文稿内容"
        />
      </Card>
      
      {/* 合成控制 */}
      <Space style={{ marginBottom: 16 }}>
        <Button 
          type="primary" 
          icon={<SoundOutlined />}
          onClick={onSynthesize}
          loading={streaming}
          disabled={!generatedContent.trim()}
        >
          {streaming ? '合成中...' : '开始语音合成'}
        </Button>
      </Space>
      
      {/* 合成进度 */}
      {streaming && (
        <div style={{ marginBottom: 16 }}>
          <Progress 
            percent={Math.round((currentSegment / Math.max(totalSegments, 1)) * 100)}
            status="active"
            format={() => `${currentSegment}/${totalSegments}`}
          />
          <Text type="secondary">正在合成第{currentSegment}段，共{totalSegments}段</Text>
        </div>
      )}
      
      {/* 音频播放列表 */}
      {audioSegments.length > 0 && (
        <Card size="small" title="音频播放列表">
          <div className="audio-segments">
            {audioSegments.map((segment, index) => (
              <div 
                key={index} 
                className={`audio-segment ${playbackState.currentSegment === index ? 'active' : ''}`}
              >
                <Space>
                  <Button
                    size="small"
                    icon={playbackState.isPlaying && playbackState.currentSegment === index ? 
                      <PauseCircleOutlined /> : <PlayCircleOutlined />}
                    onClick={() => playbackState.isPlaying && playbackState.currentSegment === index ? 
                      onPauseAudio() : onPlaySegment(index)}
                  />
                  <Text>第{index + 1}段音频</Text>
                  <Tag>{(segment.audioData.length * 0.75 / 1024).toFixed(1)}KB</Tag>
                </Space>
              </div>
            ))}
          </div>
        </Card>
      )}
      
      {error && (
        <Alert
          type="error"
          message="TTS合成失败"
          description={error}
          style={{ marginTop: 16 }}
        />
      )}
    </Card>
  );
};
