"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
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
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAnalyticsProgramme } from "@/lib/analytics/analytics-programme-context";
import { lastNDaysRange } from "@/lib/analytics/date-range";
import { analyticsApi } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { LiabilityReportResponse } from "@/types/analytics";

function formatPoints(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.length === 3 ? currency : "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function tooltipPointsFormatter(value: unknown): string {
  if (value == null) return "0";
  const n = typeof value === "number" ? value : Number(value);
  return formatPoints(Number.isFinite(n) ? n : 0);
}

const EMPTY_REPORT: LiabilityReportResponse = {
  programmeUid: "default",
  fromDate: "",
  toDate: "",
  currency: "INR",
  pointsCurrencyRate: 0,
  reportDefinition: "",
  outstandingPointsLiability: 0,
  outstandingMonetaryLiability: 0,
  ledgerClosingPoints: 0,
  ledgerClosingMonetary: 0,
  ledgerVsCacheVariancePoints: 0,
  periodPointsIssued: 0,
  periodPointsRedeemed: 0,
  periodPointsExpired: 0,
  periodPointsReversed: 0,
  periodAdjustmentsNet: 0,
  periodNetChangePoints: 0,
  periodNetChangeMonetary: 0,
  openingPointsLiability: 0,
  openingMonetaryLiability: 0,
  closingPointsLiability: 0,
  closingMonetaryLiability: 0,
  membersWithBalance: 0,
  totalLedgerTransactionsInPeriod: 0,
  monthlyMovement: [],
  programmeRollups: [],
  tenantRollup: null,
  liabilityByTier: [],
};

export default function LiabilityReportPage() {
  const { programmeUid, programmeName, programmes } = useAnalyticsProgramme();
  const initial = lastNDaysRange(365);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [report, setReport] = useState<LiabilityReportResponse>(EMPTY_REPORT);

  const programmeLabel = useCallback(
    (uid: string) => {
      if (uid === "TENANT_TOTAL") return "All programmes (tenant total)";
      return programmes.find((p) => p.programmeUid === uid)?.name ?? uid;
    },
    [programmes]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setReport(await analyticsApi.getLiabilityReport(from, to, programmeUid));
    } catch (err) {
      setReport(EMPTY_REPORT);
      setLoadError(err instanceof Error ? err.message : "Could not load liability report.");
    } finally {
      setLoading(false);
    }
  }, [from, to, programmeUid]);

  useEffect(() => {
    void load();
  }, [load]);

  const currency = report.currency || "INR";
  const cacheVariance = Number(report.ledgerVsCacheVariancePoints) || 0;

  const monthlyChart = useMemo(
    () =>
      report.monthlyMovement.map((row) => ({
        month: row.month,
        opening: Number(row.openingPoints) || 0,
        issued: Number(row.pointsIssued) || 0,
        redeemed: Number(row.pointsRedeemed) || 0,
        expired: Number(row.pointsExpired) || 0,
        closing: Number(row.closingPoints) || 0,
      })),
    [report.monthlyMovement]
  );

  const tierChart = useMemo(
    () =>
      report.liabilityByTier.map((row) => ({
        name: row.tierName,
        points: Number(row.pointsLiability) || 0,
        members: row.memberCount,
      })),
    [report.liabilityByTier]
  );

  const exportCsv = async () => {
    setExporting(true);
    try {
      await analyticsApi.downloadExport(
        "liability-movement",
        { from, to, programmeUid },
        `liability-movement-${programmeUid}-${from}-to-${to}.csv`
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
          <p className="text-xs text-muted-foreground mt-1">
            Check that the backend is running and includes the liability report endpoint.
          </p>
        </AnalyticsPanel>
      ) : null}

      <AnalyticsPanel>
        <AnalyticsSectionHeading
          title="Loyalty liability report"
          helpText="Finance report aligned with BRD §4.17: real-time outstanding liability, monthly movement (opening → issued → redeemed → expired → closing), programme roll-ups, and tier breakdown. Monetary values use your tenant points-to-currency rate."
        />
        <p className="text-xs text-muted-foreground -mt-2 leading-relaxed">
          Programme: <span className="font-medium">{programmeName}</span>. Breakage detail lives under{" "}
          <Link href="/dashboard/analytics/breakage-expiry" className="text-primary underline-offset-2 hover:underline">
            Breakage & Expiry
          </Link>
          ; period-close waterfall under{" "}
          <Link
            href="/dashboard/analytics/accrual-redemption-reconciliation"
            className="text-primary underline-offset-2 hover:underline"
          >
            Accrual & Reconciliation
          </Link>
          .
        </p>
        <div className="flex flex-wrap items-end gap-3 mt-4">
          <div className="space-y-1">
            <label htmlFor="liability-from" className="text-xs text-muted-foreground">
              From
            </label>
            <Input id="liability-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label htmlFor="liability-to" className="text-xs text-muted-foreground">
              To
            </label>
            <Input id="liability-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button onClick={() => void load()} disabled={loading}>
            {loading ? "Loading…" : "Apply"}
          </Button>
          <Button variant="outline" onClick={() => void exportCsv()} disabled={exporting || loading}>
            <Download className="h-4 w-4 mr-2" />
            {exporting ? "Exporting…" : "Export finance CSV"}
          </Button>
        </div>
      </AnalyticsPanel>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiStat
          label="Outstanding liability"
          value={loading ? "…" : formatMoney(Number(report.outstandingMonetaryLiability), currency)}
          sub={`${formatPoints(Number(report.outstandingPointsLiability))} pts · ${report.membersWithBalance} members with balance`}
        />
        <KpiStat
          label="Ledger closing"
          value={loading ? "…" : formatMoney(Number(report.ledgerClosingMonetary), currency)}
          sub={`${formatPoints(Number(report.ledgerClosingPoints))} pts · authoritative`}
        />
        <KpiStat
          label="Period net change"
          value={loading ? "…" : formatMoney(Number(report.periodNetChangeMonetary), currency)}
          sub={`${formatPoints(Number(report.periodNetChangePoints))} pts · ${report.totalLedgerTransactionsInPeriod} ledger rows`}
        />
        <KpiStat
          label="Cache vs ledger"
          value={loading ? "…" : formatPoints(cacheVariance)}
          sub={cacheVariance === 0 ? "Aligned" : "Operational variance (pts)"}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <MovementKpi label="Opening (period)" value={report.openingPointsLiability} loading={loading} />
        <MovementKpi label="Issued" value={report.periodPointsIssued} loading={loading} tone="positive" />
        <MovementKpi label="Redeemed" value={report.periodPointsRedeemed} loading={loading} tone="negative" />
        <MovementKpi label="Expired" value={report.periodPointsExpired} loading={loading} tone="negative" />
        <MovementKpi label="Closing (period)" value={report.closingPointsLiability} loading={loading} />
      </div>

      <ReportPanel
        title="Monthly liability movement"
        subtitle="Opening → issued → redeemed → expired → closing (points and monetary)"
        helpText={report.reportDefinition || "Each row is a calendar month clipped to your selected date range. Partial months are flagged when the range does not cover the full month."}
      >
        {loading ? (
          <SkeletonBlock />
        ) : report.monthlyMovement.length === 0 ? (
          <EmptyState message="No months in this date range." />
        ) : (
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm min-w-[960px]">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
                  <th className="py-2 pr-3 font-medium">Month</th>
                  <th className="py-2 pr-3 font-medium text-right">Opening</th>
                  <th className="py-2 pr-3 font-medium text-right">Issued</th>
                  <th className="py-2 pr-3 font-medium text-right">Redeemed</th>
                  <th className="py-2 pr-3 font-medium text-right">Expired</th>
                  <th className="py-2 pr-3 font-medium text-right">Reversed</th>
                  <th className="py-2 pr-3 font-medium text-right">Adjustments</th>
                  <th className="py-2 pr-3 font-medium text-right">Net change</th>
                  <th className="py-2 font-medium text-right">Closing</th>
                </tr>
              </thead>
              <tbody>
                {report.monthlyMovement.map((row) => (
                  <tr key={row.month} className="border-b border-border/40">
                    <td className="py-2 pr-3">
                      {row.month}
                      {row.partialMonth ? (
                        <span className="ml-2 text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-400">
                          partial
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{formatPoints(Number(row.openingPoints))}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatPoints(Number(row.pointsIssued))}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-rose-600 dark:text-rose-400">
                      {formatPoints(Number(row.pointsRedeemed))}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-rose-600 dark:text-rose-400">
                      {formatPoints(Number(row.pointsExpired))}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{formatPoints(Number(row.pointsReversed))}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{formatPoints(Number(row.adjustmentsNet))}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{formatPoints(Number(row.netChangePoints))}</td>
                    <td className="py-2 text-right tabular-nums font-medium">
                      {formatPoints(Number(row.closingPoints))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground mt-3">
              Monetary columns available in the finance CSV export ({currency} @ {report.pointsCurrencyRate}/pt).
            </p>
          </div>
        )}
      </ReportPanel>

      <ReportPanel
        title="Monthly movement chart"
        subtitle="Issued vs redeemed vs closing balance trend"
        helpText="Stacked view of monthly issued and redeemed volume with closing liability line."
      >
        {loading ? (
          <SkeletonChart />
        ) : monthlyChart.length === 0 ? (
          <EmptyState message="No monthly data for this period." />
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => tooltipPointsFormatter(value)} />
                <Legend />
                <Bar dataKey="issued" name="Issued" fill="var(--chart-primary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="redeemed" name="Redeemed" fill="var(--chart-secondary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expired" name="Expired" fill="var(--chart-tertiary)" radius={[4, 4, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="closing"
                  name="Closing liability"
                  stroke="var(--foreground)"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </ReportPanel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ReportPanel
          title="Programme roll-up"
          subtitle="Outstanding liability and period movement by programme"
          helpText="Tenant-wide view across all programmes. Selected programme details are in the KPIs and monthly table above."
        >
          {loading ? (
            <SkeletonBlock />
          ) : report.programmeRollups.length === 0 ? (
            <EmptyState message="No programme liability data yet." />
          ) : (
            <table className="w-full text-sm mt-2">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
                  <th className="py-2 pr-3 font-medium">Programme</th>
                  <th className="py-2 pr-3 font-medium text-right">Outstanding</th>
                  <th className="py-2 pr-3 font-medium text-right">Issued</th>
                  <th className="py-2 pr-3 font-medium text-right">Redeemed</th>
                  <th className="py-2 pr-3 font-medium text-right">Expired</th>
                  <th className="py-2 font-medium text-right">Net change</th>
                </tr>
              </thead>
              <tbody>
                {report.programmeRollups.map((row) => (
                  <tr
                    key={row.programmeUid}
                    className={cn(
                      "border-b border-border/40",
                      row.programmeUid === programmeUid ? "bg-primary/5" : ""
                    )}
                  >
                    <td className="py-2 pr-3">
                      <span className="font-medium">{programmeLabel(row.programmeUid)}</span>
                      <span className="block text-xs text-muted-foreground">{row.programmeUid}</span>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {formatMoney(Number(row.outstandingMonetary), currency)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{formatPoints(Number(row.periodPointsIssued))}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {formatPoints(Number(row.periodPointsRedeemed))}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {formatPoints(Number(row.periodPointsExpired))}
                    </td>
                    <td className="py-2 text-right tabular-nums">{formatPoints(Number(row.periodNetChangePoints))}</td>
                  </tr>
                ))}
                {report.tenantRollup ? (
                  <tr className="border-t-2 border-border font-semibold bg-muted/30">
                    <td className="py-2 pr-3">{programmeLabel(report.tenantRollup.programmeUid)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {formatMoney(Number(report.tenantRollup.outstandingMonetary), currency)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {formatPoints(Number(report.tenantRollup.periodPointsIssued))}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {formatPoints(Number(report.tenantRollup.periodPointsRedeemed))}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {formatPoints(Number(report.tenantRollup.periodPointsExpired))}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {formatPoints(Number(report.tenantRollup.periodNetChangePoints))}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          )}
        </ReportPanel>

        <ReportPanel
          title="Liability by tier"
          subtitle="Outstanding points grouped by member tier band"
          helpText="Uses current customer balance cache and tier thresholds — useful for finance provisioning by tier."
        >
          {loading ? (
            <SkeletonChart />
          ) : tierChart.length === 0 ? (
            <EmptyState message="No tier breakdown available." />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tierChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => tooltipPointsFormatter(value)} />
                  <Bar dataKey="points" name="Points liability" fill="var(--chart-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ReportPanel>
      </div>

      <AnalyticsPanel className="border-border/60 bg-muted/20">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Finance export</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
              Download monthly movement rows plus programme roll-ups in CSV format for spreadsheets and period-close
              workflows. Raw ledger rows remain available under Export Data.
            </p>
          </div>
          <Link
            href="/dashboard/analytics/export-data"
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "inline-flex")}
          >
            Export Data
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

function MovementKpi({
  label,
  value,
  loading,
  tone = "neutral",
}: {
  label: string;
  value: number;
  loading: boolean;
  tone?: "positive" | "negative" | "neutral";
}) {
  const n = Number(value) || 0;
  const toneClass =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "negative"
        ? "text-rose-600 dark:text-rose-400"
        : "text-foreground";

  return (
    <AnalyticsStatCard>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`text-xl font-semibold mt-1 tabular-nums ${toneClass}`}>
        {loading ? "…" : formatPoints(n)}
      </p>
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
