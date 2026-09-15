import { centsToDollars } from "@/lib/money";

export function Money({
  cents,
  className = "",
}: {
  cents: number;
  className?: string;
}) {
  const negative = cents < 0;
  return (
    <span className={`${negative ? "text-danger" : ""} ${className}`}>
      {centsToDollars(cents)}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-5">
      <div>
        <h1 className="display text-3xl text-brand md:text-4xl">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-xl text-sm text-ink-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`notebook-sheet p-5 ${className}`}>{children}</section>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "rounded-sm border border-line bg-paper px-3 py-2 text-ink outline-none focus:border-brand-soft";

export const buttonPrimaryClass =
  "rounded-sm bg-nav px-4 py-2 text-sm font-medium text-white hover:opacity-90";

export const buttonGhostClass =
  "rounded-sm border border-line px-3 py-2 text-sm text-ink-muted hover:bg-bg-elevated";

export const buttonDangerClass =
  "rounded-sm border border-danger/30 bg-danger px-3 py-2 text-sm font-medium text-white hover:bg-danger/90";
