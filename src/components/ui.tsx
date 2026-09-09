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
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="display text-3xl text-brand md:text-4xl">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-ink-muted">{description}</p>
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
    <section
      className={`rounded-xl border border-line bg-bg-elevated/90 p-5 shadow-[0_1px_0_rgba(18,36,28,0.04)] ${className}`}
    >
      {children}
    </section>
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
  "rounded-md border border-line bg-white px-3 py-2 text-ink outline-none focus:border-brand-soft";

export const buttonPrimaryClass =
  "rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-soft";

export const buttonGhostClass =
  "rounded-md border border-line px-3 py-2 text-sm text-ink-muted hover:bg-white";

export const buttonDangerClass =
  "rounded-md border border-danger/30 bg-danger px-3 py-2 text-sm font-medium text-white hover:bg-danger/90";
