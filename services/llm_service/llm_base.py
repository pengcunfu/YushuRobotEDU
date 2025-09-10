from abc import ABC, abstractmethod
from typing import Dict, Any, Union, List
from .chat_message import ChatMessage


class BaseLLM(ABC):
    """LLM基础抽象类"""
    
    def __init__(self, config: Dict[str, Any]):
        """
        初始化LLM实例
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
    def chat_completion(
        self,
        messages: List[ChatMessage],
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = None,
        stream: bool = False,
        **kwargs
    ) -> Union[str, Dict[str, Any]]:
        """
        执行对话完成
        Args:
            messages: 聊天历史消息列表
            model: 模型名称
            temperature: 温度参数，控制随机性
            max_tokens: 最大生成token数
            stream: 是否流式输出
            **kwargs: 其他参数
        Returns:
            Union[str, Dict[str, Any]]: 模型回复
        """
        pass
