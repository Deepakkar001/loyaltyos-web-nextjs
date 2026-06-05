"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CampaignStatusBadge } from "@/components/campaigns/CampaignStatusBadge";
import { CampaignTargetAudiencePanel } from "@/components/campaigns/CampaignTargetAudiencePanel";
import { campaignsAdminApi } from "@/lib/api/client";
import { canEditCampaign } from "@/lib/campaigns/campaign-editability";
import { formatCustomerScopeLabel } from "@/lib/campaigns/campaign-form";
import { formatTriggerEventTypesLabel } from "@/lib/campaigns/trigger-event-types";
import type {
  CampaignParticipationResponse,
  CampaignResponse,
  CampaignSetupStatusResponse,
  CampaignStatsResponse,
} from "@/types/campaigns";

export default function CampaignDetailPage() {
  const params = useParams<{ campaignUid: string }>();
  const campaignUid = decodeURIComponent(params.campaignUid);

  const [campaign, setCampaign] = useState<CampaignResponse | null>(null);
  const [stats, setStats] = useState<CampaignStatsResponse | null>(null);
  const [participations, setParticipations] = useState<CampaignParticipationResponse[]>([]);
  const [setupStatus, setSetupStatus] = useState<CampaignSetupStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [c, s, p, setup] = await Promise.all([
        campaignsAdminApi.getCampaign(campaignUid),
        campaignsAdminApi.getStats(campaignUid),
        campaignsAdminApi.listParticipations(campaignUid, 25),
        campaignsAdminApi.getCampaignSetupStatus(campaignUid),
      ]);
      setCampaign(c);
      setStats(s);
      setParticipations(p);
      setSetupStatus(setup);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load campaign");
    } finally {
      setLoading(false);
    }
  }, [campaignUid]);

  useEffect(() => {
    reload();
  }, [reload]);

  /** Keep count in sync after upload/remove without re-running full page reload (avoids render loop). */
  const handleTargetCustomerCountChange = useCallback((count: number) => {
    setCampaign((prev) => (prev ? { ...prev, customerCount: count } : prev));
  }, []);

  const runAction = async (action: "activate" | "pause" | "end") => {
    try {
      if (action === "activate") await campaignsAdminApi.activateCampaign(campaignUid);
      if (action === "pause") await campaignsAdminApi.pauseCampaign(campaignUid);
      if (action === "end") await campaignsAdminApi.endCampaign(campaignUid);
      toast.success(`Campaign ${action}d`);
      await reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : `Failed to ${action}`);
    }
  };

  if (loading || !campaign || !stats) {
    return (
      <Card className="p-8 border-border/70 bg-[var(--surface-card)]">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </Card>
    );
  }

  const targetedBlocked =
    campaign.customerScope === "TARGETED" && (campaign.customerCount ?? 0) <= 0;
  const ruleGated = (campaign.executionMode ?? "RULE_GATED") === "RULE_GATED";
  const showActivateButton = campaign.status === "DRAFT" || campaign.status === "PAUSED";
  const activateEnabled =
    showActivateButton &&
    !targetedBlocked &&
    (!ruleGated || setupStatus?.canActivateCampaign === true);
  const activateBlockedReason =
    setupStatus?.activateBlockReason ??
    (targetedBlocked ? "Upload a customer list before activating a targeted campaign" : undefined);
  const canEdit = canEditCampaign(campaign.status);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/campaigns" className="text-sm text-muted-foreground hover:underline">
          ← Back to campaigns
        </Link>
        <div className="flex items-start justify-between gap-4 mt-2">
          <div>
            <div className="flex items-center gap-3">
              <CampaignStatusBadge status={campaign.status} />
              <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {campaign.programmeUid} · {formatTriggerEventTypesLabel(campaign.triggerEventType)} ·{" "}
              {formatCustomerScopeLabel(campaign.customerScope, campaign.customerCount)} ·{" "}
              {campaign.campaignUid}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {canEdit && (
              <Link href={`/dashboard/campaigns/${encodeURIComponent(campaignUid)}/edit`}>
                <Button variant="outline" className="rounded-full">
                  Edit
                </Button>
              </Link>
            )}
            {showActivateButton && (
              <Button
                className="rounded-full"
                disabled={!activateEnabled}
                title={!activateEnabled ? activateBlockedReason : undefined}
                onClick={() => runAction("activate")}
              >
                Activate
              </Button>
            )}
            {campaign.status === "ACTIVE" && (
              <Button variant="outline" className="rounded-full" onClick={() => runAction("pause")}>
                Pause
              </Button>
            )}
            {campaign.status !== "ENDED" &&
              campaign.status !== "EXHAUSTED" &&
              campaign.status !== "EXPIRED" && (
              <Button variant="destructive" className="rounded-full" onClick={() => runAction("end")}>
                End
              </Button>
            )}
          </div>
        </div>
      </div>

      {ruleGated && setupStatus ? (
        <Card className="p-5 border-border/70 bg-[var(--surface-card)] space-y-3">
          <p className="text-sm font-semibold">Setup checklist</p>
          <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
            <li className={setupStatus.campaignSaved ? "text-foreground" : ""}>
              Campaign saved ({campaign.status})
            </li>
            <li className={setupStatus.campaignRuleCreated ? "text-foreground" : ""}>
              CAMPAIGN earn rule{" "}
              {setupStatus.campaignRuleCreated && setupStatus.campaignRuleUid ? (
                <Link
                  href={`/dashboard/loyalty-rules/my-rules/${encodeURIComponent(setupStatus.campaignRuleUid)}/details?programmeUid=${encodeURIComponent(campaign.programmeUid)}`}
                  className="text-brand-600 hover:underline font-medium"
                >
                  created
                </Link>
              ) : (
                <>
                  not created —{" "}
                  <Link
                    href={`/dashboard/campaign-rules/create/campaign?campaignUid=${encodeURIComponent(campaignUid)}&fromCampaignWizard=1`}
                    className="text-brand-600 hover:underline font-medium"
                  >
                    create rule
                  </Link>
                </>
              )}
            </li>
            <li className={setupStatus.sandboxPassed ? "text-foreground" : ""}>
              Sandbox passed
              {setupStatus.campaignRuleUid && !setupStatus.sandboxPassed ? (
                <>
                  {" "}
                  —{" "}
                  <Link
                    href={`/dashboard/loyalty-rules/my-rules/${encodeURIComponent(setupStatus.campaignRuleUid)}/simulate?programmeUid=${encodeURIComponent(campaign.programmeUid)}`}
                    className="text-brand-600 hover:underline font-medium"
                  >
                    run test
                  </Link>
                </>
              ) : null}
            </li>
            <li className={setupStatus.campaignRuleActive ? "text-foreground" : ""}>Rule ACTIVE</li>
            <li className={campaign.status === "ACTIVE" ? "text-foreground" : ""}>Campaign ACTIVE</li>
          </ol>
          {setupStatus.activateBlockReason && campaign.status === "DRAFT" ? (
            <p className="text-xs text-amber-600">{setupStatus.activateBlockReason}</p>
          ) : null}
        </Card>
      ) : null}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 border-border/70 bg-[var(--surface-card)]">
          <p className="text-xs text-muted-foreground">Points issued</p>
          <p className="text-lg font-semibold mt-1">{stats.totalPointsIssued}</p>
        </Card>
        <Card className="p-4 border-border/70 bg-[var(--surface-card)]">
          <p className="text-xs text-muted-foreground">Cashback recorded</p>
          <p className="text-lg font-semibold mt-1">{stats.totalCashbackRecorded}</p>
        </Card>
        <Card className="p-4 border-border/70 bg-[var(--surface-card)]">
          <p className="text-xs text-muted-foreground">Participations</p>
          <p className="text-lg font-semibold mt-1">{stats.totalParticipations}</p>
        </Card>
        <Card className="p-4 border-border/70 bg-[var(--surface-card)]">
          <p className="text-xs text-muted-foreground">Budget used</p>
          <p className="text-lg font-semibold mt-1">{stats.budgetConsumedPct}%</p>
        </Card>
      </div>

      <Card className="p-5 border-border/70 bg-[var(--surface-card)] space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Target audience</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {formatCustomerScopeLabel(campaign.customerScope, campaign.customerCount)}
          </p>
        </div>
        {campaign.customerScope === "TARGETED" && canEdit ? (
          <CampaignTargetAudiencePanel
            campaignUid={campaignUid}
            customerCount={campaign.customerCount ?? 0}
            onCustomerCountChange={handleTargetCustomerCountChange}
          />
        ) : campaign.customerScope === "TARGETED" ? (
          <p className="text-sm text-muted-foreground">
            {(campaign.customerCount ?? 0) > 0
              ? `${campaign.customerCount} customers in the target list.`
              : "No customers in the target list."}
          </p>
        ) : null}
      </Card>

      <Card className="p-5 border-border/70 bg-[var(--surface-card)]">
        <h2 className="text-sm font-semibold mb-3">Recent participations</h2>
        {participations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No participations yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border/50">
                  <th className="py-2 pr-4">Customer</th>
                  <th className="py-2 pr-4">Event</th>
                  <th className="py-2 pr-4">Points</th>
                  <th className="py-2">Cashback</th>
                </tr>
              </thead>
              <tbody>
                {participations.map((p) => (
                  <tr key={`${p.customerId}-${p.eventId}`} className="border-b border-border/30">
                    <td className="py-2 pr-4">{p.customerId}</td>
                    <td className="py-2 pr-4">{p.eventId}</td>
                    <td className="py-2 pr-4">{p.pointsAwarded ?? 0}</td>
                    <td className="py-2">{p.cashbackAmount ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
