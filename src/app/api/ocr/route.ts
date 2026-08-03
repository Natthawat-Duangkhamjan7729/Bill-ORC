import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60; // allow up to 60s for OCR

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024; // Claude API image limit is ~5MB

// JSON schema the model's answer is guaranteed to match (structured outputs).
const RECEIPT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "store_name",
    "purchase_date",
    "items",
    "subtotal",
    "tax",
    "total_amount",
  ],
  properties: {
    store_name: { type: "string", description: "Name of the store" },
    purchase_date: {
      anyOf: [{ type: "string", format: "date" }, { type: "null" }],
      description: "Purchase date in YYYY-MM-DD, or null if not visible",
    },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["item_name", "quantity", "unit_price", "total_price"],
        properties: {
          item_name: { type: "string" },
          quantity: { type: "number" },
          unit_price: { anyOf: [{ type: "number" }, { type: "null" }] },
          total_price: { anyOf: [{ type: "number" }, { type: "null" }] },
        },
      },
    },
    subtotal: { anyOf: [{ type: "number" }, { type: "null" }] },
    tax: { anyOf: [{ type: "number" }, { type: "null" }] },
    total_amount: { anyOf: [{ type: "number" }, { type: "null" }] },
  },
} as const;

export async function POST(request: Request) {
  // Only signed-in users may call this route.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Server is missing ANTHROPIC_API_KEY. Add it to .env.local." },
      { status: 500 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Unsupported image type: ${file.type}. Use JPEG, PNG, or WebP.` },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Image is larger than 5MB. Please use a smaller photo." },
      { status: 400 }
    );
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 16000,
      output_config: { format: { type: "json_schema", schema: RECEIPT_SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: file.type as
                  | "image/jpeg"
                  | "image/png"
                  | "image/webp"
                  | "image/gif",
                data: base64,
              },
            },
            {
              type: "text",
              text: "Extract the itemized purchase data from this store receipt. Use the receipt's own currency amounts as plain numbers. If a value is not visible or unreadable, use null. For quantity, default to 1 when not shown.",
            },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json(
        { error: "The model declined to process this image. Try a clearer photo." },
        { status: 422 }
      );
    }

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No text returned from OCR" },
        { status: 502 }
      );
    }

    return NextResponse.json(JSON.parse(textBlock.text));
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "Invalid ANTHROPIC_API_KEY. Check .env.local." },
        { status: 500 }
      );
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "OCR service is rate-limited. Try again in a minute." },
        { status: 429 }
      );
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `OCR service error (${error.status}). Try again.` },
        { status: 502 }
      );
    }
    throw error;
  }
}
