"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, CheckCircle2, ChevronRight, Clock, GripVertical, RotateCcw } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { KpiCard } from "@/components/tenant-dashboard/KpiCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";

type SeriesPoint = { x: string; y: number };
type WidgetId = "kpis" | "health" | "rewards" | "location" | "tiers" | "alerts";
const WIDGET_STORAGE_KEY = "tenant_dashboard_widgets_v1";
const DEFAULT_WIDGET_ORDER: WidgetId[] = ["kpis", "health", "rewards", "location", "tiers", "alerts"];

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

 function useDemoTimeSeries(): {
   kpis: Record<string, number>;
   trend: Record<string, number>;
   volume: { day: string; issued: number; redeemed: number }[];
 } {
   const [tick, setTick] = useState(0);

   useEffect(() => {
     const id = setInterval(() => setTick((t) => t + 1), 30000);
     return () => clearInterval(id);
   }, []);

   return useMemo(() => {
     // Slightly jitter values to show update animations.
     const jitter = (base: number, pct: number) =>
       Math.round(base * (1 + ((Math.sin(tick / 2) * pct) / 100)));

     const issued = jitter(1850420, 2.2);
     const redeemed = jitter(420150, 3.0);

     return {
       kpis: {
         activeMembers: jitter(45230, 1.2),
         pointsIssuedToday: issued,
         redemptionsToday: redeemed,
         avgOrderValue: jitter(5420, 1.0),
         churnRisk: 2.4 + Math.cos(tick / 2) * 0.15,
       },
       trend: {
         activeMembers: 8.3,
         pointsIssuedToday: 5.2,
         redemptionsToday: -2.1,
         avgOrderValue: 3.8,
         churnRisk: -0.8,
       },
       volume: [
         { day: "Mon", issued: 1.55, redeemed: 0.31 },
         { day: "Tue", issued: 1.2, redeemed: 0.24 },
         { day: "Wed", issued: 1.72, redeemed: 0.36 },
         { day: "Thu", issued: 1.85, redeemed: 0.41 },
         { day: "Fri", issued: 2.1, redeemed: 0.46 },
         { day: "Sat", issued: 2.3, redeemed: 0.52 },
         { day: "Sun", issued: 1.8, redeemed: 0.38 },
       ],
     };
   }, [tick]);
 }

 function spark(seed: number): SeriesPoint[] {
   // Deterministic small sparkline
   return Array.from({ length: 12 }).map((_, i) => ({
     x: String(i),
     y: Math.max(
       0,
       seed + Math.sin((i + 1) / 2) * seed * 0.08 + (i % 3 === 0 ? seed * 0.02 : 0)
     ),
   }));
 }

 export default function TenantDashboardHomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
   const demo = useDemoTimeSeries();
  const [loading, setLoading] = useState(true);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>(DEFAULT_WIDGET_ORDER);
  const [hiddenWidgets, setHiddenWidgets] = useState<WidgetId[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(WIDGET_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { order?: WidgetId[]; hidden?: WidgetId[] };
      if (parsed.order?.length) setWidgetOrder(parsed.order);
      if (parsed.hidden?.length) setHiddenWidgets(parsed.hidden);
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

  const scenario = searchParams.get("state");

  if (loading) {
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

  if (scenario === "error") {
    return (
      <div className="px-4 py-10 lg:px-8">
        <Card className="bg-[var(--surface-card)] rounded-2xl p-8 shadow-[var(--shadow-card)] border-0 max-w-xl">
          <p className="text-lg font-bold">Unable to Load Dashboard</p>
          <p className="text-sm text-muted-foreground mt-2">
            We are having trouble connecting to the data warehouse.
          </p>
          <div className="mt-5 flex items-center gap-2">
            <Button onClick={() => router.replace("/dashboard")}>Retry</Button>
            <Button
              variant="outline"
              className="border-0 rounded-full bg-[var(--surface-sunken)] hover:bg-[var(--accent-primary-soft)] hover:text-[var(--accent-primary)]"
              onClick={() => router.push("/dashboard/support/contact")}
            >
              Contact Support
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">Error ID: dash_err_demo_001</p>
        </Card>
      </div>
    );
  }

  if (scenario === "empty") {
    return (
      <div className="px-4 py-10 lg:px-8">
        <Card className="bg-[var(--surface-card)] rounded-2xl p-10 shadow-[var(--shadow-card)] border-0 max-w-2xl text-center">
          <p className="text-lg font-bold">No Data Yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Your loyalty program just launched. Check back after transactions are processed.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Button onClick={() => router.push("/dashboard/setup/event-schema")}>Learn event setup</Button>
            <Button
              variant="outline"
              className="border-0 rounded-full bg-[var(--surface-sunken)] hover:bg-[var(--accent-primary-soft)] hover:text-[var(--accent-primary)]"
              onClick={() => router.push("/dashboard/support/contact")}
            >
              Contact Support
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const widgetPosition = (id: WidgetId) => widgetOrder.indexOf(id);
  const isVisible = (id: WidgetId) => !hiddenWidgets.includes(id);

   return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-lg font-bold tracking-tight">Dashboard Home</p>
          <p className="text-xs text-muted-foreground">Understand program health in under 5 seconds.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-0 rounded-full bg-[var(--surface-sunken)] hover:bg-[var(--accent-primary-soft)] hover:text-[var(--accent-primary)]"
            onClick={() => setCustomizeOpen(true)}
          >
            <GripVertical className="h-4 w-4 mr-2" />
            Customize Widgets
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-0 rounded-full bg-[var(--surface-sunken)] hover:bg-[var(--accent-primary-soft)] hover:text-[var(--accent-primary)]"
            onClick={() => {
              setWidgetOrder(DEFAULT_WIDGET_ORDER);
              setHiddenWidgets([]);
            }}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Layout
          </Button>
        </div>
      </div>

      <Dialog open={customizeOpen} onOpenChange={setCustomizeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Customize Dashboard Widgets</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {widgetOrder.map((widgetId, idx) => (
              <div key={widgetId} className="flex items-center justify-between rounded-lg bg-[var(--surface-sunken)] p-2.5">
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
                    className="border-0 rounded-full bg-[var(--surface-card)] hover:bg-[var(--accent-primary-soft)] hover:text-[var(--accent-primary)]"
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
                    className="border-0 rounded-full bg-[var(--surface-card)] hover:bg-[var(--accent-primary-soft)] hover:text-[var(--accent-primary)]"
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
      {/* Above-the-fold: KPI cards */}
      {isVisible("kpis") && (
      <motion.section
        aria-label="Executive summary"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        style={{ order: widgetPosition("kpis") }}
      >
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-4">
           <KpiCard
             title="Active Members"
             value={demo.kpis.activeMembers}
             tone="good"
             trendPct={demo.trend.activeMembers}
             sparkline={spark(120)}
             onClick={() => router.push("/dashboard/detail/active-members")}
           />
           <KpiCard
             title="Points Issued (Today)"
             value={demo.kpis.pointsIssuedToday}
             unit="pts"
             tone="good"
             trendPct={demo.trend.pointsIssuedToday}
             sparkline={spark(95)}
             valueFormat={(v) => Math.round(v).toLocaleString()}
             onClick={() => router.push("/dashboard/detail/points-issued")}
           />
           <KpiCard
             title="Redemptions (Today)"
             value={demo.kpis.redemptionsToday}
             unit="pts"
             tone="warn"
             trendPct={demo.trend.redemptionsToday}
             sparkline={spark(80)}
             valueFormat={(v) => Math.round(v).toLocaleString()}
             onClick={() => router.push("/dashboard/detail/redemptions")}
           />
           <KpiCard
             title="Avg Order Value"
             value={demo.kpis.avgOrderValue}
             unit="₹"
             tone="good"
             trendPct={demo.trend.avgOrderValue}
             sparkline={spark(60)}
             valueFormat={(v) => `₹${Math.round(v).toLocaleString("en-IN")}`}
             onClick={() => router.push("/dashboard/detail/aov")}
           />
           <KpiCard
             title="Churn Risk"
             value={demo.kpis.churnRisk}
             unit="%"
             tone="info"
             trendPct={demo.trend.churnRisk}
             sparkline={spark(50)}
             valueFormat={(v) => `${v.toFixed(1)}%`}
             onClick={() => router.push("/dashboard/detail/churn-risk")}
           />
         </div>
      </motion.section>
      )}

      {isVisible("health") && (
      <motion.section
        aria-label="Program health and engagement"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut", delay: 0.02 }}
        style={{ order: widgetPosition("health") }}
        className="grid grid-cols-1 xl:grid-cols-2 gap-4"
      >
        <Card className="bg-[var(--surface-card)] rounded-2xl p-6 shadow-[var(--shadow-card)] border-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="card-title text-foreground mb-1">Retention Rate</h3>
              <p className="text-xs text-muted-foreground">Target: 70% • Up 3.1% vs last month</p>
            </div>
            <p className="text-[var(--accent-primary)] font-bold text-2xl tabular-nums">65.2%</p>
          </div>

          <div className="mt-4">
            <Progress value={65.2} />
          </div>

          <div className="mt-5">
            {[
              { label: "Gold", value: 78, color: "#F59E0B" },
              { label: "Silver", value: 62, color: "#9CA3AF" },
              { label: "Bronze", value: 45, color: "#CD7C2F" },
            ].map((tier) => (
              <div key={tier.label} className="flex items-center gap-3 mb-2">
                <span className="text-xs text-muted-foreground w-12">{tier.label}</span>
                <div className="flex-1 bg-gray-100 dark:bg-white/10 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full transition-all duration-700"
                    style={{ width: `${tier.value}%`, backgroundColor: tier.color }}
                  />
                </div>
                <span className="text-xs font-semibold w-10 text-right tabular-nums">{tier.value}%</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-[var(--surface-card)] rounded-2xl p-6 shadow-[var(--shadow-card)] border-0">
          <h3 className="card-title text-foreground mb-1">Member Engagement</h3>
          <p className="text-xs text-muted-foreground">38.5% active in 7 days • Down 2.3% vs last month</p>
          <div className="mt-4 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={demo.volume}>
                <defs>
                  <linearGradient id="engagementFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-tertiary)" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="var(--chart-tertiary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                <XAxis tick={{ fontSize: 11, fill: "var(--status-neutral)" }} dataKey="day" axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--status-neutral)" }} axisLine={false} tickLine={false} width={40} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--accent-primary)", strokeWidth: 1, strokeDasharray: "3 3" }} />
                <Area
                  type="monotone"
                  dataKey="redeemed"
                  stroke="var(--chart-tertiary)"
                  strokeWidth={2}
                  fill="url(#engagementFill)"
                  dot={false}
                  activeDot={{ r: 4, fill: "var(--chart-tertiary)", strokeWidth: 2, stroke: "var(--surface-card)" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex gap-2 text-xs">
            <span className="rounded-full bg-muted px-2 py-1">Mobile 45%</span>
            <span className="rounded-full bg-muted px-2 py-1">In-store 42%</span>
            <span className="rounded-full bg-muted px-2 py-1">Web 13%</span>
          </div>
        </Card>
      </motion.section>
      )}

      {/* Core analytics */}
      {isVisible("health") && (
      <motion.section
        className="grid grid-cols-1 xl:grid-cols-3 gap-4"
        aria-label="Core analytics"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut", delay: 0.05 }}
        style={{ order: widgetPosition("health") + 1 }}
      >
         <Card className="bg-[var(--surface-card)] rounded-2xl p-6 shadow-[var(--shadow-card)] border-0 ring-0 xl:col-span-2">
           <div className="flex items-start justify-between gap-4">
             <div>
               <h3 className="card-title text-foreground mb-1">7-Day Transaction Volume</h3>
               <p className="text-xs text-muted-foreground">Quick trend check. Hover for exact values.</p>
             </div>
             <div className="text-right">
               <p className="text-xs text-muted-foreground">Avg</p>
               <p className="text-sm font-bold">1.85M pts/day</p>
             </div>
           </div>

           <div className="mt-4 h-64">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={demo.volume} margin={{ left: 6, right: 6, top: 8, bottom: 0 }}>
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
                 <XAxis tick={{ fontSize: 11, fill: "var(--status-neutral)" }} dataKey="day" axisLine={false} tickLine={false} />
                 <YAxis tick={{ fontSize: 11, fill: "var(--status-neutral)" }} axisLine={false} tickLine={false} width={40} />
                 <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--accent-primary)", strokeWidth: 1, strokeDasharray: "3 3" }} />
                 <Area
                   type="monotone"
                   dataKey="issued"
                   stroke="var(--chart-primary)"
                   fill="url(#issuedFill)"
                   strokeWidth={2}
                   dot={false}
                   activeDot={{ r: 4, fill: "var(--chart-primary)", strokeWidth: 2, stroke: "var(--surface-card)" }}
                 />
                 <Area
                   type="monotone"
                   dataKey="redeemed"
                   stroke="var(--chart-secondary)"
                   fill="url(#redeemedFill)"
                   strokeWidth={2}
                   dot={false}
                   activeDot={{ r: 4, fill: "var(--chart-secondary)", strokeWidth: 2, stroke: "var(--surface-card)" }}
                 />
               </AreaChart>
             </ResponsiveContainer>
           </div>
         </Card>

        <Card className="bg-[var(--surface-card)] rounded-2xl p-6 shadow-[var(--shadow-card)] border-0">
          <h3 className="card-title text-foreground mb-1">Points Economics</h3>
          <p className="text-xs text-muted-foreground mb-4">Traffic-light logic for fast decisions.</p>

          <div className="space-y-3">
            <div className="flex items-center justify-between border-l-2 pl-3" style={{ borderColor: "var(--chart-primary)" }}>
              <p className="text-xs text-muted-foreground">Issued Today</p>
              <p className="text-sm font-semibold tabular-nums">
                {(demo.kpis.pointsIssuedToday / 1_000_000).toFixed(2)}M pts
              </p>
            </div>
            <div className="flex items-center justify-between border-l-2 pl-3" style={{ borderColor: "var(--chart-secondary)" }}>
              <p className="text-xs text-muted-foreground">Redeemed</p>
              <p className="text-sm font-semibold tabular-nums">
                {(demo.kpis.redemptionsToday / 1_000_000).toFixed(2)}M pts
              </p>
            </div>
            <div className="flex items-center justify-between border-l-2 pl-3" style={{ borderColor: "var(--chart-tertiary)" }}>
              <p className="text-xs text-muted-foreground">Net Earned</p>
              <p className="text-sm font-semibold tabular-nums">
                {((demo.kpis.pointsIssuedToday - demo.kpis.redemptionsToday) / 1_000_000).toFixed(2)}M pts
              </p>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-white/[0.06]">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Monthly Burn Rate</p>
                <p className="text-sm font-bold tabular-nums">23.4%</p>
              </div>
              <div className="mt-2 h-2 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden relative">
                <div className="absolute inset-y-0 left-[20%] right-[70%] bg-emerald-500/20" />
                <div className="h-full bg-[var(--chart-secondary)]" style={{ width: "23.4%" }} />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Healthy: 20–30%</p>
            </div>
          </div>
        </Card>
      </motion.section>
      )}

       {/* Rewards + alerts */}
      {isVisible("rewards") && (
      <motion.section
        className="grid grid-cols-1 xl:grid-cols-3 gap-4"
        aria-label="Rewards and insights"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut", delay: 0.1 }}
        style={{ order: widgetPosition("rewards") }}
      >
         <Card className="bg-[var(--surface-card)] rounded-2xl p-6 shadow-[var(--shadow-card)] border-0 xl:col-span-2">
           <div className="flex items-start justify-between gap-3">
             <div>
               <h3 className="card-title text-foreground mb-1">Rewards & Catalog Performance</h3>
               <p className="text-xs text-muted-foreground">A quick view of what customers love.</p>
             </div>
             <div className="flex items-center gap-2">
               <Button variant="outline" size="sm">
                 Export CSV
               </Button>
               <Button size="sm">View Catalog</Button>
             </div>
           </div>

           <div className="mt-4">
             <Tabs defaultValue="top" className="gap-4">
               <TabsList className="bg-[var(--surface-sunken)] rounded-full px-1.5 py-1 w-fit">
                 <TabsTrigger value="top">Top Rewards</TabsTrigger>
                 <TabsTrigger value="redemptions">Redemptions</TabsTrigger>
                 <TabsTrigger value="inventory">Inventory</TabsTrigger>
               </TabsList>

               <TabsContent value="top" className="mt-2">
                 <RewardsTable onView={(reward) => router.push(`/dashboard/detail/reward-${reward}`)} />
               </TabsContent>
               <TabsContent value="redemptions" className="mt-2">
                 <PlaceholderPanel title="Redemptions analytics" />
               </TabsContent>
               <TabsContent value="inventory" className="mt-2">
                 <PlaceholderPanel title="Inventory health" />
               </TabsContent>
             </Tabs>
           </div>
         </Card>

         {isVisible("alerts") && (
         <Card className="bg-[var(--surface-card)] rounded-2xl p-6 shadow-[var(--shadow-card)] border-0">
           <p className="text-sm font-semibold">Alerts & AI Insights</p>
           <p className="text-xs text-muted-foreground mt-1">
             Action items surfaced with context.
           </p>

           <div className="mt-4 space-y-3">
             <AlertItem
               tone="critical"
               title="Location #12: churn 48% this month"
               description="Recommendation: launch re-engagement campaign by end of week."
               actionLabel="Take Action"
              onAction={() => router.push("/dashboard/campaigns/create")}
             />
             <AlertItem
               tone="warn"
               title="Redemption rate down 3.2%"
               description="Recommendation: feature the Free Dessert reward (currently #3)."
               actionLabel="Details"
              onAction={() => router.push("/dashboard/analytics/custom-reports")}
             />
             <AlertItem
               tone="good"
               title="Mobile app engagement +12% this week"
               description="Consider allocating budget to app-exclusive offers."
               actionLabel="Details"
              onAction={() => router.push("/dashboard/analytics/segment-analysis")}
             />
           </div>

           <Button variant="outline" className="w-full mt-4">
             See all insights
             <ChevronRight className="h-4 w-4 ml-2" />
           </Button>
         </Card>
         )}
      </motion.section>
      )}

       {/* Location performance */}
      {isVisible("location") && (
      <motion.section
        aria-label="Location performance"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut", delay: 0.12 }}
        style={{ order: widgetPosition("location") }}
      >
        <Card className="bg-[var(--surface-card)] rounded-2xl p-6 shadow-[var(--shadow-card)] border-0">
           <div className="flex items-start justify-between gap-3">
             <div>
              <h3 className="card-title text-foreground mb-1">Location Performance</h3>
              <p className="text-xs text-muted-foreground">
                Sortable view for quick comparison. Click a location to drill down.
              </p>
             </div>
             <Button variant="outline" size="sm">
               Export
             </Button>
           </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
               <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="text-left py-2">Location</th>
                  <th className="text-right py-2">Members</th>
                  <th className="text-right py-2">Points Issued</th>
                  <th className="text-right py-2">Redeemed</th>
                  <th className="text-right py-2">Status</th>
                 </tr>
               </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/[0.04]">
                 {[
                   {
                     name: "Delhi Central",
                     members: 3420,
                     issued: 850200,
                     redeemed: 180420,
                     tone: "good",
                     delta: 12,
                   },
                   { name: "Mumbai Fort", members: 2890, issued: 720100, redeemed: 150850, tone: "good", delta: 8 },
                   { name: "Delhi East", members: 1230, issued: 320100, redeemed: 65200, tone: "warn", delta: -5 },
                   { name: "Bangalore", members: 540, issued: 85300, redeemed: 12100, tone: "critical", delta: -18 },
                 ].map((row) => (
                   <tr
                     key={row.name}
                    className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] cursor-pointer transition-colors"
                     onClick={() => router.push(`/dashboard/detail/location-${row.name.toLowerCase().replace(/\s+/g, "-")}`)}
                   >
                     <td className="py-3 font-medium">{row.name}</td>
                     <td className="py-3 text-right tabular-nums">{row.members.toLocaleString()}</td>
                     <td className="py-3 text-right tabular-nums">{row.issued.toLocaleString()}</td>
                     <td className="py-3 text-right tabular-nums">{row.redeemed.toLocaleString()}</td>
                     <td className="py-3 text-right">
                      <span
                        className={cn(
                          "inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full",
                          row.delta > 0
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                            : row.delta < 0
                              ? "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        )}
                      >
                        {row.delta > 0 ? `+${row.delta}%` : row.delta < 0 ? `-${Math.abs(row.delta)}%` : "0%"}
                      </span>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
         </Card>
      </motion.section>
      )}

      {isVisible("tiers") && (
      <motion.section
        aria-label="Tier distribution"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut", delay: 0.14 }}
        style={{ order: widgetPosition("tiers") }}
      >
        <Card className="bg-[var(--surface-card)] rounded-2xl p-6 shadow-[var(--shadow-card)] border-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="card-title text-foreground mb-1">Member Tier Distribution</h3>
              <p className="text-xs text-muted-foreground">Track progression and inactive share.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/analytics/cohort-analysis")}>
              Compare Periods
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {[
              { name: "Gold", pct: 12.4, count: 5620, color: "#F59E0B" },
              { name: "Silver", pct: 38.9, count: 17550, color: "#94A3B8" },
              { name: "Bronze", pct: 28.2, count: 12730, color: "#CD7C2F" },
              { name: "Inactive >90d", pct: 20.5, count: 9230, color: "#EF4444" },
            ].map((tier, index) => (
              <div key={tier.name} className="flex items-center gap-4">
                <div className="w-28">
                  <p className="text-xs font-medium">{tier.name}</p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">{tier.pct.toFixed(1)}%</p>
                </div>
                <div className="flex-1">
                  <div className="h-2 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${tier.pct}%` }}
                      transition={{
                        duration: 0.8,
                        delay: index * 0.1,
                        ease: [0.25, 0.46, 0.45, 0.94],
                      }}
                      className="h-2 rounded-full"
                      style={{ backgroundColor: tier.color }}
                    />
                  </div>
                </div>
                <p className="text-sm font-semibold tabular-nums w-20 text-right">
                  {tier.count.toLocaleString("en-US")}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </motion.section>
      )}

     </div>
   );
 }

 function PlaceholderPanel({ title }: { title: string }) {
   return (
    <div className="bg-[var(--surface-sunken)] rounded-xl p-4">
      <p className="card-title">{title}</p>
       <p className="text-xs text-muted-foreground mt-1">
         Hook this up to real analytics once ingestion/warehouse is live.
       </p>
     </div>
   );
 }

function RewardsTable({ onView }: { onView: (reward: string) => void }) {
   const rows = [
     { rank: 1, name: "Free Beverage", redemptions: 12450, rate: 34.2, trend: 8 },
     { rank: 2, name: "20% Discount", redemptions: 8320, rate: 22.9, trend: -3 },
     { rank: 3, name: "Free Dessert", redemptions: 6150, rate: 16.9, trend: 2 },
     { rank: 4, name: "Loyalty Badge", redemptions: 4200, rate: 11.5, trend: 0 },
     { rank: 5, name: "Free Upgrade", redemptions: 2880, rate: 7.9, trend: 12 },
   ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="text-left py-2">Rank</th>
            <th className="text-left py-2">Reward</th>
            <th className="text-right py-2">Redemptions</th>
            <th className="text-right py-2">Rate</th>
            <th className="text-right py-2">Trend</th>
            <th className="text-right py-2">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-white/[0.04]">
          {rows.map((r) => (
            <tr key={r.rank} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
              <td className="py-3 font-medium">{r.rank}</td>
              <td className="py-3 font-medium">{r.name}</td>
              <td className="py-3 text-right tabular-nums">{r.redemptions.toLocaleString("en-US")}</td>
              <td className="py-3 text-right tabular-nums">{r.rate.toFixed(1)}%</td>
              <td className="py-3 text-right tabular-nums">
                <span
                  className={cn(
                    "inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full",
                    r.trend > 0
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                      : r.trend < 0
                        ? "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  )}
                >
                  {r.trend > 0 ? `+${r.trend}%` : r.trend < 0 ? `-${Math.abs(r.trend)}%` : "0%"}
                </span>
              </td>
              <td className="py-3 text-right">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => onView(r.name.toLowerCase().replace(/\s+/g, "-"))}
                >
                  View
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
 }

 function AlertItem({
   tone,
   title,
   description,
   actionLabel,
  onAction,
 }: {
   tone: "critical" | "warn" | "good";
   title: string;
   description: string;
   actionLabel: string;
  onAction: () => void;
 }) {
  const alertStyles = {
    critical: {
      border: "border-l-4 border-l-red-500",
      bg: "bg-[var(--status-critical-bg)]",
      iconColor: "text-red-500",
      badge: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
    },
    warn: {
      border: "border-l-4 border-l-amber-500",
      bg: "bg-[var(--status-warning-bg)]",
      iconColor: "text-amber-500",
      badge: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
    },
    good: {
      border: "border-l-4 border-l-emerald-500",
      bg: "bg-[var(--status-positive-bg)]",
      iconColor: "text-emerald-500",
      badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
    },
  } as const;
  const s = alertStyles[tone];

   const icon =
     tone === "critical" ? (
      <AlertTriangle className="h-4 w-4" />
     ) : tone === "warn" ? (
      <Clock className="h-4 w-4" />
     ) : (
      <CheckCircle2 className="h-4 w-4" />
     );

   return (
     <motion.div
       initial={{ opacity: 0, y: 6 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ duration: 0.18 }}
      className={cn("rounded-r-xl p-4 border-0", s.bg, s.border)}
     >
       <div className="flex items-start gap-3">
         <div className="mt-0.5 shrink-0" aria-hidden="true">
          <span className={cn("inline-flex items-center justify-center", s.iconColor)}>{icon}</span>
         </div>
         <div className="min-w-0">
           <p className="text-sm font-semibold leading-snug">{title}</p>
           <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
           <div className="mt-3 flex gap-2">
            <Button size="sm" className={cn("rounded-full px-3", s.badge)} onClick={onAction}>
              {actionLabel}
            </Button>
            <Button size="sm" variant="outline" className="rounded-full">
               Dismiss
             </Button>
           </div>
         </div>
       </div>
     </motion.div>
   );
 }
