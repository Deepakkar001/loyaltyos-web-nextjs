/**
 * Unified rule draft storage (programme rules + campaign rules).
 * Separate localStorage keys per scope so flows do not overwrite each other.
 */

import { createExpiringLocalStorage } from "@/lib/store/expiring-storage";

const storage =
  typeof window === "undefined" ? null : createExpiringLocalStorage(7 * 24 * 60 * 60 * 1000);

export type RuleDraftScope = "programme" | "campaign";

/** Legacy per-step storage keys — kept ONLY for one-time migration on first read. */
const LEGACY_STEPS = ["basic-info", "conditions", "actions", "scheduling"] as const;
export type RuleDraftStep = (typeof LEGACY_STEPS)[number];

export type RuleType = "PROGRAMME" | "CAMPAIGN";

export type RuleDraft = {
  ruleType: RuleType;
  programmeUid: string;
  ruleUid?: string;

  /** Set for CAMPAIGN rules. */
  campaignUid?: string;
  campaignName?: string;
  /** Comma-separated event types from the selected campaign (picker options on event step). */
  campaignTriggerEventTypes?: string;

  name: string;
  description?: string;
  priority: number;
  triggerEventType: string;
  executionMode: "FIRST_MATCH" | "ALL_MATCHING";
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";

  conditionTree: unknown;
  actions: Array<{
    actionUid?: string;
    actionType: "AWARD_POINTS";
    formula: string;
    config?: unknown;
  }>;

  effectiveAt?: string;
  endAt?: string;
  conditionUiMode?: "current" | "diagram";
};

export type RuleDraftFields = Partial<RuleDraft>;

function unifiedKey(tenantId: string, scope: RuleDraftScope) {
  return scope === "campaign"
    ? `campaign-rule-draft:${tenantId}:current`
    : `rule-draft:${tenantId}:current`;
}

function legacyKey(tenantId: string, step: RuleDraftStep) {
  return `rule-draft:${tenantId}:${step}`;
}

function safeParse(raw: string | null): RuleDraftFields | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? (v as RuleDraftFields) : null;
  } catch {
    return null;
  }
}

export function loadRuleDraft(
  tenantId: string,
  scope: RuleDraftScope = "programme"
): RuleDraftFields | null {
  if (!storage || !tenantId) return null;

  const unified = safeParse(storage.getItem(unifiedKey(tenantId, scope)));
  if (unified) return unified;

  if (scope !== "programme") return null;

  let migrated: RuleDraftFields | null = null;
  for (const step of LEGACY_STEPS) {
    const parsed = safeParse(storage.getItem(legacyKey(tenantId, step)));
    if (!parsed) continue;
    migrated = { ...(migrated ?? {}), ...parsed };
  }
  if (!migrated) return null;

  if (!migrated.ruleType) migrated.ruleType = "PROGRAMME";
  storage.setItem(unifiedKey(tenantId, scope), JSON.stringify(migrated));
  for (const step of LEGACY_STEPS) storage.removeItem(legacyKey(tenantId, step));
  return migrated;
}

export function saveRuleDraftFields(
  tenantId: string,
  fields: RuleDraftFields,
  scope: RuleDraftScope = "programme"
) {
  if (!storage || !tenantId) return;
  const existing = loadRuleDraft(tenantId, scope) ?? {};
  const merged: RuleDraftFields = { ...existing, ...fields };
  storage.setItem(unifiedKey(tenantId, scope), JSON.stringify(merged));
}

export function replaceRuleDraft(tenantId: string, draft: RuleDraft, scope: RuleDraftScope = "programme") {
  if (!storage || !tenantId) return;
  storage.setItem(unifiedKey(tenantId, scope), JSON.stringify(draft));
  if (scope === "programme") {
    for (const step of LEGACY_STEPS) storage.removeItem(legacyKey(tenantId, step));
  }
}

export function clearRuleDraft(tenantId: string, scope: RuleDraftScope = "programme") {
  if (!storage || !tenantId) return;
  storage.removeItem(unifiedKey(tenantId, scope));
  if (scope === "programme") {
    for (const step of LEGACY_STEPS) storage.removeItem(legacyKey(tenantId, step));
  }
}

export function mergeRuleDraft(
  tenantId: string,
  partial: RuleDraftFields,
  scope: RuleDraftScope = "programme"
): RuleDraftFields {
  const base = loadRuleDraft(tenantId, scope) ?? {};
  const merged = { ...base, ...partial };
  saveRuleDraftFields(tenantId, merged, scope);
  return merged;
}
