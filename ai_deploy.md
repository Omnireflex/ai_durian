# AI 榴莲挑选助手：从本地到 GitHub + Vercel 的复刻部署指南

这份文档给 Codex 或开发者使用，目标是把本项目复刻成一个任何人都能用手机浏览器打开的在线应用。

项目形态：

- Next.js App Router
- TypeScript
- Tailwind CSS
- 服务端 API Route 调用多模态 AI
- 当前部署版不保存用户图片、不保存分析记录、不做排行榜

## 你需要提前准备

1. GitHub 账号
2. Vercel 账号
3. 一个可用的多模态 AI API Key
4. 本机安装 Git 和 Node.js

建议 Node.js 版本：20 或更新。

## 需要自己填写的关键信息

不要把真实 key 写进代码或提交到 GitHub。

```text
AI_API_KEY=你的 AI API Key
AI_MODEL=qwen3.5-omni-flash
AI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
AI_FALLBACK_MODEL=qwen-vl-max-latest
AI_DEBUG=false
```

如果你使用 OpenAI 官方接口，可以改成：

```text
AI_API_KEY=你的 OpenAI API Key
AI_MODEL=支持视觉输入的模型
AI_BASE_URL=https://api.openai.com/v1
AI_FALLBACK_MODEL=
AI_DEBUG=false
```

## 1. 本地确认项目能跑

在项目根目录执行：

```bash
npm install
cp .env.example .env.local
```

编辑 `.env.local`，填入自己的 AI 配置。

启动本地服务：

```bash
npm run dev
```

打开：

```text
http://localhost:3000
```

确认流程：

1. 点击「开始挑选你的榴莲」
2. 上传至少 3 张照片，推荐上传 4 张核心照片
3. 填写品种、价格、重量、气味、敲击声、重量感
4. 点击「开始 AI 分析」
5. 页面出现分析结果

如果失败，先检查 `.env.local` 和终端日志。

## 2. 提交到本地 Git

如果项目还不是 Git 仓库：

```bash
git init
git add .
git commit -m "Initial public MVP"
```

确认 `.env.local` 没有被提交：

```bash
git status --short
git check-ignore .env.local
```

`git check-ignore .env.local` 应该输出 `.env.local`。

## 3. 创建 GitHub 仓库

在 GitHub 网站创建一个新仓库。

建议：

```text
Repository name: durian-ai-mvp
Visibility: Public
Initialize with README: 不勾选
```

创建后，GitHub 会给你一个远程地址，例如：

```text
https://github.com/YOUR_NAME/durian-ai-mvp.git
```

回到本地项目根目录：

```bash
git branch -M main
git remote add origin https://github.com/YOUR_NAME/durian-ai-mvp.git
git push -u origin main
```

如果已经存在 `origin`：

```bash
git remote set-url origin https://github.com/YOUR_NAME/durian-ai-mvp.git
git push -u origin main
```

## 4. 连接 Vercel

1. 打开 [https://vercel.com](https://vercel.com)
2. 使用 GitHub 登录
3. 点击「Add New...」或「New Project」
4. 选择刚才的 GitHub 仓库
5. Framework Preset 选择 `Next.js`
6. Build Command 保持默认或填写：

```bash
npm run build
```

7. Install Command 保持默认或填写：

```bash
npm install
```

8. Output Directory 保持默认，不要填写

## 5. 在 Vercel 配置环境变量

进入 Vercel 项目：

```text
Project Settings -> Environment Variables
```

添加：

```text
AI_API_KEY
AI_MODEL
AI_BASE_URL
AI_FALLBACK_MODEL
AI_DEBUG
```

推荐生产环境：

```text
AI_DEBUG=false
```

配置完后重新 Deploy。

## 6. 手机访问

部署成功后，Vercel 会生成一个地址，例如：

```text
https://durian-ai-mvp.vercel.app
```

把这个链接发到手机上，用浏览器打开即可使用。

移动端拍照上传通常需要 HTTPS，Vercel 默认提供 HTTPS。

## 7. 常见问题

### 提示缺少 AI_API_KEY

说明 Vercel 没有配置环境变量，或者配置后没有重新部署。

解决：

1. 检查 Vercel Environment Variables
2. 确认变量应用到 Production
3. 重新 Deploy

### 本地能跑，Vercel 上 AI 调用失败

检查：

1. `AI_BASE_URL` 是否正确
2. 模型是否支持图片输入
3. API Key 是否有权限
4. Vercel Function Logs 里的错误信息

### 上传照片后报错

当前限制：

- 最少 3 张
- 最多 6 张
- 单张小于 5MB
- 支持 JPG / PNG / WEBP

### 为什么没有排行榜和历史记录

当前是无数据库部署版，目的是让任何人最快复刻并上线。

如果要加回排行榜，需要增加数据库，例如：

- Supabase
- Neon
- Vercel Postgres
- Turso

然后实现：

- 保存分析记录
- 保存开果反馈
- 根据反馈计算排行榜

## 8. 给 Codex 的复刻任务提示词

你可以把下面这段给 Codex：

```text
请阅读 ai_deploy.md，帮我把这个 Next.js 榴莲 AI 挑选项目部署到 GitHub 和 Vercel。

我会自己提供：
- GitHub 仓库地址
- Vercel 账号访问方式
- AI_API_KEY
- AI_MODEL
- AI_BASE_URL
- AI_FALLBACK_MODEL

请你确认：
1. .env.local 不会被提交
2. 本地 npm run lint 通过
3. 本地 npx tsc --noEmit 通过
4. GitHub main 分支已经推送成功
5. Vercel 环境变量配置完整
6. 线上 URL 可以用手机浏览器打开
7. 上传照片后确实调用 /api/analyze 并返回 AI 分析结果
```

## 9. 安全提醒

- 不要把 `.env.local`、API Key、Vercel token、GitHub token 提交到仓库。
- 不要在前端代码里使用 `NEXT_PUBLIC_AI_API_KEY`。
- 当前项目会把上传图片转成 base64 后发送给 AI 服务商；上线前请在页面上保留免责声明。
- 如果面向真实用户，请补充隐私政策和服务条款。
