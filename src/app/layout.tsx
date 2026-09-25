import type { Metadata } from "next";
import { Figtree, Fraunces } from "next/font/google";
import { cookies } from "next/headers";
import { THEME_COOKIE, themeFromCookie } from "@/lib/theme";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Splitbook",
  description: "Dual-paycheck budgeting with a clear money split",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = themeFromCookie((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${figtree.variable} ${fraunces.variable} h-full antialiased${
        theme === "dark" ? " dark" : ""
      }`}
    >
      <body className="min-h-full bg-bg text-ink">{children}</body>
    </html>
  );
}
