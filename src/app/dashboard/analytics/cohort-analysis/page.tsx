"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AnalyticsPanel } from "@/components/analytics/analytics-panel";
import { AnalyticsSectionHeading } from "@/components/analytics/analytics-section-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAnalyticsProgramme } from "@/lib/analytics/analytics-programme-context";
import { analyticsApi, loyaltyRulesAdminApi } from "@/lib/api/client";
import { lastNDaysRange } from "@/lib/analytics/date-range";
import { fetchAnalyticsOrEmpty } from "@/lib/analytics/safe-fetch";
import { KpiCard } from "@/components/tenant-dashboard/KpiCard";
import type {
  CohortRetentionRow,
  RuleEffectivenessRow,
  TierUpgradeCohortRow,
  TierVelocityBucketRow,
} from "@/types/analytics";
import type { EarnRuleResponse } from "@/types/rules";

function retentionColor(pct: number): string {
  const t = Math.max(0, Math.min(100, pct)) / 100;
  const r = Math.round(29 + (226 - 29) * (1 - t));
  const g = Math.round(158 + (75 - 158) * (1 - t));
  const b = Math.round(117 + (74 - 117) * (1 - t));
  return `rgb(${r},${g},${b})`;
}

export default function CohortAnalysisPage() {
  return (
    <Tabs defaultValue="retention" className="space-y-6">
      <TabsList className="rounded-full border border-border/70 bg-card/60 px-1.5 py-1 w-fit">
        <TabsTrigger value="retention">Retention</TabsTrigger>
        <TabsTrigger value="tier">Tier Upgrade</TabsTrigger>
        <TabsTrigger value="rule">Rule Effectiveness</TabsTrigger>
      </TabsList>
      <TabsContent value="retention">
        <RetentionTab />
      </TabsContent>
      <TabsContent value="tier">
        <TierUpgradeTab />
      </TabsContent>
      <TabsContent value="rule">
        <RuleEffectivenessTab />
      </TabsContent>
    </Tabs>
  );
}

function RetentionTab() {
  const { programmeUid } = useAnalyticsProgramme();
  const [rows, setRows] = useState<CohortRetentionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setRows(await fetchAnalyticsOrEmpty(() => analyticsApi.getRetentionCohort(programmeUid), []));
      setLoading(false);
    })();
  }, [programmeUid]);

  const { cohorts, maxMonth, grid } = useMemo(() => {
    const cohortSet = Array.from(new Set(rows.map((r) => r.cohortMonth))).sort();
    const max = rows.reduce((m, r) => Math.max(m, r.monthsSinceJoin), 0);
    const cellGrid = new Map<string, number>();
    for (const r of rows) {
      cellGrid.set(`${r.cohortMonth}:${r.monthsSinceJoin}`, r.retentionPct);
    }
    return { cohorts: cohortSet, maxMonth: max, grid: cellGrid };
  }, [rows]);

  if (loading) return <SkeletonPanel />;
  if (cohorts.length === 0) return <EmptyPanel message="No retention cohorts yet — need CREDIT ledger events." />;

  return (
    <AnalyticsPanel className="overflow-x-auto">
      <AnalyticsSectionHeading
        title="Monthly retention heatmap"
        titleClassName="text-base font-semibold"
        helpText="Heatmap table: rows are acquisition cohorts (month of first CREDIT); columns are months since join (M0, M1, …). Cell colour and value show retention % — share of cohort members who transacted again that month."
      />
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="text-left py-2 pr-4 text-muted-foreground">Cohort</th>
            {Array.from({ length: maxMonth + 1 }, (_, i) => (
              <th key={i} className="text-center py-2 px-2 text-muted-foreground font-normal">
                M{i}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((cohort) => (
            <tr key={cohort}>
              <td className="py-2 pr-4 font-medium whitespace-nowrap">{cohort}</td>
              {Array.from({ length: maxMonth + 1 }, (_, month) => {
                const pct = grid.get(`${cohort}:${month}`);
                if (pct == null) {
                  return <td key={month} className="p-1"><span className="block h-8 rounded bg-muted/30" /></td>;
                }
                return (
                  <td key={month} className="p-1">
                    <span
                      className="block h-8 rounded text-[10px] leading-8 text-center text-white font-medium"
                      style={{ backgroundColor: retentionColor(pct) }}
                      title={`${pct}%`}
                    >
                      {pct}%
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </AnalyticsPanel>
  );
}

function TierUpgradeTab() {
  const { programmeUid } = useAnalyticsProgramme();
  const [rows, setRows] = useState<TierUpgradeCohortRow[]>([]);
  const [velocity, setVelocity] = useState<TierVelocityBucketRow[]>([]);
  const [tierName, setTierName] = useState("Silver");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const upgrade = await fetchAnalyticsOrEmpty(
        () => analyticsApi.getTierUpgradeCohort(programmeUid),
        []
      );
      setRows(upgrade);
      setVelocity(
        await fetchAnalyticsOrEmpty(() => analyticsApi.getTierVelocity(tierName, programmeUid), [])
      );
      setLoading(false);
    })();
  }, [tierName, programmeUid]);

  if (loading) return <SkeletonPanel />;

  return (
    <div className="space-y-6">
      <AnalyticsPanel className="overflow-x-auto">
        <AnalyticsSectionHeading
          title="Tier upgrade by acquisition cohort"
          titleClassName="text-base font-semibold"
          helpText="Table: each row is an acquisition cohort (first CREDIT month) versus upgrade metrics — % reaching rank-2 and rank-3 tiers and average days from first earn. Requires tier history for the selected programme."
        />
        {rows.length === 0 ? (
          <EmptyPanel message="No tier history yet. Tier changes are recorded when members earn points." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-left">
                <th className="py-2">Cohort</th>
                <th className="py-2 text-right">Size</th>
                <th className="py-2 text-right">Silver %</th>
                <th className="py-2 text-right">Gold %</th>
                <th className="py-2 text-right">Avg days → Silver</th>
                <th className="py-2 text-right">Avg days → Gold</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.cohortMonth} className="border-t border-border/50">
                  <td className="py-2">{r.cohortMonth}</td>
                  <td className="py-2 text-right tabular-nums">{r.cohortSize}</td>
                  <td className="py-2 text-right tabular-nums">{r.silverPct}%</td>
                  <td className="py-2 text-right tabular-nums">{r.goldPct}%</td>
                  <td className="py-2 text-right tabular-nums">{r.avgDaysToSilver ?? "—"}</td>
                  <td className="py-2 text-right tabular-nums">{r.avgDaysToGold ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AnalyticsPanel>

      <AnalyticsPanel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <AnalyticsSectionHeading
            title="Days to reach tier"
            titleClassName="text-base font-semibold"
            helpText="Bar chart: X-axis is days-from-first-earn bucket (0–7, 8–14, etc.); Y-axis is member count who reached the selected tier in that window. Use the dropdown to switch target tier."
          />
          <Select value={tierName} onValueChange={(v) => v && setTierName(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Silver">Silver</SelectItem>
              <SelectItem value="Gold">Gold</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {velocity.length === 0 ? (
          <EmptyPanel message={`No members reached ${tierName} yet.`} />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={velocity.map((v) => ({ bucket: v.upgradeBucket, count: v.memberCount }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--chart-tertiary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </AnalyticsPanel>
    </div>
  );
}

function RuleEffectivenessTab() {
  const { programmeUid } = useAnalyticsProgramme();
  const initial = lastNDaysRange(30);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [rules, setRules] = useState<EarnRuleResponse[]>([]);
  const [ruleUid, setRuleUid] = useState("");
  const [rows, setRows] = useState<RuleEffectivenessRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loyaltyRulesAdminApi.listRules(programmeUid).then((r) => {
      setRules(r);
      if (r[0]) setRuleUid(r[0].ruleUid);
    });
  }, [programmeUid]);

  const load = useCallback(async () => {
    if (!ruleUid) return;
    setLoading(true);
    setRows(
      await fetchAnalyticsOrEmpty(
        () => analyticsApi.getRuleEffectiveness(ruleUid, from, to, programmeUid),
        []
      )
    );
    setLoading(false);
  }, [ruleUid, from, to, programmeUid]);

  useEffect(() => {
    if (ruleUid) void load();
  }, [ruleUid, load]);

  const exposed = rows.find((r) => r.cohort === "EXPOSED");
  const notExposed = rows.find((r) => r.cohort === "NOT_EXPOSED");

  return (
    <div className="space-y-6">
      <AnalyticsPanel>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Filters</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground">Rule</label>
            <Select value={ruleUid} onValueChange={(v) => v && setRuleUid(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select rule" />
              </SelectTrigger>
              <SelectContent>
                {rules.map((r) => (
                  <SelectItem key={r.ruleUid} value={r.ruleUid}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">From</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">To</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button onClick={() => void load()} disabled={loading || !ruleUid}>
            Apply
          </Button>
        </div>
      </AnalyticsPanel>

      <AnalyticsPanel>
        <AnalyticsSectionHeading
          title="Rule effectiveness comparison"
          titleClassName="text-base font-semibold"
          helpText="Compares members whose events matched the selected rule (EXPOSED) versus all other programme members (NOT_EXPOSED). KPI cards show counts; stat cards show average points earned per member in the date range."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KpiCard
          title="Exposed members"
          value={exposed?.memberCount ?? 0}
          tone="good"
          trendPct={0}
          sparkline={[]}
        />
        <KpiCard
          title="Not exposed"
          value={notExposed?.memberCount ?? 0}
          tone="info"
          trendPct={0}
          sparkline={[]}
        />
      </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <StatCard title="Exposed — avg points / member" value={exposed?.avgPointsPerMember ?? 0} />
          <StatCard title="Not exposed — avg points / member" value={notExposed?.avgPointsPerMember ?? 0} />
        </div>
      </AnalyticsPanel>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/40 p-4">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="text-2xl font-bold mt-1 tabular-nums">{Number(value).toLocaleString()}</p>
    </div>
  );
}

function SkeletonPanel() {
  return <div className="h-64 rounded-2xl border border-border/70 bg-card/60 animate-pulse" />;
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="h-32 flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border/70 rounded-xl bg-background/30">
      {message}
    </div>
  );
}
