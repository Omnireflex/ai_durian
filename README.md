# AI 榴莲挑选助手

一个移动端优先的 Next.js 榴莲挑选工具。用户上传榴莲照片、填写现场信息后，服务端调用多模态 AI 接口返回购买建议、评分、证据和风险提醒。

当前开源部署版只保留核心分析链路：

- 上传 3-6 张榴莲图片（JPG / PNG / WEBP）
- 填写品种、价格、重量、气味、敲击声、重量感等信息
- 调用 `/api/analyze`
- 图片不足时返回信息不足
- 图片足够时调用真实 AI 接口分析
- 不保存用户图片、不保存分析记录、不包含排行榜和开果反馈

## 本地运行

复制环境变量示例：

```bash
cp .env.example .env.local
```

填写 `.env.local`：

```env
AI_API_KEY=你的 AI API Key
AI_MODEL=qwen3.5-omni-flash
AI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
AI_FALLBACK_MODEL=qwen-vl-max-latest
AI_DEBUG=false
```

启动：

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## 部署

推荐部署到 Vercel。完整复刻流程见 [ai_deploy.md](./ai_deploy.md)。

部署时需要在 Vercel Project Settings 中配置同样的环境变量：

```text
AI_API_KEY
AI_MODEL
AI_BASE_URL
AI_FALLBACK_MODEL
AI_DEBUG
```

## 注意

- `AI_API_KEY` 只能放在服务端环境变量里，不要提交到 GitHub。
- 当前版本无数据库，适合快速开源和移动端在线体验。
- 如果要恢复排行榜、历史记录、开果反馈，需要接入 Supabase、Neon、Vercel Postgres 等持久化数据库。
