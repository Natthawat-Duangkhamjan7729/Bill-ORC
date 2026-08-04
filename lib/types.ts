// Shared shape for receipt data moving between OCR, forms, and the database.
// Field names match the database columns.
export type OcrResult = {
  store_name: string | null;
  purchase_date: string | null; // YYYY-MM-DD
  category?: string | null; // one of lib/categories.ts CATEGORIES
  items: {
    item_name: string;
    quantity: number;
    unit_price: number | null;
    total_price: number | null;
  }[];
  subtotal: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  // Which engine read this receipt. Display-only — never saved to the database.
  source?: "local" | "cloud";
};
