export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-3xl font-bold text-teal-700">Bill ORC</h1>
      <p className="max-w-md text-gray-600">
        Store and organize your receipts. Snap a photo, and the app extracts
        the itemized purchase data for you.
      </p>
      <p className="rounded-full bg-teal-50 px-4 py-1 text-sm text-teal-700">
        Step 1 complete — project scaffolded ✓
      </p>
    </main>
  );
}
