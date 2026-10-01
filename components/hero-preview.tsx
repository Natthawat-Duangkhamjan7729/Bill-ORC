import { IconReceipt, IconTrend } from "@/components/icons";

// A static rendering of the overview screen, used as the hero visual.
// Values are illustrative sample data, matching the real screen's layout.
const MONTHS = [
  { label: "เม.ย.", income: 52, expense: 44 },
  { label: "พ.ค.", income: 40, expense: 43 },
  { label: "มิ.ย.", income: 61, expense: 39 },
  { label: "ก.ค.", income: 57, expense: 35 },
  { label: "ส.ค.", income: 64, expense: 41 },
];

const MAX = 70;

export default function HeroPreview() {
  return (
    <div className="relative">
      {/* Main panel */}
      {/* pb on sm+ reserves the strip the floating card overlaps, so it
          never covers the month labels. */}
      <div className="rounded-card border border-white/10 bg-surface-raised p-5 shadow-lift sm:p-6 sm:pb-24">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-caption text-ink-450">ภาพรวม · สิงหาคม</p>
            <p className="text-h3 font-bold tracking-tight text-ink-900">
              ฿23,100
            </p>
            <p className="text-caption text-ink-450">กำไรเดือนนี้</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-brand-50 px-3 py-1.5 text-caption font-semibold text-brand-600">
            <IconTrend className="h-3.5 w-3.5" />
            +18%
          </span>
        </div>

        {/* Mini paired-bar chart, same encoding as the real app */}
        <div className="mt-6">
          <div className="flex items-center gap-4 text-caption text-ink-450">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-money-in" />
              รายรับ
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-money-out" />
              รายจ่าย
            </span>
          </div>

          <div className="mt-3 flex h-28 items-end gap-2.5 border-b border-line">
            {MONTHS.map((m) => (
              <div
                key={m.label}
                className="flex h-full flex-1 items-end justify-center gap-1"
              >
                <div
                  className="w-full max-w-[0.6rem] rounded-t bg-money-in"
                  style={{ height: `${(m.income / MAX) * 100}%` }}
                />
                <div
                  className="w-full max-w-[0.6rem] rounded-t bg-money-out"
                  style={{ height: `${(m.expense / MAX) * 100}%` }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2.5">
            {MONTHS.map((m) => (
              <span
                key={m.label}
                className="flex-1 text-center text-caption text-ink-450"
              >
                {m.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Floating "just scanned" card — shows the core action paying off */}
      <div className="mt-4 flex items-center gap-3 rounded-card border border-white/10 bg-surface-raised p-4 shadow-lift sm:absolute sm:-bottom-6 sm:-left-8 sm:mt-0 sm:w-[19rem]">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <IconReceipt className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-small font-semibold text-ink-900">
            แม็คโคร สกลนคร
          </p>
          <p className="text-caption text-ink-450">
            อ่านได้ 18 รายการ · วัตถุดิบ
          </p>
        </div>
        <p className="ml-auto shrink-0 text-small font-bold tabular-nums text-ink-900">
          ฿4,844
        </p>
      </div>
    </div>
  );
}
