// Shrinks a photo before sending it to OCR / storage.
// Phone photos are often 5-15 MB; the Claude API accepts images up to 5 MB,
// and ~1500px on the longest side is plenty for reading receipt text.
const MAX_DIMENSION = 1568;
const JPEG_QUALITY = 0.85;

export type PreparedImage = {
  blob: Blob;
  dataUrl: string; // for previewing in an <img> tag and for the OCR API
};

export async function prepareImage(file: File): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(file);

  const scale = Math.min(
    1,
    MAX_DIMENSION / Math.max(bitmap.width, bitmap.height)
  );
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not process image"))),
      "image/jpeg",
      JPEG_QUALITY
    );
  });

  return { blob, dataUrl };
}
