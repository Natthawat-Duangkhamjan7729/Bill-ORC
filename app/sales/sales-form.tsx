"use client";

import { reportError } from "@/lib/errors";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SALE_CHANNELS } from "@/lib/sales";

function today(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

// Quick-entry form: date defaults to today so the common case
// ("จดยอดขายวันนี้") is amount + save, two taps.
export default function SalesForm() {
  const router = useRouter();
  const [saleDate, setSaleDate] = useState(today);
  const [amount, setAmount] = useState("");
  const [channel, setChannel] = useState<string>(SALE_CHANNELS[0]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    const parsed = Number(amount.trim());
    if (!amount.trim() || !Number.isFinite(parsed) || parsed <= 0) {
      setError("กรุณากรอกยอดขายเป็นตัวเลขมากกว่า 0");
      return;
    }
    if (!saleDate) {
      setError("กรุณาเลือกวันที่");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("เซสชันหมดอายุ — กรุณาเข้าสู่ระบบใหม่");
        return;
      }

      const { error: insertError } = await supabase.from("sales").insert({
        user_id: user.id,
        sale_date: saleDate,
        amount: parsed,
        channel,
        note: note.trim() || null,
      });
      if (insertError) {
        reportError("sales-form.insert", insertError);
        setError("บันทึกไม่สำเร็จ กรุณาลองใหม่");
        return;
      }

      // Keep the date and channel — people often log several entries a day.
      setAmount("");
      setNote("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm text-gray-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">วันที่</span>
          <input
            type="date"
            value={saleDate}
            onChange={(e) => setSaleDate(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">ยอดขาย (฿) *</span>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="เช่น 4500"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">ช่องทาง</span>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className={inputClass}
          >
            {SALE_CHANNELS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">โน้ต</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="ไม่บังคับ"
            className={inputClass}
          />
        </label>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded-lg bg-teal-600 px-4 py-2.5 font-medium text-white transition hover:bg-teal-700 disabled:opacity-50"
      >
        {saving ? "กำลังบันทึก…" : "บันทึกยอดขาย"}
      </button>
    </div>
  );
}
