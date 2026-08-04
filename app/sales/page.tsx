import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SalesForm from "./sales-form";
import DeleteSaleButton from "./delete-sale-button";

export const dynamic = "force-dynamic";

function formatBaht(n: number): string {
  return `฿${n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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

  // Total of the current month, as quick feedback while logging.
  const monthKey = new Date().toISOString().slice(0, 7);
  const monthTotal = (sales ?? [])
    .filter((s) => s.sale_date.startsWith(monthKey))
    .reduce((sum, s) => sum + Number(s.amount), 0);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-5 p-6">
      <header className="flex items-center justify-between">
        <Link href="/dashboard" className="text-sm text-teal-700 hover:underline">
          ← Back to dashboard
        </Link>
        <Link href="/profit" className="text-sm text-teal-700 hover:underline">
          📈 กำไร-ขาดทุน
        </Link>
      </header>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">บันทึกยอดขาย</h1>
        <p className="text-sm text-gray-500">
          เดือนนี้ขายไปแล้ว{" "}
          <span className="font-semibold text-gray-900">
            {formatBaht(monthTotal)}
          </span>
        </p>
      </div>

      <SalesForm />

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          โหลดข้อมูลไม่สำเร็จ: {error.message}
        </p>
      )}

      {sales && sales.length === 0 && (
        <p className="rounded-xl border border-dashed border-gray-300 px-4 py-10 text-center text-gray-400">
          ยังไม่มีรายการขาย — กรอกยอดขายแรกด้านบนได้เลย
        </p>
      )}

      {sales && sales.length > 0 && (
        <ul className="flex flex-col gap-2">
          {sales.map((sale) => (
            <li
              key={sale.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-gray-900">
                  {formatDate(sale.sale_date)}
                  {sale.channel && (
                    <span className="ml-2 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
                      {sale.channel}
                    </span>
                  )}
                </p>
                {sale.note && (
                  <p className="truncate text-sm text-gray-500">{sale.note}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <p className="font-semibold text-gray-900">
                  {formatBaht(Number(sale.amount))}
                </p>
                <DeleteSaleButton saleId={sale.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
