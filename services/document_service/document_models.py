"""
文档处理相关的数据模型
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from enum import Enum
import uuid
from datetime import datetime


class DocumentType(str, Enum):
    """文档类型枚举"""
    PDF = "pdf"
    PPTX = "pptx"
    PPT = "ppt"
    DOCX = "docx"
    DOC = "doc"
    TXT = "txt"
    IMAGE = "image"
    PNG = "png"
    JPG = "jpg"
    JPEG = "jpeg"
    GIF = "gif"
    BMP = "bmp"


class DocumentInfo(BaseModel):
    """文档基本信息"""
    model_config = ConfigDict(protected_namespaces=())
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="文档ID")
    filename: str = Field(description="文件名")
    original_filename: str = Field(description="原始文件名")
    file_path: str = Field(description="文件路径")
    file_size: int = Field(description="文件大小（字节）")
    document_type: DocumentType = Field(description="文档类型")
    mime_type: str = Field(description="MIME类型")
    upload_time: datetime = Field(default_factory=datetime.now, description="上传时间")
    processed: bool = Field(default=False, description="是否已处理")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="文档元数据")


class ParseResult(BaseModel):
    """文档解析结果"""
    model_config = ConfigDict(protected_namespaces=())
    
    document_id: str = Field(description="文档ID")
    success: bool = Field(description="解析是否成功")
    text_content: str = Field(default="", description="提取的文本内容")
    page_count: int = Field(default=0, description="页数")
    word_count: int = Field(default=0, description="字数")
    images: List[str] = Field(default_factory=list, description="提取的图片路径列表")
    tables: List[Dict[str, Any]] = Field(default_factory=list, description="提取的表格数据")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="解析元数据")
    error_message: Optional[str] = Field(default=None, description="错误信息")
    parse_time: datetime = Field(default_factory=datetime.now, description="解析时间")
    duration: float = Field(default=0.0, description="解析耗时（秒）")


class ImageAnalysisResult(BaseModel):
    """图片分析结果"""
    model_config = ConfigDict(protected_namespaces=())
    
    image_path: str = Field(description="图片路径")
    text_content: str = Field(default="", description="OCR识别的文本")
    objects: List[Dict[str, Any]] = Field(default_factory=list, description="识别的对象")
    faces: List[Dict[str, Any]] = Field(default_factory=list, description="识别的人脸")
    confidence: float = Field(default=0.0, description="识别置信度")
    analysis_time: datetime = Field(default_factory=datetime.now, description="分析时间")


class ContentEditRequest(BaseModel):
    """内容编辑请求"""
    model_config = ConfigDict(protected_namespaces=())
    
    document_id: str = Field(description="文档ID")
    new_content: str = Field(description="新的文本内容")
    editor_name: Optional[str] = Field(default=None, description="编辑者名称")
    edit_notes: Optional[str] = Field(default=None, description="编辑备注")


class ContentEditHistory(BaseModel):
    """内容编辑历史"""
    model_config = ConfigDict(protected_namespaces=())
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="编辑记录ID")
    document_id: str = Field(description="文档ID")
    original_content: str = Field(description="原始内容")
    edited_content: str = Field(description="编辑后内容")
    editor_name: Optional[str] = Field(default=None, description="编辑者名称")
    edit_notes: Optional[str] = Field(default=None, description="编辑备注")
    edit_time: datetime = Field(default_factory=datetime.now, description="编辑时间")


class DocumentProcessingJob(BaseModel):
    """文档处理任务"""
    model_config = ConfigDict(protected_namespaces=())
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="任务ID")
    document_id: str = Field(description="文档ID")
    job_type: str = Field(description="任务类型 (parse/analyze/generate)")
    status: str = Field(default="pending", description="任务状态")
    progress: float = Field(default=0.0, description="处理进度 (0-100)")
    result: Optional[Dict[str, Any]] = Field(default=None, description="处理结果")
    error_message: Optional[str] = Field(default=None, description="错误信息")
    created_time: datetime = Field(default_factory=datetime.now, description="创建时间")
    started_time: Optional[datetime] = Field(default=None, description="开始时间")
    completed_time: Optional[datetime] = Field(default=None, description="完成时间")


class GenerationRequest(BaseModel):
    """AI文稿生成请求"""
    model_config = ConfigDict(protected_namespaces=())
    
    document_id: str = Field(description="文档ID")
    content: str = Field(description="输入内容")
    generation_type: str = Field(default="explanation", description="生成类型")
    prompt_template: Optional[str] = Field(default=None, description="提示词模板")
    model: Optional[str] = Field(default=None, description="使用的模型")
    temperature: float = Field(default=0.7, description="生成温度")
    max_tokens: Optional[int] = Field(default=None, description="最大生成长度")
    stream: bool = Field(default=True, description="是否流式生成")


class TTSRequest(BaseModel):
    """TTS语音合成请求"""
    model_config = ConfigDict(protected_namespaces=())
    
    text: str = Field(description="要合成的文本")
    voice: Optional[str] = Field(default=None, description="音色")
    speed: float = Field(default=1.0, description="语速")
    pitch: float = Field(default=1.0, description="音调")
    volume: float = Field(default=1.0, description="音量")
    format: str = Field(default="wav", description="音频格式")
    stream: bool = Field(default=True, description="是否流式合成")
    split_text: bool = Field(default=True, description="是否分句处理")


class TTSSegmentRequest(BaseModel):
    """TTS分段合成请求"""
    model_config = ConfigDict(protected_namespaces=())
    
    segments: List[str] = Field(description="文本段落列表")
    voice: Optional[str] = Field(default=None, description="音色")
    speed: float = Field(default=1.0, description="语速")
    pitch: float = Field(default=1.0, description="音调")
    volume: float = Field(default=1.0, description="音量")
    format: str = Field(default="wav", description="音频格式")
    stream: bool = Field(default=True, description="是否流式合成")
