"use client";

import { MAX_IMAGE_COUNT, MAX_IMAGE_SIZE_BYTES, SUPPORTED_IMAGE_MIME_TYPES } from "@/lib/validation";
import type { DurianImageType, UploadedImage } from "@/types/durian";

type ImageUploaderProps = {
  images: UploadedImage[];
  onChange: (nextImages: UploadedImage[]) => void;
  onError: (message: string) => void;
};

const imageTypeOptions: Array<{ label: string; value: DurianImageType }> = [
  { label: "整体照", value: "whole_front" },
  { label: "果柄", value: "stem_closeup" },
  { label: "底部壳缝", value: "bottom_seam" },
  { label: "瑕疵特写", value: "defect_closeup" },
  { label: "大小参照", value: "reference_size" },
  { label: "不确定", value: "unknown" },
];

const shotChecklist = [
  { label: "整体正面照", types: ["whole_front"] },
  { label: "整体侧面照", types: ["whole_side"] },
  { label: "果柄特写", types: ["stem_closeup"] },
  { label: "底部/壳缝照", types: ["bottom_seam"] },
  { label: "瑕疵黑点特写", types: ["defect_closeup"] },
  { label: "和手/瓶子对比大小", types: ["reference_size"] },
];

function validateFile(file: File): string | null {
  if (!SUPPORTED_IMAGE_MIME_TYPES.includes(file.type)) {
    return "图片格式不支持：请上传 JPG、PNG 或 WEBP。";
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return "图片太大：请上传小于 5MB 的图片。";
  }

  return null;
}

export function ImageUploader({ images, onChange, onError }: ImageUploaderProps) {
  const appendFiles = (incoming: File[]) => {
    if (images.length + incoming.length > MAX_IMAGE_COUNT) {
      onError(`最多可上传 ${MAX_IMAGE_COUNT} 张图片。`);
      return;
    }

    const next: UploadedImage[] = [...images];

    for (const file of incoming) {
      const validationError = validateFile(file);
      if (validationError) {
        onError(validationError);
        return;
      }

      next.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        type: "unknown",
      });
    }

    onChange(next);
  };

  const onFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) {
      appendFiles(files);
    }
    event.target.value = "";
  };

  const removeImage = (id: string) => {
    const target = images.find((image) => image.id === id);
    if (target) {
      URL.revokeObjectURL(target.previewUrl);
    }
    onChange(images.filter((image) => image.id !== id));
  };

  const updateImageType = (id: string, type: DurianImageType) => {
    onChange(images.map((image) => (image.id === id ? { ...image, type } : image)));
  };

  const onDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    appendFiles(Array.from(event.dataTransfer.files ?? []));
  };

  return (
    <section id="upload-section" className="space-y-4 rounded-3xl border border-[#EFE8D7] bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-[#222222]">第一步：上传榴莲照片</h2>
        <p className="mt-1 text-sm text-[#666666]">至少上传 3 张，越完整判断越准。建议单张 1MB 以下。</p>
      </div>

      <label
        onDrop={onDrop}
        onDragOver={(event) => event.preventDefault()}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#E7D7A9] bg-[#FFF9E8] p-6 text-center"
      >
        <p className="text-sm font-medium text-[#2E5E3E]">点击或拖拽上传榴莲照片</p>
        <p className="text-xs text-[#666666]">支持 JPG / PNG / WEBP</p>
        <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFileInput} />
      </label>

      <label className="inline-flex cursor-pointer items-center rounded-full border border-[#2E5E3E] px-4 py-2 text-xs font-semibold text-[#2E5E3E]">
        移动端拍照上传
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={onFileInput}
        />
      </label>

      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {images.map((image) => (
            <article key={image.id} className="space-y-2 rounded-2xl border border-[#EFE8D7] p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.previewUrl} alt="榴莲照片预览" className="h-32 w-full rounded-xl bg-[#F8F5EC] object-contain" />
              <select
                value={image.type}
                onChange={(event) => updateImageType(image.id, event.target.value as DurianImageType)}
                className="w-full rounded-lg border border-[#E5E5E5] px-2 py-2 text-xs"
              >
                {imageTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeImage(image.id)}
                className="w-full rounded-lg bg-[#F5F5F5] px-2 py-2 text-xs text-[#666666]"
              >
                删除图片
              </button>
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-xl bg-[#F5F5F5] px-3 py-3 text-sm text-[#666666]">先拍几张榴莲照片，AI 才能开始判断。</p>
      )}

      <div className="rounded-2xl border border-[#EFE8D7] bg-[#FFFDF5] p-4">
        <h3 className="text-sm font-semibold text-[#222222]">推荐拍摄清单</h3>
        <div className="mt-3 space-y-2">
          {shotChecklist.map((item) => {
            const uploaded = images.some((image) =>
              item.types.includes(image.type === "unknown" ? "unknown" : image.type),
            );
            return (
              <div key={item.label} className="flex items-center justify-between text-sm">
                <span className="text-[#222222]">{item.label}</span>
                <span className={uploaded ? "text-[#3A9B5A]" : "text-[#F59E0B]"}>
                  {uploaded ? "已上传" : "建议补充"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
