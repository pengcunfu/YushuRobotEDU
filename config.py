"""
应用程序配置文件
"""

import os
from typing import Optional
from pydantic import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    """应用程序设置"""
    
    # 应用基本配置
    app_name: str = Field(default="YushuRobot微服务", description="应用名称")
    app_version: str = Field(default="1.0.0", description="应用版本")
    debug: bool = Field(default=True, description="调试模式")
    
    # 服务器配置
    host: str = Field(default="0.0.0.0", description="服务器主机")
    port: int = Field(default=8000, description="服务器端口")
    
    # API配置
    api_prefix: str = Field(default="/api", description="API前缀")
    docs_url: str = Field(default="/docs", description="文档URL")
    redoc_url: str = Field(default="/redoc", description="ReDoc URL")
    
    # 数据库配置（示例，当前使用内存存储）
    database_url: Optional[str] = Field(default=None, description="数据库连接URL")
    
    # Redis配置（示例）
    redis_url: Optional[str] = Field(default=None, description="Redis连接URL")
    
    # 安全配置
    secret_key: str = Field(default="your-secret-key-here", description="密钥")
    algorithm: str = Field(default="HS256", description="加密算法")
    access_token_expire_minutes: int = Field(default=30, description="访问令牌过期时间（分钟）")
    
    # CORS配置
    allowed_origins: list = Field(default=["*"], description="允许的来源")
    allowed_methods: list = Field(default=["*"], description="允许的HTTP方法")
    allowed_headers: list = Field(default=["*"], description="允许的请求头")
    
    # 日志配置
    log_level: str = Field(default="INFO", description="日志级别")
    log_format: str = Field(
        default="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        description="日志格式"
    )
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

# 创建全局设置实例
settings = Settings()

# 环境相关配置
def get_environment() -> str:
    """获取当前环境"""
    return os.getenv("ENVIRONMENT", "development")

def is_development() -> bool:
    """是否为开发环境"""
    return get_environment() == "development"

def is_production() -> bool:
    """是否为生产环境"""
    return get_environment() == "production"

def is_testing() -> bool:
    """是否为测试环境"""
    return get_environment() == "testing"
