"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogPaycheckButton } from "@/components/log-paycheck-button";

const moneyLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/bills", label: "Bills" },
  { href: "/transactions", label: "Transactions" },
];

const setupLinks = [
  { href: "/paychecks", label: "Paychecks" },
  { href: "/budget", label: "Budget" },
  { href: "/savings", label: "Savings" },
  { href: "/accounts", label: "Accounts" },
];

type JobOption = {
  id: string;
  name: string;
  nextPayday: string;
};

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
      className={`rounded-md px-3 py-2 text-sm transition ${
        active
          ? "bg-white/15 text-white"
          : "text-white/75 hover:bg-white/10 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppShell({
  children,
  jobs = [],
}: {
  children: React.ReactNode;
  jobs?: JobOption[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  async function lock() {
    await fetch("/api/unlock", { method: "DELETE" });
    window.location.href = "/unlock";
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside
        className={`border-r border-line bg-brand text-bg-elevated ${
          open ? "fixed inset-0 z-40 block lg:static" : "hidden"
        } lg:block`}
      >
        <div className="flex h-full flex-col px-5 py-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Link
                href="/"
                className="display text-2xl tracking-tight text-white"
                onClick={() => setOpen(false)}
              >
                Splitbook
              </Link>
              <p className="mt-1 text-sm text-white/70">
                Two paychecks. One clear split.
              </p>
            </div>
            <button
              type="button"
              className="rounded-md border border-white/20 px-2 py-1 text-sm text-white/80 lg:hidden"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>

          <nav className="mt-8 flex flex-1 flex-col gap-6">
            <div className="flex flex-col gap-1">
              <p className="px-3 text-[11px] uppercase tracking-[0.14em] text-white/45">
                Money
              </p>
              {moneyLinks.map((link) => (
                <NavLink
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  active={isActive(pathname, link.href)}
                  onClick={() => setOpen(false)}
                />
              ))}
            </div>
            <div className="flex flex-col gap-1">
              <p className="px-3 text-[11px] uppercase tracking-[0.14em] text-white/45">
                Setup
              </p>
              {setupLinks.map((link) => (
                <NavLink
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  active={isActive(pathname, link.href)}
                  onClick={() => setOpen(false)}
                />
              ))}
            </div>
          </nav>

          <button
            type="button"
            onClick={lock}
            className="mt-4 rounded-md border border-white/20 px-3 py-2 text-left text-sm text-white/80 hover:bg-white/10"
          >
            Lock app
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b border-line bg-bg-elevated/80 px-4 py-3 backdrop-blur lg:hidden">
          <span className="display text-lg text-brand">Splitbook</span>
          <button
            type="button"
            className="rounded-md border border-line px-3 py-1.5 text-sm"
            onClick={() => setOpen(true)}
          >
            Menu
          </button>
        </header>

        <main className="flex-1 px-4 py-6 pb-24 sm:px-8 lg:px-10 lg:py-8 lg:pb-8">
          {children}
        </main>

        <nav
          className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg-elevated/95 backdrop-blur lg:hidden"
          aria-label="Mobile"
        >
          <div className="mx-auto grid max-w-lg grid-cols-4 px-2 py-2">
            <Link
              href="/"
              className={`flex flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-medium ${
                pathname === "/" ? "text-brand" : "text-ink-muted"
              }`}
            >
              <span aria-hidden>⌂</span>
              Dashboard
            </Link>
            <Link
              href="/bills"
              className={`flex flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-medium ${
                pathname.startsWith("/bills") ? "text-brand" : "text-ink-muted"
              }`}
            >
              <span aria-hidden>$</span>
              Bills
            </Link>
            {jobs.length > 0 ? (
              <LogPaycheckButton jobs={jobs} label="Log" variant="nav" />
            ) : (
              <Link
                href="/paychecks"
                className="flex flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-medium text-ink-muted"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-sm text-white">
                  +
                </span>
                Jobs
              </Link>
            )}
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-medium text-ink-muted"
            >
              <span aria-hidden>☰</span>
              More
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
