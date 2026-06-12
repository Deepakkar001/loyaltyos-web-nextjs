"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download } from "lucide-react";

import { AnalyticsPanel, AnalyticsStatCard } from "@/components/analytics/analytics-panel";
import { AnalyticsSectionHeading } from "@/components/analytics/analytics-section-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAnalyticsProgramme } from "@/lib/analytics/analytics-programme-context";
import { lastNDaysRange } from "@/lib/analytics/date-range";
import { analyticsApi } from "@/lib/api/client";
import type { ReversalsAdjustmentsReportResponse } from "@/types/analytics";

function formatPoints(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

function formatSignedPoints(value: number): string {
  const n = Number(value) || 0;
  const prefix = n > 0 ? "+" : "";
  return prefix + formatPoints(n);
}

function formatPct(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

const EMPTY_REPORT: ReversalsAdjustmentsReportResponse = {
  programmeUid: "default",
  fromDate: "",
  toDate: "",
  reportDefinition: "",
  reversalCountInPeriod: 0,
  reversalPointsInPeriod: 0,
  adjustmentCountInPeriod: 0,
  adjustmentNetPointsInPeriod: 0,
  uniqueCustomersAffected: 0,
  reversalCountPriorPeriod: 0,
  adjustmentCountPriorPeriod: 0,
  periodOverPeriodReversalChangePct: null,
  periodOverPeriodAdjustmentChangePct: null,
  dailyTrend: [],
  topCustomers: [],
  reversals: [],
  adjustments: [],
};

export default function ReversalsAdjustmentsPage() {
  const { programmeUid, programmeName } = useAnalyticsProgramme();
  const initial = lastNDaysRange(90);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [tab, setTab] = useState<"REVERSAL" | "ADJUST">("REVERSAL");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [report, setReport] = useState<ReversalsAdjustmentsReportResponse>(EMPTY_REPORT);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setReport(await analyticsApi.getReversalsAdjustmentsReport(from, to, programmeUid));
    } catch (err) {
      setReport(EMPTY_REPORT);
      setLoadError(err instanceof Error ? err.message : "Could not load reversals and adjustments report.");
    } finally {
      setLoading(false);
    }
  }, [from, to, programmeUid]);

  useEffect(() => {
    void load();
  }, [load]);

  const dailyChart = useMemo(
    () =>
      report.dailyTrend.map((row) => ({
        day: row.period,
        reversals: row.reversalCount,
        reversalPoints: Number(row.reversalPoints) || 0,
        adjustments: row.adjustmentCount,
        adjustmentNet: Number(row.adjustmentNetPoints) || 0,
      })),
    [report.dailyTrend]
  );

  const activeRows = tab === "REVERSAL" ? report.reversals : report.adjustments;

  const exportCsv = async () => {
    setExporting(true);
    try {
      await analyticsApi.downloadExport(
        "reversals-adjustments",
        { from, to, programmeUid },
        `reversals-adjustments-${programmeUid}-${from}-to-${to}.csv`
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {loadError ? (
        <AnalyticsPanel className="border-destructive/40 bg-destructive/5">
          <p className="text-sm text-destructive">{loadError}</p>
        </AnalyticsPanel>
      ) : null}

      <AnalyticsPanel>
        <AnalyticsSectionHeading
          title="Reversals & adjustments"
          helpText="Operational report (BRD §6.3): audit trail of REVERSAL and ADJUST ledger rows with links to original credits, signed adjustment impact, and operator attribution."
        />
        <p className="text-xs text-muted-foreground -mt-2 leading-relaxed">
          Programme: <span className="font-medium">{programmeName}</span>. Aggregated counts also appear in{" "}
          <Link
            href="/dashboard/analytics/accrual-redemption-reconciliation"
            className="text-primary underline-offset-2 hover:underline"
          >
            Accrual & Reconciliation
          </Link>{" "}
          and{" "}
          <Link href="/dashboard/analytics/liability" className="text-primary underline-offset-2 hover:underline">
            Liability Report
          </Link>
          .
        </p>
        <div className="flex flex-wrap items-end gap-3 mt-4">
          <div className="space-y-1">
            <label htmlFor="rev-from" className="text-xs text-muted-foreground">
              From
            </label>
            <Input id="rev-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label htmlFor="rev-to" className="text-xs text-muted-foreground">
              To
            </label>
            <Input id="rev-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button onClick={() => void load()} disabled={loading}>
            {loading ? "Loading…" : "Apply"}
          </Button>
          <Button variant="outline" onClick={() => void exportCsv()} disabled={exporting || loading}>
            <Download className="h-4 w-4 mr-2" />
            {exporting ? "Exporting…" : "Export CSV"}
          </Button>
        </div>
      </AnalyticsPanel>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiStat
          label="Reversals"
          value={loading ? "…" : String(report.reversalCountInPeriod)}
          sub={`${formatPoints(Number(report.reversalPointsInPeriod))} pts reversed · vs prior ${formatPct(report.periodOverPeriodReversalChangePct)}`}
        />
        <KpiStat
          label="Adjustments"
          value={loading ? "…" : String(report.adjustmentCountInPeriod)}
          sub={`${formatSignedPoints(Number(report.adjustmentNetPointsInPeriod))} pts net · vs prior ${formatPct(report.periodOverPeriodAdjustmentChangePct)}`}
        />
        <KpiStat
          label="Customers affected"
          value={loading ? "…" : String(report.uniqueCustomersAffected)}
          sub="Unique members with reversal or adjustment rows"
        />
        <KpiStat
          label="Total operations"
          value={loading ? "…" : String(report.reversalCountInPeriod + report.adjustmentCountInPeriod)}
          sub="Reversal + adjustment ledger rows"
        />
      </div>

      <ReportPanel
        title="Daily activity"
        subtitle="Reversal count and signed adjustment net by day"
        helpText={report.reportDefinition || "Reversals reduce outstanding liability; adjustments use signed points."}
      >
        {loading ? (
          <SkeletonChart />
        ) : dailyChart.length === 0 ? (
          <EmptyState message="No reversals or adjustments in this period." />
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dailyChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="reversals"
                  name="Reversal count"
                  fill="var(--chart-primary)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="left"
                  dataKey="adjustments"
                  name="Adjustment count"
                  fill="var(--chart-secondary)"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="adjustmentNet"
                  name="Adjustment net (pts)"
                  stroke="var(--chart-tertiary)"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </ReportPanel>

      <AnalyticsPanel className="overflow-x-auto">
        <AnalyticsSectionHeading
          title="Top customers"
          helpText="Members with the most reversal and adjustment activity in the period."
        />
        {loading ? (
          <SkeletonBlock />
        ) : report.topCustomers.length === 0 ? (
          <EmptyState message="No customer activity in this period." />
        ) : (
          <table className="w-full text-sm mt-2">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
                <th className="py-2 pr-4 font-medium">Customer</th>
                <th className="py-2 pr-4 font-medium text-right">Reversals</th>
                <th className="py-2 pr-4 font-medium text-right">Reversal pts</th>
                <th className="py-2 pr-4 font-medium text-right">Adjustments</th>
                <th className="py-2 font-medium text-right">Adjust net pts</th>
              </tr>
            </thead>
            <tbody>
              {report.topCustomers.map((row) => (
                <tr key={row.customerId} className="border-b border-border/40">
                  <td className="py-2 pr-4 font-mono text-xs">{row.customerId}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{row.reversalCount}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{formatPoints(Number(row.reversalPoints))}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{row.adjustmentCount}</td>
                  <td className="py-2 text-right tabular-nums">{formatSignedPoints(Number(row.adjustmentNetPoints))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AnalyticsPanel>

      <AnalyticsPanel className="overflow-x-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <AnalyticsSectionHeading
            title="Ledger detail"
            helpText="Line-level rows from points_ledger (up to 200 per type). Reversals show the original CREDIT they undo."
          />
          <div className="flex gap-2">
            <Button size="sm" variant={tab === "REVERSAL" ? "default" : "outline"} onClick={() => setTab("REVERSAL")}>
              Reversals ({report.reversalCountInPeriod})
            </Button>
            <Button size="sm" variant={tab === "ADJUST" ? "default" : "outline"} onClick={() => setTab("ADJUST")}>
              Adjustments ({report.adjustmentCountInPeriod})
            </Button>
          </div>
        </div>
        {loading ? (
          <SkeletonBlock />
        ) : activeRows.length === 0 ? (
          <EmptyState
            message={
              tab === "REVERSAL"
                ? "No REVERSAL rows in this period."
                : "No ADJUST rows in this period. Manual adjustments appear here when recorded in the ledger."
            }
          />
        ) : (
          <table className="w-full text-sm mt-2 min-w-[1000px]">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
                <th className="py-2 pr-3 font-medium">When</th>
                <th className="py-2 pr-3 font-medium">Ledger ID</th>
                <th className="py-2 pr-3 font-medium">Customer</th>
                <th className="py-2 pr-3 font-medium text-right">Points</th>
                <th className="py-2 pr-3 font-medium text-right">Signed impact</th>
                {tab === "REVERSAL" ? (
                  <>
                    <th className="py-2 pr-3 font-medium">Original credit</th>
                    <th className="py-2 pr-3 font-medium text-right">Orig. points</th>
                  </>
                ) : null}
                <th className="py-2 pr-3 font-medium">Event / rule</th>
                <th className="py-2 pr-3 font-medium">Created by</th>
                <th className="py-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {activeRows.map((row) => (
                <tr key={row.ledgerId} className="border-b border-border/40 align-top">
                  <td className="py-2 pr-3 text-xs whitespace-nowrap">
                    {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs">{row.ledgerId}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{row.customerId}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{formatPoints(Number(row.points))}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-rose-600 dark:text-rose-400">
                    {formatSignedPoints(Number(row.signedImpact))}
                  </td>
                  {tab === "REVERSAL" ? (
                    <>
                      <td className="py-2 pr-3 text-xs">
                        {row.reversalOfLedgerId != null ? (
                          <>
                            <span className="font-mono">#{row.reversalOfLedgerId}</span>
                            {row.originalEntryType ? (
                              <span className="block text-muted-foreground">{row.originalEntryType}</span>
                            ) : null}
                            {row.originalCreatedAt ? (
                              <span className="block text-[10px] text-muted-foreground">
                                {new Date(row.originalCreatedAt).toLocaleDateString()}
                              </span>
                            ) : null}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {row.originalPoints != null ? formatPoints(Number(row.originalPoints)) : "—"}
                      </td>
                    </>
                  ) : null}
                  <td className="py-2 pr-3 text-xs">
                    {row.sourceEventId ? <span className="font-mono block">{row.sourceEventId}</span> : null}
                    {row.ruleName ? <span className="text-muted-foreground block">{row.ruleName}</span> : "—"}
                  </td>
                  <td className="py-2 pr-3 text-xs">{row.createdBy || "—"}</td>
                  <td className="py-2 text-xs text-muted-foreground max-w-xs break-words">{row.description || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AnalyticsPanel>
    </div>
  );
}

function KpiStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <AnalyticsStatCard>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold text-foreground mt-1">{value}</p>
      {sub ? <p className="text-xs text-muted-foreground mt-1">{sub}</p> : null}
    </AnalyticsStatCard>
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
  return <div className="h-72 rounded-xl bg-muted/40 animate-pulse border border-border/50 mt-2" />;
}

function SkeletonBlock() {
  return <div className="h-48 rounded-xl bg-muted/40 animate-pulse border border-border/50 mt-2" />;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-48 flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border/70 rounded-xl bg-background/30 mt-2">
      {message}
    </div>
  );
}
