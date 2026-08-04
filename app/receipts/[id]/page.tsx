import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DeleteButton from "./delete-button";

export const dynamic = "force-dynamic";

function formatBaht(n: number | null): string {
  if (n == null) return "—";
  return `฿${n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(d: string | null): string {
  if (!d) return "No date";
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // RLS guarantees users can only ever fetch their own receipts.
  const { data: receipt } = await supabase
    .from("receipts")
    .select(
      "id, store_name, purchase_date, category, subtotal, tax_amount, total_amount, image_url, created_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (!receipt) {
    notFound();
  }

  const { data: items } = await supabase
    .from("receipt_items")
    .select("id, item_name, quantity, unit_price, total_price")
    .eq("receipt_id", receipt.id)
    .order("id");

  // The bucket is private, so create a temporary (1 hour) signed link
  // that only this page load can use to display the photo.
  let imageUrl: string | null = null;
  if (receipt.image_url) {
    const { data: signed } = await supabase.storage
      .from("receipts")
      .createSignedUrl(receipt.image_url, 60 * 60);
    imageUrl = signed?.signedUrl ?? null;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-5 p-6">
      <header className="flex items-center justify-between">
        <Link href="/dashboard" className="text-sm text-teal-700 hover:underline">
          ← Back to dashboard
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/receipts/${receipt.id}/edit`}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-50"
          >
            Edit
          </Link>
          <DeleteButton receiptId={receipt.id} imagePath={receipt.image_url} />
        </div>
      </header>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {receipt.store_name ?? "Unknown store"}
        </h1>
        <p className="flex items-center gap-2 text-gray-500">
          {formatDate(receipt.purchase_date)}
          {receipt.category && (
            <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700">
              {receipt.category}
            </span>
          )}
        </p>
      </div>

      {imageUrl ? (
        <details className="rounded-xl border border-gray-200">
          <summary className="cursor-pointer px-4 py-2.5 text-sm text-gray-600">
            📷 Show receipt photo
          </summary>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={`Receipt from ${receipt.store_name ?? "store"}`}
            className="max-h-[70vh] w-full object-contain p-2"
          />
        </details>
      ) : (
        <p className="rounded-xl border border-dashed border-gray-300 px-4 py-3 text-center text-sm text-gray-400">
          No photo stored for this receipt
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
              <th className="px-4 py-2 font-medium">Item</th>
              <th className="px-2 py-2 text-right font-medium">Qty</th>
              <th className="px-2 py-2 text-right font-medium">Unit</th>
              <th className="px-4 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {(items ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  No items recorded
                </td>
              </tr>
            )}
            {(items ?? []).map((item) => (
              <tr key={item.id} className="border-b border-gray-100">
                <td className="px-4 py-2">{item.item_name}</td>
                <td className="px-2 py-2 text-right">{item.quantity}</td>
                <td className="px-2 py-2 text-right">
                  {formatBaht(item.unit_price)}
                </td>
                <td className="px-4 py-2 text-right">
                  {formatBaht(item.total_price)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="text-sm">
            <tr>
              <td colSpan={3} className="px-4 py-1.5 pt-3 text-right text-gray-500">
                Subtotal
              </td>
              <td className="px-4 py-1.5 pt-3 text-right">
                {formatBaht(receipt.subtotal)}
              </td>
            </tr>
            <tr>
              <td colSpan={3} className="px-4 py-1.5 text-right text-gray-500">
                Tax
              </td>
              <td className="px-4 py-1.5 text-right">
                {formatBaht(receipt.tax_amount)}
              </td>
            </tr>
            <tr className="font-semibold">
              <td colSpan={3} className="px-4 py-2 pb-3 text-right">
                Total
              </td>
              <td className="px-4 py-2 pb-3 text-right">
                {formatBaht(receipt.total_amount)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </main>
  );
}
