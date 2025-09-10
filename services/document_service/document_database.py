"""
文档处理数据库服务
处理文档相关数据的MongoDB存储
"""

import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase, AsyncIOMotorCollection
from pymongo import DESCENDING
import os

from .document_models import (
    DocumentInfo, ParseResult, ContentEditHistory, 
    DocumentProcessingJob, GenerationRequest, TTSRequest
)
from services.config_service.config_center_service import config_center_service

logger = logging.getLogger(__name__)


class DocumentDatabase:
    """文档处理数据库服务"""
    
    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.database: Optional[AsyncIOMotorDatabase] = None
        self.documents: Optional[AsyncIOMotorCollection] = None
        self.parse_results: Optional[AsyncIOMotorCollection] = None
        self.edit_history: Optional[AsyncIOMotorCollection] = None
        self.processing_jobs: Optional[AsyncIOMotorCollection] = None
        self.processing_records: Optional[AsyncIOMotorCollection] = None
        
    async def connect(self, mongodb_url: str = None, database_name: str = None):
        """连接到MongoDB"""
        try:
            # 从配置中心获取数据库配置
            db_config = await config_center_service.get_config("database")
            mongodb_config = db_config.get("mongodb", {})
            
            # 检查MongoDB是否启用
            if not mongodb_config.get("enabled", True):
                logger.warning("MongoDB未启用，跳过连接")
                return
            
            # 使用配置中心的参数，如果没有传入参数的话
            if not mongodb_url:
                mongodb_url = mongodb_config.get("url", "mongodb://localhost:27017")
            
            if not database_name:
                database_name = mongodb_config.get("database", "yushu_documents")
            
            # 构建连接参数
            connect_kwargs = {
                "serverSelectionTimeoutMS": mongodb_config.get("timeout", 10) * 1000
            }
            
            # 添加认证信息（如果配置了）
            username = mongodb_config.get("username")
            password = mongodb_config.get("password")
            if username and password:
                connect_kwargs["username"] = username
                connect_kwargs["password"] = password
            
            self.client = AsyncIOMotorClient(mongodb_url, **connect_kwargs)
            self.database = self.client[database_name]
            
            # 获取集合
            self.documents = self.database.documents
            self.parse_results = self.database.parse_results
            self.edit_history = self.database.edit_history
            self.processing_jobs = self.database.processing_jobs
            self.processing_records = self.database.processing_records
            
            # 创建索引
            await self._create_indexes()
            
            logger.info(f"成功连接到MongoDB: {mongodb_url}/{database_name}")
            
        except Exception as e:
            logger.error(f"连接MongoDB失败: {e}")
            # 不抛出异常，允许应用在没有数据库的情况下运行
            logger.warning("应用将在无数据库模式下运行，部分功能可能受限")
    
    async def disconnect(self):
        """断开MongoDB连接"""
        if self.client:
            self.client.close()
            logger.info("MongoDB连接已关闭")
    
    async def _create_indexes(self):
        """创建数据库索引"""
        try:
            # 文档集合索引
            await self.documents.create_index("id", unique=True)
            await self.documents.create_index("upload_time")
            await self.documents.create_index("document_type")
            
            # 解析结果索引
            await self.parse_results.create_index("document_id")
            await self.parse_results.create_index("parse_time")
            
            # 编辑历史索引
            await self.edit_history.create_index("document_id")
            await self.edit_history.create_index("edit_time")
            
            # 处理任务索引
            await self.processing_jobs.create_index("document_id")
            await self.processing_jobs.create_index("created_time")
            await self.processing_jobs.create_index("status")
            
            # 处理记录索引
            await self.processing_records.create_index("document_id")
            await self.processing_records.create_index("created_time")
            await self.processing_records.create_index("status")
            
            logger.info("数据库索引创建完成")
            
        except Exception as e:
            logger.warning(f"创建索引失败: {e}")
    
    # ================== 文档信息管理 ==================
    
    async def save_document(self, document: DocumentInfo) -> bool:
        """保存文档信息"""
        try:
            doc_dict = document.model_dump()
            doc_dict["upload_time"] = datetime.now()
            
            await self.documents.insert_one(doc_dict)
            logger.info(f"文档信息已保存: {document.id}")
            return True
            
        except Exception as e:
            logger.error(f"保存文档信息失败: {e}")
            return False
    
    async def get_document(self, document_id: str) -> Optional[DocumentInfo]:
        """获取文档信息"""
        try:
            doc = await self.documents.find_one({"id": document_id})
            if doc:
                # 移除MongoDB的_id字段
                doc.pop("_id", None)
                return DocumentInfo(**doc)
            return None
            
        except Exception as e:
            logger.error(f"获取文档信息失败: {e}")
            return None
    
    async def update_document(self, document_id: str, updates: Dict[str, Any]) -> bool:
        """更新文档信息"""
        try:
            result = await self.documents.update_one(
                {"id": document_id},
                {"$set": updates}
            )
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"更新文档信息失败: {e}")
            return False
    
    # ================== 解析结果管理 ==================
    
    async def save_parse_result(self, result: ParseResult) -> bool:
        """保存解析结果"""
        try:
            result_dict = result.model_dump()
            result_dict["parse_time"] = datetime.now()
            
            await self.parse_results.insert_one(result_dict)
            logger.info(f"解析结果已保存: {result.document_id}")
            return True
            
        except Exception as e:
            logger.error(f"保存解析结果失败: {e}")
            return False
    
    async def get_parse_result(self, document_id: str) -> Optional[ParseResult]:
        """获取解析结果"""
        try:
            result = await self.parse_results.find_one({"document_id": document_id})
            if result:
                result.pop("_id", None)
                return ParseResult(**result)
            return None
            
        except Exception as e:
            logger.error(f"获取解析结果失败: {e}")
            return None
    
    # ================== 处理记录管理 ==================
    
    async def save_processing_record(self, record: Dict[str, Any]) -> bool:
        """保存处理记录"""
        try:
            record["created_time"] = datetime.now()
            record["id"] = record.get("id", f"record_{datetime.now().timestamp()}")
            
            await self.processing_records.insert_one(record)
            logger.info(f"处理记录已保存: {record['id']}")
            return True
            
        except Exception as e:
            logger.error(f"保存处理记录失败: {e}")
            return False
    
    async def get_processing_records(self, limit: int = 50, skip: int = 0) -> List[Dict[str, Any]]:
        """获取处理记录列表"""
        try:
            if self.processing_records is None:
                logger.warning("processing_records集合未初始化")
                return []
                
            cursor = self.processing_records.find().sort("created_time", DESCENDING).skip(skip).limit(limit)
            records = []
            
            async for record in cursor:
                record.pop("_id", None)
                records.append(record)
            
            return records
            
        except Exception as e:
            logger.error(f"获取处理记录失败: {e}")
            return []
    
    async def get_processing_records_by_document(self, document_id: str) -> List[Dict[str, Any]]:
        """获取指定文档的处理记录"""
        try:
            cursor = self.processing_records.find({"document_id": document_id}).sort("created_time", DESCENDING)
            records = []
            
            async for record in cursor:
                record.pop("_id", None)
                records.append(record)
            
            return records
            
        except Exception as e:
            logger.error(f"获取文档处理记录失败: {e}")
            return []
    
    async def update_processing_record(self, record_id: str, updates: Dict[str, Any]) -> bool:
        """更新处理记录"""
        try:
            updates["updated_time"] = datetime.now()
            result = await self.processing_records.update_one(
                {"id": record_id},
                {"$set": updates}
            )
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"更新处理记录失败: {e}")
            return False
    
    # ================== 编辑历史管理 ==================
    
    async def save_edit_history(self, history: ContentEditHistory) -> bool:
        """保存编辑历史"""
        try:
            history_dict = history.model_dump()
            history_dict["edit_time"] = datetime.now()
            
            await self.edit_history.insert_one(history_dict)
            logger.info(f"编辑历史已保存: {history.document_id}")
            return True
            
        except Exception as e:
            logger.error(f"保存编辑历史失败: {e}")
            return False
    
    async def get_edit_history(self, document_id: str, limit: int = 10) -> List[ContentEditHistory]:
        """获取编辑历史"""
        try:
            cursor = self.edit_history.find({"document_id": document_id}).sort("edit_time", DESCENDING).limit(limit)
            histories = []
            
            async for history in cursor:
                history.pop("_id", None)
                histories.append(ContentEditHistory(**history))
            
            return histories
            
        except Exception as e:
            logger.error(f"获取编辑历史失败: {e}")
            return []
    
    # ================== 统计信息 ==================
    
    async def get_statistics(self) -> Dict[str, Any]:
        """获取统计信息"""
        try:
            if self.documents is None or self.processing_records is None:
                logger.warning("数据库集合未初始化，返回默认统计信息")
                return {
                    "total_documents": 0,
                    "total_records": 0,
                    "recent_24h": 0,
                    "success_rate": 0,
                    "document_types": {},
                    "processing_status": {}
                }
                
            stats = {
                "total_documents": await self.documents.count_documents({}),
                "total_records": await self.processing_records.count_documents({}),
                "recent_24h": await self.processing_records.count_documents({
                    "created_time": {"$gte": datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)}
                }),
                "success_rate": 0,
                "document_types": {},
                "processing_status": {}
            }
            
            # 计算成功率
            total_records = await self.processing_records.count_documents({})
            if total_records > 0:
                success_records = await self.processing_records.count_documents({"status": "completed"})
                stats["success_rate"] = round((success_records / total_records) * 100, 2)
            
            # 文档类型分布
            pipeline = [
                {"$group": {"_id": "$document_type", "count": {"$sum": 1}}}
            ]
            async for item in self.documents.aggregate(pipeline):
                stats["document_types"][item["_id"]] = item["count"]
            
            # 处理状态分布
            pipeline = [
                {"$group": {"_id": "$status", "count": {"$sum": 1}}}
            ]
            async for item in self.processing_records.aggregate(pipeline):
                stats["processing_status"][item["_id"]] = item["count"]
            
            return stats
            
        except Exception as e:
            logger.error(f"获取统计信息失败: {e}")
            return {}


# 全局数据库实例
document_db = DocumentDatabase()


async def get_document_database() -> DocumentDatabase:
    """获取文档数据库实例"""
    if not document_db.client:
        await document_db.connect()
    return document_db
