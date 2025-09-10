"""
配置管理中心的数据模型
定义各个模块的配置结构和验证规则
"""

from typing import Dict, List, Optional, Union, Any
from pydantic import BaseModel, Field, validator
from enum import Enum


class ProviderType(str, Enum):
    """服务提供商类型"""
    ALIYUN = "aliyun_open_service"
    TENCENT = "tencent_open_service"
    BAIDU = "baidu_open_service"
    XUNFEI = "xunfei_open_service"
    DOUYIN = "douyin_open_service"
    ZHIPU = "zhipu"


class AudioFormat(str, Enum):
    """音频格式"""
    WAV = "wav"
    MP3 = "mp3"
    PCM = "pcm"


class SampleRate(int, Enum):
    """采样率"""
    RATE_8K = 8000
    RATE_16K = 16000
    RATE_22K = 22050
    RATE_44K = 44100


# ===== 基础配置模型 =====

class DefaultConfig(BaseModel):
    """默认配置"""
    debug: bool = Field(default=True, description="调试模式")
    data_dir: str = Field(default="data", description="数据目录")
    temp_dir: str = Field(default="data/temp", description="临时目录")


# ===== LLM配置模型 =====

class AliyunLLMConfig(BaseModel):
    """阿里云通义千问配置"""
    api_key: str = Field(default="", description="API密钥")
    model: str = Field(default="qwen-turbo", description="默认模型")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0, description="温度参数")
    max_tokens: int = Field(default=2048, ge=1, le=8192, description="最大生成token数")


class BaiduLLMConfig(BaseModel):
    """百度文心一言配置"""
    access_token: str = Field(default="", description="访问令牌")
    model: str = Field(default="ernie-3.5", description="默认模型")
    temperature: float = Field(default=0.7, ge=0.0, le=1.0, description="温度参数")
    max_tokens: int = Field(default=2048, ge=1, le=8192, description="最大生成token数")


class DouyinLLMConfig(BaseModel):
    """抖音云雀配置"""
    api_key: str = Field(default="", description="API密钥")
    secret_key: str = Field(default="", description="密钥")
    model: str = Field(default="skylark-chat", description="默认模型")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0, description="温度参数")
    max_tokens: int = Field(default=2048, ge=1, le=8192, description="最大生成token数")
    base_url: str = Field(default="https://open.douyin.com/api/v1/llm", description="API基础URL")


class TencentLLMConfig(BaseModel):
    """腾讯混元配置"""
    secret_id: str = Field(default="", description="密钥ID")
    secret_key: str = Field(default="", description="密钥")
    app_id: str = Field(default="", description="应用ID")
    model: str = Field(default="hunyuan-lite", description="默认模型")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0, description="温度参数")
    max_tokens: int = Field(default=2048, ge=1, le=8192, description="最大生成token数")
    endpoint: str = Field(default="hunyuan.tencentcloudapi.com", description="API端点")


class XunfeiLLMConfig(BaseModel):
    """讯飞星火配置"""
    api_key: str = Field(default="", description="API密钥")
    api_secret: str = Field(default="", description="API密钥")
    app_id: str = Field(default="", description="应用ID")
    model: str = Field(default="spark-v3", description="默认模型")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0, description="温度参数")
    max_tokens: int = Field(default=4096, ge=1, le=8192, description="最大生成token数")
    domain: str = Field(default="generalv3", description="模型域名")
    gpt_url: str = Field(default="wss://spark-api.xf-yun.com/v3.1/chat", description="WebSocket URL")


class LLMConfig(BaseModel):
    """大语言模型配置"""
    enabled: bool = Field(default=True, description="是否启用LLM服务")
    default_provider: str = Field(default="aliyun", description="默认提供商")
    timeout: int = Field(default=30, ge=5, le=300, description="请求超时时间(秒)")
    max_history: int = Field(default=10, ge=1, le=50, description="最大对话历史数")
    
    # 各提供商配置
    aliyun: AliyunLLMConfig = Field(default_factory=AliyunLLMConfig, description="阿里云配置")
    baidu: BaiduLLMConfig = Field(default_factory=BaiduLLMConfig, description="百度配置")
    douyin: DouyinLLMConfig = Field(default_factory=DouyinLLMConfig, description="抖音配置")
    tencent: TencentLLMConfig = Field(default_factory=TencentLLMConfig, description="腾讯配置")
    xunfei: XunfeiLLMConfig = Field(default_factory=XunfeiLLMConfig, description="讯飞配置")


class ConnectionConfig(BaseModel):
    """连接配置"""
    ip: str = Field(default="192.168.123.161", description="IP地址")
    port: int = Field(default=8080, ge=1, le=65535, description="端口")


class MovementConfig(BaseModel):
    """机器人移动配置"""
    forward_speed: float = Field(default=0.2, ge=0, le=2.0, description="前进速度")
    backward_speed: float = Field(default=-0.2, ge=-2.0, le=0, description="后退速度")
    turn_speed: float = Field(default=1.0, ge=0, le=5.0, description="转向速度")
    action_duration: float = Field(default=1.0, ge=0.1, le=10.0, description="动作持续时间（秒）")


class RobotConfig(BaseModel):
    """机器人配置"""
    available: bool = Field(default=False, description="是否启用机器人功能")
    connection: ConnectionConfig = Field(default_factory=ConnectionConfig)
    network_interface: str = Field(default="eth0", description="网络接口")
    movement: MovementConfig = Field(default_factory=MovementConfig)


# ===== LLM服务配置模型 =====

class XunfeiLLMConfig(BaseModel):
    """讯飞LLM配置"""
    app_id: str = Field(default="", description="应用ID")
    api_key: str = Field(default="", description="API密钥")
    api_secret: str = Field(default="", description="API密钥")
    domain: str = Field(default="generalv3", description="模型版本")
    temperature: float = Field(default=0.5, ge=0, le=1.0, description="创造性参数")


class ZhipuLLMConfig(BaseModel):
    """智谱AI配置"""
    api_key: str = Field(default="", description="API密钥")
    model: str = Field(default="chatglm_turbo", description="模型名称")
    temperature: float = Field(default=0.7, ge=0, le=1.0, description="创造性参数")
    top_p: float = Field(default=0.7, ge=0, le=1.0, description="核采样参数")


class BaiduLLMConfig(BaseModel):
    """百度文心一言配置"""
    app_id: str = Field(default="", description="应用ID")
    api_key: str = Field(default="", description="API密钥")
    secret_key: str = Field(default="", description="密钥")
    model: str = Field(default="ernie_bot_turbo", description="模型名称")
    temperature: float = Field(default=0.8, ge=0, le=1.0, description="创造性参数")
    top_p: float = Field(default=0.8, ge=0, le=1.0, description="核采样参数")


class TencentLLMConfig(BaseModel):
    """腾讯云LLM配置"""
    secret_id: str = Field(default="", description="密钥ID")
    secret_key: str = Field(default="", description="密钥")
    app_id: str = Field(default="", description="应用ID")
    model: str = Field(default="hunyuan", description="模型名称")
    temperature: float = Field(default=0.7, ge=0, le=1.0, description="创造性参数")


class DouyinLLMConfig(BaseModel):
    """抖音LLM配置"""
    api_key: str = Field(default="", description="API密钥")
    api_secret: str = Field(default="", description="API密钥")
    model: str = Field(default="doubao", description="模型名称")
    temperature: float = Field(default=0.7, ge=0, le=1.0, description="创造性参数")


class LLMConfig(BaseModel):
    """LLM服务配置"""
    provider: ProviderType = Field(default=ProviderType.XUNFEI, description="当前使用的LLM服务提供商")
    xunfei: XunfeiLLMConfig = Field(default_factory=XunfeiLLMConfig)
    zhipu: ZhipuLLMConfig = Field(default_factory=ZhipuLLMConfig)
    baidu: BaiduLLMConfig = Field(default_factory=BaiduLLMConfig)
    tencent: TencentLLMConfig = Field(default_factory=TencentLLMConfig)
    douyin: DouyinLLMConfig = Field(default_factory=DouyinLLMConfig)


# ===== ASR服务配置模型 =====

class XunfeiASRConfig(BaseModel):
    """讯飞ASR配置"""
    app_id: str = Field(default="", description="应用ID")
    api_key: str = Field(default="", description="API密钥")
    api_secret: str = Field(default="", description="API密钥")
    format: AudioFormat = Field(default=AudioFormat.WAV, description="音频格式")
    rate: SampleRate = Field(default=SampleRate.RATE_16K, description="采样率")


class AliyunASRConfig(BaseModel):
    """阿里云ASR配置"""
    access_key_id: str = Field(default="", description="访问密钥ID")
    access_key_secret: str = Field(default="", description="访问密钥")
    region_id: str = Field(default="", description="区域ID")
    sample_rate: SampleRate = Field(default=SampleRate.RATE_16K, description="采样率")
    format: AudioFormat = Field(default=AudioFormat.WAV, description="音频格式")


class TencentASRConfig(BaseModel):
    """腾讯云ASR配置"""
    secret_id: str = Field(default="", description="密钥ID")
    secret_key: str = Field(default="", description="密钥")
    region: str = Field(default="ap-shanghai", description="区域")
    engine_type: str = Field(default="16k_zh", description="引擎类型")
    channel_num: int = Field(default=1, description="声道数")
    res_type: int = Field(default=0, description="返回类型")


class BaiduASRConfig(BaseModel):
    """百度ASR配置"""
    app_id: str = Field(default="", description="应用ID")
    api_key: str = Field(default="", description="API密钥")
    secret_key: str = Field(default="", description="密钥")
    dev_pid: int = Field(default=1537, description="语言模型")
    format: AudioFormat = Field(default=AudioFormat.WAV, description="音频格式")
    rate: SampleRate = Field(default=SampleRate.RATE_16K, description="采样率")


class DouyinASRConfig(BaseModel):
    """抖音ASR配置"""
    api_key: str = Field(default="", description="API密钥")
    api_secret: str = Field(default="", description="API密钥")
    format: AudioFormat = Field(default=AudioFormat.WAV, description="音频格式")
    rate: SampleRate = Field(default=SampleRate.RATE_16K, description="采样率")


class ASRConfig(BaseModel):
    """ASR服务配置"""
    provider: ProviderType = Field(default=ProviderType.BAIDU, description="当前使用的ASR服务提供商")
    xunfei: XunfeiASRConfig = Field(default_factory=XunfeiASRConfig)
    aliyun: AliyunASRConfig = Field(default_factory=AliyunASRConfig)
    tencent: TencentASRConfig = Field(default_factory=TencentASRConfig)
    baidu: BaiduASRConfig = Field(default_factory=BaiduASRConfig)
    douyin: DouyinASRConfig = Field(default_factory=DouyinASRConfig)


# ===== TTS服务配置模型 =====

class XunfeiTTSConfig(BaseModel):
    """讯飞TTS配置"""
    app_id: str = Field(default="", description="应用ID")
    api_key: str = Field(default="", description="API密钥")
    api_secret: str = Field(default="", description="API密钥")
    voice: str = Field(default="xiaoyan", description="音色")
    speed: int = Field(default=50, ge=0, le=100, description="语速")
    volume: int = Field(default=50, ge=0, le=100, description="音量")
    pitch: int = Field(default=50, ge=0, le=100, description="音调")
    aue: str = Field(default="lame", description="音频编码")


class AliyunTTSConfig(BaseModel):
    """阿里云TTS配置"""
    access_key_id: str = Field(default="", description="访问密钥ID")
    access_key_secret: str = Field(default="", description="访问密钥")
    region_id: str = Field(default="cn-shanghai", description="区域ID")
    voice: str = Field(default="xiaoyun", description="音色")
    volume: int = Field(default=50, ge=0, le=100, description="音量")
    speech_rate: int = Field(default=0, ge=-500, le=500, description="语速")
    pitch_rate: int = Field(default=0, ge=-500, le=500, description="音调")


class TencentTTSConfig(BaseModel):
    """腾讯云TTS配置"""
    secret_id: str = Field(default="", description="密钥ID")
    secret_key: str = Field(default="", description="密钥")
    region: str = Field(default="ap-shanghai", description="区域")
    voice_type: int = Field(default=1001, description="音色类型")
    volume: int = Field(default=5, ge=0, le=10, description="音量")
    speed: float = Field(default=1.0, ge=0.5, le=2.0, description="语速")
    model_type: int = Field(default=1, description="模型类型")


class BaiduTTSConfig(BaseModel):
    """百度TTS配置"""
    app_id: str = Field(default="", description="应用ID")
    api_key: str = Field(default="", description="API密钥")
    secret_key: str = Field(default="", description="密钥")
    voice: str = Field(default="zh", description="音色")
    speed: int = Field(default=5, ge=0, le=15, description="语速")
    pitch: int = Field(default=5, ge=0, le=15, description="音调")
    volume: int = Field(default=5, ge=0, le=15, description="音量")
    per: int = Field(default=0, description="发音人")


class DouyinTTSConfig(BaseModel):
    """抖音TTS配置"""
    api_key: str = Field(default="", description="API密钥")
    api_secret: str = Field(default="", description="API密钥")
    voice: str = Field(default="volcano_streaming_chinese_male", description="音色")
    volume: int = Field(default=50, ge=0, le=100, description="音量")
    speed: float = Field(default=1.0, ge=0.5, le=2.0, description="语速")
    pitch: float = Field(default=1.0, ge=0.5, le=2.0, description="音调")


class TTSConfig(BaseModel):
    """TTS服务配置"""
    provider: ProviderType = Field(default=ProviderType.BAIDU, description="当前使用的TTS服务提供商")
    speed: float = Field(default=1.0, ge=0.5, le=2.0, description="默认语速")
    volume: int = Field(default=50, ge=0, le=100, description="默认音量")
    pitch: float = Field(default=1.0, ge=0.5, le=2.0, description="默认音调")
    format: AudioFormat = Field(default=AudioFormat.WAV, description="音频格式")
    sample_rate: SampleRate = Field(default=SampleRate.RATE_16K, description="采样率")
    streaming: bool = Field(default=False, description="是否启用流式合成")
    xunfei: XunfeiTTSConfig = Field(default_factory=XunfeiTTSConfig)
    aliyun: AliyunTTSConfig = Field(default_factory=AliyunTTSConfig)
    tencent: TencentTTSConfig = Field(default_factory=TencentTTSConfig)
    baidu: BaiduTTSConfig = Field(default_factory=BaiduTTSConfig)
    douyin: DouyinTTSConfig = Field(default_factory=DouyinTTSConfig)


# ===== PPT处理服务配置模型 =====

class PPTToImageConfig(BaseModel):
    """PPT转图片服务配置"""
    enabled: bool = Field(default=True, description="是否启用PPT转图片服务")
    service_url: str = Field(default="http://localhost:8020", description="PPT转图片服务URL")
    callback_url: str = Field(default="", description="回调通知URL（系统自动设置）")
    upload_timeout: int = Field(default=60, ge=10, le=300, description="上传超时时间(秒)")
    max_file_size: int = Field(default=100, ge=1, le=500, description="最大文件大小(MB)")
    image_width: int = Field(default=1920, ge=800, le=4096, description="生成图片宽度")
    image_height: int = Field(default=1080, ge=600, le=3072, description="生成图片高度")
    retry_attempts: int = Field(default=3, ge=1, le=10, description="失败重试次数")
    retry_delay: int = Field(default=5, ge=1, le=60, description="重试延迟(秒)")


# ===== 数据库配置模型 =====

class MongoDBConfig(BaseModel):
    """MongoDB配置"""
    enabled: bool = Field(default=True, description="是否启用MongoDB")
    url: str = Field(default="mongodb://localhost:27017", description="连接URL")
    database: str = Field(default="yushu_documents", description="数据库名称")
    username: str = Field(default="", description="用户名（可选）")
    password: str = Field(default="", description="密码（可选）")
    timeout: int = Field(default=10, ge=1, le=60, description="连接超时（秒）")


class RedisConfig(BaseModel):
    """Redis配置"""
    enabled: bool = Field(default=False, description="是否启用Redis")
    host: str = Field(default="localhost", description="连接地址")
    port: int = Field(default=6379, ge=1, le=65535, description="端口")
    password: str = Field(default="", description="密码（可选）")
    db: int = Field(default=0, ge=0, le=15, description="数据库索引")


class MySQLConfig(BaseModel):
    """MySQL配置"""
    enabled: bool = Field(default=False, description="是否启用MySQL")
    host: str = Field(default="localhost", description="连接地址")
    port: int = Field(default=3306, ge=1, le=65535, description="端口")
    database: str = Field(default="yushu_app", description="数据库名")
    username: str = Field(default="root", description="用户名")
    password: str = Field(default="", description="密码")


class PostgreSQLConfig(BaseModel):
    """PostgreSQL配置"""
    enabled: bool = Field(default=False, description="是否启用PostgreSQL")
    host: str = Field(default="localhost", description="连接地址")
    port: int = Field(default=5432, ge=1, le=65535, description="端口")
    database: str = Field(default="yushu_app", description="数据库名")
    username: str = Field(default="postgres", description="用户名")
    password: str = Field(default="", description="密码")


class DatabaseConfig(BaseModel):
    """数据库配置"""
    mongodb: MongoDBConfig = Field(default_factory=MongoDBConfig)
    redis: RedisConfig = Field(default_factory=RedisConfig)
    mysql: MySQLConfig = Field(default_factory=MySQLConfig)
    postgresql: PostgreSQLConfig = Field(default_factory=PostgreSQLConfig)


# ===== 完整配置模型 =====

class ConfigModule(BaseModel):
    """配置模块定义"""
    name: str = Field(description="模块名称")
    title: str = Field(description="模块显示标题")
    description: str = Field(description="模块描述")
    category: str = Field(description="模块分类")
    icon: str = Field(description="模块图标")
    enabled: bool = Field(default=True, description="是否启用")
    config_class: str = Field(description="配置类名")


# 配置模块注册表
CONFIG_MODULES = {
    "default": ConfigModule(
        name="default",
        title="基础配置",
        description="系统基础设置，包括调试模式、数据目录等",
        category="系统",
        icon="SettingOutlined",
        config_class="DefaultConfig"
    ),
    "robot": ConfigModule(
        name="robot",
        title="机器人配置",
        description="机器人连接、移动参数等硬件相关配置",
        category="硬件",
        icon="RobotOutlined",
        config_class="RobotConfig"
    ),
    "llm": ConfigModule(
        name="llm",
        title="大语言模型",
        description="LLM服务配置，支持多种AI服务提供商",
        category="AI服务",
        icon="BrainOutlined",
        config_class="LLMConfig"
    ),
    "asr": ConfigModule(
        name="asr",
        title="语音识别",
        description="ASR语音识别服务配置",
        category="AI服务",
        icon="AudioOutlined",
        config_class="ASRConfig"
    ),
    "tts": ConfigModule(
        name="tts",
        title="语音合成",
        description="TTS语音合成服务配置",
        category="AI服务",
        icon="SoundOutlined",
        config_class="TTSConfig"
    ),
    "database": ConfigModule(
        name="database",
        title="数据库配置",
        description="MongoDB、Redis、MySQL、PostgreSQL等数据库连接配置",
        category="系统",
        icon="DatabaseOutlined",
        config_class="DatabaseConfig"
    ),
    "ppt_service": ConfigModule(
        name="ppt_service",
        title="PPT处理服务",
        description="PPT转图片服务配置，用于PPT预览功能",
        category="AI服务",
        icon="FileImageOutlined",
        config_class="PPTToImageConfig"
    ),
}

# 配置类映射
CONFIG_CLASSES = {
    "DefaultConfig": DefaultConfig,
    "RobotConfig": RobotConfig,
    "LLMConfig": LLMConfig,
    "ASRConfig": ASRConfig,
    "TTSConfig": TTSConfig,
    "DatabaseConfig": DatabaseConfig,
    "PPTToImageConfig": PPTToImageConfig,
}
