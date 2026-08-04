"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DeleteSaleButton({ saleId }: { saleId: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm("ลบรายการขายนี้? ย้อนกลับไม่ได้")) {
      return;
    }

    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("sales").delete().eq("id", saleId);
    if (error) {
      alert(`ลบไม่สำเร็จ: ${error.message}`);
      setDeleting(false);
      return;
    }
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="text-gray-400 transition hover:text-red-600 disabled:opacity-50"
      title="ลบรายการ"
    >
      ✕
    </button>
  );
}
