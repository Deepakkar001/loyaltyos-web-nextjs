"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { RuleDraftScope } from "@/lib/store/rule-draft-storage";

export type RuleCreateFlowKind = "programme" | "campaign";

export type RuleCreateStep = { slug: string; label: string };

type RuleCreateFlowConfig = {
  kind: RuleCreateFlowKind;
  draftScope: RuleDraftScope;
  basePath: string;
  cancelHref: string;
  listHref: string;
  shellLabel: string;
  steps: RuleCreateStep[];
  firstStepSlug: string;
  basicInfoStepSlug: string;
};

const PROGRAMME_STEPS: RuleCreateStep[] = [
  { slug: "basic-info", label: "Basic Info" },
  { slug: "conditions", label: "Conditions" },
  { slug: "actions", label: "Actions" },
  { slug: "scheduling", label: "Scheduling" },
  { slug: "review-publish", label: "Review" },
];

const CAMPAIGN_RULE_STEPS: RuleCreateStep[] = [
  { slug: "conditions", label: "Conditions" },
  { slug: "actions", label: "Actions" },
  { slug: "scheduling", label: "Scheduling" },
  { slug: "review-publish", label: "Review" },
];

const CAMPAIGN_STEPS: RuleCreateStep[] = [
  { slug: "campaign", label: "Campaigns" },
  { slug: "event", label: "Events" },
  { slug: "basic-info", label: "Campaign rule" },
  ...CAMPAIGN_RULE_STEPS,
];

const PROGRAMME_CONFIG: RuleCreateFlowConfig = {
  kind: "programme",
  draftScope: "programme",
  basePath: "/dashboard/loyalty-rules/create",
  cancelHref: "/dashboard/loyalty-rules/my-rules",
  listHref: "/dashboard/loyalty-rules/my-rules",
  shellLabel: "Create Loyalty Rule",
  steps: PROGRAMME_STEPS,
  firstStepSlug: "basic-info",
  basicInfoStepSlug: "basic-info",
};

const CAMPAIGN_CONFIG: RuleCreateFlowConfig = {
  kind: "campaign",
  draftScope: "campaign",
  basePath: "/dashboard/campaign-rules/create",
  cancelHref: "/dashboard/loyalty-rules/my-rules?ruleType=CAMPAIGN",
  listHref: "/dashboard/loyalty-rules/my-rules?ruleType=CAMPAIGN",
  shellLabel: "Create Campaign Rule",
  steps: CAMPAIGN_STEPS,
  firstStepSlug: "campaign",
  basicInfoStepSlug: "basic-info",
};

const RuleCreateFlowContext = createContext<RuleCreateFlowConfig>(PROGRAMME_CONFIG);

export function RuleCreateFlowProvider({
  kind,
  children,
}: {
  kind: RuleCreateFlowKind;
  children: ReactNode;
}) {
  const value = kind === "campaign" ? CAMPAIGN_CONFIG : PROGRAMME_CONFIG;
  return <RuleCreateFlowContext.Provider value={value}>{children}</RuleCreateFlowContext.Provider>;
}

export function useRuleCreateFlow() {
  return useContext(RuleCreateFlowContext);
}

export function stepHref(basePath: string, slug: string) {
  return `${basePath}/${slug}`;
}
