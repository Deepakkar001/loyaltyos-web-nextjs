import type { CampaignAwardType, CampaignOfferConfig } from "@/types/campaigns";
import type { CampaignFormState } from "@/lib/campaigns/campaign-form";

export const CAMPAIGN_AWARD_TYPE_OPTIONS: Array<{ value: CampaignAwardType; label: string }> = [
  { value: "POINTS_BONUS", label: "Bonus points" },
  { value: "MULTIPLIER_ON_RULE_POINTS", label: "Multiplier on rule points" },
  { value: "FLAT_CASHBACK", label: "Flat cashback" },
  { value: "PERCENT_CASHBACK", label: "Percent cashback" },
];

export const CAMPAIGN_CHANNEL_OPTIONS = ["ONLINE", "IN_STORE", "POS", "MOBILE", "APP"] as const;

export function parseChannelList(raw: string | undefined | null): string[] {
  if (!raw?.trim()) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,;]/)) {
    const token = part.trim().toUpperCase();
    if (!token || seen.has(token)) continue;
    seen.add(token);
    out.push(token);
  }
  return out;
}

export function formatChannelList(channels: string[]): string {
  return parseChannelList(channels.join(",")).join(", ");
}

export function validateOfferFormState(state: CampaignFormState): string | null {
  const type = state.awardType;
  if (!type) return "Select a reward type";

  switch (type) {
    case "POINTS_BONUS": {
      const pts = Number(state.bonusPoints);
      if (!Number.isFinite(pts) || pts <= 0) return "Bonus points must be greater than zero";
      if (state.offerExpiryDays.trim()) {
        const days = Number(state.offerExpiryDays);
        if (!Number.isInteger(days) || days <= 0) return "Expiry days must be a positive whole number";
      }
      return null;
    }
    case "MULTIPLIER_ON_RULE_POINTS": {
      const mult = Number(state.multiplierOnRulePoints);
      if (!Number.isFinite(mult) || mult <= 0) return "Multiplier must be greater than zero";
      return null;
    }
    case "FLAT_CASHBACK":
    case "PERCENT_CASHBACK": {
      const val = Number(state.cashbackValue);
      if (!Number.isFinite(val) || val <= 0) {
        return type === "PERCENT_CASHBACK"
          ? "Cashback percent must be greater than zero"
          : "Cashback amount must be greater than zero";
      }
      if (type === "PERCENT_CASHBACK" && val > 100) {
        return "Cashback percent cannot exceed 100";
      }
      return null;
    }
    default:
      return "Select a reward type";
  }
}

export function buildOfferConfigFromState(state: CampaignFormState): CampaignOfferConfig {
  const awardType = state.awardType;
  const base: CampaignOfferConfig = {
    awardType,
    stackableWithRules: state.stackableWithRules,
  };

  switch (awardType) {
    case "POINTS_BONUS":
      return {
        ...base,
        bonusPoints: Number(state.bonusPoints),
        expiryDays: state.offerExpiryDays.trim() ? Number(state.offerExpiryDays) : undefined,
      };
    case "MULTIPLIER_ON_RULE_POINTS":
      return {
        ...base,
        multiplierOnRulePoints: Number(state.multiplierOnRulePoints),
      };
    case "FLAT_CASHBACK":
    case "PERCENT_CASHBACK":
      return {
        ...base,
        cashbackValue: Number(state.cashbackValue),
      };
    default:
      return base;
  }
}

export function formatOfferSummary(state: CampaignFormState): string {
  const label =
    CAMPAIGN_AWARD_TYPE_OPTIONS.find((o) => o.value === state.awardType)?.label ?? state.awardType;
  switch (state.awardType) {
    case "POINTS_BONUS":
      return `${label}: ${state.bonusPoints} pts${state.offerExpiryDays.trim() ? ` (expires in ${state.offerExpiryDays}d)` : ""}`;
    case "MULTIPLIER_ON_RULE_POINTS":
      return `${label}: ${state.multiplierOnRulePoints}×`;
    case "FLAT_CASHBACK":
      return `${label}: ${state.cashbackValue}`;
    case "PERCENT_CASHBACK":
      return `${label}: ${state.cashbackValue}%`;
    default:
      return "—";
  }
}

export function formatTargetingSummary(state: CampaignFormState): string {
  const parts: string[] = [];
  if (state.triggerEventType.trim()) {
    parts.push(`Events: ${state.triggerEventType}`);
  }
  if (state.minAmount.trim()) {
    parts.push(`Min spend: ${state.minAmount}`);
  }
  const channels = parseChannelList(state.channels);
  if (channels.length > 0) {
    parts.push(`Channels: ${channels.join(", ")}`);
  }
  if (state.maxParticipations.trim()) {
    parts.push(`Max redemptions: ${state.maxParticipations}`);
  }
  if (state.maxPerCustomer.trim()) {
    parts.push(`Max per customer: ${state.maxPerCustomer}`);
  }
  return parts.length > 0 ? parts.join(" · ") : "All qualifying customers";
}
