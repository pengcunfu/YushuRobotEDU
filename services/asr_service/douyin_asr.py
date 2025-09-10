"""
抖音（火山引擎）语音识别服务实现
"""
import io
import json
import struct
import asyncio
import logging
import os
import base64
import concurrent.futures
from typing import Dict, Any, List
from dataclasses import dataclass
from enum import IntEnum
import websockets
import ssl

from .asr_base import BaseASR
from .asr_models import ASRRequest, ASRResponse

logger = logging.getLogger(__name__)


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
    JSON = 0b1


class CompressionBits(IntEnum):
    """压缩方法位"""
    None_ = 0


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
        if len(data) < 3:
            raise ValueError(f"数据太短：期望至少3字节，得到{len(data)}")
        
        type_and_flag = data[1]
        msg_type = MsgType(type_and_flag >> 4)
        flag = MsgTypeFlagBits(type_and_flag & 0b00001111)
        
        msg = cls(type=msg_type, flag=flag)
        msg.unmarshal(data)
        return msg
    
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
        self.serialization = SerializationBits(serialization_compression >> 4)
        self.compression = CompressionBits(serialization_compression & 0b00001111)
        
        # 跳过头部填充
        header_size = 4 * self.header_size
        read_size = 3
        if padding_size := header_size - read_size:
            buffer.read(padding_size)
        
        # 读取其他字段
        readers = self._get_readers()
        for reader in readers:
            reader(buffer)
    
    def _get_writers(self) -> List:
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
    
    def _get_readers(self) -> List:
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


class DouyinASR(BaseASR):
    """抖音（火山引擎）语音识别实现类"""
    
    def _validate_config(self) -> None:
        """验证抖音ASR配置信息"""
        required_keys = ['access_key', 'secret_key', 'app_id']
        for key in required_keys:
            if key not in self.config:
                raise ValueError(f"抖音ASR配置缺少必要参数: {key}")
            if not self.config[key]:
                raise ValueError(f"抖音ASR配置参数 {key} 不能为空")
    
    def _init_client(self) -> None:
        """初始化抖音ASR客户端"""
        self.access_key = self.config['access_key']
        self.secret_key = self.config['secret_key']
        self.app_id = self.config['app_id']
        self.cluster = self.config.get('cluster', 'volcengine_streaming_common')
        self.endpoint = 'wss://openspeech.bytedance.com/api/v1/asr/ws'
        logger.info(f"豆包ASR客户端初始化成功，app_id: {self.app_id}")
    
    async def _asr_recognize_async(self, audio_file: str, language: str = 'zh-CN') -> str:
        """异步ASR识别"""
        # 禁用代理设置
        proxy_vars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'ALL_PROXY', 'all_proxy']
        old_proxy_values = {}
        
        for var in proxy_vars:
            old_proxy_values[var] = os.environ.get(var)
            if var in os.environ:
                del os.environ[var]
        
        logger.info("已禁用所有代理设置进行ASR请求")
        
        try:
            # 创建SSL上下文
            ssl_context = ssl.create_default_context()
            
            headers = {
                "Authorization": f"Bearer {self.access_key}:{self.secret_key}"
            }
            
            websocket = await websockets.connect(
                self.endpoint,
                additional_headers=headers,
                max_size=10 * 1024 * 1024,
                ssl=ssl_context,
                open_timeout=30,
                close_timeout=10
            )
            
            # 发送识别请求
            request = {
                "app": {"appid": self.app_id, "cluster": self.cluster},
                "user": {"uid": "default_user"},
                "audio": {
                    "format": "wav",
                    "rate": 16000,
                    "bits": 16,
                    "channel": 1,
                    "language": language
                },
                "request": {
                    "reqid": f"asr_request_{hash(audio_file)}",
                    "nbest": 1,
                    "word_info": 1,
                    "with_detail": 1
                }
            }
            
            # 发送请求消息
            msg = Message(type=MsgType.FullClientRequest, flag=MsgTypeFlagBits.NoSeq)
            msg.payload = json.dumps(request).encode()
            await websocket.send(msg.marshal())
            
            # 发送音频数据
            with open(audio_file, 'rb') as f:
                audio_data = f.read()
            
            # 分块发送音频数据
            chunk_size = 8192
            sequence = 1
            
            for i in range(0, len(audio_data), chunk_size):
                chunk = audio_data[i:i + chunk_size]
                is_last = i + chunk_size >= len(audio_data)
                
                audio_msg = Message(
                    type=MsgType.AudioOnlyClient,
                    flag=MsgTypeFlagBits.NegativeSeq if is_last else MsgTypeFlagBits.PositiveSeq,
                    sequence=sequence if not is_last else -sequence
                )
                audio_msg.payload = chunk
                await websocket.send(audio_msg.marshal())
                sequence += 1
            
            # 接收识别结果
            recognition_result = ""
            
            while True:
                try:
                    data = await websocket.recv()
                    if isinstance(data, bytes):
                        msg = Message.from_bytes(data)
                        
                        if msg.type == MsgType.FullServerResponse:
                            response = json.loads(msg.payload.decode())
                            if 'result' in response and 'text' in response['result']:
                                recognition_result = response['result']['text']
                                break
                        elif msg.type == MsgType.Error:
                            error_response = json.loads(msg.payload.decode()) if msg.payload else {}
                            error_msg = error_response.get('message', f'ASR错误，错误码: {msg.error_code}')
                            raise RuntimeError(f"ASR识别失败: {error_msg}")
                            
                except Exception as e:
                    if "connection closed" in str(e).lower():
                        logger.info("WebSocket连接关闭，识别完成")
                        break
                    else:
                        logger.error(f"接收消息时发生错误: {e}")
                        raise
            
            return recognition_result or "未识别到语音内容"
            
        except Exception as e:
            logger.error(f"ASR请求失败: {str(e)}")
            raise
        finally:
            try:
                await websocket.close()
            except:
                pass
            
            # 恢复代理设置
            for var, old_value in old_proxy_values.items():
                if old_value is not None:
                    os.environ[var] = old_value
            
            logger.info("已恢复代理设置")
    
    def recognize_file(self, 
                      audio_file: str, 
                      audio_format: str = 'wav',
                      sample_rate: int = 16000,
                      language: str = 'zh') -> ASRResponse:
        """
        执行抖音语音识别
        Args:
            audio_file: 音频文件路径
            audio_format: 音频格式
            sample_rate: 采样率
            language: 语言
        Returns:
            ASRResponse: 识别结果
        """
        try:
            # 语言映射
            lang_map = {
                'zh': 'zh-CN',
                'en': 'en-US'
            }
            language = lang_map.get(language, 'zh-CN')
            
            # 在新的事件循环中运行异步函数
            def run_async():
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    return loop.run_until_complete(self._asr_recognize_async(
                        audio_file=audio_file,
                        language=language
                    ))
                finally:
                    loop.close()
            
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(run_async)
                recognition_text = future.result()
            
            return ASRResponse(
                success=True,
                text=recognition_text,
                confidence=0.9,  # 豆包不返回置信度，使用默认值
                duration=0,  # TODO: 计算实际时长
                provider='douyin'
            )
            
        except Exception as e:
            logger.error(f"抖音ASR识别失败: {e}")
            return ASRResponse(
                success=False,
                error_msg=str(e)
            )
    
    def get_supported_formats(self) -> List[str]:
        """获取支持的音频格式"""
        return ['wav', 'mp3', 'flac', 'm4a']
    
    def get_supported_languages(self) -> List[str]:
        """获取支持的语言"""
        return ['zh', 'en']
