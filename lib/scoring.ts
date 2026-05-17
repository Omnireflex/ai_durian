import type { AnalysisResult } from "@/types/durian";

export function adjustRecommendation(result: AnalysisResult): AnalysisResult {
  const adjusted = structuredClone(result);
  const scores = adjusted.scores;

  if (adjusted.confidence === "low") {
    adjusted.recommendation = "insufficient_info";
  }

  if (scores.defectRisk >= 75) {
    adjusted.recommendation = "avoid";
  }

  if (scores.freshness <= 35) {
    adjusted.recommendation = "avoid";
  }

  if (scores.ripeness <= 35 && adjusted.recommendation === "buy") {
    adjusted.recommendation = "caution";
  }

  if (scores.overall >= 75 && scores.defectRisk < 50 && adjusted.confidence !== "low") {
    adjusted.recommendation = "buy";
  }

  if (scores.overall >= 55 && scores.overall < 75) {
    adjusted.recommendation = "caution";
  }

  if (scores.overall < 55) {
    adjusted.recommendation = "avoid";
  }

  return adjusted;
}
