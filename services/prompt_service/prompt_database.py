"""
提示词模板数据库操作
提供MongoDB数据库的CRUD操作
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING
from bson import ObjectId
from typing import List, Optional, Dict, Any
import re
from datetime import datetime

from .prompt_models import PromptTemplate, PromptCreate, PromptUpdate, PromptQuery

class PromptDatabase:
    """提示词模板数据库操作类"""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.collection = database.prompt_templates

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

    async def create_prompt(self, prompt_data: PromptCreate, created_by: str = None) -> PromptTemplate:
        """创建提示词模板"""
        # 检查标题是否已存在
        existing = await self.collection.find_one({"title": prompt_data.title})
        if existing:
            raise ValueError("标题已存在")
        
        prompt_dict = prompt_data.dict()
        prompt_dict.update({
            "created_by": created_by,
            "updated_by": created_by,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "view_count": 0,
            "usage_count": 0
        })
        
        result = await self.collection.insert_one(prompt_dict)
        prompt_dict["_id"] = str(result.inserted_id)
        
        return PromptTemplate(**prompt_dict)

    async def get_prompt_by_id(self, prompt_id: str) -> Optional[PromptTemplate]:
        """根据ID获取提示词模板"""
        if not ObjectId.is_valid(prompt_id):
            return None
            
        prompt = await self.collection.find_one({"_id": ObjectId(prompt_id)})
        if prompt:
            prompt["_id"] = str(prompt["_id"])
            return PromptTemplate(**prompt)
        return None

    async def get_prompt_by_title(self, title: str) -> Optional[PromptTemplate]:
        """根据标题获取提示词模板"""
        prompt = await self.collection.find_one({"title": title})
        if prompt:
            prompt["_id"] = str(prompt["_id"])
            return PromptTemplate(**prompt)
        return None

    async def update_prompt(self, prompt_id: str, update_data: PromptUpdate, updated_by: str = None) -> Optional[PromptTemplate]:
        """更新提示词模板"""
        if not ObjectId.is_valid(prompt_id):
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
                    "_id": {"$ne": ObjectId(prompt_id)}
                })
                if existing:
                    raise ValueError("标题已存在")
            
            await self.collection.update_one(
                {"_id": ObjectId(prompt_id)},
                {"$set": update_dict}
            )
        
        return await self.get_prompt_by_id(prompt_id)

    async def delete_prompt(self, prompt_id: str) -> bool:
        """删除提示词模板"""
        if not ObjectId.is_valid(prompt_id):
            return False
            
        result = await self.collection.delete_one({"_id": ObjectId(prompt_id)})
        return result.deleted_count > 0

    async def get_prompt_list(self, query: PromptQuery) -> Dict[str, Any]:
        """获取提示词模板列表"""
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
            items.append(PromptTemplate(**doc))
        
        return {
            "items": items,
            "total": total,
            "page": query.page,
            "per_page": query.per_page,
            "pages": pages
        }

    async def search_prompt(self, keyword: str) -> List[PromptTemplate]:
        """搜索提示词模板"""
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
            items.append(PromptTemplate(**doc))
        
        return items

    async def get_categories(self) -> List[str]:
        """获取所有分类"""
        categories = await self.collection.distinct("category")
        return [cat for cat in categories if cat]

    async def get_prompt_types(self) -> List[str]:
        """获取提示词类型列表"""
        return ["system", "user", "assistant", "general"]

    async def get_popular_prompts(self, limit: int = 10) -> List[PromptTemplate]:
        """获取热门提示词模板"""
        cursor = self.collection.find({"status": "published"}).sort([
            ("usage_count", DESCENDING),
            ("view_count", DESCENDING)
        ]).limit(limit)
        
        items = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            items.append(PromptTemplate(**doc))
        
        return items

    async def increment_view_count(self, prompt_id: str) -> bool:
        """增加查看次数"""
        if not ObjectId.is_valid(prompt_id):
            return False
            
        result = await self.collection.update_one(
            {"_id": ObjectId(prompt_id)},
            {"$inc": {"view_count": 1}}
        )
        return result.modified_count > 0

    async def increment_usage_count(self, prompt_id: str) -> bool:
        """增加使用次数"""
        if not ObjectId.is_valid(prompt_id):
            return False
            
        result = await self.collection.update_one(
            {"_id": ObjectId(prompt_id)},
            {"$inc": {"usage_count": 1}}
        )
        return result.modified_count > 0

# 全局数据库实例
_prompt_db: Optional[PromptDatabase] = None

async def get_prompt_database() -> PromptDatabase:
    """获取提示词模板数据库实例"""
    global _prompt_db
    if _prompt_db is None:
        from motor.motor_asyncio import AsyncIOMotorClient
        from services.config_service.config_center_service import config_center_service
        
        # 从配置中心获取数据库配置
        db_config = await config_center_service.get_config("database")
        mongodb_config = db_config.get("mongodb", {})
        
        # 检查MongoDB是否启用
        if not mongodb_config.get("enabled", True):
            raise ValueError("MongoDB未启用，无法初始化提示词数据库")
        
        # 获取连接参数
        mongodb_url = mongodb_config.get("url", "mongodb://localhost:27017")
        database_name = mongodb_config.get("database", "yushu_documents")
        timeout = mongodb_config.get("timeout", 10) * 1000  # 转换为毫秒
        
        # 创建MongoDB连接
        client = AsyncIOMotorClient(mongodb_url, serverSelectionTimeoutMS=timeout)
        database = client[database_name]
        
        _prompt_db = PromptDatabase(database)
        await _prompt_db.create_indexes()
    return _prompt_db
