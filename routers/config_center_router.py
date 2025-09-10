"""
配置管理中心路由器 - 图形化配置管理
提供模块化配置界面，而不是文件编辑
"""

from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from pydantic import BaseModel
from services.config_service.config_center_service import config_center_service
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio


# ===== 请求模型 =====

class DatabaseTestRequest(BaseModel):
    """数据库连接测试请求"""
    db_type: str  # mongodb, redis, mysql, postgresql
    connection_config: Dict[str, Any]


# 创建配置中心API路由器
router = APIRouter(
    prefix="/api/config-center",
    tags=["配置管理中心"],
    responses={404: {"description": "配置模块不存在"}}
)


@router.get("/modules", response_model=List[Dict[str, Any]])
async def get_config_modules():
    """获取所有配置模块信息"""
    return config_center_service.get_config_modules()


@router.get("/categories", response_model=List[Dict[str, Any]])
async def get_config_categories():
    """获取配置分类统计"""
    return config_center_service.get_config_categories()


@router.get("/modules/{module_name}")
async def get_module_config(module_name: str):
    """获取指定模块的配置"""
    try:
        return config_center_service.get_module_config(module_name)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取配置失败: {str(e)}")


@router.put("/modules/{module_name}")
async def update_module_config(module_name: str, config_data: Dict[str, Any]):
    """更新指定模块的配置"""
    try:
        return config_center_service.update_module_config(module_name, config_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新配置失败: {str(e)}")


@router.post("/modules/{module_name}/validate")
async def validate_module_config(module_name: str, config_data: Dict[str, Any]):
    """验证指定模块的配置"""
    try:
        return config_center_service.validate_module_config(module_name, config_data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"验证配置失败: {str(e)}")


@router.post("/modules/{module_name}/reset")
async def reset_module_config(module_name: str):
    """重置指定模块的配置为默认值"""
    try:
        return config_center_service.reset_module_config(module_name)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"重置配置失败: {str(e)}")


@router.get("/modules/{module_name}/backups")
async def get_config_backups(module_name: str):
    """获取指定模块的备份列表"""
    try:
        return config_center_service.get_config_backups(module_name)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取备份列表失败: {str(e)}")


@router.post("/modules/{module_name}/restore")
async def restore_config_backup(module_name: str, backup_data: Dict[str, str]):
    """从备份恢复配置"""
    backup_filename = backup_data.get("backup_filename")
    if not backup_filename:
        raise HTTPException(status_code=400, detail="缺少备份文件名")

    try:
        return config_center_service.restore_config_backup(module_name, backup_filename)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"恢复配置失败: {str(e)}")


@router.get("/export")
async def export_all_configs():
    """导出所有配置"""
    try:
        return config_center_service.export_all_configs()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导出配置失败: {str(e)}")


@router.post("/import")
async def import_all_configs(import_data: Dict[str, Any]):
    """导入所有配置"""
    configs_data = import_data.get("configs", {})
    if not configs_data:
        raise HTTPException(status_code=400, detail="缺少配置数据")

    try:
        return config_center_service.import_all_configs(configs_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导入配置失败: {str(e)}")


@router.get("/status")
async def get_system_status():
    """获取配置系统状态"""
    try:
        return config_center_service.get_system_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取系统状态失败: {str(e)}")


# ===== 配置模块特定的API端点 =====

@router.get("/providers/{service_type}")
async def get_service_providers(service_type: str):
    """获取指定服务类型的提供商列表"""
    providers = {
        "llm": [
            {"value": "xunfei_open_service", "label": "讯飞星火", "description": "科大讯飞星火认知大模型"},
            {"value": "zhipu", "label": "智谱AI", "description": "清华大学智谱AI ChatGLM"},
            {"value": "baidu_open_service", "label": "百度文心", "description": "百度文心一言大模型"},
            {"value": "tencent_open_service", "label": "腾讯云", "description": "腾讯云混元大模型"},
            {"value": "douyin_open_service", "label": "抖音豆包", "description": "字节跳动豆包大模型"}
        ],
        "asr": [
            {"value": "baidu_open_service", "label": "百度ASR", "description": "百度语音识别服务"},
            {"value": "xunfei_open_service", "label": "讯飞ASR", "description": "科大讯飞语音识别"},
            {"value": "aliyun_open_service", "label": "阿里云ASR", "description": "阿里云语音识别"},
            {"value": "tencent_open_service", "label": "腾讯云ASR", "description": "腾讯云语音识别"},
            {"value": "douyin_open_service", "label": "抖音ASR", "description": "字节跳动语音识别"}
        ],
        "tts": [
            {"value": "baidu_open_service", "label": "百度TTS", "description": "百度语音合成服务"},
            {"value": "xunfei_open_service", "label": "讯飞TTS", "description": "科大讯飞语音合成"},
            {"value": "aliyun_open_service", "label": "阿里云TTS", "description": "阿里云语音合成"},
            {"value": "tencent_open_service", "label": "腾讯云TTS", "description": "腾讯云语音合成"},
            {"value": "douyin_open_service", "label": "抖音TTS", "description": "字节跳动语音合成"}
        ]
    }

    if service_type not in providers:
        raise HTTPException(status_code=404, detail=f"未知的服务类型: {service_type}")

    return providers[service_type]


@router.get("/voices/{provider}")
async def get_provider_voices(provider: str):
    """获取指定提供商的音色列表"""
    voices = {
        "baidu_open_service": [
            {"value": "zh", "label": "标准女声", "description": "清晰自然的女性声音"},
            {"value": "0", "label": "标准女声", "description": "清晰自然的女性声音"},
            {"value": "1", "label": "标准男声", "description": "清晰自然的男性声音"},
            {"value": "3", "label": "情感男声", "description": "富有情感的男性声音"},
            {"value": "4", "label": "情感女声", "description": "富有情感的女性声音"}
        ],
        "xunfei_open_service": [
            {"value": "xiaoyan", "label": "小燕", "description": "温和清甜的女性声音"},
            {"value": "xiaoyu", "label": "小宇", "description": "稳重自然的男性声音"},
            {"value": "xiaoxue", "label": "小雪", "description": "清新活泼的女性声音"},
            {"value": "xiaofeng", "label": "小峰", "description": "磁性温暖的男性声音"}
        ],
        "aliyun_open_service": [
            {"value": "xiaoyun", "label": "小云", "description": "甜美清晰的女性声音"},
            {"value": "xiaogang", "label": "小刚", "description": "浑厚有力的男性声音"},
            {"value": "ruoxi", "label": "若汐", "description": "温柔知性的女性声音"}
        ]
    }

    if provider not in voices:
        return []

    return voices[provider]


@router.get("/models/{provider}")
async def get_provider_models(provider: str, service_type: str = "llm"):
    """获取指定提供商的模型列表"""
    models = {
        "llm": {
            "zhipu": [
                {"value": "chatglm_turbo", "label": "ChatGLM Turbo", "description": "快速响应版本"},
                {"value": "chatglm_pro", "label": "ChatGLM Pro", "description": "专业版本"},
                {"value": "chatglm_std", "label": "ChatGLM Standard", "description": "标准版本"}
            ],
            "baidu_open_service": [
                {"value": "ernie_bot", "label": "文心一言", "description": "标准版本"},
                {"value": "ernie_bot_turbo", "label": "文心一言Turbo", "description": "快速版本"},
                {"value": "ernie_bot_4", "label": "文心一言4.0", "description": "最新版本"}
            ],
            "xunfei_open_service": [
                {"value": "generalv1", "label": "星火V1.5", "description": "基础版本"},
                {"value": "generalv2", "label": "星火V2.0", "description": "增强版本"},
                {"value": "generalv3", "label": "星火V3.0", "description": "最新版本"}
            ]
        }
    }

    if service_type not in models or provider not in models[service_type]:
        return []

    return models[service_type][provider]


# ===== 数据库连接测试API =====

@router.post("/test-connection")
async def test_database_connection(request: DatabaseTestRequest):
    """测试数据库连接"""
    try:
        if request.db_type == "mongodb":
            return await _test_mongodb_connection(request.connection_config)
        elif request.db_type == "redis":
            return await _test_redis_connection(request.connection_config)
        elif request.db_type == "mysql":
            return await _test_mysql_connection(request.connection_config)
        elif request.db_type == "postgresql":
            return await _test_postgresql_connection(request.connection_config)
        else:
            raise HTTPException(status_code=400, detail=f"不支持的数据库类型: {request.db_type}")

    except Exception as e:
        return {
            "success": False,
            "message": f"连接测试失败: {str(e)}",
            "details": str(e)
        }


async def _test_mongodb_connection(config: Dict[str, Any]) -> Dict[str, Any]:
    """测试MongoDB连接"""
    client = None
    try:
        # 构建连接参数
        connect_kwargs = {
            "serverSelectionTimeoutMS": config.get("timeout", 10) * 1000
        }

        # 添加认证信息（如果配置了）
        username = config.get("username")
        password = config.get("password")
        if username and password:
            connect_kwargs["username"] = username
            connect_kwargs["password"] = password

        # 创建客户端
        client = AsyncIOMotorClient(config.get("url", "mongodb://localhost:27017"), **connect_kwargs)

        # 测试连接
        await client.admin.command('ping')

        # 测试数据库访问
        database_name = config.get("database", "test")
        db = client[database_name]
        await db.list_collection_names()

        return {
            "success": True,
            "message": "MongoDB连接成功",
            "details": f"成功连接到 {config.get('url')} 的数据库 {database_name}"
        }

    except Exception as e:
        return {
            "success": False,
            "message": "MongoDB连接失败",
            "details": str(e)
        }
    finally:
        if client:
            client.close()


async def _test_redis_connection(config: Dict[str, Any]) -> Dict[str, Any]:
    """测试Redis连接"""
    try:
        # 这里可以添加Redis连接测试逻辑
        return {
            "success": False,
            "message": "Redis连接测试暂未实现",
            "details": "Redis连接功能正在开发中"
        }
    except Exception as e:
        return {
            "success": False,
            "message": "Redis连接失败",
            "details": str(e)
        }


async def _test_mysql_connection(config: Dict[str, Any]) -> Dict[str, Any]:
    """测试MySQL连接"""
    try:
        # 这里可以添加MySQL连接测试逻辑
        return {
            "success": False,
            "message": "MySQL连接测试暂未实现",
            "details": "MySQL连接功能正在开发中"
        }
    except Exception as e:
        return {
            "success": False,
            "message": "MySQL连接失败",
            "details": str(e)
        }


async def _test_postgresql_connection(config: Dict[str, Any]) -> Dict[str, Any]:
    """测试PostgreSQL连接"""
    try:
        # 这里可以添加PostgreSQL连接测试逻辑
        return {
            "success": False,
            "message": "PostgreSQL连接测试暂未实现",
            "details": "PostgreSQL连接功能正在开发中"
        }
    except Exception as e:
        return {
            "success": False,
            "message": "PostgreSQL连接失败",
            "details": str(e)
        }
