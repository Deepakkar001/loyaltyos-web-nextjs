"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AnalyticsPanel, AnalyticsStatCard } from "@/components/analytics/analytics-panel";
import { AnalyticsSectionHeading } from "@/components/analytics/analytics-section-heading";
import { Button } from "@/components/ui/button";
import { useAnalyticsProgramme } from "@/lib/analytics/analytics-programme-context";
import { analyticsApi } from "@/lib/api/client";
import { fetchAnalyticsOrEmpty } from "@/lib/analytics/safe-fetch";
import type { SegmentAnalysisRow } from "@/types/analytics";
import { KpiCard } from "@/components/tenant-dashboard/KpiCard";

const ENGAGEMENT_COLORS: Record<string, string> = {
  ACTIVE: "#1D9E75",
  AT_RISK: "#F59E0B",
  DORMANT: "#E24B4A",
};

export default function SegmentAnalysisPage() {
  const { programmeUid } = useAnalyticsProgramme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [engagement, setEngagement] = useState<SegmentAnalysisRow[]>([]);
  const [brackets, setBrackets] = useState<SegmentAnalysisRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [eng, br] = await Promise.all([
      fetchAnalyticsOrEmpty(() => analyticsApi.getEngagementSegments(programmeUid), []),
      fetchAnalyticsOrEmpty(() => analyticsApi.getBalanceBrackets(programmeUid), []),
    ]);
    setEngagement(eng);
    setBrackets(br);
    setLoading(false);
  }, [programmeUid]);

  useEffect(() => {
    void load();
  }, [load]);

  const pieData = useMemo(
    () => engagement.map((s) => ({ name: s.segment, value: s.memberCount })),
    [engagement]
  );

  const barData = useMemo(
    () => brackets.map((b) => ({ name: b.segment, members: b.memberCount })),
    [brackets]
  );

  return (
    <div className="space-y-6">
      <AnalyticsPanel>
        <AnalyticsSectionHeading
          title="Engagement segments"
          helpText="Pie chart: each slice is an engagement segment (ACTIVE, AT_RISK, DORMANT) versus member count. Segments are based on days since the member's last ledger transaction — ACTIVE ≤30 days, AT_RISK 31–90 days, DORMANT over 90 days."
        />
        <p className="text-xs text-muted-foreground -mt-2">
          Active, at-risk, and dormant members by last transaction.
        </p>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border/70 bg-background/30 p-4 min-h-[16rem]">
            {loading ? (
              <div className="h-64 bg-muted/40 animate-pulse rounded-xl border border-border/50" />
            ) : pieData.length === 0 ? (
              <Empty message="No members in balance cache yet." />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={ENGAGEMENT_COLORS[entry.name] ?? "var(--chart-primary)"} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {engagement.map((seg) => (
              <AnalyticsStatCard key={seg.segment}>
                <p
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: ENGAGEMENT_COLORS[seg.segment] }}
                >
                  {seg.segment.replace("_", " ")}
                </p>
                <p className="text-2xl font-bold mt-2 tabular-nums">{seg.memberCount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg balance: {Number(seg.avgBalance).toLocaleString()}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => router.push("/dashboard/campaigns/create")}
                >
                  Create campaign
                </Button>
              </AnalyticsStatCard>
            ))}
          </div>
        </div>
      </AnalyticsPanel>

      <AnalyticsPanel>
        <AnalyticsSectionHeading
          title="Balance brackets"
          helpText="Bar chart: X-axis shows balance bracket labels (derived from tier thresholds); Y-axis shows member count. Compares how many members sit below mid-tier, in the lower tier range, or at top tier and above."
        />
        <p className="text-xs text-muted-foreground -mt-2">
          Members grouped by points balance relative to tier thresholds.
        </p>
        <div className="rounded-xl border border-border/70 bg-background/30 p-4">
          {loading ? (
            <div className="h-72 bg-muted/40 animate-pulse rounded-xl border border-border/50" />
          ) : barData.length === 0 ? (
            <Empty message="No balance data yet." />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="members" fill="var(--chart-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {brackets.map((b) => (
            <KpiCard
              key={b.segment}
              title={b.segment}
              value={b.memberCount}
              tone="info"
              trendPct={0}
              sparkline={[]}
            />
          ))}
        </div>
      </AnalyticsPanel>
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <div className="h-48 flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border/70 rounded-xl bg-background/30">
      {message}
    </div>
  );
}
