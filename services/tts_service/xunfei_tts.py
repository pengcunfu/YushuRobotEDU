"""
讯飞文本转语音服务实现
"""
import time
import os
import tempfile
import websocket
import hashlib
import base64
import hmac
import json
from urllib.parse import urlencode
from datetime import datetime
from time import mktime
from wsgiref.handlers import format_date_time
import ssl
import _thread as thread
from typing import Dict, Any, List
from .tts_base import BaseTTS
from .tts_models import TTSRequest, TTSResponse


class XunfeiTTS(BaseTTS):
    """讯飞文本转语音实现类"""

    def _validate_config(self) -> None:
        """验证讯飞配置信息"""
        required_keys = ['app_id', 'api_key', 'api_secret']
        for key in required_keys:
            if key not in self.config:
                raise ValueError(f"讯飞TTS配置缺少必要参数: {key}")

    def _init_client(self) -> None:
        """初始化讯飞TTS客户端"""
        self.app_id = self.config['app_id']
        self.api_key = self.config['api_key']
        self.api_secret = self.config['api_secret']
        self.host = self.config.get('host', 'ws-api.xfyun.cn')
        self.path = self.config.get('path', '/v2/tts')
        
        # 默认参数
        self.vcn = self.config.get('vcn', 'x4_yezi')  # 发音人
        self.auf = self.config.get('auf', 'audio/L16;rate=16000')  # 音频文件编码
        self.aue = self.config.get('aue', 'raw')  # 音频编码
        self.tte = self.config.get('tte', 'utf8')  # 文本编码

    def _create_url(self) -> str:
        """创建WebSocket连接URL"""
        url = f'wss://{self.host}{self.path}'
        now = datetime.now()
        date = format_date_time(mktime(now.timetuple()))
        
        signature_origin = f"host: {self.host}\n"
        signature_origin += f"date: {date}\n"
        signature_origin += f"GET {self.path} HTTP/1.1"
        
        signature_sha = hmac.new(
            self.api_secret.encode('utf-8'),
            signature_origin.encode('utf-8'),
            digestmod=hashlib.sha256
        ).digest()
        signature_sha = base64.b64encode(signature_sha).decode(encoding='utf-8')
        
        authorization_origin = f'api_key="{self.api_key}", algorithm="hmac-sha256", headers="host date request-line", signature="{signature_sha}"'
        authorization = base64.b64encode(authorization_origin.encode('utf-8')).decode(encoding='utf-8')
        
        v = {
            "authorization": authorization,
            "date": date,
            "host": self.host
        }
        url = url + '?' + urlencode(v)
        return url

    def synthesize(self, request: TTSRequest) -> TTSResponse:
        """执行文本转语音"""
        start_time = time.time()
        
        try:
            # 检查文本长度
            if not request.text or len(request.text.strip()) == 0:
                return TTSResponse(
                    text=request.text,
                    success=False,
                    error_msg="文本内容不能为空",
                    duration=time.time() - start_time
                )
            
            # 讯飞TTS文本长度限制
            if len(request.text) > 8000:
                return TTSResponse(
                    text=request.text,
                    success=False,
                    error_msg="文本长度超过8000个字符限制",
                    duration=time.time() - start_time
                )
            
            # 初始化结果存储
            self._audio_data = b''
            self._error_msg = ""
            self._synthesis_complete = False
            
            # 创建WebSocket连接
            ws_url = self._create_url()
            ws = websocket.WebSocketApp(
                ws_url,
                on_message=self._on_message,
                on_error=self._on_error,
                on_close=self._on_close,
                on_open=lambda ws: self._on_open(ws, request)
            )
            
            # 运行WebSocket
            ws.run_forever(sslopt={"cert_reqs": ssl.CERT_NONE})
            
            duration = time.time() - start_time
            
            if self._synthesis_complete and self._audio_data:
                # 保存音频文件
                audio_file = request.output_file
                if not audio_file:
                    temp_dir = tempfile.gettempdir()
                    audio_file = os.path.join(temp_dir, f"tts_{int(time.time())}.wav")
                
                with open(audio_file, 'wb') as f:
                    f.write(self._audio_data)
                
                return TTSResponse(
                    text=request.text,
                    audio_file=audio_file,
                    audio_data=self._audio_data,
                    success=True,
                    duration=duration,
                    audio_length=self._estimate_audio_length(request.text),
                    file_size=len(self._audio_data)
                )
            else:
                return TTSResponse(
                    text=request.text,
                    success=False,
                    error_msg=self._error_msg or "合成失败",
                    duration=duration
                )
                
        except Exception as e:
            return TTSResponse(
                text=request.text,
                success=False,
                error_msg=str(e),
                duration=time.time() - start_time
            )

    def _on_message(self, ws, message):
        """WebSocket消息处理"""
        try:
            data = json.loads(message)
            code = data['code']
            
            if code != 0:
                self._error_msg = data.get('message', f'错误码: {code}')
                ws.close()
                return
            
            audio_data = data.get('data', {}).get('audio')
            if audio_data:
                audio_bytes = base64.b64decode(audio_data)
                self._audio_data += audio_bytes
            
            status = data.get('data', {}).get('status', 0)
            if status == 2:  # 合成完成
                self._synthesis_complete = True
                ws.close()
                
        except Exception as e:
            self._error_msg = f"处理消息失败: {str(e)}"
            ws.close()

    def _on_error(self, ws, error):
        """WebSocket错误处理"""
        self._error_msg = f"WebSocket错误: {str(error)}"

    def _on_close(self, ws, close_status_code, close_msg):
        """WebSocket关闭处理"""
        pass

    def _on_open(self, ws, request: TTSRequest):
        """WebSocket连接打开处理"""
        def run():
            # 构建请求数据
            data = {
                "common": {
                    "app_id": self.app_id,
                },
                "business": {
                    "aue": self.aue,
                    "auf": self.auf,
                    "vcn": self._get_voice_id(request.voice),
                    "speed": int(request.speed * 50),  # 语速，取值范围[0, 100]
                    "volume": int(request.volume * 100),  # 音量，取值范围[0, 100]
                    "pitch": int(request.pitch * 50),  # 音调，取值范围[0, 100]
                    "bgs": 1,  # 背景音乐
                    "tte": self.tte
                },
                "data": {
                    "status": 2,
                    "text": base64.b64encode(request.text.encode('utf-8')).decode('utf-8')
                }
            }
            
            ws.send(json.dumps(data))
            
        thread.start_new_thread(run, ())

    def synthesize_text(self, 
                       text: str,
                       output_file: str = None,
                       voice: str = None,
                       speed: float = 1.0,
                       pitch: float = 1.0,
                       volume: float = 1.0,
                       language: str = 'zh',
                       audio_format: str = 'wav') -> TTSResponse:
        """合成文本为语音"""
        request = TTSRequest(
            text=text,
            output_file=output_file,
            voice=voice,
            speed=speed,
            pitch=pitch,
            volume=volume,
            language=language,
            audio_format=audio_format
        )
        return self.synthesize(request)

    def _get_voice_id(self, voice: str) -> str:
        """获取发音人ID"""
        voice_map = {
            'female': 'x4_yezi',      # 叶子（女声）
            'male': 'x4_lingfeng',    # 凌风（男声）
            'xiaoyan': 'xiaoyan',     # 小燕（女声）
            'xiaoyu': 'xiaoyu',       # 小宇（男声）
        }
        return voice_map.get(voice, 'x4_yezi')  # 默认叶子
    
    def get_supported_voices(self) -> List[Dict[str, Any]]:
        """获取支持的发音人列表"""
        return [
            {'id': 'female', 'name': '叶子', 'gender': 'female', 'language': 'zh'},
            {'id': 'male', 'name': '凌风', 'gender': 'male', 'language': 'zh'},
            {'id': 'xiaoyan', 'name': '小燕', 'gender': 'female', 'language': 'zh'},
            {'id': 'xiaoyu', 'name': '小宇', 'gender': 'male', 'language': 'zh'},
        ]
    
    def get_supported_formats(self) -> List[str]:
        """获取支持的音频格式"""
        return ['wav', 'mp3']
    
    def get_supported_languages(self) -> List[str]:
        """获取支持的语言"""
        return ['zh', 'en']
    
    def _estimate_audio_length(self, text: str) -> float:
        """估算音频时长（秒）"""
        # 简单估算：中文按每分钟300字计算
        chars_per_minute = 300
        return len(text) / chars_per_minute * 60
