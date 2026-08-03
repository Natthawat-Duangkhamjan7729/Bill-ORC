import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Receipt } from "@/lib/types";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string }>;
}) {
  const { q, from, to } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("receipts")
    .select("*")
    .order("purchase_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (q) query = query.ilike("store_name", `%${q}%`);
  if (from) query = query.gte("purchase_date", from);
  if (to) query = query.lte("purchase_date", to);

  const { data: receipts, error } = await query;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Your receipts
        </h1>
        <Link
          href="/upload"
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Upload
        </Link>
      </div>

      {/* Search: a plain GET form so filters live in the URL */}
      <form className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-3 shadow-sm sm:grid-cols-[1fr_auto_auto_auto] dark:bg-gray-900">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search store name…"
          className="col-span-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none sm:col-span-1 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
        <input
          type="date"
          name="from"
          defaultValue={from}
          aria-label="From date"
          className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
        <input
          type="date"
          name="to"
          defaultValue={to}
          aria-label="To date"
          className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
        <button className="col-span-2 rounded-lg bg-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-700 sm:col-span-1 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300">
          Filter
        </button>
      </form>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          Could not load receipts: {error.message}
        </p>
      )}

      {receipts && receipts.length === 0 && (
        <p className="rounded-2xl bg-white p-8 text-center text-gray-500 shadow-sm dark:bg-gray-900 dark:text-gray-400">
          {q || from || to
            ? "No receipts match your search."
            : "No receipts yet. Upload your first one!"}
        </p>
      )}

      <ul className="space-y-2">
        {(receipts as Receipt[] | null)?.map((receipt) => (
          <li key={receipt.id}>
            <Link
              href={`/receipts/${receipt.id}`}
              className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm hover:shadow dark:bg-gray-900"
            >
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {receipt.store_name || "Unknown store"}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {receipt.purchase_date ?? "No date"}
                </p>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {receipt.total_amount != null
                  ? receipt.total_amount.toFixed(2)
                  : "—"}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
