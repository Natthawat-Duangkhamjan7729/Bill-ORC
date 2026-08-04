import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type MonthRow = {
  key: string; // "2026-08"
  label: string; // "ส.ค. 26"
  income: number;
  expense: number;
};

function formatBaht(n: number): string {
  return `฿${n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function monthLabel(key: string): string {
  return new Date(key + "-01T00:00:00").toLocaleDateString("th-TH", {
    month: "short",
    year: "2-digit",
  });
}

export default async function ProfitPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Income = sales entries; expense = receipt totals.
  const [salesRes, receiptsRes] = await Promise.all([
    supabase.from("sales").select("sale_date, amount"),
    supabase
      .from("receipts")
      .select("purchase_date, total_amount")
      .not("total_amount", "is", null)
      .not("purchase_date", "is", null),
  ]);

  const loadError = salesRes.error ?? receiptsRes.error;

  const byMonth = new Map<string, MonthRow>();
  function monthRow(key: string): MonthRow {
    let row = byMonth.get(key);
    if (!row) {
      row = { key, label: monthLabel(key), income: 0, expense: 0 };
      byMonth.set(key, row);
    }
    return row;
  }
  for (const sale of salesRes.data ?? []) {
    monthRow(sale.sale_date.slice(0, 7)).income += Number(sale.amount);
  }
  for (const receipt of receiptsRes.data ?? []) {
    monthRow(receipt.purchase_date!.slice(0, 7)).expense += Number(
      receipt.total_amount
    );
  }

  const months = Array.from(byMonth.values())
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(-12);
  const maxValue = Math.max(
    ...months.flatMap((m) => [m.income, m.expense]),
    0
  );

  const currentKey = new Date().toISOString().slice(0, 7);
  const current = byMonth.get(currentKey);
  const currentProfit = (current?.income ?? 0) - (current?.expense ?? 0);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-5 p-6">
      <header className="flex items-center justify-between">
        <Link href="/dashboard" className="text-sm text-teal-700 hover:underline">
          ← Back to dashboard
        </Link>
        <Link href="/sales" className="text-sm text-teal-700 hover:underline">
          💰 บันทึกยอดขาย
        </Link>
      </header>

      <h1 className="text-2xl font-bold tracking-tight">กำไร-ขาดทุน</h1>

      {loadError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          โหลดข้อมูลไม่สำเร็จ: {loadError.message}
        </p>
      )}

      {/* This month at a glance */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-gray-200 p-3">
          <p className="text-xs text-gray-500">รายรับเดือนนี้</p>
          <p className="mt-1 font-bold tracking-tight text-teal-700">
            {formatBaht(current?.income ?? 0)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 p-3">
          <p className="text-xs text-gray-500">รายจ่ายเดือนนี้</p>
          <p className="mt-1 font-bold tracking-tight text-amber-600">
            {formatBaht(current?.expense ?? 0)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 p-3">
          <p className="text-xs text-gray-500">กำไรเดือนนี้</p>
          <p
            className={`mt-1 font-bold tracking-tight ${currentProfit >= 0 ? "text-teal-700" : "text-red-600"}`}
          >
            {formatBaht(currentProfit)}
          </p>
        </div>
      </div>

      {months.length === 0 && !loadError && (
        <p className="rounded-xl border border-dashed border-gray-300 px-4 py-10 text-center text-gray-400">
          ยังไม่มีข้อมูล — บันทึกยอดขายและใบเสร็จก่อน แล้วกำไร-ขาดทุนจะแสดงที่นี่
        </p>
      )}

      {months.length > 0 && (
        <figure className="rounded-xl border border-gray-200 p-4">
          <figcaption className="mb-1 text-sm font-medium text-gray-700">
            รายรับ vs รายจ่าย รายเดือน
          </figcaption>
          <div className="mb-3 flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-teal-600" />
              รายรับ (ขาย)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-500" />
              รายจ่าย (ใบเสร็จ)
            </span>
          </div>
          <div
            className="flex items-end gap-2 border-b border-gray-300"
            style={{ height: "10rem" }}
            role="img"
            aria-label={`กราฟเปรียบเทียบรายรับกับรายจ่าย ${months.length} เดือน`}
          >
            {months.map((month) => (
              <div
                key={month.key}
                className="flex h-full flex-1 items-end justify-center gap-0.5"
                title={`${month.label}: รายรับ ${formatBaht(month.income)}, รายจ่าย ${formatBaht(month.expense)}, กำไร ${formatBaht(month.income - month.expense)}`}
              >
                <div
                  className="w-full max-w-5 rounded-t bg-teal-600"
                  style={{
                    height: `${maxValue > 0 ? Math.max((month.income / maxValue) * 100, month.income > 0 ? 2 : 0) : 0}%`,
                  }}
                />
                <div
                  className="w-full max-w-5 rounded-t bg-amber-500"
                  style={{
                    height: `${maxValue > 0 ? Math.max((month.expense / maxValue) * 100, month.expense > 0 ? 2 : 0) : 0}%`,
                  }}
                />
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-2">
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
                <th className="px-4 py-2 font-medium">เดือน</th>
                <th className="px-2 py-2 text-right font-medium">รายรับ</th>
                <th className="px-2 py-2 text-right font-medium">รายจ่าย</th>
                <th className="px-4 py-2 text-right font-medium">กำไร</th>
              </tr>
            </thead>
            <tbody>
              {[...months].reverse().map((month) => {
                const profit = month.income - month.expense;
                return (
                  <tr key={month.key} className="border-b border-gray-100">
                    <td className="px-4 py-2">{month.label}</td>
                    <td className="px-2 py-2 text-right">
                      {formatBaht(month.income)}
                    </td>
                    <td className="px-2 py-2 text-right">
                      {formatBaht(month.expense)}
                    </td>
                    <td
                      className={`px-4 py-2 text-right font-medium ${profit >= 0 ? "text-teal-700" : "text-red-600"}`}
                    >
                      {formatBaht(profit)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400">
        รายรับมาจากหน้า &quot;บันทึกยอดขาย&quot; และรายจ่ายมาจากใบเสร็จที่สแกนไว้
        (นับเฉพาะใบที่มีวันที่และยอดรวม)
      </p>
    </main>
  );
}
