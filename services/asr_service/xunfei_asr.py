"""
讯飞语音识别服务实现
"""
import time
import os
import requests
import json
import base64
import hashlib
import hmac
from datetime import datetime
from typing import Dict, Any
from .asr_base import BaseASR
from .asr_models import ASRRequest, ASRResponse


class XunfeiASR(BaseASR):
    """讯飞语音识别实现类"""

    def _validate_config(self) -> None:
        """验证讯飞配置信息"""
        required_keys = ['app_id', 'api_key', 'api_secret']
        for key in required_keys:
            if key not in self.config:
                raise ValueError(f"讯飞ASR配置缺少必要参数: {key}")

    def _init_client(self) -> None:
        """初始化讯飞ASR客户端"""
        self.app_id = self.config['app_id']
        self.api_key = self.config['api_key']
        self.api_secret = self.config['api_secret']
        self.host = self.config.get('host', 'ost-api.xfyun.cn')
        self.request_uri_create = "/v2/ost/pro_create"
        self.request_uri_query = "/v2/ost/query"
        
        # 构建URL
        if self.host.startswith('http'):
            self.url_create = self.host + self.request_uri_create
            self.url_query = self.host + self.request_uri_query
        else:
            self.url_create = f"https://{self.host}{self.request_uri_create}"
            self.url_query = f"https://{self.host}{self.request_uri_query}"

    def _generate_signature(self, digest: str, uri: str) -> str:
        """生成请求签名"""
        signature_str = f"host: {self.host}\n"
        signature_str += f"date: {self._get_http_date()}\n"
        signature_str += f"POST {uri} HTTP/1.1\n"
        signature_str += f"digest: {digest}"
        
        signature = base64.b64encode(
            hmac.new(
                self.api_secret.encode('utf-8'),
                signature_str.encode('utf-8'),
                hashlib.sha256
            ).digest()
        ).decode('utf-8')
        
        authorization = f'api_key="{self.api_key}", algorithm="hmac-sha256", headers="host date request-line digest", signature="{signature}"'
        return base64.b64encode(authorization.encode('utf-8')).decode('utf-8')

    def _get_http_date(self) -> str:
        """获取HTTP日期格式"""
        dt = datetime.utcnow()
        weekday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][dt.weekday()]
        month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep",
                 "Oct", "Nov", "Dec"][dt.month - 1]
        return f"{weekday}, {dt.day:02d} {month} {dt.year:04d} {dt.hour:02d}:{dt.minute:02d}:{dt.second:02d} GMT"

    def _upload_file(self, audio_file: str) -> str:
        """上传音频文件并获取file_id"""
        try:
            # 读取音频文件
            with open(audio_file, 'rb') as f:
                audio_data = f.read()
            
            # 计算文件摘要
            file_md5 = hashlib.md5(audio_data).hexdigest()
            file_sha1 = hashlib.sha1(audio_data).hexdigest()
            
            # 准备上传数据
            body = {
                "app_id": self.app_id,
                "signa": file_sha1,
                "file_md5": file_md5,
                "file_name": os.path.basename(audio_file),
                "file_size": len(audio_data),
                "duration": "60000"  # 默认时长，实际会自动检测
            }
            
            body_str = json.dumps(body)
            digest = f"SHA-256={base64.b64encode(hashlib.sha256(body_str.encode('utf-8')).digest()).decode('utf-8')}"
            
            # 生成请求头
            headers = {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Method": "POST",
                "Host": self.host,
                "Date": self._get_http_date(),
                "Digest": digest,
                "Authorization": self._generate_signature(digest, self.request_uri_create)
            }
            
            # 发送创建任务请求
            response = requests.post(self.url_create, headers=headers, data=body_str)
            result = response.json()
            
            if result.get("code") == "000000":
                return result["data"]["task_id"]
            else:
                raise Exception(f"创建任务失败: {result.get('descInfo', '未知错误')}")
                
        except Exception as e:
            raise Exception(f"上传文件失败: {str(e)}")

    def _query_result(self, task_id: str, max_retries: int = 30) -> Dict[str, Any]:
        """查询识别结果"""
        for i in range(max_retries):
            try:
                body = {"app_id": self.app_id, "task_id": task_id}
                body_str = json.dumps(body)
                digest = f"SHA-256={base64.b64encode(hashlib.sha256(body_str.encode('utf-8')).digest()).decode('utf-8')}"
                
                headers = {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Method": "POST",
                    "Host": self.host,
                    "Date": self._get_http_date(),
                    "Digest": digest,
                    "Authorization": self._generate_signature(digest, self.request_uri_query)
                }
                
                response = requests.post(self.url_query, headers=headers, data=body_str)
                result = response.json()
                
                if result.get("code") == "000000":
                    task_status = result["data"]["task_status"]
                    if task_status == "9":  # 任务完成
                        return result
                    elif task_status in ["1", "2"]:  # 处理中
                        time.sleep(2)  # 等待2秒后重试
                        continue
                    else:  # 任务失败
                        raise Exception(f"任务失败，状态: {task_status}")
                else:
                    raise Exception(f"查询失败: {result.get('descInfo', '未知错误')}")
                    
            except Exception as e:
                if i == max_retries - 1:  # 最后一次重试
                    raise e
                time.sleep(2)
        
        raise Exception("查询超时")

    def recognize(self, request: ASRRequest) -> ASRResponse:
        """执行语音识别"""
        start_time = time.time()
        
        try:
            # 检查文件是否存在
            if not os.path.exists(request.audio_file):
                return ASRResponse(
                    success=False,
                    error_msg=f"音频文件不存在: {request.audio_file}",
                    duration=time.time() - start_time,
                    file_path=request.audio_file
                )
            
            # 上传文件并创建任务
            task_id = self._upload_file(request.audio_file)
            
            # 查询识别结果
            result = self._query_result(task_id)
            
            duration = time.time() - start_time
            
            # 解析结果
            if result.get("code") == "000000" and result["data"]["task_status"] == "9":
                # 提取识别文本
                text_parts = []
                for item in result["data"]["result"]:
                    if "onebest" in item:
                        text_parts.append(item["onebest"])
                
                text = "".join(text_parts)
                
                return ASRResponse(
                    text=text,
                    success=True,
                    duration=duration,
                    file_path=request.audio_file,
                    confidence=1.0,  # 讯飞不直接提供置信度
                    extra_info=result
                )
            else:
                return ASRResponse(
                    success=False,
                    error_msg=result.get('descInfo', '识别失败'),
                    duration=duration,
                    file_path=request.audio_file,
                    extra_info=result
                )
                
        except Exception as e:
            return ASRResponse(
                success=False,
                error_msg=str(e),
                duration=time.time() - start_time,
                file_path=request.audio_file
            )

    def recognize_file(self, 
                      audio_file: str, 
                      audio_format: str = 'wav',
                      sample_rate: int = 16000,
                      language: str = 'zh') -> ASRResponse:
        """识别音频文件"""
        request = ASRRequest(
            audio_file=audio_file,
            audio_format=audio_format,
            sample_rate=sample_rate,
            language=language
        )
        return self.recognize(request)
    
    def get_supported_formats(self) -> list:
        """获取支持的音频格式"""
        return ['wav', 'mp3', 'flac', 'm4a', 'aac']
    
    def get_supported_languages(self) -> list:
        """获取支持的语言"""
        return ['zh', 'en']
