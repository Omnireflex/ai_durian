import type { AnalysisResult } from "@/types/durian";
import { ScoreBar } from "@/components/ScoreBar";

const recommendationStyle = {
  buy: { text: "建议购买", className: "bg-[#E8F5E9] text-[#3A9B5A]" },
  caution: { text: "谨慎购买", className: "bg-[#FFF4DE] text-[#F59E0B]" },
  avoid: { text: "不建议购买", className: "bg-[#FFE9E6] text-[#D94A38]" },
  insufficient_info: { text: "信息不足", className: "bg-[#F5F5F5] text-[#666666]" },
} as const;

type AnalysisResultCardProps = {
  result: AnalysisResult;
};

export function AnalysisResultCard({ result }: AnalysisResultCardProps) {
  const recommendation = recommendationStyle[result.recommendation];

  return (
    <section className="space-y-4 rounded-3xl border border-[#EFE8D7] bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold text-[#222222]">AI 购买建议</h2>

      <div className={`rounded-2xl px-4 py-3 text-lg font-bold ${recommendation.className}`}>
        {recommendation.text}
      </div>

      <p className="text-sm text-[#444444]">{result.summary}</p>

      <div className="rounded-2xl border border-[#EFE8D7] bg-[#FFFDF5] p-4">
        <p className="text-sm font-semibold text-[#222222]">
          综合购买价值：{result.scores.overall} / 100
        </p>
        <p className="mt-1 text-xs text-[#666666]">分数越高，代表在当前图片和信息下越值得购买。</p>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#F0EDE3]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#F8C537] to-[#2E5E3E]"
            style={{ width: `${Math.min(100, Math.max(0, result.scores.overall))}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ScoreBar label="成熟度" value={result.scores.ripeness} hint={result.labels.ripenessStage} />
        <ScoreBar label="新鲜度" value={result.scores.freshness} hint={result.labels.freshnessLevel} />
        <ScoreBar label="出肉率预估" value={result.scores.estimatedYield} hint={result.labels.yieldEstimate} />
        <ScoreBar
          label="坏果风险"
          value={result.scores.defectRisk}
          hint={`风险指数：${result.scores.defectRisk}/100（${result.labels.defectRiskLevel}）`}
          tone="danger"
        />
      </div>

      <div>
        <h3 className="text-base font-semibold text-[#222222]">AI 主要看到了这些</h3>
        <ul className="mt-2 space-y-1 text-sm text-[#444444]">
          {result.evidence.map((item) => (
            <li key={item}>- {item}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-[#F1CBC6] bg-[#FFF2EF] p-4">
        <h3 className="text-base font-semibold text-[#8A2D22]">需要注意</h3>
        <ul className="mt-2 space-y-1 text-sm text-[#8A2D22]">
          {result.risks.map((item) => (
            <li key={item}>- {item}</li>
          ))}
        </ul>
      </div>

      {result.missingPhotos.length > 0 ? (
        <div className="rounded-2xl border border-[#F8D7A1] bg-[#FFF8EB] p-4">
          <h3 className="text-base font-semibold text-[#8E6512]">想判断更准，可以补拍：</h3>
          <ul className="mt-2 space-y-1 text-sm text-[#8E6512]">
            {result.missingPhotos.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="rounded-2xl bg-[#F5F5F5] px-4 py-3 text-sm font-semibold text-[#222222]">
        {result.directAdvice}
      </p>
    </section>
  );
}
