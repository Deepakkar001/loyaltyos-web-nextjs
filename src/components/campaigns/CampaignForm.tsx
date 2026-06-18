"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useState } from "react";

import { CampaignAudienceSection } from "@/components/campaigns/CampaignAudienceSection";
import {
  CampaignBasicInfoSection,
  CampaignBudgetSection,
} from "@/components/campaigns/CampaignFormSections";
import { CampaignMerchantTargetingSection } from "@/components/campaigns/CampaignMerchantTargetingSection";
import { CampaignOfferSection } from "@/components/campaigns/CampaignOfferSection";
import {
  CampaignFormProvider,
  useCampaignForm,
} from "@/components/campaigns/campaign-create-context";
import { buildCampaignUpsertPayload } from "@/lib/campaigns/campaign-form";
import { campaignsAdminApi } from "@/lib/api/client";
import type { CampaignResponse } from "@/types/campaigns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export type CampaignFormProps = {
  mode: "create" | "edit";
  portal?: "tenant" | "merchant";
  campaignUid?: string;
  initialCampaign?: CampaignResponse;
  cancelHref: string;
  onCreated?: (c: CampaignResponse) => void;
};

function CampaignEditFormBody({
  cancelHref,
  portal,
}: {
  cancelHref: string;
  portal: "tenant" | "merchant";
}) {
  const router = useRouter();
  const {
    form,
    campaignUid,
  } = useCampaignForm();
  const [saving, setSaving] = useState(false);
  const isMerchant = portal === "merchant";

  const submit = async () => {
    const built = buildCampaignUpsertPayload(form);
    if (!built.ok) {
      toast.error(built.error);
      return;
    }
    if (!campaignUid) {
      toast.error("Missing campaign UID");
      return;
    }

    if (!isMerchant && form.customerScope === "TARGETED") {
      try {
        const c = await campaignsAdminApi.getCampaign(campaignUid);
        if ((c.customerCount ?? 0) <= 0) {
          toast.error("Upload a customer CSV list for targeted campaigns.");
          return;
        }
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Could not verify customer list");
        return;
      }
    }

    setSaving(true);
    try {
      const payload = isMerchant
        ? { ...built.payload, campaignType: "MERCHANT_FUNDED" as const }
        : built.payload;
      if (isMerchant) {
        const { merchantUpdateCampaign } = await import("@/lib/api/merchant");
        await merchantUpdateCampaign(campaignUid, payload);
        toast.success("Campaign updated");
        router.push(`/merchant/campaigns/${encodeURIComponent(campaignUid)}`);
      } else {
        await campaignsAdminApi.updateCampaign(campaignUid, payload);
        toast.success("Campaign updated");
        router.push(`/dashboard/campaigns/${encodeURIComponent(campaignUid)}`);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save campaign");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <CampaignBasicInfoSection />
      {!isMerchant && (
        <Card className="p-6 border-border/70 bg-[var(--surface-card)]">
          <h2 className="text-sm font-semibold mb-4">Target audience</h2>
          <CampaignAudienceSection campaignUid={campaignUid} />
        </Card>
      )}
      <CampaignMerchantTargetingSection />
      <CampaignOfferSection />
      <CampaignBudgetSection />

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button type="button" className="rounded-full" disabled={saving} onClick={submit}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
        <Link href={cancelHref}>
          <Button type="button" variant="ghost" className="rounded-full" disabled={saving}>
            Cancel
          </Button>
        </Link>
      </div>
      </div>
  );
}

export function CampaignForm({
  mode,
  portal = "tenant",
  campaignUid,
  initialCampaign,
  cancelHref,
}: CampaignFormProps) {
  if (mode === "edit" && !initialCampaign) {
    return (
      <Card className="p-8 border-border/70 bg-[var(--surface-card)]">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </Card>
    );
  }

  return (
    <CampaignFormProvider
      mode={mode}
      portal={portal}
      campaignUid={campaignUid}
      initialCampaign={initialCampaign}
    >
      <CampaignEditFormBody cancelHref={cancelHref} portal={portal} />
    </CampaignFormProvider>
  );
}
