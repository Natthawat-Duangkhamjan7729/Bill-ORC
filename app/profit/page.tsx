import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/app-shell";
import {
  Card,
  StatCard,
  IncomeExpenseBars,
  type MonthPoint,
} from "@/components/charts";
import { formatBaht, formatBahtWhole, monthLabelTh } from "@/lib/viz";

export const dynamic = "force-dynamic";

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
  for (const receipt of receiptsRes.data ?? []) {
    monthRow(receipt.purchase_date!.slice(0, 7)).expense += Number(
      receipt.total_amount
    );
  }

  const months = Array.from(byMonth.values())
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(-12);

  const currentKey = new Date().toISOString().slice(0, 7);
  const current = byMonth.get(currentKey);
  const income = current?.income ?? 0;
  const expense = current?.expense ?? 0;
  const profit = income - expense;

  return (
    <AppShell
      title="กำไร-ขาดทุน"
      subtitle={`เดือน ${monthLabelTh(currentKey)}`}
      email={user.email}
    >
      <div className="flex flex-col gap-4">
        {loadError && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            โหลดข้อมูลไม่สำเร็จ: {loadError.message}
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            icon="💰"
            tint="bg-teal-50"
            label="รายรับเดือนนี้"
            value={formatBahtWhole(income)}
          />
          <StatCard
            icon="🧾"
            tint="bg-orange-50"
            label="รายจ่ายเดือนนี้"
            value={formatBahtWhole(expense)}
          />
          <StatCard
            icon={profit >= 0 ? "📈" : "📉"}
            tint={profit >= 0 ? "bg-teal-50" : "bg-red-50"}
            label="กำไรเดือนนี้"
            value={formatBahtWhole(profit)}
            valueClass={profit >= 0 ? "text-teal-700" : "text-red-600"}
          />
        </div>

        {months.length === 0 && !loadError && (
          <Card>
            <p className="py-12 text-center text-gray-400">
              ยังไม่มีข้อมูล — บันทึกยอดขายและใบเสร็จก่อน
              แล้วกำไร-ขาดทุนจะแสดงที่นี่
            </p>
          </Card>
        )}

        {months.length > 0 && (
          <Card title="รายรับ vs รายจ่าย รายเดือน">
            <IncomeExpenseBars months={months} />
          </Card>
        )}

        {months.length > 0 && (
          <Card title="ตารางรายเดือน">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="py-2 pr-2 font-medium">เดือน</th>
                    <th className="px-2 py-2 text-right font-medium">รายรับ</th>
                    <th className="px-2 py-2 text-right font-medium">รายจ่าย</th>
                    <th className="py-2 pl-2 text-right font-medium">กำไร</th>
                  </tr>
                </thead>
                <tbody>
                  {[...months].reverse().map((month) => {
                    const rowProfit = month.income - month.expense;
                    return (
                      <tr key={month.key} className="border-b border-gray-100 last:border-0">
                        <td className="py-2 pr-2">{month.label}</td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          {formatBaht(month.income)}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          {formatBaht(month.expense)}
                        </td>
                        <td
                          className={`py-2 pl-2 text-right font-medium tabular-nums ${rowProfit >= 0 ? "text-teal-700" : "text-red-600"}`}
                        >
                          {formatBaht(rowProfit)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <p className="text-xs text-gray-400">
          รายรับมาจากหน้า &quot;ยอดขาย&quot; และรายจ่ายมาจากใบเสร็จที่สแกนไว้
          (นับเฉพาะใบที่มีวันที่และยอดรวม)
        </p>
      </div>
    </AppShell>
  );
}
