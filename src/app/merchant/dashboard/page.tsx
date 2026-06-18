"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, Clock, IndianRupee, Megaphone, Sparkles, TrendingUp, Users } from "lucide-react";

import {
  MerchantAlertBanner,
  MerchantEmptyState,
  MerchantPageHeader,
  MerchantPageLoader,
  MerchantPanelCard,
  MerchantPrimaryButton,
  MerchantStatCard,
  MerchantStatusBadge,
} from "@/components/merchant/merchant-ui";
import { Progress } from "@/components/ui/progress";
import { getMerchantToken, merchantBudgetAlerts, merchantDashboard, merchantProfile } from "@/lib/api/merchant";
import { PORTAL_LOGIN_PATH } from "@/lib/auth/paths";
import { useMerchantAuthStore } from "@/lib/store/merchant-auth-store";
import type { MerchantBudgetAlert, MerchantDashboardStats } from "@/types/merchant";

export default function MerchantDashboardPage() {
  const router = useRouter();
  const setProfile = useMerchantAuthStore((s) => s.setProfile);
  const merchantName = useMerchantAuthStore((s) => s.merchantName);
  const [stats, setStats] = useState<MerchantDashboardStats | null>(null);
  const [budgetAlerts, setBudgetAlerts] = useState<MerchantBudgetAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getMerchantToken()) {
      router.replace(PORTAL_LOGIN_PATH);
      return;
    }
    void (async () => {
      try {
        const [profile, dashboard, alerts] = await Promise.all([
          merchantProfile(),
          merchantDashboard(),
          merchantBudgetAlerts().catch(() => []),
        ]);
        setProfile(profile);
        setStats(dashboard);
        setBudgetAlerts(alerts);
      } catch {
        router.replace(PORTAL_LOGIN_PATH);
      } finally {
        setLoading(false);
      }
    })();
  }, [router, setProfile]);

  if (loading || !stats) {
    return <MerchantPageLoader label="Loading dashboard…" />;
  }

  return (
    <div className="space-y-8">
      <MerchantPageHeader
        title={`Welcome back${merchantName ? `, ${merchantName.split(" ")[0]}` : ""}`}
        description="Track campaign performance, budget usage, and settlement activity at a glance."
        action={
          <MerchantPrimaryButton href="/merchant/campaigns/create/basic-info" icon={Sparkles}>
            Create campaign
          </MerchantPrimaryButton>
        }
      />

      {budgetAlerts.length > 0 && (
        <MerchantAlertBanner title="Budget alerts">
          <ul className="space-y-1.5">
            {budgetAlerts.slice(0, 3).map((a) => (
              <li key={`${a.campaignUid}-${a.notifiedAt}`}>
                Campaign reached {Number(a.alertThresholdPct)}% budget —{" "}
                {Number(a.budgetConsumed).toLocaleString()} /{" "}
                {Number(a.budgetTotal).toLocaleString()} consumed
              </li>
            ))}
          </ul>
        </MerchantAlertBanner>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MerchantStatCard
          label="Active campaigns"
          value={stats.activeCampaigns}
          icon={Megaphone}
          accent="emerald"
        />
        <MerchantStatCard
          label="Pending approval"
          value={stats.pendingApprovalCampaigns}
          icon={Clock}
          accent="amber"
        />
        <MerchantStatCard
          label="Budget used"
          value={`${Number(stats.budgetConsumedPct).toFixed(1)}%`}
          icon={BarChart3}
          accent="sky"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MerchantStatCard
          label="Total participations"
          value={Number(stats.totalParticipations ?? 0).toLocaleString()}
          icon={Users}
          accent="violet"
        />
        <MerchantStatCard
          label="Points issued"
          value={Number(stats.totalPointsIssued ?? 0).toLocaleString()}
          icon={TrendingUp}
          accent="emerald"
        />
        <MerchantStatCard
          label="Budget consumed"
          value={`₹${Number(stats.totalBudgetConsumed ?? 0).toLocaleString()}`}
          icon={IndianRupee}
          accent="amber"
        />
      </div>

      <MerchantPanelCard
        title="Recent campaigns"
        description="Your latest merchant-funded campaigns and their budget progress"
      >
        {stats.recentCampaigns.length === 0 ? (
          <MerchantEmptyState
            icon={Megaphone}
            title="No campaigns yet"
            description="Launch your first merchant-funded campaign to start rewarding customers and tracking performance."
            actionHref="/merchant/campaigns/create/basic-info"
            actionLabel="Create your first campaign"
          />
        ) : (
          <div className="space-y-3">
            {stats.recentCampaigns.map((c) => (
              <Link
                key={c.campaignUid}
                href={`/merchant/campaigns/${encodeURIComponent(c.campaignUid)}`}
                className="block rounded-xl border border-border/50 bg-muted/15 p-4 transition-all hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold truncate text-foreground">{c.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {c.participations} participations
                    </p>
                  </div>
                  <MerchantStatusBadge
                    status={c.status}
                    pending={c.pendingMerchantApproval}
                  />
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {c.budgetConsumed.toLocaleString()} / {c.budgetTotal.toLocaleString()}
                    </span>
                    <span className="font-medium text-foreground">
                      {Number(c.budgetConsumedPct).toFixed(1)}%
                    </span>
                  </div>
                  <Progress
                    value={Number(c.budgetConsumedPct) || 0}
                    className="h-2 bg-muted/60 [&>div]:bg-emerald-500"
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </MerchantPanelCard>
    </div>
  );
}
