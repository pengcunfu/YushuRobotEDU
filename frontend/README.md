# YushuRobot Frontend

现代化的React前端应用，采用TypeScript + Vite + Ant Design构建。

## 🚀 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **UI组件**: Ant Design
- **样式**: Tailwind CSS
- **状态管理**: Zustand
- **HTTP客户端**: Axios
- **数据获取**: TanStack Query (React Query)
- **路由**: React Router v6

## 📁 项目结构

```
src/
├── components/          # 可复用组件
│   └── Layout/         # 布局组件
├── pages/              # 页面组件
│   ├── Dashboard/      # 仪表板
│   ├── Users/          # 用户管理
│   ├── Products/       # 产品管理
│   ├── Configs/        # 配置管理
│   └── System/         # 系统管理
├── services/           # API服务
├── stores/             # 状态管理
├── types/              # TypeScript类型定义
├── hooks/              # 自定义Hook
├── utils/              # 工具函数
└── assets/             # 静态资源
```

## 🛠️ 开发指南

### 安装依赖

```bash
npm install
# 或
yarn install
```

### 启动开发服务器

```bash
npm run dev
# 或
yarn dev
```

访问 http://localhost:3000

### 构建生产版本

```bash
npm run build
# 或
yarn build
```

### 预览生产版本

```bash
npm run preview
# 或
yarn preview
```

## 🔧 环境配置

复制 `.env.example` 到 `.env` 并修改配置：

```bash
cp .env.example .env
```

主要配置项：
- `VITE_API_URL`: 后端API地址
- `VITE_APP_TITLE`: 应用标题

## 📋 功能特性

### ✅ 已实现功能

- 🎨 **现代化UI设计** - 基于Ant Design的组件库
- 🌓 **主题切换** - 支持明暗主题切换
- 📱 **响应式布局** - 适配桌面和移动设备
- 🔄 **状态管理** - 使用Zustand管理全局状态
- 🚀 **性能优化** - 懒加载、代码分割
- 🔒 **类型安全** - 完整的TypeScript类型定义
- 🛠️ **开发体验** - 热重载、错误边界
- 📊 **数据可视化** - 统计图表和仪表板

### 🎯 核心页面

1. **仪表板** (`/`)
   - 系统概览
   - 关键指标统计
   - 服务状态监控

2. **用户管理** (`/users`)
   - 用户列表和搜索
   - 创建、编辑、删除用户
   - 用户统计信息

3. **产品管理** (`/products`)
   - 产品目录管理
   - 库存跟踪
   - 分类和品牌管理

4. **配置管理** (`/configs`)
   - YAML配置文件管理
   - 在线编辑器
   - 备份和恢复

5. **系统管理** (`/system`)
   - 服务监控
   - 系统健康检查
   - 路由信息

## 🔌 API集成

### 服务层架构

- `apiService`: 统一的HTTP客户端
- `userService`: 用户相关API
- `productService`: 产品相关API
- `configService`: 配置相关API
- `systemService`: 系统相关API

### 错误处理

- 全局错误拦截
- 用户友好的错误提示
- 自动token刷新（如果有认证）

### 数据缓存

使用React Query进行：
- 自动缓存和同步
- 后台数据更新
- 乐观更新

## 🎨 UI/UX设计

### 设计原则

- **一致性**: 统一的视觉语言和交互模式
- **简洁性**: 清晰的信息层次和导航结构
- **可访问性**: 支持键盘导航和屏幕阅读器
- **响应式**: 适配各种屏幕尺寸

### 颜色系统

- **主色**: 蓝色系 (#1890ff)
- **辅助色**: 绿色、橙色、紫色
- **中性色**: 灰色系
- **状态色**: 成功(绿)、警告(橙)、错误(红)

### 组件规范

- 统一的间距系统 (4px基准)
- 一致的圆角和阴影
- 标准的字体大小和行高
- 规范的图标使用

## 🔧 开发工具

### 代码质量

```bash
# 类型检查
npm run type-check

# 代码检查
npm run lint

# 代码格式化
npm run format
```

### 调试工具

- React Developer Tools
- Redux DevTools (Zustand)
- React Query DevTools

## 📦 部署

### Docker部署

```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 静态部署

构建后的 `dist` 目录可以部署到任何静态文件服务器：
- Vercel
- Netlify
- GitHub Pages
- 云服务器 + Nginx

## 🔄 与后端集成

### API约定

- 统一的响应格式
- RESTful API设计
- 标准的HTTP状态码
- CORS配置

### 开发环境代理

Vite配置了API代理，开发时请求会自动转发到后端：

```typescript
// vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    },
  },
}
```

## 🚀 下一步计划

- [ ] 添加用户认证和权限管理
- [ ] 实现实时通知功能
- [ ] 添加更多图表和可视化
- [ ] 支持国际化(i18n)
- [ ] 添加单元测试和E2E测试
- [ ] 性能监控和分析
- [ ] PWA支持

## 🤝 贡献指南

1. Fork项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。
