from typing import Dict, Any, Union, List
import dashscope
from dashscope import Generation
from .llm_base import BaseLLM
from .chat_message import ChatMessage


class AliyunLLM(BaseLLM):
    """阿里云通义千问实现类"""

    def _validate_config(self) -> None:
        """验证阿里云配置信息"""
        required_keys = ['api_key']
        for key in required_keys:
            if key not in self.config:
                raise ValueError(f"阿里云通义千问配置缺少必要参数: {key}")

    def _init_client(self) -> None:
        """初始化阿里云通义千问客户端"""
        dashscope.api_key = self.config['api_key']

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
        执行通义千问对话
        Args:
            messages: 聊天历史消息列表
            model: 模型名称，默认为qwen-turbo
            temperature: 温度参数，控制随机性
            max_tokens: 最大生成token数
            stream: 是否流式输出
            **kwargs: 其他参数
        Returns:
            Union[str, Dict[str, Any]]: 模型回复
        """
        try:
            # 转换消息格式
            msg_list = [msg.to_dict() for msg in messages]

            # 设置参数
            params = {
                "model": model or "qwen-turbo",
                "messages": msg_list,
                "temperature": temperature,
            }
            if max_tokens:
                params["max_tokens"] = max_tokens
            params.update(kwargs)

            # 调用API
            response = Generation.create(**params, stream=stream)

            if stream:
                return response
            else:
                # 修复响应数据获取方式
                if hasattr(response, 'output') and hasattr(response.output, 'text'):
                    return response.output.text
                elif hasattr(response, 'output') and 'text' in response.output:
                    return response.output['text']
                else:
                    return str(response)

        except Exception as e:
            return {
                'success': False,
                'error_msg': str(e)
            }

    def embedding(
            self,
            text: Union[str, List[str]],
            model: str = None,
            **kwargs
    ) -> Union[List[float], List[List[float]]]:
        """
        执行文本向量化
        Args:
            text: 输入文本或文本列表
            model: 模型名称，默认为text-embedding-v1
            **kwargs: 其他参数
        Returns:
            Union[List[float], List[List[float]]]: 文本向量或向量列表
        """
        try:
            from dashscope import TextEmbedding

            # 设置参数
            params = {
                "model": model or "text-embedding-v1",
                "input": text if isinstance(text, list) else [text],
            }
            params.update(kwargs)

            # 调用API
            response = TextEmbedding.create(**params)

            # 获取向量
            if hasattr(response, 'output') and 'embeddings' in response.output:
                embeddings = [item['embedding'] for item in response.output['embeddings']]
                return embeddings[0] if isinstance(text, str) else embeddings
            else:
                raise Exception("无法获取嵌入向量")

        except Exception as e:
            return {
                'success': False,
                'error_msg': str(e)
            }

    def function_call(
            self,
            messages: List[ChatMessage],
            functions: List[Dict[str, Any]],
            model: str = None,
            **kwargs
    ) -> Dict[str, Any]:
        """
        执行函数调用
        Args:
            messages: 聊天历史消息列表
            functions: 可用函数列表
            model: 模型名称，默认为qwen-plus
            **kwargs: 其他参数
        Returns:
            Dict[str, Any]: 函数调用结果
        """
        try:
            # 转换消息格式
            msg_list = [msg.to_dict() for msg in messages]

            # 设置参数
            params = {
                "model": model or "qwen-plus",
                "messages": msg_list,
                "functions": functions,
            }
            params.update(kwargs)

            # 调用API
            response = Generation.create(**params)

            return {
                'success': True,
                'function_call': getattr(response.output, 'function_call', None),
                'response': response
            }

        except Exception as e:
            return {
                'success': False,
                'error_msg': str(e)
            }
