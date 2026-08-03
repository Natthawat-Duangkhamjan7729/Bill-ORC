import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DeleteReceiptButton from "@/components/DeleteReceiptButton";
import type { Receipt, ReceiptItem } from "@/lib/types";

export default async function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: receipt } = await supabase
    .from("receipts")
    .select("*")
    .eq("id", id)
    .single<Receipt>();
  if (!receipt) notFound();

  const { data: items } = await supabase
    .from("receipt_items")
    .select("*")
    .eq("receipt_id", id)
    .returns<ReceiptItem[]>();

  // The bucket is private, so create a 1-hour signed URL for the image.
  let imageUrl: string | null = null;
  if (receipt.image_url) {
    const { data: signed } = await supabase.storage
      .from("receipts")
      .createSignedUrl(receipt.image_url, 3600);
    imageUrl = signed?.signedUrl ?? null;
  }

  const fmt = (n: number | null) => (n != null ? n.toFixed(2) : "—");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          ← Back to receipts
        </Link>
        <DeleteReceiptButton receiptId={receipt.id} imagePath={receipt.image_url} />
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          {receipt.store_name || "Unknown store"}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {receipt.purchase_date ?? "No date"}
        </p>

        {items && items.length > 0 && (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                <th className="py-1 font-medium">Item</th>
                <th className="py-1 text-right font-medium">Qty</th>
                <th className="py-1 text-right font-medium">Unit</th>
                <th className="py-1 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-gray-100 text-gray-900 last:border-0 dark:border-gray-800 dark:text-gray-100"
                >
                  <td className="py-1.5">{item.item_name}</td>
                  <td className="py-1.5 text-right">{item.quantity}</td>
                  <td className="py-1.5 text-right">{fmt(item.unit_price)}</td>
                  <td className="py-1.5 text-right">{fmt(item.total_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <dl className="mt-4 space-y-1 border-t border-gray-200 pt-3 text-sm dark:border-gray-700">
          <div className="flex justify-between text-gray-600 dark:text-gray-300">
            <dt>Subtotal</dt>
            <dd>{fmt(receipt.subtotal)}</dd>
          </div>
          <div className="flex justify-between text-gray-600 dark:text-gray-300">
            <dt>Tax</dt>
            <dd>{fmt(receipt.tax_amount)}</dd>
          </div>
          <div className="flex justify-between text-base font-semibold text-gray-900 dark:text-white">
            <dt>Total</dt>
            <dd>{fmt(receipt.total_amount)}</dd>
          </div>
        </dl>
      </div>

      {imageUrl && (
        <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
          <h2 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            Original photo
          </h2>
          <Image
            src={imageUrl}
            alt={`Receipt from ${receipt.store_name}`}
            width={600}
            height={800}
            unoptimized
            className="mx-auto w-auto max-w-full rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
