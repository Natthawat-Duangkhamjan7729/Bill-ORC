import Link from "next/link";

// The app's wordmark. A receipt outline whose lines resolve into a rising
// trend — the product in one glyph: bills in, profit out.
export function AppLogo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white ${className}`}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[60%] w-[60%]"
      >
        <path d="M6 3.5h12v17l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3Z" />
        <path d="m9 13.5 2.5-2.5 2 2L16 9" />
      </svg>
    </span>
  );
}

export function AppMark({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2.5 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
    >
      <AppLogo />
      <span className="text-h4 font-bold tracking-tight text-ink-900">
        จดบิล
      </span>
    </Link>
  );
}
