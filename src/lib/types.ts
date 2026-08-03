// Shared shapes for receipt data across the app.

export interface ReceiptItem {
  id?: string;
  item_name: string;
  quantity: number;
  unit_price: number | null;
  total_price: number | null;
}

export interface Receipt {
  id: string;
  user_id: string;
  store_name: string;
  purchase_date: string | null; // ISO date, e.g. "2026-08-03"
  subtotal: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  image_url: string | null; // path inside the "receipts" storage bucket
  created_at: string;
}

// What the OCR API route returns for user review before saving.
export interface OcrResult {
  store_name: string;
  purchase_date: string | null;
  items: ReceiptItem[];
  subtotal: number | null;
  tax: number | null;
  total_amount: number | null;
}
