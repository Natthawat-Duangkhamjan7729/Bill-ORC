import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { OcrResult } from "@/lib/types";

// Allow up to 60s — vision models can take a while on large receipts.
export const maxDuration = 60;

const EXTRACTION_PROMPT = `You are a receipt-reading assistant. Extract the purchase data from this receipt photo. The receipt may be in Thai or English.

Reply with ONLY a JSON object — no markdown, no code fences, no explanations — in exactly this shape:

{
  "store_name": string or null,
  "purchase_date": "YYYY-MM-DD" or null,
  "items": [
    { "item_name": string, "quantity": number, "unit_price": number or null, "total_price": number or null }
  ],
  "subtotal": number or null,
  "tax_amount": number or null,
  "total_amount": number or null
}

Rules:
- Use null for anything you cannot read; never invent values.
- Numbers must be plain numbers without currency symbols or thousand separators.
- Thai dates are often day/month/year and may use the Buddhist year (พ.ศ. = ค.ศ. + 543); convert to the Gregorian YYYY-MM-DD.
- quantity defaults to 1 when the receipt does not show one.
- Keep item names exactly as printed (do not translate).`;

export async function POST(request: Request) {
  // Only logged-in users may call this (it spends API quota).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const apiKey = process.env.OCR_API_KEY;
  const baseUrl = process.env.OCR_BASE_URL;
  const model = process.env.OCR_MODEL;
  if (!apiKey || !baseUrl || !model) {
    return NextResponse.json(
      {
        error:
          "OCR is not configured. Add OCR_API_KEY, OCR_BASE_URL and OCR_MODEL to .env.local and restart the dev server.",
      },
      { status: 500 }
    );
  }

  let image: string;
  try {
    const body = await request.json();
    image = body.image;
    if (typeof image !== "string" || !image.startsWith("data:image/")) {
      throw new Error("bad image");
    }
  } catch {
    return NextResponse.json(
      { error: "Send JSON like { image: 'data:image/jpeg;base64,...' }" },
      { status: 400 }
    );
  }

  let aiResponse: Response;
  try {
    aiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      // Give up before the serverless function itself is killed (60s),
      // so the user gets a real error message instead of a platform timeout.
      signal: AbortSignal.timeout(50_000),
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: EXTRACTION_PROMPT },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
      }),
    });
  } catch (e) {
    const reason =
      e instanceof Error && e.name === "TimeoutError"
        ? "the AI service took more than 50 seconds to answer"
        : e instanceof Error
          ? e.message
          : String(e);
    return NextResponse.json(
      { error: `Could not reach the AI service from the server: ${reason}` },
      { status: 502 }
    );
  }

  if (!aiResponse.ok) {
    const detail = await aiResponse.text();
    return NextResponse.json(
      { error: `AI service error (${aiResponse.status}): ${detail.slice(0, 300)}` },
      { status: 502 }
    );
  }

  const completion = await aiResponse.json();
  const text: string | undefined = completion.choices?.[0]?.message?.content;
  if (!text) {
    return NextResponse.json(
      { error: "AI service returned an empty reply" },
      { status: 502 }
    );
  }

  // Models sometimes wrap JSON in ```json fences despite instructions.
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  let result: OcrResult;
  try {
    result = JSON.parse(cleaned);
  } catch {
    return NextResponse.json(
      { error: `Could not understand the AI reply: ${cleaned.slice(0, 300)}` },
      { status: 502 }
    );
  }

  // Normalize so the frontend can rely on the shape.
  result.items = Array.isArray(result.items) ? result.items : [];
  result.items = result.items.map((item) => ({
    item_name: String(item.item_name ?? ""),
    quantity: Number(item.quantity) || 1,
    unit_price: item.unit_price == null ? null : Number(item.unit_price),
    total_price: item.total_price == null ? null : Number(item.total_price),
  }));

  return NextResponse.json(result);
}
