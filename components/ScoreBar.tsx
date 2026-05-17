type ScoreBarProps = {
  label: string;
  value: number;
  hint: string;
  tone?: "normal" | "danger";
};

export function ScoreBar({ label, value, hint, tone = "normal" }: ScoreBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const barClass =
    tone === "danger" ? "bg-red-400" : "bg-gradient-to-r from-[#F8C537] to-[#3A9B5A]";

  return (
    <div className="rounded-2xl border border-[#EFE8D7] bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#222222]">{label}</p>
        <p className="text-sm font-bold text-[#2E5E3E]">{clamped}/100</p>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[#F5F5F5]">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${clamped}%` }} />
      </div>
      <p className="mt-2 text-xs text-[#666666]">{hint}</p>
    </div>
  );
}
