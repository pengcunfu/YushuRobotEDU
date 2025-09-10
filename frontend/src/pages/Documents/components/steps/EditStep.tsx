/**
 * 内容编辑步骤组件
 */

import React from 'react';
import { Card, Input, Space, Button } from 'antd';

const { TextArea } = Input;

interface EditStepProps {
  content: string;
  onContentChange: (content: string) => void;
  onComplete: () => void;
  onBack: () => void;
}

export const EditStep: React.FC<EditStepProps> = ({
  content,
  onContentChange,
  onComplete,
  onBack
}) => {
  return (
    <Card title="步骤3: 内容编辑" style={{ marginBottom: 24 }}>
      <TextArea
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        placeholder="请编辑文档内容..."
        rows={12}
        style={{ marginBottom: 16 }}
      />
      
      <Space>
        <Button type="primary" onClick={onComplete}>
          完成编辑
        </Button>
        <Button onClick={onBack}>
          返回解析
        </Button>
      </Space>
    </Card>
  );
};
