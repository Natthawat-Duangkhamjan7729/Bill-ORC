import { createClient } from "@/lib/supabase/server";
import MonthlyChart, { type MonthTotal } from "@/components/MonthlyChart";

export default async function SummaryPage() {
  const supabase = await createClient();

  // Last 12 months, including the current one.
  const start = new Date();
  start.setDate(1);
  start.setMonth(start.getMonth() - 11);
  const startIso = start.toISOString().slice(0, 10);

  const { data: receipts, error } = await supabase
    .from("receipts")
    .select("purchase_date, total_amount")
    .gte("purchase_date", startIso)
    .not("purchase_date", "is", null);

  // Build a bucket for each of the 12 months so gaps show as zero.
  const months: MonthTotal[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString("en", { month: "short" }),
      year: d.getFullYear(),
      total: 0,
      count: 0,
    });
  }
  for (const r of receipts ?? []) {
    if (!r.purchase_date || r.total_amount == null) continue;
    const key = r.purchase_date.slice(0, 7);
    const bucket = months.find((m) => m.key === key);
    if (bucket) {
      bucket.total += Number(r.total_amount);
      bucket.count += 1;
    }
  }

  const grandTotal = months.reduce((sum, m) => sum + m.total, 0);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">
        Monthly spending
      </h1>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          Could not load data: {error.message}
        </p>
      )}

      <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Last 12 months
        </p>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">
          {grandTotal.toFixed(2)}
        </p>
      </div>

      <MonthlyChart months={months} />
    </div>
  );
}
