import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MerchantOnboardingStage } from "@/types/merchant";

const FLOW: MerchantOnboardingStage[] = [
  "REGISTRATION",
  "AGREEMENT",
  "CONFIGURATION",
  "INTEGRATION",
  "ACTIVE",
];

const STEP_LABELS: Record<MerchantOnboardingStage, string> = {
  REGISTRATION: "Register",
  AGREEMENT: "Agreement",
  CONFIGURATION: "Configure",
  INTEGRATION: "Integrate",
  ACTIVE: "Live",
  SUSPENDED: "Suspended",
};

function stageIndex(stage: MerchantOnboardingStage): number {
  if (stage === "SUSPENDED") return FLOW.indexOf("ACTIVE");
  return FLOW.indexOf(stage);
}

export function MerchantOnboardingStepper({ stage }: { stage: MerchantOnboardingStage }) {
  const current = stageIndex(stage);
  const suspended = stage === "SUSPENDED";

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-1">
        {FLOW.map((step, i) => {
          const done = !suspended && i < current;
          const active = !suspended && i === current;
          return (
            <div key={step} className="flex flex-1 items-center min-w-0">
              <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                    done && "border-emerald-500 bg-emerald-500 text-white",
                    active && "border-primary bg-primary text-primary-foreground",
                    !done && !active && "border-border bg-muted text-muted-foreground",
                    suspended && i === FLOW.length - 1 && "border-rose-400 bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200"
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span
                  className={cn(
                    "text-[10px] sm:text-xs font-medium text-center truncate w-full px-0.5",
                    active ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {STEP_LABELS[step]}
                </span>
              </div>
              {i < FLOW.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-1 mb-5 rounded-full",
                    done ? "bg-emerald-500" : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
      {suspended && (
        <p className="mt-2 text-xs text-rose-600 dark:text-rose-400 text-center">
          This merchant is currently suspended.
        </p>
      )}
    </div>
  );
}
