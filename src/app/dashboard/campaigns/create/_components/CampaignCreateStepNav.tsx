"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { useCampaignForm } from "@/components/campaigns/campaign-create-context";
import { Button } from "@/components/ui/button";
import { campaignsAdminApi } from "@/lib/api/client";
import {
  CAMPAIGN_CREATE_STEPS,
  validateCampaignCreateStep,
} from "@/lib/campaigns/campaign-form";
import { persistCampaignDraft } from "@/lib/campaigns/persist-campaign-draft";

const BASE = "/dashboard/campaigns/create";

export function CampaignCreateStepNav({ stepIndex }: { stepIndex: number }) {
  const router = useRouter();
  const { form, patch, eventSchemaDraft } = useCampaignForm();
  const [saving, setSaving] = useState(false);

  const isFirst = stepIndex === 0;
  const isReview = stepIndex === CAMPAIGN_CREATE_STEPS.length - 1;
  const nextStep = CAMPAIGN_CREATE_STEPS[stepIndex + 1];
  const prevStep = CAMPAIGN_CREATE_STEPS[stepIndex - 1];

  const onBack = () => {
    if (isFirst) {
      router.push("/dashboard/campaigns");
      return;
    }
    router.push(`${BASE}/${prevStep.slug}`);
  };

  const onNext = async () => {
    let targetCustomerCount: number | undefined;
    if (stepIndex === 1 && form.customerScope === "TARGETED" && form.draftCampaignUid) {
      try {
        const c = await campaignsAdminApi.getCampaign(form.draftCampaignUid);
        targetCustomerCount = c.customerCount ?? 0;
      } catch {
        targetCustomerCount = 0;
      }
    }

    const err = validateCampaignCreateStep(stepIndex, form, {
      eventSchemaDraft,
      targetCustomerCount,
    });
    if (err) {
      toast.error(err);
      return;
    }

    if (stepIndex === 0 || stepIndex === 1) {
      setSaving(true);
      try {
        const result = await persistCampaignDraft(form, form.draftCampaignUid);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        patch(result.formPatch);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Failed to save campaign draft");
        return;
      } finally {
        setSaving(false);
      }
    }

    if (nextStep) router.push(`${BASE}/${nextStep.slug}`);
  };

  if (isReview) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <Button type="button" variant="outline" className="rounded-full" onClick={onBack}>
          ← Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
      <Button type="button" variant="outline" className="rounded-full" onClick={onBack}>
        {isFirst ? "Cancel" : "← Back"}
      </Button>
      <Button type="button" className="rounded-full" disabled={saving} onClick={() => void onNext()}>
        {saving ? "Saving…" : `Next: ${nextStep?.label ?? "Review"} →`}
      </Button>
    </div>
  );
}
