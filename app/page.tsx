export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-600 text-3xl">
        🧾
      </div>
      <h1 className="text-center text-3xl font-bold tracking-tight">
        Bill ORC
      </h1>
      <p className="max-w-sm text-center text-gray-500">
        Snap a photo of a receipt and let OCR extract the store, items, and
        totals automatically.
      </p>
      <div className="rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-400">
        Step 1 complete — project scaffold is working ✅
      </div>
    </main>
  );
}
