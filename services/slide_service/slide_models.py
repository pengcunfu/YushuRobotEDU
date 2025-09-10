"""
幻灯片处理相关的数据模型
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class SlideInfo(BaseModel):
    """幻灯片信息"""
    id: str = Field(..., description="幻灯片ID")
    page_number: int = Field(..., description="页码")
    title: Optional[str] = Field(None, description="幻灯片标题")
    content: Optional[str] = Field(None, description="幻灯片文字内容")
    image_url: Optional[str] = Field(None, description="幻灯片图片URL")
    thumbnail_url: Optional[str] = Field(None, description="缩略图URL")
    notes: Optional[str] = Field(None, description="演讲者备注")
    
class SlideContent(BaseModel):
    """幻灯片内容集合"""
    document_id: str = Field(..., description="文档ID")
    filename: str = Field(..., description="文件名")
    total_pages: int = Field(..., description="总页数")
    slides: List[SlideInfo] = Field(default_factory=list, description="幻灯片列表")
    created_at: datetime = Field(default_factory=datetime.now, description="创建时间")
    
class SlideNarration(BaseModel):
    """幻灯片讲解内容"""
    slide_id: str = Field(..., description="幻灯片ID")
    narration: str = Field(..., description="讲解内容")
    duration: Optional[float] = Field(None, description="讲解时长（秒）")
    audio_url: Optional[str] = Field(None, description="音频文件URL")
    
class SlideProcessRequest(BaseModel):
    """幻灯片处理请求"""
    document_id: str = Field(..., description="文档ID")
    file_path: str = Field(..., description="文件路径")
    extract_images: bool = Field(default=True, description="是否提取图片")
    generate_thumbnails: bool = Field(default=True, description="是否生成缩略图")
    
class SlideNarrationRequest(BaseModel):
    """讲解生成请求"""
    slide_id: str = Field(..., description="幻灯片ID")
    slide_content: str = Field(..., description="幻灯片内容")
    slide_title: Optional[str] = Field(None, description="幻灯片标题")
    narration_style: str = Field(default="professional", description="讲解风格")
    
class SlideResponse(BaseModel):
    """幻灯片API响应"""
    success: bool = Field(..., description="是否成功")
    message: str = Field(..., description="响应消息")
    data: Optional[Dict[str, Any]] = Field(None, description="响应数据")
