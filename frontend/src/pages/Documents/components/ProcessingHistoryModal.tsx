/**
 * 处理记录历史模态框组件
 * 显示文档处理的历史记录和统计信息
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Table,
  Statistic,
  Row,
  Col,
  Button,
  Tag,
  Badge,
  Tooltip,
  Typography,
  Space,
  App
} from 'antd';
import {
  FileTextOutlined,
  RobotOutlined,
  SoundOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { documentService } from '@/services/documentService';

const { Text } = Typography;

interface ProcessingHistoryModalProps {
  visible: boolean;
  onCancel: () => void;
}

export const ProcessingHistoryModal: React.FC<ProcessingHistoryModalProps> = ({
  visible,
  onCancel
}) => {
  const { message } = App.useApp();

  // 状态管理
  const [processingRecords, setProcessingRecords] = useState<any[]>([]);
  const [statisticsData, setStatisticsData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  // 获取处理记录
  const loadProcessingRecords = useCallback(async () => {
    setLoading(true);
    try {
      const [recordsResponse, statsResponse] = await Promise.all([
        documentService.getProcessingRecords(50, 0), // 获取更多记录用于历史查看
        documentService.getStatistics()
      ]);

      console.log('Records response:', recordsResponse);
      console.log('Stats response:', statsResponse);

      if (recordsResponse && recordsResponse.success) {
        setProcessingRecords(recordsResponse.records || []);
      } else {
        console.warn('Records response invalid:', recordsResponse);
        setProcessingRecords([]);
      }

      if (statsResponse && statsResponse.success) {
        setStatisticsData(statsResponse.statistics || {});
      } else {
        console.warn('Stats response invalid:', statsResponse);
        setStatisticsData({
          total_documents: 0,
          total_records: 0,
          recent_24h: 0,
          success_rate: 0,
          document_types: {},
          processing_status: {}
        });
      }
    } catch (error) {
      console.error('获取处理记录失败:', error);
      message.error('获取处理记录失败');
      // 设置默认值
      setProcessingRecords([]);
      setStatisticsData({
        total_documents: 0,
        total_records: 0,
        recent_24h: 0,
        success_rate: 0,
        document_types: {},
        processing_status: {}
      });
    } finally {
      setLoading(false);
    }
  }, [message]);

  // 当模态框打开时加载数据
  useEffect(() => {
    if (visible) {
      loadProcessingRecords();
    }
  }, [visible, loadProcessingRecords]);

  // 表格列定义
  const columns = [
    {
      title: '时间',
      dataIndex: 'created_time',
      key: 'created_time',
      width: 180,
      render: (text: string) => {
        const date = new Date(text);
        return (
          <Tooltip title={date.toLocaleString()}>
            {date.toLocaleDateString()} {date.toLocaleTimeString()}
          </Tooltip>
        );
      }
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => {
        const typeMap = {
          'upload': '文件上传',
          'parse': '内容解析',
          'ai_generation': 'AI生成',
          'tts_synthesis': 'TTS合成'
        };
        const colorMap = {
          'upload': 'blue',
          'parse': 'green',
          'ai_generation': 'orange',
          'tts_synthesis': 'purple'
        };
        return (
          <Tag color={colorMap[type as keyof typeof colorMap]}>
            {typeMap[type as keyof typeof typeMap] || type}
          </Tag>
        );
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusConfig = {
          'completed': { text: '成功', status: 'success' },
          'failed': { text: '失败', status: 'error' },
          'partial': { text: '部分成功', status: 'warning' },
          'processing': { text: '处理中', status: 'processing' }
        };
        const config = statusConfig[status as keyof typeof statusConfig] || 
                     { text: status, status: 'default' };
        return <Badge status={config.status as any} text={config.text} />;
      }
    },
    {
      title: '文件名',
      dataIndex: 'original_filename',
      key: 'original_filename',
      width: 200,
      render: (filename: string) => (
        <Tooltip title={filename}>
          <Text ellipsis style={{ maxWidth: 180 }}>
            {filename || '-'}
          </Text>
        </Tooltip>
      )
    },
    {
      title: '详情',
      dataIndex: 'details',
      key: 'details',
      render: (details: any) => (
        <Tooltip
          title={
            <pre style={{ maxHeight: 200, overflow: 'auto' }}>
              {JSON.stringify(details, null, 2)}
            </pre>
          }
        >
          <Button size="small" type="link">
            查看详情
          </Button>
        </Tooltip>
      )
    }
  ];

  return (
    <Modal
      title={
        <Space>
          <span>处理记录历史</span>
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={loadProcessingRecords}
            loading={loading}
          >
            刷新
          </Button>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={1200}
      footer={[
        <Button key="close" onClick={onCancel}>
          关闭
        </Button>
      ]}
    >
      {/* 统计信息 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Statistic
            title="总文档数"
            value={statisticsData.total_documents || 0}
            prefix={<FileTextOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="总处理记录"
            value={statisticsData.total_records || 0}
            prefix={<RobotOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="今日处理"
            value={statisticsData.recent_24h || 0}
            prefix={<SoundOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="成功率"
            value={statisticsData.success_rate || 0}
            suffix="%"
            precision={1}
          />
        </Col>
      </Row>

      {/* 处理记录表格 */}
      <Table
        dataSource={processingRecords}
        loading={loading}
        rowKey="id"
        pagination={{ 
          pageSize: 20, 
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`
        }}
        scroll={{ x: 'max-content' }}
        columns={columns}
        size="small"
      />
    </Modal>
  );
};
