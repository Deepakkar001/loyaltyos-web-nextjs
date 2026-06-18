import type { ReferralMilestoneRule } from "@/lib/api/client";

/** Sentinel value for referral link (not an integration event type). */
export const REFERRAL_LINK_EVENT_KEY = "__REFERRAL_LINK__";

export type MilestoneEventOption = {
  value: string;
  label: string;
  description?: string;
};

export function buildMilestoneEventOptions(
  programmeEventTypes: string[]
): MilestoneEventOption[] {
  const options: MilestoneEventOption[] = [
    {
      value: REFERRAL_LINK_EVENT_KEY,
      label: "When referee links referral code",
      description: "Runs at successful referral link (not sent as an integration event).",
    },
  ];
  for (const raw of programmeEventTypes) {
    const eventType = raw.trim();
    if (!eventType) continue;
    const upper = eventType.toUpperCase();
    if (upper === "PURCHASE") {
      options.push({
        value: "PURCHASE",
        label: "On purchase event",
        description: "Uses purchase counters and spend from PURCHASE integration events.",
      });
    } else {
      options.push({
        value: upper,
        label: `On ${eventType} event`,
        description: `Fires when integration sends event type ${upper}.`,
      });
    }
  }
  return options;
}

/** Maps a saved rule to the dropdown value. */
export function milestoneRuleToEventKey(rule: ReferralMilestoneRule): string {
  if (rule.trigger === "LINK") {
    return REFERRAL_LINK_EVENT_KEY;
  }
  if (rule.trigger === "PURCHASE") {
    return "PURCHASE";
  }
  const types = rule.criteria?.eventTypes ?? [];
  if (types.length > 0) {
    return types[0].trim().toUpperCase();
  }
  return REFERRAL_LINK_EVENT_KEY;
}

/** Maps dropdown selection to trigger + criteria (production: one integration event per rule). */
export function eventKeyToMilestoneRulePatch(
  eventKey: string,
  existing?: ReferralMilestoneRule
): Pick<ReferralMilestoneRule, "trigger" | "criteria"> {
  const prior = existing?.criteria ?? {};
  if (eventKey === REFERRAL_LINK_EVENT_KEY) {
    return { trigger: "LINK", criteria: {} };
  }
  if (eventKey.toUpperCase() === "PURCHASE") {
    return {
      trigger: "PURCHASE",
      criteria: {
        minPurchaseCount: prior.minPurchaseCount,
        minSpend: prior.minSpend,
        windowDays: prior.windowDays,
        firstPurchaseOnly: prior.firstPurchaseOnly,
        merchantId: prior.merchantId,
        category: prior.category,
        channel: prior.channel,
        sku: prior.sku,
        region: prior.region,
        metadataFilters: prior.metadataFilters,
      },
    };
  }
  return {
    trigger: "INTEGRATION_EVENT",
    criteria: {
      eventTypes: [eventKey.trim().toUpperCase()],
      channel: prior.channel,
      region: prior.region,
      merchantId: prior.merchantId,
      category: prior.category,
      sku: prior.sku,
      metadataFilters: prior.metadataFilters,
    },
  };
}
