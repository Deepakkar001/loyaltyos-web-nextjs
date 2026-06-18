import type { MerchantOnboardingStage } from "@/types/merchant";

export const MERCHANT_ONBOARDING_STEPS = [
  { slug: "register", label: "Registration", minStageIndex: 0 },
  { slug: "agreement", label: "Agreement", minStageIndex: 1 },
  { slug: "configuration", label: "Configuration", minStageIndex: 2 },
  { slug: "integration", label: "Integration", minStageIndex: 3 },
  { slug: "activate", label: "Go live", minStageIndex: 4 },
] as const;

const STAGE_ORDER: MerchantOnboardingStage[] = [
  "REGISTRATION",
  "AGREEMENT",
  "CONFIGURATION",
  "INTEGRATION",
  "ACTIVE",
];

export function merchantDetailHref(merchantUid: string): string {
  return `/dashboard/configure/merchants/${encodeURIComponent(merchantUid)}`;
}

export function merchantOnboardingBase(merchantUid: string): string {
  return `/dashboard/configure/merchants/onboard/${encodeURIComponent(merchantUid)}`;
}

export function merchantOnboardingStepHref(merchantUid: string, slug: string): string {
  return `${merchantOnboardingBase(merchantUid)}/${slug}`;
}

export function merchantStageIndex(stage: MerchantOnboardingStage): number {
  if (stage === "SUSPENDED") return STAGE_ORDER.indexOf("ACTIVE");
  if (stage === "ACTIVE") return STAGE_ORDER.length;
  return STAGE_ORDER.indexOf(stage);
}

export function merchantOnboardingSlugForStage(stage: MerchantOnboardingStage): string {
  switch (stage) {
    case "REGISTRATION":
      return "agreement";
    case "AGREEMENT":
      return "configuration";
    case "CONFIGURATION":
      return "integration";
    case "INTEGRATION":
      return "activate";
    case "ACTIVE":
    case "SUSPENDED":
      return "activate";
    default:
      return "register";
  }
}

export function merchantContinueHref(merchantUid: string, stage: MerchantOnboardingStage): string {
  return merchantOnboardingStepHref(merchantUid, merchantOnboardingSlugForStage(stage));
}
