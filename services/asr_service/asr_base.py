"""
ASR语音识别服务的抽象基类
"""
from abc import ABC, abstractmethod
from typing import Dict, Any
from .asr_models import ASRRequest, ASRResponse


class BaseASR(ABC):
    """ASR语音识别基础抽象类"""
    
    def __init__(self, config: Dict[str, Any]):
        """
        初始化ASR实例
        Args:
            config: 配置信息
        """
        self.config = config
        self._validate_config()
        self._init_client()
    
    @abstractmethod
    def _validate_config(self) -> None:
        """验证配置信息"""
        pass
    
    @abstractmethod
    def _init_client(self) -> None:
        """初始化客户端"""
        pass
    
    @abstractmethod
    def recognize(self, request: ASRRequest) -> ASRResponse:
        """
        执行语音识别
        Args:
            request: ASR请求参数
        Returns:
            ASRResponse: 识别结果
        """
        pass
    
    @abstractmethod
    def recognize_file(self, 
                      audio_file: str, 
                      audio_format: str = 'wav',
                      sample_rate: int = 16000,
                      language: str = 'zh') -> ASRResponse:
        """
        识别音频文件
        Args:
            audio_file: 音频文件路径
            audio_format: 音频格式
            sample_rate: 采样率
            language: 语言
        Returns:
            ASRResponse: 识别结果
        """
        pass
    
    def get_supported_formats(self) -> list:
        """获取支持的音频格式"""
        return ['wav', 'mp3', 'pcm', 'm4a']
    
    def get_supported_languages(self) -> list:
        """获取支持的语言"""
        return ['zh', 'en']
