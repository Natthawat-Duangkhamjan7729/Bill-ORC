export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 font-sans dark:bg-black">
      <main className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        <span className="text-6xl" role="img" aria-label="Receipt">
          🧾
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Bill ORC
        </h1>
        <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Snap a photo of a receipt and let OCR extract every item
          automatically. Login, upload, and spending summaries are coming in the
          next steps.
        </p>
        <p className="rounded-full bg-teal-50 px-4 py-1.5 text-sm font-medium text-teal-800 dark:bg-teal-950 dark:text-teal-200">
          Step 1 complete: project scaffold is working ✓
        </p>
      </main>
    </div>
  );
}
