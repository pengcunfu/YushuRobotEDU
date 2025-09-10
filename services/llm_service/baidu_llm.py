from typing import Dict, Any, Union, List
from .llm_base import BaseLLM
from .chat_message import ChatMessage


class BaiduLLM(BaseLLM):
    """百度文心一言实现类"""

    def _validate_config(self) -> None:
        """验证百度配置信息"""
        required_keys = ['access_token']
        for key in required_keys:
            if key not in self.config:
                raise ValueError(f"百度文心一言配置缺少必要参数: {key}")

    def _init_client(self) -> None:
        """初始化百度文心一言客户端"""
        self.access_token = self.config['access_token']

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
        执行文心一言对话
        Args:
            messages: 聊天历史消息列表
            model: 模型名称，默认为ernie-3.5
            temperature: 温度参数，控制随机性
            max_tokens: 最大生成token数
            stream: 是否流式输出
            **kwargs: 其他参数
        Returns:
            Union[str, Dict[str, Any]]: 模型回复
        """
        try:
            import erniebot
            from erniebot import ChatCompletion
            
            # 设置API类型和访问令牌
            erniebot.api_type = 'aistudio'
            erniebot.access_token = self.access_token
            
            # 转换消息格式
            msg_list = [msg.to_dict() for msg in messages]
            
            # 设置参数
            params = {
                "model": model or "ernie-3.5",
                "messages": msg_list,
                "temperature": temperature,
            }
            if max_tokens:
                params["max_tokens"] = max_tokens
            params.update(kwargs)

            # 调用API
            response = ChatCompletion.create(**params)
            
            # 获取响应文本
            if hasattr(response, 'get_result'):
                return response.get_result()
            else:
                return str(response)

        except Exception as e:
            return {
                'success': False,
                'error_msg': str(e)
            }
