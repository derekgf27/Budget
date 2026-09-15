"use client";

import { useEffect, useState } from "react";
import { THEME_STORAGE_KEY } from "@/lib/theme";

export type ThemeMode = "light" | "dark";

export function applyTheme(mode: ThemeMode) {
  document.documentElement.classList.toggle("dark", mode === "dark");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function ThemeToggle({
  variant = "menu",
}: {
  variant?: "menu" | "nav" | "plain";
}) {
  const [mode, setMode] = useState<ThemeMode>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setMode(
      document.documentElement.classList.contains("dark") ? "dark" : "light",
    );
    setReady(true);
  }, []);

  function toggle() {
    const next: ThemeMode = mode === "dark" ? "light" : "dark";
    setMode(next);
    applyTheme(next);
  }

  const label = !ready
    ? "Theme"
    : mode === "dark"
      ? "Light mode"
      : "Dark mode";

  if (variant === "nav") {
    return (
      <button
        type="button"
        onClick={toggle}
        className="rounded border border-white/30 px-2.5 py-1.5 text-xs text-white/90 hover:bg-white/10"
        aria-label={label}
        title={label}
      >
        {mode === "dark" ? "Light" : "Dark"}
      </button>
    );
  }

  if (variant === "plain") {
    return (
      <button
        type="button"
        onClick={toggle}
        className="rounded-sm border border-line px-3 py-2 text-sm text-ink hover:bg-bg-elevated"
      >
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-bg-elevated"
    >
      {label}
    </button>
  );
}
