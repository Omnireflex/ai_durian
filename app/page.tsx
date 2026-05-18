"use client";

import { useEffect, useMemo, useState } from "react";
import { AnalysisResultCard } from "@/components/AnalysisResultCard";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingState } from "@/components/LoadingState";
import {
  MAX_IMAGE_COUNT,
  MAX_IMAGE_SIZE_BYTES,
  MIN_IMAGE_COUNT,
  SUPPORTED_IMAGE_MIME_TYPES,
} from "@/lib/validation";
import type {
  AnalyzeSuccessResponse,
  ApiErrorResponse,
  FormValues,
  PageState,
  UploadedImage,
} from "@/types/durian";

const initialFormValues: FormValues = {
  variety: "",
  saleType: "unknown",
  price: "",
  currency: "CNY",
  weightKg: "",
  smell: "unknown",
  tapSound: "unknown",
  weightFeeling: "unknown",
  tastePreference: "not_sure",
};

type WizardStep = {
  key: keyof typeof STEP_IMAGE_TYPES;
  title: string;
  purpose: string;
  tips: string[];
  required: boolean;
};

const STEP_IMAGE_TYPES = {
  wholeFront: "whole_front",
  wholeSide: "whole_side",
  stemCloseup: "stem_closeup",
  bottomSeam: "bottom_seam",
  defectCloseup: "defect_closeup",
  referenceSize: "reference_size",
} as const;

const wizardSteps: WizardStep[] = [
  {
    key: "wholeFront",
    title: "第 1 步：正面整体照",
    purpose: "先看果型是否饱满、左右是否均匀。",
    tips: ["整颗榴莲都要入镜，不要切掉尖刺或底部。", "手机与榴莲保持平行，避免从上往下俯拍。"],
    required: true,
  },
  {
    key: "wholeSide",
    title: "第 2 步：侧面整体照",
    purpose: "换一个角度确认果房鼓不鼓、有没有明显塌陷。",
    tips: ["把榴莲转约 90 度再拍，别和第 1 张太像。", "重点保留完整轮廓，背景简单一点更好识别。"],
    required: true,
  },
  {
    key: "stemCloseup",
    title: "第 3 步：果柄特写",
    purpose: "判断新鲜度、脱水程度和采摘时间线索。",
    tips: ["让果柄和切口占画面中间，焦点落在果柄上。", "如果果柄发黑、干裂或发霉，要拍清楚。"],
    required: true,
  },
  {
    key: "bottomSeam",
    title: "第 4 步：底部和壳缝",
    purpose: "观察成熟度、开口风险，以及是否有异常裂缝。",
    tips: ["底部星口放在画面中心，壳缝纹理要清楚。", "有自然微开可以拍，明显爆口或渗液也要拍到。"],
    required: true,
  },
  {
    key: "defectCloseup",
    title: "第 5 步：瑕疵特写（可选）",
    purpose: "把可能影响购买的风险点单独放大。",
    tips: ["只在看到黑斑、虫洞、霉点、渗液或撞伤时补拍。", "靠近拍一张，不需要重复拍整颗。"],
    required: false,
  },
  {
    key: "referenceSize",
    title: "第 6 步：大小参照（可选）",
    purpose: "辅助判断体积、重量和性价比。",
    tips: ["用手、矿泉水瓶或价格牌做参照。", "参照物尽量贴近榴莲同一平面，减少大小误差。"],
    required: false,
  },
];

const COMMON_DURIAN_VARIETIES = ["金枕", "猫山王", "苏丹王", "黑刺", "干尧", "D24", "XO", "红虾", "青尼", "不确定"];
const MAX_SOURCE_IMAGE_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_COMPRESSED_IMAGE_EDGE = 1024;
const COMPRESSED_IMAGE_QUALITIES = [0.62, 0.52, 0.42];
const MAX_TOTAL_UPLOAD_BYTES = 3.2 * 1024 * 1024;
const ANALYZE_CLIENT_TIMEOUT_MS = 190_000;

function optionCardClass(selected: boolean): string {
  return selected
    ? "rounded-xl border border-[#F8C537] bg-[#FFF9E8] px-3 py-3 text-left text-sm text-[#2E5E3E]"
    : "rounded-xl border border-[#E5E5E5] bg-white px-3 py-3 text-left text-sm text-[#222222]";
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片读取失败：请换一张 JPG、PNG 或 WEBP 照片。"));
    };
    image.src = url;
  });
}

async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("图片格式不支持：请上传 JPG、PNG 或 WEBP。");
  }

  if (file.size > MAX_SOURCE_IMAGE_SIZE_BYTES) {
    throw new Error("图片太大：请先在相册里压缩后再上传。");
  }

  const image = await loadImageFromFile(file);
  const scale = Math.min(1, MAX_COMPRESSED_IMAGE_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("图片处理失败：当前浏览器不支持图片压缩。");
  }

  context.drawImage(image, 0, 0, width, height);

  let lastBlob: Blob | null = null;
  for (const quality of COMPRESSED_IMAGE_QUALITIES) {
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", quality);
    });
    if (!blob) {
      continue;
    }
    lastBlob = blob;
    if (blob.size <= MAX_IMAGE_SIZE_BYTES) {
      break;
    }
  }

  if (!lastBlob) {
    throw new Error("图片处理失败：请换一张照片再试。");
  }

  const name = file.name.replace(/\.[^.]+$/, "") || "durian-photo";
  return new File([lastBlob], `${name}.jpg`, { type: "image/jpeg" });
}

export default function Home() {
  const [showWizard, setShowWizard] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [stepImages, setStepImages] = useState<Record<string, UploadedImage | null>>({
    wholeFront: null,
    wholeSide: null,
    stemCloseup: null,
    bottomSeam: null,
    defectCloseup: null,
    referenceSize: null,
  });
  const [formValues, setFormValues] = useState<FormValues>(initialFormValues);
  const [isCustomVariety, setIsCustomVariety] = useState(false);
  const [pageState, setPageState] = useState<PageState>("idle");
  const [result, setResult] = useState<AnalyzeSuccessResponse["result"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      for (const image of Object.values(stepImages)) {
        if (image) {
          URL.revokeObjectURL(image.previewUrl);
        }
      }
    };
  }, [stepImages]);

  const inPhotoSteps = stepIndex < wizardSteps.length;
  const currentStep = inPhotoSteps ? wizardSteps[stepIndex] : null;
  const isLastStep = stepIndex === wizardSteps.length - 1;
  const allUploadedImages = useMemo(
    () => Object.values(stepImages).filter((image): image is UploadedImage => Boolean(image)),
    [stepImages],
  );
  const completedPhotoCount = allUploadedImages.length;
  const photoProgressPercent = Math.round((Math.min(stepIndex + 1, wizardSteps.length) / wizardSteps.length) * 100);

  const canContinueCurrentStep = useMemo(() => {
    if (!currentStep) {
      return true;
    }
    const currentImage = stepImages[currentStep.key];
    return !currentStep.required || Boolean(currentImage);
  }, [currentStep, stepImages]);

  const loadingText = useMemo(() => {
    if (pageState === "uploading") {
      return "正在处理图片...";
    }
    return "AI 正在看这颗榴莲，复杂模型可能需要 1-3 分钟...";
  }, [pageState]);

  const onUploadCurrentStep = async (file: File | null) => {
    if (!currentStep) return;
    if (!file) return;
    if (allUploadedImages.length >= MAX_IMAGE_COUNT && !stepImages[currentStep.key]) {
      setError(`最多可上传 ${MAX_IMAGE_COUNT} 张图片。`);
      setPageState("error");
      return;
    }

    try {
      setError(null);
      setPageState("uploading");
      const compressedFile = await compressImageForUpload(file);
      if (!SUPPORTED_IMAGE_MIME_TYPES.includes(compressedFile.type)) {
        throw new Error("图片格式不支持：请上传 JPG、PNG 或 WEBP。");
      }
      if (compressedFile.size > MAX_IMAGE_SIZE_BYTES) {
        throw new Error("图片太大：请换一张更小的照片。");
      }

      const old = stepImages[currentStep.key];
      if (old) {
        URL.revokeObjectURL(old.previewUrl);
      }

      setStepImages((prev) => ({
        ...prev,
        [currentStep.key]: {
          id: crypto.randomUUID(),
          file: compressedFile,
          previewUrl: URL.createObjectURL(compressedFile),
          type: STEP_IMAGE_TYPES[currentStep.key],
        },
      }));
      setPageState("idle");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "图片处理失败，请换一张照片再试。");
      setPageState("error");
    }
  };

  const runAnalyze = async () => {
    if (pageState === "uploading" || pageState === "analyzing") {
      return;
    }

    if (allUploadedImages.length < MIN_IMAGE_COUNT) {
      setError("图片不够：至少需要上传整体照、果柄照和底部/壳缝照。");
      setPageState("error");
      return;
    }

    try {
      setError(null);
      setPageState("uploading");
      const formData = new FormData();
      const totalImageBytes = allUploadedImages.reduce((total, image) => total + image.file.size, 0);
      if (totalImageBytes > MAX_TOTAL_UPLOAD_BYTES) {
        throw new Error("上传照片总大小仍然偏大，请减少可选照片或换更小的照片。");
      }
      for (const image of allUploadedImages) {
        formData.append("images[]", image.file);
        formData.append("imageTypes[]", image.type);
      }

      formData.append("variety", formValues.variety);
      formData.append("saleType", formValues.saleType);
      formData.append("price", formValues.price);
      formData.append("currency", formValues.currency);
      formData.append("weightKg", formValues.weightKg);
      formData.append("smell", formValues.smell);
      formData.append("tapSound", formValues.tapSound);
      formData.append("weightFeeling", formValues.weightFeeling);
      formData.append("tastePreference", formValues.tastePreference);

      setPageState("analyzing");
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), ANALYZE_CLIENT_TIMEOUT_MS);
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      window.clearTimeout(timeout);

      const contentType = response.headers.get("content-type") ?? "";
      const payload = contentType.includes("application/json")
        ? ((await response.json()) as AnalyzeSuccessResponse | ApiErrorResponse)
        : ({
            success: false,
            message:
              response.status === 413
                ? "上传图片总大小超过线上服务限制，请减少照片数量或换更小的照片。"
                : "服务器返回了非 JSON 错误，请稍后重试。",
          } satisfies ApiErrorResponse);
      if (!response.ok || !("success" in payload) || !payload.success) {
        throw new Error("message" in payload ? payload.message : "这次没有分析成功，请换几张更清晰的照片再试一次。");
      }

      setResult(payload.result);
      setPageState("result");
      setShowWizard(false);
    } catch (caught) {
      const message =
        caught instanceof Error && caught.name === "AbortError"
          ? "AI 分析超过 190 秒仍未返回，可能是模型排队或图片太多。请减少照片数量后重试。"
          : caught instanceof Error
            ? caught.message
            : "这次没有分析成功，请换几张更清晰的照片再试一次。";
      setError(message);
      setPageState("error");
    }
  };

  const resetToHome = () => {
    setResult(null);
    setShowWizard(false);
    setStepIndex(0);
    setStepImages({
      wholeFront: null,
      wholeSide: null,
      stemCloseup: null,
      bottomSeam: null,
      defectCloseup: null,
      referenceSize: null,
    });
    setIsCustomVariety(false);
    setError(null);
    setPageState("idle");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="mx-auto w-full max-w-[960px] space-y-6 px-4 pb-28 pt-6">
      <header className="flex items-center justify-between rounded-2xl border border-[#EFE8D7] bg-white px-4 py-3 shadow-sm">
        <p className="text-base font-bold text-[#2E5E3E]">报恩榴莲挑选器</p>
        <span className="rounded-full bg-[#FFF9E8] px-3 py-1 text-xs font-semibold text-[#8E6512]">移动端优先</span>
      </header>

      {!showWizard && !result ? (
        <>
          <section className="space-y-4 rounded-3xl border border-[#EFE8D7] bg-white p-5 shadow-sm">
            <h1 className="text-3xl font-bold leading-tight text-[#222222]">报恩榴莲挑选器——挑选你的超级榴莲</h1>
            <p className="text-sm text-[#666666]">
              上传正面、侧面、果柄和底部壳缝照片，再补充现场信息，AI 会给出购买建议、证据和风险提醒。
            </p>
            <button
              type="button"
              onClick={() => setShowWizard(true)}
              className="w-full rounded-full bg-[#F8C537] px-6 py-5 text-xl font-extrabold text-[#222222] shadow-sm"
            >
              开始挑选你的榴莲
            </button>
          </section>
        </>
      ) : null}

      {showWizard && !result ? (
        <>
          {inPhotoSteps && currentStep ? (
            <section className="overflow-hidden rounded-3xl border border-[#EFE8D7] bg-white shadow-sm">
              <div className="bg-[#2E5E3E] px-5 py-4 text-white">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">
                    拍照步骤 {stepIndex + 1} / {wizardSteps.length}
                  </p>
                  <p className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                    已上传 {completedPhotoCount} 张
                  </p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
                  <div className="h-full rounded-full bg-[#F8C537]" style={{ width: `${photoProgressPercent}%` }} />
                </div>
              </div>

              <div className="space-y-5 p-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-2xl font-bold leading-tight text-[#222222]">{currentStep.title}</h2>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                        currentStep.required ? "bg-[#FFF0D1] text-[#8E6512]" : "bg-[#EEF5F0] text-[#2E5E3E]"
                      }`}
                    >
                      {currentStep.required ? "必拍" : "可跳过"}
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-[#555555]">{currentStep.purpose}</p>
                </div>

                <div className="space-y-3 border-t border-[#EFE8D7] pt-4">
                  <p className="text-sm font-semibold text-[#222222]">拍法要点</p>
                  <ul className="space-y-3 text-sm leading-6 text-[#555555]">
                    {currentStep.tips.map((tip) => (
                      <li key={tip} className="flex gap-3">
                        <span className="mt-[7px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFF9E8] text-xs font-bold text-[#8E6512]">
                          ✓
                        </span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#E7D7A9] bg-[#FFF9E8] px-5 py-5 text-center transition hover:border-[#F8C537]">
                    <span className="text-base font-extrabold text-[#2E5E3E]">从手机相册/文件选择</span>
                    <span className="mt-1 text-xs text-[#8E6512]">不打开相机，选择已有照片</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => onUploadCurrentStep(event.target.files?.[0] ?? null)}
                    />
                  </label>

                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-[#E7D7A9] bg-white px-5 py-5 text-center transition hover:border-[#F8C537]">
                    <span className="text-base font-extrabold text-[#2E5E3E]">
                      {stepImages[currentStep.key] ? "重新拍照" : "现场拍照"}
                    </span>
                    <span className="mt-1 text-xs text-[#8E6512]">打开后置摄像头拍这一张</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(event) => onUploadCurrentStep(event.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>

                <p className="text-center text-xs text-[#777777]">支持 JPG / PNG / WEBP，单张小于 5MB</p>

                {stepImages[currentStep.key] ? (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-[#222222]">已上传预览</p>
                    <div className="overflow-hidden rounded-2xl border border-[#EFE8D7]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={stepImages[currentStep.key]!.previewUrl}
                        alt={`${currentStep.title} 已上传`}
                        className="h-64 w-full bg-[#F8F5EC] object-contain"
                      />
                    </div>
                  </div>
                ) : null}
              </div>

            </section>
          ) : null}

          {stepIndex >= wizardSteps.length ? (
            <section className="space-y-4 rounded-3xl border border-[#EFE8D7] bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold text-[#222222]">补充核心信息（建议填写）</h2>
              <p className="text-sm text-[#666666]">
                最核心的信息：品种、价格、重量、闻起来怎么样、敲起来什么声音、拿起来什么感觉。
              </p>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#222222]">品种</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {COMMON_DURIAN_VARIETIES.map((variety) => (
                    <button
                      key={variety}
                      type="button"
                      onClick={() => {
                        setIsCustomVariety(false);
                        setFormValues((prev) => ({ ...prev, variety: variety === "不确定" ? "" : variety }));
                      }}
                      className={optionCardClass(!isCustomVariety && (variety === "不确定" ? !formValues.variety : formValues.variety === variety))}
                    >
                      {variety}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomVariety(true);
                      setFormValues((prev) => ({ ...prev, variety: "" }));
                    }}
                    className={optionCardClass(isCustomVariety)}
                  >
                    其他
                  </button>
                </div>
                {isCustomVariety ? (
                  <input
                    value={formValues.variety}
                    onChange={(event) => setFormValues((prev) => ({ ...prev, variety: event.target.value }))}
                    placeholder="请输入品种名称"
                    className="w-full rounded-xl border border-[#E5E5E5] px-3 py-3 text-sm"
                  />
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#222222]">价格（元）</label>
                  <input
                    value={formValues.price}
                    onChange={(event) => setFormValues((prev) => ({ ...prev, price: event.target.value }))}
                    placeholder="例如：128"
                    inputMode="decimal"
                    className="w-full rounded-xl border border-[#E5E5E5] px-3 py-3 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#222222]">重量（kg）</label>
                  <input
                    value={formValues.weightKg}
                    onChange={(event) => setFormValues((prev) => ({ ...prev, weightKg: event.target.value }))}
                    placeholder="例如：2.5"
                    inputMode="decimal"
                    className="w-full rounded-xl border border-[#E5E5E5] px-3 py-3 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-[#222222]">闻起来怎么样？</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "none", label: "没什么味道" },
                    { value: "light", label: "淡淡榴莲香" },
                    { value: "obvious", label: "明显香味" },
                    { value: "strong", label: "很浓很冲" },
                    { value: "sour_or_alcoholic", label: "发酸/酒味明显" },
                    { value: "unknown", label: "不确定" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormValues((prev) => ({ ...prev, smell: option.value as FormValues["smell"] }))}
                      className={optionCardClass(formValues.smell === option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-[#222222]">敲起来是什么声音？</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "solid_dull", label: "实心闷响" },
                    { value: "slightly_hollow", label: "轻微空响" },
                    { value: "very_hollow", label: "很空很散" },
                    { value: "unknown", label: "不确定" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setFormValues((prev) => ({ ...prev, tapSound: option.value as FormValues["tapSound"] }))
                      }
                      className={optionCardClass(formValues.tapSound === option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-[#222222]">拿起来感觉怎么样？</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "heavier_than_looks", label: "比看起来重" },
                    { value: "normal", label: "差不多" },
                    { value: "lighter_than_looks", label: "比看起来轻" },
                    { value: "unknown", label: "不确定" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setFormValues((prev) => ({
                          ...prev,
                          weightFeeling: option.value as FormValues["weightFeeling"],
                        }))
                      }
                      className={optionCardClass(formValues.weightFeeling === option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

            </section>
          ) : null}
        </>
      ) : null}

      {pageState === "uploading" || pageState === "analyzing" ? <LoadingState text={loadingText} /> : null}
      {pageState === "error" && error ? <ErrorMessage message={error} onRetry={runAnalyze} /> : null}
      {result ? (
        <>
          <AnalysisResultCard result={result} />
          <button
            type="button"
            onClick={resetToHome}
            className="w-full rounded-full border border-[#E5E5E5] bg-white px-4 py-3 text-sm text-[#666666]"
          >
            重新开始挑选
          </button>
        </>
      ) : null}

      {showWizard && !result ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#EFE8D7] bg-white/95 p-3 backdrop-blur">
          <div className="mx-auto flex w-full max-w-[960px] gap-3 px-1">
            <button
              type="button"
              onClick={() =>
                setStepIndex((prev) => {
                  if (prev >= wizardSteps.length) return wizardSteps.length - 1;
                  return Math.max(0, prev - 1);
                })
              }
              disabled={stepIndex === 0}
              className="w-1/3 rounded-full border border-[#E5E5E5] px-4 py-3 text-sm text-[#666666] disabled:opacity-40"
            >
              上一步
            </button>
            {stepIndex < wizardSteps.length ? (
              !isLastStep ? (
                <button
                  type="button"
                  onClick={() => setStepIndex((prev) => Math.min(wizardSteps.length - 1, prev + 1))}
                  disabled={!canContinueCurrentStep}
                  className="w-2/3 rounded-full bg-[#F8C537] px-4 py-3 text-sm font-bold text-[#222222] disabled:opacity-40"
                >
                  下一步
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStepIndex(wizardSteps.length)}
                  disabled={!canContinueCurrentStep}
                  className="w-2/3 rounded-full bg-[#F8C537] px-4 py-3 text-sm font-bold text-[#222222] disabled:opacity-40"
                >
                  去补充核心信息
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={runAnalyze}
                disabled={pageState === "uploading" || pageState === "analyzing"}
                className="w-2/3 rounded-full bg-[#F8C537] px-4 py-3 text-sm font-bold text-[#222222] disabled:opacity-50"
              >
                {pageState === "uploading" || pageState === "analyzing" ? "AI 正在看这颗榴莲..." : "开始 AI 分析"}
              </button>
            )}
          </div>
        </div>
      ) : null}

      <footer className="rounded-2xl border border-[#EFE8D7] bg-white p-4 text-xs leading-6 text-[#666666]">
        免责声明：本工具仅根据图片和用户描述进行辅助判断，不能保证榴莲内部甜度、香味、肉质和实际出肉率。购买决策请结合商家信誉、现场闻味、敲击、价格和个人偏好。
      </footer>
    </main>
  );
}
