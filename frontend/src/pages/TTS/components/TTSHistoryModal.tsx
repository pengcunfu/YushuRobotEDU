import React, { useState } from 'react';
import {
  Modal,
  Table,
  Button,
  Space,
  Tag,
  Tooltip,
  Typography,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  Card,
  Statistic,
  Progress
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  DownloadOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  SoundOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface TTSHistoryRecord {
  id: string;
  text: string;
  provider: string;
  voice: string;
  language: string;
  speed: number;
  pitch: number;
  duration: number;
  fileSize: number;
  status: 'completed' | 'processing' | 'failed';
  createdAt: string;
  audioUrl?: string;
}

interface TTSHistoryModalProps {
  visible: boolean;
  onClose: () => void;
}

export const TTSHistoryModal: React.FC<TTSHistoryModalProps> = ({
  visible,
  onClose
}) => {
  const [loading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [currentAudio, setCurrentAudio] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // 模拟历史记录数据
  const [historyData] = useState<TTSHistoryRecord[]>([
    {
      id: '1',
      text: '欢迎使用语音合成功能，这是一个测试文本。',
      provider: 'douyin',
      voice: '晓晓',
      language: 'zh',
      speed: 1.0,
      pitch: 1.0,
      duration: 3.2,
      fileSize: 51200,
      status: 'completed',
      createdAt: '2024-01-20 14:30:25',
      audioUrl: '/api/tts/audio/1.wav'
    },
    {
      id: '2',
      text: '人工智能技术正在快速发展，为我们的生活带来了许多便利。',
      provider: 'baidu',
      voice: '度小宇',
      language: 'zh',
      speed: 0.8,
      pitch: 1.2,
      duration: 5.8,
      fileSize: 92800,
      status: 'completed',
      createdAt: '2024-01-20 13:15:10',
      audioUrl: '/api/tts/audio/2.wav'
    },
    {
      id: '3',
      text: '正在处理中的语音合成任务...',
      provider: 'aliyun',
      voice: '思佳',
      language: 'zh',
      speed: 1.2,
      pitch: 0.9,
      duration: 0,
      fileSize: 0,
      status: 'processing',
      createdAt: '2024-01-20 15:45:00'
    },
    {
      id: '4',
      text: '合成失败的文本示例',
      provider: 'xunfei',
      voice: '小燕',
      language: 'zh',
      speed: 1.0,
      pitch: 1.0,
      duration: 0,
      fileSize: 0,
      status: 'failed',
      createdAt: '2024-01-20 12:20:15'
    }
  ]);

  const handlePlay = (record: TTSHistoryRecord) => {
    if (currentAudio === record.id && isPlaying) {
      setIsPlaying(false);
      setCurrentAudio(null);
    } else {
      setCurrentAudio(record.id);
      setIsPlaying(true);
      // 这里可以添加实际的音频播放逻辑
      console.log('Playing audio:', record.audioUrl);
    }
  };

  const handleDownload = (record: TTSHistoryRecord) => {
    console.log('Downloading:', record.audioUrl);
    // 这里可以添加实际的下载逻辑
  };

  const handleDelete = (record: TTSHistoryRecord) => {
    console.log('Deleting:', record.id);
    // 这里可以添加删除逻辑
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'green';
      case 'processing':
        return 'blue';
      case 'failed':
        return 'red';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'processing':
        return '处理中';
      case 'failed':
        return '失败';
      default:
        return '未知';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '-';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '-';
    return `${seconds.toFixed(1)}s`;
  };

  const columns: ColumnsType<TTSHistoryRecord> = [
    {
      title: '文本内容',
      dataIndex: 'text',
      key: 'text',
      width: 300,
      render: (text: string) => (
        <Tooltip title={text}>
          <Text ellipsis style={{ maxWidth: 280 }}>
            {text}
          </Text>
        </Tooltip>
      )
    },
    {
      title: '提供商',
      dataIndex: 'provider',
      key: 'provider',
      width: 100,
      render: (provider: string) => (
        <Tag color="blue">{provider}</Tag>
      )
    },
    {
      title: '音色',
      dataIndex: 'voice',
      key: 'voice',
      width: 80
    },
    {
      title: '参数',
      key: 'params',
      width: 120,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            速度: {record.speed}x
          </Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            音调: {record.pitch}x
          </Text>
        </Space>
      )
    },
    {
      title: '时长',
      dataIndex: 'duration',
      key: 'duration',
      width: 80,
      render: formatDuration
    },
    {
      title: '文件大小',
      dataIndex: 'fileSize',
      key: 'fileSize',
      width: 100,
      render: formatFileSize
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (time: string) => (
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {time}
        </Text>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {record.status === 'completed' && (
            <>
              <Tooltip title={currentAudio === record.id && isPlaying ? '暂停' : '播放'}>
                <Button
                  type="text"
                  size="small"
                  icon={currentAudio === record.id && isPlaying ? 
                    <PauseCircleOutlined /> : 
                    <PlayCircleOutlined />
                  }
                  onClick={() => handlePlay(record)}
                />
              </Tooltip>
              <Tooltip title="下载">
                <Button
                  type="text"
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={() => handleDownload(record)}
                />
              </Tooltip>
            </>
          )}
          {record.status === 'processing' && (
            <Progress
              type="circle"
              size={20}
              percent={65}
              showInfo={false}
              strokeColor="#1890ff"
            />
          )}
          <Tooltip title="删除">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  // 过滤数据
  const filteredData = historyData.filter(record => {
    const matchText = !searchText || record.text.toLowerCase().includes(searchText.toLowerCase());
    const matchProvider = !selectedProvider || record.provider === selectedProvider;
    const matchStatus = !selectedStatus || record.status === selectedStatus;
    
    let matchDate = true;
    if (dateRange) {
      const recordDate = dayjs(record.createdAt);
      matchDate = recordDate.isAfter(dateRange[0]) && recordDate.isBefore(dateRange[1]);
    }
    
    return matchText && matchProvider && matchStatus && matchDate;
  });

  // 统计数据
  const totalRecords = historyData.length;
  const completedRecords = historyData.filter(r => r.status === 'completed').length;
  const processingRecords = historyData.filter(r => r.status === 'processing').length;
  const failedRecords = historyData.filter(r => r.status === 'failed').length;

  return (
    <Modal
      title={
        <Space>
          <SoundOutlined />
          <span>TTS合成历史</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1200}
      style={{ top: 20 }}
    >
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="总记录"
              value={totalRecords}
              prefix={<SoundOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="已完成"
              value={completedRecords}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="处理中"
              value={processingRecords}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="失败"
              value={failedRecords}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选区域 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Input
              placeholder="搜索文本内容"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="提供商"
              value={selectedProvider}
              onChange={setSelectedProvider}
              allowClear
              style={{ width: '100%' }}
            >
              <Option value="douyin">抖音</Option>
              <Option value="baidu">百度</Option>
              <Option value="aliyun">阿里云</Option>
              <Option value="xunfei">讯飞</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="状态"
              value={selectedStatus}
              onChange={setSelectedStatus}
              allowClear
              style={{ width: '100%' }}
            >
              <Option value="completed">已完成</Option>
              <Option value="processing">处理中</Option>
              <Option value="failed">失败</Option>
            </Select>
          </Col>
          <Col span={6}>
            <RangePicker
              placeholder={['开始日期', '结束日期']}
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={4}>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  setSearchText('');
                  setSelectedProvider('');
                  setSelectedStatus('');
                  setDateRange(null);
                }}
              >
                重置
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 表格 */}
      <Table
        columns={columns}
        dataSource={filteredData}
        rowKey="id"
        size="small"
        loading={loading}
        pagination={{
          total: filteredData.length,
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`
        }}
        scroll={{ x: 1000, y: 400 }}
      />
    </Modal>
  );
};
