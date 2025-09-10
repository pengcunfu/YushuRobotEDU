from fastapi import APIRouter, HTTPException, Depends, Form, Header
from fastapi.responses import FileResponse, StreamingResponse, Response
from typing import Dict, Any, Optional, AsyncGenerator
from pydantic import BaseModel, Field
import logging
import os
import tempfile
import io
import json
import uuid
import asyncio
import base64
from concurrent.futures import ThreadPoolExecutor

from services.tts_service.tts_manager import tts_manager
from services.config_service.config_center_service import config_center_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tts", tags=["TTS"])


# ===== 请求模型 =====

class TTSRequest(BaseModel):
    """TTS合成请求模型"""
    text: str = Field(description="要合成的文本")
    provider: Optional[str] = Field(default=None, description="TTS提供商，默认使用配置中的默认提供商")
    voice: Optional[str] = Field(default=None, description="发音人")
    speed: float = Field(default=1.0, ge=0.5, le=2.0, description="语速")
    pitch: float = Field(default=1.0, ge=0.5, le=2.0, description="音调")
    volume: float = Field(default=1.0, ge=0.5, le=2.0, description="音量")
    language: str = Field(default="zh", description="语言")
    audio_format: str = Field(default="wav", description="音频格式")


class TTSStreamRequest(BaseModel):
    """TTS流式合成请求模型"""
    text: str = Field(description="要合成的文本")
    provider: Optional[str] = Field(default=None, description="TTS提供商，默认使用配置中的默认提供商")
    voice: Optional[str] = Field(default=None, description="发音人")
    speed: float = Field(default=1.0, ge=0.5, le=2.0, description="语速")
    pitch: float = Field(default=1.0, ge=0.5, le=2.0, description="音调")
    volume: float = Field(default=1.0, ge=0.5, le=2.0, description="音量")
    language: str = Field(default="zh", description="语言")
    audio_format: str = Field(default="wav", description="音频格式")


class ConfigUpdateRequest(BaseModel):
    """配置更新请求模型"""
    config: Dict[str, Any] = Field(description="TTS配置数据")


# ===== 响应模型 =====

class TTSResponse(BaseModel):
    """TTS合成响应模型"""
    success: bool
    text: Optional[str] = None
    provider: Optional[str] = None
    duration: Optional[float] = None
    audio_length: Optional[float] = None
    file_size: Optional[int] = None
    download_url: Optional[str] = None
    error: Optional[str] = None


class ProvidersResponse(BaseModel):
    """提供商响应模型"""
    providers: list
    provider_info: Dict[str, Dict[str, Any]]


class VoicesResponse(BaseModel):
    """发音人响应模型"""
    voices: list


# ===== 依赖函数 =====

def get_tts_config():
    """获取TTS配置"""
    try:
        config_data = config_center_service.get_config_sync("tts")
        return config_data
    except Exception as e:
        logger.error(f"获取TTS配置失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取TTS配置失败: {str(e)}")


def initialize_tts_if_needed():
    """根据需要初始化TTS"""
    try:
        config = get_tts_config()
        if config and config.get('enabled', True):
            # 提取各提供商的配置
            provider_configs = {}
            for provider in ['baidu', 'xunfei', 'aliyun', 'tencent', 'douyin']:
                provider_config = config.get(provider, {})
                if provider_config and any(v for v in provider_config.values() if v):
                    provider_configs[provider] = provider_config

            # 初始化TTS实例
            tts_manager.initialize_tts_services(provider_configs)

        return config
    except Exception as e:
        logger.error(f"初始化TTS失败: {e}")
        raise HTTPException(status_code=500, detail=f"初始化TTS失败: {str(e)}")


# ===== API路由 =====

@router.get("/providers", response_model=ProvidersResponse)
async def get_providers():
    """获取可用的TTS提供商列表"""
    try:
        initialize_tts_if_needed()

        available_providers = tts_manager.get_available_providers()
        provider_info = tts_manager.get_all_providers_info()

        return ProvidersResponse(
            providers=available_providers,
            provider_info=provider_info
        )
    except Exception as e:
        logger.error(f"获取TTS提供商列表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/voices/{provider}", response_model=VoicesResponse)
async def get_voices(provider: str):
    """获取指定提供商的发音人列表"""
    try:
        initialize_tts_if_needed()

        available_providers = tts_manager.get_available_providers()
        if provider not in available_providers:
            raise HTTPException(
                status_code=400,
                detail=f"提供商 {provider} 不可用。可用提供商: {', '.join(available_providers)}"
            )

        voices = tts_manager.get_supported_voices_by_provider(provider)

        return VoicesResponse(voices=voices)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取发音人列表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/synthesize")
async def synthesize_text(request: TTSRequest, accept: Optional[str] = Header(None)):
    """文本转语音合成"""
    try:
        # 初始化TTS（如果需要）
        config = initialize_tts_if_needed()

        if not config or not config.get('enabled', True):
            raise HTTPException(status_code=400, detail="TTS服务未启用")

        # 验证文本
        if not request.text or len(request.text.strip()) == 0:
            raise HTTPException(status_code=400, detail="文本内容不能为空")

        if len(request.text) > 10000:
            raise HTTPException(status_code=400, detail="文本长度不能超过10000个字符")

        # 确定使用的提供商
        provider = request.provider or config.get('default_provider', 'baidu')

        # 检查提供商是否可用
        available_providers = tts_manager.get_available_providers()
        if provider not in available_providers:
            raise HTTPException(
                status_code=400,
                detail=f"提供商 {provider} 不可用。可用提供商: {', '.join(available_providers)}"
            )

        # 执行合成
        result = tts_manager.synthesize_to_memory(
            provider=provider,
            text=request.text,
            voice=request.voice,
            speed=request.speed,
            pitch=request.pitch,
            volume=request.volume,
            language=request.language,
            audio_format=request.audio_format
        )

        if result.success:
            # 检查是否直接返回音频数据
            if accept and 'audio/' in accept:
                # 直接返回音频数据
                return Response(
                    content=result.audio_data,
                    media_type="audio/mpeg",
                    headers={
                        "Content-Disposition": "attachment; filename=tts_audio.mp3",
                        "Content-Length": str(len(result.audio_data))
                    }
                )
            
            # 生成下载URL（这里简化处理，实际项目中可能需要更复杂的文件管理）
            download_url = f"/api/tts/download/{provider}_{int(result.timestamp)}"

            # 临时存储音频数据（实际项目中应该使用更好的存储方案）
            if not hasattr(tts_manager, '_temp_audio_cache'):
                tts_manager._temp_audio_cache = {}

            cache_key = f"{provider}_{int(result.timestamp)}"
            tts_manager._temp_audio_cache[cache_key] = {
                'data': result.audio_data,
                'format': request.audio_format,
                'filename': f"tts_{cache_key}.{request.audio_format}"
            }

            return TTSResponse(
                success=True,
                text=request.text,
                provider=provider,
                duration=result.duration,
                audio_length=result.audio_length,
                file_size=result.file_size,
                download_url=download_url
            )
        else:
            return TTSResponse(
                success=False,
                text=request.text,
                error=result.error_msg
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"文本转语音请求失败: {e}")
        return TTSResponse(
            success=False,
            text=request.text,
            error=str(e)
        )


@router.post("/synthesize/stream")
async def synthesize_text_stream(request: TTSStreamRequest):
    """流式文本转语音合成"""
    try:
        # 初始化TTS（如果需要）
        config = initialize_tts_if_needed()

        if not config or not config.get('enabled', True):
            raise HTTPException(status_code=400, detail="TTS服务未启用")

        # 验证文本
        if not request.text or len(request.text.strip()) == 0:
            raise HTTPException(status_code=400, detail="文本内容不能为空")

        if len(request.text) > 10000:
            raise HTTPException(status_code=400, detail="文本长度不能超过10000个字符")

        # 确定使用的提供商
        provider = request.provider or config.get('default_provider', 'baidu')

        # 检查提供商是否可用
        available_providers = tts_manager.get_available_providers()
        if provider not in available_providers:
            raise HTTPException(
                status_code=400,
                detail=f"提供商 {provider} 不可用。可用提供商: {', '.join(available_providers)}"
            )

        # 生成会话ID
        session_id = str(uuid.uuid4())

        # 创建流式响应生成器
        async def generate_stream():
            """生成流式TTS音频数据"""
            try:
                # 存储音频块的队列
                audio_chunks = asyncio.Queue()
                is_complete = asyncio.Event()
                error_occurred = None

                def stream_callback(session_id_cb, event_type, data, **kwargs):
                    """流式回调函数"""
                    nonlocal error_occurred
                    try:
                        if event_type == 'tts_stream':
                            # 发送音频数据块
                            chunk_info = {
                                'type': 'audio_chunk',
                                'session_id': session_id_cb,
                                'data': data,
                                'chunk_count': kwargs.get('chunk_count', 0),
                                'total_size': kwargs.get('total_size', 0),
                                'is_final': kwargs.get('is_final', False)
                            }
                            asyncio.run_coroutine_threadsafe(
                                audio_chunks.put(chunk_info),
                                asyncio.get_event_loop()
                            )
                        elif event_type == 'tts_stream_complete':
                            # 合成完成
                            complete_info = {
                                'type': 'complete',
                                'session_id': session_id_cb,
                                'message': data,
                                'chunk_count': kwargs.get('chunk_count', 0),
                                'total_size': kwargs.get('total_size', 0)
                            }
                            asyncio.run_coroutine_threadsafe(
                                audio_chunks.put(complete_info),
                                asyncio.get_event_loop()
                            )
                            is_complete.set()
                    except Exception as e:
                        logger.error(f"流式回调错误: {e}")
                        error_occurred = str(e)
                        is_complete.set()

                # 在线程池中执行TTS合成
                def run_tts():
                    try:
                        return tts_manager.synthesize_text_stream(
                            provider=provider,
                            text=request.text,
                            voice=request.voice,
                            speed=request.speed,
                            pitch=request.pitch,
                            volume=request.volume,
                            language=request.language,
                            audio_format=request.audio_format,
                            stream_callback=stream_callback,
                            session_id=session_id
                        )
                    except Exception as e:
                        logger.error(f"TTS合成线程错误: {e}")
                        stream_callback(session_id, 'error', str(e))
                        return None

                # 启动TTS合成任务
                executor = ThreadPoolExecutor(max_workers=1)
                tts_task = asyncio.get_event_loop().run_in_executor(executor, run_tts)

                # 发送开始事件
                start_event = {
                    'type': 'start',
                    'session_id': session_id,
                    'provider': provider,
                    'voice': request.voice,
                    'text_length': len(request.text)
                }
                yield f"data: {json.dumps(start_event)}\n\n"

                # 持续发送音频块直到完成
                while not is_complete.is_set():
                    try:
                        # 等待音频块或超时
                        chunk_info = await asyncio.wait_for(audio_chunks.get(), timeout=1.0)
                        yield f"data: {json.dumps(chunk_info)}\n\n"

                        if chunk_info['type'] == 'complete':
                            break

                    except asyncio.TimeoutError:
                        # 发送心跳
                        heartbeat = {
                            'type': 'heartbeat',
                            'session_id': session_id,
                            'timestamp': asyncio.get_event_loop().time()
                        }
                        yield f"data: {json.dumps(heartbeat)}\n\n"
                        continue

                # 等待TTS任务完成
                try:
                    result = await tts_task
                    if error_occurred:
                        error_event = {
                            'type': 'error',
                            'session_id': session_id,
                            'error': error_occurred
                        }
                        yield f"data: {json.dumps(error_event)}\n\n"
                    elif result and not result.success:
                        error_event = {
                            'type': 'error',
                            'session_id': session_id,
                            'error': result.error_msg
                        }
                        yield f"data: {json.dumps(error_event)}\n\n"
                except Exception as e:
                    logger.error(f"等待TTS任务失败: {e}")
                    error_event = {
                        'type': 'error',
                        'session_id': session_id,
                        'error': str(e)
                    }
                    yield f"data: {json.dumps(error_event)}\n\n"

                # 发送结束事件
                end_event = {
                    'type': 'end',
                    'session_id': session_id
                }
                yield f"data: {json.dumps(end_event)}\n\n"

            except Exception as e:
                logger.error(f"流式TTS生成器错误: {e}")
                error_event = {
                    'type': 'error',
                    'session_id': session_id,
                    'error': str(e)
                }
                yield f"data: {json.dumps(error_event)}\n\n"

        # 返回Server-Sent Events流
        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Cache-Control",
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"流式文本转语音请求失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/download/{cache_key}")
async def download_audio(cache_key: str):
    """下载合成的音频文件"""
    try:
        # 从缓存中获取音频数据
        if not hasattr(tts_manager, '_temp_audio_cache'):
            raise HTTPException(status_code=404, detail="音频文件未找到")

        cache_data = tts_manager._temp_audio_cache.get(cache_key)
        if not cache_data:
            raise HTTPException(status_code=404, detail="音频文件未找到或已过期")

        # 确定MIME类型
        mime_type_map = {
            'wav': 'audio/wav',
            'mp3': 'audio/mpeg',
            'pcm': 'audio/pcm'
        }
        mime_type = mime_type_map.get(cache_data['format'], 'audio/wav')

        # 创建音频数据流
        audio_stream = io.BytesIO(cache_data['data'])

        # 清理缓存（可选，根据需要决定）
        # del tts_manager._temp_audio_cache[cache_key]

        return StreamingResponse(
            audio_stream,
            media_type=mime_type,
            headers={
                "Content-Disposition": f"attachment; filename={cache_data['filename']}"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"下载音频文件失败: {e}")
        raise HTTPException(status_code=500, detail="下载失败")


@router.get("/config")
async def get_config():
    """获取TTS配置"""
    try:
        config = get_tts_config()
        return {"success": True, "data": config}
    except Exception as e:
        logger.error(f"获取TTS配置失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/config")
async def update_config(request: ConfigUpdateRequest):
    """更新TTS配置"""
    try:
        # 更新配置
        await config_center_service.update_config("tts", request.config)

        # 重新初始化TTS实例
        initialize_tts_if_needed()

        return {"success": True, "message": "TTS配置更新成功"}
    except Exception as e:
        logger.error(f"更新TTS配置失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """TTS服务健康检查"""
    try:
        config = get_tts_config()
        available_providers = tts_manager.get_available_providers()

        return {
            "success": True,
            "enabled": config.get('enabled', False) if config else False,
            "available_providers": available_providers,
            "provider_count": len(available_providers)
        }
    except Exception as e:
        logger.error(f"TTS健康检查失败: {e}")
        return {
            "success": False,
            "error": str(e)
        }


@router.post("/synthesize/audio")
async def synthesize_text_direct(
    text: str = Form(...),
    provider: Optional[str] = Form(None),
    voice: Optional[str] = Form(None),
    speed: float = Form(1.0),
    volume: float = Form(1.0),
    pitch: float = Form(1.0)
):
    """
    文本转语音合成 - 直接返回音频数据
    适用于前端直接播放的场景
    """
    try:
        # 初始化TTS（如果需要）
        config = initialize_tts_if_needed()

        if not config or not config.get('enabled', True):
            raise HTTPException(status_code=400, detail="TTS服务未启用")

        # 验证文本
        if not text or len(text.strip()) == 0:
            raise HTTPException(status_code=400, detail="文本内容不能为空")

        if len(text) > 10000:
            raise HTTPException(status_code=400, detail="文本长度不能超过10000个字符")

        # 确定使用的提供商
        provider = provider or config.get('default_provider', 'baidu')

        # 检查提供商是否可用
        available_providers = tts_manager.get_available_providers()
        if provider not in available_providers:
            raise HTTPException(
                status_code=400,
                detail=f"提供商 {provider} 不可用。可用提供商: {', '.join(available_providers)}"
            )

        # 执行合成
        result = tts_manager.synthesize_to_memory(
            provider=provider,
            text=text,
            voice=voice,
            speed=speed,
            pitch=pitch,
            volume=volume,
            language='zh',
            audio_format='mp3'
        )

        if not result.success:
            raise HTTPException(status_code=500, detail=f"TTS合成失败: {result.error_msg}")

        if not result.audio_data:
            raise HTTPException(status_code=500, detail="TTS合成返回空数据")

        # 直接返回音频数据
        return Response(
            content=result.audio_data,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "attachment; filename=tts_audio.mp3",
                "Content-Length": str(len(result.audio_data))
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"TTS合成失败: {str(e)}")
        raise HTTPException(status_code=500, detail="TTS合成失败")
