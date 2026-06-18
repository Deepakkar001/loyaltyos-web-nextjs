import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MerchantOnboardingStage } from "@/types/merchant";

const STAGE_STYLES: Record<MerchantOnboardingStage, string> = {
  REGISTRATION: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  AGREEMENT: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  CONFIGURATION: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
  INTEGRATION: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  ACTIVE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  SUSPENDED: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
};

const STAGE_LABELS: Record<MerchantOnboardingStage, string> = {
  REGISTRATION: "Registration",
  AGREEMENT: "Agreement",
  CONFIGURATION: "Configuration",
  INTEGRATION: "Integration",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
};

export function MerchantStageBadge({
  stage,
  className,
}: {
  stage: MerchantOnboardingStage;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent font-medium", STAGE_STYLES[stage], className)}
    >
      {STAGE_LABELS[stage]}
    </Badge>
  );
}
