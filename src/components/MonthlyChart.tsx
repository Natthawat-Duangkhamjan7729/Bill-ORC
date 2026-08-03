"use client";

import { useState } from "react";

export interface MonthTotal {
  key: string; // "2026-08"
  label: string; // "Aug"
  year: number;
  total: number;
  count: number;
}

const W = 640;
const H = 240;
const PAD = { top: 16, right: 8, bottom: 24, left: 44 };

// Round to a tidy axis ceiling (1/2/5 × 10^n above the max value).
function niceMax(max: number): number {
  if (max <= 0) return 10;
  const pow = Math.pow(10, Math.floor(Math.log10(max)));
  for (const m of [1, 2, 5, 10]) {
    if (m * pow >= max) return m * pow;
  }
  return 10 * pow;
}

// Bar with a 4px rounded top, flat bottom anchored to the baseline.
function barPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h);
  return [
    `M${x},${y + h}`,
    `L${x},${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `L${x + w - r},${y}`,
    `Q${x + w},${y} ${x + w},${y + r}`,
    `L${x + w},${y + h}`,
    "Z",
  ].join(" ");
}

export default function MonthlyChart({ months }: { months: MonthTotal[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const yMax = niceMax(Math.max(...months.map((m) => m.total)));
  const slot = plotW / months.length;
  const barW = Math.min(32, slot - 2); // ≥2px gap between bars
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * yMax);
  const hovered = hover !== null ? months[hover] : null;

  return (
    <div className="viz-root rounded-2xl p-4 shadow-sm">
      <style>{`
        .viz-root {
          color-scheme: light;
          background: #fcfcfb;
          --series-1: #2a78d6;
          --ink-primary: #0b0b0b;
          --ink-muted: #898781;
          --gridline: #e1e0d9;
          --baseline: #c3c2b7;
          --tooltip-bg: #0b0b0b;
          --tooltip-ink: #ffffff;
        }
        @media (prefers-color-scheme: dark) {
          .viz-root {
            color-scheme: dark;
            background: #1a1a19;
            --series-1: #3987e5;
            --ink-primary: #ffffff;
            --gridline: #2c2c2a;
            --baseline: #383835;
            --tooltip-bg: #ffffff;
            --tooltip-ink: #0b0b0b;
          }
        }
      `}</style>

      <h2 className="mb-2 text-sm font-medium" style={{ color: "var(--ink-primary)" }}>
        Spending by month
      </h2>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label="Bar chart of total spending per month for the last 12 months"
          onMouseLeave={() => setHover(null)}
        >
          {/* Gridlines + y labels */}
          {ticks.map((t) => {
            const y = PAD.top + plotH - (t / yMax) * plotH;
            return (
              <g key={t}>
                <line
                  x1={PAD.left}
                  x2={W - PAD.right}
                  y1={y}
                  y2={y}
                  stroke={t === 0 ? "var(--baseline)" : "var(--gridline)"}
                  strokeWidth={1}
                />
                <text
                  x={PAD.left - 6}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize={10}
                  fill="var(--ink-muted)"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {t >= 1000 ? `${t / 1000}k` : t}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {months.map((m, i) => {
            const h = (m.total / yMax) * plotH;
            const x = PAD.left + i * slot + (slot - barW) / 2;
            const y = PAD.top + plotH - h;
            return (
              <g key={m.key}>
                {/* Oversized invisible hit target */}
                <rect
                  x={PAD.left + i * slot}
                  y={PAD.top}
                  width={slot}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                />
                {m.total > 0 && (
                  <path
                    d={barPath(x, y, barW, h)}
                    fill="var(--series-1)"
                    opacity={hover === null || hover === i ? 1 : 0.45}
                    pointerEvents="none"
                  />
                )}
                <text
                  x={PAD.left + i * slot + slot / 2}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--ink-muted)"
                >
                  {m.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hovered && (
          <div
            className="pointer-events-none absolute -top-1 rounded-lg px-2.5 py-1.5 text-xs shadow"
            style={{
              background: "var(--tooltip-bg)",
              color: "var(--tooltip-ink)",
              left: `${((PAD.left + (hover! + 0.5) * slot) / W) * 100}%`,
              transform: "translateX(-50%)",
            }}
          >
            <span className="font-medium">
              {hovered.label} {hovered.year}
            </span>
            : {hovered.total.toFixed(2)}
            {hovered.count > 0 && (
              <span style={{ opacity: 0.7 }}> · {hovered.count} receipt{hovered.count === 1 ? "" : "s"}</span>
            )}
          </div>
        )}
      </div>

      {/* Table view (accessibility fallback for the chart) */}
      <details className="mt-3">
        <summary
          className="cursor-pointer text-xs"
          style={{ color: "var(--ink-muted)" }}
        >
          View as table
        </summary>
        <table className="mt-2 w-full text-sm" style={{ color: "var(--ink-primary)" }}>
          <thead>
            <tr style={{ color: "var(--ink-muted)" }}>
              <th className="py-1 text-left text-xs font-medium">Month</th>
              <th className="py-1 text-right text-xs font-medium">Receipts</th>
              <th className="py-1 text-right text-xs font-medium">Total</th>
            </tr>
          </thead>
          <tbody style={{ fontVariantNumeric: "tabular-nums" }}>
            {months.map((m) => (
              <tr key={m.key}>
                <td className="py-0.5">
                  {m.label} {m.year}
                </td>
                <td className="py-0.5 text-right">{m.count}</td>
                <td className="py-0.5 text-right">{m.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
