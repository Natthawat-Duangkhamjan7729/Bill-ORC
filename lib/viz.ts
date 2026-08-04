// Chart colors, validated for colorblind separation and contrast against the
// white card surface (adjacent-pair CVD ΔE 9.2, normal-vision ΔE 27.6).
// The green sits just under 3:1 contrast, so every chart using it also ships
// a legend, direct labels and a table view — never color alone.
export const VIZ = {
  income: "#1baf7a",
  expense: "#eb6834",
  neutral: "#2a78d6",
  grid: "#e1e0d9",
  axis: "#c3c2b7",
  muted: "#898781",
} as const;

export function formatBaht(n: number): string {
  return `฿${n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Whole baht — for stat tiles, where satang is noise and the extra
// characters push the value into truncation on narrow screens.
export function formatBahtWhole(n: number): string {
  return `฿${Math.round(n).toLocaleString("th-TH")}`;
}

// Compact form for axis ticks and tight stat tiles: ฿12.3พ / ฿1.2ล
export function formatBahtShort(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `฿${(n / 1_000_000).toFixed(1)}ล`;
  if (abs >= 1_000) return `฿${(n / 1_000).toFixed(1)}พ`;
  return `฿${Math.round(n)}`;
}

export function monthLabelTh(key: string): string {
  return new Date(key + "-01T00:00:00").toLocaleDateString("th-TH", {
    month: "short",
    year: "2-digit",
  });
}
