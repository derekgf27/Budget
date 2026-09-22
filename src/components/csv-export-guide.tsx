/** Quick export link for Apple Card CSVs. */

export function CsvExportGuide({ className = "" }: { className?: string }) {
  return (
    <p className={`text-sm text-ink-muted ${className}`}>
      Export Apple Card:{" "}
      <a
        href="https://card.apple.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-brand-soft underline-offset-2 hover:underline"
      >
        card.apple.com
      </a>
    </p>
  );
}
