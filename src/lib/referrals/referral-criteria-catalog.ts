import type { ReferralMilestoneRule, ReferralRuleSchemaResponse } from "@/lib/api/client";
import {
  buildConditionFieldCatalog,
  type ConditionFieldCatalog,
} from "@/lib/rules/condition-field-catalog";
import { milestoneRuleToEventKey, REFERRAL_LINK_EVENT_KEY } from "@/lib/referrals/milestone-event-options";

export type ReferralCriteriaFieldDef = {
  /** Storage key: criteria property or `meta.<name>` for metadataFilters */
  storageKey: string;
  label: string;
  type: "number" | "string" | "boolean";
  hint?: string;
  group: "purchase_engine" | "event_filter";
  enumOptions?: Array<{ label: string; value: string }>;
};

const SYSTEM_EVENT_FIELDS = new Set([
  "transactionid",
  "timestamp",
  "eventtype",
  "customerid",
  "eventid",
  "id",
]);

const SCHEMA_TO_CRITERIA: Record<string, string> = {
  merchantid: "merchantId",
  merchant_id: "merchantId",
  category: "category",
  channel: "channel",
  sku: "sku",
  region: "region",
  geo: "region",
  country: "region",
};

const PURCHASE_ENGINE: ReferralCriteriaFieldDef[] = [
  {
    storageKey: "minPurchaseCount",
    label: "Minimum purchases",
    type: "number",
    hint: "e.g. 3 for third purchase",
    group: "purchase_engine",
  },
  {
    storageKey: "minSpend",
    label: "Minimum total spend",
    type: "number",
    hint: "Cumulative spend in scope",
    group: "purchase_engine",
  },
  {
    storageKey: "windowDays",
    label: "Time window (days)",
    type: "number",
    hint: "Leave empty for all time",
    group: "purchase_engine",
  },
  {
    storageKey: "firstPurchaseOnly",
    label: "First purchase only",
    type: "boolean",
    group: "purchase_engine",
  },
];

function schemaFieldToStorageKey(fieldName: string, purchaseContext: boolean): string {
  const norm = fieldName.trim().toLowerCase();
  const mapped = SCHEMA_TO_CRITERIA[norm];
  if (mapped) return mapped;
  if (norm === "amount") return purchaseContext ? "minSpend" : `meta.${fieldName.trim()}`;
  return `meta.${fieldName.trim()}`;
}

function fieldFromCatalogEntry(
  catalog: ConditionFieldCatalog,
  eventFieldValue: string,
  purchaseContext: boolean
): ReferralCriteriaFieldDef | null {
  const rawName = eventFieldValue.startsWith("event.") ? eventFieldValue.slice(6) : eventFieldValue;
  if (!rawName || SYSTEM_EVENT_FIELDS.has(rawName.trim().toLowerCase())) {
    return null;
  }
  const meta = catalog.metadata[eventFieldValue];
  const storageKey = schemaFieldToStorageKey(rawName, purchaseContext);
  if (storageKey === "minSpend" && rawName.toLowerCase() === "amount" && purchaseContext) {
    return {
      storageKey: "minSpend",
      label: "Minimum total spend",
      type: "number",
      hint: "Uses purchase amount fields from events",
      group: "event_filter",
    };
  }
  const type =
    storageKey === "firstPurchaseOnly"
      ? "boolean"
      : meta?.type === "number" || meta?.type === "datetime"
        ? "number"
        : "string";
  return {
    storageKey,
    label: meta?.label?.replace(/^event\.\w+\s*\(/i, "").replace(/\)$/, "") ?? rawName,
    type,
    hint: meta?.placeholder,
    group: "event_filter",
    enumOptions: meta?.options,
  };
}

function fieldsFromApiSchema(
  rule: ReferralMilestoneRule,
  schema: ReferralRuleSchemaResponse | null | undefined
): ReferralCriteriaFieldDef[] | null {
  const byEvent = schema?.criteriaFieldsByEvent;
  if (!byEvent) return null;
  const eventKey = milestoneRuleToEventKey(rule);
  if (eventKey === REFERRAL_LINK_EVENT_KEY) return [];
  const apiFields = byEvent[eventKey === "PURCHASE" ? "PURCHASE" : eventKey];
  if (!apiFields?.length) return null;
  return apiFields.map((f) => ({
    storageKey: f.key.startsWith("meta.") ? f.key : f.key,
    label: f.label,
    type: (f.type === "number" || f.type === "boolean" ? f.type : "string") as ReferralCriteriaFieldDef["type"],
    hint: f.hint,
    group:
      f.purchaseOnly &&
      ["minPurchaseCount", "minSpend", "windowDays", "firstPurchaseOnly"].includes(f.key)
        ? "purchase_engine"
        : "event_filter",
  }));
}

export function buildReferralCriteriaFields(args: {
  rule: ReferralMilestoneRule;
  configRoot: unknown;
  ruleSchema?: ReferralRuleSchemaResponse | null;
}): ReferralCriteriaFieldDef[] {
  const fromApi = fieldsFromApiSchema(args.rule, args.ruleSchema);
  if (fromApi) return fromApi;

  const eventKey = milestoneRuleToEventKey(args.rule);
  if (eventKey === REFERRAL_LINK_EVENT_KEY || args.rule.trigger === "LINK") {
    return [];
  }

  const triggerType = eventKey === "PURCHASE" ? "PURCHASE" : eventKey;
  const catalog = buildConditionFieldCatalog({
    programmeUid: "",
    triggerEventType: triggerType,
    configRoot: args.configRoot ?? null,
  });

  const eventFilters: ReferralCriteriaFieldDef[] = [];
  const seen = new Set<string>();

  const purchaseContext = args.rule.trigger === "PURCHASE";

  for (const f of catalog.fields) {
    const def = fieldFromCatalogEntry(catalog, f.value, purchaseContext);
    if (!def || seen.has(def.storageKey)) continue;
    seen.add(def.storageKey);
    eventFilters.push(def);
  }

  if (purchaseContext) {
    const engine = PURCHASE_ENGINE.filter((e) => !seen.has(e.storageKey));
    return [...engine, ...eventFilters];
  }

  return eventFilters;
}
