"""
知识库管理数据模型
使用MongoDB作为数据存储
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum

class KnowledgeType(str, Enum):
    """知识类型枚举"""
    TEXT = "text"
    DOCUMENT = "document"
    LINK = "link"
    FAQ = "faq"

class KnowledgeStatus(str, Enum):
    """知识状态枚举"""
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"

class KnowledgeBase(BaseModel):
    """知识库数据模型"""
    id: Optional[str] = Field(None, alias="_id")
    title: str = Field(..., description="标题")
    content: str = Field(..., description="内容")
    description: Optional[str] = Field("", description="描述")
    category: Optional[str] = Field("", description="分类")
    tags: List[str] = Field(default_factory=list, description="标签列表")
    type: KnowledgeType = Field(KnowledgeType.TEXT, description="知识类型")
    status: KnowledgeStatus = Field(KnowledgeStatus.PUBLISHED, description="状态")
    priority: int = Field(0, description="优先级")
    view_count: int = Field(0, description="查看次数")
    usage_count: int = Field(0, description="使用次数")
    is_public: bool = Field(True, description="是否公开")
    source_url: Optional[str] = Field("", description="来源链接")
    source_type: Optional[str] = Field("", description="来源类型")
    created_by: Optional[str] = Field(None, description="创建用户ID")
    updated_by: Optional[str] = Field(None, description="更新用户ID")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="创建时间")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="更新时间")

    class Config:
        allow_population_by_field_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class KnowledgeCreate(BaseModel):
    """创建知识库请求模型"""
    title: str
    content: str
    description: Optional[str] = ""
    category: Optional[str] = ""
    tags: List[str] = []
    type: KnowledgeType = KnowledgeType.TEXT
    status: KnowledgeStatus = KnowledgeStatus.PUBLISHED
    priority: int = 0
    is_public: bool = True
    source_url: Optional[str] = ""
    source_type: Optional[str] = ""

class KnowledgeUpdate(BaseModel):
    """更新知识库请求模型"""
    title: Optional[str] = None
    content: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    type: Optional[KnowledgeType] = None
    status: Optional[KnowledgeStatus] = None
    priority: Optional[int] = None
    is_public: Optional[bool] = None
    source_url: Optional[str] = None
    source_type: Optional[str] = None

class KnowledgeQuery(BaseModel):
    """知识库查询参数模型"""
    page: int = Field(1, ge=1, description="页码")
    per_page: int = Field(10, ge=1, le=100, description="每页数量")
    keyword: Optional[str] = Field("", description="搜索关键词")
    category: Optional[str] = Field("", description="分类过滤")
    status: Optional[KnowledgeStatus] = Field(None, description="状态过滤")
    type: Optional[KnowledgeType] = Field(None, description="类型过滤")

class KnowledgeResponse(BaseModel):
    """知识库响应模型"""
    items: List[KnowledgeBase]
    total: int
    page: int
    per_page: int
    pages: int
