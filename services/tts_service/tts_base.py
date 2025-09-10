"""
TTS文本转语音服务的抽象基类
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List
from .tts_models import TTSRequest, TTSResponse


class BaseTTS(ABC):
    """TTS文本转语音基础抽象类"""
    
    def __init__(self, config: Dict[str, Any]):
        """
        初始化TTS实例
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
    def synthesize(self, request: TTSRequest) -> TTSResponse:
        """
        执行文本转语音
        Args:
            request: TTS请求参数
        Returns:
            TTSResponse: 合成结果
        """
        pass
    
    @abstractmethod
    def synthesize_text(self, 
                       text: str,
                       output_file: str = None,
                       voice: str = None,
                       speed: float = 1.0,
                       pitch: float = 1.0,
                       volume: float = 1.0,
                       language: str = 'zh',
                       audio_format: str = 'wav') -> TTSResponse:
        """
        合成文本为语音
        Args:
            text: 要合成的文本
            output_file: 输出文件路径
            voice: 发音人
            speed: 语速
            pitch: 音调
            volume: 音量
            language: 语言
            audio_format: 音频格式
        Returns:
            TTSResponse: 合成结果
        """
        pass
    
    def get_supported_voices(self) -> List[Dict[str, Any]]:
        """获取支持的发音人列表"""
        return []
    
    def get_supported_formats(self) -> List[str]:
        """获取支持的音频格式"""
        return ['wav', 'mp3']
    
    def get_supported_languages(self) -> List[str]:
        """获取支持的语言"""
        return ['zh', 'en']
