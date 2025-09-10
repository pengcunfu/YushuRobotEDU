"""
提示词管理路由
提供提示词模板相关的HTTP API接口
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional
from pydantic import BaseModel

from services.prompt_service.prompt_models import (
    PromptTemplate, PromptCreate, PromptUpdate, PromptQuery, PromptResponse
)
from services.prompt_service.prompt_service import get_prompt_service

router = APIRouter(prefix="/api/prompt", tags=["提示词管理"])

class StandardResponse(BaseModel):
    """标准响应模型"""
    success: bool
    message: str
    data: Optional[dict] = None

class ListResponse(BaseModel):
    """列表响应模型"""
    success: bool
    message: str
    data: PromptResponse

@router.get("/", response_model=ListResponse, summary="获取提示词模板列表")
async def get_prompt_list(
    page: int = Query(1, ge=1, description="页码"),
    per_page: int = Query(10, ge=1, le=100, description="每页数量"),
    keyword: Optional[str] = Query("", description="搜索关键词"),
    category: Optional[str] = Query("", description="分类过滤"),
    status: Optional[str] = Query("", description="状态过滤"),
    type: Optional[str] = Query("", description="类型过滤"),
    service = Depends(get_prompt_service)
):
    """获取提示词模板列表"""
    try:
        query = PromptQuery(
            page=page,
            per_page=per_page,
            keyword=keyword or "",
            category=category or "",
            status=status or None,
            type=type or None
        )
        
        result = await service.get_prompt_list(query)
        
        return ListResponse(
            success=True,
            message="获取成功",
            data=PromptResponse(**result)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取提示词模板列表失败: {str(e)}")

@router.get("/{prompt_id}", response_model=StandardResponse, summary="获取提示词模板详情")
async def get_prompt_detail(
    prompt_id: str,
    service = Depends(get_prompt_service)
):
    """获取提示词模板详情"""
    try:
        prompt = await service.get_prompt_detail(prompt_id)
        if not prompt:
            raise HTTPException(status_code=404, detail="提示词模板不存在")
        
        return StandardResponse(
            success=True,
            message="获取成功",
            data=prompt.dict()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取提示词模板详情失败: {str(e)}")

@router.post("/", response_model=StandardResponse, summary="创建提示词模板")
async def create_prompt(
    prompt_data: PromptCreate,
    service = Depends(get_prompt_service)
):
    """创建提示词模板"""
    try:
        prompt = await service.create_prompt(prompt_data)
        
        return StandardResponse(
            success=True,
            message="创建成功",
            data=prompt.dict()
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建提示词模板失败: {str(e)}")

@router.put("/{prompt_id}", response_model=StandardResponse, summary="更新提示词模板")
async def update_prompt(
    prompt_id: str,
    update_data: PromptUpdate,
    service = Depends(get_prompt_service)
):
    """更新提示词模板"""
    try:
        prompt = await service.update_prompt(prompt_id, update_data)
        if not prompt:
            raise HTTPException(status_code=404, detail="提示词模板不存在")
        
        return StandardResponse(
            success=True,
            message="更新成功",
            data=prompt.dict()
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新提示词模板失败: {str(e)}")

@router.delete("/{prompt_id}", response_model=StandardResponse, summary="删除提示词模板")
async def delete_prompt(
    prompt_id: str,
    service = Depends(get_prompt_service)
):
    """删除提示词模板"""
    try:
        success = await service.delete_prompt(prompt_id)
        if not success:
            raise HTTPException(status_code=404, detail="提示词模板不存在")
        
        return StandardResponse(
            success=True,
            message="删除成功"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除提示词模板失败: {str(e)}")

@router.get("/search/", response_model=StandardResponse, summary="搜索提示词模板")
async def search_prompt(
    keyword: str = Query(..., description="搜索关键词"),
    service = Depends(get_prompt_service)
):
    """搜索提示词模板"""
    try:
        results = await service.search_prompt(keyword)
        
        return StandardResponse(
            success=True,
            message="搜索成功",
            data={"items": [item.dict() for item in results]}
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"搜索提示词模板失败: {str(e)}")

@router.get("/categories/list", response_model=StandardResponse, summary="获取提示词模板分类列表")
async def get_prompt_categories(
    service = Depends(get_prompt_service)
):
    """获取提示词模板分类列表"""
    try:
        categories = await service.get_categories()
        
        return StandardResponse(
            success=True,
            message="获取成功",
            data={"categories": categories}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取提示词模板分类失败: {str(e)}")

@router.get("/types/list", response_model=StandardResponse, summary="获取提示词模板类型列表")
async def get_prompt_types(
    service = Depends(get_prompt_service)
):
    """获取提示词模板类型列表"""
    try:
        types = await service.get_prompt_types()
        
        return StandardResponse(
            success=True,
            message="获取成功",
            data={"types": types}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取提示词模板类型失败: {str(e)}")

@router.get("/popular/list", response_model=StandardResponse, summary="获取热门提示词模板")
async def get_popular_prompts(
    limit: int = Query(10, ge=1, le=50, description="返回数量限制"),
    service = Depends(get_prompt_service)
):
    """获取热门提示词模板"""
    try:
        results = await service.get_popular_prompts(limit)
        
        return StandardResponse(
            success=True,
            message="获取成功",
            data={"items": [item.dict() for item in results]}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取热门提示词模板失败: {str(e)}")

@router.post("/{prompt_id}/usage", response_model=StandardResponse, summary="记录提示词模板使用")
async def record_prompt_usage(
    prompt_id: str,
    service = Depends(get_prompt_service)
):
    """记录提示词模板使用"""
    try:
        success = await service.record_prompt_usage(prompt_id)
        if not success:
            raise HTTPException(status_code=404, detail="提示词模板不存在")
        
        return StandardResponse(
            success=True,
            message="使用记录成功"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"记录提示词模板使用失败: {str(e)}")
