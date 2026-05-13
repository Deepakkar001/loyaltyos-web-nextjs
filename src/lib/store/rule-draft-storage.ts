/**
 * Unified rule draft storage.
 *
 * Previously, the Create-Rule flow used 4 separate localStorage keys —
 * one per wizard step — and each step "Next" handler had to spread the
 * previous step's draft to preserve untouched fields. That design was
 * fragile: any step that fell back to a stale key (e.g. `basic-info`
 * which always seeded `conditionTree: {}`) silently propagated empty
 * data forward, causing the "No condition tree saved" review warning
 * and lost state on Back navigation.
 *
 * This module replaces that with a SINGLE localStorage key per tenant
 * that holds a `Partial<RuleDraft>`. Each step only writes the fields
 * it owns via {@link saveRuleDraftFields}, and reads the full draft via
 * {@link loadRuleDraft}. On first read, legacy per-step keys (if any)
 * are folded into the unified key and then cleared, so existing users
 * keep their in-progress drafts during the migration window.
 */

import { createExpiringLocalStorage } from "@/lib/store/expiring-storage";

const storage = typeof window === "undefined" ? null : createExpiringLocalStorage(7 * 24 * 60 * 60 * 1000);

/** Legacy per-step storage keys — kept ONLY for one-time migration on first read. */
const LEGACY_STEPS = ["basic-info", "conditions", "actions", "scheduling"] as const;
export type RuleDraftStep = (typeof LEGACY_STEPS)[number];

export type RuleDraft = {
  programmeUid: string;
  ruleUid?: string;

  name: string;
  description?: string;
  priority: number;
  triggerEventType: string;
  executionMode: "FIRST_MATCH" | "ALL_MATCHING";
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";

  conditionTree: unknown; // backend expects JSON tree; validated server-side too
  actions: Array<{
    actionUid?: string;
    actionType: "AWARD_POINTS";
    formula: string;
    config?: unknown;
  }>;

  effectiveAt?: string; // ISO
  endAt?: string; // ISO
};

export type RuleDraftFields = Partial<RuleDraft>;

function unifiedKey(tenantId: string) {
  return `rule-draft:${tenantId}:current`;
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

/**
 * Load the unified draft for a tenant. Returns `null` when nothing is stored.
 *
 * Performs a one-time migration: if no unified draft exists but legacy
 * per-step keys do, the legacy values are merged (later steps override
 * earlier steps' fields) into the unified key and the legacy keys are
 * removed. Subsequent reads go straight to the unified key.
 */
export function loadRuleDraft(tenantId: string): RuleDraftFields | null {
  if (!storage || !tenantId) return null;

  const unified = safeParse(storage.getItem(unifiedKey(tenantId)));
  if (unified) return unified;

  // Migrate from legacy per-step keys (in step order, so later steps win).
  let migrated: RuleDraftFields | null = null;
  for (const step of LEGACY_STEPS) {
    const parsed = safeParse(storage.getItem(legacyKey(tenantId, step)));
    if (!parsed) continue;
    migrated = { ...(migrated ?? {}), ...parsed };
  }
  if (!migrated) return null;

  // Persist migration and clear legacy keys to prevent stale fallback reads.
  storage.setItem(unifiedKey(tenantId), JSON.stringify(migrated));
  for (const step of LEGACY_STEPS) storage.removeItem(legacyKey(tenantId, step));
  return migrated;
}

/**
 * Merge `fields` into the unified draft for a tenant. Fields not provided
 * are left untouched. Use this from every wizard step's "Next" handler
 * so steps never overwrite each other's data.
 */
export function saveRuleDraftFields(tenantId: string, fields: RuleDraftFields) {
  if (!storage || !tenantId) return;
  const existing = loadRuleDraft(tenantId) ?? {};
  const merged: RuleDraftFields = { ...existing, ...fields };
  storage.setItem(unifiedKey(tenantId), JSON.stringify(merged));
}

/**
 * Replace the entire unified draft. Used by the Edit Rule bootstrap to
 * populate the wizard from an existing server-side rule.
 */
export function replaceRuleDraft(tenantId: string, draft: RuleDraft) {
  if (!storage || !tenantId) return;
  storage.setItem(unifiedKey(tenantId), JSON.stringify(draft));
  // Clear any legacy keys so subsequent loads don't pick up stale data.
  for (const step of LEGACY_STEPS) storage.removeItem(legacyKey(tenantId, step));
}

/** Remove the unified draft (called after a successful publish). */
export function clearRuleDraft(tenantId: string) {
  if (!storage || !tenantId) return;
  storage.removeItem(unifiedKey(tenantId));
  for (const step of LEGACY_STEPS) storage.removeItem(legacyKey(tenantId, step));
}
