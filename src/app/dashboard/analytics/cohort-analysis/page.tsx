"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AnalyticsPanel } from "@/components/analytics/analytics-panel";
import { AnalyticsSectionHeading } from "@/components/analytics/analytics-section-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAnalyticsProgramme } from "@/lib/analytics/analytics-programme-context";
import { AnalyticsExportButton } from "@/components/analytics/analytics-export-button";
import { reportFilename } from "@/lib/analytics/export-csv";
import { analyticsApi, loyaltyRulesAdminApi } from "@/lib/api/client";
import { lastNDaysRange } from "@/lib/analytics/date-range";
import { fetchAnalyticsOrEmpty } from "@/lib/analytics/safe-fetch";
import { KpiCard } from "@/components/tenant-dashboard/KpiCard";
import type {
  CohortRetentionRow,
  RuleEffectivenessRow,
  TierDistributionRow,
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <AnalyticsSectionHeading
          title="Monthly retention heatmap"
          titleClassName="text-base font-semibold"
          helpText="Heatmap table: rows are acquisition cohorts (month of first CREDIT); columns are months since join (M0, M1, …). Cell colour and value show retention % — share of cohort members who transacted again that month."
        />
        <AnalyticsExportButton
          exportPath="cohort-retention"
          params={{ programmeUid }}
          filename={reportFilename("cohort-retention", programmeUid)}
          disabled={loading}
        />
      </div>
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
  const [tiers, setTiers] = useState<TierDistributionRow[]>([]);
  const [tierName, setTierName] = useState("");
  const [loading, setLoading] = useState(true);

  const upgradeTiers = useMemo(
    () => [...tiers].filter((t) => t.rankOrder >= 2).sort((a, b) => a.rankOrder - b.rankOrder),
    [tiers]
  );
  const secondTier = upgradeTiers[0];
  const thirdTier = upgradeTiers[1];

  useEffect(() => {
    (async () => {
      setLoading(true);
      const tierRows = await fetchAnalyticsOrEmpty(
        () => analyticsApi.getTierDistribution(programmeUid),
        []
      );
      setTiers(tierRows);
      const upgrade = await fetchAnalyticsOrEmpty(
        () => analyticsApi.getTierUpgradeCohort(programmeUid),
        []
      );
      setRows(upgrade);
      setLoading(false);
    })();
  }, [programmeUid]);

  useEffect(() => {
    if (upgradeTiers.length === 0) {
      setTierName("");
      setVelocity([]);
      return;
    }
    setTierName((prev) =>
      prev && upgradeTiers.some((t) => t.tierName === prev) ? prev : upgradeTiers[0].tierName
    );
  }, [upgradeTiers]);

  useEffect(() => {
    if (!tierName) {
      setVelocity([]);
      return;
    }
    (async () => {
      setVelocity(
        await fetchAnalyticsOrEmpty(() => analyticsApi.getTierVelocity(tierName, programmeUid), [])
      );
    })();
  }, [tierName, programmeUid]);

  if (loading) return <SkeletonPanel />;

  const cohortEmptyMessage =
    upgradeTiers.length < 2
      ? "Configure at least two upgrade tiers (rank 2+) in programme settings to track upgrades."
      : rows.length === 0
        ? "No earning activity yet. Process integration events so members earn points; tier upgrades are recorded when balance crosses a higher tier threshold."
        : null;

  return (
    <div className="space-y-6">
      <AnalyticsPanel className="overflow-x-auto">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <AnalyticsSectionHeading
            title="Tier upgrade by acquisition cohort"
            titleClassName="text-base font-semibold"
            helpText="Each row is an acquisition cohort (month of first points earned). Upgrade % and days-to-tier use tier_history when a member's balance crosses into rank 2+ tiers (e.g. Gold, Platinum). The base tier (rank 1) is assigned at zero balance and is not counted as an upgrade."
          />
          <AnalyticsExportButton
            exportPath="cohort-tier-upgrade"
            params={{ programmeUid }}
            filename={reportFilename("cohort-tier-upgrade", programmeUid)}
            disabled={loading}
          />
        </div>
        {cohortEmptyMessage ? (
          <EmptyPanel message={cohortEmptyMessage} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-left">
                <th className="py-2">Cohort</th>
                <th className="py-2 text-right">Size</th>
                <th className="py-2 text-right">{secondTier?.tierName ?? "Rank 2"} %</th>
                <th className="py-2 text-right">{thirdTier?.tierName ?? "Rank 3"} %</th>
                <th className="py-2 text-right">Avg days → {secondTier?.tierName ?? "rank 2"}</th>
                <th className="py-2 text-right">Avg days → {thirdTier?.tierName ?? "rank 3"}</th>
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
          <div className="flex flex-wrap items-center gap-2">
            {upgradeTiers.length > 0 ? (
              <NativeSelect
                ariaLabel="Target tier"
                value={tierName}
                onChange={setTierName}
                className="w-[160px]"
                variant="compact"
                options={upgradeTiers.map((t) => ({ value: t.tierName, label: t.tierName }))}
              />
            ) : null}
            {tierName ? (
              <AnalyticsExportButton
                exportPath="cohort-tier-velocity"
                params={{ programmeUid, tierName }}
                filename={reportFilename(`cohort-tier-velocity-${tierName}`, programmeUid)}
              />
            ) : null}
          </div>
        </div>
        {upgradeTiers.length === 0 ? (
          <EmptyPanel message="No upgrade tiers configured (rank 2+). Add tiers in Configure Programme." />
        ) : velocity.length === 0 ? (
          <EmptyPanel
            message={`No members have upgraded to ${tierName} yet. Send purchase events that push balance above that tier's entry threshold.`}
          />
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
          <div className="space-y-1 min-w-[240px]">
            <label htmlFor="cohort-rule-select" className="text-xs text-muted-foreground">
              Rule
            </label>
            <NativeSelect
              id="cohort-rule-select"
              ariaLabel="Earn rule"
              value={ruleUid}
              onChange={setRuleUid}
              disabled={rules.length === 0}
              options={
                rules.length === 0
                  ? [{ value: "", label: "No rules available" }]
                  : rules.map((r) => ({ value: r.ruleUid, label: r.name }))
              }
            />
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
          <AnalyticsExportButton
            exportPath="cohort-rule-effectiveness"
            params={{ from, to, programmeUid, ruleUid }}
            filename={reportFilename(`cohort-rule-effectiveness-${ruleUid}`, programmeUid, from, to)}
            disabled={loading || !ruleUid}
          />
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
