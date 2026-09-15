import { CoachChat } from "@/components/coach-chat";
import {
  MonthPicker,
  resolveMonthKey,
} from "@/components/month-picker";
import { PageHeader } from "@/components/ui";
import { hasDatabase } from "@/db";
import { hasCoachAi } from "@/lib/coach";

export const dynamic = "force-dynamic";

export default async function CoachPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string }>;
}) {
  if (!hasDatabase()) {
    return (
      <PageHeader
        title="Coach"
        description="Add DATABASE_URL to continue."
      />
    );
  }

  const params = (await searchParams) || {};
  const monthKey = resolveMonthKey(params.month);

  return (
    <div>
      <PageHeader
        title="Coach"
        description="Chat about your income, bills, and spend — grounded in your numbers."
        action={<MonthPicker monthKey={monthKey} basePath="/coach" />}
      />
      <div className="mx-auto max-w-2xl">
        <CoachChat key={monthKey} monthKey={monthKey} aiEnabled={hasCoachAi()} />
      </div>
    </div>
  );
}
