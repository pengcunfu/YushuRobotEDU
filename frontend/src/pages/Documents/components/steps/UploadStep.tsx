/**
 * 文件上传步骤组件
 */

import React from 'react';
import { Card, Upload, Spin, Alert } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';

const { Dragger } = Upload;

interface UploadStepProps {
  loading: boolean;
  error?: string;
  onFileUpload: UploadProps['customRequest'];
}

export const UploadStep: React.FC<UploadStepProps> = ({
  loading,
  error,
  onFileUpload
}) => {
  return (
    <Card title="步骤1: 文件上传" style={{ marginBottom: 24 }}>
      <Dragger
        name="file"
        multiple={false}
        accept=".pdf,.pptx,.ppt,.docx,.doc,.txt,.png,.jpg,.jpeg,.gif,.bmp"
        customRequest={onFileUpload}
        showUploadList={false}
        disabled={loading}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
        <p className="ant-upload-hint">
          支持PDF、PPTX、PPT、DOCX、DOC、TXT和图片格式，最大50MB
        </p>
      </Dragger>
      
      {loading && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Spin size="large" />
          <p>正在上传文件...</p>
        </div>
      )}
      
      {error && (
        <Alert
          type="error"
          message="上传失败"
          description={error}
          style={{ marginTop: 16 }}
        />
      )}
    </Card>
  );
};
