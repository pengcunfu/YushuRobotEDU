# YushuRobot 微服务示例

一个基于 FastAPI 的简易 Python 微服务项目示例，演示了微服务架构的基本概念和实现方式。

## 📋 项目概述

本项目是一个教育用途的微服务示例，包含以下功能模块：

- **用户管理服务** - 提供用户的 CRUD 操作
- **产品管理服务** - 提供产品的 CRUD 操作
- **统一 API 网关** - 通过 FastAPI 提供统一的接口
- **前端管理界面** - 现代化的 Web 管理界面

## 🚀 技术栈

- **后端框架**: FastAPI 0.104.1
- **前端**: HTML5 + CSS3 + JavaScript + Bootstrap 5
- **服务器**: Uvicorn
- **数据验证**: Pydantic
- **开发工具**: Python 3.11+
- **容器化**: Docker & Docker Compose
- **代码质量**: Black, Flake8
- **测试**: Pytest

## 📁 项目结构

```
YushuRobotEDU/
├── main.py                 # 主应用入口
├── config.py              # 配置文件
├── requirements.txt       # Python依赖
├── Dockerfile            # Docker配置
├── docker-compose.yml    # Docker Compose配置
├── env.example           # 环境变量示例
├── start.py              # 快速启动脚本
├── static/               # 前端静态文件
│   ├── index.html        # 前端主页面
│   ├── css/
│   │   └── style.css     # 样式文件
│   └── js/
│       └── app.js        # 前端JavaScript
├── services/             # 微服务模块
│   ├── __init__.py
│   ├── user_service.py   # 用户管理服务
│   └── product_service.py # 产品管理服务
└── README.md             # 项目说明
```

## 🛠️ 快速开始

### 方式一：本地开发

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd YushuRobotEDU
   ```

2. **创建虚拟环境**
   ```bash
   python -m venv venv
   
   # Windows
   venv\\Scripts\\activate
   
   # macOS/Linux
   source venv/bin/activate
   ```

3. **安装依赖**
   ```bash
   pip install -r requirements.txt
   ```

4. **配置环境变量**
   ```bash
   cp env.example .env
   # 根据需要修改 .env 文件中的配置
   ```

5. **启动服务**
   ```bash
   python main.py
   ```

6. **访问应用**
   - 前端管理界面: http://localhost:8000
   - API文档: http://localhost:8000/docs
   - ReDoc文档: http://localhost:8000/redoc
   - API信息: http://localhost:8000/api

### 方式二：使用 Docker

1. **使用 Docker Compose**
   ```bash
   docker-compose up -d
   ```

2. **访问应用**
   - 前端管理界面: http://localhost:8000
   - API文档: http://localhost:8000/docs

## 🖥️ 前端功能

现在项目包含了一个完整的前端管理界面，提供以下功能：

### 📊 仪表板
- 系统概览统计
- 用户和产品数量展示
- 部门分布图表
- 产品分类统计

### 👥 用户管理
- 用户列表展示
- 添加/编辑/删除用户
- 用户搜索功能
- 状态管理

### 📦 产品管理  
- 产品列表展示
- 添加/编辑/删除产品
- 产品搜索和分类筛选
- 库存管理
- 价格展示

### 🎨 界面特点
- 响应式设计，支持移动端
- 现代化 Bootstrap 5 UI
- 实时数据更新
- 用户友好的交互体验

## 📚 API 接口

### 用户管理接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/users` | 获取所有用户 |
| GET | `/api/users/{user_id}` | 获取指定用户 |
| POST | `/api/users` | 创建新用户 |
| PUT | `/api/users/{user_id}` | 更新用户信息 |
| DELETE | `/api/users/{user_id}` | 删除用户 |

### 产品管理接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/products` | 获取所有产品 |
| GET | `/api/products/{product_id}` | 获取指定产品 |
| POST | `/api/products` | 创建新产品 |
| PUT | `/api/products/{product_id}` | 更新产品信息 |
| DELETE | `/api/products/{product_id}` | 删除产品 |

### 系统接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/` | 应用首页信息 |
| GET | `/health` | 健康检查 |

## 💡 示例请求

### 创建用户

```bash
curl -X POST "http://localhost:8000/api/users" \\
     -H "Content-Type: application/json" \\
     -d '{
       "name": "张三",
       "email": "zhangsan@example.com",
       "age": 25,
       "department": "技术部"
     }'
```

### 创建产品

```bash
curl -X POST "http://localhost:8000/api/products" \\
     -H "Content-Type: application/json" \\
     -d '{
       "name": "智能机器人X1",
       "description": "新一代教育机器人",
       "price": 6999.00,
       "category": "教育机器人",
       "stock": 20,
       "brand": "YushuRobot"
     }'
```

## 🧪 运行测试

```bash
# 运行所有测试
pytest

# 运行测试并显示覆盖率
pytest --cov=services tests/
```

## 🔧 开发工具

### 代码格式化

```bash
# 使用 Black 格式化代码
black .

# 使用 Flake8 检查代码质量
flake8 .
```

### 环境变量

项目支持通过环境变量进行配置，主要配置项包括：

- `ENVIRONMENT`: 运行环境 (development/production/testing)
- `DEBUG`: 调试模式开关
- `HOST`: 服务器主机地址
- `PORT`: 服务器端口
- `SECRET_KEY`: 应用密钥

详细配置请参考 `env.example` 文件。

## 🏗️ 微服务架构说明

本项目采用模块化的微服务设计：

1. **服务分离**: 用户管理和产品管理作为独立的服务模块
2. **统一网关**: 通过 FastAPI 提供统一的 API 接口
3. **数据隔离**: 每个服务管理自己的数据（当前使用内存存储）
4. **可扩展性**: 可以轻松添加新的服务模块

## 🚀 扩展建议

1. **数据持久化**: 集成 PostgreSQL 或 MongoDB
2. **缓存层**: 添加 Redis 缓存
3. **身份验证**: 实现 JWT 认证机制
4. **日志系统**: 集成结构化日志
5. **监控告警**: 添加 Prometheus + Grafana
6. **API 版本化**: 实现 API 版本管理
7. **消息队列**: 集成 RabbitMQ 或 Kafka

## 📄 许可证

本项目仅用于教育和学习目的。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目！

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 项目仓库: [GitHub Repository]
- 邮箱: contact@yushurobot.com

---

**注意**: 这是一个示例项目，当前使用内存存储数据，重启服务后数据会丢失。在生产环境中请使用持久化存储方案。
