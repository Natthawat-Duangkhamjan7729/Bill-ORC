"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES } from "@/lib/categories";
import type { OcrResult } from "@/lib/types";

type ItemRow = {
  item_name: string;
  quantity: string;
  unit_price: string;
  total_price: string;
};

// Editable receipt form used in two modes:
// - New (imageBlob set): Save uploads the photo, then inserts receipt + items.
// - Edit (receiptId set): Save updates the receipt and replaces its items.
export default function ReceiptForm({
  initial,
  imageBlob,
  receiptId,
  onCancel,
  onSaved,
  cancelLabel,
}: {
  initial: OcrResult;
  imageBlob?: Blob;
  receiptId?: string;
  onCancel: () => void;
  // When set, called after a successful save instead of navigating away —
  // used by batch upload to advance to the next receipt in the queue.
  onSaved?: () => void;
  cancelLabel?: string;
}) {
  const router = useRouter();
  const [storeName, setStoreName] = useState(initial.store_name ?? "");
  const [purchaseDate, setPurchaseDate] = useState(initial.purchase_date ?? "");
  const [category, setCategory] = useState(initial.category ?? "");
  const [subtotal, setSubtotal] = useState(numToStr(initial.subtotal));
  const [taxAmount, setTaxAmount] = useState(numToStr(initial.tax_amount));
  const [totalAmount, setTotalAmount] = useState(numToStr(initial.total_amount));
  const [items, setItems] = useState<ItemRow[]>(
    initial.items.map((item) => ({
      item_name: item.item_name,
      quantity: numToStr(item.quantity) || "1",
      unit_price: numToStr(item.unit_price),
      total_price: numToStr(item.total_price),
    }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function numToStr(n: number | null | undefined): string {
    return n == null ? "" : String(n);
  }

  function strToNum(s: string): number | null {
    const trimmed = s.trim();
    if (trimmed === "") return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }

  function updateItem(index: number, field: keyof ItemRow, value: string) {
    setItems((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  async function handleSave() {
    setError(null);

    if (!storeName.trim()) {
      setError("Please fill in the store name.");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Your session expired — please log in again.");
        return;
      }

      const fields = {
        store_name: storeName.trim(),
        purchase_date: purchaseDate || null,
        category: category || null,
        subtotal: strToNum(subtotal),
        tax_amount: strToNum(taxAmount),
        total_amount: strToNum(totalAmount),
      };

      let savedReceiptId: string;

      if (receiptId) {
        // Edit mode: update the existing receipt (photo stays unchanged).
        const { error: updateError } = await supabase
          .from("receipts")
          .update(fields)
          .eq("id", receiptId);
        if (updateError) {
          setError(`Could not save changes: ${updateError.message}`);
          return;
        }

        // Replace the items with the rows currently in the form.
        const { error: clearError } = await supabase
          .from("receipt_items")
          .delete()
          .eq("receipt_id", receiptId);
        if (clearError) {
          setError(`Could not update items: ${clearError.message}`);
          return;
        }
        savedReceiptId = receiptId;
      } else {
        // New mode: upload the photo to the private "receipts" bucket first.
        // Path starts with the user id so storage rules allow access.
        if (!imageBlob) {
          setError("No image to save — please start over.");
          return;
        }
        const imagePath = `${user.id}/${crypto.randomUUID()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("receipts")
          .upload(imagePath, imageBlob, { contentType: "image/jpeg" });
        if (uploadError) {
          setError(`Could not upload the image: ${uploadError.message}`);
          return;
        }

        const { data: receipt, error: receiptError } = await supabase
          .from("receipts")
          .insert({ ...fields, user_id: user.id, image_url: imagePath })
          .select("id")
          .single();
        if (receiptError) {
          setError(`Could not save the receipt: ${receiptError.message}`);
          return;
        }
        savedReceiptId = receipt.id;
      }

      // Save the item rows (skip blank ones).
      const itemRows = items
        .filter((item) => item.item_name.trim() !== "")
        .map((item) => ({
          receipt_id: savedReceiptId,
          item_name: item.item_name.trim(),
          quantity: strToNum(item.quantity) ?? 1,
          unit_price: strToNum(item.unit_price),
          total_price: strToNum(item.total_price),
        }));
      if (itemRows.length > 0) {
        const { error: itemsError } = await supabase
          .from("receipt_items")
          .insert(itemRows);
        if (itemsError) {
          setError(
            `Receipt saved, but items failed: ${itemsError.message}. Please try saving again.`
          );
          return;
        }
      }

      if (onSaved) {
        onSaved();
      } else {
        router.push(receiptId ? `/receipts/${receiptId}` : "/dashboard");
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm text-gray-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200";

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-teal-300 bg-teal-50 px-4 py-3 text-sm text-teal-800">
        {receiptId
          ? "Edit the receipt below, then save your changes."
          : "Check the extracted data below, fix anything the AI misread, then save."}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2 flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Store name *</span>
          <input
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            className={inputClass}
            placeholder="e.g. 7-Eleven"
          />
        </label>
        <label className="col-span-2 flex flex-col gap-1 sm:col-span-1">
          <span className="text-sm font-medium text-gray-700">Purchase date</span>
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="col-span-2 flex flex-col gap-1 sm:col-span-1">
          <span className="text-sm font-medium text-gray-700">
            หมวดหมู่ (Category)
          </span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputClass}
          >
            <option value="">— ไม่ระบุ —</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Subtotal</span>
          <input
            inputMode="decimal"
            value={subtotal}
            onChange={(e) => setSubtotal(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Tax</span>
          <input
            inputMode="decimal"
            value={taxAmount}
            onChange={(e) => setTaxAmount(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Total</span>
          <input
            inputMode="decimal"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700">Items</span>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500">
                <th className="pb-1 pr-2 font-medium">Name</th>
                <th className="w-16 pb-1 pr-2 font-medium">Qty</th>
                <th className="w-24 pb-1 pr-2 font-medium">Unit ฿</th>
                <th className="w-24 pb-1 pr-2 font-medium">Total ฿</th>
                <th className="w-8 pb-1"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  <td className="py-1 pr-2">
                    <input
                      value={item.item_name}
                      onChange={(e) => updateItem(i, "item_name", e.target.value)}
                      className={inputClass}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      inputMode="decimal"
                      value={item.quantity}
                      onChange={(e) => updateItem(i, "quantity", e.target.value)}
                      className={inputClass}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      inputMode="decimal"
                      value={item.unit_price}
                      onChange={(e) =>
                        updateItem(i, "unit_price", e.target.value)
                      }
                      className={inputClass}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      inputMode="decimal"
                      value={item.total_price}
                      onChange={(e) =>
                        updateItem(i, "total_price", e.target.value)
                      }
                      className={inputClass}
                    />
                  </td>
                  <td className="py-1">
                    <button
                      type="button"
                      onClick={() =>
                        setItems((rows) => rows.filter((_, j) => j !== i))
                      }
                      className="text-gray-400 transition hover:text-red-600"
                      title="Remove item"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={() =>
            setItems((rows) => [
              ...rows,
              { item_name: "", quantity: "1", unit_price: "", total_price: "" },
            ])
          }
          className="self-start text-sm text-teal-700 underline-offset-4 hover:underline"
        >
          + Add item
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
        >
          {cancelLabel ?? (receiptId ? "Cancel" : "Start over")}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 rounded-lg bg-teal-600 px-4 py-2.5 font-medium text-white transition hover:bg-teal-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : receiptId ? "Save changes" : "Save receipt"}
        </button>
      </div>
    </div>
  );
}
