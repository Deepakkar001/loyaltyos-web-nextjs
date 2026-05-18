"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AnalyticsPanel } from "@/components/analytics/analytics-panel";
import { AnalyticsSectionHeading } from "@/components/analytics/analytics-section-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAnalyticsProgramme } from "@/lib/analytics/analytics-programme-context";
import { analyticsApi } from "@/lib/api/client";
import { lastNDaysRange } from "@/lib/analytics/date-range";
import { fetchAnalyticsOrEmpty } from "@/lib/analytics/safe-fetch";
import type { PointsActivityRow, RulePerformanceRow, TierDistributionRow } from "@/types/analytics";

export default function CustomReportsPage() {
  const { programmeUid } = useAnalyticsProgramme();
  const initial = lastNDaysRange(30);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [loading, setLoading] = useState(true);
  const [pointsData, setPointsData] = useState<PointsActivityRow[]>([]);
  const [ruleData, setRuleData] = useState<RulePerformanceRow[]>([]);
  const [tierData, setTierData] = useState<TierDistributionRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [points, rules, tiers] = await Promise.all([
      fetchAnalyticsOrEmpty(() => analyticsApi.getPointsActivity(from, to, programmeUid), []),
      fetchAnalyticsOrEmpty(() => analyticsApi.getRulePerformance(from, to, programmeUid), []),
      fetchAnalyticsOrEmpty(() => analyticsApi.getTierDistribution(programmeUid), []),
    ]);
    setPointsData(points);
    setRuleData(rules);
    setTierData(tiers);
    setLoading(false);
  }, [from, to, programmeUid]);

  useEffect(() => {
    void load();
  }, [load]);

  const pointsChart = useMemo(() => {
    const byDate = new Map<string, { date: string; issued: number; redeemed: number }>();
    for (const row of pointsData) {
      const cur = byDate.get(row.reportDate) ?? { date: row.reportDate, issued: 0, redeemed: 0 };
      const pts = Number(row.totalPoints) || 0;
      if (row.entryType === "CREDIT") cur.issued += pts;
      else if (row.entryType === "DEBIT") cur.redeemed += pts;
      byDate.set(row.reportDate, cur);
    }
    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [pointsData]);

  const ruleChart = useMemo(
    () =>
      ruleData.slice(0, 10).map((r) => ({
        name: r.ruleName.length > 18 ? `${r.ruleName.slice(0, 18)}…` : r.ruleName,
        points: Number(r.totalPointsAwarded) || 0,
        evaluations: r.evaluationCount,
      })),
    [ruleData]
  );

  const tierChart = useMemo(
    () => tierData.map((t) => ({ name: t.tierName, members: t.memberCount })),
    [tierData]
  );

  return (
    <div className="space-y-6">
      <AnalyticsPanel>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Date range</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label htmlFor="from" className="text-xs text-muted-foreground">
              From
            </label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label htmlFor="to" className="text-xs text-muted-foreground">
              To
            </label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button onClick={() => void load()} disabled={loading}>
            {loading ? "Loading…" : "Apply"}
          </Button>
        </div>
      </AnalyticsPanel>

      <ReportPanel
        title="Points Activity"
        subtitle="Issued vs redeemed by day"
        helpText="Line chart: X-axis is calendar date; Y-axis is total points. Two series — issued (CREDIT) versus redeemed (DEBIT) — for the selected programme and date range."
      >
        {loading ? (
          <SkeletonChart />
        ) : pointsChart.length === 0 ? (
          <EmptyState message="No ledger activity in this range yet." />
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pointsChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="issued" stroke="var(--chart-primary)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="redeemed" stroke="var(--chart-secondary)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </ReportPanel>

      <ReportPanel
        title="Rule Performance"
        subtitle="Top rules by points awarded"
        helpText="Horizontal bar chart: Y-axis lists earn rule names; X-axis is total points awarded in the period. Shows which rules drove the most points for the selected programme."
      >
        {loading ? (
          <SkeletonChart />
        ) : ruleChart.length === 0 ? (
          <EmptyState message="No rule performance data yet." />
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ruleChart} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="points" fill="var(--chart-primary)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ReportPanel>

      <ReportPanel
        title="Tier Distribution"
        subtitle="Members per tier (current balances)"
        helpText="Bar chart: X-axis is tier name (by rank); Y-axis is member count with current balance in each tier band. Snapshot of programme tier mix, not historical upgrades."
      >
        {loading ? (
          <SkeletonChart />
        ) : tierChart.length === 0 ? (
          <EmptyState message="Configure tiers and member balances to see distribution." />
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tierChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="members" fill="var(--chart-tertiary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ReportPanel>
    </div>
  );
}

function ReportPanel({
  title,
  subtitle,
  helpText,
  children,
}: {
  title: string;
  subtitle: string;
  helpText: string;
  children: React.ReactNode;
}) {
  return (
    <AnalyticsPanel>
      <AnalyticsSectionHeading title={title} helpText={helpText} titleClassName="text-base font-semibold" />
      <p className="text-xs text-muted-foreground -mt-2">{subtitle}</p>
      {children}
    </AnalyticsPanel>
  );
}

function SkeletonChart() {
  return <div className="h-72 rounded-xl bg-muted/40 animate-pulse border border-border/50" />;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-48 flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border/70 rounded-xl bg-background/30">
      {message}
    </div>
  );
}
