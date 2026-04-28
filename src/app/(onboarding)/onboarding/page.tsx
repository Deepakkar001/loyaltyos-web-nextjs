"use client";

import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { Step1Account } from "@/components/onboarding/steps/Step1Account";
import { Step2Identity } from "@/components/onboarding/steps/Step2Identity";
import { Step3Agreement } from "@/components/onboarding/steps/Step3Agreement";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ensureAuthSession, onboardingApi } from "@/lib/api/client";
import { WizardStep } from "@/types/onboarding";

const ONBOARDING_STEPS: WizardStep[] = ["account", "identity", "agreement"];

export default function OnboardingPage() {
  const {
    currentStep,
    displayStep,
    accessToken,
    syncStatusFromBackend,
    setDisplayStep,
  } = useOnboardingStore();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [allowResubmit, setAllowResubmit] = useState(false);
  const [refreshTried, setRefreshTried] = useState(false);

  useEffect(() => {
    const unsub = useOnboardingStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    if (useOnboardingStore.persist.hasHydrated()) setHydrated(true);
    return () => { unsub(); };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken && !refreshTried) {
      setRefreshTried(true);
      (async () => {
        try {
          await ensureAuthSession();
        } catch {
          // If refresh fails, keep onboarding accessible but user may need to login.
        }
      })();
      return;
    }
    if (!accessToken) return;
    let mounted = true;

    (async () => {
      try {
        const s = await onboardingApi.getMyStatus();
        if (!mounted) return;
        syncStatusFromBackend(s.onboardingStatus);

        if (s.latestAgreementStatus === "REJECTED") {
          setAllowResubmit(true);
        } else if (s.latestAgreementStatus) {
          router.replace("/dashboard");
        }
      } catch {
        // If status fails, keep onboarding accessible.
      }
    })();
    return () => { mounted = false; };
  }, [hydrated, accessToken, router, syncStatusFromBackend, refreshTried]);

  useEffect(() => {
    if (
      currentStep === "programme" ||
      currentStep === "integration" ||
      currentStep === "complete"
    ) {
      router.replace("/dashboard");
    }
  }, [currentStep, router]);

  const goToStep = useCallback(
    (step: WizardStep) => {
      const currentIdx = ONBOARDING_STEPS.indexOf(currentStep);
      const targetIdx = ONBOARDING_STEPS.indexOf(step);
      if (targetIdx >= 0 && targetIdx <= currentIdx) {
        setDisplayStep(step);
      }
    },
    [currentStep, setDisplayStep]
  );

  const goBack = useCallback(
    (fromStep: WizardStep) => {
      const idx = ONBOARDING_STEPS.indexOf(fromStep);
      if (idx > 0) {
        setDisplayStep(ONBOARDING_STEPS[idx - 1]);
      }
    },
    [setDisplayStep]
  );

  const goForward = useCallback(() => {
    const currentDisplay = displayStep ?? currentStep;
    const displayIdx = ONBOARDING_STEPS.indexOf(currentDisplay);
    const backendIdx = ONBOARDING_STEPS.indexOf(currentStep);
    const nextIdx = displayIdx + 1;

    if (nextIdx >= ONBOARDING_STEPS.length || nextIdx >= backendIdx) {
      setDisplayStep(null);
    } else {
      setDisplayStep(ONBOARDING_STEPS[nextIdx]);
    }
  }, [displayStep, currentStep, setDisplayStep]);

  const resolvedStep = allowResubmit
    ? (displayStep ?? "agreement")
    : displayStep ?? currentStep;

  const safeStep = ONBOARDING_STEPS.includes(resolvedStep) ? resolvedStep : "account";

  const isEditMode = (step: WizardStep) => {
    const backendIdx = ONBOARDING_STEPS.indexOf(currentStep);
    const stepIdx = ONBOARDING_STEPS.indexOf(step);
    return stepIdx < backendIdx;
  };

  const steps: Record<string, React.ReactNode> = {
    account: (
      <Step1Account
        editMode={isEditMode("account")}
        onContinue={goForward}
      />
    ),
    identity: (
      <Step2Identity
        onBack={() => goBack("identity")}
        onContinue={goForward}
        editMode={isEditMode("identity")}
      />
    ),
    agreement: (
      <Step3Agreement
        onBack={() => goBack("agreement")}
      />
    ),
  };

  return (
    <OnboardingShell
      stepKey={safeStep}
      onStepClick={goToStep}
    >
      {steps[safeStep]}
    </OnboardingShell>
  );
}
