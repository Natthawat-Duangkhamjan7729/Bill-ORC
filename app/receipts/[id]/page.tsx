import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/app-shell";
import { formatBaht as fmt } from "@/lib/viz";
import DeleteButton from "./delete-button";

export const dynamic = "force-dynamic";

function formatBaht(n: number | null): string {
  if (n == null) return "—";
  return fmt(Number(n));
}

function formatDate(d: string | null): string {
  if (!d) return "ไม่มีวันที่";
  return new Date(d + "T00:00:00").toLocaleDateString("th-TH", {
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
    <AppShell
      title={receipt.store_name ?? "ไม่ระบุร้าน"}
      subtitle={`${formatDate(receipt.purchase_date)}${receipt.category ? ` · ${receipt.category}` : ""}`}
      email={user.email}
      action={
        <>
          <Link
            href={`/receipts/${receipt.id}/edit`}
            className="rounded-lg border border-line-strong px-3 py-1.5 text-small text-ink-600 transition hover:bg-surface-sunken"
          >
            แก้ไข
          </Link>
          <DeleteButton receiptId={receipt.id} imagePath={receipt.image_url} />
        </>
      }
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Link href="/receipts" className="text-small text-brand-700 hover:underline">
        ← กลับไปหน้าใบเสร็จ
      </Link>

      {imageUrl ? (
        <details className="rounded-card border border-line bg-surface-raised">
          <summary className="cursor-pointer px-4 py-3 text-small text-ink-600">
            📷 ดูรูปใบเสร็จ
          </summary>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={`ใบเสร็จจาก ${receipt.store_name ?? "ร้าน"}`}
            className="max-h-[70vh] w-full object-contain p-2"
          />
        </details>
      ) : (
        <p className="rounded-card border border-dashed border-line-strong bg-surface-raised px-4 py-3 text-center text-small text-ink-450">
          ไม่มีรูปสำหรับใบเสร็จนี้
        </p>
      )}

      <div className="overflow-x-auto rounded-card border border-line bg-surface-raised">
        <table className="w-full text-small">
          <thead>
            <tr className="border-b border-line bg-surface-sunken text-left text-ink-450">
              <th className="px-4 py-2 font-medium">รายการ</th>
              <th className="px-2 py-2 text-right font-medium">จำนวน</th>
              <th className="px-2 py-2 text-right font-medium">ราคา/หน่วย</th>
              <th className="px-4 py-2 text-right font-medium">รวม</th>
            </tr>
          </thead>
          <tbody>
            {(items ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ink-450">
                  ไม่มีรายการสินค้า
                </td>
              </tr>
            )}
            {(items ?? []).map((item) => (
              <tr key={item.id} className="border-b border-line">
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
          <tfoot className="text-small">
            <tr>
              <td colSpan={3} className="px-4 py-1.5 pt-3 text-right text-ink-450">
                ยอดก่อนภาษี
              </td>
              <td className="px-4 py-1.5 pt-3 text-right">
                {formatBaht(receipt.subtotal)}
              </td>
            </tr>
            <tr>
              <td colSpan={3} className="px-4 py-1.5 text-right text-ink-450">
                ภาษี
              </td>
              <td className="px-4 py-1.5 text-right">
                {formatBaht(receipt.tax_amount)}
              </td>
            </tr>
            <tr className="font-semibold">
              <td colSpan={3} className="px-4 py-2 pb-3 text-right">
                ยอดรวม
              </td>
              <td className="px-4 py-2 pb-3 text-right">
                {formatBaht(receipt.total_amount)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      </div>
    </AppShell>
  );
}
