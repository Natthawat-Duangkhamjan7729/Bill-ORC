import { reportError } from "@/lib/errors";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/app-shell";
import { Card, StatCard } from "@/components/charts";
import { formatBaht, formatBahtWhole } from "@/lib/viz";
import SalesForm from "./sales-form";
import DeleteSaleButton from "./delete-sale-button";

export const dynamic = "force-dynamic";

function formatDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("th-TH", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default async function SalesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Recent entries, newest first — enough to spot and fix mistakes.
  const { data: sales, error } = await supabase
    .from("sales")
    .select("id, sale_date, amount, channel, note")
    .order("sale_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(60);

  const monthKey = new Date().toISOString().slice(0, 7);
  const thisMonth = (sales ?? []).filter((s) => s.sale_date.startsWith(monthKey));
  const monthTotal = thisMonth.reduce((sum, s) => sum + Number(s.amount), 0);
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayTotal = (sales ?? [])
    .filter((s) => s.sale_date === todayKey)
    .reduce((sum, s) => sum + Number(s.amount), 0);

  if (error) reportError("app/sales/page.tsx", error);

  return (
    <AppShell title="ยอดขาย" subtitle="บันทึกรายรับประจำวัน" email={user.email}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            icon="📆"
            tint="bg-brand-50"
            label="ยอดขายวันนี้"
            value={formatBahtWhole(todayTotal)}
          />
          <StatCard
            icon="💰"
            tint="bg-brand-50"
            label="ยอดขายเดือนนี้"
            value={formatBahtWhole(monthTotal)}
            hint={`${thisMonth.length} รายการ`}
          />
          <StatCard
            icon="📊"
            tint="bg-blue-50"
            label="เฉลี่ยต่อรายการ"
            value={
              thisMonth.length > 0
                ? formatBahtWhole(monthTotal / thisMonth.length)
                : "—"
            }
          />
        </div>

        <Card title="เพิ่มรายการขาย">
          <SalesForm />
        </Card>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-small text-red-700">
            โหลดข้อมูลไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง
          </p>
        )}

        {sales && sales.length === 0 && (
          <div className="rounded-card border border-dashed border-line-strong bg-surface-raised px-4 py-14 text-center text-ink-450">
            ยังไม่มีรายการขาย — กรอกยอดขายแรกด้านบนได้เลย
          </div>
        )}

        {sales && sales.length > 0 && (
          <Card title="รายการล่าสุด">
            <ul className="flex flex-col">
              {sales.map((sale) => (
                <li
                  key={sale.id}
                  className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-small font-medium text-ink-900">
                      {formatDate(sale.sale_date)}
                      {sale.channel && (
                        <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-caption font-medium text-brand-700">
                          {sale.channel}
                        </span>
                      )}
                    </p>
                    {sale.note && (
                      <p className="truncate text-caption text-ink-450">{sale.note}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <p className="font-semibold tabular-nums text-ink-900">
                      {formatBaht(Number(sale.amount))}
                    </p>
                    <DeleteSaleButton saleId={sale.id} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
