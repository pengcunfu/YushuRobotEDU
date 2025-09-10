/**
 * 内容解析步骤组件
 */

import React from 'react';
import { Card, Spin, Row, Col, Typography, Button, Alert, Divider } from 'antd';

const { Text } = Typography;

interface ParseResult {
  page_count: number;
  word_count: number;
  duration: number;
}

interface ParseStepProps {
  loading: boolean;
  result?: ParseResult;
  error?: string;
  onContinue: () => void;
}

export const ParseStep: React.FC<ParseStepProps> = ({
  loading,
  result,
  error,
  onContinue
}) => {
  return (
    <Card title="步骤2: 内容解析" style={{ marginBottom: 24 }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
          <p>正在解析文档内容...</p>
        </div>
      ) : result ? (
        <div>
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Card size="small">
                <Text strong>页数</Text>
                <div style={{ fontSize: 24, color: '#1890ff' }}>
                  {result.page_count}
                </div>
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Text strong>字数</Text>
                <div style={{ fontSize: 24, color: '#52c41a' }}>
                  {result.word_count}
                </div>
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Text strong>解析耗时</Text>
                <div style={{ fontSize: 24, color: '#fa8c16' }}>
                  {result.duration.toFixed(2)}s
                </div>
              </Card>
            </Col>
          </Row>
          
          <Divider />
          
          <Button type="primary" onClick={onContinue}>
            继续编辑内容
          </Button>
        </div>
      ) : (
        <Alert
          type="error"
          message="解析失败"
          description={error}
        />
      )}
    </Card>
  );
};
