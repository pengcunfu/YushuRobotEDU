"""
幻灯片处理相关的API路由
"""

import os
import logging
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Response
from fastapi.responses import FileResponse

from services.document_service.document_database import get_document_database
from services.slide_service import slide_service
from services.slide_service.slide_models import SlideProcessRequest
from services.slide_service.ppt_converter import ppt_converter
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/slides", tags=["幻灯片处理"])

@router.get("/{document_id}")
async def get_document_slides(document_id: str):
    """
    获取文档的幻灯片数据 - 处理并返回幻灯片内容
    """
    try:
        # 从数据库获取文档信息
        document_db = await get_document_database()
        document = await document_db.get_document(document_id)
        
        if not document:
            raise HTTPException(status_code=404, detail="文档不存在")
        
        # 检查文件是否存在
        file_path = Path(document.file_path)
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="源文件不存在")
        
        # 处理文档并返回幻灯片数据
        process_request = SlideProcessRequest(
            document_id=document_id,
            file_path=str(file_path),
            extract_images=True,
            generate_thumbnails=True
        )
        slide_content = await slide_service.process_document(process_request)
        slides_data = slide_content.slides
        
        return {
            "document_id": document.id,
            "filename": document.filename,
            "file_path": str(file_path),
            "download_url": f"/api/slides/{document_id}/download",
            "slides": slides_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取幻灯片失败: {str(e)}")
        raise HTTPException(status_code=500, detail="获取幻灯片失败")

@router.get("/{document_id}/download")
async def download_original_file(document_id: str):
    """
    下载原始文件
    """
    try:
        # 从数据库获取文档信息
        document_db = await get_document_database()
        document = await document_db.get_document(document_id)
        
        if not document:
            raise HTTPException(status_code=404, detail="文档不存在")
        
        file_path = Path(document.file_path)
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="文件不存在")
        
        # 确定MIME类型
        file_extension = file_path.suffix.lower()
        media_type_map = {
            '.pdf': 'application/pdf',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            '.ppt': 'application/vnd.ms-powerpoint'
        }
        
        media_type = media_type_map.get(file_extension, 'application/octet-stream')
        
        return FileResponse(
            path=str(file_path),
            media_type=media_type,
            filename=document.filename
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"文件下载失败: {str(e)}")
        raise HTTPException(status_code=500, detail="文件下载失败")

@router.get("/images/{filename}")
@router.head("/images/{filename}")
async def get_slide_image(filename: str):
    """
    获取幻灯片图片
    """
    try:
        image_path = slide_service.images_path / filename
        
        if not image_path.exists():
            raise HTTPException(status_code=404, detail="图片不存在")
        
        return FileResponse(
            path=str(image_path),
            media_type="image/png",
            filename=filename
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取图片失败: {str(e)}")
        raise HTTPException(status_code=500, detail="获取图片失败")

@router.get("/thumbnails/{filename}")
async def get_slide_thumbnail(filename: str):
    """
    获取幻灯片缩略图
    """
    try:
        thumbnail_path = slide_service.thumbnails_path / filename
        
        if not thumbnail_path.exists():
            raise HTTPException(status_code=404, detail="缩略图不存在")
        
        return FileResponse(
            path=str(thumbnail_path),
            media_type="image/png",
            filename=filename
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取缩略图失败: {str(e)}")
        raise HTTPException(status_code=500, detail="获取缩略图失败")

@router.post("/{document_id}/status")
async def update_slide_status(document_id: str, current_slide: int):
    """
    更新当前幻灯片状态
    """
    try:
        # 这里可以记录用户的阅读进度
        logger.info(f"用户正在查看文档 {document_id} 的第 {current_slide} 页")
        
        # 可以存储到数据库或缓存中
        return {
            "success": True,
            "message": "状态更新成功",
            "document_id": document_id,
            "current_slide": current_slide
        }
        
    except Exception as e:
        logger.error(f"更新状态失败: {str(e)}")
        raise HTTPException(status_code=500, detail="更新状态失败")

@router.post("/ppt-callback")
async def ppt_conversion_callback(callback_data: dict):
    """
    PPT转图片服务的回调接口
    """
    try:
        task_id = callback_data.get("task_id")
        if not task_id:
            raise HTTPException(status_code=400, detail="缺少task_id")
        
        # 处理回调数据
        success = ppt_converter.handle_callback(task_id, callback_data)
        
        if success:
            logger.info(f"PPT转换回调处理成功: {task_id}")
            return {
                "success": True,
                "message": "回调处理成功",
                "task_id": task_id
            }
        else:
            logger.warning(f"PPT转换回调处理失败: {task_id}")
            return {
                "success": False,
                "message": "回调处理失败",
                "task_id": task_id
            }
        
    except Exception as e:
        logger.error(f"PPT回调处理异常: {str(e)}")
        raise HTTPException(status_code=500, detail="回调处理失败")


# Pydantic模型定义
class NarrationRequest(BaseModel):
    voice_settings: Optional[dict] = None
    narration_style: str = "讲解"


@router.post("/{document_id}/narration")
async def generate_ppt_narration(document_id: str, request: NarrationRequest):
    """
    为PPT生成讲解音频
    """
    try:
        # 从数据库获取文档信息
        document_db = await get_document_database()
        document = await document_db.get_document(document_id)
        
        if not document:
            raise HTTPException(status_code=404, detail="文档不存在")
        
        # 检查文件是否存在
        file_path = Path(document.file_path)
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="源文件不存在")
        
        # 检查是否为PPT文件
        file_extension = file_path.suffix.lower()
        if file_extension not in ['.pptx', '.ppt']:
            raise HTTPException(status_code=400, detail="只支持PPT/PPTX文件")
        
        # 生成讲解音频
        result = await slide_service.generate_ppt_narration(
            document_id=document_id,
            file_path=str(file_path),
            voice_settings=request.voice_settings,
            narration_style=request.narration_style
        )
        
        if result["success"]:
            logger.info(f"PPT讲解生成成功: {document_id}, 成功生成{result['success_count']}页")
            return {
                "success": True,
                "message": f"讲解生成完成，成功生成{result['success_count']}页音频",
                "data": {
                    "document_id": result["document_id"],
                    "total_slides": result["total_slides"],
                    "success_count": result["success_count"],
                    "failed_count": result["failed_count"],
                    "generated_files": result["generated_files"],
                    "narration_style": result["narration_style"]
                }
            }
        else:
            logger.error(f"PPT讲解生成失败: {document_id}, 错误: {result.get('error')}")
            raise HTTPException(status_code=500, detail=f"讲解生成失败: {result.get('error')}")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"生成PPT讲解异常: {str(e)}")
        raise HTTPException(status_code=500, detail="生成讲解失败")


@router.get("/{document_id}/narration/status")
async def get_narration_status(document_id: str):
    """
    获取PPT讲解生成状态
    """
    try:
        # 从数据库获取文档信息
        document_db = await get_document_database()
        document = await document_db.get_document(document_id)
        
        if not document:
            raise HTTPException(status_code=404, detail="文档不存在")
        
        # 检查音频文件存在情况
        audio_files = []
        audio_path = slide_service.audio_path
        
        # 扫描音频文件
        for audio_file in audio_path.glob(f"{document_id}_page_*.wav"):
            page_number = int(audio_file.stem.split('_page_')[1])
            file_size = audio_file.stat().st_size
            
            audio_files.append({
                "page_number": page_number,
                "filename": audio_file.name,
                "size": file_size,
                "url": f"/api/slides/{document_id}/audio/{page_number}"
            })
        
        # 按页码排序
        audio_files.sort(key=lambda x: x["page_number"])
        
        return {
            "document_id": document_id,
            "total_audio_files": len(audio_files),
            "audio_files": audio_files,
            "has_narration": len(audio_files) > 0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取讲解状态异常: {str(e)}")
        raise HTTPException(status_code=500, detail="获取状态失败")


@router.get("/{document_id}/audio/{page_number}")
async def get_slide_audio(document_id: str, page_number: int):
    """
    获取指定页面的音频文件
    """
    try:
        # 获取音频数据
        audio_data = await slide_service.get_slide_audio(document_id, page_number)
        
        if audio_data is None:
            raise HTTPException(status_code=404, detail="音频文件不存在")
        
        # 返回音频文件
        return Response(
            content=audio_data,
            media_type="audio/wav",
            headers={
                "Content-Disposition": f"attachment; filename={document_id}_page_{page_number}.wav"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取音频文件异常: {str(e)}")
        raise HTTPException(status_code=500, detail="获取音频失败")


@router.delete("/{document_id}/narration")
async def delete_ppt_narration(document_id: str):
    """
    删除PPT讲解音频文件
    """
    try:
        audio_path = slide_service.audio_path
        deleted_files = []
        
        # 删除所有相关音频文件
        for audio_file in audio_path.glob(f"{document_id}_page_*.wav"):
            try:
                audio_file.unlink()
                deleted_files.append(audio_file.name)
            except Exception as e:
                logger.warning(f"删除音频文件失败: {audio_file}, 错误: {e}")
        
        return {
            "success": True,
            "message": f"已删除{len(deleted_files)}个音频文件",
            "deleted_files": deleted_files
        }
        
    except Exception as e:
        logger.error(f"删除讲解音频异常: {str(e)}")
        raise HTTPException(status_code=500, detail="删除音频失败")