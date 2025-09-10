"""
TTS文本转语音服务的数据模型
"""
import time
from typing import Any, Optional, Dict
from enum import Enum


class Platform(Enum):
    """支持的TTS平台枚举"""
    BAIDU = "baidu"
    ALIYUN = "aliyun"
    TENCENT = "tencent"
    XUNFEI = "xunfei"
    DOUYIN = "douyin"


class TTSRequest:
    """
    通用TTS请求参数类，适用于各TTS平台
    """

    def __init__(self,
                 text: str,
                 output_file: str = None,
                 voice: str = None,
                 speed: float = 1.0,
                 pitch: float = 1.0,
                 volume: float = 1.0,
                 language: str = 'zh',
                 audio_format: str = 'wav',
                 sample_rate: int = 16000,
                 extra: dict = None):
        """
        初始化TTS请求参数
        Args:
            text: 要合成的文本
            output_file: 输出音频文件路径
            voice: 发音人/音色
            speed: 语速 (0.5-2.0)
            pitch: 音调 (0.5-2.0)
            volume: 音量 (0.5-2.0)
            language: 语言（如'zh'、'en'等）
            audio_format: 音频格式
            sample_rate: 采样率
            extra: 其他平台特定参数（字典）
        """
        self.text = text
        self.output_file = output_file
        self.voice = voice
        self.speed = speed
        self.pitch = pitch
        self.volume = volume
        self.language = language
        self.audio_format = audio_format
        self.sample_rate = sample_rate
        self.extra = extra or {}

    def to_dict(self) -> Dict[str, Any]:
        """转为字典，便于平台适配"""
        return {
            'text': self.text,
            'output_file': self.output_file,
            'voice': self.voice,
            'speed': self.speed,
            'pitch': self.pitch,
            'volume': self.volume,
            'language': self.language,
            'audio_format': self.audio_format,
            'sample_rate': self.sample_rate,
            **self.extra
        }


class TTSResponse:
    """
    通用TTS响应类，封装文本转语音的结果
    """

    def __init__(self,
                 text: str = "",
                 audio_file: str = "",
                 audio_data: bytes = None,
                 success: bool = False,
                 error_msg: str = "",
                 duration: float = 0.0,
                 audio_length: float = 0.0,
                 file_size: int = 0,
                 extra_info: Optional[Any] = None):
        """
        初始化文本转语音结果
        Args:
            text: 原始文本
            audio_file: 生成的音频文件路径
            audio_data: 音频二进制数据
            success: 是否成功
            error_msg: 错误信息
            duration: 处理耗时（秒）
            audio_length: 音频时长（秒）
            file_size: 文件大小（字节）
            extra_info: 平台返回的原始数据或附加信息
        """
        self.text = text
        self.audio_file = audio_file
        self.audio_data = audio_data
        self.success = success
        self.error_msg = error_msg
        self.duration = duration
        self.audio_length = audio_length
        self.file_size = file_size
        self.timestamp = time.time()
        self.extra_info = extra_info

    def to_dict(self) -> Dict[str, Any]:
        """转为字典格式"""
        return {
            'text': self.text,
            'audio_file': self.audio_file,
            'success': self.success,
            'error_msg': self.error_msg,
            'duration': self.duration,
            'audio_length': self.audio_length,
            'file_size': self.file_size,
            'timestamp': self.timestamp,
            'extra_info': self.extra_info
        }

    def __str__(self) -> str:
        if self.success:
            return f"TTS成功: '{self.text}' -> {self.audio_file} (时长: {self.audio_length:.2f}s, 耗时: {self.duration:.2f}s)"
        else:
            return f"TTS失败: {self.error_msg} (耗时: {self.duration:.2f}s)"
