# 构建阶段
FROM node:20-alpine as build

# 设置工作目录
WORKDIR /app

# 配置npm使用阿里云镜像源
RUN npm config set registry https://registry.npmmirror.com

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci --prefer-offline --no-audit

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产阶段
FROM nginx:1.22-alpine

# 复制构建产物到Nginx服务目录
COPY --from=build /app/dist /usr/share/nginx/html

# 创建默认的Nginx配置
RUN echo 'server { \
    listen 80; \
    server_name _; \
    \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # 确保根目录有正确的权限 \
    location / { \
        try_files $uri $uri/ /index.html; \
        autoindex off; \
    } \
    \
    # API请求代理 \
    location /api/ { \
        proxy_pass http://yushu-backend:8000; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
    } \
}' > /etc/nginx/conf.d/default.conf

# 确保Nginx用户有权限访问目录
RUN chmod -R 755 /usr/share/nginx/html

# 暴露端口
EXPOSE 80 443

# 启动Nginx
CMD ["nginx", "-g", "daemon off;"]
