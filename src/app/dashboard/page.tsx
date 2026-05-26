"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { GripVertical, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { KpiCard } from "@/components/tenant-dashboard/KpiCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { AnalyticsProgrammeProvider, useAnalyticsProgramme } from "@/lib/analytics/analytics-programme-context";
import { dashboardApi } from "@/lib/api/dashboard";
import { getAccessToken } from "@/lib/auth/session";
import type { DashboardOverview, DashboardVolumePoint } from "@/types/dashboard";

type SeriesPoint = { x: string; y: number };
type WidgetId = "kpis" | "health" | "rewards" | "tiers";
const WIDGET_STORAGE_KEY = "tenant_dashboard_widgets_v2";
const DEFAULT_WIDGET_ORDER: WidgetId[] = ["kpis", "health", "rewards", "tiers"];

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
          {typeof p.value === "number" ? p.value.toLocaleString("en-US") : p.value}
        </p>
      ))}
    </div>
  );
}

function volumeToChart(series: DashboardVolumePoint[]) {
  return series.map((d) => ({
    day: d.date.slice(5),
    issued: Number(d.issued) / 1_000_000,
    redeemed: Number(d.redeemed) / 1_000_000,
  }));
}

function sparkFromVolume(series: DashboardVolumePoint[], key: "issued" | "redeemed"): SeriesPoint[] {
  return series.map((d, i) => ({
    x: String(i),
    y: Number(d[key]) || 0,
  }));
}

function DashboardHomeContent() {
  const router = useRouter();
  const { programmes, programmeUid, programmeName, setProgrammeUid, programmesLoading } =
    useAnalyticsProgramme();

  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>(DEFAULT_WIDGET_ORDER);
  const [hiddenWidgets, setHiddenWidgets] = useState<WidgetId[]>([]);

  const load = useCallback(async () => {
    if (!getAccessToken()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardApi.getOverview(programmeUid);
      setOverview(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load dashboard";
      setError(msg);
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, [programmeUid]);

  useEffect(() => {
    if (!getAccessToken()) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await dashboardApi.getOverview(programmeUid);
        if (!cancelled) setOverview(data);
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "Failed to load dashboard";
          setError(msg);
          setOverview(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [programmeUid]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(WIDGET_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { order?: WidgetId[]; hidden?: WidgetId[] };
      if (parsed.order?.length) setWidgetOrder(parsed.order.filter((id) => DEFAULT_WIDGET_ORDER.includes(id)));
      if (parsed.hidden?.length) setHiddenWidgets(parsed.hidden.filter((id) => DEFAULT_WIDGET_ORDER.includes(id)));
    } catch {
      // noop
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      WIDGET_STORAGE_KEY,
      JSON.stringify({ order: widgetOrder, hidden: hiddenWidgets })
    );
  }, [widgetOrder, hiddenWidgets]);

  const chartData = useMemo(
    () => (overview ? volumeToChart(overview.volumeSeries) : []),
    [overview]
  );

  const tierTotal = useMemo(() => {
    if (!overview?.tierDistribution?.length) return 0;
    return overview.tierDistribution.reduce((s, t) => s + t.memberCount, 0);
  }, [overview]);

  const widgetPosition = (id: WidgetId) => widgetOrder.indexOf(id);
  const isVisible = (id: WidgetId) => !hiddenWidgets.includes(id);

  const programmeOptions = programmes.map((p) => ({
    value: p.programmeUid,
    label: p.name,
  }));

  if (loading && !overview) {
    return (
      <div className="px-4 py-6 lg:px-8 lg:py-8 space-y-4">
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
      <div className="px-4 py-10 lg:px-8">
        <Card className="bg-[var(--surface-card)] rounded-2xl p-8 shadow-[var(--shadow-card)] border-0 max-w-xl">
          <p className="text-lg font-bold">Unable to Load Dashboard</p>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
          <div className="mt-5 flex items-center gap-2">
            <Button onClick={() => void load()}>Retry</Button>
            <Button
              variant="outline"
              className="border-0 rounded-full bg-[var(--surface-sunken)]"
              onClick={() => router.push("/dashboard/support/contact")}
            >
              Contact Support
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (overview && !overview.hasData) {
    return (
      <div className="px-4 py-6 lg:px-8 lg:py-8 space-y-4">
        <DashboardHeader
          programmeOptions={programmeOptions}
          programmeUid={programmeUid}
          programmeName={programmeName}
          programmesLoading={programmesLoading}
          onProgrammeChange={setProgrammeUid}
          onRefresh={() => void load()}
          onCustomize={() => setCustomizeOpen(true)}
          onResetLayout={() => {
            setWidgetOrder(DEFAULT_WIDGET_ORDER);
            setHiddenWidgets([]);
          }}
        />
        <Card className="bg-[var(--surface-card)] rounded-2xl p-10 shadow-[var(--shadow-card)] border-0 max-w-2xl text-center">
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
        </Card>
      </div>
    );
  }

  if (!overview) return null;

  const retentionPct = overview.retention.latestRetentionPct ?? 0;
  const avgDailyIssued =
    overview.volumeSeries.length > 0
      ? overview.volumeSeries.reduce((s, d) => s + Number(d.issued), 0) /
        overview.volumeSeries.length
      : 0;

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 flex flex-col gap-6">
      <DashboardHeader
        programmeOptions={programmeOptions}
        programmeUid={programmeUid}
        programmeName={programmeName}
        programmesLoading={programmesLoading}
        onProgrammeChange={setProgrammeUid}
        onRefresh={() => void load()}
        onCustomize={() => setCustomizeOpen(true)}
        onResetLayout={() => {
          setWidgetOrder(DEFAULT_WIDGET_ORDER);
          setHiddenWidgets([]);
        }}
      />

      <Dialog open={customizeOpen} onOpenChange={setCustomizeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Customize Dashboard Widgets</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {widgetOrder.map((widgetId, idx) => (
              <div
                key={widgetId}
                className="flex items-center justify-between rounded-lg bg-[var(--surface-sunken)] p-2.5"
              >
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Checkbox
                    checked={!hiddenWidgets.includes(widgetId)}
                    onCheckedChange={(checked) => {
                      setHiddenWidgets((prev) =>
                        checked ? prev.filter((id) => id !== widgetId) : [...prev, widgetId]
                      );
                    }}
                    aria-label={`Toggle ${widgetId} widget`}
                  />
                  {widgetId.toUpperCase()}
                </label>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={idx === 0}
                    onClick={() =>
                      setWidgetOrder((prev) => {
                        const next = [...prev];
                        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                        return next;
                      })
                    }
                  >
                    Up
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={idx === widgetOrder.length - 1}
                    onClick={() =>
                      setWidgetOrder((prev) => {
                        const next = [...prev];
                        [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                        return next;
                      })
                    }
                  >
                    Down
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {isVisible("kpis") && (
        <motion.section
          aria-label="Executive summary"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ order: widgetPosition("kpis") }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-4">
            <KpiCard
              title="Active Members"
              value={overview.activeMembers.value}
              tone="good"
              trendPct={overview.activeMembers.trendPct ?? 0}
              sparkline={sparkFromVolume(overview.volumeSeries, "issued")}
              onClick={() => router.push("/dashboard/analytics/segment-analysis")}
            />
            <KpiCard
              title="Points Issued (Today)"
              value={overview.pointsIssuedToday.value}
              unit="pts"
              tone="good"
              trendPct={overview.pointsIssuedToday.trendPct ?? 0}
              sparkline={sparkFromVolume(overview.volumeSeries, "issued")}
              valueFormat={(v) => Math.round(v).toLocaleString()}
              onClick={() => router.push("/dashboard/analytics/custom-reports")}
            />
            <KpiCard
              title="Redemptions (Today)"
              value={overview.redemptionsToday.value}
              unit="pts"
              tone="warn"
              trendPct={overview.redemptionsToday.trendPct ?? 0}
              sparkline={sparkFromVolume(overview.volumeSeries, "redeemed")}
              valueFormat={(v) => Math.round(v).toLocaleString()}
              onClick={() => router.push("/dashboard/analytics/custom-reports")}
            />
            <KpiCard
              title="Avg Order Value"
              value={overview.avgOrderValue.value}
              unit="₹"
              tone="good"
              trendPct={overview.avgOrderValue.trendPct ?? 0}
              sparkline={sparkFromVolume(overview.volumeSeries, "issued")}
              valueFormat={(v) =>
                overview.avgOrderValue.value > 0 ? `₹${Math.round(v).toLocaleString("en-IN")}` : "—"
              }
              onClick={() => router.push("/dashboard/analytics/custom-reports")}
            />
            <KpiCard
              title="At-risk Members"
              value={overview.atRiskMemberPct.value}
              unit="%"
              tone="info"
              trendPct={overview.atRiskMemberPct.trendPct ?? 0}
              sparkline={sparkFromVolume(overview.volumeSeries, "redeemed")}
              valueFormat={(v) => `${v.toFixed(1)}%`}
              onClick={() => router.push("/dashboard/analytics/segment-analysis")}
            />
          </div>
        </motion.section>
      )}

      {isVisible("health") && (
        <motion.section
          aria-label="Program health and engagement"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ order: widgetPosition("health") }}
          className="grid grid-cols-1 xl:grid-cols-2 gap-4"
        >
          <Card className="bg-[var(--surface-card)] rounded-2xl p-6 shadow-[var(--shadow-card)] border-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="card-title text-foreground mb-1">Retention Rate</h3>
                <p className="text-xs text-muted-foreground">
                  {overview.retention.cohortMonth
                    ? `Cohort ${overview.retention.cohortMonth} · month 1`
                    : "Cohort data builds as members transact"}
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
            <div className="mt-5 space-y-2">
              {overview.tierDistribution.slice(0, 4).map((tier) => {
                const pct =
                  tierTotal > 0 ? Math.round((tier.memberCount / tierTotal) * 100) : 0;
                return (
                  <div key={tier.tierName} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-16 truncate">{tier.tierName}</span>
                    <div className="flex-1 bg-gray-100 dark:bg-white/10 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-[var(--accent-primary)] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold w-10 text-right tabular-nums">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="bg-[var(--surface-card)] rounded-2xl p-6 shadow-[var(--shadow-card)] border-0">
            <h3 className="card-title text-foreground mb-1">Member Engagement</h3>
            <p className="text-xs text-muted-foreground">
              {overview.engagement.activePct.toFixed(1)}% active (30-day window)
            </p>
            <div className="mt-4 h-44">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="engagementFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-tertiary)" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="var(--chart-tertiary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
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
          </Card>
        </motion.section>
      )}

      {isVisible("health") && (
        <motion.section
          className="grid grid-cols-1 xl:grid-cols-3 gap-4"
          style={{ order: widgetPosition("health") + 1 }}
        >
          <Card className="bg-[var(--surface-card)] rounded-2xl p-6 shadow-[var(--shadow-card)] border-0 xl:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="card-title text-foreground mb-1">7-Day Transaction Volume</h3>
                <p className="text-xs text-muted-foreground">Points issued vs redeemed (millions)</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Avg issued / day</p>
                <p className="text-sm font-bold tabular-nums">
                  {(avgDailyIssued / 1_000_000).toFixed(2)}M pts
                </p>
              </div>
            </div>
            <div className="mt-4 h-64">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="issuedFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-primary)" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="var(--chart-primary)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="redeemedFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-secondary)" stopOpacity={0.14} />
                        <stop offset="95%" stopColor="var(--chart-secondary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="issued"
                      stroke="var(--chart-primary)"
                      fill="url(#issuedFill)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="redeemed"
                      stroke="var(--chart-secondary)"
                      fill="url(#redeemedFill)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground">No transactions in the last 7 days.</p>
              )}
            </div>
          </Card>

          <Card className="bg-[var(--surface-card)] rounded-2xl p-6 shadow-[var(--shadow-card)] border-0">
            <h3 className="card-title text-foreground mb-1">Points Economics</h3>
            <p className="text-xs text-muted-foreground mb-4">Today and 30-day burn rate.</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between border-l-2 pl-3 border-[var(--chart-primary)]">
                <p className="text-xs text-muted-foreground">Issued Today</p>
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
                  <p className="text-xs text-muted-foreground">30-day Burn Rate</p>
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
          </Card>
        </motion.section>
      )}

      {isVisible("rewards") && (
        <motion.section
          className="grid grid-cols-1 gap-4"
          style={{ order: widgetPosition("rewards") }}
        >
          <Card className="bg-[var(--surface-card)] rounded-2xl p-6 shadow-[var(--shadow-card)] border-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="card-title text-foreground mb-1">Rules & Redemptions</h3>
                <p className="text-xs text-muted-foreground">Last 7 days from ledger and rule engine.</p>
              </div>
              <Link href="/dashboard/analytics/custom-reports">
                <Button variant="outline" size="sm">
                  Full reports
                </Button>
              </Link>
            </div>
            <Tabs defaultValue="rules" className="mt-4 gap-4">
              <TabsList className="bg-[var(--surface-sunken)] rounded-full px-1.5 py-1 w-fit">
                <TabsTrigger value="rules">Top Rules</TabsTrigger>
                <TabsTrigger value="redemptions">Top Redemptions</TabsTrigger>
              </TabsList>
              <TabsContent value="rules">
                <RulesTable rows={overview.topRules} />
              </TabsContent>
              <TabsContent value="redemptions">
                <RedemptionsTable rows={overview.topRedemptions} />
              </TabsContent>
            </Tabs>
          </Card>
        </motion.section>
      )}

      {isVisible("tiers") && (
        <motion.section style={{ order: widgetPosition("tiers") }}>
          <Card className="bg-[var(--surface-card)] rounded-2xl p-6 shadow-[var(--shadow-card)] border-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="card-title text-foreground mb-1">Member Tier Distribution</h3>
                <p className="text-xs text-muted-foreground">Live balance-based tier placement.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/dashboard/analytics/cohort-analysis")}
              >
                Cohort analysis
              </Button>
            </div>
            <div className="mt-4 space-y-3">
              {overview.tierDistribution.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tier definitions or members yet.</p>
              ) : (
                overview.tierDistribution.map((tier, index) => {
                  const pct = tierTotal > 0 ? (tier.memberCount / tierTotal) * 100 : 0;
                  return (
                    <div key={tier.tierName} className="flex items-center gap-4">
                      <div className="w-28">
                        <p className="text-xs font-medium">{tier.tierName}</p>
                        <p className="text-[11px] text-muted-foreground tabular-nums">{pct.toFixed(1)}%</p>
                      </div>
                      <div className="flex-1">
                        <div className="h-2 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, delay: index * 0.08 }}
                            className="h-2 rounded-full bg-[var(--accent-primary)]"
                          />
                        </div>
                      </div>
                      <p className="text-sm font-semibold tabular-nums w-20 text-right">
                        {tier.memberCount.toLocaleString()}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </motion.section>
      )}

      <p className="text-[10px] text-muted-foreground text-right">
        Updated {new Date(overview.generatedAt).toLocaleString()}
      </p>
    </div>
  );
}

function DashboardHeader({
  programmeOptions,
  programmeUid,
  programmeName,
  programmesLoading,
  onProgrammeChange,
  onRefresh,
  onCustomize,
  onResetLayout,
}: {
  programmeOptions: { value: string; label: string }[];
  programmeUid: string;
  programmeName: string;
  programmesLoading: boolean;
  onProgrammeChange: (uid: string) => void;
  onRefresh: () => void;
  onCustomize: () => void;
  onResetLayout: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-lg font-bold tracking-tight">Dashboard Home</p>
          <p className="text-xs text-muted-foreground">
            Live programme metrics · {programmeName}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh}>
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
        </div>
      </div>
      <div className="max-w-xs">
        <NativeSelect
          id="dashboard-programme"
          ariaLabel="Programme"
          value={programmeUid}
          disabled={programmesLoading || programmeOptions.length === 0}
          onChange={onProgrammeChange}
          options={programmeOptions}
        />
      </div>
    </div>
  );
}

function RulesTable({
  rows,
}: {
  rows: DashboardOverview["topRules"];
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No rule activity in the last 7 days.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="text-left py-2">Rule</th>
            <th className="text-right py-2">Evaluations</th>
            <th className="text-right py-2">Points awarded</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-white/[0.04]">
          {rows.map((r) => (
            <tr key={r.ruleUid}>
              <td className="py-3 font-medium">{r.ruleName}</td>
              <td className="py-3 text-right tabular-nums">{r.evaluationCount.toLocaleString()}</td>
              <td className="py-3 text-right tabular-nums">
                {Number(r.totalPointsAwarded).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RedemptionsTable({
  rows,
}: {
  rows: DashboardOverview["topRedemptions"];
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No redemptions in the last 7 days.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="text-left py-2">Reward / type</th>
            <th className="text-right py-2">Count</th>
            <th className="text-right py-2">Points</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-white/[0.04]">
          {rows.map((r) => (
            <tr key={r.label}>
              <td className="py-3 font-medium">{r.label}</td>
              <td className="py-3 text-right tabular-nums">{r.redemptionCount.toLocaleString()}</td>
              <td className="py-3 text-right tabular-nums">{Number(r.totalPoints).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TenantDashboardHomePage() {
  return (
    <AnalyticsProgrammeProvider>
      <DashboardHomeContent />
    </AnalyticsProgrammeProvider>
  );
}
