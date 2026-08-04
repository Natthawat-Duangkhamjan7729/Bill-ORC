"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "ภาพรวม", icon: "◎" },
  { href: "/receipts", label: "ใบเสร็จ", icon: "🧾" },
  { href: "/sales", label: "ยอดขาย", icon: "💰" },
  { href: "/profit", label: "กำไร-ขาดทุน", icon: "📈" },
  { href: "/summary", label: "สรุปรายจ่าย", icon: "📊" },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

// Desktop: vertical rail inside the sidebar.
export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
              active
                ? "bg-teal-50 font-semibold text-teal-800"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <span aria-hidden className="w-5 text-center text-base">
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

// Mobile: fixed bottom tab bar.
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-gray-200 bg-white/95 backdrop-blur lg:hidden">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition ${
              active ? "font-semibold text-teal-700" : "text-gray-500"
            }`}
          >
            <span aria-hidden className="text-lg leading-none">
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
