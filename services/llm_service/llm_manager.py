from typing import Dict, Any, List, Optional
import logging
from .chat_message import ChatMessage
from .aliyun_llm import AliyunLLM
from .baidu_llm import BaiduLLM
from .douyin_llm import DouyinLLM
from .tencent_llm import TencentLLM
from .xunfei_llm import XunfeiLLM

logger = logging.getLogger(__name__)


class LLMManager:
    """LLM管理器，负责管理所有LLM实例"""
    
    def __init__(self):
        self.llm_instances: Dict[str, Any] = {}
        self.llm_classes = {
            'aliyun': AliyunLLM,
            'baidu': BaiduLLM,
            'douyin': DouyinLLM,
            'tencent': TencentLLM,
            'xunfei': XunfeiLLM
        }
    
    def initialize_llms(self, config: Dict[str, Any]) -> None:
        """
        根据配置初始化LLM实例
        Args:
            config: LLM配置字典
        """
        self.llm_instances.clear()
        
        for provider, provider_config in config.items():
            if provider in self.llm_classes and self._is_config_valid(provider_config):
                try:
                    self.llm_instances[provider] = self.llm_classes[provider](provider_config)
                    logger.info(f"成功初始化 {provider} LLM")
                except Exception as e:
                    logger.error(f"初始化 {provider} LLM 失败: {e}")
    
    def _is_config_valid(self, config: Dict[str, Any]) -> bool:
        """
        检查配置是否有效
        Args:
            config: 配置字典
        Returns:
            bool: 配置是否有效
        """
        if not config or not isinstance(config, dict):
            return False
        
        # 检查是否有非空的配置值
        return any(value for value in config.values() if value)
    
    def get_available_providers(self) -> List[str]:
        """
        获取可用的LLM提供商列表
        Returns:
            List[str]: 可用提供商列表
        """
        return list(self.llm_instances.keys())
    
    def chat(
        self, 
        provider: str, 
        message: str, 
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        执行聊天对话
        Args:
            provider: LLM提供商
            message: 用户消息
            model: 模型名称
            temperature: 温度参数
            max_tokens: 最大token数
            **kwargs: 其他参数
        Returns:
            Dict[str, Any]: 聊天结果
        """
        if provider not in self.llm_instances:
            return {
                'success': False,
                'error': f'提供商 {provider} 未配置或不可用'
            }
        
        try:
            # 创建消息对象
            messages = [ChatMessage(role="user", content=message)]
            
            # 调用LLM
            llm_instance = self.llm_instances[provider]
            response = llm_instance.chat_completion(
                messages=messages,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
                **kwargs
            )
            
            # 处理响应
            if isinstance(response, dict) and not response.get('success', True):
                return response
            
            return {
                'success': True,
                'response': response,
                'provider': provider,
                'model': model
            }
            
        except Exception as e:
            logger.error(f"调用 {provider} LLM 失败: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def chat_stream(
        self, 
        provider: str, 
        message: str, 
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = None,
        **kwargs
    ):
        """
        执行流式聊天对话
        Args:
            provider: LLM提供商
            message: 用户消息
            model: 模型名称
            temperature: 温度参数
            max_tokens: 最大token数
            **kwargs: 其他参数
        Yields:
            str: 流式输出的文本片段
        """
        if provider not in self.llm_instances:
            yield f"错误：提供商 {provider} 未配置或不可用"
            return
        
        try:
            # 创建消息对象
            messages = [ChatMessage(role="user", content=message)]
            
            # 调用LLM
            llm_instance = self.llm_instances[provider]
            
            # 检查是否支持流式输出
            if hasattr(llm_instance, 'chat_completion_stream'):
                for chunk in llm_instance.chat_completion_stream(
                    messages=messages,
                    model=model,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    **kwargs
                ):
                    yield chunk
            else:
                # 回退到普通对话
                logger.warning(f"提供商 {provider} 不支持流式输出，使用普通对话")
                response = llm_instance.chat_completion(
                    messages=messages,
                    model=model,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    **kwargs
                )
                
                if isinstance(response, dict) and not response.get('success', True):
                    yield f"错误：{response.get('error', '未知错误')}"
                else:
                    yield str(response)
                    
        except Exception as e:
            logger.error(f"调用 {provider} LLM 流式对话失败: {e}")
            yield f"错误：{str(e)}"

    def get_provider_info(self, provider: str) -> Dict[str, Any]:
        """
        获取提供商信息
        Args:
            provider: 提供商名称
        Returns:
            Dict[str, Any]: 提供商信息
        """
        provider_info = {
            'aliyun': {
                'name': '阿里云通义千问',
                'description': '阿里云推出的大语言模型',
                'models': ['qwen-turbo', 'qwen-plus', 'qwen-max'],
                'supports_stream': True,
                'supports_images': False
            },
            'baidu': {
                'name': '百度文心一言',
                'description': '百度推出的大语言模型',
                'models': ['ernie-3.5', 'ernie-4.0', 'ernie-lite'],
                'supports_stream': False,
                'supports_images': False
            },
            'douyin': {
                'name': '抖音豆包',
                'description': '字节跳动推出的大语言模型',
                'models': ['doubao-seed-1-6-250615', 'doubao-lite', 'doubao-pro'],
                'supports_stream': True,
                'supports_images': True
            },
            'tencent': {
                'name': '腾讯混元',
                'description': '腾讯推出的大语言模型',
                'models': ['hunyuan-lite', 'hunyuan-standard', 'hunyuan-pro'],
                'supports_stream': False,
                'supports_images': False
            },
            'xunfei': {
                'name': '讯飞星火',
                'description': '科大讯飞推出的大语言模型',
                'models': ['spark-lite', 'spark-v2', 'spark-v3', 'spark-v3.5'],
                'supports_stream': False,
                'supports_images': False
            }
        }
        
        info = provider_info.get(provider, {})
        info['available'] = provider in self.llm_instances
        return info


# 全局LLM管理器实例
llm_manager = LLMManager()
