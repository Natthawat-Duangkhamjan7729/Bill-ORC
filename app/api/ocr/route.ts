import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProviders, runOcr } from "@/lib/ocr";

// Allow up to 300s (Vercel Fluid compute limit) — a local vision model can
// take a minute or more, and a cloud fallback attempt has to fit after it.
export const maxDuration = 300;

export async function POST(request: Request) {
  // Only logged-in users may call this (it spends API quota).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const providers = getProviders();
  if (providers.length === 0) {
    return NextResponse.json(
      {
        error:
          "OCR is not configured. Add OCR_BASE_URL and OCR_MODEL to .env.local and restart the dev server.",
      },
      { status: 500 }
    );
  }

  let image: string;
  try {
    const formData = await request.formData();
    const file = formData.get("image");
    if (!(file instanceof Blob)) {
      throw new Error("bad image");
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "image/jpeg";
    image = `data:${mimeType};base64,${bytes.toString("base64")}`;
  } catch {
    return NextResponse.json(
      { error: "Send the photo as multipart form data under the 'image' field" },
      { status: 400 }
    );
  }

  const outcome = await runOcr(image, providers);
  if ("error" in outcome) {
    return NextResponse.json({ error: outcome.error }, { status: 502 });
  }
  return NextResponse.json(outcome.result);
}
