"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  FileText,
  LayoutDashboard,
  LogOut,
  Plus,
  Store,
  TrendingUp,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useMerchantAuthStore } from "@/lib/store/merchant-auth-store";
import { PORTAL_LOGIN_PATH } from "@/lib/auth/paths";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon; mobileLabel?: string; capability?: string };

const BASE_NAV: NavItem[] = [
  { href: "/merchant/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/merchant/campaigns", label: "Campaigns", icon: BarChart3 },
  { href: "/merchant/analytics", label: "Analytics", icon: TrendingUp, mobileLabel: "Analytics", capability: "campaigns" },
  { href: "/merchant/settlement", label: "Settlement", icon: FileText, capability: "settlement" },
  { href: "/merchant/profile", label: "Profile", icon: User },
];

const PAGE_TITLES: Record<string, string> = {
  "/merchant/dashboard": "Dashboard",
  "/merchant/campaigns": "Campaigns",
  "/merchant/analytics": "Analytics",
  "/merchant/settlement": "Settlement",
  "/merchant/profile": "Profile",
};

function resolvePageTitle(pathname: string): string {
  if (pathname.startsWith("/merchant/campaigns/create")) return "New campaign";
  if (pathname.match(/\/merchant\/campaigns\/[^/]+\/edit/)) return "Edit campaign";
  if (pathname.match(/\/merchant\/campaigns\/[^/]+/)) return "Campaign details";
  for (const [prefix, title] of Object.entries(PAGE_TITLES)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return title;
  }
  return "Merchant portal";
}

export function MerchantPortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const merchantName = useMerchantAuthStore((s) => s.merchantName);
  const email = useMerchantAuthStore((s) => s.email);
  const clearSession = useMerchantAuthStore((s) => s.clearSession);
  const profile = useMerchantAuthStore((s) => s.profile);

  // null/empty capabilities = show all (safe fallback for existing sessions)
  const capabilities: string[] = profile?.capabilities ?? [];
  const hasAll = capabilities.length === 0;

  const NAV = BASE_NAV.filter(
    (item) => !item.capability || hasAll || capabilities.includes(item.capability)
  );

  const pageTitle = resolvePageTitle(pathname ?? "");
  const initials = (merchantName ?? "M")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function logout() {
    clearSession();
    router.push(PORTAL_LOGIN_PATH);
  }

  return (
    <div className="flex min-h-screen bg-[var(--surface-page)]">
      {/* Desktop sidebar */}
      <aside className="relative hidden w-[272px] shrink-0 flex-col bg-slate-950 md:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          aria-hidden
          style={{
            backgroundImage:
              "radial-gradient(circle at 0% 0%, rgba(16,185,129,0.2) 0%, transparent 50%)",
          }}
        />

        <div className="relative z-10 flex items-center gap-3 border-b border-white/8 px-5 py-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 shadow-lg shadow-emerald-500/25">
            <Store className="h-5 w-5 text-white" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400/90">
              LoyaltyOS
            </p>
            <p className="truncate text-sm font-semibold text-white">{merchantName ?? "Partner"}</p>
          </div>
        </div>

        <div className="relative z-10 px-4 pt-5">
          <Link
            href="/merchant/campaigns/create/basic-info"
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold",
              "bg-emerald-600 text-white shadow-md shadow-emerald-900/40 transition-colors hover:bg-emerald-500"
            )}
          >
            <Plus className="h-4 w-4" />
            New campaign
          </Link>
        </div>

        <nav className="relative z-10 flex-1 space-y-1 px-3 py-5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/merchant/dashboard" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", active && "text-emerald-400")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="relative z-10 border-t border-white/8 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5 ring-1 ring-white/8">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-xs font-bold text-emerald-300">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{merchantName ?? "Partner"}</p>
              {email && (
                <p className="truncate text-xs text-slate-400">{email}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-border/50 bg-[var(--surface-card)]/90 px-4 py-3 backdrop-blur-md md:px-8">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <div className="min-w-0 md:hidden">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600">
                LoyaltyOS Merchant
              </p>
              <p className="truncate text-sm font-semibold">{pageTitle}</p>
            </div>
            <div className="hidden md:block">
              <p className="text-lg font-semibold tracking-tight text-foreground">{pageTitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/merchant/campaigns/create/basic-info"
                className="inline-flex md:hidden items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                New
              </Link>
              <button
                type="button"
                onClick={logout}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted/60 md:hidden"
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border/60 bg-[var(--surface-card)]/95 px-2 py-2 backdrop-blur-md md:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-around gap-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/merchant/dashboard" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium transition-colors",
                  active ? "text-emerald-600" : "text-muted-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "text-emerald-600")} />
                {item.mobileLabel ?? item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
