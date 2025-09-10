"""
幻灯片处理服务模块
用于处理PPT、PPTX、PDF等演示文稿文件
"""

from .slide_service import SlideService, slide_service
from .slide_models import SlideInfo, SlideContent, SlideNarration

__all__ = ['SlideService', 'slide_service', 'SlideInfo', 'SlideContent', 'SlideNarration']
