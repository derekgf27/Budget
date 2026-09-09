import { AppShell } from "@/components/app-shell";
import { getDb, hasDatabase } from "@/db";
import { incomeSources } from "@/db/schema";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let jobs: { id: string; name: string; nextPayday: string }[] = [];
  if (hasDatabase()) {
    try {
      const rows = await getDb().select().from(incomeSources);
      jobs = rows.map((r) => ({
        id: r.id,
        name: r.name,
        nextPayday: r.nextPayday,
      }));
    } catch {
      jobs = [];
    }
  }

  return <AppShell jobs={jobs}>{children}</AppShell>;
}
