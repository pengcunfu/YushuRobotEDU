# 使用Python官方镜像
FROM python:3.9-slim

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 配置 apt 国内镜像源（中科大镜像）
RUN sed -i 's/deb.debian.org/mirrors.ustc.edu.cn/g' /etc/apt/sources.list && \
    sed -i 's/security.debian.org/mirrors.ustc.edu.cn/g' /etc/apt/sources.list

# 安装系统依赖
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        gcc \
        libc6-dev \
    && rm -rf /var/lib/apt/lists/*

# 复制requirements文件
COPY requirements.txt .

# 配置 pip 国内镜像源（腾讯云镜像）
RUN pip config set global.index-url https://mirrors.cloud.tencent.com/pypi/simple && \
    pip config set global.trusted-host mirrors.cloud.tencent.com

# 安装Python依赖
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 直接使用root用户运行
# RUN adduser --disabled-password --gecos '' appuser \
#     && chown -R appuser:appuser /app
# USER appuser

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["python", "start.py"]
