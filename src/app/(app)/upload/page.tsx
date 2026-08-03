"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { OcrResult, ReceiptItem } from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white";

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable OCR result (null until extraction has run)
  const [result, setResult] = useState<OcrResult | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setResult(null);
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(selected ? URL.createObjectURL(selected) : null);
  }

  async function handleExtract() {
    if (!file) return;
    setExtracting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/ocr", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Extraction failed. Please try again.");
      } else {
        setResult({
          store_name: data.store_name ?? "",
          purchase_date: data.purchase_date,
          items: data.items ?? [],
          subtotal: data.subtotal,
          tax: data.tax,
          total_amount: data.total_amount,
        });
      }
    } catch {
      setError("Network error during extraction. Please try again.");
    } finally {
      setExtracting(false);
    }
  }

  function updateItem(index: number, patch: Partial<ReceiptItem>) {
    if (!result) return;
    const items = result.items.map((item, i) =>
      i === index ? { ...item, ...patch } : item
    );
    setResult({ ...result, items });
  }

  function addItem() {
    if (!result) return;
    setResult({
      ...result,
      items: [
        ...result.items,
        { item_name: "", quantity: 1, unit_price: null, total_price: null },
      ],
    });
  }

  function removeItem(index: number) {
    if (!result) return;
    setResult({ ...result, items: result.items.filter((_, i) => i !== index) });
  }

  async function handleSave() {
    if (!result || !file) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Your session expired. Please sign in again.");
      setSaving(false);
      return;
    }

    // 1. Upload the image to the private "receipts" bucket under the user's folder.
    const ext = file.name.split(".").pop() || "jpg";
    const imagePath = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(imagePath, file, { contentType: file.type });
    if (uploadError) {
      setError(`Image upload failed: ${uploadError.message}`);
      setSaving(false);
      return;
    }

    // 2. Insert the receipt row.
    const { data: receipt, error: receiptError } = await supabase
      .from("receipts")
      .insert({
        user_id: user.id,
        store_name: result.store_name,
        purchase_date: result.purchase_date || null,
        subtotal: result.subtotal,
        tax_amount: result.tax,
        total_amount: result.total_amount,
        image_url: imagePath,
      })
      .select("id")
      .single();
    if (receiptError || !receipt) {
      setError(`Saving receipt failed: ${receiptError?.message}`);
      setSaving(false);
      return;
    }

    // 3. Insert the item rows.
    const itemsToInsert = result.items
      .filter((item) => item.item_name.trim() !== "")
      .map((item) => ({
        receipt_id: receipt.id,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }));
    if (itemsToInsert.length > 0) {
      const { error: itemsError } = await supabase
        .from("receipt_items")
        .insert(itemsToInsert);
      if (itemsError) {
        setError(`Saving items failed: ${itemsError.message}`);
        setSaving(false);
        return;
      }
    }

    router.push(`/receipts/${receipt.id}`);
  }

  const numberValue = (v: number | null) => (v === null ? "" : String(v));
  const parseNumber = (s: string): number | null =>
    s.trim() === "" ? null : Number(s);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">
        Upload a receipt
      </h1>

      {/* Stage 1: choose photo */}
      <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full rounded-xl border-2 border-dashed border-gray-300 py-8 text-gray-500 hover:border-blue-400 hover:text-blue-600 dark:border-gray-700 dark:text-gray-400"
        >
          {file ? "Choose a different photo" : "📷 Take or choose a photo"}
        </button>

        {previewUrl && (
          <div className="mt-4">
            <Image
              src={previewUrl}
              alt="Receipt preview"
              width={400}
              height={600}
              unoptimized
              className="mx-auto max-h-96 w-auto rounded-lg object-contain"
            />
          </div>
        )}

        {file && !result && (
          <button
            onClick={handleExtract}
            disabled={extracting}
            className="mt-4 w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {extracting ? "Reading receipt… (10–30s)" : "Extract data"}
          </button>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {/* Stage 2: review & edit */}
      {result && (
        <div className="space-y-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Check the extracted data
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 text-sm text-gray-700 dark:text-gray-300">
              Store name
              <input
                value={result.store_name}
                onChange={(e) =>
                  setResult({ ...result, store_name: e.target.value })
                }
                className={`mt-1 ${inputClass}`}
              />
            </label>
            <label className="col-span-2 text-sm text-gray-700 dark:text-gray-300">
              Purchase date
              <input
                type="date"
                value={result.purchase_date ?? ""}
                onChange={(e) =>
                  setResult({
                    ...result,
                    purchase_date: e.target.value || null,
                  })
                }
                className={`mt-1 ${inputClass}`}
              />
            </label>
          </div>

          <div>
            <div className="mb-1 grid grid-cols-[1fr_60px_75px_75px_28px] gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
              <span>Item</span>
              <span>Qty</span>
              <span>Unit</span>
              <span>Total</span>
              <span />
            </div>
            {result.items.map((item, i) => (
              <div
                key={i}
                className="mb-1 grid grid-cols-[1fr_60px_75px_75px_28px] gap-1"
              >
                <input
                  value={item.item_name}
                  onChange={(e) => updateItem(i, { item_name: e.target.value })}
                  className={inputClass}
                  placeholder="Item name"
                />
                <input
                  type="number"
                  inputMode="decimal"
                  value={String(item.quantity)}
                  onChange={(e) =>
                    updateItem(i, { quantity: Number(e.target.value) || 0 })
                  }
                  className={inputClass}
                />
                <input
                  type="number"
                  inputMode="decimal"
                  value={numberValue(item.unit_price)}
                  onChange={(e) =>
                    updateItem(i, { unit_price: parseNumber(e.target.value) })
                  }
                  className={inputClass}
                />
                <input
                  type="number"
                  inputMode="decimal"
                  value={numberValue(item.total_price)}
                  onChange={(e) =>
                    updateItem(i, { total_price: parseNumber(e.target.value) })
                  }
                  className={inputClass}
                />
                <button
                  onClick={() => removeItem(i)}
                  className="text-gray-400 hover:text-red-500"
                  aria-label="Remove item"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={addItem}
              className="mt-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              + Add item
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {(
              [
                ["Subtotal", "subtotal"],
                ["Tax", "tax"],
                ["Total", "total_amount"],
              ] as const
            ).map(([label, key]) => (
              <label
                key={key}
                className="text-sm text-gray-700 dark:text-gray-300"
              >
                {label}
                <input
                  type="number"
                  inputMode="decimal"
                  value={numberValue(result[key])}
                  onChange={(e) =>
                    setResult({ ...result, [key]: parseNumber(e.target.value) })
                  }
                  className={`mt-1 ${inputClass}`}
                />
              </label>
            ))}
          </div>

          <button
            onClick={handleSave}
            disabled={saving || result.store_name.trim() === ""}
            className="w-full rounded-lg bg-green-600 py-2.5 font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save receipt"}
          </button>
        </div>
      )}
    </div>
  );
}
