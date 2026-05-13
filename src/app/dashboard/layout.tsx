"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarRange,
  CircleHelp,
  Cog,
  DatabaseZap,
  Download,
  FlaskConical,
  GitBranchPlus,
  HandCoins,
  Headset,
  Layers,
  LayoutGrid,
  Menu,
  Plug,
  RefreshCw,
  Rocket,
  Search,
  Settings,
  ShieldCheck,
  Star,
  User,
  Users,
  Webhook,
  BookOpenText,
  Megaphone,
  LogOut,
  LifeBuoy,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { ensureAuthSession, onboardingApi } from "@/lib/api/client";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Dashboard",
    items: [{ href: "/dashboard", label: "Overview", icon: LayoutGrid }],
  },
  {
    label: "Setup & Config",
    items: [
      { href: "/dashboard/configure", label: "Configure Programme", icon: Settings },
      { href: "/dashboard/configure/my-configurations", label: "My Configurations", icon: Search },
      { href: "/dashboard/setup/event-schema", label: "Event Schema", icon: DatabaseZap },
      { href: "/dashboard/setup/webhooks", label: "Webhook Config", icon: Webhook },
      { href: "/dashboard/setup/rewards-catalog", label: "Rewards Catalog", icon: Star },
      { href: "/dashboard/setup/tier-management", label: "Tier Management", icon: Layers },
    ],
  },
  {
    label: "Loyalty Rules",
    items: [
      { href: "/dashboard/loyalty-rules/create/basic-info", label: "Create Rule", icon: GitBranchPlus },
      { href: "/dashboard/loyalty-rules/my-rules", label: "My Rules", icon: Search },
      { href: "/dashboard/loyalty-rules/performance", label: "Rule Performance", icon: BarChart3 },
      { href: "/dashboard/loyalty-rules/simulation", label: "Simulation Tool", icon: FlaskConical },
    ],
  },
  {
    label: "Campaigns",
    items: [
      { href: "/dashboard/campaigns/active", label: "Active Campaigns", icon: Megaphone },
      { href: "/dashboard/campaigns/create", label: "Create Campaign", icon: GitBranchPlus },
      { href: "/dashboard/campaigns/reports", label: "Campaign Reports", icon: Download },
    ],
  },
  {
    label: "Analytics & Reports",
    items: [
      { href: "/dashboard/analytics/custom-reports", label: "Custom Reports", icon: BarChart3 },
      { href: "/dashboard/analytics/export-data", label: "Export Data", icon: Download },
      { href: "/dashboard/analytics/segment-analysis", label: "Segment Analysis", icon: Users },
      { href: "/dashboard/analytics/cohort-analysis", label: "Cohort Analysis", icon: Layers },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/dashboard/profile", label: "Your Profile", icon: User },
      { href: "/dashboard/settings/account", label: "Account Settings", icon: Cog },
      { href: "/dashboard/settings/team", label: "Team & Permissions", icon: Users },
      { href: "/dashboard/settings/integrations", label: "Integrations", icon: Plug },
      { href: "/dashboard/settings/billing", label: "Billing & Plan", icon: HandCoins },
    ],
  },
  {
    label: "Support",
    items: [
      { href: "/dashboard/support/docs", label: "Documentation", icon: BookOpenText },
      { href: "/dashboard/support/contact", label: "Contact Support", icon: Headset },
      { href: "/dashboard/support/community", label: "Community Forum", icon: CircleHelp },
    ],
  },
  {
    label: "Setup Progress",
    items: [
      { href: "/dashboard/configure", label: "Configure", icon: Settings },
      { href: "/dashboard/loyalty-rules/create/basic-info", label: "Rules Setup", icon: GitBranchPlus },
      { href: "/dashboard/integrate", label: "Integrate", icon: Plug },
      { href: "/dashboard/go-live", label: "Go Live", icon: Rocket },
    ],
  },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { onboardingStatus } = useOnboardingStore();

  // Pick the single best-matching nav href (longest prefix wins) so a parent
  // and a more-specific child don't light up simultaneously.
  const bestHref = useMemo(() => {
    let winner: string | null = null;
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        if (pathname === item.href || pathname.startsWith(item.href + "/")) {
          if (!winner || item.href.length > winner.length) winner = item.href;
        }
      }
    }
    return winner;
  }, [pathname]);

  return (
    <nav className="px-3 py-4 space-y-6 overflow-y-auto" aria-label="Tenant sidebar navigation">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-3 pt-6 section-title">
            {group.label}
          </p>
          <div className="mt-2 space-y-1">
            {group.items.map((item) => {
              const active = bestHref === item.href;
              const Icon = item.icon;
              const showDot =
                (item.href === "/dashboard/configure" && onboardingStatus === "AGREEMENT_SIGNED") ||
                (item.href === "/dashboard/loyalty-rules/create/basic-info" && onboardingStatus === "CONFIGURED") ||
                (item.href === "/dashboard/integrate" && onboardingStatus === "RULES_CONFIGURED") ||
                (item.href === "/dashboard/go-live" && onboardingStatus === "SANDBOX_TESTING");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors outline-none",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    active
                      ? "bg-[var(--accent-primary-soft)] text-[var(--accent-primary)]"
                      : "text-muted-foreground hover:text-foreground hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                  )}
                >
                  <Icon className={cn("h-4 w-4", "text-current")} />
                  <span className="truncate">{item.label}</span>
                  {showDot ? (
                    <span
                      aria-label="Action required"
                      className="ml-auto h-2 w-2 rounded-full bg-brand-600"
                    />
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function TopControls() {
  const [location, setLocation] = useState("all");
  const [datePreset, setDatePreset] = useState("last-30");
  const [dateDialogOpen, setDateDialogOpen] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => setLastUpdated(new Date()), 30000);
    return () => clearInterval(id);
  }, [autoRefresh]);

  const nextRefreshSeconds = useMemo(() => {
    if (!autoRefresh) return null;
    const diff = 30 - (Math.floor((Date.now() - lastUpdated.getTime()) / 1000) % 30);
    return diff;
  }, [autoRefresh, lastUpdated]);

  return (
    <>
      <div className="flex items-center gap-2">
        <Select value={location} onValueChange={(value) => setLocation(value ?? "all")}>
          <SelectTrigger className="w-[170px] h-9 rounded-full px-4 bg-[var(--surface-sunken)] border-0" aria-label="Filter by location">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            <SelectItem value="north">North Region</SelectItem>
            <SelectItem value="south">South Region</SelectItem>
            <SelectItem value="delhi">Delhi Central</SelectItem>
            <SelectItem value="mumbai">Mumbai Fort</SelectItem>
            <SelectItem value="bangalore">Bangalore</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          className="h-9 rounded-full px-4 bg-[var(--surface-sunken)] border-0"
          onClick={() => setDateDialogOpen(true)}
          aria-label="Open date range picker"
        >
          <CalendarRange className="h-4 w-4 mr-2" />
          {datePreset === "last-7"
            ? "Last 7 Days"
            : datePreset === "last-30"
              ? "Last 30 Days"
              : datePreset === "last-90"
                ? "Last 90 Days"
                : datePreset === "last-12m"
                  ? "Last 12 Months"
                  : "Custom Range"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-9 w-9 p-0 border-0 bg-transparent text-muted-foreground hover:text-foreground"
          onClick={() => setLastUpdated(new Date())}
          aria-label="Refresh dashboard data"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="hidden xl:flex items-center gap-3 text-xs text-muted-foreground">
        <button
          type="button"
          className={cn(
            "px-2.5 py-1 rounded-full transition-colors",
            autoRefresh
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-medium"
              : "bg-[var(--surface-sunken)] text-muted-foreground text-xs font-medium"
          )}
          onClick={() => setAutoRefresh((v) => !v)}
          aria-pressed={autoRefresh}
        >
          Auto-Refresh: {autoRefresh ? "ON" : "OFF"}
        </button>
        <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
        {autoRefresh && <span>Next update: {nextRefreshSeconds}s</span>}
      </div>

      <Dialog open={dateDialogOpen} onOpenChange={setDateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Date Range</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={datePreset === "last-7" ? "default" : "outline"}
                className={cn(datePreset !== "last-7" && "border-0 bg-[var(--surface-sunken)]")}
                onClick={() => setDatePreset("last-7")}
              >
                Last 7 Days
              </Button>
              <Button
                variant={datePreset === "last-30" ? "default" : "outline"}
                className={cn(datePreset !== "last-30" && "border-0 bg-[var(--surface-sunken)]")}
                onClick={() => setDatePreset("last-30")}
              >
                Last 30 Days
              </Button>
              <Button
                variant={datePreset === "last-90" ? "default" : "outline"}
                className={cn(datePreset !== "last-90" && "border-0 bg-[var(--surface-sunken)]")}
                onClick={() => setDatePreset("last-90")}
              >
                Last 90 Days
              </Button>
              <Button
                variant={datePreset === "last-12m" ? "default" : "outline"}
                className={cn(datePreset !== "last-12m" && "border-0 bg-[var(--surface-sunken)]")}
                onClick={() => setDatePreset("last-12m")}
              >
                Last 12 Months
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="fromDate" className="text-xs text-muted-foreground">From</label>
                <Input id="fromDate" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label htmlFor="toDate" className="text-xs text-muted-foreground">To</label>
                <Input id="toDate" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                className="border-0 rounded-full bg-[var(--surface-sunken)] hover:bg-[var(--accent-primary-soft)] hover:text-[var(--accent-primary)]"
                onClick={() => setDateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (fromDate && toDate) setDatePreset("custom");
                  setDateDialogOpen(false);
                }}
              >
                Apply
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function TenantDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { accessToken, companyName, email, logout, setRegistrationData } = useOnboardingStore();
  const [hydrated, setHydrated] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [welcomeName, setWelcomeName] = useState<string | null>(null);
  const [refreshTried, setRefreshTried] = useState(false);
  const [underReview, setUnderReview] = useState(false);
  const [checkingReview, setCheckingReview] = useState(false);

  const handleLogout = async () => {
    try {
      // Clears HttpOnly refresh cookie on server so we don't auto-login again.
      await onboardingApi.logout();
    } catch {
      // best-effort; still clear client state
    } finally {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("loyaltyos_logout_intent", "1");
      }
      logout();
      setRefreshTried(true); // prevent any in-flight auto-refresh attempt during navigation
      router.replace("/login");
    }
  };

  const tenantLabel = useMemo(() => {
    const fromStatus = (welcomeName ?? "").trim();
    if (fromStatus) return fromStatus;
    const fromCompany = (companyName ?? "").trim();
    if (fromCompany) return fromCompany;
    const fromEmail = (email ?? "").trim();
    if (fromEmail.includes("@")) {
      const local = fromEmail.split("@")[0] ?? "";
      const cleaned = local.replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim();
      if (cleaned) {
        return cleaned
          .split(" ")
          .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : ""))
          .join(" ");
      }
    }
    return "there";
  }, [companyName, email, welcomeName]);

  useEffect(() => {
    const unsub = useOnboardingStore.persist.onFinishHydration(() => setHydrated(true));
    if (useOnboardingStore.persist.hasHydrated()) setHydrated(true);
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !accessToken) return;
    let alive = true;
    (async () => {
      try {
        const status = await onboardingApi.getMyStatus();
        if (!alive) return;
        setWelcomeName(status.primaryContactName?.trim() || status.companyName?.trim() || null);
        setRegistrationData({ companyName: status.companyName, email: status.email });
        const review = status.latestAgreementStatus === "PENDING_APPROVAL";
        setUnderReview(review);
        if (review) {
          const key = "loyaltyos_review_toast_shown";
          if (typeof window !== "undefined" && !sessionStorage.getItem(key)) {
            sessionStorage.setItem(key, "1");
            toast("Your agreement is under review. Dashboard will unlock after approval.", {
              duration: 6000,
            });
          }
        }
      } catch {
        // non-blocking: keep fallback label
      }
    })();
    return () => {
      alive = false;
    };
  }, [accessToken, hydrated, setRegistrationData]);

  const refreshAgreementReviewState = async () => {
    if (checkingReview) return;
    setCheckingReview(true);
    try {
      const status = await onboardingApi.getMyStatus();
      setWelcomeName(status.primaryContactName?.trim() || status.companyName?.trim() || null);
      setRegistrationData({ companyName: status.companyName, email: status.email });
      const review = status.latestAgreementStatus === "PENDING_APPROVAL";
      setUnderReview(review);
      if (!review) {
        toast.success("Agreement approved. Dashboard unlocked.");
      } else {
        toast("Still under review. Please try again shortly.", { duration: 3500 });
      }
      router.refresh();
    } catch {
      toast.error("Unable to refresh status. Please retry.");
    } finally {
      setCheckingReview(false);
    }
  };

  const isLoginLikePage = pathname === "/login" || pathname.startsWith("/onboarding");
  if (isLoginLikePage) return <>{children}</>;

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-[var(--surface-page)] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!accessToken) {
    // If user explicitly logged out, never attempt silent refresh.
    if (typeof window !== "undefined" && sessionStorage.getItem("loyaltyos_logout_intent") === "1") {
      router.replace("/login");
      return null;
    }
    if (!refreshTried) {
      setRefreshTried(true);
      (async () => {
        try {
          await ensureAuthSession();
        } catch {
          router.replace("/login");
        }
      })();
      return null;
    }
    router.replace("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--surface-page)] text-foreground relative">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-card focus:border focus:border-border"
      >
        Skip to main content
      </a>

      {underReview && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" />
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="pointer-events-auto w-full max-w-lg rounded-2xl border border-border/70 bg-[var(--surface-card)] shadow-2xl">
              <div className="p-6">
                <p className="text-sm font-semibold text-foreground">Agreement under review</p>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Your tenant agreement is being reviewed by our team. Until it’s approved, dashboard data is hidden.
                </p>
                <div className="mt-4 flex items-center justify-end gap-2">
                  <Button variant="outline" onClick={() => router.replace("/onboarding")}>
                    View onboarding status
                  </Button>
                  <Button onClick={refreshAgreementReviewState} disabled={checkingReview}>
                    {checkingReview ? "Checking…" : "Check again"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden xl:flex fixed inset-y-0 left-0 w-72 bg-[var(--surface-card)] border-r border-gray-100 dark:border-white/[0.06] flex-col",
        underReview && "blur-sm pointer-events-none select-none"
      )}>
        <div className="px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/15">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold tracking-tight truncate">LoyaltyOS</p>
              <p className="text-[10px] font-medium uppercase tracking-widest truncate text-muted-foreground">
                {companyName ?? "Tenant"}
              </p>
            </div>
          </div>
        </div>

        <SidebarNav />

        <div className="mt-auto px-3 py-4 border-t border-gray-100 dark:border-white/[0.06] pt-4">
          <div className="px-3 py-2 mb-2">
            <p className="text-xs font-semibold truncate">{companyName ?? "Your Organisation"}</p>
            <p className="text-[10px] text-muted-foreground truncate">{email ?? ""}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Content column (prevents mobile header becoming a side-column) */}
      <div className={cn("min-h-screen flex flex-col xl:pl-72", underReview && "blur-sm pointer-events-none select-none")}>
        {/* Mobile topbar */}
        <header className="xl:hidden sticky top-0 z-40 bg-[var(--surface-card)] border-b border-gray-100 dark:border-white/[0.06]">
          <div className="h-14 px-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="h-10 w-10 inline-flex items-center justify-center rounded-xl border border-gray-100 dark:border-white/[0.06] bg-[var(--surface-card)] hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Open navigation menu"
            >
              <Menu className="h-4.5 w-4.5" />
            </button>
            <div className="min-w-0 px-3">
              <p className="text-sm font-bold truncate">Welcome back, {tenantLabel}</p>
              <p className="text-[10px] text-muted-foreground truncate">Dashboard Home</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0 border-0 bg-transparent text-muted-foreground hover:text-foreground"
                aria-label="Support"
              >
                <LifeBuoy className="h-4 w-4" />
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Desktop topbar */}
        <div className="hidden xl:block fixed top-0 left-72 right-0 z-30 bg-[var(--surface-card)] border-b border-gray-100 dark:border-white/[0.06]">
          <div className="h-16 px-8 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-lg font-bold tracking-tight truncate">Welcome back, {tenantLabel}</p>
              <p className="text-xs text-muted-foreground truncate">
                Here’s a quick loyalty health check — and deep dives when needed.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <TopControls />
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0 border-0 bg-transparent text-muted-foreground hover:text-foreground"
                aria-label="Open settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Mobile "push" sidebar + content row (no floating dialog) */}
        <div className="flex flex-1 min-h-0">
          {mobileNavOpen && (
            <aside className="xl:hidden w-72 shrink-0 bg-[var(--surface-card)] border-r border-gray-100 dark:border-white/[0.06] flex flex-col">
              <div className="h-14 px-4 flex items-center justify-between border-b border-border">
                <p className="text-sm font-bold">Menu</p>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-gray-100 dark:border-white/[0.06] bg-[var(--surface-card)] hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Close navigation menu"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
              <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
              <div className="mt-auto px-4 pb-4">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{companyName ?? "Your Organisation"}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{email ?? ""}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </div>
            </aside>
          )}

          <main id="main" className={cn("xl:pt-16 flex-1 min-w-0", mobileNavOpen && "xl:ml-0")}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

