from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
import logging
import json

from services.llm_service.llm_manager import llm_manager
from services.config_service.config_center_service import config_center_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/llm", tags=["LLM"])


# ===== 请求模型 =====

class ChatRequest(BaseModel):
    """聊天请求模型"""
    message: str = Field(description="用户消息")
    provider: Optional[str] = Field(default=None, description="LLM提供商，默认使用配置中的默认提供商")
    model: Optional[str] = Field(default=None, description="模型名称")
    temperature: Optional[float] = Field(default=None, ge=0.0, le=2.0, description="温度参数")
    max_tokens: Optional[int] = Field(default=None, ge=1, le=8192, description="最大token数")
    stream: Optional[bool] = Field(default=False, description="是否使用流式输出")


class ConfigUpdateRequest(BaseModel):
    """配置更新请求模型"""
    config: Dict[str, Any] = Field(description="LLM配置数据")


# ===== 响应模型 =====

class ChatResponse(BaseModel):
    """聊天响应模型"""
    success: bool
    response: Optional[str] = None
    provider: Optional[str] = None
    model: Optional[str] = None
    error: Optional[str] = None


class ProvidersResponse(BaseModel):
    """提供商响应模型"""
    providers: List[str]
    provider_info: Dict[str, Dict[str, Any]]


# ===== 依赖函数 =====

def get_llm_config():
    """获取LLM配置"""
    try:
        config_data = config_center_service.get_config_sync("llm")
        return config_data
    except Exception as e:
        logger.error(f"获取LLM配置失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取LLM配置失败: {str(e)}")


def initialize_llm_if_needed():
    """根据需要初始化LLM"""
    try:
        config = get_llm_config()
        if config and config.get('enabled', True):
            # 提取各提供商的配置
            provider_configs = {}
            for provider in ['aliyun', 'baidu', 'douyin', 'tencent', 'xunfei']:
                provider_config = config.get(provider, {})
                if provider_config and any(v for v in provider_config.values() if v):
                    provider_configs[provider] = provider_config

            # 初始化LLM实例
            llm_manager.initialize_llms(provider_configs)

        return config
    except Exception as e:
        logger.error(f"初始化LLM失败: {e}")
        raise HTTPException(status_code=500, detail=f"初始化LLM失败: {str(e)}")


# ===== API路由 =====

@router.get("/providers", response_model=ProvidersResponse)
async def get_providers():
    """获取可用的LLM提供商列表"""
    try:
        initialize_llm_if_needed()

        available_providers = llm_manager.get_available_providers()
        provider_info = {}

        for provider in ['aliyun', 'baidu', 'douyin', 'tencent', 'xunfei']:
            provider_info[provider] = llm_manager.get_provider_info(provider)

        return ProvidersResponse(
            providers=available_providers,
            provider_info=provider_info
        )
    except Exception as e:
        logger.error(f"获取提供商列表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat")
async def chat(request: ChatRequest):
    """执行LLM聊天对话"""
    try:
        # 初始化LLM（如果需要）
        config = initialize_llm_if_needed()

        if not config or not config.get('enabled', True):
            raise HTTPException(status_code=400, detail="LLM服务未启用")

        # 确定使用的提供商
        provider = request.provider or config.get('default_provider', 'douyin')

        # 检查提供商是否可用
        available_providers = llm_manager.get_available_providers()
        if provider not in available_providers:
            raise HTTPException(
                status_code=400,
                detail=f"提供商 {provider} 不可用。可用提供商: {', '.join(available_providers)}"
            )

        # 获取默认参数
        provider_config = config.get(provider, {})
        model = request.model or provider_config.get('model')
        temperature = request.temperature or provider_config.get('temperature', 0.7)
        max_tokens = request.max_tokens or provider_config.get('max_tokens')

        # 如果是流式请求
        if request.stream:
            async def chat_stream():
                try:
                    for chunk in llm_manager.chat_stream(
                            provider=provider,
                            message=request.message,
                            model=model,
                            temperature=temperature,
                            max_tokens=max_tokens
                    ):
                        # 使用SSE格式
                        data = {
                            "type": "chunk",
                            "content": chunk,
                            "provider": provider,
                            "model": model
                        }
                        yield f"data: {json.dumps(data, ensure_ascii=False)}\n\n"

                    # 发送结束信号
                    end_data = {
                        "type": "done",
                        "provider": provider,
                        "model": model
                    }
                    yield f"data: {json.dumps(end_data, ensure_ascii=False)}\n\n"

                except Exception as e:
                    error_data = {
                        "type": "error",
                        "error": str(e)
                    }
                    yield f"data: {json.dumps(error_data, ensure_ascii=False)}\n\n"

            return StreamingResponse(chat_stream(), media_type="text/plain", headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*"
            })

        # 非流式请求
        else:
            result = llm_manager.chat(
                provider=provider,
                message=request.message,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens
            )

            if result.get('success'):
                return ChatResponse(
                    success=True,
                    response=result['response'],
                    provider=result['provider'],
                    model=result.get('model')
                )
            else:
                return ChatResponse(
                    success=False,
                    error=result.get('error', '未知错误')
                )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"聊天请求失败: {e}")
        return ChatResponse(
            success=False,
            error=str(e)
        )


@router.get("/config")
async def get_config():
    """获取LLM配置"""
    try:
        config = get_llm_config()
        return {"success": True, "data": config}
    except Exception as e:
        logger.error(f"获取LLM配置失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/config")
async def update_config(request: ConfigUpdateRequest):
    """更新LLM配置"""
    try:
        # 更新配置
        config_center_service.update_config("llm", request.config)

        # 重新初始化LLM实例
        initialize_llm_if_needed()

        return {"success": True, "message": "LLM配置更新成功"}
    except Exception as e:
        logger.error(f"更新LLM配置失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """LLM服务健康检查"""
    try:
        config = get_llm_config()
        available_providers = llm_manager.get_available_providers()

        return {
            "success": True,
            "enabled": config.get('enabled', False) if config else False,
            "available_providers": available_providers,
            "provider_count": len(available_providers)
        }
    except Exception as e:
        logger.error(f"LLM健康检查失败: {e}")
        return {
            "success": False,
            "error": str(e)
        }
