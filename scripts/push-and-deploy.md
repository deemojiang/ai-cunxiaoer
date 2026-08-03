# 推送到 GitHub + Render 上线（本机一次完成）

当前仓库本地已完成首次提交。若本机访问 GitHub 超时，请先开启可访问 GitHub 的网络（代理/VPN），再执行下面步骤。

## 1. 登录 GitHub CLI

```powershell
gh auth login -h github.com -p https -w
```

浏览器打开提示的地址并输入一次性代码。

## 2. 创建远程仓库并推送

在项目根目录 `ai-cunxiaoer` 执行：

```powershell
cd d:\2.Work\project\cursor\ai-cunxiaoer
gh repo create deemojiang/ai-cunxiaoer --public --source=. --remote=origin --push --description "AI 村小二 · 未来乡村便民服务"
```

若网页上已建好空仓库，则改用：

```powershell
git remote add origin https://github.com/deemojiang/ai-cunxiaoer.git
git push -u origin main
```

仓库地址：https://github.com/deemojiang/ai-cunxiaoer

## 3. Render 部署（网站可访问）

1. 打开 https://render.com 并用 GitHub 登录
2. **New** → **Blueprint**，选择 `deemojiang/ai-cunxiaoer`
3. 应用根目录的 `render.yaml`，创建服务
4. 等待 Deploy 成功后，打开 Render 提供的网址（形如 `https://ai-cunxiaoer.onrender.com`）

| 入口 | 路径 |
|------|------|
| 村民端 | `/` |
| 管理后台 | `/admin/login`（`admin` / `admin123`） |

> 免费实例约 15 分钟无访问会休眠，首次打开可能需等待十几秒。
