// Keeps raw database and auth errors out of the UI.
//
// Supabase/Postgres messages can name tables, columns, constraints and RLS
// policies. That is useful in a log and unhelpful — occasionally revealing —
// on screen, so the UI gets a short Thai sentence instead.

type MaybeError = { message?: unknown } | Error | null | undefined;

function rawMessage(error: MaybeError): string {
  if (!error) return "unknown error";
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return String(error);
}

// Logs the real cause (server console, or the browser console in client
// components) without putting it on screen.
export function reportError(scope: string, error: MaybeError): void {
  console.error(`[${scope}] ${rawMessage(error)}`);
}

// Auth errors are the one place a specific message helps the user act, so a
// few known cases are translated; anything else stays generic.
export function authErrorMessage(error: MaybeError): string {
  const m = rawMessage(error).toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
  }
  if (m.includes("email not confirmed")) {
    return "ยังไม่ได้ยืนยันอีเมล — กรุณาตรวจกล่องจดหมายของคุณ";
  }
  if (m.includes("already registered") || m.includes("already been registered")) {
    return "อีเมลนี้สมัครไว้แล้ว — ลองเข้าสู่ระบบแทน";
  }
  if (m.includes("password") && (m.includes("short") || m.includes("least"))) {
    return "รหัสผ่านสั้นเกินไป — ใช้อย่างน้อย 8 ตัวอักษร";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "ลองบ่อยเกินไป — รอสักครู่แล้วลองใหม่";
  }
  if (m.includes("invalid") && m.includes("email")) {
    return "รูปแบบอีเมลไม่ถูกต้อง";
  }
  return "ดำเนินการไม่สำเร็จ กรุณาลองใหม่";
}
