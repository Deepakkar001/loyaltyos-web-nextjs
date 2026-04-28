"use client";

import { AnimatePresence, motion } from "framer-motion";
import { StepNavigator } from "./StepNavigator";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { WIZARD_STEPS, WizardStep } from "@/types/onboarding";
import { cn } from "@/lib/utils";
import styles from "./OnboardingShell.module.css";

interface OnboardingShellProps {
  children: React.ReactNode;
  stepKey: WizardStep;
  onStepClick?: (step: WizardStep) => void;
}

export function OnboardingShell({ children, stepKey, onStepClick }: OnboardingShellProps) {
  const { currentStep, displayStep, onboardingStatus } = useOnboardingStore();

  const effectiveStep = displayStep ?? currentStep;

  const completedSteps = WIZARD_STEPS.filter(
    (_, i) => i < WIZARD_STEPS.findIndex((s) => s.id === currentStep)
  ).map((s) => s.id);

  const currentIndex = WIZARD_STEPS.findIndex((s) => s.id === effectiveStep);
  const progressPct = Math.round(
    (currentIndex / (WIZARD_STEPS.length - 1)) * 100
  );

  return (
    <div className="flex min-h-screen">
      <StepNavigator
        currentStep={effectiveStep}
        completedSteps={completedSteps}
        onStepClick={onStepClick}
      />

      <main
        className={cn(
          styles.mainSurface,
          "ml-[320px] flex min-h-screen flex-1 flex-col bg-background text-foreground"
        )}
      >
        <div className="h-1 bg-surface-200">
          <motion.div
            className="h-full bg-brand-500"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>

        <div className="flex items-center justify-between px-12 py-4 border-b border-surface-200 bg-white">
          <span className="text-sm text-slate-500">
            Step{" "}
            <span className="font-semibold text-slate-900">
              {currentIndex + 1}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-900">
              {WIZARD_STEPS.length}
            </span>
          </span>
          {onboardingStatus && (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
              {onboardingStatus.replace(/_/g, " ")}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto bg-background">
          <AnimatePresence mode="wait">
            <motion.div
              key={stepKey}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="max-w-2xl mx-auto px-12 py-12"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
