import { reportError } from "@/lib/errors";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/app-shell";
import {
  Card,
  StatCard,
  IncomeExpenseBars,
  RatioDonut,
  RankedBars,
  type MonthPoint,
} from "@/components/charts";
import { formatBaht, formatBahtWhole, monthLabelTh } from "@/lib/viz";

export const dynamic = "force-dynamic";

function formatDate(d: string | null): string {
  if (!d) return "ไม่มีวันที่";
  return new Date(d + "T00:00:00").toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const [salesRes, receiptsRes] = await Promise.all([
    supabase.from("sales").select("sale_date, amount"),
    supabase
      .from("receipts")
      .select("id, store_name, purchase_date, category, total_amount")
      .order("purchase_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
  ]);
  const loadError = salesRes.error ?? receiptsRes.error;
  const receipts = receiptsRes.data ?? [];

  // Monthly income (sales) vs expense (receipts), most recent 6 months.
  const byMonth = new Map<string, MonthPoint>();
  function monthRow(key: string): MonthPoint {
    let row = byMonth.get(key);
    if (!row) {
      row = { key, label: monthLabelTh(key), income: 0, expense: 0 };
      byMonth.set(key, row);
    }
    return row;
  }
  for (const sale of salesRes.data ?? []) {
    monthRow(sale.sale_date.slice(0, 7)).income += Number(sale.amount);
  }
  for (const receipt of receipts) {
    if (!receipt.purchase_date || receipt.total_amount == null) continue;
    monthRow(receipt.purchase_date.slice(0, 7)).expense += Number(
      receipt.total_amount
    );
  }
  const months = Array.from(byMonth.values())
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(-6);

  const monthKey = new Date().toISOString().slice(0, 7);
  const current = byMonth.get(monthKey);
  const income = current?.income ?? 0;
  const expense = current?.expense ?? 0;
  const profit = income - expense;
  const receiptsThisMonth = receipts.filter((r) =>
    r.purchase_date?.startsWith(monthKey)
  ).length;

  // Expense split by category, this month.
  const byCategory = new Map<string, { total: number; count: number }>();
  for (const receipt of receipts) {
    if (!receipt.purchase_date?.startsWith(monthKey)) continue;
    if (receipt.total_amount == null) continue;
    const name = receipt.category ?? "ไม่ระบุหมวด";
    const row = byCategory.get(name) ?? { total: 0, count: 0 };
    row.total += Number(receipt.total_amount);
    row.count += 1;
    byCategory.set(name, row);
  }
  const categories = Array.from(byCategory.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.total - a.total);

  const recent = receipts.slice(0, 5);
  const hasAnyData = months.length > 0;

  if (loadError) reportError("app/dashboard/page.tsx", loadError);

  return (
    <AppShell
      title="ภาพรวม"
      subtitle={`ข้อมูลเดือน ${monthLabelTh(monthKey)}`}
      email={user.email}
      action={
        <Link
          href="/upload"
          className="rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-teal-700 lg:hidden"
        >
          + เพิ่ม
        </Link>
      }
    >
      <div className="flex flex-col gap-4">
        {loadError && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            โหลดข้อมูลไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง
          </p>
        )}

        {/* KPI row */}
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard
            icon="💰"
            tint="bg-teal-50"
            label="รายรับ"
            value={formatBahtWhole(income)}
          />
          <StatCard
            icon="🧾"
            tint="bg-orange-50"
            label="รายจ่าย"
            value={formatBahtWhole(expense)}
          />
          <StatCard
            icon={profit >= 0 ? "📈" : "📉"}
            tint={profit >= 0 ? "bg-teal-50" : "bg-red-50"}
            label="กำไร"
            value={formatBahtWhole(profit)}
            valueClass={profit >= 0 ? "text-teal-700" : "text-red-600"}
          />
          <StatCard
            icon="📂"
            tint="bg-blue-50"
            label="ใบเสร็จ"
            value={`${receiptsThisMonth} ใบ`}
            hint={`ทั้งหมด ${receipts.length} ใบ`}
          />
        </div>

        {!hasAnyData && !loadError && (
          <Card>
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <span className="text-4xl">👋</span>
              <p className="font-medium text-gray-900">ยังไม่มีข้อมูล</p>
              <p className="max-w-sm text-sm text-gray-500">
                เริ่มจากสแกนใบเสร็จ แล้วบันทึกยอดขายประจำวัน
                จากนั้นกราฟกำไร-ขาดทุนจะขึ้นที่นี่
              </p>
              <div className="flex gap-2">
                <Link
                  href="/upload"
                  className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700"
                >
                  สแกนใบเสร็จ
                </Link>
                <Link
                  href="/sales"
                  className="rounded-lg border border-teal-600 px-4 py-2.5 text-sm font-medium text-teal-700 transition hover:bg-teal-50"
                >
                  บันทึกยอดขาย
                </Link>
              </div>
            </div>
          </Card>
        )}

        {hasAnyData && (
          <div className="grid gap-4 xl:grid-cols-3">
            <Card
              title="รายรับ vs รายจ่าย ราย 6 เดือน"
              className="xl:col-span-2"
              action={
                <Link
                  href="/profit"
                  className="text-xs text-teal-700 hover:underline"
                >
                  ดูทั้งหมด →
                </Link>
              }
            >
              <IncomeExpenseBars months={months} />
            </Card>

            <Card title={`สัดส่วนเดือน ${monthLabelTh(monthKey)}`}>
              <RatioDonut income={income} expense={expense} />
            </Card>
          </div>
        )}

        {hasAnyData && (
          <div className="grid gap-4 xl:grid-cols-3">
            <Card
              title="รายจ่ายตามหมวดหมู่ (เดือนนี้)"
              className="xl:col-span-2"
              action={
                <Link
                  href="/summary"
                  className="text-xs text-teal-700 hover:underline"
                >
                  ดูทั้งหมด →
                </Link>
              }
            >
              <RankedBars
                rows={categories}
                emptyText="ยังไม่มีใบเสร็จในเดือนนี้"
              />
            </Card>

            <Card
              title="ใบเสร็จล่าสุด"
              action={
                <Link
                  href="/receipts"
                  className="text-xs text-teal-700 hover:underline"
                >
                  ดูทั้งหมด →
                </Link>
              }
            >
              {recent.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">
                  ยังไม่มีใบเสร็จ
                </p>
              ) : (
                <ul className="flex flex-col">
                  {recent.map((receipt) => (
                    <li key={receipt.id} className="border-b border-gray-100 last:border-0">
                      <Link
                        href={`/receipts/${receipt.id}`}
                        className="flex items-center justify-between gap-3 py-2.5 transition hover:opacity-70"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {receipt.store_name ?? "ไม่ระบุร้าน"}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {formatDate(receipt.purchase_date)}
                            {receipt.category ? ` · ${receipt.category}` : ""}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">
                          {receipt.total_amount == null
                            ? "—"
                            : formatBaht(Number(receipt.total_amount))}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}
