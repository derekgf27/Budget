export const THEME_STORAGE_KEY = "splitbook:theme";
export const THEME_COOKIE = "splitbook-theme";

export type ThemeMode = "light" | "dark";

export function themeFromCookie(value: string | undefined): ThemeMode {
  return value === "dark" ? "dark" : "light";
}

export function persistTheme(mode: ThemeMode) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
  document.cookie = `${THEME_COOKIE}=${mode}; path=/; max-age=31536000; samesite=lax`;
}
