"""
配置管理微服务
提供YAML配置文件的CRUD操作和管理界面
"""

import os
import yaml
import json
import shutil
from datetime import datetime
from typing import List, Optional, Dict, Any, Union
from pathlib import Path
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ConfigService:
    """配置管理服务类"""
    
    def __init__(self, config_dir: str = "services/config-service/config"):
        """初始化配置服务"""
        self.config_dir = Path(config_dir)
        self.backup_dir = self.config_dir / "backups"
        
        # 确保目录存在
        self.config_dir.mkdir(parents=True, exist_ok=True)
        self.backup_dir.mkdir(parents=True, exist_ok=True)
    
    def get_yaml_files(self) -> List[Dict[str, Any]]:
        """获取所有YAML配置文件列表"""
        yaml_files = []
        
        if self.config_dir.exists():
            for file_path in self.config_dir.glob("*.yaml"):
                try:
                    stat = file_path.stat()
                    yaml_files.append({
                        'filename': file_path.name,
                        'name': file_path.stem,
                        'size': stat.st_size,
                        'modified': datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S'),
                        'created': datetime.fromtimestamp(stat.st_ctime).strftime('%Y-%m-%d %H:%M:%S'),
                        'path': str(file_path.relative_to(self.config_dir))
                    })
                except Exception as e:
                    logger.error(f"获取文件信息失败 {file_path.name}: {e}")
            
            # 同样处理.yml文件
            for file_path in self.config_dir.glob("*.yml"):
                try:
                    stat = file_path.stat()
                    yaml_files.append({
                        'filename': file_path.name,
                        'name': file_path.stem,
                        'size': stat.st_size,
                        'modified': datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S'),
                        'created': datetime.fromtimestamp(stat.st_ctime).strftime('%Y-%m-%d %H:%M:%S'),
                        'path': str(file_path.relative_to(self.config_dir))
                    })
                except Exception as e:
                    logger.error(f"获取文件信息失败 {file_path.name}: {e}")
        
        return sorted(yaml_files, key=lambda x: x['filename'])
    
    def load_yaml_config(self, filename: str) -> Dict[str, Any]:
        """加载YAML配置文件"""
        file_path = self.config_dir / filename
        try:
            if file_path.exists():
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = yaml.safe_load(f)
                    return content if content is not None else {}
            return {}
        except Exception as e:
            logger.error(f"加载配置文件 {filename} 失败: {e}")
            return {}
    
    def save_yaml_config(self, filename: str, data: Union[Dict[str, Any], str]) -> bool:
        """保存YAML配置文件"""
        file_path = self.config_dir / filename
        try:
            # 如果传入的是字符串，直接写入
            if isinstance(data, str):
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(data)
            else:
                # 如果传入的是字典，转换为YAML格式
                with open(file_path, 'w', encoding='utf-8') as f:
                    yaml.dump(data, f, default_flow_style=False, allow_unicode=True, sort_keys=False)
            return True
        except Exception as e:
            logger.error(f"保存配置文件 {filename} 失败: {e}")
            return False
    
    def delete_yaml_config(self, filename: str) -> bool:
        """删除YAML配置文件"""
        file_path = self.config_dir / filename
        try:
            if file_path.exists():
                file_path.unlink()
                return True
            return False
        except Exception as e:
            logger.error(f"删除配置文件 {filename} 失败: {e}")
            return False
    
    def validate_yaml_content(self, content: str) -> tuple[bool, Optional[str]]:
        """验证YAML内容是否有效"""
        try:
            yaml.safe_load(content)
            return True, None
        except yaml.YAMLError as e:
            return False, str(e)
    
    def backup_config(self, filename: str) -> bool:
        """备份配置文件"""
        source_path = self.config_dir / filename
        if not source_path.exists():
            return False
        
        try:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_filename = f"{source_path.stem}_{timestamp}.yaml"
            backup_path = self.backup_dir / backup_filename
            
            shutil.copy2(source_path, backup_path)
            return True
        except Exception as e:
            logger.error(f"备份配置文件 {filename} 失败: {e}")
            return False
    
    def restore_config(self, filename: str, backup_filename: str) -> bool:
        """从备份恢复配置文件"""
        backup_path = self.backup_dir / backup_filename
        target_path = self.config_dir / filename
        
        try:
            if backup_path.exists():
                shutil.copy2(backup_path, target_path)
                return True
            return False
        except Exception as e:
            logger.error(f"恢复配置文件 {filename} 失败: {e}")
            return False
    
    def get_backups(self, filename: str) -> List[Dict[str, Any]]:
        """获取配置文件的备份列表"""
        backups = []
        base_name = Path(filename).stem
        
        try:
            for backup_file in self.backup_dir.glob(f"{base_name}_*.yaml"):
                stat = backup_file.stat()
                backups.append({
                    'filename': backup_file.name,
                    'size': stat.st_size,
                    'created': datetime.fromtimestamp(stat.st_ctime).strftime('%Y-%m-%d %H:%M:%S'),
                    'modified': datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S')
                })
        except Exception as e:
            logger.error(f"获取备份文件列表失败: {e}")
        
        return sorted(backups, key=lambda x: x['created'], reverse=True)
    
    def get_nested_value(self, data: Dict[str, Any], path: str) -> Any:
        """根据路径获取嵌套配置值"""
        try:
            keys = path.split('.')
            current = data
            for key in keys:
                if isinstance(current, dict) and key in current:
                    current = current[key]
                else:
                    return None
            return current
        except Exception:
            return None
    
    def set_nested_value(self, data: Dict[str, Any], path: str, value: Any) -> bool:
        """根据路径设置嵌套配置值"""
        try:
            keys = path.split('.')
            current = data
            
            # 导航到父级对象
            for key in keys[:-1]:
                if key not in current:
                    current[key] = {}
                current = current[key]
            
            # 设置最终值
            current[keys[-1]] = value
            return True
        except Exception as e:
            logger.error(f"设置配置值失败: {e}")
            return False
    
    def create_config_from_template(self, filename: str, template_type: str) -> bool:
        """从模板创建配置文件"""
        templates = {
            'empty': {},
            'basic': {
                'app': {
                    'name': 'MyApp',
                    'version': '1.0.0',
                    'debug': False
                },
                'database': {
                    'host': 'localhost',
                    'port': 3306,
                    'name': 'myapp'
                }
            },
            'database': {
                'host': 'localhost',
                'port': 3306,
                'username': 'user',
                'password': 'password',
                'database': 'mydb',
                'charset': 'utf8mb4'
            },
            'api': {
                'host': '0.0.0.0',
                'port': 8000,
                'debug': False,
                'cors': {
                    'enabled': True,
                    'origins': ['*']
                },
                'auth': {
                    'secret_key': 'your-secret-key',
                    'algorithm': 'HS256',
                    'access_token_expire_minutes': 30
                }
            }
        }
        
        template_data = templates.get(template_type, {})
        return self.save_yaml_config(filename, template_data)
    
    def get_config_statistics(self) -> Dict[str, Any]:
        """获取配置管理统计信息"""
        files = self.get_yaml_files()
        total_size = sum(f['size'] for f in files)
        
        # 统计备份文件
        backup_count = 0
        backup_size = 0
        if self.backup_dir.exists():
            for backup_file in self.backup_dir.glob("*.yaml"):
                backup_count += 1
                backup_size += backup_file.stat().st_size
        
        return {
            'total_configs': len(files),
            'total_size': total_size,
            'backup_count': backup_count,
            'backup_size': backup_size,
            'config_dir': str(self.config_dir),
            'backup_dir': str(self.backup_dir)
        }
    
    def search_configs(self, query: str) -> List[Dict[str, Any]]:
        """搜索配置文件"""
        results = []
        query_lower = query.lower()
        
        for file_info in self.get_yaml_files():
            # 搜索文件名
            if query_lower in file_info['filename'].lower():
                results.append({**file_info, 'match_type': 'filename'})
                continue
            
            # 搜索文件内容
            try:
                config_data = self.load_yaml_config(file_info['filename'])
                content_str = json.dumps(config_data, ensure_ascii=False).lower()
                if query_lower in content_str:
                    results.append({**file_info, 'match_type': 'content'})
            except Exception as e:
                logger.error(f"搜索文件内容失败 {file_info['filename']}: {e}")
        
        return results
