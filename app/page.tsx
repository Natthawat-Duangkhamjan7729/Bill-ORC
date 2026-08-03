import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// Re-check the connection on every page load instead of at build time.
export const dynamic = "force-dynamic";

type CheckResult = {
  ok: boolean;
  message: string;
  hint?: string;
};

async function checkSupabase(): Promise<CheckResult> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return {
      ok: false,
      message: "Missing Supabase settings",
      hint: "Copy .env.example to .env.local, then restart `npm run dev`.",
    };
  }

  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("receipts")
      .select("id", { count: "exact", head: true });

    if (error) {
      return {
        ok: false,
        message: `Database error: ${error.message}`,
        hint: "Run supabase/schema.sql in the Supabase SQL Editor to create the tables.",
      };
    }

    return { ok: true, message: "Connected to Supabase — tables are ready" };
  } catch (e) {
    return {
      ok: false,
      message: `Could not reach Supabase: ${e instanceof Error ? e.message : String(e)}`,
      hint: "Check your internet connection and the URL in .env.local.",
    };
  }
}

export default async function Home() {
  const check = await checkSupabase();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-600 text-3xl">
        🧾
      </div>
      <h1 className="text-center text-3xl font-bold tracking-tight">
        Bill ORC
      </h1>
      <p className="max-w-sm text-center text-gray-500">
        Snap a photo of a receipt and let OCR extract the store, items, and
        totals automatically.
      </p>

      <div className="flex w-full max-w-sm flex-col gap-2">
        <div className="rounded-lg border border-dashed border-gray-300 px-4 py-2 text-center text-sm text-gray-400">
          Step 1 complete — project scaffold is working ✅
        </div>
        <div
          className={`rounded-lg border px-4 py-3 text-center text-sm ${
            check.ok
              ? "border-teal-300 bg-teal-50 text-teal-800"
              : "border-amber-300 bg-amber-50 text-amber-800"
          }`}
        >
          <p>
            {check.ok ? "Step 2 complete ✅ " : "Step 2 pending ⏳ "}
            {check.message}
          </p>
          {check.hint && <p className="mt-1 text-xs">{check.hint}</p>}
        </div>
      </div>

      <Link
        href="/login"
        className="rounded-lg bg-teal-600 px-6 py-2.5 font-medium text-white transition hover:bg-teal-700"
      >
        Get started
      </Link>
    </main>
  );
}
