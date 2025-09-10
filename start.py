#!/usr/bin/env python3
"""
快速启动脚本
"""

import subprocess
import sys
import os
from pathlib import Path


def check_python_version():
    """检查Python版本"""
    if sys.version_info < (3, 8):
        print("❌ 错误: 需要Python 3.8或更高版本")
        print(f"当前版本: {sys.version}")
        sys.exit(1)
    print(f"✅ Python版本检查通过: {sys.version.split()[0]}")


def check_dependencies():
    """检查依赖是否安装"""
    try:
        import fastapi
        import uvicorn
        print("✅ 依赖检查通过")
        return True
    except ImportError as e:
        print(f"❌ 缺少依赖: {e}")
        print("请运行: pip install -r requirements.txt")
        return False


def start_server():
    """启动服务器"""
    print("🚀 启动YushuRobot微服务...")
    print("🌐 前端页面: http://localhost:8000")
    print("📄 API文档: http://localhost:8000/docs")
    print("🔧 API信息: http://localhost:8000/api")
    print("💚 健康检查: http://localhost:8000/health")
    print("⏹️  按 Ctrl+C 停止服务")
    print("-" * 50)

    try:
        # 使用uvicorn启动
        subprocess.run([
            sys.executable, "-m", "uvicorn",
            "main:app",
            "--host", "0.0.0.0",
            "--port", "8000",
            "--reload"
        ])
    except KeyboardInterrupt:
        print("\n🛑 服务已停止")
    except Exception as e:
        print(f"❌ 启动失败: {e}")


def main():
    """主函数"""
    print("=" * 50)
    print("🤖 YushuRobot 微服务启动器")
    print("=" * 50)

    # 检查Python版本
    check_python_version()

    # 检查依赖
    if not check_dependencies():
        return

    # 启动服务器
    start_server()


if __name__ == "__main__":
    main()
