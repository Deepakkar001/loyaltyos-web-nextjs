import type { ReferralRuleCriteria } from "@/lib/api/client";

export function getCriteriaFieldValue(
  criteria: ReferralRuleCriteria | undefined,
  storageKey: string
): string | number | boolean | undefined {
  const c = criteria ?? {};
  if (storageKey.startsWith("meta.")) {
    const name = storageKey.slice(5);
    return c.metadataFilters?.[name];
  }
  const v = c[storageKey as keyof ReferralRuleCriteria];
  if (Array.isArray(v)) return undefined;
  return v as string | number | boolean | undefined;
}

export function setCriteriaFieldValue(
  criteria: ReferralRuleCriteria | undefined,
  storageKey: string,
  value: string | number | boolean | undefined
): ReferralRuleCriteria {
  const next: ReferralRuleCriteria = { ...(criteria ?? {}) };
  if (storageKey.startsWith("meta.")) {
    const name = storageKey.slice(5);
    const filters = { ...(next.metadataFilters ?? {}) };
    if (value === undefined || value === "") {
      delete filters[name];
    } else {
      filters[name] = String(value);
    }
    next.metadataFilters = Object.keys(filters).length > 0 ? filters : undefined;
    return next;
  }
  if (value === undefined || value === "") {
    delete next[storageKey as keyof ReferralRuleCriteria];
    return next;
  }
  (next as Record<string, unknown>)[storageKey] = value;
  return next;
}
