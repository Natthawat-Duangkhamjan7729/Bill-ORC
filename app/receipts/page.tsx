import { reportError } from "@/lib/errors";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/app-shell";
import { formatBaht } from "@/lib/viz";

export const dynamic = "force-dynamic";

function formatDate(d: string | null): string {
  if (!d) return "ไม่มีวันที่";
  return new Date(d + "T00:00:00").toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string; from?: string; to?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { store: rawStore, from: rawFrom, to: rawTo } = await searchParams;
  const store = rawStore?.trim() ?? "";
  const from = rawFrom ?? "";
  const to = rawTo ?? "";
  const hasFilter = store !== "" || from !== "" || to !== "";

  // Newest purchases first; receipts without a date go last.
  let query = supabase
    .from("receipts")
    .select("id, store_name, purchase_date, category, total_amount")
    .order("purchase_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (store) query = query.ilike("store_name", `%${store}%`);
  if (from) query = query.gte("purchase_date", from);
  if (to) query = query.lte("purchase_date", to);

  const { data: receipts, error } = await query;

  // Export links carry the active filters, so you export what you see.
  const exportParams = new URLSearchParams();
  if (store) exportParams.set("store", store);
  if (from) exportParams.set("from", from);
  if (to) exportParams.set("to", to);
  const exportQuery = exportParams.toString();

  const filteredTotal = (receipts ?? []).reduce(
    (sum, r) => sum + Number(r.total_amount ?? 0),
    0
  );

  const inputClass =
    "w-full rounded-lg border border-line-strong bg-surface-raised px-2.5 py-2 text-small text-ink-900 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15";

  if (error) reportError("app/receipts/page.tsx", error);

  return (
    <AppShell
      title="ใบเสร็จ"
      subtitle={
        receipts
          ? `${receipts.length} ใบ · รวม ${formatBaht(filteredTotal)}`
          : undefined
      }
      email={user.email}
      action={
        <Link
          href="/upload"
          className="rounded-lg bg-brand-600 px-3.5 py-2 text-small font-medium text-white transition hover:bg-brand-700 lg:hidden"
        >
          + เพิ่ม
        </Link>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Search: a plain GET form — filters appear in the URL, so results
            are shareable and the back button works. */}
        <form
          method="GET"
          className="flex flex-col gap-2 rounded-card border border-line bg-surface-raised p-4 sm:flex-row sm:items-center"
        >
          <input
            type="search"
            name="store"
            defaultValue={store}
            placeholder="ค้นหาชื่อร้าน…"
            className={`${inputClass} sm:flex-1`}
          />
          <div className="flex items-center gap-2">
            <input
              type="date"
              name="from"
              defaultValue={from}
              aria-label="ตั้งแต่วันที่"
              className={inputClass}
            />
            <span className="text-small text-ink-450">ถึง</span>
            <input
              type="date"
              name="to"
              defaultValue={to}
              aria-label="ถึงวันที่"
              className={inputClass}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-lg border border-brand-600 px-3 py-2 text-small font-medium text-brand-700 transition hover:bg-brand-50 sm:flex-none"
            >
              ค้นหา
            </button>
            {hasFilter && (
              <Link
                href="/receipts"
                className="flex-1 rounded-lg border border-line-strong px-3 py-2 text-center text-small text-ink-600 transition hover:bg-surface-sunken sm:flex-none"
              >
                ล้าง
              </Link>
            )}
          </div>
        </form>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-small text-red-700">
            โหลดใบเสร็จไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง
          </p>
        )}

        {receipts && receipts.length === 0 && (
          <div className="rounded-card border border-dashed border-line-strong bg-surface-raised px-4 py-14 text-center">
            <p className="text-ink-450">
              {hasFilter
                ? "ไม่พบใบเสร็จที่ตรงกับการค้นหา"
                : "ยังไม่มีใบเสร็จ — เพิ่มใบแรกได้เลย!"}
            </p>
          </div>
        )}

        {receipts && receipts.length > 0 && (
          <>
            <div className="flex items-center justify-end gap-3 text-small">
              <span className="text-ink-450">ดาวน์โหลด:</span>
              <a
                href={`/api/export?${exportQuery}`}
                download
                className="text-brand-700 hover:underline"
              >
                ⬇ ใบเสร็จ CSV
              </a>
              <a
                href={`/api/export?type=items${exportQuery ? `&${exportQuery}` : ""}`}
                download
                className="text-brand-700 hover:underline"
              >
                ⬇ รายสินค้า CSV
              </a>
            </div>

            <ul className="flex flex-col gap-2">
              {receipts.map((receipt) => (
                <li key={receipt.id}>
                  <Link
                    href={`/receipts/${receipt.id}`}
                    className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface-raised px-4 py-3 transition hover:border-brand-600 hover:bg-brand-50/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink-900">
                        {receipt.store_name ?? "ไม่ระบุร้าน"}
                      </p>
                      <p className="flex items-center gap-2 text-small text-ink-450">
                        {formatDate(receipt.purchase_date)}
                        {receipt.category && (
                          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-caption font-medium text-brand-700">
                            {receipt.category}
                          </span>
                        )}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold tabular-nums text-ink-900">
                      {receipt.total_amount == null
                        ? "—"
                        : formatBaht(Number(receipt.total_amount))}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </AppShell>
  );
}
