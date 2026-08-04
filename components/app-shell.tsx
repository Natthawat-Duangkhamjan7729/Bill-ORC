import Link from "next/link";
import { SidebarNav, BottomNav } from "./nav";
import LogoutButton from "@/app/dashboard/logout-button";

// Shared chrome for every signed-in page: a sidebar on desktop, a bottom
// tab bar on mobile, and a header carrying the page title.
export default function AppShell({
  title,
  subtitle,
  action,
  email,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  email?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 lg:flex">
      {/* Sidebar (desktop only) */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-6 border-r border-gray-200 bg-white p-4 lg:flex">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-2 py-1">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-lg">
            🧾
          </span>
          <span className="text-lg font-bold tracking-tight text-gray-900">
            Bill ORC
          </span>
        </Link>

        <Link
          href="/upload"
          className="flex items-center justify-between rounded-xl bg-teal-600 px-4 py-3 font-medium text-white transition hover:bg-teal-700"
        >
          เพิ่มใบเสร็จ
          <span aria-hidden className="text-lg leading-none">
            +
          </span>
        </Link>

        <SidebarNav />

        <div className="mt-auto flex flex-col gap-2 border-t border-gray-200 pt-4">
          {email && (
            <p className="truncate px-3 text-xs text-gray-400" title={email}>
              {email}
            </p>
          )}
          <div className="px-1">
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-200 bg-white/95 px-5 py-3.5 backdrop-blur lg:px-8">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-lg lg:hidden">
              🧾
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-tight text-gray-900">
                {title}
              </h1>
              {subtitle && (
                <p className="truncate text-xs text-gray-500">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">{action}</div>
        </header>

        {/* overflow-x-clip keeps chart tooltips near the edges from pushing
            the page into horizontal scroll on narrow screens. */}
        <main className="flex-1 overflow-x-clip px-5 pb-24 pt-5 lg:px-8 lg:pb-10">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
