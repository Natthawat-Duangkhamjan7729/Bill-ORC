import { isCategory } from "@/lib/categories";
import type { OcrResult } from "@/lib/types";

export const EXTRACTION_PROMPT = `You are a receipt-reading assistant. Extract the purchase data from this receipt photo. The receipt may be in Thai or English.

Reply with ONLY a JSON object — no markdown, no code fences, no explanations — in exactly this shape:

{
  "store_name": string or null,
  "purchase_date": "YYYY-MM-DD" or null,
  "category": string or null,
  "items": [
    { "item_name": string, "quantity": number, "unit_price": number or null, "total_price": number or null }
  ],
  "subtotal": number or null,
  "tax_amount": number or null,
  "total_amount": number or null
}

Rules:
- category is your best guess of what this purchase is for, from EXACTLY this list: "วัตถุดิบ" (ingredients/stock to resell or cook), "ค่าน้ำ/ค่าไฟ" (utility bills), "อุปกรณ์" (equipment/tools/supplies), "ค่าขนส่ง" (delivery/transport), "ค่าเช่า" (rent), "อื่น ๆ" (anything else). Use null only if you truly cannot tell.
- Use null for anything you cannot read; never invent values.
- Numbers must be plain numbers without currency symbols or thousand separators.
- Thai dates are often day/month/year and may use the Buddhist year (พ.ศ. = ค.ศ. + 543); convert to the Gregorian YYYY-MM-DD.
- quantity defaults to 1 when the receipt does not show one.
- Keep item names exactly as printed (do not translate).`;

export type Provider = {
  source: "local" | "cloud";
  label: string;
  baseUrl: string;
  model: string;
  apiKey?: string;
  timeoutMs: number;
};

const LOCAL_HOST = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\]|0\.0\.0\.0)(:|\/|$)/;

// Carries two messages: one safe to show the user, one for the server log.
// Upstream replies, provider URLs and model names stay in `detail` only —
// they can contain keys, internal hostnames, or raw gateway errors.
export class OcrError extends Error {
  constructor(
    readonly clientMessage: string,
    readonly detail: string
  ) {
    super(detail);
    this.name = "OcrError";
  }
}

const GENERIC_FAIL = "อ่านใบเสร็จไม่สำเร็จ กรุณาลองใหม่ หรือกรอกข้อมูลเอง";

// Primary first. A provider is skipped when its base URL or model is unset,
// so the Vercel deployment (cloud only) and a laptop running a local model
// with a cloud safety net share the same code path.
export function getProviders(env: NodeJS.ProcessEnv = process.env): Provider[] {
  const providers: Provider[] = [];

  if (env.OCR_BASE_URL && env.OCR_MODEL) {
    // A model served from this machine gets a shorter leash so a fallback
    // attempt still fits inside the route's maxDuration.
    const isLocal = LOCAL_HOST.test(env.OCR_BASE_URL);
    providers.push({
      source: isLocal ? "local" : "cloud",
      label: isLocal ? "AI ในเครื่อง" : "AI บนคลาวด์",
      baseUrl: env.OCR_BASE_URL,
      model: env.OCR_MODEL,
      apiKey: env.OCR_API_KEY,
      timeoutMs: isLocal ? 180_000 : 240_000,
    });
  }

  if (env.OCR_FALLBACK_BASE_URL && env.OCR_FALLBACK_MODEL) {
    providers.push({
      source: LOCAL_HOST.test(env.OCR_FALLBACK_BASE_URL) ? "local" : "cloud",
      label: "AI สำรอง",
      baseUrl: env.OCR_FALLBACK_BASE_URL,
      model: env.OCR_FALLBACK_MODEL,
      apiKey: env.OCR_FALLBACK_API_KEY,
      timeoutMs: 240_000,
    });
  }

  return providers;
}

// Calls one provider and returns the parsed receipt. Throws on any failure so
// the caller can move on to the next provider.
export async function callProvider(
  provider: Provider,
  image: string
): Promise<OcrResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  // Ollama needs no key; only send the header when one is configured.
  if (provider.apiKey) {
    headers.Authorization = `Bearer ${provider.apiKey}`;
  }

  let aiResponse: Response;
  try {
    // Ask for a STREAMING response. Long receipts make the model write for
    // a minute or more; with a non-streaming request the connection sits
    // silent the whole time and gateway proxies drop it ("fetch failed").
    // Streaming keeps bytes flowing, so the connection stays up.
    aiResponse = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(provider.timeoutMs),
      body: JSON.stringify({
        model: provider.model,
        stream: true,
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
        ? `ไม่ตอบกลับใน ${Math.round(provider.timeoutMs / 1000)} วินาที`
        : e instanceof Error
          ? e.message
          : String(e);
    throw new OcrError(
      "เชื่อมต่อบริการอ่านใบเสร็จไม่ได้ กรุณาลองใหม่",
      `${provider.label} [${provider.model}] unreachable: ${reason}`
    );
  }

  if (!aiResponse.ok) {
    const detail = await aiResponse.text();
    throw new OcrError(
      GENERIC_FAIL,
      `${provider.label} [${provider.model}] HTTP ${aiResponse.status}: ${detail.slice(0, 300)}`
    );
  }

  const raw = await aiResponse.text();
  const contentType = aiResponse.headers.get("content-type") ?? "";
  let text: string;
  if (contentType.includes("event-stream") || raw.startsWith("data:")) {
    // Server-sent events: one "data: {json}" line per token chunk.
    let assembled = "";
    for (const line of raw.split("\n")) {
      const payload = line.trim().replace(/^data:\s*/, "");
      if (!payload || payload === "[DONE]" || !line.trim().startsWith("data:"))
        continue;
      try {
        const chunk = JSON.parse(payload);
        assembled +=
          chunk.choices?.[0]?.delta?.content ??
          chunk.choices?.[0]?.message?.content ??
          "";
      } catch {
        // Ignore malformed keep-alive fragments.
      }
    }
    text = assembled;
  } else {
    // Some gateways ignore stream:true and reply with plain JSON.
    const completion = JSON.parse(raw);
    text = completion.choices?.[0]?.message?.content ?? "";
  }

  if (!text) {
    throw new OcrError(
      GENERIC_FAIL,
      `${provider.label} [${provider.model}] returned an empty reply`
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
    throw new OcrError(
      GENERIC_FAIL,
      `${provider.label} [${provider.model}] unparseable reply: ${cleaned.slice(0, 300)}`
    );
  }

  // Normalize so the frontend can rely on the shape.
  result.category = isCategory(result.category) ? result.category : null;
  result.items = Array.isArray(result.items) ? result.items : [];
  result.items = result.items.map((item) => ({
    item_name: String(item.item_name ?? ""),
    quantity: Number(item.quantity) || 1,
    unit_price: item.unit_price == null ? null : Number(item.unit_price),
    total_price: item.total_price == null ? null : Number(item.total_price),
  }));

  // A parsed-but-empty answer is the common small-model failure and is no use
  // to anyone — treat it as a miss so the next provider gets a turn.
  if (result.total_amount == null && result.items.length === 0) {
    throw new OcrError(
      "อ่านใบเสร็จนี้ไม่ออก — ลองถ่ายใหม่ให้ชัดขึ้น หรือกรอกข้อมูลเอง",
      `${provider.label} [${provider.model}] parsed but empty (no total, no items)`
    );
  }

  result.source = provider.source;
  return result;
}

// Walks the provider list in order, returning the first usable read.
// On total failure it returns a message safe to show the user plus a
// server-only detail string naming every provider that was tried and why
// it failed.
export async function runOcr(
  image: string,
  providers: Provider[]
): Promise<
  { result: OcrResult } | { clientError: string; detail: string }
> {
  const details: string[] = [];
  let lastClientMessage = "อ่านใบเสร็จไม่สำเร็จ กรุณาลองใหม่ หรือกรอกข้อมูลเอง";

  for (const provider of providers) {
    try {
      return { result: await callProvider(provider, image) };
    } catch (e) {
      if (e instanceof OcrError) {
        lastClientMessage = e.clientMessage;
        details.push(e.detail);
      } else {
        details.push(e instanceof Error ? e.message : String(e));
      }
    }
  }

  return {
    clientError: lastClientMessage,
    detail:
      details.length > 0
        ? details.join(" | ")
        : "no OCR provider configured",
  };
}
