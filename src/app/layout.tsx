import type { Metadata } from "next";
import { Figtree, Fraunces } from "next/font/google";
import { themeBootScript } from "@/lib/theme";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${figtree.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-bg text-ink">
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        {children}
      </body>
    </html>
  );
}
