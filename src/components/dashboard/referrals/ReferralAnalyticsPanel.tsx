"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ReferralSectionShell } from "@/components/dashboard/referrals/ReferralSectionShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { lastNDaysRange } from "@/lib/analytics/date-range";
import { referralApi, type ReferralEffectivenessReport } from "@/lib/api/client";
import { useReferralProgramme } from "@/lib/referrals/use-referral-programme";

const FUNNEL_COLORS = ["#888780", "#378ADD", "#1D9E75", "#EF9F27", "#E24B4A", "#9CA3AF"];

const EMPTY_REPORT: ReferralEffectivenessReport = {
  programmeUid: "default",
  fromDate: "",
  toDate: "",
  currency: "INR",
  periodMetrics: {
    totalReferrals: 0,
    signedUp: 0,
    rewarded: 0,
    pending: 0,
    fraudFlagged: 0,
    rejected: 0,
    withPurchase: 0,
    totalRefereeSpend: 0,
    totalRewardPoints: 0,
    conversionRatePercent: 0,
    signupRatePercent: 0,
    purchaseRatePercent: 0,
  },
  priorPeriodMetrics: {
    totalReferrals: 0,
    signedUp: 0,
    rewarded: 0,
    pending: 0,
    fraudFlagged: 0,
    rejected: 0,
    withPurchase: 0,
    totalRefereeSpend: 0,
    totalRewardPoints: 0,
    conversionRatePercent: 0,
    signupRatePercent: 0,
    purchaseRatePercent: 0,
  },
  rewardCostInCurrency: 0,
  revenuePerRewardCurrency: 0,
  netRefereeValue: 0,
  avgPointsPerRewardedReferral: 0,
  costPerRewardedReferralPoints: 0,
  timeToFirstPurchase: { averageHoursToFirstPurchase: 0, sampleSize: 0 },
  funnel: [],
  dailyTrends: [],
  topReferrers: [],
  programmeComparisons: [],
};

function formatCount(n: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}

function formatMoney(n: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

function formatPct(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function tooltipCount(value: unknown): string {
  const n = typeof value === "number" ? value : Number(value);
  return formatCount(Number.isFinite(n) ? n : 0);
}

export function ReferralAnalyticsPanel() {
  const { programmeUid, refreshDashboard } = useReferralProgramme();
  const initial = lastNDaysRange(90);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [report, setReport] = useState<ReferralEffectivenessReport>(EMPTY_REPORT);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setReport(await referralApi.getEffectivenessReport(programmeUid, from, to));
    } catch (e: unknown) {
      setReport(EMPTY_REPORT);
      setLoadError(e instanceof Error ? e.message : "Failed to load referral effectiveness report");
    } finally {
      setLoading(false);
    }
  }, [programmeUid, from, to]);

  useEffect(() => {
    void refreshDashboard();
    void load();
  }, [load, refreshDashboard]);

  const trendChart = useMemo(
    () =>
      report.dailyTrends.map((t) => ({
        date: t.periodStart,
        referrals: t.referrals,
        rewarded: t.rewarded,
        conversion: t.conversionRatePercent,
      })),
    [report.dailyTrends]
  );

  const funnelChart = useMemo(
    () => report.funnel.filter((f) => f.count > 0).map((f) => ({ name: f.stage, value: f.count })),
    [report.funnel]
  );

  const comparisonChart = useMemo(
    () =>
      report.programmeComparisons.slice(0, 6).map((p) => ({
        name: p.programmeName.length > 14 ? `${p.programmeName.slice(0, 14)}…` : p.programmeName,
        referrals: p.totalReferrals,
        conversion: p.conversionRatePercent,
      })),
    [report.programmeComparisons]
  );

  const { period: m, prior: priorM, currency } = {
    period: report.periodMetrics,
    prior: report.priorPeriodMetrics,
    currency: report.currency || "INR",
  };

  return (
    <ReferralSectionShell
      title="Referral effectiveness"
      description="Conversion funnel, reward ROI, programme comparison, and baseline vs prior period."
      showMetrics
    >
      {loadError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{loadError}</div>
      ) : null}

      <section className="rounded-lg border bg-card p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label htmlFor="referral-from" className="text-xs text-muted-foreground">From</label>
            <Input id="referral-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label htmlFor="referral-to" className="text-xs text-muted-foreground">To</label>
            <Input id="referral-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button onClick={() => void load()} disabled={loading}>{loading ? "Loading…" : "Apply"}</Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Kpi label="Referrals" value={formatCount(m.totalReferrals)} sub={`${formatPct(report.periodOverPeriodReferralsChangePct)} vs prior (${formatCount(priorM.totalReferrals)})`} />
          <Kpi label="Conversion rate" value={`${m.conversionRatePercent.toFixed(1)}%`} sub={`${report.periodOverPeriodConversionChangePts != null ? `${report.periodOverPeriodConversionChangePts >= 0 ? "+" : ""}${report.periodOverPeriodConversionChangePts.toFixed(1)} pts vs prior` : "—"} · signup ${m.signupRatePercent.toFixed(0)}%`} />
          <Kpi label="Referee spend" value={formatMoney(Number(m.totalRefereeSpend), currency)} sub={`Purchase rate ${m.purchaseRatePercent.toFixed(0)}%`} />
          <Kpi label="Reward ROI" value={`${Number(report.revenuePerRewardCurrency).toFixed(1)}×`} sub={`Spend ${formatMoney(Number(report.rewardCostInCurrency), currency)} · net ${formatMoney(Number(report.netRefereeValue), currency)}`} />
        </div>

        {report.timeToFirstPurchase.sampleSize > 0 ? (
          <p className="text-sm text-muted-foreground">
            Avg time to first purchase:{" "}
            <span className="font-medium text-foreground">{report.timeToFirstPurchase.averageHoursToFirstPurchase.toFixed(1)}h</span>
            {" "}({report.timeToFirstPurchase.sampleSize} referrals with purchases)
          </p>
        ) : null}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Referrals & conversion trend" subtitle="Daily volume and reward conversion rate">
          {loading ? <Skeleton /> : trendChart.length === 0 ? <Empty message="No referrals in this range." /> : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip formatter={(v, name) => [name === "conversion" ? `${Number(v).toFixed(1)}%` : tooltipCount(v), name === "conversion" ? "Conversion %" : name === "rewarded" ? "Rewarded" : "Referrals"]} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="referrals" name="Referrals" stroke="var(--chart-primary)" strokeWidth={2} dot={false} />
                  <Line yAxisId="left" type="monotone" dataKey="rewarded" name="Rewarded" stroke="var(--chart-secondary)" strokeWidth={2} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="conversion" name="Conversion %" stroke="#EF9F27" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel title="Status funnel" subtitle="Where referrals sit in the lifecycle">
          {loading ? <Skeleton /> : funnelChart.length === 0 ? <Empty message="No funnel data." /> : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={funnelChart} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                    {funnelChart.map((_, i) => (
                      <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => tooltipCount(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Programme comparison" subtitle="Referral volume across programmes in this period">
          {loading ? <Skeleton /> : comparisonChart.length === 0 ? <Empty message="No programme data." /> : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="referrals" name="Referrals" fill="var(--chart-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel title="Effectiveness vs baseline" subtitle="Selected period compared to equal-length prior period">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 pr-4">Metric</th>
                  <th className="py-2 pr-4 text-right">This period</th>
                  <th className="py-2 pr-4 text-right">Prior period</th>
                  <th className="py-2 text-right">Change</th>
                </tr>
              </thead>
              <tbody>
                <BaselineRow label="Referrals" current={m.totalReferrals} prior={priorM.totalReferrals} pct={report.periodOverPeriodReferralsChangePct} />
                <BaselineRow label="Rewarded" current={m.rewarded} prior={priorM.rewarded} pct={report.periodOverPeriodRewardedChangePct} />
                <BaselineRow label="Conversion %" current={m.conversionRatePercent} prior={priorM.conversionRatePercent} isPoints />
                <BaselineRow label="Referee spend" current={Number(m.totalRefereeSpend)} prior={Number(priorM.totalRefereeSpend)} currency={currency} />
                <BaselineRow label="Reward points" current={Number(m.totalRewardPoints)} prior={Number(priorM.totalRewardPoints)} />
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <Panel title="Top referrers" subtitle="Referrers driving volume, spend, and rewards in period">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="py-2 pr-4">Referrer</th>
                <th className="py-2 pr-4 text-right">Referrals</th>
                <th className="py-2 pr-4 text-right">Rewarded</th>
                <th className="py-2 pr-4 text-right">Conversion</th>
                <th className="py-2 pr-4 text-right">Referee spend</th>
                <th className="py-2 text-right">Points earned</th>
              </tr>
            </thead>
            <tbody>
              {report.topReferrers.length === 0 ? (
                <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">No referrers in this range</td></tr>
              ) : report.topReferrers.map((r) => (
                <tr key={r.referrerCustomerId} className="border-b border-border/30">
                  <td className="py-2 pr-4 font-mono text-xs">{r.referrerCustomerId}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{r.referralCount}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{r.rewardedCount}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{(r.conversionRatePercent ?? 0).toFixed(0)}%</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{formatMoney(Number(r.totalRefereeSpend ?? 0), currency)}</td>
                  <td className="py-2 text-right tabular-nums">{formatCount(Number(r.pointsEarned ?? 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </ReferralSectionShell>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
      {sub ? <p className="text-xs text-muted-foreground mt-1">{sub}</p> : null}
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm space-y-3">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function BaselineRow({
  label,
  current,
  prior,
  pct,
  currency,
  isPoints,
}: {
  label: string;
  current: number;
  prior: number;
  pct?: number | null;
  currency?: string;
  isPoints?: boolean;
}) {
  const fmt = (v: number) =>
    currency ? formatMoney(v, currency) : isPoints ? `${v.toFixed(1)}%` : formatCount(v);
  const change = isPoints
    ? `${(current - prior) >= 0 ? "+" : ""}${(current - prior).toFixed(1)} pts`
    : formatPct(pct ?? (prior > 0 ? ((current - prior) / prior) * 100 : null));
  return (
    <tr className="border-b border-border/30">
      <td className="py-2 pr-4">{label}</td>
      <td className="py-2 pr-4 text-right tabular-nums font-medium">{fmt(current)}</td>
      <td className="py-2 pr-4 text-right tabular-nums text-muted-foreground">{fmt(prior)}</td>
      <td className="py-2 text-right tabular-nums text-muted-foreground">{change}</td>
    </tr>
  );
}

function Skeleton() {
  return <div className="h-72 rounded-xl bg-muted/40 animate-pulse" />;
}

function Empty({ message }: { message: string }) {
  return (
    <div className="h-48 flex items-center justify-center text-sm text-muted-foreground border border-dashed rounded-xl">
      {message}
    </div>
  );
}
