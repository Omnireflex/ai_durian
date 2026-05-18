export const SUPPORTED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_SIZE_BYTES = 650 * 1024;
export const MAX_IMAGE_COUNT = 6;
export const MIN_IMAGE_COUNT = 3;

export function validateImages(files: File[]): string | null {
  if (files.length === 0) {
    return "图片不够：至少需要上传整体照、果柄照和底部/壳缝照。";
  }

  if (files.length > MAX_IMAGE_COUNT) {
    return `最多可上传 ${MAX_IMAGE_COUNT} 张图片。`;
  }

  for (const file of files) {
    if (!SUPPORTED_IMAGE_MIME_TYPES.includes(file.type)) {
      return "图片格式不支持：请上传 JPG、PNG 或 WEBP。";
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return "图片太大：请上传小于 650KB 的图片。";
    }
  }

  return null;
}

export function parseNumber(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
