"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogPaycheckButton } from "@/components/log-paycheck-button";
import { ThemeToggle } from "@/components/theme-toggle";

const primaryLinks = [
  { href: "/", label: "Home" },
  { href: "/coach", label: "Coach" },
  { href: "/transactions", label: "Transactions" },
  { href: "/bills", label: "Bills" },
  { href: "/budget", label: "Budget" },
  { href: "/accounts", label: "Accounts" },
  { href: "/savings", label: "Savings" },
];

const moreLinks = [
  { href: "/paychecks", label: "Paychecks" },
  { href: "/settings", label: "Settings" },
];

type JobOption = {
  id: string;
  name: string;
  nextPayday: string;
};

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function NavLink({
  href,
  label,
  active,
  onClick,
}: {
  href: string;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`relative px-1 py-1 text-sm transition ${
        active
          ? "font-semibold text-white"
          : "text-white/75 hover:text-white"
      }`}
    >
      {label}
      {active ? (
        <span
          className="absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-white"
          aria-hidden
        />
      ) : null}
    </Link>
  );
}

export function AppShell({
  children,
  jobs = [],
}: {
  children: React.ReactNode;
  jobs?: JobOption[];
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const moreActive = moreLinks.some((l) => isActive(pathname, l.href));

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!moreRef.current?.contains(e.target as Node)) setMoreOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-nav">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-baseline gap-3">
            <Link
              href="/"
              className="display text-2xl tracking-tight text-white"
            >
              Splitbook
            </Link>
            <p className="hidden text-xs text-white/70 sm:block">
              Check-in notebook
            </p>
          </div>

          <nav className="hidden items-center gap-3 lg:gap-5 md:flex" aria-label="Primary">
            {primaryLinks.map((link) => (
              <NavLink
                key={link.href}
                href={link.href}
                label={link.label}
                active={isActive(pathname, link.href)}
              />
            ))}
            <div className="relative" ref={moreRef}>
              <button
                type="button"
                className={`relative px-1 py-1 text-sm transition ${
                  moreActive || moreOpen
                    ? "font-semibold text-white"
                    : "text-white/75 hover:text-white"
                }`}
                aria-expanded={moreOpen}
                onClick={() => setMoreOpen((v) => !v)}
              >
                More
                {(moreActive || moreOpen) && (
                  <span
                    className="absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-white"
                    aria-hidden
                  />
                )}
              </button>
              {moreOpen ? (
                <div className="absolute right-0 mt-2 min-w-[10rem] notebook-sheet py-1">
                  {moreLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMoreOpen(false)}
                      className={`block px-3 py-2 text-sm ${
                        isActive(pathname, link.href)
                          ? "bg-nav/10 font-medium text-brand"
                          : "text-ink hover:bg-bg-elevated"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                  <div className="border-t border-line">
                    <ThemeToggle />
                  </div>
                </div>
              ) : null}
            </div>
            <ThemeToggle variant="nav" />
          </nav>

          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle variant="nav" />
            <button
              type="button"
              className="rounded border border-white/30 px-3 py-1.5 text-sm text-white"
              onClick={() => setMobileOpen(true)}
            >
              Menu
            </button>
          </div>
        </div>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/30"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-[min(18rem,88vw)] flex-col border-l border-line bg-nav p-5 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <p className="display text-xl text-white">Splitbook</p>
              <button
                type="button"
                className="text-sm text-white/80"
                onClick={() => setMobileOpen(false)}
              >
                Close
              </button>
            </div>
            <nav className="mt-6 flex flex-col gap-1">
              {[...primaryLinks, ...moreLinks].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded px-3 py-2.5 text-sm ${
                    isActive(pathname, link.href)
                      ? "bg-white/15 font-semibold text-white"
                      : "text-white/80 hover:bg-bg-elevated/10"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto pt-4">
              <ThemeToggle variant="nav" />
            </div>
          </div>
        </div>
      ) : null}

      <main className="mx-auto max-w-6xl px-4 py-8 pb-28 sm:px-6 lg:px-8 lg:py-10 lg:pb-10">
        {children}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-nav md:hidden"
        aria-label="Mobile"
      >
        <div className="mx-auto grid max-w-lg grid-cols-4 px-2 py-2">
          <Link
            href="/"
            className={`flex flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-medium ${
              pathname === "/" ? "text-white" : "text-white/70"
            }`}
          >
            Home
          </Link>
          <Link
            href="/transactions"
            className={`flex flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-medium ${
              pathname.startsWith("/transactions")
                ? "text-white"
                : "text-white/70"
            }`}
          >
            Txns
          </Link>
          {jobs.length > 0 ? (
            <LogPaycheckButton jobs={jobs} label="Log" variant="nav" />
          ) : (
            <Link
              href="/paychecks"
              className="flex flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-medium text-white/70"
            >
              Jobs
            </Link>
          )}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-medium text-white/70"
          >
            More
          </button>
        </div>
      </nav>
    </div>
  );
}
