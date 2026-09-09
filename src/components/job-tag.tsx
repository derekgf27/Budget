import { jobColor } from "@/lib/job-colors";

export function JobTag({
  id,
  name,
  colorKey,
  className = "",
}: {
  id: string;
  name: string;
  colorKey?: string | null;
  className?: string;
}) {
  const color = jobColor(id, colorKey);
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-sm ${className}`}
      title={name}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: color.dot }}
        aria-hidden
      />
      <span style={{ color: color.text }}>{name}</span>
    </span>
  );
}

export function JobDot({
  id,
  colorKey,
  className = "",
}: {
  id: string;
  colorKey?: string | null;
  className?: string;
}) {
  const color = jobColor(id, colorKey);
  return (
    <span
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${className}`}
      style={{ backgroundColor: color.dot }}
      aria-hidden
    />
  );
}
