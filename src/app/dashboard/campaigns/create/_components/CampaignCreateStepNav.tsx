"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { useCampaignForm } from "@/components/campaigns/campaign-create-context";
import { Button } from "@/components/ui/button";
import { campaignsAdminApi } from "@/lib/api/client";
import {
  getCampaignCreateSteps,
  validateCampaignCreateStep,
  type CampaignCreateStepSlug,
} from "@/lib/campaigns/campaign-form";
import { persistCampaignDraft } from "@/lib/campaigns/persist-campaign-draft";

export function CampaignCreateStepNav({ stepSlug }: { stepSlug: CampaignCreateStepSlug }) {
  const router = useRouter();
  const { form, patch, eventSchemaDraft, portal } = useCampaignForm();
  const [saving, setSaving] = useState(false);
  const base =
    portal === "merchant" ? "/merchant/campaigns/create" : "/dashboard/campaigns/create";
  const backList = portal === "merchant" ? "/merchant/campaigns" : "/dashboard/campaigns";
  const isMerchant = portal === "merchant";

  const steps = getCampaignCreateSteps(portal);
  const stepIndex = steps.findIndex((s) => s.slug === stepSlug);
  const isFirst = stepIndex <= 0;
  const isReview = stepIndex === steps.length - 1;
  const nextStep = steps[stepIndex + 1];
  const prevStep = steps[stepIndex - 1];

  const onBack = () => {
    if (isFirst) {
      router.push(backList);
      return;
    }
    router.push(`${base}/${prevStep.slug}`);
  };

  const onNext = async () => {
    let targetCustomerCount: number | undefined;
    if (!isMerchant && stepSlug === "audience" && form.customerScope === "TARGETED" && form.draftCampaignUid) {
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
      portal,
    });
    if (err) {
      toast.error(err);
      return;
    }

    if (!isMerchant && (stepSlug === "basic-info" || stepSlug === "audience")) {
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

    if (nextStep) router.push(`${base}/${nextStep.slug}`);
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
