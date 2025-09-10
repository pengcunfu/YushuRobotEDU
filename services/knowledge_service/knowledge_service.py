"""
知识库管理服务
提供知识库相关的业务逻辑处理
"""

from typing import List, Optional, Dict, Any
from .knowledge_models import KnowledgeBase, KnowledgeCreate, KnowledgeUpdate, KnowledgeQuery
from .knowledge_database import get_knowledge_database

class KnowledgeService:
    """知识库服务类"""
    
    def __init__(self):
        self.db = None

    async def _get_db(self):
        """获取数据库实例"""
        if self.db is None:
            self.db = await get_knowledge_database()
        return self.db

    async def create_knowledge(self, knowledge_data: KnowledgeCreate, created_by: str = None) -> KnowledgeBase:
        """创建知识库"""
        db = await self._get_db()
        return await db.create_knowledge(knowledge_data, created_by)

    async def get_knowledge_by_id(self, knowledge_id: str) -> Optional[KnowledgeBase]:
        """根据ID获取知识库"""
        db = await self._get_db()
        return await db.get_knowledge_by_id(knowledge_id)

    async def get_knowledge_by_title(self, title: str) -> Optional[KnowledgeBase]:
        """根据标题获取知识库"""
        db = await self._get_db()
        return await db.get_knowledge_by_title(title)

    async def update_knowledge(self, knowledge_id: str, update_data: KnowledgeUpdate, updated_by: str = None) -> Optional[KnowledgeBase]:
        """更新知识库"""
        db = await self._get_db()
        return await db.update_knowledge(knowledge_id, update_data, updated_by)

    async def delete_knowledge(self, knowledge_id: str) -> bool:
        """删除知识库"""
        db = await self._get_db()
        return await db.delete_knowledge(knowledge_id)

    async def get_knowledge_list(self, query: KnowledgeQuery) -> Dict[str, Any]:
        """获取知识库列表"""
        db = await self._get_db()
        return await db.get_knowledge_list(query)

    async def search_knowledge(self, keyword: str) -> List[KnowledgeBase]:
        """搜索知识库"""
        if not keyword.strip():
            raise ValueError("搜索关键词不能为空")
        
        db = await self._get_db()
        return await db.search_knowledge(keyword)

    async def get_categories(self) -> List[str]:
        """获取所有分类"""
        db = await self._get_db()
        return await db.get_categories()

    async def get_popular_knowledge(self, limit: int = 10) -> List[KnowledgeBase]:
        """获取热门知识库"""
        db = await self._get_db()
        return await db.get_popular_knowledge(limit)

    async def increment_view_count(self, knowledge_id: str) -> bool:
        """增加查看次数"""
        db = await self._get_db()
        return await db.increment_view_count(knowledge_id)

    async def increment_usage_count(self, knowledge_id: str) -> bool:
        """增加使用次数"""
        db = await self._get_db()
        return await db.increment_usage_count(knowledge_id)

    async def get_knowledge_detail(self, knowledge_id: str) -> Optional[KnowledgeBase]:
        """获取知识库详情（自动增加查看次数）"""
        knowledge = await self.get_knowledge_by_id(knowledge_id)
        if knowledge:
            await self.increment_view_count(knowledge_id)
        return knowledge

    async def record_knowledge_usage(self, knowledge_id: str) -> bool:
        """记录知识库使用"""
        knowledge = await self.get_knowledge_by_id(knowledge_id)
        if not knowledge:
            return False
        
        return await self.increment_usage_count(knowledge_id)

# 全局服务实例
_knowledge_service: Optional[KnowledgeService] = None

def get_knowledge_service() -> KnowledgeService:
    """获取知识库服务实例"""
    global _knowledge_service
    if _knowledge_service is None:
        _knowledge_service = KnowledgeService()
    return _knowledge_service
