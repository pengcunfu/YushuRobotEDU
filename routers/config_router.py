"""
配置管理路由器 - 纯API版本
处理配置相关的API端点
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from typing import List
from services.config_service import ConfigService

def format_file_size(size_bytes):
    """格式化文件大小"""
    if size_bytes == 0:
        return "0 B"
    size_names = ["B", "KB", "MB", "GB"]
    import math
    i = int(math.floor(math.log(size_bytes, 1024)))
    p = math.pow(1024, i)
    s = round(size_bytes / p, 2)
    return f"{s} {size_names[i]}"

# 创建配置API路由器
router = APIRouter(
    prefix="/api/configs",
    tags=["配置管理"],
    responses={404: {"description": "配置文件不存在"}}
)

# 初始化配置服务
config_service = ConfigService()


@router.get("", response_model=List[dict])
async def get_all_configs():
    """获取所有配置文件"""
    return config_service.get_yaml_files()


@router.get("/{filename}")
async def get_config(filename: str):
    """获取指定配置文件内容"""
    config_data = config_service.load_yaml_config(filename)
    if not config_data and filename not in [f['filename'] for f in config_service.get_yaml_files()]:
        raise HTTPException(status_code=404, detail="配置文件不存在")
    return {"filename": filename, "data": config_data}


@router.post("/{filename}")
async def save_config(filename: str, config_data: dict):
    """保存配置文件"""
    try:
        success = config_service.save_yaml_config(filename, config_data["data"])
        if success:
            return {"message": "配置保存成功", "filename": filename}
        else:
            raise HTTPException(status_code=500, detail="配置保存失败")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{filename}")
async def delete_config(filename: str):
    """删除配置文件"""
    success = config_service.delete_yaml_config(filename)
    if not success:
        raise HTTPException(status_code=404, detail="配置文件不存在")
    return {"message": "配置文件删除成功"}


@router.post("/{filename}/validate")
async def validate_config(filename: str, content: dict):
    """验证YAML配置内容"""
    try:
        is_valid, error_msg = config_service.validate_yaml_content(content["content"])
        return {"valid": is_valid, "error": error_msg}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{filename}/backup")
async def backup_config(filename: str):
    """备份配置文件"""
    success = config_service.backup_config(filename)
    if success:
        return {"message": "配置备份成功"}
    else:
        raise HTTPException(status_code=500, detail="配置备份失败")


@router.get("/{filename}/backups")
async def get_config_backups(filename: str):
    """获取配置文件的备份列表"""
    backups = config_service.get_backups(filename)
    return {"filename": filename, "backups": backups}


@router.post("/{filename}/restore")
async def restore_config(filename: str, backup_data: dict):
    """从备份恢复配置文件"""
    backup_filename = backup_data.get("backup_filename")
    if not backup_filename:
        raise HTTPException(status_code=400, detail="缺少备份文件名")
    
    success = config_service.restore_config(filename, backup_filename)
    if success:
        return {"message": "配置恢复成功"}
    else:
        raise HTTPException(status_code=500, detail="配置恢复失败")


@router.get("/statistics/overview")
async def get_config_statistics():
    """获取配置管理统计信息"""
    return config_service.get_config_statistics()


@router.get("/search/{query}")
async def search_configs(query: str):
    """搜索配置文件"""
    if not query:
        raise HTTPException(status_code=400, detail="搜索查询不能为空")
    
    results = config_service.search_configs(query)
    return {"query": query, "results": results}


@router.get("/{filename}/download")
async def download_config(filename: str):
    """下载配置文件"""
    import os
    
    file_path = config_service.config_dir / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="配置文件不存在")
    
    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type='application/octet-stream'
    )


@router.post("/upload")
async def upload_config(file: str):
    """上传配置文件"""
    # 这是一个简化版本，实际应该处理文件上传
    return {"message": "上传功能需要实现文件处理"}


@router.post("")
async def create_config(config_data: dict):
    """创建新配置文件"""
    try:
        filename = config_data.get("filename")
        data = config_data.get("data", {})
        
        if not filename:
            raise HTTPException(status_code=400, detail="缺少文件名")
        
        if not filename.endswith(('.yaml', '.yml')):
            filename += '.yaml'
        
        success = config_service.save_yaml_config(filename, data)
        if success:
            return {"message": "配置文件创建成功", "filename": filename}
        else:
            raise HTTPException(status_code=500, detail="配置文件创建失败")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))