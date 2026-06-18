"use client";

import { Authorize } from "@/components/access/authorize";
import { ModuleAccessDeniedBanner } from "@/components/access/ModuleAccessDeniedBanner";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, RefreshCw, RotateCcw } from "lucide-react";
import { DashboardSectionCard } from "@/components/tenant-dashboard/DashboardSectionCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AnimatedSelect } from "@/components/ui/animated-select";
import { KpiCard } from "@/components/tenant-dashboard/KpiCard";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ProgressBar } from "@/components/ui/progress-bar";
import { AppTable, type ColumnDef } from "@/components/ui/table";
import { createColumnHelper } from "@tanstack/react-table";
import { AnalyticsProgrammeProvider, useAnalyticsProgramme } from "@/lib/analytics/analytics-programme-context";
import { dashboardApi } from "@/lib/api/dashboard";
import {
  countDaysInRange,
  DASHBOARD_TOP_REFERRERS_LIMIT,
  fillReferralTrendPointsForRange,
  fillVolumeSeriesForRange,
  formatChartAxisLabel,
  formatPeriodRangeLabel,
  getPresetDateRange,
  getSevenDayDateRange,
  getTodayDateRange,
  isTodayRange,
  toLocalIsoDate,
  validateDashboardDateRange,
  type DashboardDateRange,
  type DashboardPeriodPreset,
} from "@/lib/analytics/dashboard-period";
import { DashboardPeriodDropdown } from "@/components/tenant-dashboard/DashboardPeriodDropdown";
import {
  referralApi,
  type ReferralDashboardResponse,
  type ReferralTopReferrer,
  type ReferralTrendPoint,
} from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import type {
  DashboardOverview,
  DashboardRedemptionRow,
  DashboardTopRuleRow,
  DashboardVolumePoint,
} from "@/types/dashboard";
import toast from "react-hot-toast";

type SeriesPoint = { x: string; y: number };
type WidgetId = "kpis" | "health" | "rewards" | "referrals" | "tiers";
const WIDGET_STORAGE_KEY = "tenant_dashboard_widgets_v3";
const DEFAULT_WIDGET_ORDER: WidgetId[] = ["kpis", "health", "rewards", "referrals", "tiers"];

const WIDGET_LABELS: Record<WidgetId, string> = {
  kpis: "Executive KPIs",
  health: "Program Health",
  rewards: "Rules & Redemptions",
  referrals: "Referrals",
  tiers: "Tier Distribution",
};

const WIDGET_LAYOUT_TRANSITION = {
  layout: { duration: 0.55, ease: [0.32, 0.72, 0, 1] as const },
  opacity: { duration: 0.3 },
  y: { duration: 0.3 },
};

function normalizeWidgetOrder(order: WidgetId[]): WidgetId[] {
  const valid = order.filter((id) => DEFAULT_WIDGET_ORDER.includes(id));
  const missing = DEFAULT_WIDGET_ORDER.filter((id) => !valid.includes(id));
  return [...valid, ...missing];
}

function readStoredWidgetLayout(): { order: WidgetId[]; hidden: WidgetId[] } {
  try {
    const raw = localStorage.getItem(WIDGET_STORAGE_KEY);
    if (!raw) {
      return { order: DEFAULT_WIDGET_ORDER, hidden: [] };
    }
    const parsed = JSON.parse(raw) as { order?: WidgetId[]; hidden?: WidgetId[] };
    const order = parsed.order?.length
      ? normalizeWidgetOrder(parsed.order)
      : DEFAULT_WIDGET_ORDER;
    const hidden = parsed.hidden?.length
      ? parsed.hidden.filter((id) => DEFAULT_WIDGET_ORDER.includes(id))
      : [];
    return { order, hidden };
  } catch {
    return { order: DEFAULT_WIDGET_ORDER, hidden: [] };
  }
}

function formatPointsCompact(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}${Math.round(abs / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `${sign}${Math.round(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}${Math.round(abs / 1_000)}K`;
  return `${sign}${Math.round(abs).toLocaleString("en-US")}`;
}

function formatPointsRaw(value: number): string {
  if (!Number.isFinite(value)) return "0 pts";
  return `${Math.round(value).toLocaleString("en-US")} pts`;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--surface-card)] border border-gray-100 dark:border-white/10 rounded-xl px-3 py-2 shadow-lg text-sm">
      {label && <p className="text-muted-foreground text-xs mb-1">{label}</p>}
      {payload.map((p, idx) => (
        <p key={`${p.name ?? "v"}-${idx}`} className="font-semibold" style={{ color: p.color }}>
          {typeof p.value === "number" ? formatPointsRaw(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

function volumeToChart(series: DashboardVolumePoint[], rangeDayCount: number) {
  return series.map((d) => ({
    day: formatChartAxisLabel(d.date, rangeDayCount),
    issued: Number(d.issued) || 0,
    redeemed: Number(d.redeemed) || 0,
  }));
}

function sparkFromVolume(
  series: DashboardVolumePoint[],
  key: "issued" | "redeemed",
  rangeDayCount: number
): SeriesPoint[] {
  return series.map((d) => ({
    x: formatChartAxisLabel(d.date, rangeDayCount),
    y: Number(d[key]) || 0,
  }));
}

function sparkFromReferralTrends(trends: ReferralTrendPoint[], key: "referrals" | "rewarded"): SeriesPoint[] {
  return trends.map((t) => ({
    x: t.periodStart.slice(5),
    y: Number(t[key]) || 0,
  }));
}

function DashboardHomeContent() {
  const router = useRouter();
  const { programmes, programmeUid, programmeName, setProgrammeUid, programmesLoading } =
    useAnalyticsProgramme();

  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [referralDashboard, setReferralDashboard] = useState<ReferralDashboardResponse | null>(null);
  const [referralTrends, setReferralTrends] = useState<ReferralTrendPoint[]>([]);
  const [referralTopReferrers, setReferralTopReferrers] = useState<ReferralTopReferrer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>(DEFAULT_WIDGET_ORDER);
  const [hiddenWidgets, setHiddenWidgets] = useState<WidgetId[]>([]);
  const widgetLayoutHydrated = useRef(false);
  const hasLoadedOverview = useRef(false);
  const [periodPreset, setPeriodPreset] = useState<DashboardPeriodPreset>("today");
  const [appliedDateRange, setAppliedDateRange] = useState<DashboardDateRange>(() => getTodayDateRange());
  const [draftFromDate, setDraftFromDate] = useState(() => getSevenDayDateRange().from);
  const [draftToDate, setDraftToDate] = useState(() => getSevenDayDateRange().to);
  const [periodLoading, setPeriodLoading] = useState(false);

  const loadReferralSummary = useCallback(async (uid: string, range: DashboardDateRange) => {
    try {
      const [dashboard, trends, topReferrers] = await Promise.all([
        referralApi.getDashboard(uid, range),
        referralApi.getTrends(uid, range),
        referralApi.getTopReferrers(uid, range, DASHBOARD_TOP_REFERRERS_LIMIT),
      ]);
      setReferralDashboard(dashboard);
      setReferralTrends(trends);
      setReferralTopReferrers(topReferrers);
    } catch {
      setReferralDashboard(null);
      setReferralTrends([]);
      setReferralTopReferrers([]);
    }
  }, []);

  const load = useCallback(async () => {
    if (!getAccessToken()) return;
    if (!hasLoadedOverview.current) setLoading(true);
    else setPeriodLoading(true);
    setError(null);
    try {
      const [data] = await Promise.all([
        dashboardApi.getOverview(programmeUid, appliedDateRange),
        loadReferralSummary(programmeUid, appliedDateRange),
      ]);
      setOverview(data);
      hasLoadedOverview.current = true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load dashboard";
      setError(msg);
      setOverview(null);
    } finally {
      setLoading(false);
      setPeriodLoading(false);
    }
  }, [programmeUid, loadReferralSummary, appliedDateRange]);

  const selectPeriodPreset = useCallback((preset: Exclude<DashboardPeriodPreset, "custom">) => {
    setPeriodPreset(preset);
    setAppliedDateRange(getPresetDateRange(preset));
  }, []);

  const enterCustomPeriodMode = useCallback(() => {
    if (periodPreset === "custom") {
      setDraftFromDate(appliedDateRange.from);
      setDraftToDate(appliedDateRange.to);
      return;
    }
    const sevenDayDraft = getSevenDayDateRange();
    setDraftFromDate(sevenDayDraft.from);
    setDraftToDate(sevenDayDraft.to);
  }, [periodPreset, appliedDateRange.from, appliedDateRange.to]);

  const applyCustomPeriod = useCallback((): boolean => {
    const maxDate = toLocalIsoDate(new Date());
    const validationError = validateDashboardDateRange(draftFromDate, draftToDate, maxDate);
    if (validationError) {
      toast.error(validationError);
      return false;
    }
    setPeriodPreset("custom");
    setAppliedDateRange({ from: draftFromDate, to: draftToDate });
    return true;
  }, [draftFromDate, draftToDate]);

  const clearCustomPeriod = useCallback(() => {
    const sevenDayDraft = getSevenDayDateRange();
    setPeriodPreset("today");
    setAppliedDateRange(getTodayDateRange());
    setDraftFromDate(sevenDayDraft.from);
    setDraftToDate(sevenDayDraft.to);
  }, []);

  const onRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([
        load(),
        new Promise((resolve) => setTimeout(resolve, 600)),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [load, refreshing]);

  useEffect(() => {
    if (!getAccessToken()) return;
    let cancelled = false;
    if (!hasLoadedOverview.current) setLoading(true);
    else setPeriodLoading(true);
    setError(null);
    (async () => {
      try {
        const [data] = await Promise.all([
          dashboardApi.getOverview(programmeUid, appliedDateRange),
          loadReferralSummary(programmeUid, appliedDateRange),
        ]);
        if (!cancelled) {
          setOverview(data);
          hasLoadedOverview.current = true;
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "Failed to load dashboard";
          setError(msg);
          setOverview(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setPeriodLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [programmeUid, loadReferralSummary, appliedDateRange]);

  useEffect(() => {
    const stored = readStoredWidgetLayout();
    setWidgetOrder(stored.order);
    setHiddenWidgets(stored.hidden);
  }, []);

  useEffect(() => {
    if (!widgetLayoutHydrated.current) {
      widgetLayoutHydrated.current = true;
      return;
    }
    localStorage.setItem(
      WIDGET_STORAGE_KEY,
      JSON.stringify({ order: widgetOrder, hidden: hiddenWidgets })
    );
  }, [widgetOrder, hiddenWidgets]);

  const volumeSeriesForPeriod = useMemo(() => {
    if (!overview) return [];
    return fillVolumeSeriesForRange(
      overview.volumeSeries,
      appliedDateRange.from,
      appliedDateRange.to
    );
  }, [overview, appliedDateRange.from, appliedDateRange.to]);

  const referralTrendsForPeriod = useMemo(
    () =>
      fillReferralTrendPointsForRange(
        referralTrends,
        appliedDateRange.from,
        appliedDateRange.to
      ),
    [referralTrends, appliedDateRange.from, appliedDateRange.to]
  );

  const chartData = useMemo(() => {
    if (!volumeSeriesForPeriod.length) return [];
    const rangeDays = countDaysInRange(appliedDateRange.from, appliedDateRange.to);
    return volumeToChart(volumeSeriesForPeriod, rangeDays);
  }, [volumeSeriesForPeriod, appliedDateRange.from, appliedDateRange.to]);

  const periodMeta = useMemo(() => {
    const days = countDaysInRange(appliedDateRange.from, appliedDateRange.to);
    return {
      days,
      label: formatPeriodRangeLabel(appliedDateRange.from, appliedDateRange.to),
      isToday: isTodayRange(appliedDateRange.from, appliedDateRange.to),
    };
  }, [appliedDateRange]);

  const tierTotal = useMemo(() => {
    if (!overview?.tierDistribution?.length) return 0;
    return overview.tierDistribution.reduce((s, t) => s + t.memberCount, 0);
  }, [overview]);

  const isVisible = (id: WidgetId) => !hiddenWidgets.includes(id);
  const layoutDependency = `${widgetOrder.join(",")}|${hiddenWidgets.join(",")}`;

  const onResetLayout = useCallback(() => {
    setWidgetOrder(DEFAULT_WIDGET_ORDER);
    setHiddenWidgets([]);
  }, []);

  const programmeOptions = programmes.map((p) => ({
    value: p.programmeUid,
    label: p.name,
  }));

  const kpiTrendLabel = "vs prior period";
  const todayInput = toLocalIsoDate(new Date());
  const periodBusy = periodLoading || refreshing;

  if (loading && !overview) {
    return (
      <div className="max-w-full overflow-x-hidden px-4 py-6 lg:px-8 lg:py-8 space-y-4">
        <ModuleAccessDeniedBanner />
        <div className="h-8 w-64 rounded-lg bg-muted animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="h-36 rounded-2xl border border-border/70 bg-muted/60 animate-pulse" />
          ))}
        </div>
        <div className="h-72 rounded-2xl border border-border/70 bg-muted/50 animate-pulse" />
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="px-4 py-10 lg:px-8 space-y-4">
        <ModuleAccessDeniedBanner />
        <DashboardSectionCard className="p-8 max-w-xl">
          <p className="text-lg font-bold">Unable to Load Dashboard</p>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
          <div className="mt-5 flex items-center gap-2">
            <Button onClick={() => void load()}>Retry</Button>
            <Button
              variant="outline"
              className="border-0 rounded-full bg-[var(--surface-sunken)]"
              onClick={() =>
                router.push(
                  `/dashboard/support/contact?prefill=1&category=OTHER&priority=URGENT&subject=${encodeURIComponent("Dashboard failed to load")}&description=${encodeURIComponent(`Error: ${error ?? "unknown"}`)}&source=dashboard`
                )
              }
            >
              Contact Support
            </Button>
          </div>
        </DashboardSectionCard>
      </div>
    );
  }

  if (overview && !overview.hasData) {
    return (
      <div className="max-w-full overflow-x-hidden px-4 py-6 lg:px-8 lg:py-8 space-y-4">
        <ModuleAccessDeniedBanner />
        <DashboardHeader
          programmeOptions={programmeOptions}
          programmeUid={programmeUid}
          programmeName={programmeName}
          programmesLoading={programmesLoading}
          onProgrammeChange={setProgrammeUid}
          onRefresh={() => void onRefresh()}
          refreshing={refreshing}
          onCustomize={() => setCustomizeOpen(true)}
          onResetLayout={onResetLayout}
          periodPreset={periodPreset}
          appliedDateRange={appliedDateRange}
          draftFromDate={draftFromDate}
          draftToDate={draftToDate}
          periodBusy={periodBusy}
          maxDate={todayInput}
          onSelectPeriodPreset={selectPeriodPreset}
          onEnterCustomPeriod={enterCustomPeriodMode}
          onDraftFromDateChange={setDraftFromDate}
          onDraftToDateChange={setDraftToDate}
          onApplyCustomPeriod={applyCustomPeriod}
          onClearCustomPeriod={clearCustomPeriod}
          periodLabel={periodMeta.label}
        />
        <DashboardSectionCard className="p-10 max-w-2xl text-center">
          <p className="text-lg font-bold">No Data Yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Your programme has no ledger activity yet. Process events via integration to see live metrics.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Button onClick={() => router.push("/dashboard/integration")}>Integration settings</Button>
            <Button variant="outline" onClick={() => router.push("/dashboard/setup/event-schema")}>
              Event schema
            </Button>
          </div>
        </DashboardSectionCard>
      </div>
    );
  }

  if (!overview) return null;

  const retentionPct = overview.retention.latestRetentionPct ?? 0;
  const avgDailyIssued =
    volumeSeriesForPeriod.length > 0
      ? volumeSeriesForPeriod.reduce((s, d) => s + Number(d.issued), 0) /
      volumeSeriesForPeriod.length
      : 0;

  return (
    <div className="max-w-full overflow-x-hidden px-4 py-6 lg:px-8 lg:py-8 flex flex-col gap-6">
      <ModuleAccessDeniedBanner />
      <DashboardHeader
        programmeOptions={programmeOptions}
        programmeUid={programmeUid}
        programmeName={programmeName}
        programmesLoading={programmesLoading}
        onProgrammeChange={setProgrammeUid}
        onRefresh={() => void onRefresh()}
        refreshing={refreshing}
        onCustomize={() => setCustomizeOpen(true)}
        onResetLayout={onResetLayout}
        periodPreset={periodPreset}
        appliedDateRange={appliedDateRange}
        draftFromDate={draftFromDate}
        draftToDate={draftToDate}
        periodBusy={periodBusy}
        maxDate={todayInput}
        onSelectPeriodPreset={selectPeriodPreset}
        onEnterCustomPeriod={enterCustomPeriodMode}
        onDraftFromDateChange={setDraftFromDate}
        onDraftToDateChange={setDraftToDate}
        onApplyCustomPeriod={applyCustomPeriod}
        onClearCustomPeriod={clearCustomPeriod}
        periodLabel={periodMeta.label}
      />

      <Dialog open={customizeOpen} onOpenChange={setCustomizeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Customize Dashboard Widgets</DialogTitle>
            <DialogDescription>Drag sections to reorder and uncheck to hide a widget.</DialogDescription>
          </DialogHeader>
          <WidgetCustomizeList
            widgetOrder={widgetOrder}
            hiddenWidgets={hiddenWidgets}
            onReorder={setWidgetOrder}
            onToggleVisibility={(widgetId, visible) => {
              setHiddenWidgets((prev) =>
                visible ? prev.filter((id) => id !== widgetId) : [...prev, widgetId]
              );
            }}
          />
        </DialogContent>
      </Dialog>

      <div
        className={cn(
          "flex flex-col gap-6 transition-opacity duration-200",
          periodLoading && "pointer-events-none opacity-75"
        )}
      >
        <LayoutGroup id="dashboard-widgets">
          <AnimatePresence initial={false} mode="popLayout">
            {widgetOrder.flatMap((widgetId) => {
              if (!isVisible(widgetId)) return [];

              if (widgetId === "kpis") {
                return [
                  <motion.section
                    key="kpis"
                    layout="position"
                    layoutDependency={layoutDependency}
                    aria-label="Executive summary"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={WIDGET_LAYOUT_TRANSITION}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-4">
                      <KpiCard
                        title="Active customers"
                        value={overview.activeMembers.value}
                        tone="good"
                        variant="emerald"
                        trendPct={overview.activeMembers.trendPct ?? 0}
                        trendLabel={kpiTrendLabel}
                        sparkline={sparkFromVolume(volumeSeriesForPeriod, "issued", periodMeta.days)}
                        onClick={() => router.push("/dashboard/analytics/segment-analysis")}
                      />
                      <KpiCard
                        title={periodMeta.isToday ? "Points issued (today)" : "Points issued"}
                        value={overview.pointsIssuedToday.value}
                        unit="pts"
                        tone="good"
                        variant="royal"
                        trendPct={overview.pointsIssuedToday.trendPct ?? 0}
                        trendLabel={kpiTrendLabel}
                        sparkline={sparkFromVolume(volumeSeriesForPeriod, "issued", periodMeta.days)}
                        valueFormat={(v) => Math.round(v).toLocaleString()}
                        onClick={() => router.push("/dashboard/analytics/custom-reports")}
                      />
                      <KpiCard
                        title={periodMeta.isToday ? "Redemptions (today)" : "Redemptions"}
                        value={overview.redemptionsToday.value}
                        unit="pts"
                        tone="warn"
                        variant="amber"
                        trendPct={overview.redemptionsToday.trendPct ?? 0}
                        trendLabel={kpiTrendLabel}
                        sparkline={sparkFromVolume(volumeSeriesForPeriod, "redeemed", periodMeta.days)}
                        valueFormat={(v) => Math.round(v).toLocaleString()}
                        onClick={() => router.push("/dashboard/analytics/custom-reports")}
                      />
                      <KpiCard
                        title="Avg order value"
                        value={overview.avgOrderValue.value}
                        unit="₹"
                        tone="good"
                        variant="violet"
                        trendPct={overview.avgOrderValue.trendPct ?? 0}
                        trendLabel={kpiTrendLabel}
                        sparkline={sparkFromVolume(volumeSeriesForPeriod, "issued", periodMeta.days)}
                        valueFormat={(v) =>
                          overview.avgOrderValue.value > 0 ? `₹${Math.round(v).toLocaleString("en-IN")}` : "—"
                        }
                        onClick={() => router.push("/dashboard/analytics/custom-reports")}
                      />
                      <KpiCard
                        title="At-risk customers"
                        value={overview.atRiskMemberPct.value}
                        unit="%"
                        tone="info"
                        variant="sky"
                        trendPct={overview.atRiskMemberPct.trendPct ?? 0}
                        trendLabel={kpiTrendLabel}
                        sparkline={sparkFromVolume(volumeSeriesForPeriod, "redeemed", periodMeta.days)}
                        valueFormat={(v) => `${v.toFixed(1)}%`}
                        onClick={() => router.push("/dashboard/analytics/segment-analysis")}
                      />
                    </div>
                  </motion.section>,
                ];
              }

              if (widgetId === "health") {
                return [
                  <motion.section
                    key="health-summary"
                    layout="position"
                    layoutDependency={layoutDependency}
                    aria-label="Program health and engagement"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={WIDGET_LAYOUT_TRANSITION}
                    className="grid grid-cols-1 xl:grid-cols-2 gap-4"
                  >
                    <DashboardSectionCard>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="card-title text-foreground mb-1">Retention Rate</h3>
                          <p className="text-xs text-muted-foreground">
                            {overview.retention.cohortMonth
                              ? `Cohort ${overview.retention.cohortMonth} · month 1 · ${periodMeta.label}`
                              : `No cohort retention for ${periodMeta.label}`}
                          </p>
                        </div>
                        <p className="text-[var(--accent-primary)] font-bold text-2xl tabular-nums">
                          {overview.retention.latestRetentionPct != null
                            ? `${overview.retention.latestRetentionPct.toFixed(1)}%`
                            : "—"}
                        </p>
                      </div>
                      <div className="mt-4">
                        <Progress value={retentionPct} />
                      </div>
                      <ProgressBar
                        className="mt-5"
                        variant="compact"
                        items={overview.tierDistribution.slice(0, 4).map((tier) => {
                          const pct =
                            tierTotal > 0 ? Math.round((tier.memberCount / tierTotal) * 100) : 0;
                          return {
                            key: tier.tierName,
                            label: tier.tierName,
                            value: pct,
                            suffix: `${pct}%`,
                          };
                        })}
                      />
                    </DashboardSectionCard>

                    <DashboardSectionCard>
                      <h3 className="card-title text-foreground mb-1">Member Engagement</h3>
                      <p className="text-xs text-muted-foreground">
                        {overview.engagement.activePct.toFixed(1)}% active · {periodMeta.label}
                      </p>
                      <div className="mt-4 h-44 w-full min-w-0">
                        {chartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <AreaChart data={chartData}>
                              <defs>
                                <linearGradient id="engagementFill" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="var(--chart-tertiary)" stopOpacity={0.18} />
                                  <stop offset="95%" stopColor="var(--chart-tertiary)" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                              <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                              <YAxis
                                allowDecimals={false}
                                tickFormatter={(value) =>
                                  Math.round(Number(value)).toLocaleString("en-US")
                                }
                                tick={{ fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                                width={48}
                              />
                              <Tooltip content={<ChartTooltip />} />
                              <Area
                                type="monotone"
                                dataKey="redeemed"
                                stroke="var(--chart-tertiary)"
                                strokeWidth={2}
                                fill="url(#engagementFill)"
                                dot={false}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <p className="text-sm text-muted-foreground">No volume data for this period.</p>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        {overview.engagement.segments.map((s) => (
                          <span key={s.segment} className="rounded-full bg-muted px-2 py-1">
                            {s.segment}: {s.memberCount.toLocaleString()}
                          </span>
                        ))}
                      </div>
                    </DashboardSectionCard>
                  </motion.section>,
                  <motion.section
                    key="health-volume"
                    layout="position"
                    layoutDependency={layoutDependency}
                    className="grid grid-cols-1 xl:grid-cols-3 gap-4"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={WIDGET_LAYOUT_TRANSITION}
                  >
                    <DashboardSectionCard className="xl:col-span-2">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="card-title text-foreground mb-1">Transaction volume</h3>
                          <p className="text-xs text-muted-foreground">{periodMeta.label}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Avg issued / day</p>
                          <p className="text-sm font-bold tabular-nums">
                            {formatPointsRaw(avgDailyIssued)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 h-64 w-full min-w-0">
                        {chartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <BarChart
                              accessibilityLayer
                              data={chartData}
                              barCategoryGap="18%"
                              margin={{ top: 8, right: 12, left: 4, bottom: 0 }}
                            >
                              <CartesianGrid
                                vertical={false}
                                horizontal
                                strokeDasharray="3 3"
                                stroke="rgba(0, 0, 0, 0.803)"
                              />
                              <XAxis
                                dataKey="day"
                                tickLine={{ stroke: "var(--foreground)", strokeWidth: 1 }}
                                tickMargin={10}
                                axisLine={{ stroke: "var(--foreground)", strokeWidth: 1 }}
                                tick={{ fontSize: 11, fill: "var(--foreground)" }}
                              />
                              <YAxis
                                domain={[0, "auto"]}
                                allowDecimals={false}
                                tickFormatter={(value) => formatPointsCompact(Number(value))}
                                tick={{ fontSize: 11, fill: "var(--foreground)" }}
                                axisLine={{ stroke: "var(--foreground)", strokeWidth: 1 }}
                                tickLine={{ stroke: "var(--foreground)", strokeWidth: 1 }}
                                width={56}
                              />
                              <Tooltip cursor={false} content={<ChartTooltip />} />
                              <Bar
                                dataKey="issued"
                                name="Issued"
                                fill="var(--chart-primary)"
                                radius={3}
                                maxBarSize={56}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No transactions for {periodMeta.label}.
                          </p>
                        )}
                      </div>
                    </DashboardSectionCard>

                    <DashboardSectionCard>
                      <h3 className="card-title text-foreground mb-1">Points Economics</h3>
                      <p className="text-xs text-muted-foreground mb-4">{periodMeta.label}</p>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-l-2 pl-3 border-[var(--chart-primary)]">
                          <p className="text-xs text-muted-foreground">
                            {periodMeta.isToday ? "Issued today" : "Issued in period"}
                          </p>
                          <p className="text-sm font-semibold tabular-nums">
                            {overview.pointsEconomics.issuedToday.toLocaleString()} pts
                          </p>
                        </div>
                        <div className="flex items-center justify-between border-l-2 pl-3 border-[var(--chart-secondary)]">
                          <p className="text-xs text-muted-foreground">Redeemed</p>
                          <p className="text-sm font-semibold tabular-nums">
                            {overview.pointsEconomics.redeemedToday.toLocaleString()} pts
                          </p>
                        </div>
                        <div className="flex items-center justify-between border-l-2 pl-3 border-[var(--chart-tertiary)]">
                          <p className="text-xs text-muted-foreground">Net Earned</p>
                          <p className="text-sm font-semibold tabular-nums">
                            {overview.pointsEconomics.netToday.toLocaleString()} pts
                          </p>
                        </div>
                        <div className="pt-4 border-t border-gray-100 dark:border-white/[0.06]">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">Burn rate</p>
                            <p className="text-sm font-bold tabular-nums">
                              {overview.pointsEconomics.burnRatePct30d.toFixed(1)}%
                            </p>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                            <div
                              className="h-full bg-[var(--chart-secondary)]"
                              style={{
                                width: `${Math.min(100, overview.pointsEconomics.burnRatePct30d)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </DashboardSectionCard>
                  </motion.section>,
                ];
              }

              if (widgetId === "rewards") {
                return [
                  <motion.section
                    key="rewards"
                    layout="position"
                    layoutDependency={layoutDependency}
                    className="grid grid-cols-1 gap-4"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={WIDGET_LAYOUT_TRANSITION}
                  >
                    <DashboardSectionCard>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="card-title text-foreground mb-1">Rules & Redemptions</h3>
                          <p className="text-xs text-muted-foreground">{periodMeta.label}</p>
                        </div>
                        <Link href="/dashboard/analytics/custom-reports">
                          <Button variant="outline" size="sm">
                            Full reports
                          </Button>
                        </Link>
                      </div>
                      <Tabs defaultValue="rules" className="mt-4 gap-4">
                        <TabsList>
                          <TabsTrigger value="rules">Top Rules</TabsTrigger>
                          <TabsTrigger value="redemptions">Top Redemptions</TabsTrigger>
                        </TabsList>
                        <TabsContent value="rules">
                          <RulesTable rows={overview.topRules} periodLabel={periodMeta.label} />
                        </TabsContent>
                        <TabsContent value="redemptions">
                          <RedemptionsTable rows={overview.topRedemptions} periodLabel={periodMeta.label} />
                        </TabsContent>
                      </Tabs>
                    </DashboardSectionCard>
                  </motion.section>,
                ];
              }

              if (widgetId === "referrals") {
                return [
                  <motion.section
                    key="referrals"
                    layout="position"
                    layoutDependency={layoutDependency}
                    aria-label="Referral programme"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={WIDGET_LAYOUT_TRANSITION}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <KpiCard
                        title="Total Referrals"
                        value={referralDashboard?.totalReferrals ?? 0}
                        tone="good"
                        variant="royal"
                        trendPct={referralDashboard?.totalReferralsTrendPct ?? 0}
                        sparkline={sparkFromReferralTrends(referralTrendsForPeriod, "referrals")}
                        trendLabel={kpiTrendLabel}
                        onClick={() => router.push("/dashboard/referrals/analytics")}
                      />
                      <KpiCard
                        title="Referrals Rewarded"
                        value={referralDashboard?.rewarded ?? 0}
                        tone="good"
                        variant="emerald"
                        trendPct={referralDashboard?.rewardedTrendPct ?? 0}
                        sparkline={sparkFromReferralTrends(referralTrendsForPeriod, "rewarded")}
                        trendLabel={kpiTrendLabel}
                        onClick={() => router.push("/dashboard/referrals/analytics")}
                      />
                      <KpiCard
                        title="Referral Conversion"
                        value={referralDashboard?.conversionRatePercent ?? 0}
                        unit="%"
                        tone="info"
                        variant="sky"
                        trendPct={referralDashboard?.conversionTrendPct ?? 0}
                        sparkline={sparkFromReferralTrends(referralTrendsForPeriod, "referrals")}
                        valueFormat={(v) => `${v.toFixed(1)}%`}
                        trendLabel={kpiTrendLabel}
                        onClick={() => router.push("/dashboard/referrals/analytics")}
                      />
                      <KpiCard
                        title="Referral Points Issued"
                        value={Number(referralDashboard?.totalPointsIssued ?? 0)}
                        unit="pts"
                        tone="warn"
                        variant="amber"
                        trendPct={referralDashboard?.totalPointsTrendPct ?? 0}
                        sparkline={sparkFromReferralTrends(referralTrendsForPeriod, "rewarded")}
                        valueFormat={(v) => Math.round(v).toLocaleString()}
                        trendLabel={kpiTrendLabel}
                        onClick={() => router.push("/dashboard/referrals/analytics")}
                      />
                    </div>

                    <DashboardSectionCard>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="card-title text-foreground mb-1">Referral Analytics</h3>
                          <p className="text-xs text-muted-foreground">
                            Trends and top referrers for {periodMeta.label}.
                          </p>
                        </div>
                        <Link href="/dashboard/referrals/analytics">
                          <Button variant="outline" size="sm">
                            Full analytics
                          </Button>
                        </Link>
                      </div>
                      <Tabs defaultValue="trends" className="mt-4 gap-4">
                        <TabsList>
                          <TabsTrigger value="trends">Referrals over time</TabsTrigger>
                          <TabsTrigger value="referrers">Top referrers</TabsTrigger>
                        </TabsList>
                        <TabsContent value="trends">
                          <ReferralTrendsTable rows={referralTrendsForPeriod} />
                        </TabsContent>
                        <TabsContent value="referrers">
                          <ReferralTopReferrersTable rows={referralTopReferrers} />
                        </TabsContent>
                      </Tabs>
                    </DashboardSectionCard>
                  </motion.section>,
                ];
              }

              if (widgetId === "tiers") {
                return [
                  <motion.section
                    key="tiers"
                    layout="position"
                    layoutDependency={layoutDependency}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={WIDGET_LAYOUT_TRANSITION}
                  >
                    <DashboardSectionCard>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="card-title text-foreground mb-1">Member Tier Distribution</h3>
                          <p className="text-xs text-muted-foreground">
                            Active members in {periodMeta.label}, grouped by tier.
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push("/dashboard/analytics/cohort-analysis")}
                        >
                          Cohort analysis
                        </Button>
                      </div>
                      <ProgressBar
                        className="mt-4"
                        variant="detailed"
                        animate
                        emptyMessage="No tier definitions or members yet."
                        items={overview.tierDistribution.map((tier) => {
                          const pct = tierTotal > 0 ? (tier.memberCount / tierTotal) * 100 : 0;
                          return {
                            key: tier.tierName,
                            label: tier.tierName,
                            leadingMeta: `${pct.toFixed(1)}%`,
                            value: pct,
                            suffix: tier.memberCount.toLocaleString(),
                          };
                        })}
                      />
                    </DashboardSectionCard>
                  </motion.section>,
                ];
              }

              return [];
            })}
          </AnimatePresence>
        </LayoutGroup>
      </div>

      <p className="text-[10px] text-muted-foreground text-right">
        Updated {new Date(overview.generatedAt).toLocaleString()}
      </p>
    </div>
  );
}

function SortableWidgetRow({
  widgetId,
  visible,
  onToggleVisibility,
}: {
  widgetId: WidgetId;
  visible: boolean;
  onToggleVisibility: (visible: boolean) => void;
}) {
  const sortable = useSortable({ id: widgetId });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-lg bg-[var(--surface-sunken)] p-2.5",
        sortable.isDragging && "z-10 opacity-90 shadow-lg ring-1 ring-border/60"
      )}
    >
      <button
        type="button"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Drag to reorder ${WIDGET_LABELS[widgetId]}`}
        {...sortable.attributes}
        {...sortable.listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <label className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium">
        <Checkbox
          checked={visible}
          onCheckedChange={(checked) => onToggleVisibility(checked === true)}
          aria-label={`Toggle ${WIDGET_LABELS[widgetId]} widget`}
        />
        <span className="truncate">{WIDGET_LABELS[widgetId]}</span>
      </label>
    </div>
  );
}

function WidgetCustomizeList({
  widgetOrder,
  hiddenWidgets,
  onReorder,
  onToggleVisibility,
}: {
  widgetOrder: WidgetId[];
  hiddenWidgets: WidgetId[];
  onReorder: (order: WidgetId[]) => void;
  onToggleVisibility: (widgetId: WidgetId, visible: boolean) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = widgetOrder.indexOf(active.id as WidgetId);
    const newIndex = widgetOrder.indexOf(over.id as WidgetId);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(widgetOrder, oldIndex, newIndex));
  };

  return (
    <DndContext
      sensors={sensors}
      onDragEnd={onDragEnd}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
    >
      <SortableContext items={widgetOrder} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {widgetOrder.map((widgetId) => (
            <SortableWidgetRow
              key={widgetId}
              widgetId={widgetId}
              visible={!hiddenWidgets.includes(widgetId)}
              onToggleVisibility={(visible) => onToggleVisibility(widgetId, visible)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function DashboardHeader({
  programmeOptions,
  programmeUid,
  programmeName,
  programmesLoading,
  onProgrammeChange,
  onRefresh,
  refreshing,
  onCustomize,
  onResetLayout,
  periodPreset,
  appliedDateRange,
  draftFromDate,
  draftToDate,
  periodBusy,
  maxDate,
  periodLabel,
  onSelectPeriodPreset,
  onEnterCustomPeriod,
  onDraftFromDateChange,
  onDraftToDateChange,
  onApplyCustomPeriod,
  onClearCustomPeriod,
}: {
  programmeOptions: { value: string; label: string }[];
  programmeUid: string;
  programmeName: string;
  programmesLoading: boolean;
  onProgrammeChange: (uid: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
  onCustomize: () => void;
  onResetLayout: () => void;
  periodPreset: DashboardPeriodPreset;
  appliedDateRange: DashboardDateRange;
  draftFromDate: string;
  draftToDate: string;
  periodBusy: boolean;
  maxDate: string;
  periodLabel: string;
  onSelectPeriodPreset: (preset: Exclude<DashboardPeriodPreset, "custom">) => void;
  onEnterCustomPeriod: () => void;
  onDraftFromDateChange: (value: string) => void;
  onDraftToDateChange: (value: string) => void;
  onApplyCustomPeriod: () => boolean;
  onClearCustomPeriod: () => void;
}) {
  const actionButtons = (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={refreshing}
        aria-busy={refreshing}
      >
        <motion.span
          className="mr-2 inline-flex shrink-0"
          animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
          transition={
            refreshing
              ? { repeat: Infinity, duration: 0.75, ease: "linear" }
              : { duration: 0 }
          }
        >
          <RefreshCw className="h-4 w-4" />
        </motion.span>
        Refresh
      </Button>
      <Button variant="outline" size="sm" onClick={onCustomize}>
        <GripVertical className="h-4 w-4 mr-2" />
        Customize
      </Button>
      <Button variant="outline" size="sm" onClick={onResetLayout}>
        <RotateCcw className="h-4 w-4 mr-2" />
        Reset layout
      </Button>
    </>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-lg font-bold tracking-tight">Dashboard Home</p>
          <p className="text-xs text-muted-foreground">
            Live programme metrics · {programmeName}
          </p>
        </div>
        {/* Spacer keeps layout aligned; real buttons are fixed while scrolling */}
        <div
          className="flex flex-wrap items-center gap-2 self-start sm:ml-auto invisible pointer-events-none"
          aria-hidden="true"
        >
          {actionButtons}
        </div>
      </div>
      <div
        className="fixed top-14 xl:top-16 right-4 xl:right-8 z-40 flex flex-wrap items-center gap-2 rounded-lg bg-[var(--surface-page)]/95 p-1 shadow-sm backdrop-blur-sm supports-[backdrop-filter]:bg-[var(--surface-page)]/80"
        aria-label="Dashboard actions"
      >
        {actionButtons}
      </div>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="relative w-full min-w-0 max-w-full sm:w-auto">
          <AnimatedSelect
            ariaLabel="Programme"
            variant="filter"
            value={programmeUid}
            disabled={programmesLoading || programmeOptions.length === 0}
            onChange={onProgrammeChange}
            options={programmeOptions}
          />
        </div>
        <div className="flex min-w-0 w-full flex-col gap-1 sm:w-auto sm:items-end">
          <DashboardPeriodDropdown
            preset={periodPreset}
            appliedRange={appliedDateRange}
            draftFrom={draftFromDate}
            draftTo={draftToDate}
            maxDate={maxDate}
            busy={periodBusy}
            onPresetSelect={onSelectPeriodPreset}
            onEnterCustomMode={onEnterCustomPeriod}
            onDraftFromChange={onDraftFromDateChange}
            onDraftToChange={onDraftToDateChange}
            onApplyCustom={onApplyCustomPeriod}
            onClearCustom={onClearCustomPeriod}
          />
          <p className="min-w-0 text-xs text-muted-foreground sm:text-right">
            Showing data for{" "}
            <span className="font-medium text-foreground break-words">{periodLabel}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

const rulesColumnHelper = createColumnHelper<DashboardTopRuleRow>();
const topRulesColumns = [
  rulesColumnHelper.accessor("ruleName", {
    header: "Rule",
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  }),
  rulesColumnHelper.accessor("evaluationCount", {
    header: "Evaluations",
    meta: { align: "right" },
    cell: (info) => (
      <span className="tabular-nums">{info.getValue().toLocaleString()}</span>
    ),
  }),
  rulesColumnHelper.accessor("totalPointsAwarded", {
    header: "Points awarded",
    meta: { align: "right" },
    cell: (info) => (
      <span className="tabular-nums">{Number(info.getValue()).toLocaleString()}</span>
    ),
  }),
];

const redemptionsColumnHelper = createColumnHelper<DashboardRedemptionRow>();
const topRedemptionsColumns = [
  redemptionsColumnHelper.accessor("label", {
    header: "Reward / type",
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  }),
  redemptionsColumnHelper.accessor("redemptionCount", {
    header: "Count",
    meta: { align: "right" },
    cell: (info) => (
      <span className="tabular-nums">{info.getValue().toLocaleString()}</span>
    ),
  }),
  redemptionsColumnHelper.accessor("totalPoints", {
    header: "Points",
    meta: { align: "right" },
    cell: (info) => (
      <span className="tabular-nums">{Number(info.getValue()).toLocaleString()}</span>
    ),
  }),
];

const referralTrendsColumnHelper = createColumnHelper<ReferralTrendPoint>();
const referralTrendsColumns = [
  referralTrendsColumnHelper.accessor("periodStart", {
    header: "Period",
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  }),
  referralTrendsColumnHelper.accessor("referrals", {
    header: "Referrals",
    meta: { align: "right" },
    cell: (info) => (
      <span className="tabular-nums">{info.getValue().toLocaleString()}</span>
    ),
  }),
  referralTrendsColumnHelper.accessor("rewarded", {
    header: "Rewarded",
    meta: { align: "right" },
    cell: (info) => (
      <span className="tabular-nums">{info.getValue().toLocaleString()}</span>
    ),
  }),
];

const referralTopReferrersColumnHelper = createColumnHelper<ReferralTopReferrer>();
const referralTopReferrersColumns = [
  referralTopReferrersColumnHelper.accessor("referrerCustomerId", {
    header: "Referrer",
    cell: (info) => (
      <span className="font-medium font-mono text-xs">{info.getValue()}</span>
    ),
  }),
  referralTopReferrersColumnHelper.accessor("referralCount", {
    header: "Referrals",
    meta: { align: "right" },
    cell: (info) => (
      <span className="tabular-nums">{info.getValue().toLocaleString()}</span>
    ),
  }),
  referralTopReferrersColumnHelper.accessor("rewardedCount", {
    header: "Rewarded",
    meta: { align: "right" },
    cell: (info) => (
      <span className="tabular-nums">{info.getValue().toLocaleString()}</span>
    ),
  }),
];

function RulesTable({
  rows,
  periodLabel,
}: {
  rows: DashboardOverview["topRules"];
  periodLabel: string;
}) {
  return (
    <AppTable
      embedded
      ariaLabel="Top rules"
      data={rows}
      columns={topRulesColumns as ColumnDef<DashboardTopRuleRow>[]}
      getRowId={(row) => row.ruleUid}
      emptyMessage={`No rule activity for ${periodLabel}.`}
      defaultPageSize={10}
    />
  );
}

function ReferralTrendsTable({ rows }: { rows: ReferralTrendPoint[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No referral activity yet.{" "}
        <Authorize
          permission="referrals.create"
          fallback={<span className="text-muted-foreground">Ask an admin to set up referrals.</span>}
        >
          <Link href="/dashboard/referrals/create" className="text-[var(--accent-primary)] hover:underline">
            Create a referral programme
          </Link>
        </Authorize>{" "}
        to get started.
      </p>
    );
  }
  return (
    <AppTable
      embedded
      ariaLabel="Referral trends"
      data={rows}
      columns={referralTrendsColumns as ColumnDef<ReferralTrendPoint>[]}
      getRowId={(row) => row.periodStart}
      defaultPageSize={10}
      searchable
    />
  );
}

function ReferralTopReferrersTable({ rows }: { rows: ReferralTopReferrer[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No top referrers yet.</p>;
  }
  return (
    <AppTable
      embedded
      ariaLabel="Top referrers"
      data={rows}
      columns={referralTopReferrersColumns as ColumnDef<ReferralTopReferrer>[]}
      getRowId={(row) => row.referrerCustomerId}
      defaultPageSize={10}
      searchable
    />
  );
}

function RedemptionsTable({
  rows,
  periodLabel,
}: {
  rows: DashboardOverview["topRedemptions"];
  periodLabel: string;
}) {
  return (
    <AppTable
      embedded
      ariaLabel="Top redemptions"
      data={rows}
      columns={topRedemptionsColumns as ColumnDef<DashboardRedemptionRow>[]}
      getRowId={(row) => row.label}
      emptyMessage={`No redemptions for ${periodLabel}.`}
      defaultPageSize={10}
    />
  );
}

export default function TenantDashboardHomePage() {
  return (
    <AnalyticsProgrammeProvider>
      <Suspense fallback={null}>
        <DashboardHomeContent />
      </Suspense>
    </AnalyticsProgrammeProvider>
  );
}
