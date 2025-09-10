from typing import Dict, Any, Union, List, Iterator
import requests
import json
import logging
try:
    from volcenginesdkarkruntime import Ark
except ImportError as e:
    logger.error(f"Failed to import volcenginesdkarkruntime: {e}")
    Ark = None
from .llm_base import BaseLLM
from .chat_message import ChatMessage

logger = logging.getLogger(__name__)


class DouyinLLM(BaseLLM):
    """抖音豆包大模型实现类 (基于火山引擎ARK)"""

    def _validate_config(self) -> None:
        """验证抖音配置信息"""
        if Ark is None:
            raise ValueError("volcenginesdkarkruntime未安装，请运行: pip install volcengine-python-sdk[ark]")
        
        required_keys = ['api_key']
        for key in required_keys:
            if key not in self.config:
                raise ValueError(f"抖音豆包配置缺少必要参数: {key}")
            if not self.config[key]:
                raise ValueError(f"抖音豆包配置参数 {key} 不能为空")

    def _init_client(self) -> None:
        """初始化抖音豆包客户端"""
        if Ark is None:
            raise ValueError("volcenginesdkarkruntime未安装")
            
        self.api_key = self.config['api_key']
        self.base_url = self.config.get('base_url', 'https://ark.cn-beijing.volces.com/api/v3')
        self.model = self.config.get('model', 'doubao-seed-1-6-250615')
        self.temperature = self.config.get('temperature', 0.7)
        self.max_tokens = self.config.get('max_tokens', -1)
        
        try:
            # 初始化ARK客户端
            self.client = Ark(
                base_url=self.base_url,
                api_key=self.api_key
            )
            logger.info(f"豆包LLM客户端初始化成功，模型: {self.model}")
        except Exception as e:
            logger.error(f"豆包LLM客户端初始化失败: {e}")
            raise

    def chat_completion(
            self,
            messages: List[ChatMessage],
            model: str = None,
            temperature: float = None,
            max_tokens: int = None,
            stream: bool = False,
            **kwargs
    ) -> Union[str, Dict[str, Any], Iterator]:
        """
        执行豆包对话
        Args:
            messages: 聊天历史消息列表
            model: 模型名称，默认为doubao-seed-1-6-250615
            temperature: 温度参数，控制随机性
            max_tokens: 最大生成token数
            stream: 是否流式输出
            **kwargs: 其他参数
        Returns:
            Union[str, Dict[str, Any], Iterator]: 模型回复
        """
        try:
            # 使用配置的默认值或传入的参数
            model = model or self.model
            temperature = temperature if temperature is not None else self.temperature
            max_tokens = max_tokens if max_tokens is not None else self.max_tokens
            
            if max_tokens == -1:
                max_tokens = None

            # 转换消息格式
            msg_list = []
            for msg in messages:
                msg_dict = msg.to_dict()
                # 支持图片输入
                if hasattr(msg, 'images') and msg.images:
                    content = [{"type": "text", "text": msg_dict["content"]}]
                    for image in msg.images:
                        content.append({
                            "type": "image_url",
                            "image_url": {"url": image}
                        })
                    msg_dict["content"] = content
                msg_list.append(msg_dict)

            # 构建请求参数
            request_params = {
                'model': model,
                'messages': msg_list,
                'temperature': temperature,
                'stream': stream
            }

            if max_tokens:
                request_params['max_tokens'] = max_tokens
            
            request_params.update(kwargs)

            logger.info(f"🤖 开始豆包对话，模型: {model}, 流式: {stream}")
            logger.debug(f"请求参数: {request_params}")

            # 调用ARK SDK
            if stream:
                # 流式调用
                response = self.client.chat.completions.create(**request_params)
                return response
            else:
                # 非流式调用
                response = self.client.chat.completions.create(**request_params)
                
                logger.debug(f"豆包响应: {response}")
                
                # 解析响应
                if response.choices and len(response.choices) > 0:
                    choice = response.choices[0]
                    if hasattr(choice, 'message') and hasattr(choice.message, 'content'):
                        content = choice.message.content
                        logger.info(f"✅ 豆包对话成功，回复长度: {len(content) if content else 0}")
                        return content
                    elif hasattr(choice, 'text'):
                        logger.info(f"✅ 豆包对话成功，回复长度: {len(choice.text) if choice.text else 0}")
                        return choice.text
                
                logger.warning("豆包响应格式异常，未找到有效内容")
                return "抱歉，获取回复失败"

        except Exception as e:
            logger.error(f"❌ 豆包LLM调用失败: {e}")
            import traceback
            logger.error(f"错误详情: {traceback.format_exc()}")
            return {
                'success': False,
                'error_msg': str(e)
            }
    
    def chat_completion_stream(
            self,
            messages: List[ChatMessage],
            model: str = None,
            temperature: float = None,
            max_tokens: int = None,
            **kwargs
    ) -> Iterator[str]:
        """
        流式执行豆包对话
        Args:
            messages: 聊天历史消息列表
            model: 模型名称
            temperature: 温度参数
            max_tokens: 最大生成token数
            **kwargs: 其他参数
        Yields:
            str: 流式输出的文本片段
        """
        try:
            stream_response = self.chat_completion(
                messages=messages,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
                **kwargs
            )
            
            if isinstance(stream_response, dict) and not stream_response.get('success', True):
                yield f"错误：{stream_response.get('error_msg', '未知错误')}"
                return
            
            # 处理流式响应
            for chunk in stream_response:
                if chunk.choices and len(chunk.choices) > 0:
                    choice = chunk.choices[0]
                    
                    # 提取增量内容
                    delta_content = ""
                    if hasattr(choice, 'delta') and hasattr(choice.delta, 'content') and choice.delta.content:
                        delta_content = choice.delta.content
                    elif hasattr(choice, 'message') and hasattr(choice.message, 'content') and choice.message.content:
                        delta_content = choice.message.content
                    
                    if delta_content:
                        yield delta_content
                        
        except Exception as e:
            logger.error(f"豆包LLM流式调用失败: {e}")
            yield f"错误：{str(e)}"
