"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
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
import { cn } from "@/lib/utils";
import type { SlaPerformanceReportResponse, SlaStatus } from "@/types/analytics";

function formatPct(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

function formatPctChange(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)} pp`;
}

function formatMs(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${Math.round(value)} ms`;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

const EMPTY_REPORT: SlaPerformanceReportResponse = {
  programmeUid: "default",
  fromDate: "",
  toDate: "",
  reportDefinition: "",
  overallSlaStatus: "NO_DATA",
  totalApiRequests: 0,
  overallApiSuccessRatePct: 0,
  overallApiP99LatencyMs: null,
  totalIssuanceAttempts: 0,
  issuanceSuccessRatePct: 0,
  issuanceP99LatencyMs: null,
  totalEventProcessingAttempts: 0,
  eventProcessingSuccessRatePct: 0,
  eventProcessingP99LatencyMs: null,
  priorPeriodApiSuccessRatePct: 0,
  periodOverPeriodApiSuccessChangePct: null,
  components: [],
  endpointBreakdown: [],
  dailyTrend: [],
};

const SLA_STATUS_STYLES: Record<SlaStatus, string> = {
  MET: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  AT_RISK: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30",
  BREACHED: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
  NO_DATA: "bg-muted text-muted-foreground border-border",
};

const SLA_STATUS_LABELS: Record<SlaStatus, string> = {
  MET: "SLA met",
  AT_RISK: "At risk",
  BREACHED: "SLA breached",
  NO_DATA: "No data",
};

function SlaBadge({ status }: { status: SlaStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
        SLA_STATUS_STYLES[status]
      )}
    >
      {SLA_STATUS_LABELS[status]}
    </span>
  );
}

export default function SlaPerformancePage() {
  const { programmeUid, programmeName } = useAnalyticsProgramme();
  const initial = lastNDaysRange(30);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [report, setReport] = useState<SlaPerformanceReportResponse>(EMPTY_REPORT);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setReport(await analyticsApi.getSlaPerformanceReport(from, to, programmeUid));
    } catch (err) {
      setReport(EMPTY_REPORT);
      setLoadError(err instanceof Error ? err.message : "Could not load SLA and performance report.");
    } finally {
      setLoading(false);
    }
  }, [from, to, programmeUid]);

  useEffect(() => {
    void load();
  }, [load]);

  const successChart = useMemo(
    () =>
      report.dailyTrend.map((row) => ({
        day: row.period.slice(5),
        apiSuccess: Number(row.apiSuccessRatePct) || 0,
        issuanceSuccess: Number(row.issuanceSuccessRatePct) || 0,
        eventSuccess: Number(row.eventSuccessRatePct) || 0,
      })),
    [report.dailyTrend]
  );

  const latencyChart = useMemo(
    () =>
      report.dailyTrend.map((row) => ({
        day: row.period.slice(5),
        apiLatency: row.apiAvgLatencyMs ?? 0,
        issuanceLatency: row.issuanceAvgLatencyMs ?? 0,
        eventLatency: row.eventAvgLatencyMs ?? 0,
      })),
    [report.dailyTrend]
  );

  const exportCsv = async () => {
    setExporting(true);
    try {
      await analyticsApi.downloadExport(
        "sla-performance",
        { from, to, programmeUid },
        `sla-performance-${programmeUid}-${from}-to-${to}.csv`
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <AnalyticsSectionHeading
            title="SLA & performance"
            helpText="Loyalty-engine SLA report (BRD §6.3): success rates and latency percentiles for integration APIs, reward issuance, and async event processing — with daily trends and endpoint breakdown."
          />
          {!loading ? <SlaBadge status={report.overallSlaStatus} /> : null}
        </div>
        <p className="text-xs text-muted-foreground -mt-2 leading-relaxed">
          Programme: <span className="font-medium">{programmeName}</span>. Issuance metrics are programme-scoped;
          API and event-processing metrics are tenant-wide. For live API keys and request logs, see{" "}
          <Link href="/dashboard/integration" className="text-primary underline-offset-2 hover:underline">
            Integration dashboard
          </Link>
          .
        </p>
        <div className="flex flex-wrap items-end gap-3 mt-4">
          <div className="space-y-1">
            <label htmlFor="sla-from" className="text-xs text-muted-foreground">
              From
            </label>
            <Input id="sla-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label htmlFor="sla-to" className="text-xs text-muted-foreground">
              To
            </label>
            <Input id="sla-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
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
          label="Integration APIs"
          value={loading ? "…" : formatCount(report.totalApiRequests)}
          sub={
            loading
              ? undefined
              : `${formatPct(report.overallApiSuccessRatePct)} success · P99 ${formatMs(report.overallApiP99LatencyMs)} · vs prior ${formatPctChange(report.periodOverPeriodApiSuccessChangePct)}`
          }
        />
        <KpiStat
          label="Reward issuance"
          value={loading ? "…" : formatCount(report.totalIssuanceAttempts)}
          sub={
            loading
              ? undefined
              : `${formatPct(report.issuanceSuccessRatePct)} success · P99 ${formatMs(report.issuanceP99LatencyMs)}`
          }
        />
        <KpiStat
          label="Event processing"
          value={loading ? "…" : formatCount(report.totalEventProcessingAttempts)}
          sub={
            loading
              ? undefined
              : `${formatPct(report.eventProcessingSuccessRatePct)} success · P99 ${formatMs(report.eventProcessingP99LatencyMs)}`
          }
        />
        <KpiStat
          label="Prior period API success"
          value={loading ? "…" : formatPct(report.priorPeriodApiSuccessRatePct)}
          sub={loading ? undefined : "Same-length window immediately before selected range"}
        />
      </div>

      <AnalyticsPanel>
        <AnalyticsSectionHeading
          title="Component SLA"
          helpText="Platform baseline targets: APIs ≥99% success / P99 ≤500ms; issuance ≥99.5% / P99 ≤1000ms; events ≥99% / P99 ≤2000ms. Status is MET, AT_RISK (within ~0.5pp of target or >85% of latency budget), or BREACHED."
        />
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Component</th>
                <th className="py-2 pr-4 font-medium">Volume</th>
                <th className="py-2 pr-4 font-medium">Success rate</th>
                <th className="py-2 pr-4 font-medium">Avg</th>
                <th className="py-2 pr-4 font-medium">P50</th>
                <th className="py-2 pr-4 font-medium">P95</th>
                <th className="py-2 pr-4 font-medium">P99</th>
                <th className="py-2 pr-4 font-medium">Max</th>
                <th className="py-2 pr-4 font-medium">SLA target</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-6 text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : report.components.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-6 text-muted-foreground">
                    No component metrics in this period.
                  </td>
                </tr>
              ) : (
                report.components.map((row) => (
                  <tr key={row.componentKey} className="border-b border-border/60">
                    <td className="py-3 pr-4 font-medium">{row.componentLabel}</td>
                    <td className="py-3 pr-4 tabular-nums">{formatCount(row.totalOperations)}</td>
                    <td className="py-3 pr-4 tabular-nums">{formatPct(row.successRatePct, 2)}</td>
                    <td className="py-3 pr-4 tabular-nums">{formatMs(row.avgLatencyMs)}</td>
                    <td className="py-3 pr-4 tabular-nums">{formatMs(row.p50LatencyMs)}</td>
                    <td className="py-3 pr-4 tabular-nums">{formatMs(row.p95LatencyMs)}</td>
                    <td className="py-3 pr-4 tabular-nums">{formatMs(row.p99LatencyMs)}</td>
                    <td className="py-3 pr-4 tabular-nums">{formatMs(row.maxLatencyMs)}</td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">
                      ≥{formatPct(row.slaSuccessRateTargetPct, 1)} · P99 ≤{formatMs(row.slaLatencyTargetMs)}
                    </td>
                    <td className="py-3">
                      <SlaBadge status={row.slaStatus} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AnalyticsPanel>

      <AnalyticsPanel>
        <AnalyticsSectionHeading
          title="API endpoint breakdown"
          helpText="Per-operation success rate and P99 latency from api_request_audit_log — useful for pinpointing slow or error-prone integration paths."
        />
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Endpoint</th>
                <th className="py-2 pr-4 font-medium">Requests</th>
                <th className="py-2 pr-4 font-medium">Success rate</th>
                <th className="py-2 pr-4 font-medium">Avg latency</th>
                <th className="py-2 font-medium">P99 latency</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-6 text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : report.endpointBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-muted-foreground">
                    No API traffic recorded in this period.
                  </td>
                </tr>
              ) : (
                report.endpointBreakdown.map((row) => (
                  <tr key={row.operationKey} className="border-b border-border/60">
                    <td className="py-3 pr-4 font-medium">{row.operationLabel}</td>
                    <td className="py-3 pr-4 tabular-nums">{formatCount(row.requestCount)}</td>
                    <td className="py-3 pr-4 tabular-nums">{formatPct(row.successRatePct, 2)}</td>
                    <td className="py-3 pr-4 tabular-nums">{formatMs(row.avgLatencyMs)}</td>
                    <td className="py-3 tabular-nums">{formatMs(row.p99LatencyMs)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AnalyticsPanel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AnalyticsPanel>
          <AnalyticsSectionHeading title="Daily success rate (%)" helpText="Rolling daily success rate by component." />
          <div className="h-72 mt-4">
            {successChart.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No daily trend data.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={successChart}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis domain={[90, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} />
                  <Legend />
                  <Line type="monotone" dataKey="apiSuccess" name="APIs" stroke="hsl(var(--primary))" dot={false} />
                  <Line type="monotone" dataKey="issuanceSuccess" name="Issuance" stroke="#10b981" dot={false} />
                  <Line type="monotone" dataKey="eventSuccess" name="Events" stroke="#f59e0b" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </AnalyticsPanel>

        <AnalyticsPanel>
          <AnalyticsSectionHeading title="Daily avg latency (ms)" helpText="Average processing time per day — spike investigation." />
          <div className="h-72 mt-4">
            {latencyChart.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No daily trend data.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={latencyChart}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit="ms" />
                  <Tooltip formatter={(v) => `${Math.round(Number(v))} ms`} />
                  <Legend />
                  <Line type="monotone" dataKey="apiLatency" name="APIs" stroke="hsl(var(--primary))" dot={false} />
                  <Line type="monotone" dataKey="issuanceLatency" name="Issuance" stroke="#10b981" dot={false} />
                  <Line type="monotone" dataKey="eventLatency" name="Events" stroke="#f59e0b" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </AnalyticsPanel>
      </div>

      {!loading && report.reportDefinition ? (
        <p className="text-xs text-muted-foreground leading-relaxed">{report.reportDefinition}</p>
      ) : null}
    </div>
  );
}

function KpiStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <AnalyticsStatCard>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold mt-1 tabular-nums">{value}</p>
      {sub ? <p className="text-xs text-muted-foreground mt-1 leading-snug">{sub}</p> : null}
    </AnalyticsStatCard>
  );
}
