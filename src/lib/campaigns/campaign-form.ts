import type {
  CampaignAwardType,
  CampaignResponse,
  CampaignUpsertRequest,
  StackMode,
} from "@/types/campaigns";

export const CAMPAIGN_APPROVAL_BUDGET_THRESHOLD = 100_000;

export const STACK_MODE_OPTIONS: Array<{ value: StackMode; label: string }> = [
  { value: "ADDITIVE", label: "Additive" },
  { value: "BEST_OFFER", label: "Best offer" },
  { value: "FIRST_MATCH", label: "First match" },
];

export const AWARD_TYPE_OPTIONS: Array<{ value: CampaignAwardType; label: string }> = [
  { value: "POINTS_BONUS", label: "Points bonus" },
  { value: "MULTIPLIER_ON_RULE_POINTS", label: "Multiplier on rule points" },
  { value: "FLAT_CASHBACK", label: "Flat cashback" },
  { value: "PERCENT_CASHBACK", label: "Percent cashback" },
];

export type CampaignFormState = {
  programmeUid: string;
  name: string;
  description: string;
  campaignType: string;
  occasionTags: string[];
  validFromLocal: string;
  validUntilLocal: string;
  triggerEventType: string;
  selectedTiers: string[];
  selectedChannels: string[];
  minAmount: string;
  countries: string[];
  awardType: CampaignAwardType;
  bonusPoints: string;
  multiplier: string;
  cashbackValue: string;
  expiryDays: string;
  stackableWithRules: boolean;
  budgetTotal: string;
  alertThresholdPct: string;
  maxParticipations: string;
  maxPerCustomer: string;
  globalRewardCap: string;
  mutualExclGroup: string;
  stackMode: StackMode;
  priority: string;
};

export function datetimeLocalToIso(local: string): string {
  if (!local.trim()) return new Date().toISOString();
  return new Date(local).toISOString();
}

export function isoToDatetimeLocal(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function parseOccasionTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((s) => s.trim());
}

export function campaignToFormState(c: CampaignResponse): CampaignFormState {
  const offer = c.offerConfig;
  const seg = c.targetSegment;
  const awardType = (offer?.awardType ?? "POINTS_BONUS") as CampaignAwardType;

  return {
    programmeUid: c.programmeUid,
    name: c.name ?? "",
    description: c.description ?? "",
    campaignType: c.campaignType ?? "",
    occasionTags: parseOccasionTags(c.occasionTags),
    validFromLocal: isoToDatetimeLocal(c.validFrom),
    validUntilLocal: isoToDatetimeLocal(c.validUntil),
    triggerEventType: c.triggerEventType ?? "",
    selectedTiers: seg?.tierUids ?? [],
    selectedChannels: seg?.channels ?? [],
    minAmount: seg?.minAmount != null ? String(seg.minAmount) : "",
    countries: seg?.countries ?? [],
    awardType,
    bonusPoints: offer?.bonusPoints != null ? String(offer.bonusPoints) : "50",
    multiplier: offer?.multiplierOnRulePoints != null ? String(offer.multiplierOnRulePoints) : "2",
    cashbackValue: offer?.cashbackValue != null ? String(offer.cashbackValue) : "10",
    expiryDays: offer?.expiryDays != null ? String(offer.expiryDays) : "",
    stackableWithRules: offer?.stackableWithRules !== false,
    budgetTotal: String(c.budgetTotal ?? ""),
    alertThresholdPct: c.alertThresholdPct != null ? String(c.alertThresholdPct) : "80",
    maxParticipations: c.maxParticipations != null ? String(c.maxParticipations) : "",
    maxPerCustomer: c.maxPerCustomer != null ? String(c.maxPerCustomer) : "",
    globalRewardCap: c.globalRewardCap != null ? String(c.globalRewardCap) : "",
    mutualExclGroup: c.mutualExclGroup ?? "",
    stackMode: c.stackMode ?? "ADDITIVE",
    priority: c.priority != null ? String(c.priority) : "0",
  };
}

export function defaultCreateFormState(programmeUid = ""): CampaignFormState {
  return {
    programmeUid,
    name: "",
    description: "",
    campaignType: "",
    occasionTags: [],
    validFromLocal: "",
    validUntilLocal: "",
    triggerEventType: "",
    selectedTiers: [],
    selectedChannels: [],
    minAmount: "",
    countries: [],
    awardType: "POINTS_BONUS",
    bonusPoints: "50",
    multiplier: "2",
    cashbackValue: "10",
    expiryDays: "",
    stackableWithRules: true,
    budgetTotal: "10000",
    alertThresholdPct: "80",
    maxParticipations: "",
    maxPerCustomer: "",
    globalRewardCap: "",
    mutualExclGroup: "",
    stackMode: "ADDITIVE",
    priority: "0",
  };
}

export type BuildPayloadContext = {
  tierOptions: Array<{ tierUid: string; label: string }>;
};

export type BuildPayloadResult =
  | { ok: true; payload: CampaignUpsertRequest }
  | { ok: false; error: string };

export function buildCampaignUpsertPayload(
  state: CampaignFormState,
  ctx: BuildPayloadContext
): BuildPayloadResult {
  const {
    programmeUid,
    name,
    description,
    campaignType,
    occasionTags,
    validFromLocal,
    validUntilLocal,
    triggerEventType,
    selectedTiers,
    selectedChannels,
    minAmount,
    countries,
    awardType,
    bonusPoints,
    multiplier,
    cashbackValue,
    expiryDays,
    stackableWithRules,
    budgetTotal,
    alertThresholdPct,
    maxParticipations,
    maxPerCustomer,
    globalRewardCap,
    mutualExclGroup,
    stackMode,
    priority,
  } = state;

  if (!programmeUid) return { ok: false, error: "Select a programme" };
  if (!name.trim()) return { ok: false, error: "Campaign name is required" };
  if (!campaignType.trim()) return { ok: false, error: "Campaign type is required" };
  if (!validFromLocal || !validUntilLocal) {
    return { ok: false, error: "Valid from and valid until are required" };
  }

  const fromIso = datetimeLocalToIso(validFromLocal);
  const untilIso = datetimeLocalToIso(validUntilLocal);
  if (new Date(untilIso).getTime() <= new Date(fromIso).getTime()) {
    return {
      ok: false,
      error:
        "Valid until must be later than valid from. Check that the end date/year is after the start.",
    };
  }
  if (!triggerEventType) return { ok: false, error: "Trigger event type is required" };

  const budget = Number(budgetTotal);
  if (!Number.isFinite(budget) || budget <= 0) {
    return { ok: false, error: "Total budget must be greater than zero" };
  }

  const offerConfig: CampaignUpsertRequest["offerConfig"] = {
    awardType,
    stackableWithRules,
  };

  if (awardType === "POINTS_BONUS") {
    const pts = Number(bonusPoints);
    if (!Number.isFinite(pts) || pts <= 0) {
      return { ok: false, error: "Bonus points must be greater than zero" };
    }
    offerConfig.bonusPoints = pts;
  }
  if (awardType === "MULTIPLIER_ON_RULE_POINTS") {
    const mult = Number(multiplier);
    if (!Number.isFinite(mult) || mult <= 0) {
      return { ok: false, error: "Multiplier must be greater than zero" };
    }
    offerConfig.multiplierOnRulePoints = mult;
  }
  if (awardType === "FLAT_CASHBACK" || awardType === "PERCENT_CASHBACK") {
    const cb = Number(cashbackValue);
    if (!Number.isFinite(cb) || cb <= 0) {
      return { ok: false, error: "Cashback value must be greater than zero" };
    }
    offerConfig.cashbackValue = cb;
  }
  if (expiryDays.trim()) {
    const days = Number(expiryDays);
    if (!Number.isFinite(days) || days <= 0) {
      return { ok: false, error: "Expiry days must be a positive number" };
    }
    offerConfig.expiryDays = days;
  }

  const segment: NonNullable<CampaignUpsertRequest["targetSegment"]> = {};
  const validTierUids = selectedTiers.filter((id) => ctx.tierOptions.some((o) => o.tierUid === id));
  if (validTierUids.length > 0) segment.tierUids = validTierUids;
  if (selectedChannels.length > 0) segment.channels = selectedChannels;
  if (minAmount.trim()) {
    const min = Number(minAmount);
    if (!Number.isFinite(min) || min < 0) {
      return { ok: false, error: "Minimum amount must be zero or greater" };
    }
    segment.minAmount = min;
  }
  if (countries.length > 0) segment.countries = countries;

  const payload: CampaignUpsertRequest = {
    programmeUid,
    name: name.trim(),
    description: description.trim() || undefined,
    campaignType: campaignType.trim(),
    occasionTags: occasionTags.length > 0 ? occasionTags : undefined,
    triggerEventType,
    offerConfig,
    validFrom: fromIso,
    validUntil: untilIso,
    budgetTotal: budget,
    alertThresholdPct: alertThresholdPct.trim() ? Number(alertThresholdPct) : 80,
    priority: priority.trim() ? Number(priority) : 0,
  };

  if (Object.keys(segment).length > 0) payload.targetSegment = segment;
  if (maxParticipations.trim()) payload.maxParticipations = Number(maxParticipations);
  if (maxPerCustomer.trim()) payload.maxPerCustomer = Number(maxPerCustomer);
  if (globalRewardCap.trim()) payload.globalRewardCap = Number(globalRewardCap);

  const hasMutualExclGroup = mutualExclGroup.trim().length > 0;
  if (hasMutualExclGroup) {
    payload.mutualExclGroup = mutualExclGroup.trim();
    payload.stackMode = stackMode;
  }

  return { ok: true, payload };
}
