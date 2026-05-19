"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useState } from "react";

import {
  CampaignBasicInfoSection,
  CampaignBudgetSection,
} from "@/components/campaigns/CampaignFormSections";
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
  campaignUid?: string;
  initialCampaign?: CampaignResponse;
  cancelHref: string;
  onCreated?: (c: CampaignResponse) => void;
};

function CampaignEditFormBody({ cancelHref }: { cancelHref: string }) {
  const router = useRouter();
  const {
    form,
    editProgrammeUid,
    preserveOfferConfig,
    preserveTargetSegment,
    campaignUid,
  } = useCampaignForm();
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const built = buildCampaignUpsertPayload(form, {
      programmeUid: editProgrammeUid,
      preserveOfferConfig,
      preserveTargetSegment,
    });
    if (!built.ok) {
      toast.error(built.error);
      return;
    }
    if (!campaignUid) {
      toast.error("Missing campaign UID");
      return;
    }

    setSaving(true);
    try {
      await campaignsAdminApi.updateCampaign(campaignUid, built.payload);
      toast.success("Campaign updated");
      router.push(`/dashboard/campaigns/${encodeURIComponent(campaignUid)}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save campaign");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <CampaignBasicInfoSection />
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
    <CampaignFormProvider mode={mode} campaignUid={campaignUid} initialCampaign={initialCampaign}>
      <CampaignEditFormBody cancelHref={cancelHref} />
    </CampaignFormProvider>
  );
}
