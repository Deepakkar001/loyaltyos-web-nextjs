import type {
  CampaignOfferConfig,
  CampaignResponse,
  CampaignTargetSegment,
  CampaignUpsertRequest,
  CampaignAwardType,
  CustomerScope,
} from "@/types/campaigns";
import type { EventSchemaDraft } from "@/lib/programme/event-schema-merge";
import { validateCampaignCreateEventSchemaStep } from "@/lib/campaigns/campaign-create-event-schema";
import {
  buildOfferConfigFromState,
  formatChannelList,
  parseChannelList,
  validateOfferFormState,
} from "@/lib/campaigns/campaign-offer-helpers";
import {
  CAMPAIGN_DEFAULT_OFFER,
  CAMPAIGN_DEFAULT_PROGRAMME_UID,
  CAMPAIGN_DEFAULT_TYPE,
} from "@/lib/campaigns/campaign-constants";
import {
  formatTriggerEventTypes,
  parseTriggerEventTypes,
} from "@/lib/campaigns/trigger-event-types";

export type CampaignFormPortal = "tenant" | "merchant";

export {
  formatTriggerEventTypesLabel,
  parseTriggerEventTypes,
} from "@/lib/campaigns/trigger-event-types";

export const CAMPAIGN_FIELD_PLACEHOLDERS = {
  name: "e.g. Winter Sale 2026",
  description: "Internal notes or customer-facing copy",
  eventType: "Select from configured event schema",
  validFrom: "Campaign start date & time",
  validUntil: "Campaign end date & time",
  validFromHint: "e.g. 2026-12-01 09:00 (must be before valid until)",
  validUntilHint: "e.g. 2027-01-31 23:59 (must be after valid from)",
  budgetTotal: "e.g. 100000",
  alertThresholdPct: "e.g. 80",
  bonusPoints: "e.g. 100",
  multiplier: "e.g. 2",
  cashbackValue: "e.g. 50",
  minAmount: "e.g. 500 (optional)",
  maxParticipations: "e.g. 1000 (optional)",
  maxPerCustomer: "e.g. 1 (optional)",
} as const;

export type CampaignFormState = {
  programmeUid: string;
  name: string;
  description: string;
  validFromLocal: string;
  validUntilLocal: string;
  triggerEventType: string;
  budgetTotal: string;
  alertThresholdPct: string;
  customerScope: CustomerScope;
  /** Set after first draft save during create wizard (enables CSV upload on audience step). */
  draftCampaignUid?: string;
  awardType: CampaignAwardType;
  bonusPoints: string;
  multiplierOnRulePoints: string;
  cashbackValue: string;
  offerExpiryDays: string;
  stackableWithRules: boolean;
  minAmount: string;
  channels: string;
  maxParticipations: string;
  maxPerCustomer: string;
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

function offerFieldsFromCampaign(c: CampaignResponse): Pick<
  CampaignFormState,
  | "awardType"
  | "bonusPoints"
  | "multiplierOnRulePoints"
  | "cashbackValue"
  | "offerExpiryDays"
  | "stackableWithRules"
> {
  const offer = c.offerConfig;
  return {
    awardType: offer?.awardType ?? CAMPAIGN_DEFAULT_OFFER.awardType,
    bonusPoints:
      offer?.bonusPoints != null ? String(offer.bonusPoints) : String(CAMPAIGN_DEFAULT_OFFER.bonusPoints ?? 50),
    multiplierOnRulePoints:
      offer?.multiplierOnRulePoints != null ? String(offer.multiplierOnRulePoints) : "2",
    cashbackValue: offer?.cashbackValue != null ? String(offer.cashbackValue) : "10",
    offerExpiryDays: offer?.expiryDays != null ? String(offer.expiryDays) : "",
    stackableWithRules: offer?.stackableWithRules !== false,
  };
}

function targetingFieldsFromCampaign(c: CampaignResponse): Pick<
  CampaignFormState,
  "minAmount" | "channels" | "maxParticipations" | "maxPerCustomer"
> {
  const seg = c.targetSegment;
  return {
    minAmount: seg?.minAmount != null ? String(seg.minAmount) : "",
    channels: seg?.channels?.length ? formatChannelList(seg.channels) : "",
    maxParticipations: c.maxParticipations != null ? String(c.maxParticipations) : "",
    maxPerCustomer: c.maxPerCustomer != null ? String(c.maxPerCustomer) : "",
  };
}

export function campaignToFormState(c: CampaignResponse): CampaignFormState {
  return {
    programmeUid: c.programmeUid?.trim() || CAMPAIGN_DEFAULT_PROGRAMME_UID,
    name: c.name ?? "",
    description: c.description ?? "",
    validFromLocal: isoToDatetimeLocal(c.validFrom),
    validUntilLocal: isoToDatetimeLocal(c.validUntil),
    triggerEventType: c.triggerEventType ?? "",
    budgetTotal: String(c.budgetTotal ?? ""),
    alertThresholdPct: c.alertThresholdPct != null ? String(c.alertThresholdPct) : "80",
    customerScope: c.customerScope ?? "ALL",
    draftCampaignUid: c.campaignUid,
    ...offerFieldsFromCampaign(c),
    ...targetingFieldsFromCampaign(c),
  };
}

export function defaultCreateFormState(): CampaignFormState {
  return {
    programmeUid: "",
    name: "",
    description: "",
    validFromLocal: "",
    validUntilLocal: "",
    triggerEventType: "",
    budgetTotal: "10000",
    alertThresholdPct: "80",
    customerScope: "ALL",
    awardType: CAMPAIGN_DEFAULT_OFFER.awardType,
    bonusPoints: String(CAMPAIGN_DEFAULT_OFFER.bonusPoints ?? 50),
    multiplierOnRulePoints: "2",
    cashbackValue: "10",
    offerExpiryDays: "",
    stackableWithRules: CAMPAIGN_DEFAULT_OFFER.stackableWithRules !== false,
    minAmount: "",
    channels: "",
    maxParticipations: "",
    maxPerCustomer: "",
  };
}

export type BuildPayloadContext = {
  /** Edit only — keep existing offer when UI does not collect offer fields. */
  preserveOfferConfig?: CampaignOfferConfig;
  preserveTargetSegment?: CampaignTargetSegment;
  /** When true, fall back to preserved offer if form award type is empty. */
  preferPreservedOffer?: boolean;
};

export type BuildPayloadResult =
  | { ok: true; payload: CampaignUpsertRequest }
  | { ok: false; error: string };

function resolveOfferConfig(state: CampaignFormState, ctx: BuildPayloadContext): CampaignOfferConfig {
  if (state.awardType) {
    const err = validateOfferFormState(state);
    if (err) {
      throw new Error(err);
    }
    return buildOfferConfigFromState(state);
  }
  const src = ctx.preserveOfferConfig;
  if (ctx.preferPreservedOffer && src?.awardType) {
    return {
      awardType: src.awardType,
      bonusPoints: src.bonusPoints,
      multiplierOnRulePoints: src.multiplierOnRulePoints,
      cashbackValue: src.cashbackValue,
      expiryDays: src.expiryDays,
      stackableWithRules: src.stackableWithRules !== false,
    };
  }
  return { ...CAMPAIGN_DEFAULT_OFFER };
}

function buildTargetSegmentFromState(state: CampaignFormState): CampaignTargetSegment | undefined {
  const seg: CampaignTargetSegment = {};
  if (state.minAmount.trim()) {
    const min = Number(state.minAmount);
    if (Number.isFinite(min) && min > 0) seg.minAmount = min;
  }
  const channels = parseChannelList(state.channels);
  if (channels.length > 0) seg.channels = channels;
  return Object.keys(seg).length > 0 ? seg : undefined;
}

function parseOptionalPositiveInt(raw: string): number | undefined | "invalid" {
  if (!raw.trim()) return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return "invalid";
  return n;
}

export function buildCampaignUpsertPayload(
  state: CampaignFormState,
  ctx: BuildPayloadContext = {}
): BuildPayloadResult {
  const {
    name,
    description,
    validFromLocal,
    validUntilLocal,
    triggerEventType,
    budgetTotal,
    alertThresholdPct,
  } = state;

  if (!name.trim()) return { ok: false, error: "Campaign name is required" };
  if (!validFromLocal || !validUntilLocal) {
    return { ok: false, error: "Valid from and valid until are required" };
  }

  const fromIso = datetimeLocalToIso(validFromLocal);
  const untilIso = datetimeLocalToIso(validUntilLocal);
  if (new Date(untilIso).getTime() <= new Date(fromIso).getTime()) {
    return {
      ok: false,
      error: "Valid until must be later than valid from.",
    };
  }
  const eventTypes = parseTriggerEventTypes(triggerEventType);

  const budget = Number(budgetTotal);
  if (!Number.isFinite(budget) || budget <= 0) {
    return { ok: false, error: "Total budget must be greater than zero" };
  }

  const programmeUid = state.programmeUid?.trim();
  if (!programmeUid) {
    return { ok: false, error: "Programme is required" };
  }

  let offerConfig: CampaignOfferConfig;
  try {
    offerConfig = resolveOfferConfig(state, ctx);
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid reward configuration" };
  }

  const maxParticipations = parseOptionalPositiveInt(state.maxParticipations);
  if (maxParticipations === "invalid") {
    return { ok: false, error: "Max participations must be a positive whole number" };
  }
  const maxPerCustomer = parseOptionalPositiveInt(state.maxPerCustomer);
  if (maxPerCustomer === "invalid") {
    return { ok: false, error: "Max per customer must be a positive whole number" };
  }

  const payload: CampaignUpsertRequest = {
    programmeUid,
    name: name.trim(),
    description: description.trim() || undefined,
    campaignType: CAMPAIGN_DEFAULT_TYPE,
    triggerEventType: eventTypes.length > 0 ? formatTriggerEventTypes(eventTypes) : "",
    offerConfig,
    validFrom: fromIso,
    validUntil: untilIso,
    budgetTotal: budget,
    alertThresholdPct: alertThresholdPct.trim() ? Number(alertThresholdPct) : 80,
    priority: 0,
    customerScope: state.customerScope ?? "ALL",
    maxParticipations,
    maxPerCustomer,
  };

  const segFromForm = buildTargetSegmentFromState(state);
  if (segFromForm) {
    payload.targetSegment = segFromForm;
  } else if (ctx.preserveTargetSegment && Object.keys(ctx.preserveTargetSegment).length > 0) {
    payload.targetSegment = ctx.preserveTargetSegment;
  }

  return { ok: true, payload };
}

export const TENANT_CAMPAIGN_CREATE_STEP_SLUGS = [
  "basic-info",
  "audience",
  "events",
  "targeting",
  "offer",
  "budget",
  "review",
] as const;

export const MERCHANT_CAMPAIGN_CREATE_STEP_SLUGS = [
  "basic-info",
  "events",
  "targeting",
  "offer",
  "budget",
  "review",
] as const;

export type TenantCampaignCreateStepSlug = (typeof TENANT_CAMPAIGN_CREATE_STEP_SLUGS)[number];
export type MerchantCampaignCreateStepSlug = (typeof MERCHANT_CAMPAIGN_CREATE_STEP_SLUGS)[number];
export type CampaignCreateStepSlug = TenantCampaignCreateStepSlug | MerchantCampaignCreateStepSlug;

/** @deprecated Use getCampaignCreateSteps(portal) */
export const CAMPAIGN_CREATE_STEP_SLUGS = TENANT_CAMPAIGN_CREATE_STEP_SLUGS;

export function formatCustomerScopeLabel(
  scope?: CustomerScope,
  customerCount?: number
): string {
  if (scope === "TARGETED") {
    const n = customerCount ?? 0;
    return n > 0 ? `Specific customers (${n})` : "Specific customers (no list yet)";
  }
  return "All customers";
}

export const TENANT_CAMPAIGN_CREATE_STEPS: Array<{ slug: TenantCampaignCreateStepSlug; label: string }> = [
  { slug: "basic-info", label: "Basic Info" },
  { slug: "audience", label: "Targeted Audience" },
  { slug: "events", label: "Events" },
  { slug: "targeting", label: "Who qualifies" },
  { slug: "offer", label: "Reward" },
  { slug: "budget", label: "Budget" },
  { slug: "review", label: "Review" },
];

export const MERCHANT_CAMPAIGN_CREATE_STEPS: Array<{ slug: MerchantCampaignCreateStepSlug; label: string }> = [
  { slug: "basic-info", label: "Basic Info" },
  { slug: "events", label: "Events" },
  { slug: "targeting", label: "Who qualifies" },
  { slug: "offer", label: "Reward" },
  { slug: "budget", label: "Budget" },
  { slug: "review", label: "Review" },
];

/** @deprecated Use getCampaignCreateSteps(portal) */
export const CAMPAIGN_CREATE_STEPS = TENANT_CAMPAIGN_CREATE_STEPS;

export function getCampaignCreateSteps(portal: CampaignFormPortal = "tenant") {
  return portal === "merchant" ? MERCHANT_CAMPAIGN_CREATE_STEPS : TENANT_CAMPAIGN_CREATE_STEPS;
}

export function getCampaignCreateStepIndex(
  portal: CampaignFormPortal,
  slug: CampaignCreateStepSlug
): number {
  const steps = getCampaignCreateSteps(portal);
  const idx = steps.findIndex((s) => s.slug === slug);
  return idx >= 0 ? idx : 0;
}

export type ValidateCampaignStepOptions = {
  eventSchemaDraft?: EventSchemaDraft;
  /** Latest customer_count from API (audience step). */
  targetCustomerCount?: number;
  portal?: CampaignFormPortal;
};

export function validateCampaignCreateStep(
  stepIndex: number,
  state: CampaignFormState,
  options?: ValidateCampaignStepOptions
): string | null {
  const portal = options?.portal ?? "tenant";
  const steps = getCampaignCreateSteps(portal);
  const slug = steps[stepIndex]?.slug;
  const eventSchemaDraft = options?.eventSchemaDraft;

  switch (slug) {
    case "basic-info":
      if (!state.programmeUid?.trim()) return "Programme is required";
      if (!state.name.trim()) return "Campaign name is required";
      if (!state.validFromLocal || !state.validUntilLocal) {
        return "Valid from and valid until are required";
      }
      {
        const fromIso = datetimeLocalToIso(state.validFromLocal);
        const untilIso = datetimeLocalToIso(state.validUntilLocal);
        if (new Date(untilIso).getTime() <= new Date(fromIso).getTime()) {
          return "Valid until must be later than valid from";
        }
      }
      return null;
    case "audience":
      if (!state.draftCampaignUid?.trim()) {
        return "Save basic info first (use Next on Basic Info)";
      }
      if (state.customerScope === "TARGETED") {
        const count = options?.targetCustomerCount ?? 0;
        if (count <= 0) {
          return "Upload a customer CSV list before continuing";
        }
      }
      return null;
    case "events":
      if (eventSchemaDraft) {
        return validateCampaignCreateEventSchemaStep(eventSchemaDraft);
      }
      return null;
    case "targeting": {
      const portal = options?.portal ?? "tenant";
      if (portal === "merchant") {
        const types = parseTriggerEventTypes(state.triggerEventType);
        if (types.length === 0) {
          return "Select at least one trigger event type";
        }
      }
      if (state.minAmount.trim()) {
        const min = Number(state.minAmount);
        if (!Number.isFinite(min) || min <= 0) {
          return "Minimum spend must be greater than zero";
        }
      }
      if (state.maxParticipations.trim()) {
        const n = Number(state.maxParticipations);
        if (!Number.isInteger(n) || n <= 0) {
          return "Max participations must be a positive whole number";
        }
      }
      if (state.maxPerCustomer.trim()) {
        const n = Number(state.maxPerCustomer);
        if (!Number.isInteger(n) || n <= 0) {
          return "Max per customer must be a positive whole number";
        }
      }
      return null;
    }
    case "offer":
      return validateOfferFormState(state);
    case "budget": {
      const budget = Number(state.budgetTotal);
      if (!Number.isFinite(budget) || budget <= 0) {
        return "Total budget must be greater than zero";
      }
      return null;
    }
    case "review":
      return null;
    default:
      return null;
  }
}
