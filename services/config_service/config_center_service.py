"""
配置管理中心服务
提供图形化配置管理，而不是简单的文件编辑
"""

import yaml
import json
from pathlib import Path
from typing import Dict, Any, List, Optional, Type
from datetime import datetime
import shutil
from .config_models import (
    CONFIG_MODULES, CONFIG_CLASSES,
    DefaultConfig, RobotConfig, LLMConfig, ASRConfig, TTSConfig,
    ConfigModule
)


class ConfigCenterService:
    """配置管理中心服务"""
    
    def __init__(self, config_dir: str = "services/config_service/config"):
        self.config_dir = Path(config_dir)
    
    def get_config_modules(self) -> List[Dict[str, Any]]:
        """获取所有配置模块信息"""
        modules = []
        for module_name, module_info in CONFIG_MODULES.items():
            # 检查配置文件是否存在
            config_file = self.config_dir / f"{module_name}.yaml"
            status = "available" if config_file.exists() else "missing"
            
            # 获取最后修改时间
            last_modified = None
            if config_file.exists():
                last_modified = datetime.fromtimestamp(config_file.stat().st_mtime).isoformat()
            
            modules.append({
                "name": module_info.name,
                "title": module_info.title,
                "description": module_info.description,
                "category": module_info.category,
                "icon": module_info.icon,
                "enabled": module_info.enabled,
                "status": status,
                "last_modified": last_modified,
                "file_size": config_file.stat().st_size if config_file.exists() else 0
            })
        
        return modules
    
    def get_config_categories(self) -> List[Dict[str, Any]]:
        """获取配置分类统计"""
        categories = {}
        for module_info in CONFIG_MODULES.values():
            category = module_info.category
            if category not in categories:
                categories[category] = {
                    "name": category,
                    "count": 0,
                    "modules": []
                }
            categories[category]["count"] += 1
            categories[category]["modules"].append(module_info.name)
        
        return list(categories.values())
    
    def get_module_config(self, module_name: str) -> Dict[str, Any]:
        """获取指定模块的配置"""
        if module_name not in CONFIG_MODULES:
            raise ValueError(f"未知的配置模块: {module_name}")
        
        module_info = CONFIG_MODULES[module_name]
        config_file = self.config_dir / f"{module_name}.yaml"
        
        # 获取配置类
        config_class = CONFIG_CLASSES[module_info.config_class]
        
        # 加载配置文件
        if config_file.exists():
            with open(config_file, 'r', encoding='utf-8') as f:
                file_data = yaml.safe_load(f) or {}
        else:
            file_data = {}
        
        # 使用Pydantic模型解析和验证配置
        try:
            config_obj = config_class(**file_data)
            config_data = config_obj.dict()
        except Exception as e:
            # 如果解析失败，使用默认配置
            config_obj = config_class()
            config_data = config_obj.dict()
        
        return {
            "module": module_info.dict(),
            "config": config_data,
            "schema": self._get_config_schema(config_class),
            "status": "valid" if config_file.exists() else "missing"
        }
    
    def update_module_config(self, module_name: str, config_data: Dict[str, Any]) -> Dict[str, Any]:
        """更新指定模块的配置"""
        if module_name not in CONFIG_MODULES:
            raise ValueError(f"未知的配置模块: {module_name}")
        
        module_info = CONFIG_MODULES[module_name]
        config_class = CONFIG_CLASSES[module_info.config_class]
        config_file = self.config_dir / f"{module_name}.yaml"
        
        # 验证配置数据
        try:
            config_obj = config_class(**config_data)
            validated_data = config_obj.dict()
        except Exception as e:
            raise ValueError(f"配置验证失败: {str(e)}")
        
        # 保存新配置
        with open(config_file, 'w', encoding='utf-8') as f:
            yaml.dump(validated_data, f, default_flow_style=False, allow_unicode=True)
        
        return {
            "success": True,
            "message": f"配置模块 {module_info.title} 更新成功",
            "timestamp": datetime.now().isoformat()
        }
    
    def validate_module_config(self, module_name: str, config_data: Dict[str, Any]) -> Dict[str, Any]:
        """验证指定模块的配置"""
        if module_name not in CONFIG_MODULES:
            raise ValueError(f"未知的配置模块: {module_name}")
        
        module_info = CONFIG_MODULES[module_name]
        config_class = CONFIG_CLASSES[module_info.config_class]
        
        try:
            config_obj = config_class(**config_data)
            return {
                "valid": True,
                "message": "配置验证通过",
                "config": config_obj.dict()
            }
        except Exception as e:
            return {
                "valid": False,
                "message": f"配置验证失败: {str(e)}",
                "errors": str(e)
            }
    
    def reset_module_config(self, module_name: str) -> Dict[str, Any]:
        """重置指定模块的配置为默认值"""
        if module_name not in CONFIG_MODULES:
            raise ValueError(f"未知的配置模块: {module_name}")
        
        module_info = CONFIG_MODULES[module_name]
        config_class = CONFIG_CLASSES[module_info.config_class]
        config_file = self.config_dir / f"{module_name}.yaml"
        
        # 使用默认配置
        default_config = config_class()
        default_data = default_config.dict()
        
        # 保存默认配置
        with open(config_file, 'w', encoding='utf-8') as f:
            yaml.dump(default_data, f, default_flow_style=False, allow_unicode=True)
        
        return {
            "success": True,
            "message": f"配置模块 {module_info.title} 已重置为默认值",
            "config": default_data
        }
    
    
    async def get_config(self, module_name: str) -> Dict[str, Any]:
        """获取指定模块的原始配置数据（不经过Pydantic验证）"""
        if module_name not in CONFIG_MODULES:
            raise ValueError(f"未知的配置模块: {module_name}")
        
        config_file = self.config_dir / f"{module_name}.yaml"
        
        if config_file.exists():
            with open(config_file, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f) or {}
        else:
            # 返回默认配置
            module_info = CONFIG_MODULES[module_name]
            config_class = CONFIG_CLASSES[module_info.config_class]
            default_config = config_class()
            return default_config.dict()
    
    def get_config_sync(self, module_name: str) -> Dict[str, Any]:
        """获取指定模块的原始配置数据（同步版本）"""
        if module_name not in CONFIG_MODULES:
            raise ValueError(f"未知的配置模块: {module_name}")
        
        config_file = self.config_dir / f"{module_name}.yaml"
        
        if config_file.exists():
            with open(config_file, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f) or {}
        else:
            # 返回默认配置
            module_info = CONFIG_MODULES[module_name]
            config_class = CONFIG_CLASSES[module_info.config_class]
            default_config = config_class()
            return default_config.dict()
    
    async def update_config(self, module_name: str, config_data: Dict[str, Any]) -> Dict[str, Any]:
        """更新指定模块的配置（直接保存，不经过严格验证）"""
        if module_name not in CONFIG_MODULES:
            raise ValueError(f"未知的配置模块: {module_name}")
        
        module_info = CONFIG_MODULES[module_name]
        config_file = self.config_dir / f"{module_name}.yaml"
        
        # 保存配置
        with open(config_file, 'w', encoding='utf-8') as f:
            yaml.dump(config_data, f, default_flow_style=False, allow_unicode=True)
        
        return {
            "success": True,
            "message": f"配置模块 {module_info.title} 更新成功",
            "timestamp": datetime.now().isoformat()
        }
    
    def export_all_configs(self) -> Dict[str, Any]:
        """导出所有配置"""
        all_configs = {}
        for module_name in CONFIG_MODULES.keys():
            try:
                config_data = self.get_module_config(module_name)
                all_configs[module_name] = config_data["config"]
            except Exception as e:
                all_configs[module_name] = {"error": str(e)}
        
        return {
            "export_time": datetime.now().isoformat(),
            "configs": all_configs
        }
    
    def import_all_configs(self, configs_data: Dict[str, Any]) -> Dict[str, Any]:
        """导入所有配置"""
        results = {}
        for module_name, config_data in configs_data.items():
            if module_name in CONFIG_MODULES:
                try:
                    result = self.update_module_config(module_name, config_data)
                    results[module_name] = {"success": True, "message": result["message"]}
                except Exception as e:
                    results[module_name] = {"success": False, "error": str(e)}
            else:
                results[module_name] = {"success": False, "error": "未知的配置模块"}
        
        return {
            "import_time": datetime.now().isoformat(),
            "results": results
        }
    
    def get_system_status(self) -> Dict[str, Any]:
        """获取配置系统状态"""
        total_modules = len(CONFIG_MODULES)
        available_modules = 0
        total_size = 0
        
        for module_name in CONFIG_MODULES.keys():
            config_file = self.config_dir / f"{module_name}.yaml"
            if config_file.exists():
                available_modules += 1
                total_size += config_file.stat().st_size
        
        return {
            "total_modules": total_modules,
            "available_modules": available_modules,
            "missing_modules": total_modules - available_modules,
            "total_size": self._format_file_size(total_size),
            "config_directory": str(self.config_dir),
            "last_check": datetime.now().isoformat()
        }
    
    def _get_config_schema(self, config_class: Type) -> Dict[str, Any]:
        """获取配置类的JSON Schema"""
        return config_class.schema()
    
    def _format_file_size(self, size_bytes: int) -> str:
        """格式化文件大小"""
        if size_bytes == 0:
            return "0 B"
        size_names = ["B", "KB", "MB", "GB"]
        import math
        i = int(math.floor(math.log(size_bytes, 1024)))
        p = math.pow(1024, i)
        s = round(size_bytes / p, 2)
        return f"{s} {size_names[i]}"


# 创建全局服务实例
config_center_service = ConfigCenterService()
