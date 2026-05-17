# AI 榴莲挑选助手 MVP 技术路线文档

## 1. 项目目标

本项目要实现一个轻量级网页 MVP：用户上传多张榴莲照片，并填写少量辅助信息，系统通过多模态 AI 分析榴莲外观特征，输出购买建议。

产品定位不是“百分百判断榴莲好坏”，而是：

> AI 榴莲避坑助手：通过图片和用户补充信息，辅助判断一颗榴莲是否值得购买。

核心目标：

1. 支持用户上传 3-6 张榴莲图片；
2. 支持用户填写气味、敲击声、重量感、品种、价格等辅助信息；
3. 调用多模态 AI 模型分析榴莲成熟度、新鲜度、出肉率和坏果风险；
4. 输出结构化结果，包括买/谨慎/不建议；
5. 允许用户在开果后上传反馈，用于后续积累训练数据。

---

## 2. MVP 功能范围

### 2.1 必须实现的功能

#### 用户端

1. 图片上传
   - 支持上传多张图片；
   - 建议上传：
     - 整体正面照；
     - 整体侧面照；
     - 果柄特写；
     - 底部/星线/壳缝特写；
     - 瑕疵/黑点/虫洞特写；
   - 支持 JPG、PNG、WEBP；
   - 单张图片建议压缩到 1MB 以下。

2. 辅助信息填写
   - 榴莲品种；
   - 售卖方式；
   - 价格；
   - 重量；
   - 气味描述；
   - 敲击声音；
   - 手感重量；
   - 用户偏好的口感。

3. AI 分析
   - 用户点击“开始分析”；
   - 后端接收图片和表单；
   - 调用视觉大模型；
   - 返回结构化 JSON；
   - 前端渲染结果卡片。

4. 分析结果展示
   - 综合建议：买 / 谨慎 / 不建议；
   - 成熟度分数；
   - 新鲜度分数；
   - 出肉率预估；
   - 坏果风险；
   - 适合食用时间；
   - 主要判断依据；
   - 风险提醒；
   - 一句话购买建议。

5. 开果后反馈
   - 用户可以上传开果后的照片；
   - 用户可以填写：
     - 实际口感；
     - 甜度；
     - 香味；
     - 肉质；
     - 是否翻车；
     - 用户满意度；
   - 后续用于数据积累。

---

### 2.2 暂不实现的功能

MVP 第一版不要做：

1. 用户登录；
2. 支付系统；
3. 自训练模型；
4. 商家系统；
5. 榴莲品种自动识别；
6. 榴莲重量自动识别；
7. 声音识别；
8. 视频分析；
9. 复杂推荐算法；
10. 复杂后台管理系统。

---

## 3. 推荐技术栈

### 3.1 前端

推荐：

- Next.js
- React
- TypeScript
- Tailwind CSS

如果要极简，也可以先用：

- HTML
- CSS
- Vanilla JavaScript

但建议 Cursor 第一版直接用 Next.js + TypeScript，因为后面容易扩展。

---

### 3.2 后端

推荐：

- Next.js API Routes / Route Handlers

或者：

- Node.js + Express
- Python FastAPI

MVP 推荐使用 Next.js 全栈结构：

```text
/app
  /page.tsx
  /api/analyze/route.ts
  /api/feedback/route.ts
/components
/lib
/types
```

这样前端和后端在同一个项目里，便于 Cursor 快速生成和迭代。

---

### 3.3 图片存储

MVP 第一版可以不做长期存储。

两种方案：

#### 方案 A：不存储图片

流程：

```text
用户上传图片
→ 前端压缩
→ 后端转为 base64 或临时文件
→ 调用 AI
→ 返回结果
→ 不保存图片
```

优点：

- 开发最快；
- 隐私风险低；
- 适合第一版 Demo。

缺点：

- 无法积累训练数据；
- 无法做开果前后对比。

#### 方案 B：存储图片

推荐使用：

- Cloudflare R2
- AWS S3
- Supabase Storage

MVP 可以先使用 Supabase，因为它同时支持数据库和存储。

---

### 3.4 数据库

推荐 Supabase PostgreSQL。

需要存储的数据：

1. 分析请求；
2. 用户填写的辅助信息；
3. AI 输出结果；
4. 用户开果后反馈；
5. 图片 URL，如果选择存储图片。

---

## 4. 数据结构设计

### 4.1 AnalysisRequest

```ts
type AnalysisRequest = {
  id: string;
  createdAt: string;

  images: DurianImage[];

  variety?: string;
  saleType?: "whole_by_weight" | "whole_by_piece" | "opened_box" | "frozen_pulp" | "unknown";
  price?: number;
  currency?: string;
  weightKg?: number;

  smell?: "none" | "light" | "obvious" | "strong" | "sour_or_alcoholic" | "unknown";
  tapSound?: "solid_dull" | "slightly_hollow" | "very_hollow" | "unknown";
  weightFeeling?: "heavier_than_looks" | "normal" | "lighter_than_looks" | "unknown";

  tastePreference?: "crisp_sweet" | "creamy_sweet" | "strong_aroma" | "very_ripe" | "not_sure";
};
```

---

### 4.2 DurianImage

```ts
type DurianImage = {
  id: string;
  url?: string;
  base64?: string;
  type:
    | "whole_front"
    | "whole_side"
    | "stem_closeup"
    | "bottom_seam"
    | "defect_closeup"
    | "reference_size"
    | "unknown";
};
```

---

### 4.3 AnalysisResult

```ts
type AnalysisResult = {
  recommendation: "buy" | "caution" | "avoid" | "insufficient_info";

  summary: string;

  scores: {
    ripeness: number;
    freshness: number;
    estimatedYield: number;
    defectRisk: number;
    preferenceMatch: number;
    overall: number;
  };

  labels: {
    ripenessStage: "unripe" | "almost_ready" | "ready" | "overripe_risk" | "unknown";
    freshnessLevel: "high" | "medium" | "low" | "unknown";
    yieldEstimate: "high" | "medium" | "low" | "unknown";
    defectRiskLevel: "low" | "medium" | "high" | "unknown";
    bestEatingTime: "now" | "half_day" | "one_day" | "avoid" | "unknown";
  };

  evidence: string[];

  risks: string[];

  missingPhotos: string[];

  directAdvice: string;

  confidence: "low" | "medium" | "high";
};
```

---

### 4.4 Feedback

```ts
type Feedback = {
  id: string;
  analysisId: string;
  createdAt: string;

  openedImages?: string[];

  actualYield?: "high" | "medium" | "low";
  sweetness?: number;
  aroma?: number;
  texture?: "crisp" | "creamy" | "watery" | "dry" | "fibrous" | "unknown";
  satisfaction?: number;
  wasBadFruit?: boolean;

  comment?: string;
};
```

---

## 5. AI 分析逻辑

### 5.1 图片输入要求

AI 至少需要 3 张图：

1. 整体照；
2. 果柄图；
3. 底部或壳缝图。

如果图片少于 3 张，返回：

```json
{
  "recommendation": "insufficient_info",
  "summary": "图片不足，建议补充整体照、果柄特写和底部壳缝照片。",
  "confidence": "low"
}
```

---

### 5.2 AI Prompt

后端调用多模态 AI 模型时使用以下系统提示词。

```text
你是一名经验丰富的榴莲挑选顾问，目标是根据图片和用户补充信息，帮助用户判断这颗榴莲是否值得购买。

你必须保持谨慎，不要假装能从图片中确定榴莲内部的甜度、香味和肉质。你只能根据外观特征和用户提供的信息进行概率判断。

请重点观察以下内容：

1. 整体果型：
   - 是否饱满；
   - 是否严重偏形；
   - 果房是否鼓起；
   - 是否可能出肉率较高。

2. 果柄：
   - 是否新鲜；
   - 是否干枯；
   - 切口是否明显发黑；
   - 是否有过度脱水迹象。

3. 壳面：
   - 是否有黑斑；
   - 是否有虫洞；
   - 是否有霉点；
   - 是否有撞伤；
   - 是否有异常裂口。

4. 底部和壳缝：
   - 是否有自然成熟造成的轻微张开；
   - 是否裂得过大；
   - 是否有坏果或过熟风险。

5. 成熟度：
   - 结合壳色、壳缝、果柄、用户描述的气味和敲击声，判断偏生、适熟、偏熟或过熟风险。

6. 用户偏好：
   - 如果用户喜欢脆甜，则不要推荐明显偏熟的榴莲；
   - 如果用户喜欢糯甜，则适熟和轻微偏熟可以接受；
   - 如果用户喜欢浓郁酒香，可以接受更高熟度，但要提醒过熟风险。

请严格输出 JSON，不要输出 Markdown，不要输出额外解释。

JSON 格式如下：

{
  "recommendation": "buy | caution | avoid | insufficient_info",
  "summary": "一句简洁总结",
  "scores": {
    "ripeness": 0,
    "freshness": 0,
    "estimatedYield": 0,
    "defectRisk": 0,
    "preferenceMatch": 0,
    "overall": 0
  },
  "labels": {
    "ripenessStage": "unripe | almost_ready | ready | overripe_risk | unknown",
    "freshnessLevel": "high | medium | low | unknown",
    "yieldEstimate": "high | medium | low | unknown",
    "defectRiskLevel": "low | medium | high | unknown",
    "bestEatingTime": "now | half_day | one_day | avoid | unknown"
  },
  "evidence": [
    "判断依据1",
    "判断依据2",
    "判断依据3"
  ],
  "risks": [
    "风险提醒1",
    "风险提醒2"
  ],
  "missingPhotos": [
    "缺失照片类型"
  ],
  "directAdvice": "非常直接的购买建议",
  "confidence": "low | medium | high"
}

评分规则：
- ripeness 越高代表越接近适合食用，不代表越熟越好；
- freshness 越高代表越新鲜；
- estimatedYield 越高代表预估出肉率越好；
- defectRisk 越高代表坏果风险越高；
- preferenceMatch 越高代表越符合用户偏好；
- overall 是综合购买价值评分。
```

---

### 5.3 规则层修正

AI 输出后，后端再做一次规则修正，不要完全相信模型。

建议规则：

```ts
function adjustRecommendation(result: AnalysisResult): AnalysisResult {
  const scores = result.scores;

  if (result.confidence === "low") {
    result.recommendation = "insufficient_info";
  }

  if (scores.defectRisk >= 75) {
    result.recommendation = "avoid";
  }

  if (scores.freshness <= 35) {
    result.recommendation = "avoid";
  }

  if (scores.ripeness <= 35 && result.recommendation === "buy") {
    result.recommendation = "caution";
  }

  if (scores.overall >= 75 && scores.defectRisk < 50 && result.confidence !== "low") {
    result.recommendation = "buy";
  }

  if (scores.overall >= 55 && scores.overall < 75) {
    result.recommendation = "caution";
  }

  if (scores.overall < 55) {
    result.recommendation = "avoid";
  }

  return result;
}
```

---

## 6. 后端 API 设计

### 6.1 POST /api/analyze

功能：接收图片和表单，返回 AI 分析结果。

#### Request

使用 `multipart/form-data`。

字段：

```text
images[]: File[]
imageTypes[]: string[]
variety: string
saleType: string
price: string
currency: string
weightKg: string
smell: string
tapSound: string
weightFeeling: string
tastePreference: string
```

#### Response

```json
{
  "success": true,
  "analysisId": "uuid",
  "result": {
    "recommendation": "caution",
    "summary": "这颗榴莲果型较饱满，但果柄偏干，建议谨慎购买。",
    "scores": {
      "ripeness": 72,
      "freshness": 58,
      "estimatedYield": 76,
      "defectRisk": 42,
      "preferenceMatch": 70,
      "overall": 67
    },
    "labels": {
      "ripenessStage": "ready",
      "freshnessLevel": "medium",
      "yieldEstimate": "high",
      "defectRiskLevel": "medium",
      "bestEatingTime": "now"
    },
    "evidence": [
      "整体果型较饱满，果房有一定鼓起。",
      "壳缝有轻微张开，显示接近成熟。",
      "果柄略干，新鲜度不是最佳。"
    ],
    "risks": [
      "仅凭图片无法确定内部甜度。",
      "底部照片不够清晰，无法完全排除局部坏果风险。"
    ],
    "missingPhotos": [],
    "directAdvice": "如果价格不高，可以买；如果是高价猫山王，建议再换一颗对比。",
    "confidence": "medium"
  }
}
```

---

### 6.2 POST /api/feedback

功能：保存开果后反馈。

#### Request

使用 `multipart/form-data`。

```text
analysisId: string
openedImages[]: File[]
actualYield: string
sweetness: number
aroma: number
texture: string
satisfaction: number
wasBadFruit: boolean
comment: string
```

#### Response

```json
{
  "success": true,
  "message": "反馈已保存"
}
```

---

## 7. 前端页面状态

前端需要至少有以下状态：

```ts
type PageState =
  | "idle"
  | "uploading"
  | "analyzing"
  | "result"
  | "error";
```

状态解释：

1. `idle`：用户尚未提交；
2. `uploading`：正在处理图片；
3. `analyzing`：正在调用 AI；
4. `result`：分析完成；
5. `error`：发生错误。

---

## 8. 错误处理

需要处理：

1. 用户没有上传图片；
2. 图片数量少于 3 张；
3. 图片太大；
4. 图片格式不支持；
5. AI 返回非 JSON；
6. API 超时；
7. 网络错误；
8. 用户重复点击提交；
9. 后端图片解析失败。

错误提示风格：

```text
图片不够：至少需要上传整体照、果柄照和底部/壳缝照。
图片太大：请上传小于 5MB 的图片。
分析失败：AI 暂时没有成功读取图片，请重新上传更清晰的照片。
```

---

## 9. MVP 目录结构建议

```text
durian-ai-mvp/
  app/
    page.tsx
    layout.tsx
    api/
      analyze/
        route.ts
      feedback/
        route.ts

  components/
    ImageUploader.tsx
    DurianForm.tsx
    AnalysisResultCard.tsx
    ScoreBar.tsx
    FeedbackForm.tsx
    LoadingState.tsx
    ErrorMessage.tsx

  lib/
    ai.ts
    image.ts
    validation.ts
    scoring.ts
    storage.ts
    db.ts

  types/
    durian.ts

  public/
    sample-durian.png

  .env.local
  package.json
  README.md
```

---

## 10. 环境变量

```env
AI_API_KEY=
AI_MODEL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=
```

MVP 第一版如果不接 Supabase，可以只需要：

```env
AI_API_KEY=
AI_MODEL=
```

---

## 11. Cursor 开发任务拆分

建议按以下顺序让 Cursor 开发：

### Step 1：搭建页面

让 Cursor 先完成：

1. 单页 Landing Page；
2. 图片上传组件；
3. 表单组件；
4. 静态结果卡片；
5. 移动端适配。

---

### Step 2：接入后端 API

完成：

1. `/api/analyze`；
2. 表单提交；
3. loading 状态；
4. error 状态；
5. mock result 返回。

---

### Step 3：接入 AI

完成：

1. 图片转 base64；
2. 拼接 prompt；
3. 调用多模态模型；
4. 解析 JSON；
5. 规则层修正。

---

### Step 4：反馈功能

完成：

1. 结果页下方添加“开果后反馈”；
2. 支持上传开果照片；
3. 保存用户评分；
4. 暂时可以存 localStorage 或简单数据库。

---

### Step 5：优化体验

完成：

1. 图片压缩；
2. 拖拽上传；
3. 拍照入口；
4. 分数动画；
5. 结果分享图；
6. 小红书风格分享文案。

---

## 12. Cursor 第一轮生成提示词

可以直接把下面这段给 Cursor：

```text
请根据本技术路线文档，创建一个 Next.js + TypeScript + Tailwind CSS 的 MVP 项目。

项目名称：AI 榴莲挑选助手。

请优先实现：
1. 单页网页；
2. 多图片上传；
3. 用户辅助信息表单；
4. 点击“开始分析”后调用 /api/analyze；
5. /api/analyze 第一版先返回 mock JSON；
6. 前端根据 JSON 渲染分析结果；
7. 页面需要移动端友好；
8. 代码结构清晰，组件拆分合理；
9. 所有类型定义放在 types/durian.ts；
10. 不要实现登录和支付。

请严格按照文档中的数据结构和 API 结构实现。
```

---

## 13. 重要产品限制

页面底部必须展示免责声明：

```text
本工具仅根据图片和用户描述进行辅助判断，不能保证榴莲内部甜度、香味、肉质和实际出肉率。购买决策请结合商家信誉、现场闻味、敲击、价格和个人偏好。
```

原因：

1. AI 无法仅凭照片准确判断内部果肉；
2. 避免用户过度信任；
3. 降低产品风险；
4. 让产品更可信。

---

## 14. 后续可扩展方向

1. 上传敲击声音；
2. 识别榴莲品种；
3. 识别商家报价是否合理；
4. 训练开果前后对比模型；
5. 生成小红书分享图；
6. 商家版榴莲质检；
7. 榴莲产地/品种数据库；
8. 榴莲批发采购辅助；
9. 电商直播选品助手；
10. AI 水果挑选工具集合。
