import type { AnalysisResult } from "@/types/durian";

type AdjustOptions = {
  missingCorePhotoCount?: number;
};

const OVERALL_WEIGHTS = {
  freshness: 0.25,
  inverseDefect: 0.25,
  estimatedYield: 0.2,
  ripeness: 0.18,
  preferenceMatch: 0.12,
} as const;

export function computeWeightedOverall(scores: AnalysisResult["scores"]): number {
  const inverseDefect = 100 - scores.defectRisk;
  const raw =
    scores.freshness * OVERALL_WEIGHTS.freshness +
    inverseDefect * OVERALL_WEIGHTS.inverseDefect +
    scores.estimatedYield * OVERALL_WEIGHTS.estimatedYield +
    scores.ripeness * OVERALL_WEIGHTS.ripeness +
    scores.preferenceMatch * OVERALL_WEIGHTS.preferenceMatch;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function looksLikePlaceholder(scores: AnalysisResult["scores"]): boolean {
  const values = [
    scores.ripeness,
    scores.freshness,
    scores.estimatedYield,
    scores.defectRisk,
    scores.preferenceMatch,
    scores.overall,
  ];
  const allZero = values.every((value) => value === 0);
  const allSame = new Set(values).size === 1 && values[0] !== 0;
  return allZero || allSame;
}

export function adjustRecommendation(
  result: AnalysisResult,
  options: AdjustOptions = {},
): AnalysisResult {
  const adjusted = structuredClone(result);
  const { scores, labels, confidence } = adjusted;
  const missing = Math.max(0, options.missingCorePhotoCount ?? 0);

  const computedOverall = computeWeightedOverall(scores);
  if (Math.abs(scores.overall - computedOverall) > 20 || scores.overall === 0) {
    scores.overall = computedOverall;
  }

  if (confidence === "low" || looksLikePlaceholder(scores)) {
    adjusted.recommendation = "insufficient_info";
    return adjusted;
  }

  if (missing >= 2) {
    adjusted.recommendation = "insufficient_info";
    return adjusted;
  }

  if (scores.defectRisk >= 70 || labels.defectRiskLevel === "high") {
    adjusted.recommendation = "avoid";
    return adjusted;
  }

  if (scores.freshness <= 35 || labels.freshnessLevel === "low") {
    adjusted.recommendation = "avoid";
    return adjusted;
  }

  if (labels.ripenessStage === "overripe_risk") {
    adjusted.recommendation =
      scores.freshness < 60 || scores.defectRisk > 45 ? "avoid" : "caution";
    return adjusted;
  }

  if (missing >= 1) {
    adjusted.recommendation = scores.overall < 50 ? "avoid" : "caution";
    return adjusted;
  }

  const allowBuy =
    scores.overall >= 72 &&
    scores.defectRisk < 45 &&
    scores.freshness >= 55 &&
    scores.ripeness >= 50 &&
    confidence !== "low";

  if (allowBuy) {
    adjusted.recommendation = "buy";
    return adjusted;
  }

  if (scores.overall >= 50) {
    adjusted.recommendation = "caution";
    return adjusted;
  }

  adjusted.recommendation = "avoid";
  return adjusted;
}
