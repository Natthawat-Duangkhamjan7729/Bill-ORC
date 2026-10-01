import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProviders, runOcr } from "@/lib/ocr";
import { checkUpload, getMaxBytes } from "@/lib/image-check";
import { claimQuota, getDailyLimit } from "@/lib/ocr-quota";

// Allow up to 300s (Vercel Fluid compute limit) — a local vision model can
// take a minute or more, and a cloud fallback attempt has to fit after it.
export const maxDuration = 300;

// Details never go to the client: upstream replies can carry provider URLs,
// model names or key fragments. They go to the server log instead.
function logOcrFailure(userId: string, detail: string) {
  console.error(`[ocr] user=${userId} ${detail}`);
}

export async function POST(request: Request) {
  // Only logged-in users may call this (it spends AI quota).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const providers = getProviders();
  if (providers.length === 0) {
    console.error("[ocr] no provider configured (OCR_BASE_URL / OCR_MODEL)");
    return NextResponse.json(
      { error: "ระบบอ่านใบเสร็จยังไม่พร้อมใช้งาน" },
      { status: 503 }
    );
  }

  // Read the upload and validate it before spending any quota.
  let bytes: Uint8Array;
  try {
    const formData = await request.formData();
    const file = formData.get("image");
    if (!(file instanceof Blob)) {
      throw new Error("no image field");
    }
    // Cheap rejection before buffering the whole body.
    if (file.size > getMaxBytes()) {
      const mb = (getMaxBytes() / (1024 * 1024)).toFixed(0);
      return NextResponse.json(
        { error: `รูปใหญ่เกินไป (จำกัด ${mb} MB) — ลองถ่ายใหม่หรือย่อรูปก่อน` },
        { status: 413 }
      );
    }
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return NextResponse.json(
      { error: "ส่งรูปไม่ถูกต้อง กรุณาลองใหม่" },
      { status: 400 }
    );
  }

  // Size again against the real bytes, then the format from the bytes
  // themselves — a declared Content-Type is attacker-controlled.
  const check = checkUpload(bytes);
  if (!check.ok) {
    return NextResponse.json({ error: check.message }, { status: check.status });
  }

  // Daily cap per account. Claimed before the AI call, so a flood of
  // requests cannot outrun the counter.
  const quota = await claimQuota(async () => {
    const { data, error } = await supabase.rpc("claim_ocr_quota");
    if (error) {
      console.error(`[ocr] quota rpc failed for user=${user.id}: ${error.message}`);
      return { used: null, error: error.message };
    }
    return { used: typeof data === "number" ? data : null, error: null };
  }, getDailyLimit());

  if (!quota.allowed) {
    return NextResponse.json({ error: quota.message }, { status: 429 });
  }

  const image = `data:${check.type};base64,${Buffer.from(bytes).toString("base64")}`;

  const outcome = await runOcr(image, providers);
  if ("clientError" in outcome) {
    logOcrFailure(user.id, outcome.detail);
    return NextResponse.json({ error: outcome.clientError }, { status: 502 });
  }
  return NextResponse.json(outcome.result);
}
