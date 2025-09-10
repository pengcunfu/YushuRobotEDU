"""
提示词管理服务
提供提示词模板相关的业务逻辑处理
"""

from typing import List, Optional, Dict, Any
from .prompt_models import PromptTemplate, PromptCreate, PromptUpdate, PromptQuery
from .prompt_database import get_prompt_database

class PromptService:
    """提示词模板服务类"""
    
    def __init__(self):
        self.db = None

    async def _get_db(self):
        """获取数据库实例"""
        if self.db is None:
            self.db = await get_prompt_database()
        return self.db

    async def create_prompt(self, prompt_data: PromptCreate, created_by: str = None) -> PromptTemplate:
        """创建提示词模板"""
        db = await self._get_db()
        return await db.create_prompt(prompt_data, created_by)

    async def get_prompt_by_id(self, prompt_id: str) -> Optional[PromptTemplate]:
        """根据ID获取提示词模板"""
        db = await self._get_db()
        return await db.get_prompt_by_id(prompt_id)

    async def get_prompt_by_title(self, title: str) -> Optional[PromptTemplate]:
        """根据标题获取提示词模板"""
        db = await self._get_db()
        return await db.get_prompt_by_title(title)

    async def update_prompt(self, prompt_id: str, update_data: PromptUpdate, updated_by: str = None) -> Optional[PromptTemplate]:
        """更新提示词模板"""
        db = await self._get_db()
        return await db.update_prompt(prompt_id, update_data, updated_by)

    async def delete_prompt(self, prompt_id: str) -> bool:
        """删除提示词模板"""
        db = await self._get_db()
        return await db.delete_prompt(prompt_id)

    async def get_prompt_list(self, query: PromptQuery) -> Dict[str, Any]:
        """获取提示词模板列表"""
        db = await self._get_db()
        return await db.get_prompt_list(query)

    async def search_prompt(self, keyword: str) -> List[PromptTemplate]:
        """搜索提示词模板"""
        if not keyword.strip():
            raise ValueError("搜索关键词不能为空")
        
        db = await self._get_db()
        return await db.search_prompt(keyword)

    async def get_categories(self) -> List[str]:
        """获取所有分类"""
        db = await self._get_db()
        return await db.get_categories()

    async def get_prompt_types(self) -> List[str]:
        """获取提示词类型列表"""
        db = await self._get_db()
        return await db.get_prompt_types()

    async def get_popular_prompts(self, limit: int = 10) -> List[PromptTemplate]:
        """获取热门提示词模板"""
        db = await self._get_db()
        return await db.get_popular_prompts(limit)

    async def increment_view_count(self, prompt_id: str) -> bool:
        """增加查看次数"""
        db = await self._get_db()
        return await db.increment_view_count(prompt_id)

    async def increment_usage_count(self, prompt_id: str) -> bool:
        """增加使用次数"""
        db = await self._get_db()
        return await db.increment_usage_count(prompt_id)

    async def get_prompt_detail(self, prompt_id: str) -> Optional[PromptTemplate]:
        """获取提示词模板详情（自动增加查看次数）"""
        prompt = await self.get_prompt_by_id(prompt_id)
        if prompt:
            await self.increment_view_count(prompt_id)
        return prompt

    async def record_prompt_usage(self, prompt_id: str) -> bool:
        """记录提示词模板使用"""
        prompt = await self.get_prompt_by_id(prompt_id)
        if not prompt:
            return False
        
        return await self.increment_usage_count(prompt_id)

# 全局服务实例
_prompt_service: Optional[PromptService] = None

def get_prompt_service() -> PromptService:
    """获取提示词模板服务实例"""
    global _prompt_service
    if _prompt_service is None:
        _prompt_service = PromptService()
    return _prompt_service
