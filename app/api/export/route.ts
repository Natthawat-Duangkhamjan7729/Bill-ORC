import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Excel needs a UTF-8 byte-order mark to display Thai text correctly.
const BOM = "\uFEFF";

function escapeCsvCell(value: string | number | null | undefined): string {
  const normalized = String(value ?? "").replace(/\r\n|\r|\n/g, "\n");
  if (!/[",\n]/.test(normalized)) return normalized;
  return `"${normalized.replace(/"/g, '""')}"`;
}

function toCsvRow(cells: Array<string | number | null | undefined>): string {
  return cells.map(escapeCsvCell).join(",");
}

function csvResponse(rows: string[], filename: string): Response {
  return new Response(BOM + rows.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Not logged in", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") === "items" ? "items" : "receipts";
  const store = searchParams.get("store")?.trim() ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  // Same filters as the dashboard, so "what you see is what you export".
  let query = supabase
    .from("receipts")
    .select(
      "id, store_name, purchase_date, category, subtotal, tax_amount, total_amount, created_at, receipt_items(item_name, quantity, unit_price, total_price)"
    )
    .order("purchase_date", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true });

  if (store) query = query.ilike("store_name", `%${store}%`);
  if (from) query = query.gte("purchase_date", from);
  if (to) query = query.lte("purchase_date", to);

  const { data: receipts, error } = await query;
  if (error) {
    return new Response(`Could not load receipts: ${error.message}`, {
      status: 500,
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const range = from || to ? `_${from || "start"}_to_${to || today}` : "";

  if (type === "items") {
    // One row per purchased item — for cost breakdowns.
    const rows = [
      toCsvRow([
        "วันที่",
        "ร้านค้า",
        "หมวดหมู่",
        "รายการสินค้า",
        "จำนวน",
        "ราคาต่อหน่วย",
        "ราคารวม",
      ]),
    ];
    for (const receipt of receipts ?? []) {
      for (const item of receipt.receipt_items ?? []) {
        rows.push(
          toCsvRow([
            receipt.purchase_date,
            receipt.store_name,
            receipt.category,
            item.item_name,
            item.quantity,
            item.unit_price,
            item.total_price,
          ])
        );
      }
    }
    return csvResponse(rows, `bill-orc-items${range}.csv`);
  }

  // One row per receipt — safe to SUM the totals column directly.
  const rows = [
    toCsvRow([
      "วันที่",
      "ร้านค้า",
      "หมวดหมู่",
      "ยอดก่อนภาษี",
      "ภาษี",
      "ยอดรวม",
      "จำนวนรายการ",
      "บันทึกเมื่อ",
    ]),
  ];
  for (const receipt of receipts ?? []) {
    rows.push(
      toCsvRow([
        receipt.purchase_date,
        receipt.store_name,
        receipt.category,
        receipt.subtotal,
        receipt.tax_amount,
        receipt.total_amount,
        receipt.receipt_items?.length ?? 0,
        receipt.created_at?.slice(0, 10),
      ])
    );
  }
  return csvResponse(rows, `bill-orc-receipts${range}.csv`);
}
