import type {
  CampaignOfferConfig,
  CampaignResponse,
  CampaignTargetSegment,
  CampaignUpsertRequest,
} from "@/types/campaigns";
import type { EventSchemaDraft } from "@/lib/programme/event-schema-merge";
import { validateCampaignCreateEventSchemaStep } from "@/lib/campaigns/campaign-create-event-schema";
import {
  CAMPAIGN_DEFAULT_OFFER,
  CAMPAIGN_DEFAULT_PROGRAMME_UID,
  CAMPAIGN_DEFAULT_TYPE,
} from "@/lib/campaigns/campaign-constants";
import {
  formatTriggerEventTypes,
  parseTriggerEventTypes,
} from "@/lib/campaigns/trigger-event-types";

export {
  formatTriggerEventTypesLabel,
  parseTriggerEventTypes,
} from "@/lib/campaigns/trigger-event-types";

export const CAMPAIGN_APPROVAL_BUDGET_THRESHOLD = 100_000;

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
  };
}

export type BuildPayloadContext = {
  /** Edit only — keep existing offer when UI does not collect offer fields. */
  preserveOfferConfig?: CampaignOfferConfig;
  preserveTargetSegment?: CampaignTargetSegment;
};

export type BuildPayloadResult =
  | { ok: true; payload: CampaignUpsertRequest }
  | { ok: false; error: string };

function resolveOfferConfig(ctx: BuildPayloadContext): CampaignOfferConfig {
  const src = ctx.preserveOfferConfig;
  if (src?.awardType) {
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

export function buildCampaignUpsertPayload(
  state: CampaignFormState,
  ctx: BuildPayloadContext
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

  const payload: CampaignUpsertRequest = {
    programmeUid,
    name: name.trim(),
    description: description.trim() || undefined,
    campaignType: CAMPAIGN_DEFAULT_TYPE,
    triggerEventType: eventTypes.length > 0 ? formatTriggerEventTypes(eventTypes) : "",
    offerConfig: resolveOfferConfig(ctx),
    validFrom: fromIso,
    validUntil: untilIso,
    budgetTotal: budget,
    alertThresholdPct: alertThresholdPct.trim() ? Number(alertThresholdPct) : 80,
    priority: 0,
  };

  const seg = ctx.preserveTargetSegment;
  if (seg && Object.keys(seg).length > 0) {
    payload.targetSegment = seg;
  }

  return { ok: true, payload };
}

export const CAMPAIGN_CREATE_STEP_SLUGS = ["basic-info", "events", "budget", "review"] as const;

export type CampaignCreateStepSlug = (typeof CAMPAIGN_CREATE_STEP_SLUGS)[number];

export const CAMPAIGN_CREATE_STEPS: Array<{ slug: CampaignCreateStepSlug; label: string }> = [
  { slug: "basic-info", label: "Basic Info" },
  { slug: "events", label: "Events" },
  { slug: "budget", label: "Budget" },
  { slug: "review", label: "Review" },
];

export function validateCampaignCreateStep(
  stepIndex: number,
  state: CampaignFormState,
  eventSchemaDraft?: EventSchemaDraft
): string | null {
  switch (stepIndex) {
    case 0:
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
    case 1:
      if (eventSchemaDraft) {
        return validateCampaignCreateEventSchemaStep(eventSchemaDraft);
      }
      return null;
    case 2: {
      const budget = Number(state.budgetTotal);
      if (!Number.isFinite(budget) || budget <= 0) {
        return "Total budget must be greater than zero";
      }
      return null;
    }
    case 3:
      return null;
    default:
      return null;
  }
}
