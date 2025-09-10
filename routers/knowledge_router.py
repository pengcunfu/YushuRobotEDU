"""
知识库管理路由
提供知识库相关的HTTP API接口
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional
from pydantic import BaseModel

from services.knowledge_service.knowledge_models import (
    KnowledgeBase, KnowledgeCreate, KnowledgeUpdate, KnowledgeQuery, KnowledgeResponse
)
from services.knowledge_service.knowledge_service import get_knowledge_service

router = APIRouter(prefix="/api/knowledge", tags=["知识库管理"])

class StandardResponse(BaseModel):
    """标准响应模型"""
    success: bool
    message: str
    data: Optional[dict] = None

class ListResponse(BaseModel):
    """列表响应模型"""
    success: bool
    message: str
    data: KnowledgeResponse

@router.get("/", response_model=ListResponse, summary="获取知识库列表")
async def get_knowledge_list(
    page: int = Query(1, ge=1, description="页码"),
    per_page: int = Query(10, ge=1, le=100, description="每页数量"),
    keyword: Optional[str] = Query("", description="搜索关键词"),
    category: Optional[str] = Query("", description="分类过滤"),
    status: Optional[str] = Query("", description="状态过滤"),
    type: Optional[str] = Query("", description="类型过滤"),
    service = Depends(get_knowledge_service)
):
    """获取知识库列表"""
    try:
        query = KnowledgeQuery(
            page=page,
            per_page=per_page,
            keyword=keyword or "",
            category=category or "",
            status=status or None,
            type=type or None
        )
        
        result = await service.get_knowledge_list(query)
        
        return ListResponse(
            success=True,
            message="获取成功",
            data=KnowledgeResponse(**result)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取知识库列表失败: {str(e)}")

@router.get("/{knowledge_id}", response_model=StandardResponse, summary="获取知识库详情")
async def get_knowledge_detail(
    knowledge_id: str,
    service = Depends(get_knowledge_service)
):
    """获取知识库详情"""
    try:
        knowledge = await service.get_knowledge_detail(knowledge_id)
        if not knowledge:
            raise HTTPException(status_code=404, detail="知识库不存在")
        
        return StandardResponse(
            success=True,
            message="获取成功",
            data=knowledge.dict()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取知识库详情失败: {str(e)}")

@router.post("/", response_model=StandardResponse, summary="创建知识库")
async def create_knowledge(
    knowledge_data: KnowledgeCreate,
    service = Depends(get_knowledge_service)
):
    """创建知识库"""
    try:
        knowledge = await service.create_knowledge(knowledge_data)
        
        return StandardResponse(
            success=True,
            message="创建成功",
            data=knowledge.dict()
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建知识库失败: {str(e)}")

@router.put("/{knowledge_id}", response_model=StandardResponse, summary="更新知识库")
async def update_knowledge(
    knowledge_id: str,
    update_data: KnowledgeUpdate,
    service = Depends(get_knowledge_service)
):
    """更新知识库"""
    try:
        knowledge = await service.update_knowledge(knowledge_id, update_data)
        if not knowledge:
            raise HTTPException(status_code=404, detail="知识库不存在")
        
        return StandardResponse(
            success=True,
            message="更新成功",
            data=knowledge.dict()
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新知识库失败: {str(e)}")

@router.delete("/{knowledge_id}", response_model=StandardResponse, summary="删除知识库")
async def delete_knowledge(
    knowledge_id: str,
    service = Depends(get_knowledge_service)
):
    """删除知识库"""
    try:
        success = await service.delete_knowledge(knowledge_id)
        if not success:
            raise HTTPException(status_code=404, detail="知识库不存在")
        
        return StandardResponse(
            success=True,
            message="删除成功"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除知识库失败: {str(e)}")

@router.get("/search/", response_model=StandardResponse, summary="搜索知识库")
async def search_knowledge(
    keyword: str = Query(..., description="搜索关键词"),
    service = Depends(get_knowledge_service)
):
    """搜索知识库"""
    try:
        results = await service.search_knowledge(keyword)
        
        return StandardResponse(
            success=True,
            message="搜索成功",
            data={"items": [item.dict() for item in results]}
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"搜索知识库失败: {str(e)}")

@router.get("/categories/list", response_model=StandardResponse, summary="获取知识库分类列表")
async def get_knowledge_categories(
    service = Depends(get_knowledge_service)
):
    """获取知识库分类列表"""
    try:
        categories = await service.get_categories()
        
        return StandardResponse(
            success=True,
            message="获取成功",
            data={"categories": categories}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取知识库分类失败: {str(e)}")

@router.get("/popular/list", response_model=StandardResponse, summary="获取热门知识库")
async def get_popular_knowledge(
    limit: int = Query(10, ge=1, le=50, description="返回数量限制"),
    service = Depends(get_knowledge_service)
):
    """获取热门知识库"""
    try:
        results = await service.get_popular_knowledge(limit)
        
        return StandardResponse(
            success=True,
            message="获取成功",
            data={"items": [item.dict() for item in results]}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取热门知识库失败: {str(e)}")

@router.post("/{knowledge_id}/usage", response_model=StandardResponse, summary="记录知识库使用")
async def record_knowledge_usage(
    knowledge_id: str,
    service = Depends(get_knowledge_service)
):
    """记录知识库使用"""
    try:
        success = await service.record_knowledge_usage(knowledge_id)
        if not success:
            raise HTTPException(status_code=404, detail="知识库不存在")
        
        return StandardResponse(
            success=True,
            message="使用记录成功"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"记录知识库使用失败: {str(e)}")
