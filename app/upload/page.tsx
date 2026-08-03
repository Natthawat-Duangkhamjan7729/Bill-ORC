"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { prepareImage, type PreparedImage } from "@/lib/image";
import type { OcrResult } from "@/lib/types";
import ReceiptForm from "@/components/receipt-form";

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

      {result && image && (
        <div className="flex flex-col gap-4">
          <details className="rounded-xl border border-gray-200">
            <summary className="cursor-pointer px-4 py-2.5 text-sm text-gray-600">
              📷 Show receipt photo
            </summary>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.dataUrl}
              alt="Receipt"
              className="max-h-[60vh] w-full object-contain p-2"
            />
          </details>

          <ReceiptForm
            initial={result}
            imageBlob={image.blob}
            onCancel={reset}
          />
        </div>
      )}
    </main>
  );
}
