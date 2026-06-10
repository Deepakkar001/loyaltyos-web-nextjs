"use client";

import Link from "next/link";
import toast from "react-hot-toast";
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

import { CampaignBudgetProgress } from "@/components/campaigns/CampaignBudgetProgress";
import { CampaignStatusBadge } from "@/components/campaigns/CampaignStatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { lastNDaysRange } from "@/lib/analytics/date-range";
import { campaignsAdminApi, programmeApiV2 } from "@/lib/api/client";
import { mergeProgrammeDropdownRows } from "@/lib/programme/programme-config-helpers";
import type { CampaignPerformanceReportResponse } from "@/types/campaigns";

const AWARD_LABELS: Record<string, string> = {
  POINTS_BONUS: "Points bonus",
  MULTIPLIER_ON_RULE_POINTS: "Multiplier",
  FLAT_CASHBACK: "Flat cashback",
  PERCENT_CASHBACK: "% cashback",
};

const EMPTY_REPORT: CampaignPerformanceReportResponse = {
  summary: {
    programmeUid: "",
    fromDate: "",
    toDate: "",
    totalCampaigns: 0,
    activeCampaigns: 0,
    participationsInPeriod: 0,
    participationsPriorPeriod: 0,
    uniqueCustomersInPeriod: 0,
    pointsInPeriod: 0,
    cashbackInPeriod: 0,
    totalBudgetAllocated: 0,
    totalBudgetConsumed: 0,
    periodOverPeriodChangePct: null,
  },
  dailyParticipations: [],
  campaigns: [],
};

function formatCount(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

function formatDecimal(value: number, digits = 2): string {
  return new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: digits }).format(value);
}

function formatPct(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function tooltipCountFormatter(value: unknown): string {
  if (value == null) return "0";
  const n = typeof value === "number" ? value : Number(value);
  return formatCount(Number.isFinite(n) ? n : 0);
}

export default function CampaignReportsPage() {
  const initial = lastNDaysRange(90);
  const [programmes, setProgrammes] = useState<Array<{ programmeUid: string; name: string }>>([]);
  const [programmeUid, setProgrammeUid] = useState("");
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [report, setReport] = useState<CampaignPerformanceReportResponse>(EMPTY_REPORT);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const programmeSelectOptions = useMemo(
    () =>
      programmes.map((p) => ({
        value: p.programmeUid,
        label: p.programmeUid === "default" ? p.name : p.name,
      })),
    [programmes]
  );

  useEffect(() => {
    (async () => {
      try {
        const list = await programmeApiV2.listProgrammes();
        const merged = mergeProgrammeDropdownRows(list);
        setProgrammes(merged);
        if (merged.length === 1) setProgrammeUid(merged[0].programmeUid);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Failed to load programmes");
      }
    })();
  }, []);

  const load = useCallback(async () => {
    if (!programmeUid) return;
    setLoading(true);
    setLoadError(null);
    try {
      setReport(await campaignsAdminApi.getPerformanceReport(programmeUid, from, to));
    } catch (e: unknown) {
      setReport(EMPTY_REPORT);
      setLoadError(e instanceof Error ? e.message : "Failed to load campaign performance report");
    } finally {
      setLoading(false);
    }
  }, [programmeUid, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const dailyChart = useMemo(
    () =>
      report.dailyParticipations.map((row) => ({
        date: row.period,
        participations: row.participations,
        points: Number(row.pointsIssued),
      })),
    [report.dailyParticipations]
  );

  const comparisonChart = useMemo(
    () =>
      report.campaigns.slice(0, 8).map((c) => ({
        name: c.campaignName.length > 18 ? `${c.campaignName.slice(0, 18)}…` : c.campaignName,
        participations: c.participationsInPeriod,
        customers: c.uniqueCustomersInPeriod,
      })),
    [report.campaigns]
  );

  const { summary } = report;
  const budgetUsedPct =
    summary.totalBudgetAllocated > 0
      ? Math.min(100, (summary.totalBudgetConsumed / summary.totalBudgetAllocated) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Campaign Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Programme-level performance — participation volume, reach, reward cost, and budget health for your team.
        </p>
      </div>

      {loadError ? (
        <Card className="p-4 border-destructive/40 bg-destructive/5">
          <p className="text-sm text-destructive">{loadError}</p>
        </Card>
      ) : null}

      <Card className="p-5 border-border/70 bg-[var(--surface-card)] space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label htmlFor="campaign-report-programme" className="text-xs text-muted-foreground">
              Programme
            </label>
            <NativeSelect
              id="campaign-report-programme"
              className="w-full sm:w-[240px]"
              ariaLabel="Programme"
              value={programmeUid}
              disabled={programmeSelectOptions.length === 0}
              onChange={setProgrammeUid}
              options={
                programmeSelectOptions.length === 0
                  ? [{ value: "", label: "Select programme…" }]
                  : [{ value: "", label: "Select programme…" }, ...programmeSelectOptions]
              }
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="campaign-report-from" className="text-xs text-muted-foreground">
              From
            </label>
            <Input id="campaign-report-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label htmlFor="campaign-report-to" className="text-xs text-muted-foreground">
              To
            </label>
            <Input id="campaign-report-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button onClick={() => void load()} disabled={loading || !programmeUid}>
            {loading ? "Loading…" : "Apply"}
          </Button>
        </div>
      </Card>

      {!programmeUid ? (
        <Card className="p-8 border-border/70 bg-[var(--surface-card)] text-sm text-muted-foreground">
          Select a programme to view campaign performance.
        </Card>
      ) : loading ? (
        <Card className="p-8 border-border/70 bg-[var(--surface-card)]">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard
              label="Participations"
              value={formatCount(summary.participationsInPeriod)}
              sub={`${formatPct(summary.periodOverPeriodChangePct)} vs prior period · ${formatCount(summary.participationsPriorPeriod)} prior`}
            />
            <KpiCard
              label="Unique customers"
              value={formatCount(summary.uniqueCustomersInPeriod)}
              sub="Distinct members rewarded in range"
            />
            <KpiCard
              label="Points issued"
              value={formatDecimal(summary.pointsInPeriod, 0)}
              sub={`Cashback ${formatDecimal(summary.cashbackInPeriod)} in period`}
            />
            <KpiCard
              label="Programme budget"
              value={`${budgetUsedPct.toFixed(0)}% used`}
              sub={`${summary.activeCampaigns} active · ${summary.totalCampaigns} total campaigns`}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ReportCard title="Daily participations" subtitle="Reward events across all campaigns">
              {dailyChart.length === 0 ? (
                <EmptyChart message="No participations in this date range." />
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyChart}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip formatter={(value, name) => [tooltipCountFormatter(value), name === "participations" ? "Participations" : "Points"]} />
                      <Legend />
                      <Line type="monotone" dataKey="participations" name="Participations" stroke="var(--chart-primary)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ReportCard>

            <ReportCard title="Campaign comparison" subtitle="Top campaigns by participations in period">
              {comparisonChart.length === 0 ? (
                <EmptyChart message="No campaign activity in this range." />
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonChart}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip formatter={(value) => tooltipCountFormatter(value)} />
                      <Legend />
                      <Bar dataKey="participations" name="Participations" fill="var(--chart-primary)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="customers" name="Unique customers" fill="var(--chart-secondary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ReportCard>
          </div>

          <Card className="p-5 border-border/70 bg-[var(--surface-card)] space-y-4">
            <div>
              <h2 className="text-sm font-semibold">Campaign breakdown</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Period metrics use the selected date range. Reach and cap % use all-time participation data.
              </p>
            </div>
            {report.campaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No campaigns for this programme.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[960px]">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border/50">
                      <th className="py-2 pr-4">Campaign</th>
                      <th className="py-2 pr-4">Award</th>
                      <th className="py-2 pr-4 text-right">Participations</th>
                      <th className="py-2 pr-4 text-right">Customers</th>
                      <th className="py-2 pr-4 text-right">Points</th>
                      <th className="py-2 pr-4 text-right">Avg / event</th>
                      <th className="py-2 pr-4 text-right">Reach</th>
                      <th className="py-2 pr-4">Budget</th>
                      <th className="py-2">Trend</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {report.campaigns.map((c) => (
                      <tr key={c.campaignUid} className="border-b border-border/30 align-middle">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <CampaignStatusBadge status={c.status} />
                            <span className="font-medium">{c.campaignName}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {c.customerScope === "TARGETED"
                              ? `Targeted · ${formatCount(c.targetAudienceSize)} list`
                              : "All members"}
                            {c.maxParticipations ? ` · cap ${formatCount(c.maxParticipations)}` : ""}
                          </p>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {c.awardType ? AWARD_LABELS[c.awardType] ?? c.awardType : "—"}
                        </td>
                        <td className="py-3 pr-4 text-right tabular-nums">{formatCount(c.participationsInPeriod)}</td>
                        <td className="py-3 pr-4 text-right tabular-nums">{formatCount(c.uniqueCustomersInPeriod)}</td>
                        <td className="py-3 pr-4 text-right tabular-nums">{formatDecimal(c.pointsInPeriod, 0)}</td>
                        <td className="py-3 pr-4 text-right tabular-nums text-muted-foreground">
                          {formatDecimal(c.avgPointsPerParticipation, 1)} pts
                        </td>
                        <td className="py-3 pr-4 text-right tabular-nums">
                          {c.audienceReachPct != null ? `${c.audienceReachPct.toFixed(0)}%` : "—"}
                          {c.participationCapPct != null ? (
                            <span className="block text-xs text-muted-foreground">cap {c.participationCapPct.toFixed(0)}%</span>
                          ) : null}
                        </td>
                        <td className="py-3 pr-4 min-w-[120px]">
                          <CampaignBudgetProgress consumedPct={c.budgetConsumedPct} />
                        </td>
                        <td className="py-3 text-muted-foreground tabular-nums">
                          {formatPct(c.periodOverPeriodChangePct)}
                        </td>
                        <td className="py-3">
                          <Link href={`/dashboard/campaigns/${encodeURIComponent(c.campaignUid)}`}>
                            <Button variant="outline" size="sm" className="rounded-full">
                              Details
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-4 border-border/70 bg-[var(--surface-card)]">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
      {sub ? <p className="text-xs text-muted-foreground mt-1">{sub}</p> : null}
    </Card>
  );
}

function ReportCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5 border-border/70 bg-[var(--surface-card)] space-y-3">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </Card>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-48 flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border/70 rounded-xl">
      {message}
    </div>
  );
}
