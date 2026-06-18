"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download } from "lucide-react";

import { AnalyticsPanel, AnalyticsStatCard } from "@/components/analytics/analytics-panel";
import { AnalyticsSectionHeading } from "@/components/analytics/analytics-section-heading";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAnalyticsProgramme } from "@/lib/analytics/analytics-programme-context";
import { lastNDaysRange } from "@/lib/analytics/date-range";
import { analyticsApi } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { FailedAccrualRedemptionReportResponse } from "@/types/analytics";

function formatPct(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatMs(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${Math.round(value)} ms`;
}

const EMPTY_REPORT: FailedAccrualRedemptionReportResponse = {
  programmeUid: "default",
  fromDate: "",
  toDate: "",
  reportDefinition: "",
  failedAccrualsInPeriod: 0,
  failedRedemptionsInPeriod: 0,
  totalFailuresInPeriod: 0,
  failedAccrualsPriorPeriod: 0,
  failedRedemptionsPriorPeriod: 0,
  periodOverPeriodChangePct: null,
  accrualAttemptsInPeriod: 0,
  redemptionApiAttemptsInPeriod: 0,
  accrualFailureRatePct: 0,
  redemptionFailureRatePct: 0,
  avgFailedAccrualDurationMs: null,
  avgFailedRedemptionDurationMs: null,
  failuresByCategory: [],
  dailyTrend: [],
  recentFailures: [],
};

const SOURCE_LABELS: Record<string, string> = {
  ISSUANCE_AUDIT: "Issuance engine",
  EVENT_PROCESSING: "Event processing",
  REDEMPTION_API: "Redemption API",
};

export default function FailedAccrualsRedemptionsPage() {
  const { programmeUid, programmeName } = useAnalyticsProgramme();
  const initial = lastNDaysRange(30);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [typeFilter, setTypeFilter] = useState<"ALL" | "ACCRUAL" | "REDEMPTION">("ALL");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [report, setReport] = useState<FailedAccrualRedemptionReportResponse>(EMPTY_REPORT);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setReport(await analyticsApi.getFailedAccrualsRedemptionsReport(from, to, programmeUid));
    } catch (err) {
      setReport(EMPTY_REPORT);
      setLoadError(err instanceof Error ? err.message : "Could not load failed transactions report.");
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
        accruals: row.accrualFailures,
        redemptions: row.redemptionFailures,
      })),
    [report.dailyTrend]
  );

  const categoryChart = useMemo(
    () =>
      report.failuresByCategory.map((row) => ({
        name: `${row.category} (${row.transactionType === "ACCRUAL" ? "accrual" : "redemption"})`,
        count: row.failureCount,
      })),
    [report.failuresByCategory]
  );

  const filteredFailures = useMemo(() => {
    if (typeFilter === "ALL") return report.recentFailures;
    return report.recentFailures.filter((row) => row.transactionType === typeFilter);
  }, [report.recentFailures, typeFilter]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      await analyticsApi.downloadExport(
        "failed-accruals-redemptions",
        { from, to, programmeUid },
        `failed-accruals-redemptions-${programmeUid}-${from}-to-${to}.csv`
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
          title="Failed accruals & redemptions"
          helpText="Operational report (BRD §6.3): investigate why points were not issued or redeemed. Combines reward issuance audit, integration event processing failures, and failed POST /redemptions API calls."
        />
        <p className="text-xs text-muted-foreground -mt-2 leading-relaxed">
          Programme filter applies to <span className="font-medium">issuance audit</span> accrual failures for{" "}
          <span className="font-medium">{programmeName}</span>. Event-processing and redemption API rows are tenant-wide.
          For raw API traffic see{" "}
          <Link href="/dashboard/integration/audit-logs" className="text-primary underline-offset-2 hover:underline">
            Integration audit log
          </Link>
          .
        </p>
        <div className="flex flex-wrap items-end gap-3 mt-4">
          <div className="space-y-1">
            <label htmlFor="fail-from" className="text-xs text-muted-foreground">
              From
            </label>
            <Input id="fail-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label htmlFor="fail-to" className="text-xs text-muted-foreground">
              To
            </label>
            <Input id="fail-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
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

      {!loading && report.totalFailuresInPeriod === 0 && !loadError ? (
        <AnalyticsPanel className="border-emerald-500/30 bg-emerald-500/5">
          <p className="text-sm text-foreground">No failed accruals or redemptions in this period.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Failures appear here when issuance engine audit, event processing, or redemption API calls return errors.
          </p>
        </AnalyticsPanel>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiStat
          label="Failed accruals"
          value={loading ? "…" : String(report.failedAccrualsInPeriod)}
          sub={`${formatPct(report.accrualFailureRatePct)} of ${report.accrualAttemptsInPeriod} attempts`}
        />
        <KpiStat
          label="Failed redemptions"
          value={loading ? "…" : String(report.failedRedemptionsInPeriod)}
          sub={`${formatPct(report.redemptionFailureRatePct)} of ${report.redemptionApiAttemptsInPeriod} API calls`}
        />
        <KpiStat
          label="Total failures"
          value={loading ? "…" : String(report.totalFailuresInPeriod)}
          sub={`vs prior period ${formatPct(report.periodOverPeriodChangePct)}`}
        />
        <KpiStat
          label="Avg failure latency"
          value={
            loading
              ? "…"
              : `${formatMs(report.avgFailedAccrualDurationMs)} accrual · ${formatMs(report.avgFailedRedemptionDurationMs)} redeem`
          }
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ReportPanel
          title="Daily failure trend"
          subtitle="Accrual vs redemption failures by day"
          helpText="Accrual failures combine issuance audit and event-processing errors. Redemption failures are failed POST /redemptions API calls."
        >
          {loading ? (
            <SkeletonChart />
          ) : dailyChart.length === 0 ? (
            <EmptyState message="No failures in this period." />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="accruals" name="Accrual failures" fill="var(--chart-primary)" radius={[4, 4, 0, 0]} />
                  <Bar
                    dataKey="redemptions"
                    name="Redemption failures"
                    fill="var(--chart-secondary)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ReportPanel>

        <ReportPanel
          title="Failures by category"
          subtitle="Grouped error reasons in the recent-failures sample"
          helpText="Categories are derived from error codes and messages — insufficient balance, validation, limits, rule evaluation, etc."
        >
          {loading ? (
            <SkeletonChart />
          ) : categoryChart.length === 0 ? (
            <EmptyState message="No categorized failures yet." />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChart} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Failures" fill="var(--chart-tertiary)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ReportPanel>
      </div>

      <AnalyticsPanel className="overflow-x-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <AnalyticsSectionHeading
            title="Recent failures"
            helpText="Up to 200 most recent failures in the period, deduplicated by event id where issuance audit already captured the accrual error."
          />
          <div className="flex gap-2">
            {(["ALL", "ACCRUAL", "REDEMPTION"] as const).map((filter) => (
              <Button
                key={filter}
                size="sm"
                variant={typeFilter === filter ? "default" : "outline"}
                onClick={() => setTypeFilter(filter)}
              >
                {filter === "ALL" ? "All" : filter === "ACCRUAL" ? "Accruals" : "Redemptions"}
              </Button>
            ))}
          </div>
        </div>
        {loading ? (
          <SkeletonBlock />
        ) : filteredFailures.length === 0 ? (
          <EmptyState message="No failures match this filter." />
        ) : (
          <table className="w-full text-sm mt-2 min-w-[960px]">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
                <th className="py-2 pr-3 font-medium">When</th>
                <th className="py-2 pr-3 font-medium">Type</th>
                <th className="py-2 pr-3 font-medium">Source</th>
                <th className="py-2 pr-3 font-medium">Customer</th>
                <th className="py-2 pr-3 font-medium">Reference</th>
                <th className="py-2 pr-3 font-medium">Category</th>
                <th className="py-2 pr-3 font-medium">Error</th>
                <th className="py-2 font-medium text-right">Latency</th>
              </tr>
            </thead>
            <tbody>
              {filteredFailures.map((row, idx) => (
                <tr
                  key={`${row.source}-${row.referenceId}-${row.occurredAt ?? idx}`}
                  className="border-b border-border/40 align-top"
                >
                  <td className="py-2 pr-3 whitespace-nowrap text-xs">
                    {row.occurredAt ? new Date(row.occurredAt).toLocaleString() : "—"}
                  </td>
                  <td className="py-2 pr-3">
                    <TypeBadge type={row.transactionType} />
                  </td>
                  <td className="py-2 pr-3 text-xs">{SOURCE_LABELS[row.source] ?? row.source}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{row.customerId || "—"}</td>
                  <td className="py-2 pr-3">
                    <span className="font-mono text-xs">{row.referenceId || "—"}</span>
                    {row.eventType ? (
                      <span className="block text-[10px] text-muted-foreground">{row.eventType}</span>
                    ) : null}
                    {row.programmeUid ? (
                      <span className="block text-[10px] text-muted-foreground">{row.programmeUid}</span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-3 text-xs">{row.errorCategory || "—"}</td>
                  <td className="py-2 pr-3 text-xs max-w-xs">
                    {row.errorCode ? (
                      <span className="font-medium text-rose-600 dark:text-rose-400">{row.errorCode}</span>
                    ) : null}
                    {row.httpStatus != null && row.httpStatus >= 400 ? (
                      <span className="ml-1 text-muted-foreground">HTTP {row.httpStatus}</span>
                    ) : null}
                    <p className="text-muted-foreground mt-0.5 break-words">{row.errorMessage || "—"}</p>
                  </td>
                  <td className="py-2 text-right tabular-nums text-xs">
                    {row.processingTimeMs != null ? `${row.processingTimeMs} ms` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AnalyticsPanel>

      <AnalyticsPanel className="border-border/60 bg-muted/20">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Troubleshooting tips</p>
            <ul className="text-xs text-muted-foreground mt-2 space-y-1 list-disc pl-4 max-w-2xl">
              <li>Insufficient balance — customer points below redemption amount; check balance cache vs ledger.</li>
              <li>Validation errors — missing fields, inactive programme, or catalog reward mismatch.</li>
              <li>Rule evaluation — event did not match active earn rules or caps were exceeded.</li>
              <li>Use Export CSV for ops handoff; link failed API calls to Integration audit for request ids.</li>
            </ul>
          </div>
          <Link
            href="/dashboard/integration"
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "inline-flex shrink-0")}
          >
            Integration dashboard
          </Link>
        </div>
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

function TypeBadge({ type }: { type: string }) {
  const isAccrual = type === "ACCRUAL";
  return (
    <span
      className={cn(
        "inline-flex text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full",
        isAccrual
          ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
          : "bg-rose-500/15 text-rose-700 dark:text-rose-400"
      )}
    >
      {isAccrual ? "Accrual" : "Redemption"}
    </span>
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
