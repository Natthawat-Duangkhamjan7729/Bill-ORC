"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { prepareImage, type PreparedImage } from "@/lib/image";
import type { OcrResult } from "@/lib/types";
import ReceiptForm from "@/components/receipt-form";

type QueueStatus =
  | "waiting" // photo prepared, OCR not started yet
  | "extracting" // OCR call in flight
  | "ready" // OCR done, waiting for review
  | "error" // OCR failed — retry, fill in by hand, or skip
  | "saved"
  | "skipped";

type QueueItem = {
  id: string;
  image: PreparedImage;
  status: QueueStatus;
  result: OcrResult | null;
  error?: string;
  manual?: boolean; // user chose to fill the form without OCR
};

const EMPTY_RESULT: OcrResult = {
  store_name: null,
  purchase_date: null,
  category: null,
  items: [],
  subtotal: null,
  tax_amount: null,
  total_amount: null,
};

const STATUS_LABELS: Record<QueueStatus, string> = {
  waiting: "รอคิว",
  extracting: "กำลังอ่าน…",
  ready: "พร้อมตรวจ",
  error: "อ่านไม่สำเร็จ",
  saved: "บันทึกแล้ว ✓",
  skipped: "ข้ามไป",
};

async function ocrImage(image: PreparedImage): Promise<OcrResult> {
  // Sent as binary form data rather than a base64 JSON string — large
  // JSON bodies can trip a WebKit/Safari bug that throws a cryptic
  // "string did not match the expected pattern" error before the
  // request even reaches the server.
  const formData = new FormData();
  formData.append("image", image.ocrBlob, "receipt.jpg");
  const response = await fetch("/api/ocr", { method: "POST", body: formData });

  // Read as text first: server errors (timeouts, size limits) come back
  // as plain text or HTML, and parsing those as JSON hides the real cause.
  const raw = await response.text();
  let data: (OcrResult & { error?: string }) | null = null;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(
      `Server error ${response.status}: ${raw.replace(/<[^>]*>/g, " ").trim().slice(0, 200) || "(empty reply)"}`
    );
  }
  if (!response.ok || !data || data.error) {
    throw new Error(data?.error ?? `OCR failed (${response.status})`);
  }
  return data;
}

export default function UploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function patchItem(id: string, patch: Partial<QueueItem>) {
    setQueue((items) =>
      items.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setError(null);
    setProcessing(true);
    try {
      const prepared: QueueItem[] = [];
      for (const file of files) {
        prepared.push({
          id: crypto.randomUUID(),
          image: await prepareImage(file),
          status: "waiting",
          result: null,
        });
      }
      setQueue((items) => [...items, ...prepared]);
    } catch (err) {
      setError(
        `Could not read that image: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // Runs OCR over every waiting item, one at a time (the review form
  // opens as soon as the first receipt is ready, so reading and
  // reviewing overlap naturally).
  async function extractAll(items: QueueItem[]) {
    setError(null);
    setExtracting(true);
    try {
      for (const item of items) {
        patchItem(item.id, { status: "extracting" });
        try {
          let result: OcrResult;
          try {
            result = await ocrImage(item.image);
          } catch {
            // The AI gateway is sometimes slow or flaky on one request —
            // wait a moment and quietly try once more before giving up.
            await new Promise((r) => setTimeout(r, 3000));
            result = await ocrImage(item.image);
          }
          patchItem(item.id, { status: "ready", result });
        } catch (err) {
          patchItem(item.id, {
            status: "error",
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    } finally {
      setExtracting(false);
    }
  }

  function reset() {
    setQueue([]);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const waiting = queue.filter((i) => i.status === "waiting");
  const current =
    queue.find((i) => i.status === "ready") ??
    queue.find((i) => i.status === "error");
  const pendingCount = queue.filter(
    (i) => i.status === "waiting" || i.status === "extracting"
  ).length;
  const savedCount = queue.filter((i) => i.status === "saved").length;
  const skippedCount = queue.filter((i) => i.status === "skipped").length;
  const allDone =
    queue.length > 0 && queue.every((i) => i.status === "saved" || i.status === "skipped");
  const notStarted = queue.length > 0 && waiting.length === queue.length;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <Link href="/dashboard" className="text-sm text-teal-700 hover:underline">
          ← Back to dashboard
        </Link>
      </header>

      <h1 className="text-2xl font-bold tracking-tight">Add receipts</h1>

      {/* Hidden real file input; the buttons below trigger it. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {queue.length === 0 && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={processing}
          className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-gray-300 px-6 py-16 text-gray-500 transition hover:border-teal-400 hover:text-teal-700 disabled:opacity-50"
        >
          <span className="text-4xl">📷</span>
          <span className="font-medium">
            {processing ? "Processing…" : "ถ่ายรูป หรือเลือกได้หลายไฟล์พร้อมกัน"}
          </span>
          <span className="text-xs text-gray-400">
            JPG, PNG, HEIC — รูปใหญ่จะถูกย่ออัตโนมัติ
          </span>
        </button>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Queue strip: thumbnails + status for every photo chosen. */}
      {queue.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {queue.map((item, i) => (
            <figure
              key={item.id}
              className={`w-20 shrink-0 overflow-hidden rounded-lg border text-center ${
                item.id === current?.id
                  ? "border-teal-500 ring-2 ring-teal-200"
                  : "border-gray-200"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image.dataUrl}
                alt={`ใบที่ ${i + 1}`}
                className="h-20 w-full object-cover"
              />
              <figcaption
                className={`px-1 py-0.5 text-[10px] ${
                  item.status === "error"
                    ? "text-red-600"
                    : item.status === "saved"
                      ? "text-teal-700"
                      : "text-gray-500"
                }`}
              >
                {STATUS_LABELS[item.status]}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {/* Before extraction: previews + start button. */}
      {notStarted && (
        <div className="flex flex-col gap-4">
          {queue.length === 1 && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={queue[0].image.dataUrl}
              alt="Receipt preview"
              className="max-h-[60vh] w-full rounded-xl border border-gray-200 object-contain"
            />
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={reset}
              disabled={extracting}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
            >
              เริ่มใหม่
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={extracting || processing}
              className="flex-1 rounded-lg border border-teal-600 px-4 py-2.5 font-medium text-teal-700 transition hover:bg-teal-50 disabled:opacity-50"
            >
              + เพิ่มรูป
            </button>
            <button
              type="button"
              onClick={() => extractAll(waiting)}
              disabled={extracting}
              className="flex-1 rounded-lg bg-teal-600 px-4 py-2.5 font-medium text-white transition hover:bg-teal-700 disabled:opacity-50"
            >
              {queue.length === 1
                ? "อ่านข้อมูล"
                : `อ่านทั้งหมด (${queue.length} ใบ)`}
            </button>
          </div>
        </div>
      )}

      {/* Progress note while the queue is being read. */}
      {pendingCount > 0 && !notStarted && (
        <p className="text-center text-xs text-gray-400">
          AI กำลังอ่านใบเสร็จ… เหลืออีก {pendingCount} ใบ
          {current ? " — ตรวจใบที่เสร็จแล้วด้านล่างได้เลย" : ""}
        </p>
      )}

      {/* Review the current receipt. */}
      {current && (
        <div className="flex flex-col gap-4">
          {queue.length > 1 && (
            <p className="text-sm font-medium text-gray-700">
              กำลังตรวจใบที่ {queue.indexOf(current) + 1} จาก {queue.length}
            </p>
          )}

          {current.status === "error" && !current.manual ? (
            <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700">
                อ่านใบนี้ไม่สำเร็จ: {current.error}
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={current.image.dataUrl}
                alt="Receipt"
                className="max-h-[40vh] w-full rounded-lg object-contain"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => extractAll([current])}
                  disabled={extracting}
                  className="flex-1 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-teal-700 disabled:opacity-50"
                >
                  ลองอีกครั้ง
                </button>
                <button
                  type="button"
                  onClick={() =>
                    patchItem(current.id, {
                      status: "ready",
                      result: EMPTY_RESULT,
                      manual: true,
                    })
                  }
                  className="flex-1 rounded-lg border border-teal-600 px-3 py-2 text-sm font-medium text-teal-700 transition hover:bg-teal-50"
                >
                  กรอกเอง
                </button>
                <button
                  type="button"
                  onClick={() => patchItem(current.id, { status: "skipped" })}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
                >
                  ข้ามใบนี้
                </button>
              </div>
            </div>
          ) : (
            current.result && (
              <>
                <details className="rounded-xl border border-gray-200">
                  <summary className="cursor-pointer px-4 py-2.5 text-sm text-gray-600">
                    📷 ดูรูปใบเสร็จ
                  </summary>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={current.image.dataUrl}
                    alt="Receipt"
                    className="max-h-[60vh] w-full object-contain p-2"
                  />
                </details>

                <ReceiptForm
                  key={current.id}
                  initial={current.result}
                  imageBlob={current.image.blob}
                  onSaved={() => patchItem(current.id, { status: "saved" })}
                  onCancel={() =>
                    queue.length > 1
                      ? patchItem(current.id, { status: "skipped" })
                      : reset()
                  }
                  cancelLabel={queue.length > 1 ? "ข้ามใบนี้" : "Start over"}
                />
              </>
            )
          )}
        </div>
      )}

      {/* All receipts handled. */}
      {allDone && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-teal-200 bg-teal-50 px-6 py-10 text-center">
          <span className="text-4xl">🎉</span>
          <p className="font-medium text-teal-900">
            เสร็จแล้ว — บันทึก {savedCount} ใบ
            {skippedCount > 0 ? `, ข้าม ${skippedCount} ใบ` : ""}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-teal-600 px-4 py-2.5 font-medium text-teal-700 transition hover:bg-teal-50"
            >
              + สแกนเพิ่ม
            </button>
            <Link
              href="/dashboard"
              className="rounded-lg bg-teal-600 px-4 py-2.5 font-medium text-white transition hover:bg-teal-700"
            >
              ไปหน้ารายการ
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
