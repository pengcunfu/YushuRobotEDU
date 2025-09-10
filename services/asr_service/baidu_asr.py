"""
百度语音识别服务实现
"""
import time
import os
from typing import Dict, Any
from .asr_base import BaseASR
from .asr_models import ASRRequest, ASRResponse


class BaiduASR(BaseASR):
    """百度语音识别实现类"""

    def _validate_config(self) -> None:
        """验证百度配置信息"""
        required_keys = ['app_id', 'api_key', 'secret_key']
        for key in required_keys:
            if key not in self.config:
                raise ValueError(f"百度ASR配置缺少必要参数: {key}")

    def _init_client(self) -> None:
        """初始化百度ASR客户端"""
        try:
            from aip import AipSpeech
            self.client = AipSpeech(
                self.config['app_id'],
                self.config['api_key'],
                self.config['secret_key']
            )
        except ImportError:
            raise ImportError("请安装百度AI SDK: pip install baidu-aip")

    def recognize(self, request: ASRRequest) -> ASRResponse:
        """执行语音识别"""
        start_time = time.time()
        
        try:
            # 读取音频文件
            if not os.path.exists(request.audio_file):
                return ASRResponse(
                    success=False,
                    error_msg=f"音频文件不存在: {request.audio_file}",
                    duration=time.time() - start_time,
                    file_path=request.audio_file
                )
            
            with open(request.audio_file, 'rb') as f:
                audio_data = f.read()
            
            # 设置识别参数
            options = {
                'dev_pid': 1537,  # 普通话输入法
                'cuid': self.config.get('cuid', 'default_user'),
            }
            
            # 添加额外参数
            if request.extra:
                options.update(request.extra)
            
            # 调用百度ASR API
            result = self.client.asr(
                audio_data,
                request.audio_format or 'wav',
                request.sample_rate,
                options
            )
            
            duration = time.time() - start_time
            
            # 处理结果
            if result.get('err_no') == 0:
                text = result['result'][0] if result.get('result') else ""
                return ASRResponse(
                    text=text,
                    success=True,
                    duration=duration,
                    file_path=request.audio_file,
                    confidence=1.0,  # 百度不提供置信度
                    extra_info=result
                )
            else:
                return ASRResponse(
                    success=False,
                    error_msg=result.get('err_msg', '识别失败'),
                    duration=duration,
                    file_path=request.audio_file,
                    extra_info=result
                )
                
        except Exception as e:
            return ASRResponse(
                success=False,
                error_msg=str(e),
                duration=time.time() - start_time,
                file_path=request.audio_file
            )

    def recognize_file(self, 
                      audio_file: str, 
                      audio_format: str = 'wav',
                      sample_rate: int = 16000,
                      language: str = 'zh') -> ASRResponse:
        """识别音频文件"""
        request = ASRRequest(
            audio_file=audio_file,
            audio_format=audio_format,
            sample_rate=sample_rate,
            language=language
        )
        return self.recognize(request)
    
    def get_supported_formats(self) -> list:
        """获取支持的音频格式"""
        return ['wav', 'pcm', 'amr', 'mp3']
    
    def get_supported_languages(self) -> list:
        """获取支持的语言"""
        return ['zh']  # 百度主要支持中文
