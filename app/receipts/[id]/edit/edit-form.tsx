"use client";

import { useRouter } from "next/navigation";
import ReceiptForm from "@/components/receipt-form";
import type { OcrResult } from "@/lib/types";

// Thin client wrapper: gives ReceiptForm a "cancel = go back" action,
// which server components can't pass down directly.
export default function EditForm({
  receiptId,
  initial,
}: {
  receiptId: string;
  initial: OcrResult;
}) {
  const router = useRouter();

  return (
    <ReceiptForm
      receiptId={receiptId}
      initial={initial}
      onCancel={() => router.push(`/receipts/${receiptId}`)}
    />
  );
}
