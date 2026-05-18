import { NextResponse } from "next/server";
import { analyzeDurianWithAI } from "@/lib/ai";
import { adjustRecommendation } from "@/lib/scoring";
import { MAX_IMAGE_COUNT, MIN_IMAGE_COUNT, validateImages } from "@/lib/validation";
import type {
  AnalyzeSuccessResponse,
  AnalysisResult,
  ApiErrorResponse,
  DurianImageType,
  SmellType,
  TapSoundType,
  TastePreferenceType,
  WeightFeelingType,
} from "@/types/durian";

export const maxDuration = 180;

function toStringValue(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function publicErrorMessage(error: unknown, debug: boolean): string {
  const fallback = "分析失败：AI 暂时没有成功读取图片，请重新上传更清晰的照片。";
  if (!(error instanceof Error)) return fallback;
  if (error.message.includes("超时") || error.name === "AbortError") {
    return "AI 分析超时：模型响应太慢，请减少照片数量或稍后重试。";
  }
  return debug ? error.message : fallback;
}

function deriveMissingPhotos(imageTypes: DurianImageType[]): string[] {
  const required: Record<string, DurianImageType[]> = {
    "整体照": ["whole_front", "whole_side"],
    "果柄特写": ["stem_closeup"],
    "底部/壳缝照片": ["bottom_seam"],
  };

  return Object.entries(required)
    .filter(([, candidates]) => !candidates.some((candidate) => imageTypes.includes(candidate)))
    .map(([label]) => label);
}

async function fileToDataUrl(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "image/jpeg";
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

function createInsufficientResult(missingPhotos: string[]): AnalysisResult {
  return {
    recommendation: "insufficient_info",
    summary: "图片不足，建议补充整体照、果柄特写和底部壳缝照片。",
    scores: {
      ripeness: 0,
      freshness: 0,
      estimatedYield: 0,
      defectRisk: 0,
      preferenceMatch: 0,
      overall: 0,
    },
    labels: {
      ripenessStage: "unknown",
      freshnessLevel: "unknown",
      yieldEstimate: "unknown",
      defectRiskLevel: "unknown",
      bestEatingTime: "unknown",
    },
    evidence: ["当前图片数量和角度不足，无法形成稳定判断。"],
    risks: ["缺少关键角度图片，仅能给出低置信度结论。"],
    missingPhotos,
    directAdvice: "先补拍后再分析，避免因为信息不足导致误判。",
    confidence: "low",
  };
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const debug = process.env.AI_DEBUG === "1" || process.env.AI_DEBUG === "true";

  try {
    if (debug) {
      console.log(`[analyze:${requestId}] request received`);
    }

    const formData = await request.formData();
    const images = formData.getAll("images[]").filter((entry): entry is File => entry instanceof File);
    const imageTypes = formData
      .getAll("imageTypes[]")
      .map((entry) => (typeof entry === "string" ? entry : "unknown")) as DurianImageType[];

    if (images.length > MAX_IMAGE_COUNT) {
      return NextResponse.json<ApiErrorResponse>(
        { success: false, message: `最多可上传 ${MAX_IMAGE_COUNT} 张图片。` },
        { status: 400 },
      );
    }

    const imageError = validateImages(images);
    if (imageError) {
      return NextResponse.json<ApiErrorResponse>(
        { success: false, message: imageError },
        { status: 400 },
      );
    }

    const missingPhotos = deriveMissingPhotos(imageTypes);
    if (debug) {
      console.log(`[analyze:${requestId}] input parsed`, {
        imageCount: images.length,
        imageTypes,
        missingPhotos,
      });
    }

    const userInfo = {
      variety: toStringValue(formData.get("variety")),
      saleType: toStringValue(formData.get("saleType")),
      price: Number(toStringValue(formData.get("price"))),
      currency: toStringValue(formData.get("currency")) ?? "CNY",
      weightKg: Number(toStringValue(formData.get("weightKg"))),
      smell: toStringValue(formData.get("smell")) as SmellType | undefined,
      tapSound: toStringValue(formData.get("tapSound")) as TapSoundType | undefined,
      weightFeeling: toStringValue(formData.get("weightFeeling")) as WeightFeelingType | undefined,
      tastePreference: toStringValue(formData.get("tastePreference")) as TastePreferenceType | undefined,
    };

    const aiImages = await Promise.all(
      images.map(async (file, index) => ({
        dataUrl: await fileToDataUrl(file),
        type: imageTypes[index] ?? "unknown",
      })),
    );

    const result: AnalysisResult =
      images.length < MIN_IMAGE_COUNT
        ? createInsufficientResult(missingPhotos)
        : await analyzeDurianWithAI({
            requestId,
            images: aiImages,
            userInfo: {
              ...userInfo,
              price: Number.isFinite(userInfo.price) ? userInfo.price : undefined,
              weightKg: Number.isFinite(userInfo.weightKg) ? userInfo.weightKg : undefined,
            },
          });

    const analysisId = crypto.randomUUID();
    const adjustedResult = adjustRecommendation(result, {
      missingCorePhotoCount: missingPhotos.length,
    });
    const finalResult = {
      ...adjustedResult,
      missingPhotos:
        images.length < MIN_IMAGE_COUNT
          ? missingPhotos
          : Array.from(new Set([...adjustedResult.missingPhotos, ...missingPhotos])),
    };

    const response: AnalyzeSuccessResponse = {
      success: true,
      analysisId,
      result: finalResult,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(`[analyze:${requestId}] failed`, error);
    return NextResponse.json<ApiErrorResponse>(
      {
        success: false,
        message: publicErrorMessage(error, debug),
      },
      { status: 500 },
    );
  }
}
