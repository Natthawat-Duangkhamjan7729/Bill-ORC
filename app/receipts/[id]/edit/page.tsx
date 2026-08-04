import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditForm from "./edit-form";
import type { OcrResult } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditReceiptPage({
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

  const { data: receipt } = await supabase
    .from("receipts")
    .select(
      "id, store_name, purchase_date, category, subtotal, tax_amount, total_amount"
    )
    .eq("id", id)
    .maybeSingle();

  if (!receipt) {
    notFound();
  }

  const { data: items } = await supabase
    .from("receipt_items")
    .select("item_name, quantity, unit_price, total_price")
    .eq("receipt_id", receipt.id)
    .order("id");

  const initial: OcrResult = {
    store_name: receipt.store_name,
    purchase_date: receipt.purchase_date,
    category: receipt.category,
    subtotal: receipt.subtotal,
    tax_amount: receipt.tax_amount,
    total_amount: receipt.total_amount,
    items: (items ?? []).map((item) => ({
      item_name: item.item_name,
      quantity: Number(item.quantity),
      unit_price: item.unit_price,
      total_price: item.total_price,
    })),
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-5 p-6">
      <h1 className="text-2xl font-bold tracking-tight">Edit receipt</h1>
      <EditForm receiptId={receipt.id} initial={initial} />
    </main>
  );
}
