from typing import Dict, Any, Union, List
from .llm_base import BaseLLM
from .chat_message import ChatMessage


class TencentLLM(BaseLLM):
    """腾讯云混元大模型实现类"""

    def _validate_config(self) -> None:
        """验证腾讯云配置信息"""
        required_keys = ['secret_id', 'secret_key', 'app_id']
        for key in required_keys:
            if key not in self.config:
                raise ValueError(f"腾讯云混元大模型配置缺少必要参数: {key}")

    def _init_client(self) -> None:
        """初始化腾讯云客户端"""
        self.secret_id = self.config['secret_id']
        self.secret_key = self.config['secret_key']
        self.app_id = self.config['app_id']
        self.endpoint = self.config.get('endpoint', 'hunyuan.tencentcloudapi.com')

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
        执行腾讯云混元大模型对话
        Args:
            messages: 聊天历史消息列表
            model: 模型名称，默认为hunyuan-lite
            temperature: 温度参数，控制随机性
            max_tokens: 最大生成token数
            stream: 是否流式输出
            **kwargs: 其他参数
        Returns:
            Union[str, Dict[str, Any]]: 模型回复
        """
        try:
            # 导入腾讯云SDK
            from tencentcloud.common import credential
            from tencentcloud.common.profile.client_profile import ClientProfile
            from tencentcloud.common.profile.http_profile import HttpProfile
            from tencentcloud.hunyuan.v20230901 import hunyuan_client, models

            # 实例化认证对象
            cred = credential.Credential(self.secret_id, self.secret_key)
            
            # 实例化http选项
            httpProfile = HttpProfile()
            httpProfile.endpoint = self.endpoint

            # 实例化client选项
            clientProfile = ClientProfile()
            clientProfile.httpProfile = httpProfile

            # 实例化客户端对象
            client = hunyuan_client.HunyuanClient(cred, "ap-beijing", clientProfile)

            # 转换消息格式
            msg_list = []
            for msg in messages:
                msg_dict = msg.to_dict()
                msg_list.append(models.Message(Role=msg_dict['role'], Content=msg_dict['content']))

            # 实例化请求对象
            req = models.ChatCompletionsRequest()
            req.Model = model or "hunyuan-lite"
            req.Messages = msg_list
            req.Temperature = temperature
            if max_tokens:
                req.MaxTokens = max_tokens
            req.Stream = stream

            # 发起请求
            resp = client.ChatCompletions(req)
            
            if stream:
                return resp
            else:
                # 获取响应内容
                if hasattr(resp, 'Choices') and resp.Choices:
                    return resp.Choices[0].Message.Content
                else:
                    return str(resp)

        except Exception as e:
            return {
                'success': False,
                'error_msg': str(e)
            }
