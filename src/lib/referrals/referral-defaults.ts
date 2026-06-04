import type { ReferralMilestoneRule, ReferralMilestoneTypeInfo, ReferralProgrammeConfig } from "@/lib/api/client";

export const DEFAULT_RULES = (): ReferralMilestoneRule[] => [
  {
    key: "signup",
    label: "Sign-up reward",
    description: "When referee links referral code",
    enabled: true,
    trigger: "LINK",
    criteria: {},
  },
  {
    key: "first_purchase",
    label: "First purchase",
    description: "When referee makes first purchase",
    enabled: true,
    trigger: "PURCHASE",
    criteria: { minPurchaseCount: 1, firstPurchaseOnly: true },
  },
];

export const DEFAULT_CONFIG = (): ReferralProgrammeConfig => ({
  milestoneRules: DEFAULT_RULES(),
  stages: [
    { stage: 1, type: "signup", referrerPoints: 100, refereePoints: 50 },
    { stage: 2, type: "first_purchase", referrerPoints: 200, refereePoints: 0 },
  ],
  eligibility: {
    refereeMustBeNewCustomer: true,
    referrerMustHaveLedgerActivity: false,
  },
  capRules: [{ type: "LIFETIME_REFERRALS", maxCount: 50 }],
  fraudPolicy: {
    blockSelfReferralByCustomerId: true,
    maxReferralsPer24Hours: 20,
    matchPhoneWhenProvided: true,
    matchEmailWhenProvided: true,
    matchDeviceWhenProvided: true,
  },
});

export function rulesToDisplay(rules: ReferralMilestoneRule[]): ReferralMilestoneTypeInfo[] {
  return rules.map((r) => ({
    value: r.key,
    label: r.label,
    description: r.description,
    trigger: r.trigger,
    custom: true,
    enabled: r.enabled !== false,
  }));
}
