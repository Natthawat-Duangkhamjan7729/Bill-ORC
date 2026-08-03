import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./logout-button";

export const dynamic = "force-dynamic";

function formatBaht(n: number | null): string {
  if (n == null) return "—";
  return `฿${n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(d: string | null): string {
  if (!d) return "no date";
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { store?: string; from?: string; to?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const store = searchParams.store?.trim() ?? "";
  const from = searchParams.from ?? "";
  const to = searchParams.to ?? "";
  const hasFilter = store !== "" || from !== "" || to !== "";

  // Newest purchases first; receipts without a date go last.
  let query = supabase
    .from("receipts")
    .select("id, store_name, purchase_date, total_amount")
    .order("purchase_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (store) query = query.ilike("store_name", `%${store}%`);
  if (from) query = query.gte("purchase_date", from);
  if (to) query = query.lte("purchase_date", to);

  const { data: receipts, error } = await query;

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm text-gray-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-5 p-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-xl">
            🧾
          </div>
          <h1 className="text-xl font-bold tracking-tight">Bill ORC</h1>
        </div>
        <LogoutButton />
      </header>

      <Link
        href="/upload"
        className="rounded-lg bg-teal-600 px-4 py-2.5 text-center font-medium text-white transition hover:bg-teal-700"
      >
        + Add receipt
      </Link>

      {/* Search: a plain GET form — filters appear in the URL, so results
          are shareable and the back button works. */}
      <form
        method="GET"
        className="flex flex-col gap-2 rounded-xl border border-gray-200 p-3"
      >
        <input
          type="search"
          name="store"
          defaultValue={store}
          placeholder="Search by store name…"
          className={inputClass}
        />
        <div className="flex items-center gap-2">
          <input
            type="date"
            name="from"
            defaultValue={from}
            aria-label="From date"
            className={inputClass}
          />
          <span className="text-sm text-gray-400">to</span>
          <input
            type="date"
            name="to"
            defaultValue={to}
            aria-label="To date"
            className={inputClass}
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 rounded-lg border border-teal-600 px-3 py-1.5 text-sm font-medium text-teal-700 transition hover:bg-teal-50"
          >
            Search
          </button>
          {hasFilter && (
            <Link
              href="/dashboard"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-center text-sm text-gray-600 transition hover:bg-gray-50"
            >
              Clear
            </Link>
          )}
        </div>
      </form>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Could not load receipts: {error.message}
        </p>
      )}

      {receipts && receipts.length === 0 && (
        <p className="rounded-xl border border-dashed border-gray-300 px-4 py-10 text-center text-gray-400">
          {hasFilter
            ? "No receipts match your search."
            : "No receipts yet — add your first one!"}
        </p>
      )}

      {receipts && receipts.length > 0 && (
        <ul className="flex flex-col gap-2">
          {receipts.map((receipt) => (
            <li key={receipt.id}>
              <Link
                href={`/receipts/${receipt.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3 transition hover:border-teal-400 hover:bg-teal-50/40"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">
                    {receipt.store_name ?? "Unknown store"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatDate(receipt.purchase_date)}
                  </p>
                </div>
                <p className="shrink-0 font-semibold text-gray-900">
                  {formatBaht(receipt.total_amount)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
