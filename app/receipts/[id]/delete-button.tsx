"use client";

import { reportError } from "@/lib/errors";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DeleteButton({
  receiptId,
  imagePath,
}: {
  receiptId: string;
  imagePath: string | null;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm("Delete this receipt? This cannot be undone.")) {
      return;
    }

    setDeleting(true);
    const supabase = createClient();

    // Deleting the receipt also deletes its items (on delete cascade).
    const { error } = await supabase
      .from("receipts")
      .delete()
      .eq("id", receiptId);

    if (error) {
      reportError("receipt.delete", error);
      alert("ลบไม่สำเร็จ กรุณาลองใหม่");
      setDeleting(false);
      return;
    }

    // Best-effort photo cleanup; the receipt row is already gone.
    if (imagePath) {
      await supabase.storage.from("receipts").remove([imagePath]);
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50"
    >
      {deleting ? "Deleting…" : "Delete"}
    </button>
  );
}
