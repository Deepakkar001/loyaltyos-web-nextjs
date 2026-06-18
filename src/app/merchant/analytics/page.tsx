"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  MerchantPageHeader,
  MerchantPageLoader,
  MerchantPanelCard,
  MerchantStatCard,
} from "@/components/merchant/merchant-ui";
import { getMerchantToken, merchantCampaignAnalytics } from "@/lib/api/merchant";
import { PORTAL_LOGIN_PATH } from "@/lib/auth/paths";
import type { MerchantCampaignAnalyticsResponse } from "@/types/merchant";
import { BarChart3, DollarSign, TrendingUp, Users } from "lucide-react";

function tooltipCountFormatter(value: unknown): string {
  if (value == null) return "0";
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n.toLocaleString() : "0";
}

export default function MerchantAnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<MerchantCampaignAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getMerchantToken()) {
      router.replace(PORTAL_LOGIN_PATH);
      return;
    }
    merchantCampaignAnalytics()
      .then(setData)
      .catch((e: unknown) => {
        toast.error(e instanceof Error ? e.message : "Failed to load analytics");
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return <MerchantPageLoader label="Loading analytics…" />;

  if (!data || data.totalCampaigns === 0) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <MerchantPageHeader
          title="Campaign analytics"
          description="Overview of all your funded campaigns."
        />
        <div className="rounded-2xl border border-border/50 bg-[var(--surface-card)] p-12 text-center">
          <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-4 text-sm text-muted-foreground">No campaign data to display yet.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create your first campaign to start seeing analytics here.
          </p>
        </div>
      </div>
    );
  }

  const budgetChartData = data.campaignStats.map((c) => ({
    name: c.campaignName.length > 14 ? c.campaignName.slice(0, 14) + "…" : c.campaignName,
    allocated: Number(c.budgetTotal ?? 0),
    consumed: Number(c.budgetConsumed ?? 0),
  }));

  const participationsChartData = data.campaignStats.map((c) => ({
    name: c.campaignName.length > 14 ? c.campaignName.slice(0, 14) + "…" : c.campaignName,
    participations: Number(c.totalParticipations ?? 0),
    customers: Number(c.uniqueCustomersReached ?? 0),
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <MerchantPageHeader
        title="Campaign analytics"
        description="Overview of all your funded campaigns."
      />

      {/* Summary stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MerchantStatCard
          label="Total participations"
          value={Number(data.totalParticipations).toLocaleString()}
          icon={Users}
          accent="sky"
        />
        <MerchantStatCard
          label="Unique customers"
          value={Number(data.totalUniqueCustomers).toLocaleString()}
          icon={Users}
          accent="emerald"
        />
        <MerchantStatCard
          label="Points issued"
          value={Number(data.totalPointsIssued).toLocaleString()}
          icon={TrendingUp}
          accent="violet"
        />
        <MerchantStatCard
          label="Budget used"
          value={`${Number(data.budgetConsumedPct).toFixed(1)}%`}
          icon={DollarSign}
          accent="amber"
        />
      </div>

      {/* Budget chart */}
      <MerchantPanelCard title="Budget: allocated vs consumed per campaign">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={budgetChartData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.4)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value) => tooltipCountFormatter(value)}
                contentStyle={{
                  borderRadius: "0.75rem",
                  border: "1px solid hsl(var(--border)/0.5)",
                  background: "hsl(var(--background))",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="allocated" name="Allocated" fill="#a3e635" radius={[4, 4, 0, 0]} />
              <Bar dataKey="consumed" name="Consumed" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </MerchantPanelCard>

      {/* Participations chart */}
      <MerchantPanelCard title="Participations & unique customers per campaign">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={participationsChartData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.4)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value) => tooltipCountFormatter(value)}
                contentStyle={{
                  borderRadius: "0.75rem",
                  border: "1px solid hsl(var(--border)/0.5)",
                  background: "hsl(var(--background))",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="participations" name="Participations" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="customers" name="Unique customers" fill="#818cf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </MerchantPanelCard>

      {/* Per-campaign stats table */}
      <MerchantPanelCard title="Per-campaign breakdown">
        <div className="overflow-x-auto rounded-xl border border-border/50">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Campaign</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Participations</th>
                <th className="px-4 py-3 text-right">Unique customers</th>
                <th className="px-4 py-3 text-right">Points issued</th>
                <th className="px-4 py-3 text-right">Budget %</th>
              </tr>
            </thead>
            <tbody>
              {data.campaignStats.map((c) => (
                <tr key={c.campaignUid} className="border-t border-border/40 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <Link
                      href={`/merchant/campaigns/${c.campaignUid}`}
                      className="font-medium hover:text-emerald-600 hover:underline"
                    >
                      {c.campaignName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
                        ${c.status === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-700"
                          : c.status === "PAUSED"
                          ? "bg-amber-100 text-amber-700"
                          : c.status === "ENDED"
                          ? "bg-muted text-muted-foreground"
                          : "bg-sky-100 text-sky-700"
                        }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {Number(c.totalParticipations).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {Number(c.uniqueCustomersReached).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {Number(c.totalPointsIssued).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {Number(c.budgetConsumedPct ?? 0).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </MerchantPanelCard>
    </div>
  );
}
