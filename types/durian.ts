export type SaleType =
  | "whole_by_weight"
  | "whole_by_piece"
  | "opened_box"
  | "frozen_pulp"
  | "unknown";

export type SmellType =
  | "none"
  | "light"
  | "obvious"
  | "strong"
  | "sour_or_alcoholic"
  | "unknown";

export type TapSoundType =
  | "solid_dull"
  | "slightly_hollow"
  | "very_hollow"
  | "unknown";

export type WeightFeelingType =
  | "heavier_than_looks"
  | "normal"
  | "lighter_than_looks"
  | "unknown";

export type TastePreferenceType =
  | "crisp_sweet"
  | "creamy_sweet"
  | "strong_aroma"
  | "very_ripe"
  | "not_sure";

export type DurianImageType =
  | "whole_front"
  | "whole_side"
  | "stem_closeup"
  | "bottom_seam"
  | "defect_closeup"
  | "reference_size"
  | "unknown";

export type DurianImage = {
  id: string;
  url?: string;
  base64?: string;
  type: DurianImageType;
};

export type AnalysisRequest = {
  id: string;
  createdAt: string;
  images: DurianImage[];
  variety?: string;
  saleType?: SaleType;
  price?: number;
  currency?: string;
  weightKg?: number;
  smell?: SmellType;
  tapSound?: TapSoundType;
  weightFeeling?: WeightFeelingType;
  tastePreference?: TastePreferenceType;
};

export type RecommendationType =
  | "buy"
  | "caution"
  | "avoid"
  | "insufficient_info";

export type AnalysisResult = {
  recommendation: RecommendationType;
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

export type AnalyzeSuccessResponse = {
  success: true;
  analysisId: string;
  result: AnalysisResult;
};

export type ApiErrorResponse = {
  success: false;
  message: string;
};

export type PageState = "idle" | "uploading" | "analyzing" | "result" | "error";

export type FormValues = {
  variety: string;
  saleType: SaleType;
  price: string;
  currency: string;
  weightKg: string;
  smell: SmellType;
  tapSound: TapSoundType;
  weightFeeling: WeightFeelingType;
  tastePreference: TastePreferenceType;
};

export type UploadedImage = {
  id: string;
  file: File;
  previewUrl: string;
  type: DurianImageType;
};
