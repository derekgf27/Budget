/** Intense accent colors for budget categories. */

export type CategoryColor = {
  key: string;
  label: string;
  dot: string;
  bg: string;
  text: string;
  underline: string;
};

export const CATEGORY_COLOR_OPTIONS: CategoryColor[] = [
  { key: "leaf", label: "Green", dot: "#0d8f4a", bg: "#c6f0d8", text: "#065c2e", underline: "#0d8f4a" },
  { key: "sky", label: "Blue", dot: "#1a6fd4", bg: "#cfe3ff", text: "#0c4a94", underline: "#1a6fd4" },
  { key: "amber", label: "Amber", dot: "#d4890a", bg: "#ffe4a8", text: "#8a5600", underline: "#d4890a" },
  { key: "coral", label: "Coral", dot: "#e0452f", bg: "#ffd2c8", text: "#9a2414", underline: "#e0452f" },
  { key: "plum", label: "Violet", dot: "#8b3dcf", bg: "#e8d4ff", text: "#5a1f8f", underline: "#8b3dcf" },
  { key: "ink", label: "Forest", dot: "#1a5c40", bg: "#c5e6d4", text: "#0d3322", underline: "#1a5c40" },
  { key: "clay", label: "Rust", dot: "#c45a1a", bg: "#ffd8bc", text: "#7a3208", underline: "#c45a1a" },
  { key: "sea", label: "Teal", dot: "#0b9a9a", bg: "#c5f0f0", text: "#066060", underline: "#0b9a9a" },
  { key: "rose", label: "Rose", dot: "#d42a6b", bg: "#ffd0e0", text: "#8f1145", underline: "#d42a6b" },
  { key: "lime", label: "Lime", dot: "#6aad00", bg: "#e0f5a8", text: "#3d6600", underline: "#6aad00" },
];

const UNCATEGORIZED: CategoryColor = {
  key: "pending",
  label: "Pending",
  dot: "#1a6fd4",
  bg: "#cfe3ff",
  text: "#0c4a94",
  underline: "#1a6fd4",
};

/** Prefer recognizable hues for common category names. */
const NAME_HINTS: Record<string, string> = {
  food: "leaf",
  beverage: "leaf",
  groceries: "leaf",
  gas: "amber",
  fuel: "amber",
  transport: "amber",
  entertainment: "plum",
  fun: "plum",
  misc: "ink",
  miscellaneous: "ink",
  shopping: "coral",
  health: "sea",
  medical: "sea",
  travel: "sky",
  home: "clay",
  utilities: "clay",
};

function hashIndex(value: string, mod: number) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % mod;
}

export function isCategoryColorKey(value: string): boolean {
  return CATEGORY_COLOR_OPTIONS.some((c) => c.key === value);
}

export function categoryColor(
  id: string | null | undefined,
  name?: string | null,
  colorKey?: string | null,
): CategoryColor {
  if (!id) return UNCATEGORIZED;

  if (colorKey) {
    const chosen = CATEGORY_COLOR_OPTIONS.find((c) => c.key === colorKey);
    if (chosen) return chosen;
  }

  const lower = (name || "").toLowerCase();
  for (const [hint, key] of Object.entries(NAME_HINTS)) {
    if (lower.includes(hint)) {
      const found = CATEGORY_COLOR_OPTIONS.find((c) => c.key === key);
      if (found) return found;
    }
  }

  const index = hashIndex(id, CATEGORY_COLOR_OPTIONS.length);
  return CATEGORY_COLOR_OPTIONS[index] ?? CATEGORY_COLOR_OPTIONS[0]!;
}
