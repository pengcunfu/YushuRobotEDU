"""
ASR语音识别服务管理器
"""
import os
import tempfile
import logging
from typing import Dict, Any, List, Optional
from .asr_models import ASRRequest, ASRResponse
from .baidu_asr import BaiduASR
from .xunfei_asr import XunfeiASR
from .douyin_asr import DouyinASR
from .aliyun_asr import AliyunASR
from .tencent_asr import TencentASR

logger = logging.getLogger(__name__)


class ASRManager:
    """ASR管理器，负责管理所有ASR实例"""
    
    def __init__(self):
        self.asr_instances: Dict[str, Any] = {}
        self.asr_classes = {
            'baidu': BaiduASR,
            'xunfei': XunfeiASR,
            'douyin': DouyinASR,
            'aliyun': AliyunASR,
            'tencent': TencentASR,
        }
    
    def initialize_asrs(self, config: Dict[str, Any]) -> None:
        """
        根据配置初始化ASR实例
        Args:
            config: ASR配置字典
        """
        self.asr_instances.clear()
        
        for provider, provider_config in config.items():
            if provider in self.asr_classes and self._is_config_valid(provider_config):
                try:
                    self.asr_instances[provider] = self.asr_classes[provider](provider_config)
                    logger.info(f"成功初始化 {provider} ASR")
                except Exception as e:
                    logger.error(f"初始化 {provider} ASR 失败: {e}")
    
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
        
        # 检查关键API密钥字段是否存在且非空
        key_fields = {
            'baidu': ['app_id', 'api_key', 'secret_key'],
            'xunfei': ['app_id', 'api_key', 'api_secret'],
            'douyin': ['access_key', 'secret_key', 'app_id'],
            'aliyun': ['access_key_id', 'access_key_secret', 'app_key'],
            'tencent': ['secret_id', 'secret_key']
        }
        
        # 通过检查是否有至少一个关键字段有值来判断配置是否有效
        has_key_field = False
        for key_list in key_fields.values():
            for key in key_list:
                if key in config and config[key] and str(config[key]).strip():
                    has_key_field = True
                    break
            if has_key_field:
                break
                
        return has_key_field
    
    def get_available_providers(self) -> List[str]:
        """
        获取可用的ASR提供商列表
        Returns:
            List[str]: 可用提供商列表
        """
        return list(self.asr_instances.keys())
    
    def recognize_file(self, 
                      provider: str,
                      audio_file: str,
                      audio_format: str = 'wav',
                      sample_rate: int = 16000,
                      language: str = 'zh') -> ASRResponse:
        """
        识别音频文件
        Args:
            provider: ASR提供商
            audio_file: 音频文件路径
            audio_format: 音频格式
            sample_rate: 采样率
            language: 语言
        Returns:
            ASRResponse: 识别结果
        """
        if provider not in self.asr_instances:
            return ASRResponse(
                success=False,
                error_msg=f'提供商 {provider} 未配置或不可用'
            )
        
        try:
            asr_instance = self.asr_instances[provider]
            return asr_instance.recognize_file(
                audio_file=audio_file,
                audio_format=audio_format,
                sample_rate=sample_rate,
                language=language
            )
        except Exception as e:
            logger.error(f"调用 {provider} ASR 失败: {e}")
            return ASRResponse(
                success=False,
                error_msg=str(e)
            )
    
    def recognize_audio_data(self,
                           provider: str,
                           audio_data: bytes,
                           audio_format: str = 'wav',
                           sample_rate: int = 16000,
                           language: str = 'zh') -> ASRResponse:
        """
        识别音频数据
        Args:
            provider: ASR提供商
            audio_data: 音频二进制数据
            audio_format: 音频格式
            sample_rate: 采样率
            language: 语言
        Returns:
            ASRResponse: 识别结果
        """
        if provider not in self.asr_instances:
            return ASRResponse(
                success=False,
                error_msg=f'提供商 {provider} 未配置或不可用'
            )
        
        # 创建临时文件
        temp_file = None
        try:
            # 确定文件扩展名
            ext_map = {
                'wav': '.wav',
                'mp3': '.mp3',
                'pcm': '.pcm',
                'm4a': '.m4a',
                'flac': '.flac'
            }
            ext = ext_map.get(audio_format.lower(), '.wav')
            
            # 创建临时文件
            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as f:
                f.write(audio_data)
                temp_file = f.name
            
            # 执行识别
            return self.recognize_file(
                provider=provider,
                audio_file=temp_file,
                audio_format=audio_format,
                sample_rate=sample_rate,
                language=language
            )
            
        except Exception as e:
            logger.error(f"处理音频数据失败: {e}")
            return ASRResponse(
                success=False,
                error_msg=str(e)
            )
        finally:
            # 清理临时文件
            if temp_file and os.path.exists(temp_file):
                try:
                    os.unlink(temp_file)
                except Exception as e:
                    logger.warning(f"删除临时文件失败: {e}")
    
    def get_provider_info(self, provider: str) -> Dict[str, Any]:
        """
        获取提供商信息
        Args:
            provider: 提供商名称
        Returns:
            Dict[str, Any]: 提供商信息
        """
        provider_info = {
            'baidu': {
                'name': '百度语音识别',
                'description': '百度AI开放平台语音识别服务',
                'supported_formats': ['wav', 'pcm', 'amr', 'mp3'],
                'supported_languages': ['zh']
            },
            'xunfei': {
                'name': '讯飞语音识别',
                'description': '科大讯飞语音识别服务',
                'supported_formats': ['wav', 'mp3', 'flac', 'm4a', 'aac'],
                'supported_languages': ['zh', 'en']
            },
            'aliyun': {
                'name': '阿里云语音识别',
                'description': '阿里云智能语音识别服务',
                'supported_formats': ['wav', 'mp3', 'pcm'],
                'supported_languages': ['zh', 'en']
            },
            'tencent': {
                'name': '腾讯云语音识别',
                'description': '腾讯云语音识别服务',
                'supported_formats': ['wav', 'mp3', 'silk'],
                'supported_languages': ['zh', 'en']
            },
            'douyin': {
                'name': '抖音语音识别',
                'description': '字节跳动火山引擎语音识别服务',
                'supported_formats': ['wav', 'mp3', 'flac', 'm4a'],
                'supported_languages': ['zh', 'en']
            }
        }
        
        info = provider_info.get(provider, {})
        info['available'] = provider in self.asr_instances
        
        # 如果实例可用，获取实际支持的格式和语言
        if provider in self.asr_instances:
            try:
                instance = self.asr_instances[provider]
                info['supported_formats'] = instance.get_supported_formats()
                info['supported_languages'] = instance.get_supported_languages()
            except Exception as e:
                logger.warning(f"获取 {provider} 详细信息失败: {e}")
        
        return info
    
    def get_all_providers_info(self) -> Dict[str, Dict[str, Any]]:
        """获取所有提供商信息"""
        providers_info = {}
        for provider in ['baidu', 'xunfei', 'douyin', 'aliyun', 'tencent']:
            providers_info[provider] = self.get_provider_info(provider)
        return providers_info


# 全局ASR管理器实例
asr_manager = ASRManager()
