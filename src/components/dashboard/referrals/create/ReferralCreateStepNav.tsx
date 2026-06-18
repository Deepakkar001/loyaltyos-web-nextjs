"use client";

import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import {
  REFERRAL_CREATE_BASE,
  REFERRAL_CREATE_STEPS,
  buildReferralCreateValidationContext,
  validateReferralCreateStep,
} from "@/lib/referrals/referral-create-steps";
import { useReferralProgramme } from "@/lib/referrals/use-referral-programme";

export function ReferralCreateStepNav({ stepIndex }: { stepIndex: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ctx = useReferralProgramme();
  const programmeQuery = searchParams.toString() ? `?${searchParams.toString()}` : "";

  const isFirst = stepIndex === 0;
  const isReview = stepIndex === REFERRAL_CREATE_STEPS.length - 1;
  const nextStep = REFERRAL_CREATE_STEPS[stepIndex + 1];
  const prevStep = REFERRAL_CREATE_STEPS[stepIndex - 1];

  const validationCtx = buildReferralCreateValidationContext({
    name: ctx.name,
    maxReferrals: ctx.maxReferrals,
    monthlyCap: ctx.monthlyCap,
    rollingCap: ctx.rollingCap,
    rollingWindowDays: ctx.rollingWindowDays,
    pointsBudget: ctx.pointsBudget,
    config: ctx.config,
    enabledRuleKeys: ctx.enabledRuleKeys,
  });

  const onBack = () => {
    if (isFirst) {
      router.push("/dashboard/referrals/my-referrals");
      return;
    }
    router.push(`${REFERRAL_CREATE_BASE}/${prevStep.slug}${programmeQuery}`);
  };

  const onNext = () => {
    const err = validateReferralCreateStep(stepIndex, validationCtx);
    if (err) {
      toast.error(err);
      return;
    }
    if (nextStep) {
      router.push(`${REFERRAL_CREATE_BASE}/${nextStep.slug}${programmeQuery}`);
    }
  };

  if (isReview) {
    return (
      <div className="flex flex-col-reverse gap-3 border-t border-border/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="outline" className="rounded-full" onClick={onBack}>
          ← Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col-reverse gap-3 border-t border-border/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
      <Button type="button" variant="outline" className="rounded-full" onClick={onBack}>
        {isFirst ? "Cancel" : "← Back"}
      </Button>
      <p className="text-center text-xs text-muted-foreground sm:text-left">
        Step {stepIndex + 1} of {REFERRAL_CREATE_STEPS.length}
      </p>
      <Button type="button" className="rounded-full min-w-[140px]" onClick={onNext}>
        Next: {nextStep?.label ?? "Review"} →
      </Button>
    </div>
  );
}
