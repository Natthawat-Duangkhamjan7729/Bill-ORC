import { reportError } from "@/lib/errors";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/app-shell";
import { Card, StatCard, RankedBars } from "@/components/charts";
import {
  VIZ,
  formatBaht,
  formatBahtShort,
  formatBahtWhole,
  monthLabelTh,
} from "@/lib/viz";

export const dynamic = "force-dynamic";

type MonthRow = {
  key: string;
  label: string;
  total: number;
  count: number;
};

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
    .select("purchase_date, store_name, category, total_amount")
    .not("total_amount", "is", null)
    .order("purchase_date");

  // Group receipts into months, keeping the most recent 12.
  const byMonth = new Map<string, MonthRow>();
  for (const receipt of receipts ?? []) {
    if (!receipt.purchase_date) continue;
    const key = receipt.purchase_date.slice(0, 7);
    const row =
      byMonth.get(key) ??
      ({ key, label: monthLabelTh(key), total: 0, count: 0 } satisfies MonthRow);
    row.total += Number(receipt.total_amount);
    row.count += 1;
    byMonth.set(key, row);
  }
  const months = Array.from(byMonth.values()).slice(-12);

  // Group by store: top 5 by total spent, the rest folded into "อื่น ๆ".
  const byStore = new Map<string, { total: number; count: number }>();
  for (const receipt of receipts ?? []) {
    const name = receipt.store_name?.trim() || "ไม่ระบุร้าน";
    const row = byStore.get(name) ?? { total: 0, count: 0 };
    row.total += Number(receipt.total_amount);
    row.count += 1;
    byStore.set(name, row);
  }
  const rankedStores = Array.from(byStore.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.total - a.total);
  const topStores = rankedStores.slice(0, 5);
  const otherStores = rankedStores.slice(5);
  if (otherStores.length > 0) {
    topStores.push({
      name: `อื่น ๆ (${otherStores.length} ร้าน)`,
      total: otherStores.reduce((sum, s) => sum + s.total, 0),
      count: otherStores.reduce((sum, s) => sum + s.count, 0),
    });
  }

  // Group by category.
  const byCategory = new Map<string, { total: number; count: number }>();
  for (const receipt of receipts ?? []) {
    const name = receipt.category ?? "ไม่ระบุหมวด";
    const row = byCategory.get(name) ?? { total: 0, count: 0 };
    row.total += Number(receipt.total_amount);
    row.count += 1;
    byCategory.set(name, row);
  }
  const categories = Array.from(byCategory.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.total - a.total);

  const maxTotal = Math.max(...months.map((m) => m.total), 0);
  const latest = months[months.length - 1];
  const maxMonth = months.reduce(
    (best, m) => (m.total > (best?.total ?? -1) ? m : best),
    undefined as MonthRow | undefined
  );
  const grandTotal = months.reduce((sum, m) => sum + m.total, 0);

  if (error) reportError("app/summary/page.tsx", error);

  return (
    <AppShell
      title="สรุปรายจ่าย"
      subtitle="จากใบเสร็จที่สแกนไว้"
      email={user.email}
    >
      <div className="flex flex-col gap-4">
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            โหลดข้อมูลไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง
          </p>
        )}

        {months.length === 0 && !error && (
          <Card>
            <p className="py-12 text-center text-gray-400">
              ยังไม่มีใบเสร็จที่มีวันที่ — ยอดจะแสดงที่นี่เมื่อบันทึกใบเสร็จพร้อมวันที่
            </p>
          </Card>
        )}

        {latest && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard
              icon="🧾"
              tint="bg-orange-50"
              label={`รายจ่าย ${latest.label}`}
              value={formatBahtWhole(latest.total)}
              hint={`${latest.count} ใบ`}
            />
            <StatCard
              icon="📅"
              tint="bg-blue-50"
              label="รายจ่ายรวม"
              value={formatBahtWhole(grandTotal)}
              hint={`${months.length} เดือน`}
            />
            <StatCard
              icon="🔺"
              tint="bg-gray-100"
              label="เดือนสูงสุด"
              value={maxMonth ? formatBahtWhole(maxMonth.total) : "—"}
              hint={maxMonth?.label}
            />
          </div>
        )}

        {months.length > 0 && (
          <Card title="รายจ่ายรวมต่อเดือน">
            <figure className="flex gap-2">
              <div
                className="flex w-12 shrink-0 flex-col justify-between text-right text-[10px] tabular-nums"
                style={{ height: "10rem", color: VIZ.muted }}
              >
                <span>{formatBahtShort(maxTotal)}</span>
                <span>{formatBahtShort(maxTotal / 2)}</span>
                <span>฿0</span>
              </div>

              <div className="min-w-0 flex-1">
                <div
                  className="relative flex items-end gap-1"
                  style={{ height: "10rem" }}
                  role="img"
                  aria-label={`กราฟแท่งรายจ่ายรายเดือน ${months.length} เดือน`}
                >
                  <div
                    aria-hidden
                    className="absolute inset-0 flex flex-col justify-between"
                  >
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        style={{
                          borderTop: `1px ${i === 2 ? "solid" : "dashed"} ${i === 2 ? VIZ.axis : VIZ.grid}`,
                        }}
                      />
                    ))}
                  </div>

                  {months.map((month) => {
                    const isLabeled =
                      month.key === latest?.key || month.key === maxMonth?.key;
                    return (
                      <div
                        key={month.key}
                        className="group relative flex h-full flex-1 flex-col items-center justify-end"
                      >
                        <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-[11px] text-white shadow-lg group-hover:block">
                          <p className="font-semibold">{month.label}</p>
                          <p>{formatBaht(month.total)}</p>
                          <p>{month.count} ใบ</p>
                        </div>
                        {isLabeled && (
                          <span className="mb-1 text-[10px] font-medium tabular-nums text-gray-700">
                            {formatBahtShort(month.total)}
                          </span>
                        )}
                        <div
                          className="w-full max-w-10"
                          style={{
                            height: `${maxTotal > 0 ? Math.max((month.total / maxTotal) * 100, 2) : 2}%`,
                            background: VIZ.expense,
                            borderRadius: "4px 4px 0 0",
                          }}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="mt-1.5 flex gap-1">
                  {months.map((month) => (
                    <span
                      key={month.key}
                      className="flex-1 truncate text-center text-[10px]"
                      style={{ color: VIZ.muted }}
                    >
                      {month.label}
                    </span>
                  ))}
                </div>
              </div>
            </figure>
          </Card>
        )}

        <div className="grid gap-4 xl:grid-cols-2">
          {categories.length > 0 && (
            <Card title="รายจ่ายตามหมวดหมู่">
              <RankedBars rows={categories} emptyText="ยังไม่มีข้อมูล" />
            </Card>
          )}

          {topStores.length > 0 && (
            <Card title="ร้านที่จ่ายมากที่สุด">
              <RankedBars rows={topStores} emptyText="ยังไม่มีข้อมูล" />
            </Card>
          )}
        </div>

        {months.length > 0 && (
          <Card title="ตารางรายเดือน">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="py-2 pr-2 font-medium">เดือน</th>
                    <th className="px-2 py-2 text-right font-medium">จำนวนใบ</th>
                    <th className="py-2 pl-2 text-right font-medium">รวม</th>
                  </tr>
                </thead>
                <tbody>
                  {[...months].reverse().map((month) => (
                    <tr key={month.key} className="border-b border-gray-100 last:border-0">
                      <td className="py-2 pr-2">{month.label}</td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {month.count}
                      </td>
                      <td className="py-2 pl-2 text-right font-medium tabular-nums">
                        {formatBaht(month.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
