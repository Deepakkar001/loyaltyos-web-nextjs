"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";

import { MerchantDetailPanel } from "@/components/dashboard/merchants/MerchantDetailPanel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { merchantApi } from "@/lib/api/merchant";
import type { CampaignResponse } from "@/types/campaigns";
import type {
  MerchantActivateResponse,
  MerchantApiKeyResponse,
  MerchantOnboardingAudit,
  MerchantOpsSummary,
  MerchantResponse,
  MerchantSettlementCycle,
} from "@/types/merchant";

export function MerchantDetailView() {
  const params = useParams();
  const router = useRouter();
  const merchantUid = typeof params.merchantUid === "string" ? params.merchantUid : "";

  const [merchant, setMerchant] = useState<MerchantResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activateResult, setActivateResult] = useState<MerchantActivateResponse | null>(null);
  const [pendingCampaigns, setPendingCampaigns] = useState<CampaignResponse[]>([]);
  const [auditTrail, setAuditTrail] = useState<MerchantOnboardingAudit[]>([]);
  const [apiKeys, setApiKeys] = useState<MerchantApiKeyResponse[]>([]);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [opsSummary, setOpsSummary] = useState<MerchantOpsSummary | null>(null);
  const [merchantCampaigns, setMerchantCampaigns] = useState<CampaignResponse[]>([]);
  const [settlements, setSettlements] = useState<MerchantSettlementCycle[]>([]);

  const load = useCallback(async () => {
    if (!merchantUid) {
      router.replace("/dashboard/configure/merchants");
      return;
    }
    setLoading(true);
    try {
      const [m, pending, audit, keys, ops, campaigns, settlementRows] = await Promise.all([
        merchantApi.get(merchantUid),
        merchantApi.listPendingCampaignApprovals().catch(() => []),
        merchantApi.audit(merchantUid).catch(() => []),
        merchantApi.listApiKeys(merchantUid).catch(() => []),
        merchantApi.opsSummary(merchantUid).catch(() => null),
        merchantApi.listMerchantCampaigns(merchantUid).catch(() => []),
        merchantApi.listSettlements(merchantUid).catch(() => []),
      ]);
      setMerchant(m);
      setPendingCampaigns(pending.filter((c) => c.merchantId === merchantUid));
      setAuditTrail(audit);
      setApiKeys(keys);
      setOpsSummary(ops);
      setMerchantCampaigns(campaigns);
      setSettlements(settlementRows);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load merchant");
      router.replace("/dashboard/configure/merchants");
    } finally {
      setLoading(false);
    }
  }, [merchantUid, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runStep(
    action: () => Promise<MerchantResponse | MerchantActivateResponse>,
    label: string
  ) {
    setActionLoading(true);
    try {
      const result = await action();
      if ("inviteEmailSent" in result || "portalUsername" in result) {
        setActivateResult(result as MerchantActivateResponse);
      }
      toast.success(label);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  }

  if (!merchantUid || loading || !merchant) {
    return (
      <Card className="p-16 border-border/70 bg-[var(--surface-card)] flex justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/dashboard/configure/merchants"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to merchants
          </Link>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">{merchant.legalName}</h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">{merchant.merchantUid}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full shrink-0"
          onClick={() => void load()}
        >
          Refresh
        </Button>
      </div>

      <MerchantDetailPanel
        layout="page"
        merchant={merchant}
        activateResult={activateResult}
        pendingCampaigns={pendingCampaigns}
        merchantCampaigns={merchantCampaigns}
        opsSummary={opsSummary}
        settlements={settlements}
        onApproveCampaign={async (campaignUid) => {
          await merchantApi.approveCampaign(campaignUid);
          toast.success("Campaign approved");
          await load();
        }}
        onRejectCampaign={async (campaignUid) => {
          await merchantApi.rejectCampaign(campaignUid);
          toast.success("Campaign rejected");
          await load();
        }}
        onGenerateSettlement={async () => {
          await merchantApi.generateSettlement(merchantUid);
          toast.success("Settlement statement generated");
          setSettlements(await merchantApi.listSettlements(merchantUid));
        }}
        onFinalizeSettlement={async (cycleUid) => {
          await merchantApi.finalizeSettlement(merchantUid, cycleUid);
          toast.success("Settlement finalized");
          setSettlements(await merchantApi.listSettlements(merchantUid));
        }}
        auditTrail={auditTrail}
        apiKeys={apiKeys}
        newApiKey={newApiKey}
        onNewApiKey={setNewApiKey}
        onApiKeysChange={setApiKeys}
        onRunStep={runStep}
        actionLoading={actionLoading}
      />
    </div>
  );
}
