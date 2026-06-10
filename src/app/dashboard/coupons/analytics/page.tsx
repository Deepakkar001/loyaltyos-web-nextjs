"use client";

import Link from "next/link";
import toast from "react-hot-toast";
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

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { lastNDaysRange } from "@/lib/analytics/date-range";
import { couponApi, programmeApiV2 } from "@/lib/api/client";
import { mergeProgrammeDropdownRows } from "@/lib/programme/programme-config-helpers";
import { COUPON_STATUS_LABELS, COUPON_TYPE_LABELS, type CouponUsageReportResponse } from "@/types/coupon";

const CHANNEL_COLORS = ["#378ADD", "#1D9E75", "#EF9F27", "#888780", "#E24B4A"];

const EMPTY: CouponUsageReportResponse = {
  summary: {
    programmeUid: "",
    fromDate: "",
    toDate: "",
    totalCoupons: 0,
    activeCoupons: 0,
    redemptionsInPeriod: 0,
    redemptionsPriorPeriod: 0,
    uniqueCustomersInPeriod: 0,
    totalDiscountInPeriod: 0,
    totalOrderValueInPeriod: 0,
    totalPointsCreditedInPeriod: 0,
    periodOverPeriodChangePct: null,
    currency: "INR",
  },
  dailyRedemptions: [],
  byChannel: [],
  byCouponType: [],
  coupons: [],
};

function formatCount(n: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}

function formatMoney(n: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

function formatPct(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function tooltipCount(value: unknown): string {
  const n = typeof value === "number" ? value : Number(value);
  return formatCount(Number.isFinite(n) ? n : 0);
}

export default function CouponAnalyticsPage() {
  const initial = lastNDaysRange(90);
  const [programmes, setProgrammes] = useState<Array<{ programmeUid: string; name: string }>>([]);
  const [programmeUid, setProgrammeUid] = useState("");
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [report, setReport] = useState<CouponUsageReportResponse>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const programmeOptions = useMemo(
    () => programmes.map((p) => ({ value: p.programmeUid, label: p.name })),
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
      setReport(await couponApi.getUsageReport(programmeUid, from, to));
    } catch (e: unknown) {
      setReport(EMPTY);
      setLoadError(e instanceof Error ? e.message : "Failed to load coupon usage report");
    } finally {
      setLoading(false);
    }
  }, [programmeUid, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const dailyChart = useMemo(
    () =>
      report.dailyRedemptions.map((r) => ({
        date: r.period,
        redemptions: r.redemptions,
        discount: Number(r.discountTotal),
      })),
    [report.dailyRedemptions]
  );

  const channelChart = useMemo(
    () => report.byChannel.map((c) => ({ name: c.channel, value: c.redemptions })),
    [report.byChannel]
  );

  const typeChart = useMemo(
    () =>
      report.byCouponType.map((t) => ({
        name: COUPON_TYPE_LABELS[t.couponType as keyof typeof COUPON_TYPE_LABELS] ?? t.couponType,
        redemptions: t.redemptions,
      })),
    [report.byCouponType]
  );

  const { summary } = report;
  const currency = summary.currency || "INR";

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Coupon Usage Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Redemption trends, discount totals, channel mix, and per-coupon performance.
          </p>
        </div>
        <Link href="/dashboard/coupons">
          <Button variant="outline" className="rounded-full">Manage coupons</Button>
        </Link>
      </div>

      {loadError ? (
        <Card className="p-4 border-destructive/40 bg-destructive/5">
          <p className="text-sm text-destructive">{loadError}</p>
        </Card>
      ) : null}

      <Card className="p-5 border-border/70 bg-[var(--surface-card)]">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Programme</label>
            <NativeSelect
              className="w-full sm:w-[240px]"
              ariaLabel="Programme"
              value={programmeUid}
              disabled={programmeOptions.length === 0}
              onChange={setProgrammeUid}
              options={
                programmeOptions.length === 0
                  ? [{ value: "", label: "Select programme…" }]
                  : [{ value: "", label: "Select programme…" }, ...programmeOptions]
              }
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="coupon-from" className="text-xs text-muted-foreground">From</label>
            <Input id="coupon-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label htmlFor="coupon-to" className="text-xs text-muted-foreground">To</label>
            <Input id="coupon-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button onClick={() => void load()} disabled={loading || !programmeUid}>
            {loading ? "Loading…" : "Apply"}
          </Button>
        </div>
      </Card>

      {!programmeUid ? (
        <Card className="p-8 text-sm text-muted-foreground">Select a programme to view coupon analytics.</Card>
      ) : loading ? (
        <Card className="p-8"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Kpi label="Redemptions" value={formatCount(summary.redemptionsInPeriod)} sub={`${formatPct(summary.periodOverPeriodChangePct)} vs prior · ${formatCount(summary.redemptionsPriorPeriod)} prior`} />
            <Kpi label="Unique customers" value={formatCount(summary.uniqueCustomersInPeriod)} sub={`${summary.activeCoupons} active · ${summary.totalCoupons} total coupons`} />
            <Kpi label="Discount given" value={formatMoney(Number(summary.totalDiscountInPeriod), currency)} sub={`Order value ${formatMoney(Number(summary.totalOrderValueInPeriod), currency)}`} />
            <Kpi label="Points credited" value={formatCount(Number(summary.totalPointsCreditedInPeriod))} sub="From POINTS_BONUS coupons" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ReportCard title="Daily redemptions" subtitle="Volume and discount impact over time">
              {dailyChart.length === 0 ? <Empty message="No redemptions in this range." /> : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyChart}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v, name) => [name === "discount" ? formatMoney(Number(v), currency) : tooltipCount(v), name === "discount" ? "Discount" : "Redemptions"]} />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="redemptions" name="Redemptions" stroke="var(--chart-primary)" strokeWidth={2} dot={false} />
                      <Line yAxisId="right" type="monotone" dataKey="discount" name="Discount" stroke="#EF9F27" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ReportCard>

            <ReportCard title="Channel mix" subtitle="Where coupons are redeemed">
              {channelChart.length === 0 ? <Empty message="No channel data." /> : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={channelChart} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                        {channelChart.map((_, i) => (
                          <Cell key={i} fill={CHANNEL_COLORS[i % CHANNEL_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => tooltipCount(v)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ReportCard>
          </div>

          <ReportCard title="By coupon type" subtitle="Redemptions by benefit type">
            {typeChart.length === 0 ? <Empty message="No type breakdown." /> : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={typeChart}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip formatter={(v) => tooltipCount(v)} />
                    <Bar dataKey="redemptions" name="Redemptions" fill="var(--chart-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ReportCard>

          <Card className="p-5 border-border/70 bg-[var(--surface-card)] space-y-4">
            <div>
              <h2 className="text-sm font-semibold">Coupon breakdown</h2>
              <p className="text-xs text-muted-foreground mt-1">Period metrics use selected date range; utilization uses all-time redemptions.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-4">Coupon</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4 text-right">Redemptions</th>
                    <th className="py-2 pr-4 text-right">Discount</th>
                    <th className="py-2 pr-4 text-right">Avg / redeem</th>
                    <th className="py-2 text-right">Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {report.coupons.length === 0 ? (
                    <tr><td colSpan={7} className="py-4 text-center text-muted-foreground">No coupons configured</td></tr>
                  ) : report.coupons.map((c) => (
                    <tr key={c.couponUid} className="border-b border-border/30">
                      <td className="py-2 pr-4">
                        <p className="font-medium">{c.couponName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{c.couponCode}</p>
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {COUPON_TYPE_LABELS[c.couponType as keyof typeof COUPON_TYPE_LABELS] ?? c.couponType}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {COUPON_STATUS_LABELS[c.status as keyof typeof COUPON_STATUS_LABELS] ?? c.status}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {formatCount(c.redemptionsInPeriod)}
                        <span className="block text-xs text-muted-foreground">{formatCount(c.redemptionsAllTime)} all-time</span>
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">{formatMoney(Number(c.discountInPeriod), currency)}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{formatMoney(Number(c.avgDiscountPerRedemption), currency)}</td>
                      <td className="py-2 text-right tabular-nums">
                        {c.utilizationPct != null ? `${c.utilizationPct.toFixed(0)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-5 border-border/70 bg-[var(--surface-card)]">
            <h2 className="text-sm font-semibold mb-2">Channel detail</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-4">Channel</th>
                    <th className="py-2 pr-4 text-right">Redemptions</th>
                    <th className="py-2 pr-4 text-right">Discount</th>
                    <th className="py-2 text-right">Order value</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byChannel.length === 0 ? (
                    <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">No channel breakdown</td></tr>
                  ) : report.byChannel.map((c) => (
                    <tr key={c.channel} className="border-b border-border/30">
                      <td className="py-2 pr-4">{c.channel}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{formatCount(c.redemptions)}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{formatMoney(Number(c.discountTotal), currency)}</td>
                      <td className="py-2 text-right tabular-nums">{formatMoney(Number(c.orderValueTotal), currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-4 border-border/70 bg-[var(--surface-card)]">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
      {sub ? <p className="text-xs text-muted-foreground mt-1">{sub}</p> : null}
    </Card>
  );
}

function ReportCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
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

function Empty({ message }: { message: string }) {
  return (
    <div className="h-48 flex items-center justify-center text-sm text-muted-foreground border border-dashed rounded-xl">
      {message}
    </div>
  );
}
