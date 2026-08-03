import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type MonthRow = {
  key: string; // "2026-08"
  label: string; // "Aug 26"
  total: number;
  count: number;
};

function formatBaht(n: number): string {
  return `฿${n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function SummaryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: receipts, error } = await supabase
    .from("receipts")
    .select("purchase_date, total_amount")
    .not("purchase_date", "is", null)
    .not("total_amount", "is", null)
    .order("purchase_date");

  // Group receipts into months, keeping the most recent 12.
  const byMonth = new Map<string, MonthRow>();
  for (const receipt of receipts ?? []) {
    const key = receipt.purchase_date!.slice(0, 7);
    const row =
      byMonth.get(key) ??
      ({
        key,
        label: new Date(key + "-01T00:00:00").toLocaleDateString("en-GB", {
          month: "short",
          year: "2-digit",
        }),
        total: 0,
        count: 0,
      } satisfies MonthRow);
    row.total += Number(receipt.total_amount);
    row.count += 1;
    byMonth.set(key, row);
  }
  const months = Array.from(byMonth.values()).slice(-12);

  const maxTotal = Math.max(...months.map((m) => m.total), 0);
  const latest = months[months.length - 1];
  const maxMonth = months.reduce(
    (best, m) => (m.total > (best?.total ?? -1) ? m : best),
    undefined as MonthRow | undefined
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-5 p-6">
      <header className="flex items-center justify-between">
        <Link href="/dashboard" className="text-sm text-teal-700 hover:underline">
          ← Back to dashboard
        </Link>
      </header>

      <h1 className="text-2xl font-bold tracking-tight">Monthly spending</h1>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Could not load data: {error.message}
        </p>
      )}

      {months.length === 0 && !error && (
        <p className="rounded-xl border border-dashed border-gray-300 px-4 py-10 text-center text-gray-400">
          No dated receipts yet — totals appear here once you save receipts
          with a purchase date.
        </p>
      )}

      {latest && (
        <div className="rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">
            {latest.label} — {latest.count} receipt{latest.count === 1 ? "" : "s"}
          </p>
          <p className="text-3xl font-bold tracking-tight text-gray-900">
            {formatBaht(latest.total)}
          </p>
        </div>
      )}

      {months.length > 0 && (
        <figure className="rounded-xl border border-gray-200 p-4">
          <figcaption className="mb-4 text-sm font-medium text-gray-700">
            Total spent per month
          </figcaption>
          <div
            className="flex items-end gap-1 border-b border-gray-300"
            style={{ height: "10rem" }}
            role="img"
            aria-label={`Bar chart of monthly spending across ${months.length} months`}
          >
            {months.map((month) => {
              const isLabeled =
                month.key === latest?.key || month.key === maxMonth?.key;
              return (
                <div
                  key={month.key}
                  className="group relative flex h-full flex-1 flex-col items-center justify-end"
                  title={`${month.label}: ${formatBaht(month.total)} (${month.count} receipt${month.count === 1 ? "" : "s"})`}
                >
                  {isLabeled && (
                    <span className="mb-1 text-[10px] font-medium text-gray-700">
                      {Math.round(month.total).toLocaleString("th-TH")}
                    </span>
                  )}
                  <div
                    className="w-full max-w-10 rounded-t bg-teal-600 transition group-hover:bg-teal-700"
                    style={{
                      height: `${maxTotal > 0 ? Math.max((month.total / maxTotal) * 100, 2) : 2}%`,
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-1 flex gap-1">
            {months.map((month) => (
              <span
                key={month.key}
                className="flex-1 text-center text-[10px] text-gray-500"
              >
                {month.label}
              </span>
            ))}
          </div>
        </figure>
      )}

      {months.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
                <th className="px-4 py-2 font-medium">Month</th>
                <th className="px-2 py-2 text-right font-medium">Receipts</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {[...months].reverse().map((month) => (
                <tr key={month.key} className="border-b border-gray-100">
                  <td className="px-4 py-2">{month.label}</td>
                  <td className="px-2 py-2 text-right">{month.count}</td>
                  <td className="px-4 py-2 text-right font-medium">
                    {formatBaht(month.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
