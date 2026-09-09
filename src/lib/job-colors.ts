/** Named accent colors for job dots / labels. */

export type JobColor = {
  key: string;
  label: string;
  dot: string;
  bg: string;
  text: string;
};

export const JOB_COLOR_OPTIONS: JobColor[] = [
  { key: "forest", label: "Forest", dot: "#0b3d34", bg: "#d9ebe6", text: "#0b3d34" },
  { key: "blue", label: "Blue", dot: "#2f6fed", bg: "#dce7fb", text: "#1a4bb8" },
  { key: "ochre", label: "Ochre", dot: "#9a6b16", bg: "#f3e6c8", text: "#6e4c0e" },
  { key: "teal", label: "Teal", dot: "#0f6a6a", bg: "#d4ebea", text: "#0c5252" },
  { key: "rose", label: "Rose", dot: "#8b3a4a", bg: "#f0dce1", text: "#6e2a38" },
  { key: "slate", label: "Slate", dot: "#4a5568", bg: "#e2e6ec", text: "#2d3748" },
];

const FALLBACK = JOB_COLOR_OPTIONS[0]!;

export function jobColor(
  id: string | null | undefined,
  colorKey?: string | null,
): JobColor {
  if (colorKey) {
    const chosen = JOB_COLOR_OPTIONS.find((c) => c.key === colorKey);
    if (chosen) return chosen;
  }

  if (!id) return FALLBACK;

  let hash = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const index = (hash >>> 0) % JOB_COLOR_OPTIONS.length;
  return JOB_COLOR_OPTIONS[index] ?? FALLBACK;
}

export function isJobColorKey(value: string): boolean {
  return JOB_COLOR_OPTIONS.some((c) => c.key === value);
}
