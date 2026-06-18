import type { ReferralPointsBudget, ReferralProgrammeConfig } from "@/lib/api/client";

export type ReferralCreateStepSlug =
  | "basics"
  | "milestone-rules"
  | "rewards"
  | "policies"
  | "review";

export const REFERRAL_CREATE_BASE = "/dashboard/referrals/create";

export const REFERRAL_CREATE_STEPS: Array<{
  slug: ReferralCreateStepSlug;
  label: string;
  subtitle: string;
  stepTitle: string;
}> = [
  {
    slug: "basics",
    label: "Programme & caps",
    subtitle: "Name, volume limits, points budget",
    stepTitle: "Programme & caps",
  },
  {
    slug: "milestone-rules",
    label: "Milestone rules",
    subtitle: "When each rule runs",
    stepTitle: "Milestone rules",
  },
  {
    slug: "rewards",
    label: "Reward stages",
    subtitle: "Points per milestone",
    stepTitle: "Reward stages",
  },
  {
    slug: "policies",
    label: "Eligibility & fraud",
    subtitle: "Who qualifies and fraud checks",
    stepTitle: "Eligibility & fraud",
  },
  {
    slug: "review",
    label: "Review & save",
    subtitle: "Confirm and publish",
    stepTitle: "Review & save",
  },
];

export type ReferralCreateValidationContext = {
  name: string;
  maxReferrals: number;
  monthlyCap: number | "";
  rollingCap: number | "";
  rollingWindowDays: number | "";
  pointsBudget: ReferralPointsBudget | null;
  config: ReferralProgrammeConfig;
  enabledRuleKeys: string[];
};

export function referralCreateStepIndexFromPath(pathname: string): number {
  const hit = REFERRAL_CREATE_STEPS.findIndex((s) =>
    pathname.includes(`${REFERRAL_CREATE_BASE}/${s.slug}`)
  );
  return hit >= 0 ? hit : 0;
}

export function validateReferralCreateStep(
  stepIndex: number,
  ctx: ReferralCreateValidationContext
): string | null {
  switch (stepIndex) {
    case 0: {
      if (!ctx.name.trim()) return "Referral programme display name is required";
      if (ctx.maxReferrals < 1) return "Lifetime max referrals must be at least 1";
      if (ctx.monthlyCap !== "" && Number(ctx.monthlyCap) <= 0) {
        return "Monthly cap must be greater than 0 when set";
      }
      if (ctx.rollingCap !== "" && Number(ctx.rollingCap) > 0) {
        const windowDays = ctx.rollingWindowDays === "" ? 0 : Number(ctx.rollingWindowDays);
        if (windowDays < 1) return "Rolling window must be at least 1 day when rolling cap is set";
      }
      if (ctx.pointsBudget?.maxPoints != null && ctx.pointsBudget.maxPoints <= 0) {
        return "Points budget max must be greater than 0 when set";
      }
      if (
        ctx.pointsBudget?.period === "ROLLING_DAY" &&
        (!ctx.pointsBudget.windowDays || ctx.pointsBudget.windowDays < 1)
      ) {
        return "Points budget rolling window must be at least 1 day";
      }
      return null;
    }
    case 1: {
      const rules = (ctx.config.milestoneRules ?? []).filter((r) => r.enabled !== false);
      if (rules.length === 0) return "Enable at least one milestone rule";
      const keys = new Set<string>();
      for (const rule of rules) {
        const key = rule.key?.trim();
        if (!key) return "Each milestone rule requires a key";
        if (!rule.label?.trim()) return `Rule "${key}" requires a display name`;
        if (!rule.trigger) return `Rule "${key}" requires a trigger`;
        if (keys.has(key)) return `Duplicate milestone rule key: ${key}`;
        keys.add(key);
      }
      return null;
    }
    case 2: {
      const stages = ctx.config.stages ?? [];
      if (stages.length === 0) return "Add at least one reward stage";
      const stageNums = new Set<number>();
      for (const stage of stages) {
        if (!stage.type || !ctx.enabledRuleKeys.includes(stage.type)) {
          return `Stage ${stage.stage} must use an enabled milestone rule`;
        }
        if (stageNums.has(stage.stage)) return `Duplicate stage number: ${stage.stage}`;
        stageNums.add(stage.stage);
        const referrerPts = stage.referrerReward?.points ?? stage.referrerPoints ?? 0;
        const refereePts = stage.refereeReward?.points ?? stage.refereePoints ?? 0;
        if (referrerPts < 0 || refereePts < 0) return "Reward points cannot be negative";
      }
      return null;
    }
    case 3: {
      const velocity = ctx.config.fraudPolicy?.maxReferralsPer24Hours ?? 20;
      if (velocity < 1) return "Max referrals per 24 hours must be at least 1";
      return null;
    }
    case 4:
      return validateReferralCreateStep(0, ctx)
        ?? validateReferralCreateStep(1, ctx)
        ?? validateReferralCreateStep(2, ctx)
        ?? validateReferralCreateStep(3, ctx);
    default:
      return null;
  }
}

export function buildReferralCreateValidationContext(
  input: ReferralCreateValidationContext
): ReferralCreateValidationContext {
  return input;
}
