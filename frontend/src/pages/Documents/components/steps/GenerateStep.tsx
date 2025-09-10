/**
 * AI生成文稿步骤组件
 */

import React from 'react';
import { Card, Row, Col, Input, Button, Space, Divider, Progress, Typography, Alert } from 'antd';
import { RobotOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Text } = Typography;

interface GenerateStepProps {
  documentContent: string;
  generatedContent: string;
  streaming: boolean;
  completed: boolean;
  error?: string;
  onContentChange: (content: string) => void;
  onGenerate: () => void;
  onContinue: () => void;
  onBack: () => void;
}

export const GenerateStep: React.FC<GenerateStepProps> = ({
  documentContent,
  generatedContent,
  streaming,
  completed,
  error,
  onContentChange,
  onGenerate,
  onContinue,
  onBack
}) => {
  return (
    <Card title="步骤4: AI生成文稿" style={{ marginBottom: 24 }}>
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card size="small" title="原始内容">
            <TextArea
              value={documentContent}
              readOnly
              rows={10}
              style={{ backgroundColor: '#f5f5f5' }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title="AI生成文稿">
            <TextArea
              value={generatedContent}
              onChange={(e) => onContentChange(e.target.value)}
              rows={10}
              placeholder={streaming ? 'AI正在生成中...' : '点击生成AI文稿'}
            />
            
            {streaming && (
              <div style={{ marginTop: 8 }}>
                <Progress percent={50} status="active" showInfo={false} />
                <Text type="secondary">AI正在生成文稿...</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>
      
      <Divider />
      
      <Space>
        <Button 
          type="primary" 
          icon={<RobotOutlined />}
          onClick={onGenerate}
          loading={streaming}
          disabled={!documentContent.trim()}
        >
          {streaming ? '生成中...' : '生成AI文稿'}
        </Button>
        
        {completed && (
          <Button 
            type="primary" 
            onClick={onContinue}
          >
            继续语音合成
          </Button>
        )}
        
        <Button onClick={onBack}>
          返回编辑
        </Button>
      </Space>
      
      {error && (
        <Alert
          type="error"
          message="AI生成失败"
          description={error}
          style={{ marginTop: 16 }}
        />
      )}
    </Card>
  );
};
