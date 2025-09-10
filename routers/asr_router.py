from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
import logging
import tempfile
import os

from services.asr_service.asr_manager import asr_manager
from services.config_service.config_center_service import config_center_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/asr", tags=["ASR"])


# ===== 请求模型 =====

class ASRRequest(BaseModel):
    """ASR识别请求模型"""
    provider: Optional[str] = Field(default=None, description="ASR提供商，默认使用配置中的默认提供商")
    audio_format: str = Field(default="wav", description="音频格式")
    sample_rate: int = Field(default=16000, description="采样率")
    language: str = Field(default="zh", description="语言")


class ConfigUpdateRequest(BaseModel):
    """配置更新请求模型"""
    config: Dict[str, Any] = Field(description="ASR配置数据")


# ===== 响应模型 =====

class ASRResponse(BaseModel):
    """ASR识别响应模型"""
    success: bool
    text: Optional[str] = None
    provider: Optional[str] = None
    duration: Optional[float] = None
    confidence: Optional[float] = None
    error: Optional[str] = None


class ProvidersResponse(BaseModel):
    """提供商响应模型"""
    providers: list
    provider_info: Dict[str, Dict[str, Any]]


# ===== 依赖函数 =====

def get_asr_config():
    """获取ASR配置"""
    try:
        config_data = config_center_service.get_config_sync("asr")
        return config_data
    except Exception as e:
        logger.error(f"获取ASR配置失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取ASR配置失败: {str(e)}")


def initialize_asr_if_needed():
    """根据需要初始化ASR"""
    try:
        config = get_asr_config()
        if config and config.get('enabled', True):
            # 提取各提供商的配置
            provider_configs = {}
            for provider in ['baidu', 'xunfei', 'aliyun', 'tencent', 'douyin']:
                provider_config = config.get(provider, {})
                if provider_config and any(v for v in provider_config.values() if v):
                    provider_configs[provider] = provider_config

            # 初始化ASR实例
            asr_manager.initialize_asrs(provider_configs)

        return config
    except Exception as e:
        logger.error(f"初始化ASR失败: {e}")
        raise HTTPException(status_code=500, detail=f"初始化ASR失败: {str(e)}")


# ===== API路由 =====

@router.get("/providers", response_model=ProvidersResponse)
async def get_providers():
    """获取可用的ASR提供商列表"""
    try:
        initialize_asr_if_needed()

        available_providers = asr_manager.get_available_providers()
        provider_info = asr_manager.get_all_providers_info()

        return ProvidersResponse(
            providers=available_providers,
            provider_info=provider_info
        )
    except Exception as e:
        logger.error(f"获取ASR提供商列表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recognize", response_model=ASRResponse)
async def recognize_audio(
        audio: UploadFile = File(..., description="音频文件"),
        provider: Optional[str] = Form(None, description="ASR提供商"),
        audio_format: str = Form("wav", description="音频格式"),
        sample_rate: int = Form(16000, description="采样率"),
        language: str = Form("zh", description="语言")
):
    """上传音频文件进行语音识别"""
    temp_file = None
    try:
        # 初始化ASR（如果需要）
        config = initialize_asr_if_needed()

        if not config or not config.get('enabled', True):
            raise HTTPException(status_code=400, detail="ASR服务未启用")

        # 确定使用的提供商
        provider = provider or config.get('default_provider', 'baidu')

        # 检查提供商是否可用
        available_providers = asr_manager.get_available_providers()
        if provider not in available_providers:
            raise HTTPException(
                status_code=400,
                detail=f"提供商 {provider} 不可用。可用提供商: {', '.join(available_providers)}"
            )

        # 检查文件格式
        if not audio.filename:
            raise HTTPException(status_code=400, detail="文件名不能为空")

        # 推断音频格式（如果没有指定）
        if audio_format == "wav" and audio.filename:
            file_ext = os.path.splitext(audio.filename)[1].lower()
            format_map = {'.wav': 'wav', '.mp3': 'mp3', '.m4a': 'm4a', '.flac': 'flac'}
            audio_format = format_map.get(file_ext, audio_format)

        # 读取音频数据
        audio_data = await audio.read()

        if len(audio_data) == 0:
            raise HTTPException(status_code=400, detail="音频文件为空")

        # 检查文件大小（限制为10MB）
        if len(audio_data) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="音频文件过大，请上传小于10MB的文件")

        # 执行识别
        result = asr_manager.recognize_audio_data(
            provider=provider,
            audio_data=audio_data,
            audio_format=audio_format,
            sample_rate=sample_rate,
            language=language
        )

        if result.success:
            return ASRResponse(
                success=True,
                text=result.text,
                provider=provider,
                duration=result.duration,
                confidence=result.confidence
            )
        else:
            return ASRResponse(
                success=False,
                error=result.error_msg
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"语音识别请求失败: {e}")
        return ASRResponse(
            success=False,
            error=str(e)
        )
    finally:
        # 清理临时文件
        if temp_file and os.path.exists(temp_file):
            try:
                os.unlink(temp_file)
            except Exception as e:
                logger.warning(f"删除临时文件失败: {e}")


@router.get("/config")
async def get_config():
    """获取ASR配置"""
    try:
        config = await get_asr_config()
        return {"success": True, "data": config}
    except Exception as e:
        logger.error(f"获取ASR配置失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/config")
async def update_config(request: ConfigUpdateRequest):
    """更新ASR配置"""
    try:
        # 更新配置
        await config_center_service.update_config("asr", request.config)

        # 重新初始化ASR实例
        initialize_asr_if_needed()

        return {"success": True, "message": "ASR配置更新成功"}
    except Exception as e:
        logger.error(f"更新ASR配置失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """ASR服务健康检查"""
    try:
        config = await get_asr_config()
        available_providers = asr_manager.get_available_providers()

        return {
            "success": True,
            "enabled": config.get('enabled', False) if config else False,
            "available_providers": available_providers,
            "provider_count": len(available_providers)
        }
    except Exception as e:
        logger.error(f"ASR健康检查失败: {e}")
        return {
            "success": False,
            "error": str(e)
        }
