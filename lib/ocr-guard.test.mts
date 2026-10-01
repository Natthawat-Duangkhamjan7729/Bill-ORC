import assert from "node:assert/strict";
import {
  sniffImageType,
  checkUpload,
  getMaxBytes,
  DEFAULT_MAX_BYTES,
} from "./image-check.ts";
import { claimQuota, getDailyLimit, DEFAULT_DAILY_LIMIT } from "./ocr-quota.ts";

let pass = 0;
const check = (name: string, fn: () => void) => {
  fn();
  console.log(`  ok  ${name}`);
  pass++;
};
const checkAsync = async (name: string, fn: () => Promise<void>) => {
  await fn();
  console.log(`  ok  ${name}`);
  pass++;
};

const jpeg = (n = 64) => {
  const b = new Uint8Array(n);
  b.set([0xff, 0xd8, 0xff]);
  return b;
};
const png = () => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const webp = () => {
  const b = new Uint8Array(32);
  b.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
  b.set([0x57, 0x45, 0x42, 0x50], 8); // WEBP
  return b;
};

// --- magic byte sniffing ---------------------------------------------
check("detects JPEG", () => assert.equal(sniffImageType(jpeg()), "image/jpeg"));
check("detects PNG", () => assert.equal(sniffImageType(png()), "image/png"));
check("detects WebP", () => assert.equal(sniffImageType(webp()), "image/webp"));

check("rejects a RIFF container that is not WebP (e.g. WAV)", () => {
  const b = new Uint8Array(32);
  b.set([0x52, 0x49, 0x46, 0x46], 0);
  b.set([0x57, 0x41, 0x56, 0x45], 8); // WAVE
  assert.equal(sniffImageType(b), null);
});
check("rejects an SVG (script-capable, not in the allow list)", () => {
  assert.equal(sniffImageType(new TextEncoder().encode("<svg xmlns=...")), null);
});
check("rejects a PDF", () => {
  assert.equal(sniffImageType(new TextEncoder().encode("%PDF-1.7")), null);
});
check("rejects a GIF (not in the allow list)", () => {
  assert.equal(sniffImageType(new TextEncoder().encode("GIF89a")), null);
});
check("rejects truncated data that only starts like a PNG", () => {
  assert.equal(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e])), null);
});

// --- checkUpload ------------------------------------------------------
check("accepts a normal JPEG", () => {
  const r = checkUpload(jpeg(), 1024);
  assert.ok(r.ok && r.type === "image/jpeg");
});
check("rejects an empty upload", () => {
  const r = checkUpload(new Uint8Array(0), 1024);
  assert.ok(!r.ok && r.status === 400);
});
check("rejects an oversize upload with 413 and a Thai message", () => {
  const r = checkUpload(jpeg(5000), 1024);
  assert.ok(!r.ok);
  assert.equal(r.status, 413);
  assert.match(r.message, /ใหญ่เกินไป/);
});
check("size is checked before format, so a huge non-image reports 413", () => {
  const junk = new Uint8Array(5000);
  const r = checkUpload(junk, 1024);
  assert.ok(!r.ok && r.status === 413);
});
check("rejects a wrong type with 400 and a Thai message", () => {
  const r = checkUpload(new TextEncoder().encode("%PDF-1.7"), 1024);
  assert.ok(!r.ok);
  assert.equal(r.status, 400);
  assert.match(r.message, /JPEG/);
});
check("a file exactly at the limit is allowed", () => {
  assert.ok(checkUpload(jpeg(1024), 1024).ok);
});

// --- limits from env --------------------------------------------------
check("max bytes defaults to 4 MB", () => {
  assert.equal(getMaxBytes({} as NodeJS.ProcessEnv), DEFAULT_MAX_BYTES);
});
check("max bytes honors OCR_MAX_BYTES", () => {
  assert.equal(getMaxBytes({ OCR_MAX_BYTES: "1000" } as NodeJS.ProcessEnv), 1000);
});
check("junk or non-positive OCR_MAX_BYTES falls back to the default", () => {
  assert.equal(getMaxBytes({ OCR_MAX_BYTES: "abc" } as NodeJS.ProcessEnv), DEFAULT_MAX_BYTES);
  assert.equal(getMaxBytes({ OCR_MAX_BYTES: "0" } as NodeJS.ProcessEnv), DEFAULT_MAX_BYTES);
  assert.equal(getMaxBytes({ OCR_MAX_BYTES: "-5" } as NodeJS.ProcessEnv), DEFAULT_MAX_BYTES);
});
check("daily limit defaults to 100 and honors OCR_DAILY_LIMIT", () => {
  assert.equal(getDailyLimit({} as NodeJS.ProcessEnv), DEFAULT_DAILY_LIMIT);
  assert.equal(getDailyLimit({ OCR_DAILY_LIMIT: "5" } as NodeJS.ProcessEnv), 5);
  assert.equal(getDailyLimit({ OCR_DAILY_LIMIT: "x" } as NodeJS.ProcessEnv), DEFAULT_DAILY_LIMIT);
});

// --- daily quota ------------------------------------------------------
await checkAsync("first scan of the day is allowed", async () => {
  const r = await claimQuota(async () => ({ used: 1, error: null }), 100);
  assert.ok(r.allowed);
});
await checkAsync("a scan exactly at the limit is still allowed", async () => {
  const r = await claimQuota(async () => ({ used: 100, error: null }), 100);
  assert.ok(r.allowed);
});
await checkAsync("one past the limit is refused with a Thai message", async () => {
  const r = await claimQuota(async () => ({ used: 101, error: null }), 100);
  assert.ok(!r.allowed);
  assert.match(r.message, /ครบ 100 ใบแล้ว/);
});
await checkAsync("a batch of 20 stays under a 100/day limit", async () => {
  let used = 0;
  for (let i = 0; i < 20; i++) {
    const r = await claimQuota(async () => ({ used: ++used, error: null }), 100);
    assert.ok(r.allowed, `batch item ${i + 1} was blocked`);
  }
});
await checkAsync("a broken counter fails open rather than blocking work", async () => {
  const r = await claimQuota(async () => ({ used: null, error: "db down" }), 100);
  assert.ok(r.allowed);
});

console.log(`\n${pass} checks passed`);
