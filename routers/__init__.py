"""
路由器包初始化文件
"""

from . import (
    core_router,
    config_router,
    config_center_router,
    llm_router,
    asr_router,
    tts_router,
    document_router
)

__all__ = [
    'core_router',
    'config_router',
    'config_center_router',
    'llm_router',
    'asr_router',
    'tts_router',
    'document_router'
]
