"""
提示词管理数据模型
使用MongoDB作为数据存储
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum

class PromptType(str, Enum):
    """提示词类型枚举"""
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
    GENERAL = "general"

class PromptStatus(str, Enum):
    """提示词状态枚举"""
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"

class PromptTemplate(BaseModel):
    """提示词模板数据模型"""
    id: Optional[str] = Field(None, alias="_id")
    title: str = Field(..., description="标题")
    content: str = Field(..., description="模板内容")
    description: Optional[str] = Field("", description="描述")
    category: Optional[str] = Field("", description="分类")
    tags: List[str] = Field(default_factory=list, description="标签列表")
    type: PromptType = Field(PromptType.GENERAL, description="模板类型")
    status: PromptStatus = Field(PromptStatus.PUBLISHED, description="状态")
    priority: int = Field(0, description="优先级")
    view_count: int = Field(0, description="查看次数")
    usage_count: int = Field(0, description="使用次数")
    is_public: bool = Field(True, description="是否公开")
    variables: Optional[str] = Field("", description="变量定义JSON")
    example_input: Optional[str] = Field("", description="示例输入")
    example_output: Optional[str] = Field("", description="示例输出")
    model_type: Optional[str] = Field("", description="适用模型类型")
    temperature: float = Field(0.7, ge=0.0, le=2.0, description="温度参数")
    max_tokens: Optional[int] = Field(None, ge=1, description="最大token数")
    created_by: Optional[str] = Field(None, description="创建用户ID")
    updated_by: Optional[str] = Field(None, description="更新用户ID")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="创建时间")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="更新时间")

    class Config:
        allow_population_by_field_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class PromptCreate(BaseModel):
    """创建提示词模板请求模型"""
    title: str
    content: str
    description: Optional[str] = ""
    category: Optional[str] = ""
    tags: List[str] = []
    type: PromptType = PromptType.GENERAL
    status: PromptStatus = PromptStatus.PUBLISHED
    priority: int = 0
    is_public: bool = True
    variables: Optional[str] = ""
    example_input: Optional[str] = ""
    example_output: Optional[str] = ""
    model_type: Optional[str] = ""
    temperature: float = 0.7
    max_tokens: Optional[int] = None

class PromptUpdate(BaseModel):
    """更新提示词模板请求模型"""
    title: Optional[str] = None
    content: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    type: Optional[PromptType] = None
    status: Optional[PromptStatus] = None
    priority: Optional[int] = None
    is_public: Optional[bool] = None
    variables: Optional[str] = None
    example_input: Optional[str] = None
    example_output: Optional[str] = None
    model_type: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None

class PromptQuery(BaseModel):
    """提示词模板查询参数模型"""
    page: int = Field(1, ge=1, description="页码")
    per_page: int = Field(10, ge=1, le=100, description="每页数量")
    keyword: Optional[str] = Field("", description="搜索关键词")
    category: Optional[str] = Field("", description="分类过滤")
    status: Optional[PromptStatus] = Field(None, description="状态过滤")
    type: Optional[PromptType] = Field(None, description="类型过滤")

class PromptResponse(BaseModel):
    """提示词模板响应模型"""
    items: List[PromptTemplate]
    total: int
    page: int
    per_page: int
    pages: int
