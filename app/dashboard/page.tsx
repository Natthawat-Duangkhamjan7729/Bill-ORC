import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./logout-button";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-xl">
            🧾
          </div>
          <h1 className="text-xl font-bold tracking-tight">Bill ORC</h1>
        </div>
        <LogoutButton />
      </header>

      <div className="rounded-lg border border-teal-300 bg-teal-50 px-4 py-3 text-sm text-teal-800">
        Step 3 complete ✅ Logged in as <strong>{user.email}</strong>
      </div>

      <Link
        href="/upload"
        className="rounded-lg bg-teal-600 px-4 py-2.5 text-center font-medium text-white transition hover:bg-teal-700"
      >
        + Add receipt
      </Link>

      <p className="text-gray-500">
        Your saved receipts will appear here (coming in step 7).
      </p>
    </main>
  );
}
