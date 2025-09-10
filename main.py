"""
YushuRobot纯API微服务主应用程序
采用模块化架构，支持灵活的服务扩展
前后端分离，仅提供API服务
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# 导入路由器模块
from routers import (
    core_router,
    config_router,
    config_center_router,
    llm_router,
    asr_router,
    tts_router,
    document_router,
    knowledge_router,
    prompt_router
)

# 导入数据库服务
from services.document_service.document_database import get_document_database


def create_app() -> FastAPI:
    """创建并配置FastAPI应用实例"""
    app = FastAPI(
        title="YushuRobot API服务",
        description="前后端分离的微服务API平台",
        version="2.0.0",
        docs_url="/docs",
        redoc_url="/redoc"
    )

    # 配置CORS中间件，支持前端跨域请求
    import os
    cors_allow_all = os.environ.get("CORS_ALLOW_ALL", "false").lower() == "true"
    
    if cors_allow_all:
        # 生产环境允许所有跨域请求
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
            expose_headers=["*"],
            max_age=3600,
        )
        print("⚠️ 已启用全局CORS配置，允许所有跨域请求")
    else:
        # 开发环境限制跨域请求源
        app.add_middleware(
            CORSMiddleware,
            allow_origins=[
                "http://localhost:3000",  # React开发服务器
                "http://127.0.0.1:3000",
                "http://localhost:5173",  # Vite开发服务器
                "http://127.0.0.1:5173",
                "http://8.153.175.16",    # 生产环境服务器IP
                "http://8.153.175.16:80", # 生产环境前端端口
                "*"  # 允许所有源
            ],
            allow_credentials=True,
            allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
            allow_headers=["*"],
            expose_headers=["*"],
            max_age=600,  # 预检请求缓存时间（秒）
        )

    # 注册路由器
    register_routers(app)

    # 添加启动事件
    @app.on_event("startup")
    async def startup_event():
        """应用启动时初始化数据库连接"""
        try:
            await get_document_database()
            print("✅ MongoDB数据库连接成功")
        except Exception as e:
            print(f"⚠️  MongoDB连接失败 (可选): {e}")

    return app


def register_routers(app: FastAPI):
    """注册所有路由器到应用中"""

    # 核心功能路由
    app.include_router(core_router.router)

    # 配置管理路由 (纯API)
    app.include_router(config_router.router)

    # 配置管理中心路由 (图形化配置)
    app.include_router(config_center_router.router)

    # LLM服务路由
    app.include_router(llm_router.router)

    # ASR语音识别路由
    app.include_router(asr_router.router)

    # TTS文本转语音路由
    app.include_router(tts_router.router)

    # 文档处理路由
    app.include_router(document_router.router)

    # 知识库管理路由
    app.include_router(knowledge_router.router)

    # 提示词管理路由
    app.include_router(prompt_router.router)

    # 幻灯片处理路由
    from routers import slide_router
    app.include_router(slide_router.router)


# 创建应用实例
app = create_app()


# 应用启动和关闭事件
@app.on_event("startup")
async def startup_event():
    """应用启动时执行"""
    print("🚀 YushuRobot API服务启动中...")
    print("📋 已注册的API服务:")
    print("  ✅ 核心功能 - 基础API和健康检查")
    print("  ✅ 配置管理 - /api/configs")
    print("  ✅ 配置中心 - /api/config-center")
    print("  ✅ LLM服务 - /api/llm")
    print("  ✅ ASR语音识别 - /api/asr")
    print("  ✅ TTS文本转语音 - /api/tts")
    print("  ✅ 文档处理 - /api/documents")
    print("  ✅ 知识库管理 - /api/knowledge")
    print("  ✅ 提示词管理 - /api/prompt")
    print("🎉 API服务启动完成!")
    print("📖 访问 http://localhost:8000/docs 查看完整API文档")
    print("🌐 前端应用请访问: http://localhost:3000")


@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭时执行"""
    print("👋 YushuRobot API服务正在关闭...")


# 主程序入口
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
