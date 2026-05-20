"use client";

import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { useCampaignForm } from "@/components/campaigns/campaign-create-context";
import { Button } from "@/components/ui/button";
import {
  CAMPAIGN_CREATE_STEPS,
  validateCampaignCreateStep,
} from "@/lib/campaigns/campaign-form";

const BASE = "/dashboard/campaigns/create";

export function CampaignCreateStepNav({ stepIndex }: { stepIndex: number }) {
  const router = useRouter();
  const { form, eventSchemaDraft } = useCampaignForm();

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

  const onNext = () => {
    const err = validateCampaignCreateStep(stepIndex, form, eventSchemaDraft);
    if (err) {
      toast.error(err);
      return;
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
      <Button type="button" className="rounded-full" onClick={onNext}>
        Next: {nextStep?.label ?? "Review"} →
      </Button>
    </div>
  );
}
