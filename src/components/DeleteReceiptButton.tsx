"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DeleteReceiptButton({
  receiptId,
  imagePath,
}: {
  receiptId: string;
  imagePath: string | null;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this receipt? This cannot be undone.")) return;
    setDeleting(true);
    const supabase = createClient();
    // Items are removed automatically via ON DELETE CASCADE.
    const { error } = await supabase
      .from("receipts")
      .delete()
      .eq("id", receiptId);
    if (!error && imagePath) {
      await supabase.storage.from("receipts").remove([imagePath]);
    }
    if (error) {
      alert(`Delete failed: ${error.message}`);
      setDeleting(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="text-sm text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
    >
      {deleting ? "Deleting…" : "Delete"}
    </button>
  );
}
