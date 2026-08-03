"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { prepareImage, type PreparedImage } from "@/lib/image";
import type { OcrResult } from "@/app/api/ocr/route";

export default function UploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [processing, setProcessing] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState<OcrResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setResult(null);
    setProcessing(true);
    try {
      setImage(await prepareImage(file));
    } catch (err) {
      setError(
        `Could not read that image: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setProcessing(false);
    }
  }

  async function handleExtract() {
    if (!image) return;
    setError(null);
    setExtracting(true);
    try {
      const response = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: image.dataUrl }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? `OCR failed (${response.status})`);
        return;
      }
      setResult(data);
    } catch (err) {
      setError(
        `Could not reach the OCR service: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setExtracting(false);
    }
  }

  function reset() {
    setImage(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <Link href="/dashboard" className="text-sm text-teal-700 hover:underline">
          ← Back to dashboard
        </Link>
      </header>

      <h1 className="text-2xl font-bold tracking-tight">Add a receipt</h1>

      {/* Hidden real file input; the buttons below trigger it. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {!image && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={processing}
          className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-gray-300 px-6 py-16 text-gray-500 transition hover:border-teal-400 hover:text-teal-700 disabled:opacity-50"
        >
          <span className="text-4xl">📷</span>
          <span className="font-medium">
            {processing ? "Processing…" : "Take a photo or choose a file"}
          </span>
          <span className="text-xs text-gray-400">
            JPG, PNG, HEIC — big photos are shrunk automatically
          </span>
        </button>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {image && !result && (
        <div className="flex flex-col gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.dataUrl}
            alt="Receipt preview"
            className="max-h-[60vh] w-full rounded-xl border border-gray-200 object-contain"
          />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={reset}
              disabled={extracting}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
            >
              Choose another
            </button>
            <button
              type="button"
              onClick={handleExtract}
              disabled={extracting}
              className="flex-1 rounded-lg bg-teal-600 px-4 py-2.5 font-medium text-white transition hover:bg-teal-700 disabled:opacity-50"
            >
              {extracting ? "Reading receipt…" : "Extract data"}
            </button>
          </div>

          {extracting && (
            <p className="text-center text-xs text-gray-400">
              The AI is reading your receipt — this usually takes 5–20 seconds.
            </p>
          )}
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-teal-300 bg-teal-50 px-4 py-3 text-sm text-teal-800">
            Step 5 complete ✅ — data extracted. In step 6 this becomes an
            editable form you can correct and save.
          </div>

          <div className="rounded-xl border border-gray-200 p-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-gray-500">Store</dt>
              <dd className="font-medium">{result.store_name ?? "—"}</dd>
              <dt className="text-gray-500">Date</dt>
              <dd className="font-medium">{result.purchase_date ?? "—"}</dd>
              <dt className="text-gray-500">Subtotal</dt>
              <dd className="font-medium">{result.subtotal ?? "—"}</dd>
              <dt className="text-gray-500">Tax</dt>
              <dd className="font-medium">{result.tax_amount ?? "—"}</dd>
              <dt className="text-gray-500">Total</dt>
              <dd className="font-medium">{result.total_amount ?? "—"}</dd>
            </dl>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="py-1.5 pr-2 font-medium">Item</th>
                    <th className="py-1.5 pr-2 text-right font-medium">Qty</th>
                    <th className="py-1.5 pr-2 text-right font-medium">Unit</th>
                    <th className="py-1.5 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-3 text-center text-gray-400">
                        No items detected
                      </td>
                    </tr>
                  )}
                  {result.items.map((item, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-1.5 pr-2">{item.item_name}</td>
                      <td className="py-1.5 pr-2 text-right">{item.quantity}</td>
                      <td className="py-1.5 pr-2 text-right">
                        {item.unit_price ?? "—"}
                      </td>
                      <td className="py-1.5 text-right">
                        {item.total_price ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-600 transition hover:bg-gray-50"
          >
            Try another receipt
          </button>
        </div>
      )}
    </main>
  );
}
