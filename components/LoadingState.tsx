type LoadingStateProps = {
  text?: string;
};

export function LoadingState({ text = "AI 正在观察果型、果柄、壳缝和瑕疵..." }: LoadingStateProps) {
  return (
    <div className="rounded-3xl border border-[#EFE8D7] bg-white p-6 text-center shadow-sm">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#F8C537] border-t-transparent" />
      <p className="mt-4 text-sm text-[#666666]">{text}</p>
    </div>
  );
}
