"use client";

import { useRouter } from "next/navigation";

import { stepHref, useRuleCreateFlow } from "./rule-create-flow";
import { Button } from "@/components/ui/button";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { loadRuleDraft } from "@/lib/store/rule-draft-storage";

type Props = {
  backSlug: string;
  nextSlug?: string;
  nextLabel?: string;
  onNext?: () => void;
  nextDisabled?: boolean;
};

/** Shared back/next footer for rule wizard steps (actions, scheduling). */
export function RuleWizardStepNav({ backSlug, nextSlug, nextLabel, onNext, nextDisabled }: Props) {
  const router = useRouter();
  const { basePath } = useRuleCreateFlow();

  return (
    <div className="flex items-center justify-between gap-3 pt-2">
      <Button
        type="button"
        variant="outline"
        className="rounded-full"
        onClick={() => router.push(stepHref(basePath, backSlug))}
      >
        ← Back
      </Button>
      {nextSlug || onNext ? (
        <Button
          type="button"
          className="rounded-full"
          disabled={nextDisabled}
          onClick={onNext ?? (() => router.push(stepHref(basePath, nextSlug!)))}
        >
          {nextLabel ?? "Next →"}
        </Button>
      ) : null}
    </div>
  );
}

export function useRequireRuleDraft(basicInfoSlug = "basic-info") {
  const router = useRouter();
  const tenantId = useOnboardingStore((s) => s.tenantId) ?? "";
  const { basePath, draftScope } = useRuleCreateFlow();

  const ensureDraft = () => {
    const existing = loadRuleDraft(tenantId, draftScope);
    if (!existing?.name) {
      return false;
    }
    return true;
  };

  const redirectIfMissing = () => {
    if (!ensureDraft()) {
      router.push(stepHref(basePath, basicInfoSlug));
      return false;
    }
    return true;
  };

  return { tenantId, draftScope, ensureDraft, redirectIfMissing };
}
