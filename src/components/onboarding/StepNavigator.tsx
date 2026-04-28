"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { WIZARD_STEPS, WizardStep } from "@/types/onboarding";

interface StepNavigatorProps {
  currentStep: WizardStep;
  completedSteps: WizardStep[];
  onStepClick?: (step: WizardStep) => void;
}

export function StepNavigator({
  currentStep,
  completedSteps,
  onStepClick,
}: StepNavigatorProps) {
  const currentIndex = WIZARD_STEPS.findIndex((s) => s.id === currentStep);

  return (
    <aside className="fixed left-0 top-0 h-full w-[320px] bg-brand-950 flex flex-col px-8 py-10 z-10">
      <div className="mb-12">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">L</span>
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">
            LoyaltyOS
          </span>
        </div>
        <p className="text-brand-300 text-sm mt-3 leading-relaxed">
          Launch your loyalty programme in hours, not months.
        </p>
      </div>

      <nav className="flex-1">
        <ul className="space-y-1">
          {WIZARD_STEPS.map((step, index) => {
            const isComplete = completedSteps.includes(step.id);
            const isActive = step.id === currentStep;
            const isPending = !isComplete && !isActive;
            const isClickable = isComplete && onStepClick;

            return (
              <li key={step.id}>
                <div
                  role={isClickable ? "button" : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                  onClick={() => isClickable && onStepClick(step.id)}
                  onKeyDown={(e) => {
                    if (isClickable && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      onStepClick(step.id);
                    }
                  }}
                  className={cn(
                    "flex items-start gap-4 px-4 py-3 rounded-xl transition-all duration-200",
                    isActive && "bg-white/10",
                    isComplete && "opacity-80 hover:opacity-100",
                    isPending && "opacity-40",
                    isClickable && "cursor-pointer hover:bg-white/5"
                  )}
                >
                  <div className="relative mt-0.5 flex-shrink-0">
                    {isComplete ? (
                      <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center"
                      >
                        <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                      </motion.div>
                    ) : isActive ? (
                      <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center ring-4 ring-brand-500/20">
                        <span className="text-white text-xs font-bold">
                          {index + 1}
                        </span>
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full border border-white/20 flex items-center justify-center">
                        <span className="text-white/50 text-xs">{index + 1}</span>
                      </div>
                    )}

                    {index < WIZARD_STEPS.length - 1 && (
                      <div
                        className={cn(
                          "absolute top-8 left-1/2 -translate-x-1/2 w-px h-6",
                          index < currentIndex ? "bg-emerald-500/50" : "bg-white/10"
                        )}
                      />
                    )}
                  </div>

                  <div className="min-w-0 pt-0.5">
                    <p
                      className={cn(
                        "text-sm font-medium leading-none",
                        isActive
                          ? "text-white"
                          : isComplete
                            ? "text-white/80"
                            : "text-white/40"
                      )}
                    >
                      {step.label}
                    </p>
                    <p
                      className={cn(
                        "text-xs mt-1 leading-relaxed",
                        isActive ? "text-brand-200" : "text-white/30"
                      )}
                    >
                      {step.description}
                    </p>
                    {isClickable && (
                      <p className="text-[10px] mt-1 text-emerald-400/70">
                        Click to review & edit
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-white/10 pt-6">
        <p className="text-white/30 text-xs leading-relaxed">
          Your progress is saved automatically. You can safely close this window
          and return anytime.
        </p>
      </div>
    </aside>
  );
}
