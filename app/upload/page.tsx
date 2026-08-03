"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { prepareImage, type PreparedImage } from "@/lib/image";

export default function UploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
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

      {image && (
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
              onClick={() => {
                setImage(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-600 transition hover:bg-gray-50"
            >
              Choose another
            </button>
            <button
              type="button"
              disabled
              title="OCR extraction arrives in step 5"
              className="flex-1 cursor-not-allowed rounded-lg bg-teal-600 px-4 py-2.5 font-medium text-white opacity-50"
            >
              Extract data (step 5)
            </button>
          </div>

          <p className="text-center text-xs text-gray-400">
            Step 4 complete ✅ — preview works. The Extract button comes alive in
            step 5.
          </p>
        </div>
      )}
    </main>
  );
}
