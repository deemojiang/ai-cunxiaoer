# AI 村小二 · 完整应用

基于《未来乡村 AI 版 · 便民服务需求清单》与对话流程原型打造的完整工程：

- **村民端**：对话办事、十二场景、通用问答、我的工单
- **管理后台**：工单处理、村务公开、服务配置、知识库
- **后端 API**：Express + JSON 文件持久化（`server/data/db.json`）

仓库：https://github.com/deemojiang/ai-cunxiaoer

## 在线访问（Render）

部署到 [Render](https://render.com) 免费 Web Service 后，可直接打开网站使用（完整 API + 后台）。

### 一键部署步骤

1. 用 GitHub 登录 https://render.com
2. **New** → **Blueprint**，选择仓库 `deemojiang/ai-cunxiaoer`（会读取根目录 `render.yaml`）
   - 或 **New** → **Web Service**，手动填写：
     - **Build Command**：`npm install && npm run build`
     - **Start Command**：`npm start`
3. 创建服务，等待 Build / Deploy 完成
4. 打开 Render 给出的公网地址，例如：`https://ai-cunxiaoer.onrender.com`

| 入口 | 路径 |
|------|------|
| 村民端 | `/` |
| 管理后台 | `/admin/login` |
| 健康检查 | `/api/health` |

默认管理员：`admin` / `admin123`

> **说明**：免费套餐约 15 分钟无访问会休眠，再次打开需等待十几秒冷启动。免费实例磁盘为临时存储，重新部署后演示数据会按种子数据重置。

## 本地快速启动

工程路径：`未来乡村ai版/ai-cunxiaoer`

```bash
cd 未来乡村ai版/ai-cunxiaoer
npm install
npm run dev
```

- 村民端：http://127.0.0.1:5173
- 管理后台：http://127.0.0.1:5173/admin/login
- API：http://127.0.0.1:3001

## 目录

```
ai-cunxiaoer/
  package.json      # workspace 脚本
  render.yaml       # Render Blueprint
  server/           # Express API
  web/              # React + Vite 前端
```

## 功能对照

| 模块 | 说明 |
|------|------|
| 首页 | 两排服务卡 + 更多、打字/语音模拟/附件 |
| 场景 | 反映问题、报修、卖货、政策、技能、找活、订餐、互助、礼堂、挂号、健康、村务 |
| 六步流程 | 识别→确认→采集→摘要→生单→反馈 |
| 通用问答 | 天气、知识库、联网搜索摘要 |
| 我的 | 分类筛选、详情时间线、问 AI 查进度 |
| 管理 | 工单受理/完成、村务维护、服务开关与首页展示、知识库 CRUD |

## 生产构建（本地）

```bash
npm run build
npm start
```

服务端会托管 `web/dist` 静态资源，默认端口 `3001`（可用环境变量 `PORT` 覆盖）。

## 需求文档

完整需求见上级目录：`../未来乡村ai版/README.md`
