import Link from "next/link";
import { SidebarNav, BottomNav } from "./nav";
import { AppMark, AppLogo } from "./brand";
import { IconCamera } from "./icons";
import LogoutButton from "@/app/dashboard/logout-button";

// Shared chrome for every signed-in page: a sidebar on desktop, a bottom tab
// bar on mobile, and a sticky header carrying the page title plus the one
// primary action (scan a receipt), which stays reachable from every screen.
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
    <div className="min-h-screen bg-surface lg:flex">
      {/* ------------------------------------------------ sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 border-r border-line bg-surface-raised p-4 lg:flex">
        <div className="px-2 pt-1">
          <AppMark href="/dashboard" />
        </div>

        <Link href="/upload" className="btn-primary w-full">
          <IconCamera className="h-4 w-4" />
          สแกนบิล
        </Link>

        <SidebarNav />

        <div className="mt-auto border-t border-line pt-4">
          {email && (
            <p className="truncate px-3 pb-2 text-caption text-ink-450" title={email}>
              {email}
            </p>
          )}
          <LogoutButton />
        </div>
      </aside>

      {/* --------------------------------------------------------- main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
          <div className="flex items-center justify-between gap-3 px-5 py-3 lg:px-8 lg:py-4">
            <div className="flex min-w-0 items-center gap-3">
              <Link href="/dashboard" className="lg:hidden" aria-label="จดบิล — หน้าแรก">
                <AppLogo className="h-9 w-9" />
              </Link>
              <div className="min-w-0">
                <h1 className="truncate text-h4 font-bold tracking-tight text-ink-900">
                  {title}
                </h1>
                {subtitle && (
                  <p className="truncate text-caption text-ink-450">{subtitle}</p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {action}
              {/* The primary action follows the user on mobile, where the
                  sidebar button is not available. */}
              <Link
                href="/upload"
                className="btn-primary px-4 py-2.5 lg:hidden"
                aria-label="สแกนบิล"
              >
                <IconCamera className="h-4 w-4" />
                <span className="hidden sm:inline">สแกนบิล</span>
              </Link>
            </div>
          </div>
        </header>

        {/* overflow-x-clip keeps chart tooltips near the edges from pushing
            the page into horizontal scroll on narrow screens. */}
        <main className="flex-1 overflow-x-clip px-5 pb-28 pt-6 lg:px-8 lg:pb-12">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
