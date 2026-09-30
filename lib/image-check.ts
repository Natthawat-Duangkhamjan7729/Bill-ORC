// Upload guards for the OCR endpoint. Pure functions — no database, no
// network — so they can be tested directly.

export const DEFAULT_MAX_BYTES = 4 * 1024 * 1024; // 4 MB

// The client resizes to ~1568px before upload, so real receipts land far
// under the limit; this only stops someone posting a large file by hand.
export function getMaxBytes(env: NodeJS.ProcessEnv = process.env): number {
  const raw = Number(env.OCR_MAX_BYTES);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MAX_BYTES;
}

export type ImageType = "image/jpeg" | "image/png" | "image/webp";

// Identify the format from the file's own bytes. A declared Content-Type is
// attacker-controlled, so it is never trusted on its own.
export function sniffImageType(bytes: Uint8Array): ImageType | null {
  // JPEG: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= 8 && PNG.every((b, i) => bytes[i] === b)) {
    return "image/png";
  }
  // WebP: "RIFF" .... "WEBP"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export type UploadCheck =
  | { ok: true; type: ImageType }
  | { ok: false; status: 400 | 413; message: string };

// Thai messages — these go straight to the user.
export function checkUpload(
  bytes: Uint8Array,
  maxBytes: number = getMaxBytes()
): UploadCheck {
  if (bytes.length === 0) {
    return { ok: false, status: 400, message: "ไม่พบไฟล์รูป" };
  }
  if (bytes.length > maxBytes) {
    const mb = (maxBytes / (1024 * 1024)).toFixed(0);
    return {
      ok: false,
      status: 413,
      message: `รูปใหญ่เกินไป (จำกัด ${mb} MB) — ลองถ่ายใหม่หรือย่อรูปก่อน`,
    };
  }
  const type = sniffImageType(bytes);
  if (!type) {
    return {
      ok: false,
      status: 400,
      message: "รองรับเฉพาะรูปแบบ JPEG, PNG และ WebP เท่านั้น",
    };
  }
  return { ok: true, type };
}
