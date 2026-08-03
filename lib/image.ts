// Shrinks a photo before sending it to OCR / storage.
// Phone photos are often 5-15 MB. Two versions are produced:
//  - dataUrl: ~1568px for the OCR model (needs detail to read small print)
//  - blob:    ~1100px, stronger compression, for long-term storage —
//             keeps Supabase storage usage roughly 3x smaller.
const OCR_MAX_DIMENSION = 1568;
const OCR_JPEG_QUALITY = 0.85;
const STORE_MAX_DIMENSION = 1100;
const STORE_JPEG_QUALITY = 0.7;

export type PreparedImage = {
  blob: Blob;
  dataUrl: string; // for previewing in an <img> tag and for the OCR API
};

function drawScaled(
  bitmap: ImageBitmap,
  maxDimension: number
): HTMLCanvasElement {
  const scale = Math.min(
    1,
    maxDimension / Math.max(bitmap.width, bitmap.height)
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(file);

  const ocrCanvas = drawScaled(bitmap, OCR_MAX_DIMENSION);
  const storeCanvas = drawScaled(bitmap, STORE_MAX_DIMENSION);
  bitmap.close();

  const dataUrl = ocrCanvas.toDataURL("image/jpeg", OCR_JPEG_QUALITY);

  const blob = await new Promise<Blob>((resolve, reject) => {
    storeCanvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not process image"))),
      "image/jpeg",
      STORE_JPEG_QUALITY
    );
  });

  return { blob, dataUrl };
}
