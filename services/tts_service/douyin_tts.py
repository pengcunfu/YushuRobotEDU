"""
抖音（火山引擎）语音合成服务实现
支持流式语音合成和多种音色选择
"""
import asyncio
import io
import struct
import json
import uuid
import base64
from loguru import logger
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass
from enum import IntEnum
import websockets
import ssl
import os
from urllib.parse import urlparse

from .tts_base import BaseTTS
from .tts_models import TTSRequest, TTSResponse

# 使用loguru作为日志库


class MsgType(IntEnum):
    """消息类型枚举"""
    Invalid = 0
    FullClientRequest = 0b1
    AudioOnlyClient = 0b10
    FullServerResponse = 0b1001
    AudioOnlyServer = 0b1011
    FrontEndResultServer = 0b1100
    Error = 0b1111
    ServerACK = AudioOnlyServer


class MsgTypeFlagBits(IntEnum):
    """消息类型标志位"""
    NoSeq = 0
    PositiveSeq = 0b1
    LastNoSeq = 0b10
    NegativeSeq = 0b11
    WithEvent = 0b100


class VersionBits(IntEnum):
    """版本位"""
    Version1 = 1


class HeaderSizeBits(IntEnum):
    """头部大小位"""
    HeaderSize4 = 1


class SerializationBits(IntEnum):
    """序列化方法位"""
    Raw = 0
    JSON = 0b1
    Thrift = 0b11
    Custom = 0b1111


class CompressionBits(IntEnum):
    """压缩方法位"""
    None_ = 0
    Gzip = 0b1
    Custom = 0b1111


class EventType(IntEnum):
    """事件类型枚举"""
    None_ = 0
    StartConnection = 1
    FinishConnection = 2
    StartSession = 100
    FinishSession = 102
    TaskRequest = 200


@dataclass
class Message:
    """消息对象"""
    version: VersionBits = VersionBits.Version1
    header_size: HeaderSizeBits = HeaderSizeBits.HeaderSize4
    type: MsgType = MsgType.Invalid
    flag: MsgTypeFlagBits = MsgTypeFlagBits.NoSeq
    serialization: SerializationBits = SerializationBits.JSON
    compression: CompressionBits = CompressionBits.None_
    event: EventType = EventType.None_
    session_id: str = ""
    connect_id: str = ""
    sequence: int = 0
    error_code: int = 0
    payload: bytes = b""
    
    @classmethod
    def from_bytes(cls, data: bytes) -> "Message":
        """从字节创建消息对象"""
        try:
            if len(data) < 3:
                raise ValueError(f"数据太短：期望至少3字节，得到{len(data)}")
            
            logger.debug(f"解析消息，数据长度: {len(data)}，前8字节: {data[:8].hex()}")
            
            type_and_flag = data[1]
            msg_type_value = type_and_flag >> 4
            flag_value = type_and_flag & 0b00001111
            
            logger.debug(f"消息类型值: {msg_type_value}, 标志值: {flag_value}")
            
            msg_type = MsgType(msg_type_value)
            flag = MsgTypeFlagBits(flag_value)
            
            msg = cls(type=msg_type, flag=flag)
            msg.unmarshal(data)
            return msg
        except Exception as e:
            logger.error(f"解析消息失败: {e}")
            logger.error(f"消息数据: {data[:min(len(data), 20)].hex()}")
            raise
    
    def marshal(self) -> bytes:
        """序列化消息为字节"""
        buffer = io.BytesIO()
        
        # 写入头部
        header = [
            (self.version << 4) | self.header_size,
            (self.type << 4) | self.flag,
            (self.serialization << 4) | self.compression,
        ]
        
        header_size = 4 * self.header_size
        if padding := header_size - len(header):
            header.extend([0] * padding)
        
        buffer.write(bytes(header))
        
        # 写入其他字段
        writers = self._get_writers()
        for writer in writers:
            writer(buffer)
        
        return buffer.getvalue()
    
    def unmarshal(self, data: bytes) -> None:
        """从字节反序列化消息"""
        buffer = io.BytesIO(data)
        
        # 读取版本和头部大小
        version_and_header_size = buffer.read(1)[0]
        self.version = VersionBits(version_and_header_size >> 4)
        self.header_size = HeaderSizeBits(version_and_header_size & 0b00001111)
        
        # 跳过第二字节
        buffer.read(1)
        
        # 读取序列化和压缩方法
        serialization_compression = buffer.read(1)[0]
        try:
            serialization_value = serialization_compression >> 4
            compression_value = serialization_compression & 0b00001111
            logger.debug(f"解析消息头: serialization_value={serialization_value}, compression_value={compression_value}")
            self.serialization = SerializationBits(serialization_value)
            self.compression = CompressionBits(compression_value)
        except ValueError as e:
            logger.error(f"解析消息头失败: {e}")
            logger.error(f"原始字节: {data[:10].hex()} (前10字节)")
            logger.error(f"serialization_compression: {serialization_compression:08b} ({serialization_compression})")
            logger.error(f"serialization_value: {serialization_value}, compression_value: {compression_value}")
            raise
        
        # 跳过头部填充
        header_size = 4 * self.header_size
        read_size = 3
        if padding_size := header_size - read_size:
            buffer.read(padding_size)
        
        # 读取其他字段
        readers = self._get_readers()
        for reader in readers:
            reader(buffer)
    
    def _get_writers(self) -> List[Callable[[io.BytesIO], None]]:
        """获取写入函数列表"""
        writers = []
        
        if self.flag == MsgTypeFlagBits.WithEvent:
            writers.extend([self._write_event, self._write_session_id])
        
        if self.type in [
            MsgType.FullClientRequest,
            MsgType.FullServerResponse,
            MsgType.FrontEndResultServer,
            MsgType.AudioOnlyClient,
            MsgType.AudioOnlyServer,
        ]:
            if self.flag in [MsgTypeFlagBits.PositiveSeq, MsgTypeFlagBits.NegativeSeq]:
                writers.append(self._write_sequence)
        elif self.type == MsgType.Error:
            writers.append(self._write_error_code)
        
        writers.append(self._write_payload)
        return writers
    
    def _get_readers(self) -> List[Callable[[io.BytesIO], None]]:
        """获取读取函数列表"""
        readers = []
        
        if self.type in [
            MsgType.FullClientRequest,
            MsgType.FullServerResponse,
            MsgType.FrontEndResultServer,
            MsgType.AudioOnlyClient,
            MsgType.AudioOnlyServer,
        ]:
            if self.flag in [MsgTypeFlagBits.PositiveSeq, MsgTypeFlagBits.NegativeSeq]:
                readers.append(self._read_sequence)
        elif self.type == MsgType.Error:
            readers.append(self._read_error_code)
        
        if self.flag == MsgTypeFlagBits.WithEvent:
            readers.extend([self._read_event, self._read_session_id, self._read_connect_id])
        
        readers.append(self._read_payload)
        return readers
    
    def _write_event(self, buffer: io.BytesIO) -> None:
        """写入事件"""
        buffer.write(struct.pack(">i", self.event))
    
    def _write_session_id(self, buffer: io.BytesIO) -> None:
        """写入会话ID"""
        if self.event in [EventType.StartConnection, EventType.FinishConnection]:
            return
        
        session_id_bytes = self.session_id.encode("utf-8")
        size = len(session_id_bytes)
        if size > 0xFFFFFFFF:
            raise ValueError(f"会话ID大小({size})超过最大值(uint32)")
        
        buffer.write(struct.pack(">I", size))
        if size > 0:
            buffer.write(session_id_bytes)
    
    def _write_sequence(self, buffer: io.BytesIO) -> None:
        """写入序列号"""
        buffer.write(struct.pack(">i", self.sequence))
    
    def _write_error_code(self, buffer: io.BytesIO) -> None:
        """写入错误码"""
        buffer.write(struct.pack(">I", self.error_code))
    
    def _write_payload(self, buffer: io.BytesIO) -> None:
        """写入载荷"""
        size = len(self.payload)
        if size > 0xFFFFFFFF:
            raise ValueError(f"载荷大小({size})超过最大值(uint32)")
        
        buffer.write(struct.pack(">I", size))
        buffer.write(self.payload)
    
    def _read_event(self, buffer: io.BytesIO) -> None:
        """读取事件"""
        event_bytes = buffer.read(4)
        if event_bytes:
            self.event = EventType(struct.unpack(">i", event_bytes)[0])
    
    def _read_session_id(self, buffer: io.BytesIO) -> None:
        """读取会话ID"""
        if self.event in [EventType.StartConnection, EventType.FinishConnection]:
            return
        
        size_bytes = buffer.read(4)
        if size_bytes:
            size = struct.unpack(">I", size_bytes)[0]
            if size > 0:
                session_id_bytes = buffer.read(size)
                if len(session_id_bytes) == size:
                    self.session_id = session_id_bytes.decode("utf-8")
    
    def _read_connect_id(self, buffer: io.BytesIO) -> None:
        """读取连接ID"""
        size_bytes = buffer.read(4)
        if size_bytes:
            size = struct.unpack(">I", size_bytes)[0]
            if size > 0:
                self.connect_id = buffer.read(size).decode("utf-8")
    
    def _read_sequence(self, buffer: io.BytesIO) -> None:
        """读取序列号"""
        sequence_bytes = buffer.read(4)
        if sequence_bytes:
            self.sequence = struct.unpack(">i", sequence_bytes)[0]
    
    def _read_error_code(self, buffer: io.BytesIO) -> None:
        """读取错误码"""
        error_code_bytes = buffer.read(4)
        if error_code_bytes:
            self.error_code = struct.unpack(">I", error_code_bytes)[0]
    
    def _read_payload(self, buffer: io.BytesIO) -> None:
        """读取载荷"""
        size_bytes = buffer.read(4)
        if size_bytes:
            size = struct.unpack(">I", size_bytes)[0]
            if size > 0:
                self.payload = buffer.read(size)


class DouyinTTS(BaseTTS):
    """抖音（火山引擎）语音合成实现类"""
    
    def _validate_config(self) -> None:
        """验证抖音TTS配置信息"""
        required_keys = ['access_token', 'app_id']
        for key in required_keys:
            if key not in self.config:
                raise ValueError(f"抖音TTS配置缺少必要参数: {key}")
            if not self.config[key]:
                raise ValueError(f"抖音TTS配置参数 {key} 不能为空")
    
    def _init_client(self) -> None:
        """初始化抖音TTS客户端"""
        self.access_token = self.config['access_token']
        self.app_id = self.config['app_id']
        self.endpoint = self.config.get('endpoint', 'wss://openspeech.bytedance.com/api/v1/tts/ws_binary')
        self.cluster = self.config.get('cluster', 'volcano_tts')
        self.default_voice = self.config.get('voice_type', 'zh_male_beijingxiaoye_emo_v2_mars_bigtts')
        logger.info(f"豆包TTS客户端初始化成功，app_id: {self.app_id}, 默认发音人: {self.default_voice}")
    
    def synthesize(self, request: TTSRequest) -> TTSResponse:
        """
        执行文本转语音（实现抽象方法）
        Args:
            request: TTS请求参数
        Returns:
            TTSResponse: 合成结果
        """
        return self.synthesize_text(
            text=request.text,
            output_file=request.output_file,
            voice=request.voice,
            speed=request.speed,
            pitch=request.pitch,
            volume=request.volume,
            language=request.language,
            audio_format=request.audio_format
        )
    
    async def _receive_message(self, websocket) -> Message:
        """接收WebSocket消息"""
        try:
            data = await websocket.recv()
            if isinstance(data, str):
                raise ValueError(f"意外的文本消息: {data}")
            elif isinstance(data, bytes):
                msg = Message.from_bytes(data)
                logger.debug(f"接收到消息: {msg.type}")
                return msg
            else:
                raise ValueError(f"意外的消息类型: {type(data)}")
        except Exception as e:
            if "keepalive ping timeout" in str(e) or "no close frame received" in str(e):
                logger.debug(f"WebSocket keepalive超时(正常连接结束): {e}")
                raise
            elif "connection closed" in str(e).lower():
                logger.debug(f"WebSocket连接关闭(正常): {e}")
                raise
            else:
                logger.error(f"接收消息失败: {e}")
                raise
    
    async def _full_client_request(self, websocket, payload: bytes) -> None:
        """发送完整客户端消息"""
        msg = Message(type=MsgType.FullClientRequest, flag=MsgTypeFlagBits.NoSeq)
        msg.payload = payload
        logger.debug(f"发送消息: {msg.type}")
        await websocket.send(msg.marshal())
    
    async def _tts_synthesize_async(self, text: str, output_file: str = None,
                                   voice_type: str = None, encoding: str = "wav",
                                   stream_callback: Callable = None, 
                                   session_id: str = None) -> bytes:
        """异步TTS合成"""
        voice_type = voice_type or self.default_voice
        cluster = "volcano_icl" if voice_type.startswith("S_") else self.cluster
        headers = {"Authorization": f"Bearer;{self.access_token}"}
        
        # 禁用所有可能的代理设置
        proxy_vars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'ALL_PROXY', 'all_proxy']
        old_proxy_values = {}
        
        # 保存并清除所有代理环境变量
        for var in proxy_vars:
            old_proxy_values[var] = os.environ.get(var)
            if var in os.environ:
                del os.environ[var]

        logger.info("已禁用所有代理设置进行TTS请求")

        # 临时禁用代理检测函数
        import urllib.request
        original_getproxies = urllib.request.getproxies
        urllib.request.getproxies = lambda: {}
        
        # 也禁用socket级别的代理检测
        original_get_proxy = None
        try:
            import httpx._utils
            original_get_proxy = getattr(httpx._utils, 'get_proxy', None)
            if original_get_proxy:
                httpx._utils.get_proxy = lambda *args, **kwargs: None
        except ImportError:
            pass

        try:
            # 完全绕过代理的连接方法
            from urllib.parse import urlparse
            
            # 解析WebSocket URL
            parsed_url = urlparse(self.endpoint)
            host = parsed_url.hostname
            port = parsed_url.port or (443 if parsed_url.scheme == 'wss' else 80)
            
            # 创建直接的socket连接，绕过代理
            logger.info(f"正在直接连接到 {host}:{port}")
            
            # 创建SSL上下文（如果需要）
            ssl_context = None
            if self.endpoint.startswith('wss://'):
                ssl_context = ssl.create_default_context()
            
            # 使用websockets.connect，但通过禁用代理环境变量来确保直连
            websocket = await websockets.connect(
                self.endpoint,
                additional_headers=headers,
                max_size=10 * 1024 * 1024,
                ssl=ssl_context,
                # 添加连接超时设置
                open_timeout=30,
                close_timeout=10
            )
            
            request = {
                "app": {"appid": self.app_id, "token": self.access_token, "cluster": cluster},
                "user": {"uid": str(uuid.uuid4())},
                "audio": {"voice_type": voice_type, "encoding": encoding},
                "request": {
                    "reqid": str(uuid.uuid4()),
                    "text": text,
                    "operation": "submit",
                    "with_timestamp": "1",
                    "extra_param": json.dumps({"disable_markdown_filter": False}),
                },
            }
            
            await self._full_client_request(websocket, json.dumps(request).encode())
            
            audio_data = bytearray()
            chunk_count = 0
            
            while True:
                try:
                    msg = await self._receive_message(websocket)
                except Exception as e:
                    if "keepalive ping timeout" in str(e) or "no close frame received" in str(e):
                        logger.info("WebSocket连接因keepalive timeout结束，音频数据接收完成")
                        break
                    elif "connection closed" in str(e).lower():
                        logger.info("WebSocket连接关闭，音频数据接收完成")
                        break
                    else:
                        logger.error(f"接收消息时发生错误: {e}")
                        raise
                
                if msg.type == MsgType.FrontEndResultServer:
                    continue
                elif msg.type == MsgType.AudioOnlyServer:
                    chunk_data = msg.payload
                    audio_data.extend(chunk_data)
                    chunk_count += 1
                    
                    # 流式回调
                    if stream_callback and session_id and len(chunk_data) > 0:
                        chunk_base64 = base64.b64encode(chunk_data).decode('utf-8')
                        stream_callback(
                            session_id, 'tts_stream',
                            chunk_base64,
                            chunk_count=chunk_count,
                            total_size=len(audio_data),
                            is_final=(msg.sequence < 0)
                        )
                        logger.debug(f"🔊 TTS流式输出第{chunk_count}块，大小: {len(chunk_data)} bytes")
                    
                    if msg.sequence < 0:
                        # 发送完成信号
                        if stream_callback and session_id:
                            stream_callback(
                                session_id, 'tts_stream_complete',
                                f"TTS合成完成，共{chunk_count}块音频数据",
                                chunk_count=chunk_count,
                                total_size=len(audio_data),
                                is_final=True
                            )
                        break
                else:
                    raise RuntimeError(f"TTS转换失败: {msg}")
            
            if not audio_data:
                raise RuntimeError("未接收到音频数据")
            
            if output_file:
                with open(output_file, "wb") as f:
                    f.write(audio_data)
            
            return bytes(audio_data)
            
        except Exception as e:
            logger.error(f"TTS请求失败: {str(e)}")
            raise
        finally:
            try:
                await websocket.close()
            except:
                pass

            # 恢复原来的代理设置
            for var, old_value in old_proxy_values.items():
                if old_value is not None:
                    os.environ[var] = old_value
            
            # 恢复代理检测函数
            urllib.request.getproxies = original_getproxies
            try:
                if original_get_proxy:
                    httpx._utils.get_proxy = original_get_proxy
            except (NameError, ImportError):
                pass

            logger.info("已恢复代理设置")
    
    def synthesize_text(self,
                       text: str,
                       output_file: str = None,
                       voice: str = None,
                       speed: float = 1.0,
                       pitch: float = 1.0,
                       volume: float = 1.0,
                       language: str = 'zh',
                       audio_format: str = 'wav') -> TTSResponse:
        """
        执行抖音语音合成
        Args:
            text: 要转换的文本
            output_file: 输出音频文件路径
            voice: 发音人
            speed: 语速
            pitch: 音高
            volume: 音量
            language: 语言
            audio_format: 音频格式
        Returns:
            TTSResponse: 合成结果
        """
        try:
            # 在新的事件循环中运行异步函数
            import concurrent.futures
            
            def run_async():
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    return loop.run_until_complete(self._tts_synthesize_async(
                        text=text,
                        output_file=output_file,
                        voice_type=voice,
                        encoding=audio_format
                    ))
                finally:
                    loop.close()
            
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(run_async)
                audio_data = future.result()
            
            return TTSResponse(
                text=text,
                success=True,
                audio_file=output_file,
                audio_data=audio_data,
                file_size=len(audio_data),
                duration=0,  # TODO: 计算实际时长
                extra_info={
                    'format': audio_format,
                    'voice': voice or self.default_voice,
                    'provider': 'douyin'
                }
            )
            
        except Exception as e:
            logger.error(f"抖音TTS合成失败: {e}")
            user_friendly_error = self._parse_error_message(e)
            return TTSResponse(
                text=text,
                success=False,
                error_msg=user_friendly_error
            )
    
    def synthesize_text_stream(self,
                              text: str,
                              voice: str = None,
                              speed: float = 1.0,
                              pitch: float = 1.0,
                              volume: float = 1.0,
                              language: str = 'zh',
                              audio_format: str = 'wav',
                              stream_callback: Callable = None,
                              session_id: str = None) -> TTSResponse:
        """
        执行流式抖音语音合成
        Args:
            text: 要转换的文本
            voice: 发音人
            speed: 语速
            pitch: 音高
            volume: 音量
            language: 语言
            audio_format: 音频格式
            stream_callback: 流式回调函数
            session_id: 会话ID
        Returns:
            TTSResponse: 合成结果
        """
        try:
            # 在新的事件循环中运行异步函数
            import concurrent.futures
            
            def run_async():
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    return loop.run_until_complete(self._tts_synthesize_async(
                        text=text,
                        voice_type=voice,
                        encoding=audio_format,
                        stream_callback=stream_callback,
                        session_id=session_id
                    ))
                finally:
                    loop.close()
            
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(run_async)
                audio_data = future.result()
            
            return TTSResponse(
                text=text,
                success=True,
                audio_data=audio_data,
                file_size=len(audio_data),
                duration=0,  # TODO: 计算实际时长
                extra_info={
                    'format': audio_format,
                    'voice': voice or self.default_voice,
                    'provider': 'douyin'
                }
            )
            
        except Exception as e:
            logger.error(f"抖音TTS流式合成失败: {e}")
            user_friendly_error = self._parse_error_message(e)
            return TTSResponse(
                text=text,
                success=False,
                error_msg=user_friendly_error
            )
    
    def get_supported_voices(self) -> List[Dict[str, Any]]:
        """获取支持的发音人列表"""
        return [
            {'id': 'zh_male_beijingxiaoye_emo_v2_mars_bigtts', 'name': '北京小爷', 'gender': 'male', 'language': 'zh'},
            {'id': 'zh_female_xiaoxin_emo_v2_mars_bigtts', 'name': '小欣', 'gender': 'female', 'language': 'zh'},
            {'id': 'zh_male_xiaofeng_emo_v2_mars_bigtts', 'name': '小峰', 'gender': 'male', 'language': 'zh'},
            {'id': 'zh_female_xiaoli_emo_v2_mars_bigtts', 'name': '小丽', 'gender': 'female', 'language': 'zh'},
            {'id': 'zh_male_dongbeixiaogang_emo_v2_mars_bigtts', 'name': '东北小刚', 'gender': 'male', 'language': 'zh'},
        ]
    
    def get_supported_formats(self) -> List[str]:
        """获取支持的音频格式"""
        return ['wav', 'mp3']
    
    def get_supported_languages(self) -> List[str]:
        """获取支持的语言"""
        return ['zh', 'en']
    
    def _parse_error_message(self, error: Exception) -> str:
        """
        解析抖音TTS错误消息，转换为用户友好的提示
        Args:
            error: 原始错误异常
        Returns:
            str: 用户友好的错误消息
        """
        error_str = str(error)
        
        # 检查是否包含错误代码和消息
        if "error_code=3003" in error_str and "quota exceeded" in error_str:
            if "text_words_lifetime" in error_str:
                return "抖音TTS服务配额已用完，请联系管理员充值或切换到其他TTS服务商"
            elif "text_words_daily" in error_str:
                return "抖音TTS服务今日配额已用完，请明天再试或切换到其他TTS服务商"
            else:
                return "抖音TTS服务配额不足，请联系管理员处理"
        
        # 检查其他常见错误
        if "error_code=1001" in error_str:
            return "抖音TTS服务认证失败，请检查API密钥配置"
        elif "error_code=1002" in error_str:
            return "抖音TTS服务参数错误，请检查语音参数设置"
        elif "error_code=2001" in error_str:
            return "抖音TTS服务网络连接失败，请检查网络连接"
        elif "connection" in error_str.lower() and "timeout" in error_str.lower():
            return "抖音TTS服务连接超时，请稍后重试"
        elif "websocket" in error_str.lower():
            return "抖音TTS服务连接异常，请稍后重试"
        elif "invalid" in error_str.lower() and "token" in error_str.lower():
            return "抖音TTS服务访问令牌无效，请检查配置"
        
        # 如果无法识别具体错误，返回通用消息
        return f"抖音TTS服务暂时不可用，请稍后重试或联系管理员。错误详情：{error_str[:100]}..."
