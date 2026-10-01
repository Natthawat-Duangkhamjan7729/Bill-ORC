"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconHome,
  IconReceipt,
  IconWallet,
  IconTrend,
  IconChart,
} from "@/components/icons";

// One source of truth for navigation. `short` is the mobile tab label —
// Thai labels need to stay narrow at five tabs across a 360px screen.
export const NAV_ITEMS = [
  { href: "/dashboard", label: "ภาพรวม", short: "ภาพรวม", Icon: IconHome },
  { href: "/receipts", label: "ใบเสร็จ", short: "บิล", Icon: IconReceipt },
  { href: "/sales", label: "ยอดขาย", short: "ขาย", Icon: IconWallet },
  { href: "/profit", label: "กำไร-ขาดทุน", short: "กำไร", Icon: IconTrend },
  { href: "/summary", label: "รายงาน", short: "รายงาน", Icon: IconChart },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

// Desktop: vertical rail inside the sidebar.
export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="เมนูหลัก" className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-small transition ${
              active
                ? "bg-brand-50 font-semibold text-brand-700"
                : "text-ink-600 hover:bg-surface-sunken hover:text-ink-900"
            }`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

// Mobile: fixed bottom tab bar. Active state is carried by colour *and*
// weight *and* a top rule, so it never relies on colour alone.
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="เมนูหลัก"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface-raised/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      {NAV_ITEMS.map(({ href, short, Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative flex min-h-[3.5rem] flex-1 flex-col items-center justify-center gap-1 px-1 text-micro leading-none transition ${
              active ? "font-semibold text-brand-700" : "text-ink-450"
            }`}
          >
            {active && (
              <span
                aria-hidden
                className="absolute inset-x-3 top-0 h-0.5 rounded-b bg-brand-600"
              />
            )}
            <Icon className="h-5 w-5" />
            {short}
          </Link>
        );
      })}
    </nav>
  );
}
