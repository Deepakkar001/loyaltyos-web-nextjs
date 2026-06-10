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

import { AnalyticsPanel, AnalyticsStatCard } from "@/components/analytics/analytics-panel";
import { AnalyticsSectionHeading } from "@/components/analytics/analytics-section-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAnalyticsProgramme } from "@/lib/analytics/analytics-programme-context";
import { lastNDaysRange } from "@/lib/analytics/date-range";
import { analyticsApi } from "@/lib/api/client";
import type { BreakageExpiryReportResponse } from "@/types/analytics";

function formatPoints(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
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

const EMPTY_REPORT: BreakageExpiryReportResponse = {
  programmeUid: "default",
  fromDate: "",
  toDate: "",
  currency: "INR",
  pointsCurrencyRate: 0,
  pointsExpiredInPeriod: 0,
  customersAffectedInPeriod: 0,
  expireTransactionCount: 0,
  monetaryBreakageInPeriod: 0,
  pointsExpiredYtd: 0,
  monetaryBreakageYtd: 0,
  outstandingPointsLiability: 0,
  outstandingMonetaryLiability: 0,
  pointsExpiringNext30Days: 0,
  pointsExpiringNext60Days: 0,
  pointsExpiringNext90Days: 0,
  monthlyBreakage: [],
  breakageByTier: [],
  upcomingExpiryByMonth: [],
  recentExpiryJobRuns: [],
};

export default function BreakageExpiryReportPage() {
  const { programmeUid, programmeName } = useAnalyticsProgramme();
  const initial = lastNDaysRange(90);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [report, setReport] = useState<BreakageExpiryReportResponse>(EMPTY_REPORT);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setReport(await analyticsApi.getBreakageExpiryReport(from, to, programmeUid));
    } catch (err) {
      setReport(EMPTY_REPORT);
      setLoadError(err instanceof Error ? err.message : "Could not load breakage report.");
    } finally {
      setLoading(false);
    }
  }, [from, to, programmeUid]);

  useEffect(() => {
    void load();
  }, [load]);

  const monthlyChart = useMemo(
    () =>
      report.monthlyBreakage.map((row) => ({
        month: row.month,
        points: Number(row.expiredPoints) || 0,
        customers: row.customersAffected,
      })),
    [report.monthlyBreakage]
  );

  const tierChart = useMemo(
    () =>
      report.breakageByTier.map((row) => ({
        name: row.tierName,
        points: Number(row.expiredPoints) || 0,
        customers: row.customersAffected,
      })),
    [report.breakageByTier]
  );

  const upcomingChart = useMemo(
    () =>
      report.upcomingExpiryByMonth.map((row) => ({
        month: row.expiryMonth,
        points: Number(row.pointsExpiring) || 0,
        customers: row.customersAffected,
      })),
    [report.upcomingExpiryByMonth]
  );

  const currency = report.currency || "INR";

  return (
    <div className="space-y-6">
      {loadError ? (
        <AnalyticsPanel className="border-destructive/40 bg-destructive/5">
          <p className="text-sm text-destructive">{loadError}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Check that the backend is running and includes the breakage-expiry report endpoint.
          </p>
        </AnalyticsPanel>
      ) : null}

      {!loading &&
      report.expireTransactionCount === 0 &&
      report.recentExpiryJobRuns.length === 0 &&
      !loadError ? (
        <AnalyticsPanel className="border-amber-500/30 bg-amber-500/5">
          <p className="text-sm text-foreground">
            No EXPIRE ledger rows for <span className="font-medium">{programmeName}</span> in this date range.
          </p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            The nightly expiry job logs platform runs under tenant id <code className="text-xs">GLOBAL</code> in{" "}
            <code className="text-xs">points_expiry_jobs</code> — that count is across all tenants. This report only
            shows your tenant&apos;s EXPIRE rows. Try another programme from the selector above, widen the date range,
            or confirm expired credits belong to your logged-in tenant.
          </p>
        </AnalyticsPanel>
      ) : null}

      <AnalyticsPanel>
        <AnalyticsSectionHeading
          title="Breakage & point expiry"
          helpText="Finance report aligned with BRD §4.7.4: expired points (breakage), monetary liability reduction, YTD trend, and upcoming expiry from scheduled CREDIT rows. Monetary values use your tenant points-to-currency rate."
        />
        <p className="text-xs text-muted-foreground -mt-2">
          Period breakage, year-to-date totals, outstanding liability, and forward expiry schedule.
        </p>
        <div className="flex flex-wrap items-end gap-3 mt-4">
          <div className="space-y-1">
            <label htmlFor="breakage-from" className="text-xs text-muted-foreground">
              From
            </label>
            <Input id="breakage-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label htmlFor="breakage-to" className="text-xs text-muted-foreground">
              To
            </label>
            <Input id="breakage-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button onClick={() => void load()} disabled={loading}>
            {loading ? "Loading…" : "Apply"}
          </Button>
        </div>
      </AnalyticsPanel>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiStat
          label="Points expired (period)"
          value={loading ? "…" : formatPoints(Number(report.pointsExpiredInPeriod))}
          sub={`${report.customersAffectedInPeriod} customers · ${report.expireTransactionCount} EXPIRE rows`}
        />
        <KpiStat
          label="Breakage value (period)"
          value={loading ? "…" : formatMoney(Number(report.monetaryBreakageInPeriod), currency)}
          sub={`Rate: ${report.pointsCurrencyRate} ${currency}/pt`}
        />
        <KpiStat
          label="Breakage YTD"
          value={loading ? "…" : formatMoney(Number(report.monetaryBreakageYtd), currency)}
          sub={`${formatPoints(Number(report.pointsExpiredYtd))} points`}
        />
        <KpiStat
          label="Outstanding liability"
          value={loading ? "…" : formatMoney(Number(report.outstandingMonetaryLiability), currency)}
          sub={`${formatPoints(Number(report.outstandingPointsLiability))} points in circulation`}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiStat
          label="Expiring in 30 days"
          value={loading ? "…" : formatPoints(Number(report.pointsExpiringNext30Days))}
        />
        <KpiStat
          label="Expiring in 60 days"
          value={loading ? "…" : formatPoints(Number(report.pointsExpiringNext60Days))}
        />
        <KpiStat
          label="Expiring in 90 days"
          value={loading ? "…" : formatPoints(Number(report.pointsExpiringNext90Days))}
        />
      </div>

      <ReportPanel
        title="Monthly breakage trend"
        subtitle="EXPIRE ledger volume by month"
        helpText="Line chart of total expired points per calendar month within the selected date range."
      >
        {loading ? (
          <SkeletonChart />
        ) : monthlyChart.length === 0 ? (
          <EmptyState message="No EXPIRE transactions in this period." />
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => tooltipPointsFormatter(value)} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="points"
                  name="Expired points"
                  stroke="var(--chart-primary)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </ReportPanel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ReportPanel
          title="Breakage by tier"
          subtitle="Expired points grouped by member's current tier band"
          helpText="Tier assignment uses current balance cache — an approximation for finance review, not tier at expiry time."
        >
          {loading ? (
            <SkeletonChart />
          ) : tierChart.length === 0 ? (
            <EmptyState message="No tier breakdown for this period." />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tierChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => tooltipPointsFormatter(value)} />
                  <Bar dataKey="points" name="Expired points" fill="var(--chart-secondary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ReportPanel>

        <ReportPanel
          title="Upcoming expiry schedule"
          subtitle="Scheduled CREDIT expiries — next 12 months"
          helpText="Sum of points on CREDIT rows with future expires_at that have not yet been processed by the expiry job."
        >
          {loading ? (
            <SkeletonChart />
          ) : upcomingChart.length === 0 ? (
            <EmptyState message="No scheduled expiries in the next 12 months." />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={upcomingChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => tooltipPointsFormatter(value)} />
                  <Bar dataKey="points" name="Points expiring" fill="var(--chart-tertiary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ReportPanel>
      </div>

      <AnalyticsPanel className="overflow-x-auto">
        <AnalyticsSectionHeading
          title="Recent expiry activity"
          helpText="One row per calendar day: total EXPIRE ledger points for your tenant on that day. Executed at is the time of the last EXPIRE row that day."
        />
        {loading ? (
          <div className="h-24 bg-muted/40 animate-pulse rounded-xl border border-border/50" />
        ) : report.recentExpiryJobRuns.length === 0 ? (
          <EmptyState message="No expiry job history recorded yet." />
        ) : (
          <table className="w-full text-sm mt-2">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
                <th className="py-2 pr-4 font-medium">Batch date</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Your points expired</th>
                <th className="py-2 pr-4 font-medium">Customers</th>
                <th className="py-2 font-medium">Last expired at</th>
              </tr>
            </thead>
            <tbody>
              {report.recentExpiryJobRuns.map((row) => (
                <tr key={`${row.batchDate}-${row.executedAt ?? row.status}`} className="border-b border-border/40">
                  <td className="py-2 pr-4">{row.batchDate}</td>
                  <td className="py-2 pr-4">{row.status}</td>
                  <td className="py-2 pr-4">{row.totalExpired != null ? formatPoints(row.totalExpired) : "—"}</td>
                  <td className="py-2 pr-4">{row.customersAffected ?? "—"}</td>
                  <td className="py-2">{row.executedAt ?? "—"}</td>
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
  return <div className="h-72 rounded-xl bg-muted/40 animate-pulse border border-border/50" />;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-48 flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border/70 rounded-xl bg-background/30">
      {message}
    </div>
  );
}
