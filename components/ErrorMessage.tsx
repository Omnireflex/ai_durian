type ErrorMessageProps = {
  message: string;
  onRetry?: () => void;
};

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="rounded-3xl border border-[#F1CBC6] bg-[#FFF2EF] p-5 text-sm text-[#8A2D22]">
      <p>{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-full border border-[#D94A38] px-4 py-2 text-xs font-semibold text-[#D94A38]"
        >
          重新分析
        </button>
      ) : null}
    </div>
  );
}
