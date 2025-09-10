"""
TTS文本转语音服务管理器
"""
import os
import tempfile
import logging
from typing import Dict, Any, List, Optional
from .tts_models import TTSRequest, TTSResponse
from .baidu_tts import BaiduTTS
from .xunfei_tts import XunfeiTTS
from .douyin_tts import DouyinTTS
from .aliyun_tts import AliyunTTS
from .tencent_tts import TencentTTS

logger = logging.getLogger(__name__)


class TTSManager:
    """TTS管理器，负责管理所有TTS实例"""
    
    def __init__(self):
        self.tts_instances: Dict[str, Any] = {}
        self.tts_classes = {
            'baidu': BaiduTTS,
            'xunfei': XunfeiTTS,
            'douyin': DouyinTTS,
            'aliyun': AliyunTTS,
            'tencent': TencentTTS,
        }
    
    def initialize_tts_services(self, config: Dict[str, Any]) -> None:
        """
        根据配置初始化TTS实例
        Args:
            config: TTS配置字典
        """
        self.tts_instances.clear()
        
        for provider, provider_config in config.items():
            if provider in self.tts_classes and self._is_config_valid(provider_config):
                try:
                    self.tts_instances[provider] = self.tts_classes[provider](provider_config)
                    logger.info(f"成功初始化 {provider} TTS")
                except Exception as e:
                    logger.error(f"初始化 {provider} TTS 失败: {e}")
    
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
            'douyin': ['access_token', 'app_id'],
            'aliyun': ['access_key_id', 'access_key_secret', 'app_key'],
            'tencent': ['secret_id', 'secret_key']
        }
        
        # 通过检查是否有至少一个关键字段有值来判断配置是否有效
        # 这比检查所有字段更宽松，但比只检查任意非空值更严格
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
        获取可用的TTS提供商列表
        Returns:
            List[str]: 可用提供商列表
        """
        return list(self.tts_instances.keys())
    
    def synthesize_text(self,
                       provider: str,
                       text: str,
                       output_file: str = None,
                       voice: str = None,
                       speed: float = 1.0,
                       pitch: float = 1.0,
                       volume: float = 1.0,
                       language: str = 'zh',
                       audio_format: str = 'wav') -> TTSResponse:
        """
        合成文本为语音
        Args:
            provider: TTS提供商
            text: 要合成的文本
            output_file: 输出文件路径
            voice: 发音人
            speed: 语速
            pitch: 音调
            volume: 音量
            language: 语言
            audio_format: 音频格式
        Returns:
            TTSResponse: 合成结果
        """
        if provider not in self.tts_instances:
            return TTSResponse(
                text=text,
                success=False,
                error_msg=f'提供商 {provider} 未配置或不可用'
            )
        
        try:
            tts_instance = self.tts_instances[provider]
            return tts_instance.synthesize_text(
                text=text,
                output_file=output_file,
                voice=voice,
                speed=speed,
                pitch=pitch,
                volume=volume,
                language=language,
                audio_format=audio_format
            )
        except Exception as e:
            logger.error(f"调用 {provider} TTS 失败: {e}")
            return TTSResponse(
                text=text,
                success=False,
                error_msg=str(e)
            )
    
    def synthesize_to_memory(self,
                           provider: str,
                           text: str,
                           voice: str = None,
                           speed: float = 1.0,
                           pitch: float = 1.0,
                           volume: float = 1.0,
                           language: str = 'zh',
                           audio_format: str = 'wav') -> TTSResponse:
        """
        合成文本为语音（仅返回音频数据，不保存文件）
        Args:
            provider: TTS提供商
            text: 要合成的文本
            voice: 发音人
            speed: 语速
            pitch: 音调
            volume: 音量
            language: 语言
            audio_format: 音频格式
        Returns:
            TTSResponse: 合成结果
        """
        # 创建临时文件
        temp_file = None
        try:
            # 确定文件扩展名
            ext_map = {
                'wav': '.wav',
                'mp3': '.mp3',
                'pcm': '.pcm'
            }
            ext = ext_map.get(audio_format.lower(), '.wav')
            
            # 创建临时文件
            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as f:
                temp_file = f.name
            
            # 执行合成
            result = self.synthesize_text(
                provider=provider,
                text=text,
                output_file=temp_file,
                voice=voice,
                speed=speed,
                pitch=pitch,
                volume=volume,
                language=language,
                audio_format=audio_format
            )
            
            # 如果成功，读取文件内容到内存
            if result.success and os.path.exists(temp_file):
                with open(temp_file, 'rb') as f:
                    result.audio_data = f.read()
                result.file_size = len(result.audio_data)
            
            return result
            
        except Exception as e:
            logger.error(f"内存合成失败: {e}")
            return TTSResponse(
                text=text,
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
                'name': '百度语音合成',
                'description': '百度AI开放平台语音合成服务',
                'supported_formats': ['mp3'],
                'supported_languages': ['zh'],
                'supported_voices': [
                    {'id': 'female', 'name': '度小美', 'gender': 'female'},
                    {'id': 'male', 'name': '度小宇', 'gender': 'male'},
                    {'id': 'duyaya', 'name': '度逍遥', 'gender': 'male'},
                    {'id': 'duyanyan', 'name': '度丫丫', 'gender': 'female', 'age': 'child'},
                ]
            },
            'xunfei': {
                'name': '讯飞语音合成',
                'description': '科大讯飞语音合成服务',
                'supported_formats': ['wav', 'mp3'],
                'supported_languages': ['zh', 'en'],
                'supported_voices': [
                    {'id': 'female', 'name': '叶子', 'gender': 'female'},
                    {'id': 'male', 'name': '凌风', 'gender': 'male'},
                    {'id': 'xiaoyan', 'name': '小燕', 'gender': 'female'},
                    {'id': 'xiaoyu', 'name': '小宇', 'gender': 'male'},
                ]
            },
            'aliyun': {
                'name': '阿里云语音合成',
                'description': '阿里云智能语音合成服务',
                'supported_formats': ['wav', 'mp3'],
                'supported_languages': ['zh', 'en'],
                'supported_voices': [
                    {'id': 'Xiaoyun', 'name': '小云', 'gender': 'female', 'language': 'zh'},
                    {'id': 'Xiaogang', 'name': '小刚', 'gender': 'male', 'language': 'zh'},
                    {'id': 'Ruoxi', 'name': '若汐', 'gender': 'female', 'language': 'zh'},
                    {'id': 'Siqi', 'name': '思琪', 'gender': 'female', 'language': 'zh'},
                ]
            },
            'tencent': {
                'name': '腾讯云语音合成',
                'description': '腾讯云语音合成服务',
                'supported_formats': ['wav', 'mp3'],
                'supported_languages': ['zh', 'en'],
                'supported_voices': [
                    {'id': '101001', 'name': '智瑜', 'gender': 'female', 'language': 'zh'},
                    {'id': '101002', 'name': '智聆', 'gender': 'female', 'language': 'zh'},
                    {'id': '101003', 'name': '智美', 'gender': 'female', 'language': 'zh'},
                    {'id': '101004', 'name': '智云', 'gender': 'male', 'language': 'zh'},
                    {'id': '101005', 'name': '智莉', 'gender': 'female', 'language': 'zh'},
                ]
            },
            'douyin': {
                'name': '抖音语音合成',
                'description': '字节跳动火山引擎语音合成服务',
                'supported_formats': ['wav', 'mp3'],
                'supported_languages': ['zh', 'en'],
                'supported_voices': [
                    {'id': 'zh_male_beijingxiaoye_emo_v2_mars_bigtts', 'name': '北京小爷', 'gender': 'male', 'language': 'zh'},
                    {'id': 'zh_female_xiaoxin_emo_v2_mars_bigtts', 'name': '小欣', 'gender': 'female', 'language': 'zh'},
                    {'id': 'zh_male_xiaofeng_emo_v2_mars_bigtts', 'name': '小峰', 'gender': 'male', 'language': 'zh'},
                    {'id': 'zh_female_xiaoli_emo_v2_mars_bigtts', 'name': '小丽', 'gender': 'female', 'language': 'zh'},
                    {'id': 'zh_male_dongbeixiaogang_emo_v2_mars_bigtts', 'name': '东北小刚', 'gender': 'male', 'language': 'zh'},
                ]
            }
        }
        
        info = provider_info.get(provider, {})
        info['available'] = provider in self.tts_instances
        
        # 如果实例可用，获取实际支持的信息
        if provider in self.tts_instances:
            try:
                instance = self.tts_instances[provider]
                info['supported_formats'] = instance.get_supported_formats()
                info['supported_languages'] = instance.get_supported_languages()
                info['supported_voices'] = instance.get_supported_voices()
            except Exception as e:
                logger.warning(f"获取 {provider} 详细信息失败: {e}")
        
        return info
    
    def synthesize_text_stream(self,
                              provider: str,
                              text: str,
                              voice: str = None,
                              speed: float = 1.0,
                              pitch: float = 1.0,
                              volume: float = 1.0,
                              language: str = 'zh',
                              audio_format: str = 'wav',
                              stream_callback=None,
                              session_id: str = None) -> TTSResponse:
        """
        流式合成文本为语音
        Args:
            provider: TTS提供商
            text: 要合成的文本
            voice: 发音人
            speed: 语速
            pitch: 音调
            volume: 音量
            language: 语言
            audio_format: 音频格式
            stream_callback: 流式回调函数
            session_id: 会话ID
        Returns:
            TTSResponse: 合成结果
        """
        if provider not in self.tts_instances:
            return TTSResponse(
                text=text,
                success=False,
                error_msg=f'提供商 {provider} 未配置或不可用'
            )
        
        try:
            tts_instance = self.tts_instances[provider]
            
            # 检查是否支持流式合成
            if hasattr(tts_instance, 'synthesize_text_stream'):
                return tts_instance.synthesize_text_stream(
                    text=text,
                    voice=voice,
                    speed=speed,
                    pitch=pitch,
                    volume=volume,
                    language=language,
                    audio_format=audio_format,
                    stream_callback=stream_callback,
                    session_id=session_id
                )
            else:
                # 回退到普通合成
                logger.warning(f"提供商 {provider} 不支持流式合成，使用普通合成")
                return tts_instance.synthesize_text(
                    text=text,
                    voice=voice,
                    speed=speed,
                    pitch=pitch,
                    volume=volume,
                    language=language,
                    audio_format=audio_format
                )
        except Exception as e:
            logger.error(f"调用 {provider} TTS 流式合成失败: {e}")
            return TTSResponse(
                text=text,
                success=False,
                error_msg=str(e)
            )

    def get_all_providers_info(self) -> Dict[str, Dict[str, Any]]:
        """获取所有提供商信息"""
        providers_info = {}
        for provider in ['baidu', 'xunfei', 'douyin', 'aliyun', 'tencent']:
            providers_info[provider] = self.get_provider_info(provider)
        return providers_info
    
    def get_supported_voices_by_provider(self, provider: str) -> List[Dict[str, Any]]:
        """获取指定提供商支持的发音人列表"""
        if provider in self.tts_instances:
            try:
                return self.tts_instances[provider].get_supported_voices()
            except Exception as e:
                logger.warning(f"获取 {provider} 发音人列表失败: {e}")
        return []


# 全局TTS管理器实例
tts_manager = TTSManager()
