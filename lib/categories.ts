// Expense categories for receipts. Stored as plain Thai text in the
// receipts.category column, so the list can grow without a migration.
export const CATEGORIES = [
  "วัตถุดิบ",
  "ค่าน้ำ/ค่าไฟ",
  "อุปกรณ์",
  "ค่าขนส่ง",
  "ค่าเช่า",
  "อื่น ๆ",
] as const;

export type Category = (typeof CATEGORIES)[number];

export function isCategory(value: unknown): value is Category {
  return (
    typeof value === "string" && (CATEGORIES as readonly string[]).includes(value)
  );
}
