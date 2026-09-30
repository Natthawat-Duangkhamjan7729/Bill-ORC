// Per-user daily cap on OCR calls. The counter lives in Postgres and is
// incremented by a SECURITY DEFINER function (see supabase/schema.sql), so a
// user cannot reset their own count with the anon key — they have no write
// policy on the table, only the function can write it.

export const DEFAULT_DAILY_LIMIT = 100;

export function getDailyLimit(env: NodeJS.ProcessEnv = process.env): number {
  const raw = Number(env.OCR_DAILY_LIMIT);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_DAILY_LIMIT;
}

export type QuotaResult =
  | { allowed: true; used: number }
  | { allowed: false; used: number; message: string };

// `claim` increments today's counter and returns the new total. Injected so
// this decision is testable without a database.
export async function claimQuota(
  claim: () => Promise<{ used: number | null; error: string | null }>,
  limit: number = getDailyLimit()
): Promise<QuotaResult> {
  const { used, error } = await claim();

  // Fail open on an infrastructure error: a broken counter should not stop
  // the shop owner recording receipts. Abuse is bounded by login + rate
  // limiting upstream, and the failure is logged server-side.
  if (error != null || used == null) {
    return { allowed: true, used: 0 };
  }

  if (used > limit) {
    return {
      allowed: false,
      used,
      message: `วันนี้สแกนครบ ${limit} ใบแล้ว — ลองใหม่พรุ่งนี้ หรือกรอกข้อมูลเอง`,
    };
  }
  return { allowed: true, used };
}
