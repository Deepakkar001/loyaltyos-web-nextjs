"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Clock, DollarSign, PlayCircle, Users } from "lucide-react";
import toast from "react-hot-toast";

import { CampaignBudgetProgress } from "@/components/campaigns/CampaignBudgetProgress";
import {
  MerchantPageLoader,
  MerchantPanelCard,
  MerchantStatCard,
  MerchantStatusBadge,
} from "@/components/merchant/merchant-ui";
import { Button } from "@/components/ui/button";
import {
  getMerchantToken,
  merchantCampaignParticipations,
  merchantCampaignStats,
  merchantEndCampaign,
  merchantGetCampaign,
  merchantPauseCampaign,
  merchantResumeCampaign,
} from "@/lib/api/merchant";
import { canEditMerchantCampaign } from "@/lib/campaigns/merchant-campaign-editability";
import { campaignToFormState } from "@/lib/campaigns/campaign-form";
import {
  formatOfferSummary,
  formatTargetingSummary,
} from "@/lib/campaigns/campaign-offer-helpers";
import { PORTAL_LOGIN_PATH } from "@/lib/auth/paths";
import type { CampaignParticipationResponse, CampaignResponse, CampaignStatsResponse } from "@/types/campaigns";
import { cn } from "@/lib/utils";

export default function MerchantCampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignUid = typeof params.campaignUid === "string" ? params.campaignUid : "";
  const [campaign, setCampaign] = useState<CampaignResponse | null>(null);
  const [stats, setStats] = useState<CampaignStatsResponse | null>(null);
  const [participations, setParticipations] = useState<CampaignParticipationResponse[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!campaignUid) return;
    setLoading(true);
    try {
      const [c, campaignStats, parts] = await Promise.all([
        merchantGetCampaign(campaignUid),
        merchantCampaignStats(campaignUid),
        merchantCampaignParticipations(campaignUid).catch(() => []),
      ]);
      setCampaign(c);
      setStats(campaignStats);
      setParticipations(parts);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load campaign");
      router.replace("/merchant/campaigns");
    } finally {
      setLoading(false);
    }
  }, [campaignUid, router]);

  useEffect(() => {
    if (!getMerchantToken()) {
      router.replace(PORTAL_LOGIN_PATH);
      return;
    }
    void load();
  }, [load, router]);

  if (loading || !stats) {
    return <MerchantPageLoader label="Loading campaign…" />;
  }

  const name = campaign?.name ?? stats.campaignName ?? campaignUid;
  const isPaused = (stats.status ?? campaign?.status) === "PAUSED";
  const isActive = (stats.status ?? campaign?.status) === "ACTIVE";
  const canResume = isPaused && campaign && !campaign.pendingMerchantApproval;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/merchant/campaigns"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-emerald-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to campaigns
        </Link>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight truncate md:text-3xl">{name}</h1>
              <MerchantStatusBadge
                status={stats.status ?? campaign?.status}
                pending={campaign?.pendingMerchantApproval}
              />
            </div>
            <p className="mt-1.5 font-mono text-xs text-muted-foreground">{campaignUid}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {campaign && canEditMerchantCampaign(campaign) && (
              <Link
                href={`/merchant/campaigns/${campaignUid}/edit`}
                className="inline-flex items-center justify-center rounded-xl border border-border/70 bg-[var(--surface-card)] px-4 py-2 text-sm font-medium transition-colors hover:bg-muted/50"
              >
                Edit campaign
              </Link>
            )}
            {canResume && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={actionLoading}
                className="rounded-xl gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                onClick={async () => {
                  setActionLoading(true);
                  try {
                    await merchantResumeCampaign(campaignUid);
                    toast.success("Campaign resumed");
                    await load();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Resume failed");
                  } finally {
                    setActionLoading(false);
                  }
                }}
              >
                <PlayCircle className="h-4 w-4" />
                Resume
              </Button>
            )}
            {campaign && !campaign.pendingMerchantApproval && isActive && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={actionLoading}
                  className="rounded-xl"
                  onClick={async () => {
                    setActionLoading(true);
                    try {
                      await merchantPauseCampaign(campaignUid);
                      toast.success("Campaign paused");
                      await load();
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Pause failed");
                    } finally {
                      setActionLoading(false);
                    }
                  }}
                >
                  Pause
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={actionLoading}
                  className="rounded-xl"
                  onClick={async () => {
                    setActionLoading(true);
                    try {
                      await merchantEndCampaign(campaignUid);
                      toast.success("Campaign ended");
                      await load();
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "End failed");
                    } finally {
                      setActionLoading(false);
                    }
                  }}
                >
                  End campaign
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Campaign info */}
      {campaign && (
        <MerchantPanelCard title="Campaign info">
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            {campaign.description && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</dt>
                <dd className="mt-1">{campaign.description}</dd>
              </div>
            )}
            {campaign.programmeUid && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Programme</dt>
                <dd className="mt-1 font-mono text-xs">{campaign.programmeUid}</dd>
              </div>
            )}
            {campaign.triggerEventType && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Trigger event</dt>
                <dd className="mt-1">{campaign.triggerEventType}</dd>
              </div>
            )}
            {campaign.offerConfig?.awardType && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Reward</dt>
                <dd className="mt-1">{formatOfferSummary(campaignToFormState(campaign))}</dd>
              </div>
            )}
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Eligibility</dt>
              <dd className="mt-1">{formatTargetingSummary(campaignToFormState(campaign))}</dd>
            </div>
            {campaign.validFrom && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Valid from</dt>
                <dd className="mt-1">{new Date(campaign.validFrom).toLocaleDateString()}</dd>
              </div>
            )}
            {campaign.validUntil && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Valid until</dt>
                <dd className="mt-1">{new Date(campaign.validUntil).toLocaleDateString()}</dd>
              </div>
            )}
          </dl>
        </MerchantPanelCard>
      )}

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MerchantStatCard
          label="Participations"
          value={stats.totalParticipations.toLocaleString()}
          icon={Users}
          accent="sky"
        />
        <MerchantStatCard
          label="Unique customers"
          value={stats.uniqueCustomersReached.toLocaleString()}
          icon={Users}
          accent="emerald"
        />
        <MerchantStatCard
          label="Points issued"
          value={Number(stats.totalPointsIssued ?? 0).toLocaleString()}
          icon={Clock}
          accent="violet"
        />
        <MerchantStatCard
          label="Cashback recorded"
          value={`₹${Number(stats.totalCashbackRecorded ?? 0).toLocaleString()}`}
          icon={DollarSign}
          accent="amber"
        />
      </div>

      {/* Budget progress */}
      <MerchantPanelCard title="Budget progress">
        <CampaignBudgetProgress consumedPct={Number(stats.budgetConsumedPct ?? 0)} className="max-w-md" />
        <div className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
          <div className="rounded-xl bg-muted/25 px-4 py-3 ring-1 ring-border/40">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Allocated</p>
            <p className="mt-1 font-semibold tabular-nums">{Number(stats.budgetTotal ?? 0).toLocaleString()}</p>
          </div>
          <div className="rounded-xl bg-muted/25 px-4 py-3 ring-1 ring-border/40">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Consumed</p>
            <p className="mt-1 font-semibold tabular-nums">{Number(stats.budgetConsumed ?? 0).toLocaleString()}</p>
          </div>
          <div className="rounded-xl bg-muted/25 px-4 py-3 ring-1 ring-border/40">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Remaining</p>
            <p
              className={cn(
                "mt-1 font-semibold tabular-nums",
                Number(stats.budgetRemaining ?? 0) <= 0 && "text-destructive"
              )}
            >
              {Number(stats.budgetRemaining ?? 0).toLocaleString()}
            </p>
          </div>
        </div>
      </MerchantPanelCard>

      {/* Performance insights */}
      <MerchantPanelCard title="Performance insights">
        <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl bg-muted/25 px-4 py-3 ring-1 ring-border/40">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Avg pts / participation</p>
            <p className="mt-1 font-semibold tabular-nums">
              {Number(stats.avgPointsPerParticipation ?? 0).toFixed(1)}
            </p>
          </div>
          <div className="rounded-xl bg-muted/25 px-4 py-3 ring-1 ring-border/40">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Avg cashback / participation</p>
            <p className="mt-1 font-semibold tabular-nums">
              ₹{Number(stats.avgCashbackPerParticipation ?? 0).toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl bg-muted/25 px-4 py-3 ring-1 ring-border/40">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Avg participations / customer</p>
            <p className="mt-1 font-semibold tabular-nums">
              {Number(stats.avgParticipationsPerCustomer ?? 0).toFixed(2)}
            </p>
          </div>
          {stats.audienceReachPct != null && (
            <div className="rounded-xl bg-muted/25 px-4 py-3 ring-1 ring-border/40">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Audience reach</p>
              <p className="mt-1 font-semibold tabular-nums">{Number(stats.audienceReachPct).toFixed(1)}%</p>
            </div>
          )}
          {stats.participationCapPct != null && (
            <div className="rounded-xl bg-muted/25 px-4 py-3 ring-1 ring-border/40">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Participation cap used</p>
              <p className="mt-1 font-semibold tabular-nums">{Number(stats.participationCapPct).toFixed(1)}%</p>
            </div>
          )}
          {stats.rewardCostPerParticipation != null && (
            <div className="rounded-xl bg-muted/25 px-4 py-3 ring-1 ring-border/40">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Reward cost / participation</p>
              <p className="mt-1 font-semibold tabular-nums">₹{Number(stats.rewardCostPerParticipation).toFixed(2)}</p>
            </div>
          )}
        </div>
      </MerchantPanelCard>

      {/* Participations table – always shown */}
      <MerchantPanelCard title="Recent participations">
        {participations.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No participations yet for this campaign.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/50">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-right">Points</th>
                  <th className="px-4 py-3 text-right">Cashback</th>
                  <th className="px-4 py-3 text-left">When</th>
                </tr>
              </thead>
              <tbody>
                {participations.map((p) => (
                  <tr key={`${p.eventId}-${p.customerId}`} className="border-t border-border/40">
                    <td className="px-4 py-3 font-mono text-xs">{p.customerId}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{p.pointsAwarded ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {p.cashbackAmount != null ? `₹${Number(p.cashbackAmount).toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {p.participatedAt ? new Date(p.participatedAt).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </MerchantPanelCard>
    </div>
  );
}
