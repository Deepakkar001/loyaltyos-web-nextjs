"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { useCampaignForm } from "@/components/campaigns/campaign-create-context";
import { campaignsAdminApi } from "@/lib/api/client";
import { buildCampaignUpsertPayload } from "@/lib/campaigns/campaign-form";

export function useCampaignCreateSubmit() {
  const router = useRouter();
  const { form, clearDraft } = useCampaignForm();
  const [saving, setSaving] = useState<"draft" | "activate" | null>(null);

  const submit = async (action: "draft" | "activate") => {
    const built = buildCampaignUpsertPayload(form, {});
    if (!built.ok) {
      toast.error(built.error);
      return;
    }

    setSaving(action);
    try {
      const created = await campaignsAdminApi.createCampaign(built.payload);
      if (action === "activate") {
        await campaignsAdminApi.activateCampaign(created.campaignUid);
        toast.success("Campaign created and activated");
      } else {
        toast.success("Campaign saved as draft");
      }
      clearDraft();
      router.push(`/dashboard/campaigns/${encodeURIComponent(created.campaignUid)}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save campaign");
    } finally {
      setSaving(null);
    }
  };

  return { submit, saving };
}
