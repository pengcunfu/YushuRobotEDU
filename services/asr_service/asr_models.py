"""
ASR语音识别服务的数据模型
"""
import time
from typing import Any, Optional, Dict
from enum import Enum


class Platform(Enum):
    """支持的ASR平台枚举"""
    BAIDU = "baidu"
    ALIYUN = "aliyun" 
    TENCENT = "tencent"
    XUNFEI = "xunfei"
    DOUYIN = "douyin"


class ASRRequest:
    """
    通用ASR请求参数类，适用于各ASR平台
    """

    def __init__(self,
                 audio_file: str,
                 audio_format: str = None,
                 sample_rate: int = 16000,
                 language: str = 'zh',
                 extra: dict = None):
        """
        初始化ASR请求参数
        Args:
            audio_file: 音频文件路径
            audio_format: 音频格式（如pcm、wav、mp3等）
            sample_rate: 采样率
            language: 语言（如'zh'、'en'等）
            extra: 其他平台特定参数（字典）
        """
        self.audio_file = audio_file
        self.audio_format = audio_format
        self.sample_rate = sample_rate
        self.language = language
        self.extra = extra or {}

    def to_dict(self) -> Dict[str, Any]:
        """转为字典，便于平台适配"""
        return {
            'audio_file': self.audio_file,
            'audio_format': self.audio_format,
            'sample_rate': self.sample_rate,
            'language': self.language,
            **self.extra
        }


class ASRResponse:
    """
    通用ASR响应类，封装语音识别的结果
    """

    def __init__(self,
                 text: str = "",
                 success: bool = False,
                 error_msg: str = "",
                 duration: float = 0.0,
                 file_path: str = "",
                 confidence: float = 0.0,
                 extra_info: Optional[Any] = None):
        """
        初始化语音识别结果
        Args:
            text: 识别出的文本
            success: 是否成功
            error_msg: 错误信息
            duration: 处理耗时（秒）
            file_path: 音频文件路径（可选）
            confidence: 识别置信度
            extra_info: 平台返回的原始数据或附加信息
        """
        self.text = text
        self.success = success
        self.error_msg = error_msg
        self.duration = duration
        self.file_path = file_path
        self.confidence = confidence
        self.timestamp = time.time()
        self.extra_info = extra_info

    def to_dict(self) -> Dict[str, Any]:
        """转为字典格式"""
        return {
            'text': self.text,
            'success': self.success,
            'error_msg': self.error_msg,
            'duration': self.duration,
            'file_path': self.file_path,
            'confidence': self.confidence,
            'timestamp': self.timestamp,
            'extra_info': self.extra_info
        }

    def __str__(self) -> str:
        if self.success:
            return f"ASR成功: '{self.text}' (置信度: {self.confidence:.2f}, 耗时: {self.duration:.2f}秒)"
        else:
            return f"ASR失败: {self.error_msg} (耗时: {self.duration:.2f}秒)"
