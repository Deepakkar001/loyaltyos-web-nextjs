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
import { Download, ExternalLink } from "lucide-react";

import { AnalyticsPanel, AnalyticsStatCard } from "@/components/analytics/analytics-panel";
import { AnalyticsSectionHeading } from "@/components/analytics/analytics-section-heading";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useAnalyticsProgramme } from "@/lib/analytics/analytics-programme-context";
import { lastNDaysRange } from "@/lib/analytics/date-range";
import { AnalyticsExportButton } from "@/components/analytics/analytics-export-button";
import { reportFilename } from "@/lib/analytics/export-csv";
import { analyticsApi } from "@/lib/api/client";
import type { AccrualRedemptionReconciliationResponse } from "@/types/analytics";

function formatPoints(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

function formatSignedPoints(value: number): string {
  const n = Number(value) || 0;
  const prefix = n > 0 ? "+" : "";
  return prefix + formatPoints(n);
}

function tooltipPointsFormatter(value: unknown): string {
  if (value == null) return "0";
  const n = typeof value === "number" ? value : Number(value);
  return formatPoints(Number.isFinite(n) ? n : 0);
}

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.length === 3 ? currency : "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPct(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

const EMPTY_REPORT: AccrualRedemptionReconciliationResponse = {
  programmeUid: "default",
  fromDate: "",
  toDate: "",
  currency: "INR",
  pointsCurrencyRate: 0,
  reportDefinition: "",
  openingPointsLiability: 0,
  openingMonetaryLiability: 0,
  closingPointsLiabilityLedger: 0,
  closingMonetaryLiabilityLedger: 0,
  closingPointsLiabilityCache: 0,
  closingMonetaryLiabilityCache: 0,
  calculatedClosingPoints: 0,
  waterfallVariancePoints: 0,
  cacheVsLedgerVariancePoints: 0,
  reconciliationStatus: "BALANCED",
  accrualsPoints: 0,
  redemptionsPoints: 0,
  expirationsPoints: 0,
  reversalsPoints: 0,
  adjustmentsNetPoints: 0,
  netChangePoints: 0,
  netChangeMonetary: 0,
  priorPeriodNetChangePoints: 0,
  periodOverPeriodNetChangePct: null,
  totalTransactionsInPeriod: 0,
  uniqueCustomersInPeriod: 0,
  movements: [],
  dailyTrend: [],
  recentBalanceVariances: [],
};

export default function AccrualRedemptionReconciliationPage() {
  const { programmeUid, programmeName } = useAnalyticsProgramme();
  const initial = lastNDaysRange(30);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [report, setReport] = useState<AccrualRedemptionReconciliationResponse>(EMPTY_REPORT);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setReport(await analyticsApi.getAccrualRedemptionReconciliation(from, to, programmeUid));
    } catch (err) {
      setReport(EMPTY_REPORT);
      setLoadError(err instanceof Error ? err.message : "Could not load reconciliation report.");
    } finally {
      setLoading(false);
    }
  }, [from, to, programmeUid]);

  useEffect(() => {
    void load();
  }, [load]);

  const currency = report.currency || "INR";
  const isBalanced = report.reconciliationStatus === "BALANCED";
  const waterfallVariance = Number(report.waterfallVariancePoints) || 0;
  const cacheVariance = Number(report.cacheVsLedgerVariancePoints) || 0;

  const dailyChart = useMemo(
    () =>
      report.dailyTrend.map((row) => ({
        day: row.period,
        accruals: Number(row.accruals) || 0,
        redemptions: Number(row.redemptions) || 0,
        netChange: Number(row.netChange) || 0,
      })),
    [report.dailyTrend]
  );

  const waterfallRows = useMemo(() => {
    const opening = Number(report.openingPointsLiability) || 0;
    const accruals = Number(report.accrualsPoints) || 0;
    const redemptions = Number(report.redemptionsPoints) || 0;
    const expirations = Number(report.expirationsPoints) || 0;
    const reversals = Number(report.reversalsPoints) || 0;
    const adjustments = Number(report.adjustmentsNetPoints) || 0;
    const calculated = Number(report.calculatedClosingPoints) || 0;
    const ledgerClosing = Number(report.closingPointsLiabilityLedger) || 0;
    const cacheClosing = Number(report.closingPointsLiabilityCache) || 0;

    return [
      { label: "Opening liability", points: opening, type: "balance" as const },
      { label: "Accruals (CREDIT)", points: accruals, type: "credit" as const },
      { label: "Redemptions (DEBIT)", points: -redemptions, type: "debit" as const },
      { label: "Expirations (EXPIRE)", points: -expirations, type: "debit" as const },
      { label: "Reversals (REVERSAL)", points: -reversals, type: "debit" as const },
      { label: "Adjustments (ADJUST)", points: adjustments, type: "adjust" as const },
      { label: "Calculated closing", points: calculated, type: "balance" as const },
      { label: "Ledger closing (as of period end)", points: ledgerClosing, type: "balance" as const },
      { label: "Waterfall variance", points: waterfallVariance, type: "variance" as const },
      { label: "Cache closing (operational)", points: cacheClosing, type: "balance" as const },
      { label: "Cache vs ledger variance", points: cacheVariance, type: "variance" as const },
    ];
  }, [report, waterfallVariance, cacheVariance]);

  return (
    <div className="space-y-6">
      {loadError ? (
        <AnalyticsPanel className="border-destructive/40 bg-destructive/5">
          <p className="text-sm text-destructive">{loadError}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Check that the backend is running and includes the accrual-redemption-reconciliation endpoint.
          </p>
        </AnalyticsPanel>
      ) : null}

      <AnalyticsPanel>
        <AnalyticsSectionHeading
          title="Accrual vs redemption reconciliation"
          helpText="Finance liability report (BRD §6.2): opening balance, period movements from points_ledger, calculated closing, ledger closing, and variance. Monetary values use your tenant points-to-currency rate."
        />
        <p className="text-xs text-muted-foreground -mt-2 leading-relaxed">
          For <span className="font-medium">{programmeName}</span>. Use this report for period-close review; download
          raw ledger rows from{" "}
          <Link href="/dashboard/analytics/export-data" className="text-primary underline-offset-2 hover:underline">
            Export Data
          </Link>{" "}
          for detailed finance work.
        </p>
        <div className="flex flex-wrap items-end gap-3 mt-4">
          <div className="space-y-1">
            <label htmlFor="recon-from" className="text-xs text-muted-foreground">
              From
            </label>
            <Input id="recon-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label htmlFor="recon-to" className="text-xs text-muted-foreground">
              To
            </label>
            <Input id="recon-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button onClick={() => void load()} disabled={loading}>
            {loading ? "Loading…" : "Apply"}
          </Button>
          <AnalyticsExportButton
            exportPath="accrual-redemption-reconciliation"
            params={{ from, to, programmeUid }}
            filename={reportFilename("accrual-redemption-reconciliation", programmeUid, from, to)}
            disabled={loading}
          />
          <Link
            href="/dashboard/analytics/export-data"
            className={cn(buttonVariants({ variant: "outline" }), "inline-flex")}
          >
            <Download className="h-4 w-4 mr-2" />
            Raw ledger CSV
          </Link>
        </div>
      </AnalyticsPanel>

      {!loading && (
        <div
          className={`rounded-xl border px-4 py-3 ${
            isBalanced
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-amber-500/40 bg-amber-500/5"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-foreground">
                Reconciliation status:{" "}
                <span className={isBalanced ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                  {isBalanced ? "Balanced" : "Variance detected"}
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Waterfall variance {formatSignedPoints(waterfallVariance)} pts · Cache vs ledger{" "}
                {formatSignedPoints(cacheVariance)} pts
              </p>
            </div>
            {!isBalanced ? (
              <p className="text-xs text-muted-foreground max-w-md">
                A non-zero waterfall variance means opening + movements ≠ ledger closing. Cache variance is an
                operational check against customer balance cache — see recent variances below.
              </p>
            ) : null}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiStat
          label="Opening liability"
          value={loading ? "…" : formatMoney(Number(report.openingMonetaryLiability), currency)}
          sub={`${formatPoints(Number(report.openingPointsLiability))} points · start of period`}
        />
        <KpiStat
          label="Closing liability (ledger)"
          value={loading ? "…" : formatMoney(Number(report.closingMonetaryLiabilityLedger), currency)}
          sub={`${formatPoints(Number(report.closingPointsLiabilityLedger))} points · authoritative`}
        />
        <KpiStat
          label="Net change (period)"
          value={loading ? "…" : formatMoney(Number(report.netChangeMonetary), currency)}
          sub={`${formatSignedPoints(Number(report.netChangePoints))} pts · vs prior ${formatPct(report.periodOverPeriodNetChangePct)}`}
        />
        <KpiStat
          label="Activity volume"
          value={loading ? "…" : formatPoints(report.totalTransactionsInPeriod)}
          sub={`${report.uniqueCustomersInPeriod} unique customers with ledger rows`}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <MovementKpi label="Accruals" value={report.accrualsPoints} loading={loading} tone="positive" />
        <MovementKpi label="Redemptions" value={report.redemptionsPoints} loading={loading} tone="negative" />
        <MovementKpi label="Expirations" value={report.expirationsPoints} loading={loading} tone="negative" />
        <MovementKpi label="Reversals" value={report.reversalsPoints} loading={loading} tone="negative" />
        <MovementKpi
          label="Adjustments (net)"
          value={report.adjustmentsNetPoints}
          loading={loading}
          tone="neutral"
          signed
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ReportPanel
          title="Liability waterfall"
          subtitle="Opening + movements = calculated closing vs ledger"
          helpText={report.reportDefinition || "Signed ledger math: CREDIT adds liability; DEBIT, EXPIRE, and REVERSAL reduce it; ADJUST uses signed points."}
        >
          {loading ? (
            <SkeletonBlock />
          ) : (
            <table className="w-full text-sm mt-2">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
                  <th className="py-2 pr-4 font-medium">Line item</th>
                  <th className="py-2 pr-4 font-medium text-right">Points</th>
                  <th className="py-2 font-medium text-right">Monetary ({currency})</th>
                </tr>
              </thead>
              <tbody>
                {waterfallRows.map((row) => (
                  <tr
                    key={row.label}
                    className={`border-b border-border/40 ${
                      row.type === "balance" ? "font-medium" : ""
                    } ${row.type === "variance" && row.points !== 0 ? "text-amber-600 dark:text-amber-400" : ""}`}
                  >
                    <td className="py-2 pr-4">{row.label}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {row.type === "credit" || row.type === "debit" || row.type === "adjust"
                        ? formatSignedPoints(row.points)
                        : formatPoints(row.points)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {formatMoney(row.points * Number(report.pointsCurrencyRate), currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ReportPanel>

        <ReportPanel
          title="Movement breakdown"
          subtitle="Volume and unique customers by entry type"
          helpText="Magnitude is absolute points moved; signed impact reflects liability direction (positive increases outstanding points)."
        >
          {loading ? (
            <SkeletonBlock />
          ) : report.movements.length === 0 ? (
            <EmptyState message="No ledger movements in this period." />
          ) : (
            <table className="w-full text-sm mt-2">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 pr-3 font-medium text-right">Magnitude</th>
                  <th className="py-2 pr-3 font-medium text-right">Signed impact</th>
                  <th className="py-2 pr-3 font-medium text-right">Txns</th>
                  <th className="py-2 font-medium text-right">Customers</th>
                </tr>
              </thead>
              <tbody>
                {report.movements.map((row) => (
                  <tr key={row.entryType} className="border-b border-border/40">
                    <td className="py-2 pr-3">
                      <span className="font-medium">{row.label}</span>
                      <span className="block text-xs text-muted-foreground">{row.entryType}</span>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{formatPoints(Number(row.pointsMagnitude))}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {formatSignedPoints(Number(row.signedPointsImpact))}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{row.transactionCount}</td>
                    <td className="py-2 text-right tabular-nums">{row.uniqueCustomers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ReportPanel>
      </div>

      <ReportPanel
        title="Daily accruals vs redemptions"
        subtitle="CREDIT and DEBIT volume by day"
        helpText="Bar chart shows daily issued (accruals) and redeemed points. Line shows net signed change including expirations, reversals, and adjustments."
      >
        {loading ? (
          <SkeletonChart />
        ) : dailyChart.length === 0 ? (
          <EmptyState message="No ledger activity in this period." />
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dailyChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => tooltipPointsFormatter(value)} />
                <Legend />
                <Bar dataKey="accruals" name="Accruals" fill="var(--chart-primary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="redemptions" name="Redemptions" fill="var(--chart-secondary)" radius={[4, 4, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="netChange"
                  name="Net change"
                  stroke="var(--chart-tertiary)"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </ReportPanel>

      <ReportPanel
        title="Daily net liability change"
        subtitle="Signed net change per day (all entry types)"
        helpText="Includes accruals, redemptions, expirations, reversals, and adjustments — the same components that drive the waterfall."
      >
        {loading ? (
          <SkeletonChart />
        ) : dailyChart.length === 0 ? (
          <EmptyState message="No daily trend for this period." />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => tooltipPointsFormatter(value)} />
                <Bar dataKey="netChange" name="Net change" fill="var(--chart-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ReportPanel>

      <AnalyticsPanel className="overflow-x-auto">
        <AnalyticsSectionHeading
          title="Recent balance reconciliation variances"
          helpText="Rows from the internal balance reconciliation job when cached customer balance differed from ledger-derived balance. This is an operational audit trail, not a finance journal."
        />
        {loading ? (
          <SkeletonBlock />
        ) : report.recentBalanceVariances.length === 0 ? (
          <EmptyState message="No recorded cache vs ledger variances for this programme recently." />
        ) : (
          <table className="w-full text-sm mt-2">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
                <th className="py-2 pr-4 font-medium">Customer</th>
                <th className="py-2 pr-4 font-medium text-right">Expected (ledger)</th>
                <th className="py-2 pr-4 font-medium text-right">Cached</th>
                <th className="py-2 pr-4 font-medium text-right">Variance</th>
                <th className="py-2 pr-4 font-medium">Action</th>
                <th className="py-2 font-medium">Detected at</th>
              </tr>
            </thead>
            <tbody>
              {report.recentBalanceVariances.map((row, idx) => (
                <tr key={`${row.customerId}-${row.executedAt ?? idx}`} className="border-b border-border/40">
                  <td className="py-2 pr-4 font-mono text-xs">{row.customerId}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{formatPoints(Number(row.expectedBalance))}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{formatPoints(Number(row.cachedBalance))}</td>
                  <td className="py-2 pr-4 text-right tabular-nums text-amber-600 dark:text-amber-400">
                    {formatSignedPoints(Number(row.variance))}
                  </td>
                  <td className="py-2 pr-4">{row.reconciliationAction || "—"}</td>
                  <td className="py-2">{row.executedAt ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AnalyticsPanel>

      <AnalyticsPanel className="border-border/60 bg-muted/20">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Need row-level detail?</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
              This summary is built from aggregated points_ledger entries. For audit trails, filters, and offline
              spreadsheets, export the full ledger CSV for the same date range and programme.
            </p>
          </div>
          <Link
            href="/dashboard/analytics/export-data"
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "inline-flex")}
          >
            Open Export Data
            <ExternalLink className="h-3.5 w-3.5 ml-2" />
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
  tone,
  signed = false,
}: {
  label: string;
  value: number;
  loading: boolean;
  tone: "positive" | "negative" | "neutral";
  signed?: boolean;
}) {
  const n = Number(value) || 0;
  const display = loading ? "…" : signed ? formatSignedPoints(n) : formatPoints(n);
  const toneClass =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "negative"
        ? "text-rose-600 dark:text-rose-400"
        : "text-foreground";

  return (
    <AnalyticsStatCard>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`text-xl font-semibold mt-1 tabular-nums ${toneClass}`}>{display}</p>
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
  return <div className="h-72 rounded-xl bg-muted/40 animate-pulse border border-border/50" />;
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
