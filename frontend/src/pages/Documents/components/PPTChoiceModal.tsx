/**
 * PPT处理选择对话框
 * 用户可以选择PPT解析或PPT讲解模式
 */

import React from 'react';
import { Modal, Card, Button, Space, Typography, Row, Col } from 'antd';
import { FileTextOutlined, PlayCircleOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

export type PPTProcessMode = 'parse' | 'presentation';

interface PPTChoiceModalProps {
  visible: boolean;
  filename?: string;
  onCancel: () => void;
  onSelect: (mode: PPTProcessMode) => void;
}

export const PPTChoiceModal: React.FC<PPTChoiceModalProps> = ({
  visible,
  filename,
  onCancel,
  onSelect
}) => {
  return (
    <Modal
      title="PPT处理方式选择"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={600}
      centered
      styles={{
        body: { padding: '16px 20px 20px' }
      }}
    >
      <div>
        <div style={{ 
          textAlign: 'center', 
          marginBottom: 20
        }}>
          <Title 
            level={4} 
            style={{ 
              fontSize: '16px',
              fontWeight: 600,
              color: '#262626',
              marginBottom: 6
            }}
          >
            请选择处理方式
          </Title>
          <div style={{ 
            fontSize: '13px',
            color: '#8c8c8c',
            backgroundColor: '#fafafa',
            padding: '6px 12px',
            borderRadius: 4,
            display: 'inline-block',
            fontFamily: 'Monaco, Consolas, monospace'
          }}>
            {filename}
          </div>
        </div>
        
        <Row gutter={16} justify="center">
          <Col xs={24} sm={24} md={12} lg={12} xl={12}>
            <div
              onClick={() => onSelect('parse')}
              style={{
                border: '2px solid #e6f7ff',
                borderRadius: 8,
                padding: '20px 16px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                backgroundColor: '#fafcff',
                height: 320,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#1890ff';
                e.currentTarget.style.backgroundColor = '#f0f9ff';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(24, 144, 255, 0.15)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e6f7ff';
                e.currentTarget.style.backgroundColor = '#fafcff';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{
                position: 'absolute',
                top: -20,
                right: -20,
                width: 60,
                height: 60,
                backgroundColor: '#1890ff',
                borderRadius: '50%',
                opacity: 0.1
              }} />
              
              <div style={{ 
                textAlign: 'center',
                marginBottom: 16
              }}>
                <FileTextOutlined style={{ 
                  fontSize: 40, 
                  color: '#1890ff',
                  marginBottom: 8
                }} />
                <Title level={3} style={{ 
                  fontSize: '18px',
                  fontWeight: 600,
                  margin: 0,
                  color: '#1890ff'
                }}>
                  PPT解析
                </Title>
              </div>
              
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ 
                  fontSize: '14px',
                  lineHeight: 1.5,
                  color: '#595959',
                  marginBottom: 12
                }}>
                  <div style={{ marginBottom: 6 }}>• 提取PPT中的文字内容</div>
                  <div style={{ marginBottom: 6 }}>• 识别图片和图表信息</div>
                  <div style={{ marginBottom: 6 }}>• 生成结构化文档</div>
                </div>
                <div style={{ 
                  color: '#8c8c8c', 
                  fontSize: '12px',
                  fontStyle: 'italic',
                  padding: '6px 10px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: 4
                }}>
                  适合需要编辑和重新组织内容的场景
                </div>
              </div>
              
              <div style={{ marginTop: 16 }}>
                <Button 
                  type="primary" 
                  size="large"
                  block
                  style={{ 
                    height: 40,
                    borderRadius: 6,
                    fontWeight: 600,
                    fontSize: '15px',
                    backgroundColor: '#1890ff',
                    borderColor: '#1890ff'
                  }}
                >
                  选择解析模式
                </Button>
              </div>
            </div>
          </Col>
          
          <Col xs={24} sm={24} md={12} lg={12} xl={12}>
            <div
              onClick={() => onSelect('presentation')}
              style={{
                border: '2px solid #f6ffed',
                borderRadius: 8,
                padding: '20px 16px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                backgroundColor: '#fcfffe',
                height: 320,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#52c41a';
                e.currentTarget.style.backgroundColor = '#f6ffed';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(82, 196, 26, 0.15)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#f6ffed';
                e.currentTarget.style.backgroundColor = '#fcfffe';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{
                position: 'absolute',
                top: -20,
                right: -20,
                width: 60,
                height: 60,
                backgroundColor: '#52c41a',
                borderRadius: '50%',
                opacity: 0.1
              }} />
              
              <div style={{ 
                textAlign: 'center',
                marginBottom: 16
              }}>
                <PlayCircleOutlined style={{ 
                  fontSize: 40, 
                  color: '#52c41a',
                  marginBottom: 8
                }} />
                <Title level={3} style={{ 
                  fontSize: '18px',
                  fontWeight: 600,
                  margin: 0,
                  color: '#52c41a'
                }}>
                  PPT讲解
                </Title>
              </div>
              
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ 
                  fontSize: '14px',
                  lineHeight: 1.5,
                  color: '#595959',
                  marginBottom: 12
                }}>
                  <div style={{ marginBottom: 6 }}>• 逐页展示PPT内容</div>
                  <div style={{ marginBottom: 6 }}>• AI自动生成讲解文稿</div>
                  <div style={{ marginBottom: 6 }}>• 实时语音合成播放</div>
                </div>
                <div style={{ 
                  color: '#8c8c8c', 
                  fontSize: '12px',
                  fontStyle: 'italic',
                  padding: '6px 10px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: 4
                }}>
                  适合直接演示和教学的场景
                </div>
              </div>
              
              <div style={{ marginTop: 16 }}>
                <Button 
                  type="primary" 
                  size="large"
                  block
                  style={{ 
                    height: 40,
                    borderRadius: 6,
                    fontWeight: 600,
                    fontSize: '15px',
                    backgroundColor: '#52c41a',
                    borderColor: '#52c41a'
                  }}
                >
                  选择讲解模式
                </Button>
              </div>
            </div>
          </Col>
        </Row>
      </div>
    </Modal>
  );
};
