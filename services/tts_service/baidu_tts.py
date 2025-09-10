"""
百度文本转语音服务实现
"""
import time
import os
import tempfile
from typing import Dict, Any, List
from .tts_base import BaseTTS
from .tts_models import TTSRequest, TTSResponse


class BaiduTTS(BaseTTS):
    """百度文本转语音实现类"""

    def _validate_config(self) -> None:
        """验证百度配置信息"""
        required_keys = ['app_id', 'api_key', 'secret_key']
        for key in required_keys:
            if key not in self.config:
                raise ValueError(f"百度TTS配置缺少必要参数: {key}")

    def _init_client(self) -> None:
        """初始化百度TTS客户端"""
        try:
            from aip import AipSpeech
            self.client = AipSpeech(
                self.config['app_id'],
                self.config['api_key'],
                self.config['secret_key']
            )
        except ImportError:
            raise ImportError("请安装百度AI SDK: pip install baidu-aip")

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
            
            # 百度TTS文本长度限制为1024个字符
            if len(request.text) > 1024:
                return TTSResponse(
                    text=request.text,
                    success=False,
                    error_msg="文本长度超过1024个字符限制",
                    duration=time.time() - start_time
                )
            
            # 设置合成参数
            options = {
                'spd': int(request.speed * 5),  # 语速，取值0-15，默认为5中语速
                'pit': int(request.pitch * 5),  # 音调，取值0-15，默认为5中语调
                'vol': int(request.volume * 15), # 音量，取值0-15，默认为5中音量
                'per': self._get_voice_id(request.voice),  # 发音人选择
            }
            
            # 添加额外参数
            if request.extra:
                options.update(request.extra)
            
            # 调用百度TTS API
            result = self.client.synthesis(
                request.text,
                request.language or 'zh',
                1,  # 客户端类型选择，web端填写固定值1
                options
            )
            
            duration = time.time() - start_time
            
            # 处理结果
            if not isinstance(result, dict):
                # 成功返回音频数据
                audio_data = result
                audio_file = request.output_file
                
                # 如果没有指定输出文件，创建临时文件
                if not audio_file:
                    temp_dir = tempfile.gettempdir()
                    audio_file = os.path.join(temp_dir, f"tts_{int(time.time())}.mp3")
                
                # 保存音频文件
                with open(audio_file, 'wb') as f:
                    f.write(audio_data)
                
                # 获取文件信息
                file_size = len(audio_data)
                
                return TTSResponse(
                    text=request.text,
                    audio_file=audio_file,
                    audio_data=audio_data,
                    success=True,
                    duration=duration,
                    audio_length=self._estimate_audio_length(request.text),
                    file_size=file_size
                )
            else:
                # 错误响应
                return TTSResponse(
                    text=request.text,
                    success=False,
                    error_msg=result.get('err_msg', '合成失败'),
                    duration=duration,
                    extra_info=result
                )
                
        except Exception as e:
            return TTSResponse(
                text=request.text,
                success=False,
                error_msg=str(e),
                duration=time.time() - start_time
            )

    def synthesize_text(self, 
                       text: str,
                       output_file: str = None,
                       voice: str = None,
                       speed: float = 1.0,
                       pitch: float = 1.0,
                       volume: float = 1.0,
                       language: str = 'zh',
                       audio_format: str = 'mp3') -> TTSResponse:
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

    def _get_voice_id(self, voice: str) -> int:
        """获取发音人ID"""
        voice_map = {
            'female': 0,     # 度小美（女声）
            'male': 1,       # 度小宇（男声）
            'duyaya': 3,     # 度逍遥（男声）
            'duyanyan': 4,   # 度丫丫（女童声）
        }
        return voice_map.get(voice, 1)  # 默认男声
    
    def get_supported_voices(self) -> List[Dict[str, Any]]:
        """获取支持的发音人列表"""
        return [
            {'id': 'female', 'name': '度小美', 'gender': 'female', 'language': 'zh'},
            {'id': 'male', 'name': '度小宇', 'gender': 'male', 'language': 'zh'},
            {'id': 'duyaya', 'name': '度逍遥', 'gender': 'male', 'language': 'zh'},
            {'id': 'duyanyan', 'name': '度丫丫', 'gender': 'female', 'language': 'zh', 'age': 'child'},
        ]
    
    def get_supported_formats(self) -> List[str]:
        """获取支持的音频格式"""
        return ['mp3']  # 百度TTS主要支持MP3格式
    
    def get_supported_languages(self) -> List[str]:
        """获取支持的语言"""
        return ['zh']  # 百度TTS主要支持中文
    
    def _estimate_audio_length(self, text: str) -> float:
        """估算音频时长（秒）"""
        # 简单估算：中文按每分钟300字计算
        chars_per_minute = 300
        return len(text) / chars_per_minute * 60
