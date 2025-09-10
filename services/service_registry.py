"""
服务注册中心
管理微服务的注册、发现和健康检查
"""

from typing import Dict, List, Optional
from datetime import datetime
import asyncio
import logging

logger = logging.getLogger(__name__)


class ServiceInfo:
    """服务信息类"""
    
    def __init__(self, name: str, version: str, description: str, 
                 prefix: str, health_endpoint: Optional[str] = None):
        self.name = name
        self.version = version
        self.description = description
        self.prefix = prefix
        self.health_endpoint = health_endpoint
        self.registered_at = datetime.now()
        self.last_health_check = None
        self.status = "healthy"


class ServiceRegistry:
    """服务注册中心"""
    
    def __init__(self):
        self.services: Dict[str, ServiceInfo] = {}
        self.health_check_interval = 30  # 秒
    
    def register_service(self, service_info: ServiceInfo) -> bool:
        """注册服务"""
        try:
            self.services[service_info.name] = service_info
            logger.info(f"服务注册成功: {service_info.name} ({service_info.prefix})")
            return True
        except Exception as e:
            logger.error(f"服务注册失败: {service_info.name} - {e}")
            return False
    
    def unregister_service(self, service_name: str) -> bool:
        """注销服务"""
        if service_name in self.services:
            del self.services[service_name]
            logger.info(f"服务注销成功: {service_name}")
            return True
        return False
    
    def get_service(self, service_name: str) -> Optional[ServiceInfo]:
        """获取服务信息"""
        return self.services.get(service_name)
    
    def get_all_services(self) -> Dict[str, ServiceInfo]:
        """获取所有服务"""
        return self.services.copy()
    
    def get_healthy_services(self) -> Dict[str, ServiceInfo]:
        """获取健康的服务"""
        return {
            name: service for name, service in self.services.items()
            if service.status == "healthy"
        }
    
    def update_service_health(self, service_name: str, status: str):
        """更新服务健康状态"""
        if service_name in self.services:
            self.services[service_name].status = status
            self.services[service_name].last_health_check = datetime.now()
    
    def get_service_statistics(self) -> Dict:
        """获取服务统计信息"""
        total_services = len(self.services)
        healthy_services = len(self.get_healthy_services())
        
        return {
            "total_services": total_services,
            "healthy_services": healthy_services,
            "unhealthy_services": total_services - healthy_services,
            "services": [
                {
                    "name": service.name,
                    "version": service.version,
                    "status": service.status,
                    "prefix": service.prefix,
                    "registered_at": service.registered_at.isoformat(),
                    "last_health_check": service.last_health_check.isoformat() if service.last_health_check else None
                }
                for service in self.services.values()
            ]
        }


# 全局服务注册中心实例
registry = ServiceRegistry()


def auto_register_services():
    """自动注册已知服务"""
    services = [
        ServiceInfo(
            name="用户管理",
            version="1.0.0",
            description="用户的CRUD操作、搜索和统计功能",
            prefix="/api/users"
        ),
        ServiceInfo(
            name="产品管理",
            version="1.0.0",
            description="产品的CRUD操作、库存管理和统计功能",
            prefix="/api/products"
        ),
        ServiceInfo(
            name="配置管理",
            version="1.0.0",
            description="YAML配置文件的API管理服务",
            prefix="/api/configs"
        )
    ]
    
    for service in services:
        registry.register_service(service)
    
    logger.info(f"自动注册了 {len(services)} 个服务")


# 启动时自动注册服务
auto_register_services()
