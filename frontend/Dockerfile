# 构建阶段
FROM node:18-alpine as build

# 设置工作目录
WORKDIR /app

# 配置npm使用USTC镜像源
RUN npm config set registry https://mirrors.ustc.edu.cn/npm/

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci --prefer-offline --no-audit

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产阶段
FROM nginx:stable-alpine

# 配置Alpine使用USTC镜像源
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories

# 复制构建产物到Nginx服务目录
COPY --from=build /app/dist /usr/share/nginx/html

# 复制Nginx配置文件（如果有自定义配置）
# COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80 443

# 启动Nginx
CMD ["nginx", "-g", "daemon off;"]
