"""
PPT转图片处理服务
与YushuRobotPPT2IMG服务交互，处理PPTX文件转换为图片
"""

import os
import uuid
import time
import asyncio
import requests
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any
from urllib.parse import urljoin
from datetime import datetime

try:
    from ..config_service.config_center_service import config_center_service
except ImportError:
    config_center_service = None

logger = logging.getLogger(__name__)


class PPTConverter:
    """PPT转图片处理器"""
    
    def __init__(self):
        self.task_storage = {}  # 存储任务状态
        self.processing_files = {}  # 存储正在处理的文件，避免重复处理
        
    async def get_config(self) -> Dict[str, Any]:
        """获取PPT服务配置"""
        try:
            if config_center_service:
                config = await config_center_service.get_config("ppt_service")
                if config:
                    return config
            
            # 返回默认配置
            return {
                "enabled": True,
                "service_url": "http://localhost:8020",
                "callback_url": "",
                "upload_timeout": 60,
                "max_file_size": 100,
                "image_width": 1920,
                "image_height": 1080,
                "retry_attempts": 3,
                "retry_delay": 5
            }
        except Exception as e:
            logger.error(f"获取PPT服务配置失败: {e}")
            # 返回默认配置
            return {
                "enabled": True,
                "service_url": "http://localhost:8020",
                "callback_url": "",
                "upload_timeout": 60,
                "max_file_size": 100,
                "image_width": 1920,
                "image_height": 1080,
                "retry_attempts": 3,
                "retry_delay": 5
            }
    
    async def convert_ppt_to_images(
        self, 
        ppt_path: str, 
        document_id: str,
        output_dir: str
    ) -> List[str]:
        """
        将PPT文件转换为图片（每个文件只处理一次）
        
        Args:
            ppt_path: PPT文件路径
            document_id: 文档ID
            output_dir: 输出目录
            
        Returns:
            List[str]: 图片文件路径列表
        """
        # 检查是否已经在处理中
        if document_id in self.processing_files:
            logger.info(f"文档 {document_id} 正在处理中，跳过重复请求")
            # 等待已有处理完成
            while document_id in self.processing_files:
                await asyncio.sleep(1)
            # 返回已处理的结果
            return self._get_existing_images(output_dir, document_id)
        
        # 检查是否已经有图片了
        existing_images = self._get_existing_images(output_dir, document_id)
        if existing_images:
            logger.info(f"文档 {document_id} 已存在 {len(existing_images)} 张图片，直接返回")
            return existing_images
        
        # 标记为正在处理
        self.processing_files[document_id] = True
        
        try:
            config = await self.get_config()
            
            if not config.get("enabled", True):
                raise Exception("PPT转图片服务已禁用")
            
            service_url = config.get("service_url", "http://localhost:8020")
            
            # 检查文件是否存在
            if not os.path.exists(ppt_path):
                raise FileNotFoundError(f"PPT文件不存在: {ppt_path}")
            
            # 检查文件大小
            file_size_mb = os.path.getsize(ppt_path) / (1024 * 1024)
            max_size = config.get("max_file_size", 100)
            if file_size_mb > max_size:
                raise Exception(f"文件过大: {file_size_mb:.1f}MB > {max_size}MB")
            
            # 创建输出目录
            os.makedirs(output_dir, exist_ok=True)
            
            # 设置回调URL
            callback_url = self._get_callback_url()
            
            # 上传文件并开始转换
            task_id = await self._upload_and_convert(
                ppt_path=ppt_path,
                service_url=service_url,
                callback_url=callback_url,
                config=config
            )
            
            # 等待转换完成
            image_urls = await self._wait_for_conversion(task_id, config)
            
            # 下载图片到本地
            image_paths = await self._download_images(
                image_urls=image_urls,
                output_dir=output_dir,
                document_id=document_id,
                service_url=service_url
            )
            
            return image_paths
            
        except Exception as e:
            logger.error(f"PPT转图片失败: {e}")
            raise
        finally:
            # 移除处理标记
            if document_id in self.processing_files:
                del self.processing_files[document_id]
    
    def _get_existing_images(self, output_dir: str, document_id: str) -> List[str]:
        """检查是否已存在图片文件"""
        try:
            if not os.path.exists(output_dir):
                return []
            
            image_paths = []
            page_num = 1
            
            while True:
                image_filename = f"{document_id}_page_{page_num}.png"
                image_path = os.path.join(output_dir, image_filename)
                
                if os.path.exists(image_path):
                    image_paths.append(image_path)
                    page_num += 1
                else:
                    break
            
            return image_paths
        except Exception as e:
            logger.error(f"检查已存在图片失败: {e}")
            return []
    
    def _get_callback_url(self) -> str:
        """获取回调URL"""
        try:
            # 从环境变量或配置中获取服务地址
            import os
            base_url = os.getenv('APP_BASE_URL', 'http://localhost:8000')
            return f"{base_url}/api/slides/ppt-callback"
        except Exception:
            return "http://localhost:8000/api/slides/ppt-callback"
    
    async def _upload_and_convert(
        self, 
        ppt_path: str, 
        service_url: str, 
        callback_url: str,
        config: Dict[str, Any]
    ) -> str:
        """上传文件并开始转换"""
        upload_url = urljoin(service_url, "/api/upload")
        
        # 准备上传数据
        files = {
            'file': open(ppt_path, 'rb')
        }
        
        data = {
            'callback_url': callback_url,
            'width': config.get("image_width", 1920),
            'height': config.get("image_height", 1080)
        }
        
        try:
            timeout = config.get("upload_timeout", 60)
            response = requests.post(
                upload_url,
                files=files,
                data=data,
                timeout=timeout
            )
            
            if response.status_code != 200:
                raise Exception(f"上传失败: HTTP {response.status_code}")
            
            result = response.json()
            task_id = result.get("task_id")
            
            if not task_id:
                raise Exception("未获取到任务ID")
            
            logger.info(f"PPT上传成功，任务ID: {task_id}")
            
            # 存储任务信息
            self.task_storage[task_id] = {
                "status": "pending",
                "created_at": time.time(),
                "ppt_path": ppt_path
            }
            
            return task_id
            
        except Exception as e:
            logger.error(f"上传PPT文件失败: {e}")
            raise
        finally:
            files['file'].close()
    
    async def _wait_for_conversion(self, task_id: str, config: Dict[str, Any]) -> List[str]:
        """等待转换完成（单次检查，不重试）"""
        max_wait_time = 120  # 最大等待2分钟
        check_interval = 3   # 每3秒检查一次
        start_time = time.time()
        
        logger.info(f"等待任务 {task_id} 转换完成...")
        
        while time.time() - start_time < max_wait_time:
            task_info = self.task_storage.get(task_id, {})
            status = task_info.get("status", "pending")
            
            if status == "completed":
                images = task_info.get("images", [])
                if images:
                    logger.info(f"任务 {task_id} 转换成功，获得 {len(images)} 张图片")
                    return [img["path"] for img in images]
                else:
                    raise Exception("转换完成但未获取到图片信息")
            
            elif status == "failed":
                error = task_info.get("error", "转换失败")
                raise Exception(f"PPT转换失败: {error}")
            
            # 等待一段时间后继续检查
            await asyncio.sleep(check_interval)
        
        # 超时 - 不重试，直接失败
        raise Exception(f"PPT转换超时（{max_wait_time}秒），任务ID: {task_id}")
    
    async def _download_images(
        self, 
        image_urls: List[str], 
        output_dir: str, 
        document_id: str,
        service_url: str
    ) -> List[str]:
        """下载转换后的图片到本地"""
        local_paths = []
        
        for i, image_url in enumerate(image_urls):
            try:
                # 构建完整的图片URL
                if image_url.startswith("/"):
                    full_url = urljoin(service_url, image_url)
                else:
                    full_url = image_url
                
                # 下载图片
                response = requests.get(full_url, timeout=30)
                if response.status_code != 200:
                    logger.warning(f"下载图片失败: {full_url}, HTTP {response.status_code}")
                    continue
                
                # 保存图片到本地
                image_filename = f"{document_id}_page_{i + 1}.png"
                local_path = os.path.join(output_dir, image_filename)
                
                with open(local_path, 'wb') as f:
                    f.write(response.content)
                
                local_paths.append(local_path)
                logger.info(f"图片下载成功: {local_path}")
                
            except Exception as e:
                logger.error(f"下载图片失败 {image_url}: {e}")
                continue
        
        if not local_paths:
            raise Exception("没有成功下载任何图片")
        
        logger.info(f"成功下载 {len(local_paths)} 张图片")
        return local_paths
    
    def handle_callback(self, task_id: str, callback_data: Dict[str, Any]) -> bool:
        """处理PPT转换服务的回调"""
        try:
            if task_id not in self.task_storage:
                logger.warning(f"收到未知任务的回调: {task_id}")
                return False
            
            # 更新任务状态
            self.task_storage[task_id].update({
                "status": callback_data.get("status", "unknown"),
                "updated_at": time.time(),
                "callback_data": callback_data
            })
            
            # 如果转换完成，提取图片信息
            if callback_data.get("status") == "completed":
                images = callback_data.get("images", [])
                self.task_storage[task_id]["images"] = images
                logger.info(f"任务 {task_id} 转换完成，生成 {len(images)} 张图片")
            
            elif callback_data.get("status") == "failed":
                error = callback_data.get("error", "未知错误")
                self.task_storage[task_id]["error"] = error
                logger.error(f"任务 {task_id} 转换失败: {error}")
            
            return True
            
        except Exception as e:
            logger.error(f"处理回调失败: {e}")
            return False
    
    def cleanup_old_tasks(self, max_age_hours: int = 24):
        """清理旧的任务记录"""
        try:
            current_time = time.time()
            max_age_seconds = max_age_hours * 3600
            
            tasks_to_remove = []
            for task_id, task_info in self.task_storage.items():
                created_at = task_info.get("created_at", 0)
                if current_time - created_at > max_age_seconds:
                    tasks_to_remove.append(task_id)
            
            for task_id in tasks_to_remove:
                del self.task_storage[task_id]
                logger.info(f"清理旧任务: {task_id}")
            
            if tasks_to_remove:
                logger.info(f"清理了 {len(tasks_to_remove)} 个旧任务")
                
        except Exception as e:
            logger.error(f"清理旧任务失败: {e}")


# 创建全局实例
ppt_converter = PPTConverter()
