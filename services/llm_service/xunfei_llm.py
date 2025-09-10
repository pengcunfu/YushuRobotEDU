import _thread as thread
import base64
import hashlib
import hmac
import json
import ssl
from datetime import datetime
from time import mktime
from urllib.parse import urlencode, urlparse
from wsgiref.handlers import format_date_time
from typing import Dict, Any, Union, List
import websocket
from .llm_base import BaseLLM
from .chat_message import ChatMessage


class XunfeiLLM(BaseLLM):
    """讯飞星火大模型实现类"""

    def _validate_config(self) -> None:
        """验证讯飞配置信息"""
        required_keys = ['api_key', 'api_secret', 'app_id']
        for key in required_keys:
            if key not in self.config:
                raise ValueError(f"讯飞星火配置缺少必要参数: {key}")

    def _init_client(self) -> None:
        """初始化讯飞星火客户端"""
        self.api_key = self.config['api_key']
        self.api_secret = self.config['api_secret']
        self.app_id = self.config['app_id']
        self.gpt_url = self.config.get('gpt_url', 'wss://spark-api.xf-yun.com/v3.1/chat')
        self.host = urlparse(self.gpt_url).netloc
        self.path = urlparse(self.gpt_url).path
        self._result = ""
        self._error = None

    def _create_url(self):
        """创建WebSocket连接URL"""
        now = datetime.now()
        date = format_date_time(mktime(now.timetuple()))
        signature_origin = f"host: {self.host}\ndate: {date}\nGET {self.path} HTTP/1.1"
        signature_sha = hmac.new(self.api_secret.encode('utf-8'), signature_origin.encode('utf-8'),
                                digestmod=hashlib.sha256).digest()
        signature_sha_base64 = base64.b64encode(signature_sha).decode('utf-8')
        authorization_origin = f'api_key="{self.api_key}", algorithm="hmac-sha256", headers="host date request-line", signature="{signature_sha_base64}"'
        authorization = base64.b64encode(authorization_origin.encode('utf-8')).decode('utf-8')
        v = {"authorization": authorization, "date": date, "host": self.host}
        url = self.gpt_url + '?' + urlencode(v)
        return url

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
        执行讯飞星火对话
        Args:
            messages: 聊天历史消息列表
            model: 模型名称（通过domain参数控制）
            temperature: 温度参数，控制随机性
            max_tokens: 最大生成token数
            stream: 是否流式输出（讯飞默认为流式）
            **kwargs: 其他参数
        Returns:
            Union[str, Dict[str, Any]]: 模型回复
        """
        try:
            self._result = ""
            self._error = None
            
            # 转换消息格式
            text_messages = []
            for msg in messages:
                msg_dict = msg.to_dict()
                text_messages.append({
                    "role": msg_dict['role'], 
                    "content": msg_dict['content']
                })

            # 设置参数
            domain = kwargs.get('domain', 'generalv3')  # 默认使用v3.0
            if model:
                # 根据模型名称映射domain
                model_domain_map = {
                    'spark-lite': 'lite',
                    'spark-v2': 'generalv2',
                    'spark-v3': 'generalv3',
                    'spark-v3.5': 'generalv3.5'
                }
                domain = model_domain_map.get(model, domain)

            parameter = {
                "payload": {
                    "message": {
                        "text": text_messages
                    }
                },
                "parameter": {
                    "chat": {
                        "max_tokens": max_tokens or 4096,
                        "domain": domain,
                        "top_k": kwargs.get('top_k', 6),
                        "temperature": temperature
                    }
                },
                "header": {
                    "app_id": self.app_id
                }
            }

            def on_message(ws, message):
                data = json.loads(message)
                code = data['header']['code']
                choices = data["payload"]["choices"]
                status = choices["status"]
                if code != 0:
                    self._error = f'请求错误: {code}, {data}'
                    ws.close()
                if "text" in choices and choices["text"]:
                    self._result += choices["text"][0]["content"]
                if status == 2:
                    ws.close()

            def on_error(ws, error):
                self._error = error

            def on_close(ws, close_status_code, close_msg):
                pass

            def on_open(ws):
                def run(*args):
                    ws.send(json.dumps(parameter))
                thread.start_new_thread(run, ())

            ws_url = self._create_url()
            ws = websocket.WebSocketApp(ws_url, on_message=on_message, on_error=on_error, 
                                      on_close=on_close, on_open=on_open)
            ws.run_forever(sslopt={"cert_reqs": ssl.CERT_NONE})
            
            if self._error:
                return {
                    'success': False,
                    'error_msg': str(self._error)
                }
            return self._result

        except Exception as e:
            return {
                'success': False,
                'error_msg': str(e)
            }
