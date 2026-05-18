import type {
  AnalysisResult,
  DurianImageType,
  SmellType,
  TapSoundType,
  TastePreferenceType,
  WeightFeelingType,
} from "@/types/durian";

type AnalyzeWithAIInput = {
  images: Array<{ dataUrl: string; type: DurianImageType }>;
  requestId?: string;
  userInfo: {
    variety?: string;
    saleType?: string;
    price?: number;
    currency?: string;
    weightKg?: number;
    smell?: SmellType;
    tapSound?: TapSoundType;
    weightFeeling?: WeightFeelingType;
    tastePreference?: TastePreferenceType;
  };
};

type OpenAIChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

const AI_REQUEST_TIMEOUT_MS = 170_000;

const SYSTEM_PROMPT = `你是一名经验丰富的榴莲挑选顾问，目标是根据图片和用户补充信息，帮助用户判断这颗榴莲是否值得购买。

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
- overall 是综合购买价值评分。`;

function getEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function isDebugEnabled(): boolean {
  const value = getEnv("AI_DEBUG");
  return value === "1" || value === "true";
}

function logDebug(requestId: string, message: string, extra?: Record<string, unknown>): void {
  if (!isDebugEnabled()) return;
  if (extra) {
    console.log(`[analyze:${requestId}] ${message}`, extra);
    return;
  }
  console.log(`[analyze:${requestId}] ${message}`);
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || error.message.includes("AI_ANALYZE_TIMEOUT"));
}

function clampScore(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  const normalized = parsed >= 0 && parsed <= 1 ? parsed * 100 : parsed;
  return Math.max(0, Math.min(100, Math.round(normalized)));
}

function pickEnum<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return typeof value === "string" && options.includes(value as T) ? (value as T) : fallback;
}

function pickStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  throw new Error("AI 返回非 JSON");
}

function extractMessageText(content: string | Array<{ type?: string; text?: string }> | undefined): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => (item?.type === "text" && typeof item.text === "string" ? item.text : ""))
      .join("\n")
      .trim();
  }

  return "";
}

function normalizeAnalysisResult(input: unknown): AnalysisResult {
  const source = (input ?? {}) as Record<string, unknown>;
  const scores = (source.scores ?? {}) as Record<string, unknown>;
  const labels = (source.labels ?? {}) as Record<string, unknown>;

  return {
    recommendation: pickEnum(
      source.recommendation,
      ["buy", "caution", "avoid", "insufficient_info"] as const,
      "insufficient_info",
    ),
    summary:
      typeof source.summary === "string" && source.summary.trim()
        ? source.summary.trim()
        : "暂未形成稳定结论，建议补充更多清晰图片。",
    scores: {
      ripeness: clampScore(scores.ripeness),
      freshness: clampScore(scores.freshness),
      estimatedYield: clampScore(scores.estimatedYield),
      defectRisk: clampScore(scores.defectRisk),
      preferenceMatch: clampScore(scores.preferenceMatch),
      overall: clampScore(scores.overall),
    },
    labels: {
      ripenessStage: pickEnum(
        labels.ripenessStage,
        ["unripe", "almost_ready", "ready", "overripe_risk", "unknown"] as const,
        "unknown",
      ),
      freshnessLevel: pickEnum(labels.freshnessLevel, ["high", "medium", "low", "unknown"] as const, "unknown"),
      yieldEstimate: pickEnum(labels.yieldEstimate, ["high", "medium", "low", "unknown"] as const, "unknown"),
      defectRiskLevel: pickEnum(
        labels.defectRiskLevel,
        ["low", "medium", "high", "unknown"] as const,
        "unknown",
      ),
      bestEatingTime: pickEnum(
        labels.bestEatingTime,
        ["now", "half_day", "one_day", "avoid", "unknown"] as const,
        "unknown",
      ),
    },
    evidence: pickStringArray(source.evidence),
    risks: pickStringArray(source.risks),
    missingPhotos: pickStringArray(source.missingPhotos),
    directAdvice:
      typeof source.directAdvice === "string" && source.directAdvice.trim()
        ? source.directAdvice.trim()
        : "建议结合气味、敲击声和价格，再与同摊位其他果对比后决定。",
    confidence: pickEnum(source.confidence, ["low", "medium", "high"] as const, "low"),
  };
}

export async function analyzeDurianWithAI(input: AnalyzeWithAIInput): Promise<AnalysisResult> {
  const requestId = input.requestId ?? crypto.randomUUID();
  const apiKey = getEnv("AI_API_KEY");
  const model = getEnv("AI_MODEL") ?? "qwen3.5-omni-flash";
  const fallbackModel = getEnv("AI_FALLBACK_MODEL");
  const baseUrl = getEnv("AI_BASE_URL") ?? "https://api.openai.com/v1";

  if (!apiKey) {
    throw new Error("缺少 AI_API_KEY，请先在 .env.local 配置。");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);

  try {
    logDebug(requestId, "start ai analyze", {
      model,
      fallbackModel: fallbackModel ?? null,
      baseUrl,
      imageCount: input.images.length,
    });

    const userContext = {
      ...input.userInfo,
      imageCount: input.images.length,
      imageTypes: input.images.map((item) => item.type),
    };

    const defaultEndpoint = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
    const dashScopeEndpoint = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
    const messages = [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `用户补充信息（JSON）：${JSON.stringify(
              userContext,
            )}。请结合这些信息与图片进行分析。`,
          },
          ...input.images.map((image) => ({
            type: "image_url",
            image_url: { url: image.dataUrl },
          })),
        ],
      },
    ];

    const requestOnce = async (
      targetModel: string,
      withResponseFormat: boolean,
      endpoint: string,
    ) => {
      const body: Record<string, unknown> = {
        model: targetModel,
        temperature: 0.2,
        messages,
      };
      if (withResponseFormat) {
        body.response_format = { type: "json_object" };
      }

      logDebug(requestId, "call ai endpoint", {
        endpoint,
        model: targetModel,
        withResponseFormat,
      });

      let response: Response;
      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          signal: controller.signal,
          body: JSON.stringify(body),
        });
      } catch (error) {
        if (isAbortError(error)) {
          throw new Error("AI 分析超时：模型超过 170 秒仍未返回，请稍后重试或减少照片数量。");
        }
        throw error;
      }

      const payload = (await response.json()) as OpenAIChatResponse;
      logDebug(requestId, "ai endpoint returned", {
        status: response.status,
        ok: response.ok,
        error: payload.error?.message ?? null,
      });
      return { response, payload };
    };

    let targetModel = model;
    let endpoint = defaultEndpoint;
    let call;
    try {
      call = await requestOnce(targetModel, true, endpoint);
    } catch (error) {
      const causeCode =
        error && typeof error === "object" && "cause" in error
          ? (error as { cause?: { code?: string } }).cause?.code
          : undefined;
      const shouldRetryWithDashScope =
        baseUrl.includes(".maas.aliyuncs.com") && causeCode === "ERR_TLS_CERT_ALTNAME_INVALID";
      if (!shouldRetryWithDashScope) {
        throw error;
      }
      endpoint = dashScopeEndpoint;
      logDebug(requestId, "retry with dashscope endpoint because tls altname mismatch");
      call = await requestOnce(targetModel, true, endpoint);
    }

    if (!call.response.ok) {
      const message = call.payload.error?.message || "AI 接口调用失败";
      if (message.toLowerCase().includes("response_format")) {
        call = await requestOnce(targetModel, false, endpoint);
      } else if (fallbackModel && /model|not found|unsupported/i.test(message)) {
        targetModel = fallbackModel;
        call = await requestOnce(targetModel, true, endpoint);
        if (!call.response.ok) {
          const fallbackMessage = call.payload.error?.message || "AI 接口调用失败";
          if (fallbackMessage.toLowerCase().includes("response_format")) {
            call = await requestOnce(targetModel, false, endpoint);
          }
        }
      }
    }

    if (!call.response.ok) {
      throw new Error(call.payload.error?.message || "AI 接口调用失败");
    }

    const content = extractMessageText(call.payload.choices?.[0]?.message?.content);
    if (!content) {
      throw new Error("AI 返回内容为空");
    }

    logDebug(requestId, "ai raw content excerpt", {
      text: content.slice(0, 400),
    });

    const jsonText = extractJsonObject(content);
    const parsed = JSON.parse(jsonText);
    logDebug(requestId, "ai json parsed successfully");
    return normalizeAnalysisResult(parsed);
  } finally {
    clearTimeout(timeout);
  }
}
