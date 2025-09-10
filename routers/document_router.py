"""
文档处理路由
提供文件上传、解析、AI生成和TTS合成的API接口
"""

import os
import uuid
import shutil
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks
from fastapi.responses import StreamingResponse, FileResponse
import aiofiles
from pathlib import Path

from services.document_service.document_models import (
    DocumentInfo, DocumentType, ParseResult, ContentEditRequest,
    GenerationRequest, TTSRequest, TTSSegmentRequest
)
from services.document_service.document_parser import DocumentParser
from services.document_service.document_database import get_document_database
from services.llm_service.llm_manager import llm_manager
from services.tts_service.tts_manager import tts_manager
from services.config_service.config_center_service import config_center_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/documents", tags=["Documents"])

# 配置
UPLOAD_DIR = Path("uploads/documents")
PROCESSED_DIR = Path("processed/documents")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

# 全局文档解析器
document_parser = DocumentParser()

# 支持的文件格式
ALLOWED_EXTENSIONS = {
    'pdf', 'pptx', 'ppt', 'docx', 'doc', 'txt',
    'png', 'jpg', 'jpeg', 'gif', 'bmp'
}

# 最大文件大小 (50MB)
MAX_FILE_SIZE = 50 * 1024 * 1024


def get_file_type(filename: str) -> DocumentType:
    """根据文件名获取文档类型"""
    ext = filename.lower().split('.')[-1]

    if ext in ['png', 'jpg', 'jpeg', 'gif', 'bmp']:
        return DocumentType.IMAGE
    elif ext == 'pdf':
        return DocumentType.PDF
    elif ext == 'pptx':
        return DocumentType.PPTX
    elif ext == 'ppt':
        return DocumentType.PPT
    elif ext == 'docx':
        return DocumentType.DOCX
    elif ext == 'doc':
        return DocumentType.DOC
    elif ext == 'txt':
        return DocumentType.TXT
    else:
        raise ValueError(f"不支持的文件格式: {ext}")


def validate_file(file: UploadFile) -> None:
    """验证上传的文件"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="文件名不能为空")

    # 检查文件扩展名
    ext = file.filename.lower().split('.')[-1]
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件格式: {ext}。支持的格式: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # 检查文件大小
    if hasattr(file, 'size') and file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"文件大小超过限制 ({MAX_FILE_SIZE // (1024 * 1024)}MB)"
        )


@router.post("/upload", response_model=DocumentInfo)
async def upload_document(file: UploadFile = File(...)):
    """
    上传文档文件
    支持PDF、PPTX、PPT、DOCX、DOC、TXT和图片格式
    """
    try:
        # 验证文件
        validate_file(file)

        # 生成文档ID和文件路径
        document_id = str(uuid.uuid4())
        file_ext = file.filename.split('.')[-1].lower()
        safe_filename = f"{document_id}.{file_ext}"
        file_path = UPLOAD_DIR / safe_filename

        # 保存文件
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)

        # 获取文件大小
        file_size = len(content)

        # 创建文档信息
        document_info = DocumentInfo(
            id=document_id,
            filename=safe_filename,
            original_filename=file.filename,
            file_path=str(file_path),
            file_size=file_size,
            document_type=get_file_type(file.filename),
            mime_type=file.content_type or "application/octet-stream"
        )

        # 保存文档信息到数据库
        db = await get_document_database()
        await db.save_document(document_info)

        # 保存处理记录
        await db.save_processing_record({
            "id": f"upload_{document_id}",
            "document_id": document_id,
            "type": "upload",
            "status": "completed",
            "original_filename": file.filename,
            "file_size": file_size,
            "document_type": document_info.document_type.value,
            "details": {
                "filename": safe_filename,
                "mime_type": document_info.mime_type
            }
        })

        logger.info(f"文件上传成功: {file.filename} -> {document_id}")

        return document_info

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"文件上传失败: {e}")
        raise HTTPException(status_code=500, detail=f"文件上传失败: {str(e)}")


@router.post("/parse/{document_id}", response_model=ParseResult)
async def parse_document(document_id: str):
    """
    解析文档内容
    提取文本、图片、表格等信息
    """
    try:
        # 查找文档文件
        document_files = list(UPLOAD_DIR.glob(f"{document_id}.*"))
        if not document_files:
            raise HTTPException(status_code=404, detail="文档未找到")

        file_path = document_files[0]

        # 创建文档信息
        document_info = DocumentInfo(
            id=document_id,
            filename=file_path.name,
            original_filename=file_path.name,
            file_path=str(file_path),
            file_size=file_path.stat().st_size,
            document_type=get_file_type(file_path.name),
            mime_type="application/octet-stream"
        )

        # 解析文档
        result = document_parser.parse_document(str(file_path), document_info)

        # 保存解析结果到数据库
        db = await get_document_database()
        await db.save_parse_result(result)

        # 保存处理记录
        record_status = "completed" if result.success else "failed"
        await db.save_processing_record({
            "id": f"parse_{document_id}",
            "document_id": document_id,
            "type": "parse",
            "status": record_status,
            "original_filename": document_info.original_filename,
            "details": {
                "success": result.success,
                "page_count": result.page_count,
                "word_count": result.word_count,
                "duration": result.duration,
                "error_message": result.error_message
            }
        })

        logger.info(f"文档解析完成: {document_id}, 成功: {result.success}")

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"文档解析失败: {e}")
        raise HTTPException(status_code=500, detail=f"文档解析失败: {str(e)}")


@router.put("/content/{document_id}")
async def edit_content(document_id: str, request: ContentEditRequest):
    """
    编辑文档内容
    允许用户手动编辑解析后的文本内容
    """
    try:
        # 这里可以实现内容编辑历史记录
        # 当前简单返回成功状态

        logger.info(f"内容编辑: {document_id}, 编辑者: {request.editor_name}")

        return {
            "success": True,
            "message": "内容编辑成功",
            "document_id": document_id,
            "content_length": len(request.new_content)
        }

    except Exception as e:
        logger.error(f"内容编辑失败: {e}")
        raise HTTPException(status_code=500, detail=f"内容编辑失败: {str(e)}")


@router.post("/generate")
async def generate_content(request: GenerationRequest):
    """
    AI生成文稿内容
    支持流式返回
    """

    async def generate_stream():
        full_response = ""
        document_id = request.document_id
        provider = "douyin"

        try:
            # 获取LLM配置
            config = config_center_service.get_config_sync("llm")
            provider = config.get('default_provider', 'douyin')

            # 初始化LLM服务
            if config and config.get('enabled', True):
                # 提取各提供商的配置
                provider_configs = {}
                for llm_provider in ['aliyun', 'baidu', 'douyin', 'tencent', 'xunfei']:
                    provider_config = config.get(llm_provider, {})
                    if provider_config and any(v for v in provider_config.values() if v):
                        provider_configs[llm_provider] = provider_config

                # 初始化LLM实例
                llm_manager.initialize_llms(provider_configs)

            # 构建提示词
            prompt = request.prompt_template or """
            请根据以下内容生成一份详细的讲解文稿：
            
            内容：
            {content}
            
            要求：
            1. 语言通俗易懂
            2. 结构清晰，逻辑性强
            3. 适合语音播报
            4. 包含要点总结
            """

            full_prompt = prompt.format(content=request.content)

            # 流式生成
            for chunk in llm_manager.chat_stream(
                    provider=provider,
                    message=full_prompt,
                    model=request.model,
                    temperature=request.temperature,
                    max_tokens=request.max_tokens
            ):
                full_response += chunk
                yield f"data: {chunk}\n\n"

        except Exception as e:
            error_msg = f"AI生成失败: {str(e)}"
            logger.error(error_msg)
            yield f"data: 错误：{str(e)}\n\n"

            # 保存失败记录
            try:
                db = await get_document_database()
                await db.save_processing_record({
                    "id": f"generate_{document_id}_{int(datetime.now().timestamp())}",
                    "document_id": document_id,
                    "type": "ai_generation",
                    "status": "failed",
                    "details": {
                        "provider": provider,
                        "model": request.model,
                        "input_length": len(request.content),
                        "error_message": str(e)
                    }
                })
            except Exception as db_error:
                logger.warning(f"保存AI生成失败记录失败: {db_error}")
            return

        # 保存成功记录
        try:
            db = await get_document_database()
            await db.save_processing_record({
                "id": f"generate_{document_id}_{int(datetime.now().timestamp())}",
                "document_id": document_id,
                "type": "ai_generation",
                "status": "completed",
                "details": {
                    "provider": provider,
                    "model": request.model,
                    "input_length": len(request.content),
                    "output_length": len(full_response),
                    "temperature": request.temperature
                }
            })
        except Exception as e:
            logger.warning(f"保存AI生成记录失败: {e}")

    if request.stream:
        return StreamingResponse(generate_stream(), media_type="text/plain")
    else:
        # 非流式生成
        try:
            config = config_center_service.get_config_sync("llm")
            provider = config.get('default_provider', 'douyin')

            # 初始化LLM服务
            if config and config.get('enabled', True):
                # 提取各提供商的配置
                provider_configs = {}
                for llm_provider in ['aliyun', 'baidu', 'douyin', 'tencent', 'xunfei']:
                    provider_config = config.get(llm_provider, {})
                    if provider_config and any(v for v in provider_config.values() if v):
                        provider_configs[llm_provider] = provider_config

                # 初始化LLM实例
                llm_manager.initialize_llms(provider_configs)

            prompt = request.prompt_template or """
            请根据以下内容生成一份详细的讲解文稿：
            
            内容：
            {content}
            
            要求：
            1. 语言通俗易懂
            2. 结构清晰，逻辑性强
            3. 适合语音播报
            4. 包含要点总结
            """

            full_prompt = prompt.format(content=request.content)

            result = llm_manager.chat(
                provider=provider,
                message=full_prompt,
                model=request.model,
                temperature=request.temperature,
                max_tokens=request.max_tokens
            )

            return {
                "success": result.get('success', True),
                "content": result.get('response', result) if result.get('success', True) else '',
                "error": result.get('error') if not result.get('success', True) else None,
                "provider": provider,
                "model": request.model
            }

        except Exception as e:
            logger.error(f"AI生成失败: {e}")
            raise HTTPException(status_code=500, detail=f"AI生成失败: {str(e)}")


def split_text_into_sentences(text: str) -> List[str]:
    """将文本分割成句子"""
    import re

    # 简单的中文句子分割
    sentences = re.split(r'[。！？；\n]', text)

    # 过滤空句子和短句子
    sentences = [s.strip() for s in sentences if s.strip() and len(s.strip()) > 5]

    return sentences


def split_text_into_paragraphs(text: str, max_length: int = 200) -> List[str]:
    """将文本分割成段落"""
    paragraphs = []
    current_paragraph = ""

    sentences = split_text_into_sentences(text)

    for sentence in sentences:
        if len(current_paragraph) + len(sentence) <= max_length:
            current_paragraph += sentence + "。"
        else:
            if current_paragraph:
                paragraphs.append(current_paragraph.strip())
            current_paragraph = sentence + "。"

    if current_paragraph:
        paragraphs.append(current_paragraph.strip())

    return paragraphs


@router.post("/tts/stream")
async def synthesize_speech_stream(request: TTSRequest):
    """
    流式语音合成
    支持文本分句处理以提高响应速度
    """
    import base64
    import json

    async def tts_stream():
        session_id = f"stream_{uuid.uuid4()}"
        provider = "douyin"
        total_segments = 0
        successful_segments = 0

        try:
            # 获取TTS配置
            config = config_center_service.get_config_sync("tts")
            provider = config.get('default_provider', 'douyin')

            # 初始化TTS服务
            if config and config.get('enabled', True):
                # 提取各提供商的配置
                provider_configs = {}
                for tts_provider in ['baidu', 'xunfei', 'aliyun', 'tencent', 'douyin']:
                    provider_config = config.get(tts_provider, {})
                    if provider_config and any(v for v in provider_config.values() if v):
                        provider_configs[tts_provider] = provider_config

                # 初始化TTS实例
                tts_manager.initialize_tts_services(provider_configs)

            if request.split_text and len(request.text) > 100:
                # 分句处理
                if len(request.text) > 500:
                    segments = split_text_into_paragraphs(request.text)
                else:
                    segments = split_text_into_sentences(request.text)

                total_segments = len(segments)

                for i, segment in enumerate(segments):
                    logger.info(f"TTS处理第{i + 1}/{len(segments)}段: {segment[:50]}...")

                    result = tts_manager.synthesize_text_stream(
                        provider=provider,
                        text=segment,
                        voice=request.voice,
                        speed=request.speed,
                        pitch=request.pitch,
                        volume=request.volume,
                        audio_format=request.format,
                        session_id=session_id
                    )

                    if result.success and result.audio_data:
                        audio_b64 = base64.b64encode(result.audio_data).decode()
                        data = {"type": "audio", "data": audio_b64, "segment": i + 1, "total": len(segments)}
                        yield f"data: {json.dumps(data)}\n\n"
                        successful_segments += 1
                    else:
                        error_data = {"type": "error", "message": result.error_msg}
                        yield f"data: {json.dumps(error_data)}\n\n"
            else:
                # 整段处理
                total_segments = 1

                result = tts_manager.synthesize_text_stream(
                    provider=provider,
                    text=request.text,
                    voice=request.voice,
                    speed=request.speed,
                    pitch=request.pitch,
                    volume=request.volume,
                    audio_format=request.format,
                    session_id=session_id
                )

                if result.success and result.audio_data:
                    audio_b64 = base64.b64encode(result.audio_data).decode()
                    data = {"type": "audio", "data": audio_b64, "segment": 1, "total": 1}
                    yield f"data: {json.dumps(data)}\n\n"
                    successful_segments = 1
                else:
                    error_data = {"type": "error", "message": result.error_msg}
                    yield f"data: {json.dumps(error_data)}\n\n"

            # 保存TTS成功记录
            try:
                db = await get_document_database()
                await db.save_processing_record({
                    "id": f"tts_{session_id}",
                    "document_id": getattr(request, 'document_id', 'unknown'),
                    "type": "tts_synthesis",
                    "status": "completed" if successful_segments == total_segments else "partial",
                    "details": {
                        "provider": provider,
                        "voice": request.voice,
                        "text_length": len(request.text),
                        "total_segments": total_segments,
                        "successful_segments": successful_segments,
                        "speed": request.speed,
                        "format": request.format
                    }
                })
            except Exception as e:
                logger.warning(f"保存TTS记录失败: {e}")

        except Exception as e:
            logger.error(f"TTS流式合成失败: {e}")
            error_data = {"type": "error", "message": str(e)}
            yield f"data: {json.dumps(error_data)}\n\n"

            # 保存TTS失败记录
            try:
                db = await get_document_database()
                await db.save_processing_record({
                    "id": f"tts_{session_id}",
                    "document_id": getattr(request, 'document_id', 'unknown'),
                    "type": "tts_synthesis",
                    "status": "failed",
                    "details": {
                        "provider": provider,
                        "text_length": len(request.text),
                        "error_message": str(e)
                    }
                })
            except Exception as db_error:
                logger.warning(f"保存TTS失败记录失败: {db_error}")

    return StreamingResponse(tts_stream(), media_type="text/plain")


@router.post("/tts/segments")
async def synthesize_speech_segments(request: TTSSegmentRequest):
    """
    分段语音合成
    处理多个文本段落
    """
    try:
        # 获取TTS配置
        config = config_center_service.get_config_sync("tts")
        provider = config.get('default_provider', 'douyin')

        # 初始化TTS服务
        if config and config.get('enabled', True):
            # 提取各提供商的配置
            provider_configs = {}
            for tts_provider in ['baidu', 'xunfei', 'aliyun', 'tencent', 'douyin']:
                provider_config = config.get(tts_provider, {})
                if provider_config and any(v for v in provider_config.values() if v):
                    provider_configs[tts_provider] = provider_config

            # 初始化TTS实例
            tts_manager.initialize_tts_services(provider_configs)

        results = []

        for i, segment in enumerate(request.segments):
            logger.info(f"TTS处理第{i + 1}/{len(request.segments)}段")

            result = tts_manager.synthesize_text(
                provider=provider,
                text=segment,
                voice=request.voice,
                speed=request.speed,
                pitch=request.pitch,
                volume=request.volume,
                audio_format=request.format
            )

            segment_result = {
                "segment_index": i,
                "text": segment,
                "success": result.success,
                "error_message": result.error_msg if not result.success else None,
                "audio_size": len(result.audio_data) if result.audio_data else 0
            }

            if result.success and result.audio_data:
                import base64
                segment_result["audio_data"] = base64.b64encode(result.audio_data).decode()

            results.append(segment_result)

        return {
            "success": True,
            "total_segments": len(request.segments),
            "successful_segments": sum(1 for r in results if r["success"]),
            "results": results
        }

    except Exception as e:
        logger.error(f"分段TTS合成失败: {e}")
        raise HTTPException(status_code=500, detail=f"分段TTS合成失败: {str(e)}")


@router.get("/supported-formats")
async def get_supported_formats():
    """获取支持的文档格式"""
    return {
        "document_formats": list(ALLOWED_EXTENSIONS),
        "max_file_size_mb": MAX_FILE_SIZE // (1024 * 1024),
        "tts_formats": ["wav", "mp3"],
        "image_formats": ["png", "jpg", "jpeg", "gif", "bmp"]
    }


@router.get("/{document_id}/info")
async def get_document_info(document_id: str):
    """获取文档信息"""
    try:
        # 查找文档文件
        document_files = list(UPLOAD_DIR.glob(f"{document_id}.*"))
        if not document_files:
            raise HTTPException(status_code=404, detail="文档未找到")

        file_path = document_files[0]

        return {
            "id": document_id,
            "filename": file_path.name,
            "file_size": file_path.stat().st_size,
            "document_type": get_file_type(file_path.name),
            "upload_time": file_path.stat().st_ctime,
            "file_exists": file_path.exists()
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取文档信息失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取文档信息失败: {str(e)}")


@router.delete("/{document_id}")
async def delete_document(document_id: str):
    """删除文档"""
    try:
        # 查找并删除文档文件
        document_files = list(UPLOAD_DIR.glob(f"{document_id}.*"))
        deleted_files = []

        for file_path in document_files:
            file_path.unlink()
            deleted_files.append(str(file_path))

        if not deleted_files:
            raise HTTPException(status_code=404, detail="文档未找到")

        logger.info(f"文档删除成功: {document_id}")

        return {
            "success": True,
            "message": "文档删除成功",
            "deleted_files": deleted_files
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"文档删除失败: {e}")
        raise HTTPException(status_code=500, detail=f"文档删除失败: {str(e)}")


@router.get("/records")
async def get_processing_records(limit: int = 50, skip: int = 0):
    """获取处理记录列表"""
    try:
        db = await get_document_database()
        records = await db.get_processing_records(limit=limit, skip=skip)

        return {
            "success": True,
            "records": records,
            "total": len(records),
            "limit": limit,
            "skip": skip
        }

    except Exception as e:
        logger.error(f"获取处理记录失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取处理记录失败: {str(e)}")


@router.get("/records/{document_id}")
async def get_document_records(document_id: str):
    """获取指定文档的处理记录"""
    try:
        db = await get_document_database()
        records = await db.get_processing_records_by_document(document_id)

        return {
            "success": True,
            "document_id": document_id,
            "records": records,
            "total": len(records)
        }

    except Exception as e:
        logger.error(f"获取文档处理记录失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取文档处理记录失败: {str(e)}")


@router.get("/statistics")
async def get_statistics():
    """获取文档处理统计信息"""
    try:
        db = await get_document_database()
        stats = await db.get_statistics()

        return {
            "success": True,
            "statistics": stats
        }

    except Exception as e:
        logger.error(f"获取统计信息失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取统计信息失败: {str(e)}")


@router.get("/health")
async def health_check():
    """文档服务健康检查"""
    try:
        # 检查数据库连接
        db_status = False
        try:
            db = await get_document_database()
            await db.get_statistics()
            db_status = True
        except Exception as e:
            logger.warning(f"数据库连接检查失败: {e}")

        return {
            "success": True,
            "service": "document_service",
            "upload_dir": str(UPLOAD_DIR),
            "upload_dir_exists": UPLOAD_DIR.exists(),
            "supported_formats": len(ALLOWED_EXTENSIONS),
            "parser_available": document_parser is not None,
            "database_connected": db_status
        }
    except Exception as e:
        logger.error(f"健康检查失败: {e}")
        return {
            "success": False,
            "error": str(e)
        }
