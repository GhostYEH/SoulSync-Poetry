# 古诗词学习系统

基于 Vue 3 和 Express 的古诗词学习与创作应用，包含诗词检索、收藏、学习路径、AI 辅导与创作工具。

## 环境要求

- Node.js 22.14.0 或更高版本
- npm 10 或更高版本

## 本地启动

1. 复制 `backend/.env.example` 为 `backend/.env`，按需填写数据库、AI 服务与 JWT 配置。
2. 安装依赖：`npm install`、`npm --prefix backend install`、`npm --prefix frontend install`。
3. 运行 `npm run dev`，前端和后端会同时启动。

## 生产配置

- `JWT_SECRET` 必须为至少 32 个字符的随机值；弱密钥会使生产服务拒绝启动。
- 使用 `ALLOWED_ORIGINS`（也兼容旧的 `CORS_ORIGIN`）配置逗号分隔的前端来源。生产环境未配置时不会开放跨域访问。
- 前端可使用 `VITE_API_BASE_URL` 与 `VITE_SOCKET_URL` 指向独立部署的 API 服务。
