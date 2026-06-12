"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
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
import { AnalyticsExportButton } from "@/components/analytics/analytics-export-button";
import { reportFilename } from "@/lib/analytics/export-csv";
import { analyticsApi } from "@/lib/api/client";
import type { EnrollmentReportResponse } from "@/types/analytics";

const SOURCE_COLORS: Record<string, string> = {
  REFERRAL: "#1D9E75",
  CAMPAIGN: "#378ADD",
  EARN_RULE: "#EF9F27",
  DIRECT: "#888780",
};

const SOURCE_LABELS: Record<string, string> = {
  REFERRAL: "Referral",
  CAMPAIGN: "Campaign",
  EARN_RULE: "Earn rule",
  DIRECT: "Direct",
};

function formatCount(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

function tooltipCountFormatter(value: unknown): string {
  if (value == null) return "0";
  const n = typeof value === "number" ? value : Number(value);
  return formatCount(Number.isFinite(n) ? n : 0);
}

const EMPTY_REPORT: EnrollmentReportResponse = {
  programmeUid: "default",
  fromDate: "",
  toDate: "",
  enrollmentDefinition: "",
  newEnrollmentsInPeriod: 0,
  newEnrollmentsPriorPeriod: 0,
  totalEnrolledMembers: 0,
  returningActiveInPeriod: 0,
  newEnrollmentsYtd: 0,
  periodOverPeriodChangePct: null,
  dailyNewEnrollments: [],
  monthlyNewEnrollments: [],
  enrollmentsBySource: [],
  topEnrollmentRules: [],
};

export default function EnrollmentReportPage() {
  const { programmeUid, programmeName } = useAnalyticsProgramme();
  const initial = lastNDaysRange(90);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [report, setReport] = useState<EnrollmentReportResponse>(EMPTY_REPORT);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setReport(await analyticsApi.getEnrollmentReport(from, to, programmeUid));
    } catch (err) {
      setReport(EMPTY_REPORT);
      setLoadError(err instanceof Error ? err.message : "Could not load enrollment report.");
    } finally {
      setLoading(false);
    }
  }, [from, to, programmeUid]);

  useEffect(() => {
    void load();
  }, [load]);

  const dailyChart = useMemo(
    () =>
      report.dailyNewEnrollments.map((row) => ({
        date: row.period,
        enrollments: row.newEnrollments,
      })),
    [report.dailyNewEnrollments]
  );

  const monthlyChart = useMemo(
    () =>
      report.monthlyNewEnrollments.map((row) => ({
        month: row.period,
        enrollments: row.newEnrollments,
      })),
    [report.monthlyNewEnrollments]
  );

  const sourceChart = useMemo(
    () =>
      report.enrollmentsBySource.map((row) => ({
        name: SOURCE_LABELS[row.sourceType] ?? row.sourceType,
        key: row.sourceType,
        value: row.newEnrollments,
      })),
    [report.enrollmentsBySource]
  );

  const newVsReturningChart = useMemo(
    () => [
      { name: "New (first earn)", value: report.newEnrollmentsInPeriod },
      { name: "Returning active", value: report.returningActiveInPeriod },
    ],
    [report.newEnrollmentsInPeriod, report.returningActiveInPeriod]
  );

  const ruleChart = useMemo(
    () =>
      report.topEnrollmentRules.map((r) => ({
        name: r.ruleName.length > 20 ? `${r.ruleName.slice(0, 20)}…` : r.ruleName,
        enrollments: r.newEnrollments,
      })),
    [report.topEnrollmentRules]
  );

  const popLabel =
    report.periodOverPeriodChangePct == null
      ? "vs prior period (no baseline)"
      : `${report.periodOverPeriodChangePct >= 0 ? "+" : ""}${report.periodOverPeriodChangePct.toFixed(1)}% vs prior period`;

  return (
    <div className="space-y-6">
      {loadError ? (
        <AnalyticsPanel className="border-destructive/40 bg-destructive/5">
          <p className="text-sm text-destructive">{loadError}</p>
        </AnalyticsPanel>
      ) : null}

      <AnalyticsPanel>
        <AnalyticsSectionHeading
          title="Member enrollment"
          helpText={report.enrollmentDefinition || EMPTY_REPORT.enrollmentDefinition}
        />
        <p className="text-xs text-muted-foreground -mt-2 leading-relaxed">
          Acquisition and membership growth for <span className="font-medium text-foreground">{programmeName}</span>.
          New members are customers whose first CREDIT falls in the selected range. Returning active members enrolled
          earlier but had ledger activity in this range.
        </p>
        <div className="flex flex-wrap items-end gap-3 mt-4">
          <div className="space-y-1">
            <label htmlFor="enrollment-from" className="text-xs text-muted-foreground">
              From
            </label>
            <Input id="enrollment-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label htmlFor="enrollment-to" className="text-xs text-muted-foreground">
              To
            </label>
            <Input id="enrollment-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button onClick={() => void load()} disabled={loading}>
            {loading ? "Loading…" : "Apply"}
          </Button>
          <AnalyticsExportButton
            exportPath="enrollment"
            params={{ from, to, programmeUid }}
            filename={reportFilename("enrollment", programmeUid, from, to)}
            disabled={loading}
          />
        </div>
      </AnalyticsPanel>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiStat
          label="New enrollments"
          value={loading ? "…" : formatCount(report.newEnrollmentsInPeriod)}
          sub={popLabel}
        />
        <KpiStat
          label="Total enrolled"
          value={loading ? "…" : formatCount(report.totalEnrolledMembers)}
          sub="All-time (first CREDIT)"
        />
        <KpiStat
          label="Returning active"
          value={loading ? "…" : formatCount(report.returningActiveInPeriod)}
          sub="Enrolled before range, active now"
        />
        <KpiStat
          label="New enrollments YTD"
          value={loading ? "…" : formatCount(report.newEnrollmentsYtd)}
          sub={`Prior period: ${formatCount(report.newEnrollmentsPriorPeriod)}`}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ReportPanel
          title="Daily new enrollments"
          subtitle="First CREDIT per customer by day"
          helpText="Line chart of new programme members per calendar day in the selected range."
        >
          {loading ? (
            <SkeletonChart />
          ) : dailyChart.length === 0 ? (
            <EmptyState message="No new enrollments in this range." />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip formatter={(value) => tooltipCountFormatter(value)} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="enrollments"
                    name="New members"
                    stroke="var(--chart-primary)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </ReportPanel>

        <ReportPanel
          title="Monthly new enrollments"
          subtitle="Aggregated first CREDIT by calendar month"
          helpText="Monthly roll-up for spotting seasonality and longer-term growth trends."
        >
          {loading ? (
            <SkeletonChart />
          ) : monthlyChart.length === 0 ? (
            <EmptyState message="No monthly enrollment data in this range." />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip formatter={(value) => tooltipCountFormatter(value)} />
                  <Bar dataKey="enrollments" name="New members" fill="var(--chart-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ReportPanel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ReportPanel
          title="New vs returning (activity)"
          subtitle="Members active in the selected period"
          helpText="Pie chart comparing customers whose first earn is in-range (new) versus those who enrolled earlier but transacted in-range (returning)."
        >
          {loading ? (
            <SkeletonChart />
          ) : newVsReturningChart.every((s) => s.value === 0) ? (
            <EmptyState message="No member activity in this range." />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={newVsReturningChart} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95}>
                    {newVsReturningChart.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? "var(--chart-primary)" : "var(--chart-secondary)"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => tooltipCountFormatter(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </ReportPanel>

        <ReportPanel
          title="Acquisition source"
          subtitle="How new members entered in this period"
          helpText="Referral = referee in referrals table; Campaign = first earn tied to a campaign; Earn rule = first earn from a rule; Direct = other first earns."
        >
          {loading ? (
            <SkeletonChart />
          ) : sourceChart.length === 0 ? (
            <EmptyState message="No source breakdown for this range." />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip formatter={(value) => tooltipCountFormatter(value)} />
                  <Bar dataKey="value" name="New members" radius={[4, 4, 0, 0]}>
                    {sourceChart.map((entry) => (
                      <Cell key={entry.key} fill={SOURCE_COLORS[entry.key] ?? "var(--chart-tertiary)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ReportPanel>
      </div>

      <ReportPanel
        title="Top enrolling earn rules"
        subtitle="Rules that triggered the first CREDIT for new members"
        helpText="Bar chart of earn rules linked to the first points award for customers enrolled in the selected period."
      >
        {loading ? (
          <SkeletonChart />
        ) : ruleChart.length === 0 ? (
          <EmptyState message="No rule-attributed enrollments in this range." />
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ruleChart} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => tooltipCountFormatter(value)} />
                <Bar dataKey="enrollments" name="New members" fill="var(--chart-primary)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ReportPanel>
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
