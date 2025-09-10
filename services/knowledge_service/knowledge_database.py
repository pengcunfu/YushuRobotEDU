"""
知识库数据库操作
提供MongoDB数据库的CRUD操作
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING
from bson import ObjectId
from typing import List, Optional, Dict, Any
import re
from datetime import datetime

from .knowledge_models import KnowledgeBase, KnowledgeCreate, KnowledgeUpdate, KnowledgeQuery

class KnowledgeDatabase:
    """知识库数据库操作类"""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.collection = database.knowledge_base

    async def create_indexes(self):
        """创建数据库索引"""
        await self.collection.create_index([("title", ASCENDING)], unique=True)
        await self.collection.create_index([("category", ASCENDING)])
        await self.collection.create_index([("status", ASCENDING)])
        await self.collection.create_index([("type", ASCENDING)])
        await self.collection.create_index([("created_at", DESCENDING)])
        await self.collection.create_index([
            ("title", "text"),
            ("content", "text"),
            ("description", "text"),
            ("tags", "text")
        ], name="text_search_index")

    async def create_knowledge(self, knowledge_data: KnowledgeCreate, created_by: str = None) -> KnowledgeBase:
        """创建知识库"""
        # 检查标题是否已存在
        existing = await self.collection.find_one({"title": knowledge_data.title})
        if existing:
            raise ValueError("标题已存在")
        
        knowledge_dict = knowledge_data.dict()
        knowledge_dict.update({
            "created_by": created_by,
            "updated_by": created_by,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "view_count": 0,
            "usage_count": 0
        })
        
        result = await self.collection.insert_one(knowledge_dict)
        knowledge_dict["_id"] = str(result.inserted_id)
        
        return KnowledgeBase(**knowledge_dict)

    async def get_knowledge_by_id(self, knowledge_id: str) -> Optional[KnowledgeBase]:
        """根据ID获取知识库"""
        if not ObjectId.is_valid(knowledge_id):
            return None
            
        knowledge = await self.collection.find_one({"_id": ObjectId(knowledge_id)})
        if knowledge:
            knowledge["_id"] = str(knowledge["_id"])
            return KnowledgeBase(**knowledge)
        return None

    async def get_knowledge_by_title(self, title: str) -> Optional[KnowledgeBase]:
        """根据标题获取知识库"""
        knowledge = await self.collection.find_one({"title": title})
        if knowledge:
            knowledge["_id"] = str(knowledge["_id"])
            return KnowledgeBase(**knowledge)
        return None

    async def update_knowledge(self, knowledge_id: str, update_data: KnowledgeUpdate, updated_by: str = None) -> Optional[KnowledgeBase]:
        """更新知识库"""
        if not ObjectId.is_valid(knowledge_id):
            return None

        # 构建更新数据
        update_dict = {}
        for field, value in update_data.dict(exclude_unset=True).items():
            if value is not None:
                update_dict[field] = value
        
        if update_dict:
            update_dict["updated_by"] = updated_by
            update_dict["updated_at"] = datetime.utcnow()
            
            # 检查标题重复（排除当前记录）
            if "title" in update_dict:
                existing = await self.collection.find_one({
                    "title": update_dict["title"],
                    "_id": {"$ne": ObjectId(knowledge_id)}
                })
                if existing:
                    raise ValueError("标题已存在")
            
            await self.collection.update_one(
                {"_id": ObjectId(knowledge_id)},
                {"$set": update_dict}
            )
        
        return await self.get_knowledge_by_id(knowledge_id)

    async def delete_knowledge(self, knowledge_id: str) -> bool:
        """删除知识库"""
        if not ObjectId.is_valid(knowledge_id):
            return False
            
        result = await self.collection.delete_one({"_id": ObjectId(knowledge_id)})
        return result.deleted_count > 0

    async def get_knowledge_list(self, query: KnowledgeQuery) -> Dict[str, Any]:
        """获取知识库列表"""
        # 构建查询条件
        filter_dict = {}
        
        if query.keyword:
            # 使用文本搜索或正则表达式搜索
            filter_dict["$or"] = [
                {"$text": {"$search": query.keyword}},
                {"title": {"$regex": query.keyword, "$options": "i"}},
                {"content": {"$regex": query.keyword, "$options": "i"}},
                {"description": {"$regex": query.keyword, "$options": "i"}},
                {"tags": {"$in": [re.compile(query.keyword, re.IGNORECASE)]}}
            ]
        
        if query.category:
            filter_dict["category"] = query.category
        
        if query.status:
            filter_dict["status"] = query.status
        
        if query.type:
            filter_dict["type"] = query.type

        # 计算总数
        total = await self.collection.count_documents(filter_dict)
        
        # 计算分页
        skip = (query.page - 1) * query.per_page
        pages = (total + query.per_page - 1) // query.per_page
        
        # 获取数据
        cursor = self.collection.find(filter_dict).sort("created_at", DESCENDING).skip(skip).limit(query.per_page)
        items = []
        
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            items.append(KnowledgeBase(**doc))
        
        return {
            "items": items,
            "total": total,
            "page": query.page,
            "per_page": query.per_page,
            "pages": pages
        }

    async def search_knowledge(self, keyword: str) -> List[KnowledgeBase]:
        """搜索知识库"""
        filter_dict = {
            "status": "published",
            "$or": [
                {"$text": {"$search": keyword}},
                {"title": {"$regex": keyword, "$options": "i"}},
                {"content": {"$regex": keyword, "$options": "i"}},
                {"description": {"$regex": keyword, "$options": "i"}},
                {"tags": {"$in": [re.compile(keyword, re.IGNORECASE)]}}
            ]
        }
        
        cursor = self.collection.find(filter_dict).sort("created_at", DESCENDING)
        items = []
        
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            items.append(KnowledgeBase(**doc))
        
        return items

    async def get_categories(self) -> List[str]:
        """获取所有分类"""
        categories = await self.collection.distinct("category")
        return [cat for cat in categories if cat]

    async def get_popular_knowledge(self, limit: int = 10) -> List[KnowledgeBase]:
        """获取热门知识库"""
        cursor = self.collection.find({"status": "published"}).sort([
            ("usage_count", DESCENDING),
            ("view_count", DESCENDING)
        ]).limit(limit)
        
        items = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            items.append(KnowledgeBase(**doc))
        
        return items

    async def increment_view_count(self, knowledge_id: str) -> bool:
        """增加查看次数"""
        if not ObjectId.is_valid(knowledge_id):
            return False
            
        result = await self.collection.update_one(
            {"_id": ObjectId(knowledge_id)},
            {"$inc": {"view_count": 1}}
        )
        return result.modified_count > 0

    async def increment_usage_count(self, knowledge_id: str) -> bool:
        """增加使用次数"""
        if not ObjectId.is_valid(knowledge_id):
            return False
            
        result = await self.collection.update_one(
            {"_id": ObjectId(knowledge_id)},
            {"$inc": {"usage_count": 1}}
        )
        return result.modified_count > 0

# 全局数据库实例
_knowledge_db: Optional[KnowledgeDatabase] = None

async def get_knowledge_database() -> KnowledgeDatabase:
    """获取知识库数据库实例"""
    global _knowledge_db
    if _knowledge_db is None:
        from motor.motor_asyncio import AsyncIOMotorClient
        from services.config_service.config_center_service import config_center_service
        
        # 从配置中心获取数据库配置
        db_config = await config_center_service.get_config("database")
        mongodb_config = db_config.get("mongodb", {})
        
        # 检查MongoDB是否启用
        if not mongodb_config.get("enabled", True):
            raise ValueError("MongoDB未启用，无法初始化知识库数据库")
        
        # 获取连接参数
        mongodb_url = mongodb_config.get("url", "mongodb://localhost:27017")
        database_name = mongodb_config.get("database", "yushu_documents")
        timeout = mongodb_config.get("timeout", 10) * 1000  # 转换为毫秒
        
        # 创建MongoDB连接
        client = AsyncIOMotorClient(mongodb_url, serverSelectionTimeoutMS=timeout)
        database = client[database_name]
        
        _knowledge_db = KnowledgeDatabase(database)
        await _knowledge_db.create_indexes()
    return _knowledge_db
