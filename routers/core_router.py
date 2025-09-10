"""
核心路由器 - 纯API版本
处理应用程序的基础端点
"""

from fastapi import APIRouter

# 创建核心路由器
router = APIRouter(tags=["核心功能"])


@router.get("/")
async def root():
    """根路径，返回API信息"""
    return {
        "message": "YushuRobot API服务",
        "version": "2.0.0",
        "description": "纯API后端服务，前端使用React应用",
        "docs": "/docs",
        "frontend": "React应用运行在端口3000"
    }


@router.get("/api")
async def api_info():
    """API信息"""
    return {
        "message": "欢迎使用YushuRobot微服务API",
        "version": "2.0.0",
        "services": ["用户管理", "产品管理", "配置管理"],
        "docs": "/docs",
        "architecture": "前后端分离的微服务架构",
        "frontend_url": "http://localhost:3000"
    }


@router.get("/health")
async def health_check():
    """健康检查端点"""
    return {"status": "healthy", "service": "YushuRobot API服务"}


@router.get("/api/services")
async def get_available_services():
    """获取可用服务列表"""
    return {
        "services": [
            {
                "name": "用户管理",
                "prefix": "/api/users",
                "description": "用户的CRUD操作、搜索和统计"
            },
            {
                "name": "产品管理",
                "prefix": "/api/products",
                "description": "产品的CRUD操作、库存管理和统计"
            },
            {
                "name": "配置管理",
                "prefix": "/api/configs",
                "description": "YAML配置文件的管理"
            },
            {
                "name": "系统管理",
                "prefix": "/admin",
                "description": "系统监控和服务管理"
            }
        ]
    }
