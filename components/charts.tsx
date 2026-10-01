import { VIZ, formatBaht, formatBahtShort } from "@/lib/viz";

export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`card p-5 ${className}`}
    >
      {title && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-small font-semibold text-ink-900">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  icon,
  tint,
  valueClass = "text-ink-900",
  hint,
}: {
  label: string;
  value: string;
  icon: string;
  tint: string;
  valueClass?: string;
  hint?: string;
}) {
  return (
    <div className="card flex items-center gap-2.5 p-4 sm:gap-3.5">
      <span
        aria-hidden
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-small sm:h-11 sm:w-11 sm:text-lead ${tint}`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p
          className={`truncate text-lead font-bold tabular-nums tracking-tight sm:text-h4 ${valueClass}`}
        >
          {value}
        </p>
        <p className="truncate text-caption text-ink-450">{label}</p>
        {hint && <p className="text-caption text-ink-450">{hint}</p>}
      </div>
    </div>
  );
}

export function Legend({
  items,
}: {
  items: { color: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-caption text-ink-600">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export type MonthPoint = { key: string; label: string; income: number; expense: number };

// Paired bars: income beside expense, one pair per month. Both series are
// named in the legend and the values are available on hover and in the
// table beneath, so identity never rests on color alone.
export function IncomeExpenseBars({ months }: { months: MonthPoint[] }) {
  const max = Math.max(...months.flatMap((m) => [m.income, m.expense]), 0);
  const ticks = [max, max / 2, 0];

  return (
    <figure className="flex flex-col gap-3">
      <Legend
        items={[
          { color: VIZ.income, label: "รายรับ (ขาย)" },
          { color: VIZ.expense, label: "รายจ่าย (ใบเสร็จ)" },
        ]}
      />

      <div className="flex gap-2">
        {/* Y axis */}
        <div
          className="flex w-12 shrink-0 flex-col justify-between py-0 text-right text-micro tabular-nums"
          style={{ height: "11rem", color: VIZ.muted }}
        >
          {ticks.map((t, i) => (
            <span key={i}>{max > 0 ? formatBahtShort(t) : ""}</span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div
            className="relative flex items-end gap-1.5"
            style={{ height: "11rem" }}
            role="img"
            aria-label={`กราฟแท่งเปรียบเทียบรายรับกับรายจ่าย ${months.length} เดือน`}
          >
            {/* Recessive gridlines behind the marks */}
            <div aria-hidden className="absolute inset-0 flex flex-col justify-between">
              {ticks.map((_, i) => (
                <div
                  key={i}
                  style={{
                    borderTop: `1px ${i === ticks.length - 1 ? "solid" : "dashed"} ${i === ticks.length - 1 ? VIZ.axis : VIZ.grid}`,
                  }}
                />
              ))}
            </div>

            {months.map((month) => (
              <div
                key={month.key}
                className="group relative flex h-full flex-1 items-end justify-center gap-0.5"
              >
                {/* Tooltip on hover / focus */}
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink-900 px-2.5 py-1.5 text-caption text-white shadow-lift group-hover:block">
                  <p className="font-semibold">{month.label}</p>
                  <p>รายรับ {formatBaht(month.income)}</p>
                  <p>รายจ่าย {formatBaht(month.expense)}</p>
                  <p className="mt-0.5 border-t border-white/20 pt-0.5">
                    กำไร {formatBaht(month.income - month.expense)}
                  </p>
                </div>

                {[
                  { v: month.income, c: VIZ.income },
                  { v: month.expense, c: VIZ.expense },
                ].map((bar, i) => (
                  <div
                    key={i}
                    className="w-full max-w-4"
                    style={{
                      height: `${max > 0 ? Math.max((bar.v / max) * 100, bar.v > 0 ? 1.5 : 0) : 0}%`,
                      background: bar.c,
                      borderRadius: "4px 4px 0 0",
                    }}
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="mt-1.5 flex gap-1.5">
            {months.map((month) => (
              <span
                key={month.key}
                className="flex-1 truncate text-center text-micro"
                style={{ color: VIZ.muted }}
              >
                {month.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
}

// Two-slice donut with the ratio called out in the middle.
export function RatioDonut({
  income,
  expense,
}: {
  income: number;
  expense: number;
}) {
  const total = income + expense;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const profit = income - expense;

  // Each arc is drawn short of its true length so a 2px slice of the card
  // surface shows between the two fills (only when both are present).
  const gap = income > 0 && expense > 0 ? 2 : 0;
  const incomeLen = total > 0 ? (income / total) * circumference : 0;
  const arcs = [
    { len: incomeLen, start: 0, color: VIZ.income },
    { len: circumference - incomeLen, start: incomeLen, color: VIZ.expense },
  ].filter((a) => a.len > 0);

  return (
    <figure className="flex flex-col items-center gap-3">
      <div className="relative">
        <svg width="140" height="140" viewBox="0 0 140 140" role="img"
          aria-label={`สัดส่วนรายรับ ${formatBaht(income)} ต่อรายจ่าย ${formatBaht(expense)}`}>
          {total <= 0 && (
            <circle
              cx="70" cy="70" r={radius} fill="none"
              stroke={VIZ.grid} strokeWidth="16"
            />
          )}
          {arcs.map((arc) => {
            const drawn = Math.max(arc.len - gap, 0.5);
            return (
              <circle
                key={arc.color}
                cx="70" cy="70" r={radius} fill="none"
                stroke={arc.color} strokeWidth="16" strokeLinecap="butt"
                strokeDasharray={`${drawn} ${circumference - drawn}`}
                strokeDashoffset={-(arc.start + gap / 2)}
                transform="rotate(-90 70 70)"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-caption text-ink-450">กำไร</span>
          <span
            className={`text-small font-bold tracking-tight ${profit >= 0 ? "text-brand-700" : "text-red-600"}`}
          >
            {formatBahtShort(profit)}
          </span>
        </div>
      </div>

      {/* Direct labels — the green slice is below 3:1 on white, so values
          are always spelled out rather than left to the swatch. */}
      <dl className="w-full text-xs">
        <div className="flex items-center justify-between gap-2 py-0.5">
          <dt className="flex items-center gap-1.5 text-ink-600">
            <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: VIZ.income }} />
            รายรับ
          </dt>
          <dd className="font-medium tabular-nums text-ink-900">
            {formatBaht(income)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2 py-0.5">
          <dt className="flex items-center gap-1.5 text-ink-600">
            <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: VIZ.expense }} />
            รายจ่าย
          </dt>
          <dd className="font-medium tabular-nums text-ink-900">
            {formatBaht(expense)}
          </dd>
        </div>
      </dl>
    </figure>
  );
}

// Ranked horizontal bars — one series, so no legend box; every row is
// directly labeled with its name and value.
export function RankedBars({
  rows,
  emptyText,
}: {
  rows: { name: string; total: number; count: number }[];
  emptyText: string;
}) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-small text-ink-450">{emptyText}</p>;
  }
  const max = Math.max(...rows.map((r) => r.total), 0);

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <li
          key={row.name}
          title={`${row.name}: ${formatBaht(row.total)} (${row.count} ใบ)`}
        >
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-ink-600">{row.name}</span>
            <span className="shrink-0 font-medium tabular-nums text-ink-900">
              {formatBaht(row.total)}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-surface-sunken">
            <div
              className="h-2 rounded-full"
              style={{
                width: `${max > 0 ? Math.max((row.total / max) * 100, 1) : 1}%`,
                background: VIZ.neutral,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
