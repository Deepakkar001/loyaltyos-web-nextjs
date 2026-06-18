import { loyaltyRulesAdminApi } from "@/lib/api/client";
import type { EarnRuleResponse, RuleType } from "@/types/rules";

function dedupeRules(rows: EarnRuleResponse[]): EarnRuleResponse[] {
  const byId = new Map<number, EarnRuleResponse>();
  for (const r of rows) {
    byId.set(r.id, r);
  }
  return Array.from(byId.values());
}

/**
 * Loads rules for My Rules list.
 * - ALL: tenant-wide list, merged with per-programme fetches so campaign rules from every programme appear.
 * - Specific programme: backend resolves programme + linked campaign rules.
 */
export async function loadTenantRulesForList(
  programmeFilter: string,
  programmeUids: string[],
  ruleType?: RuleType
): Promise<EarnRuleResponse[]> {
  if (programmeFilter !== "ALL") {
    return loyaltyRulesAdminApi.listRules(programmeFilter, ruleType);
  }

  const merged: EarnRuleResponse[] = [];
  try {
    const all = await loyaltyRulesAdminApi.listRules("ALL", ruleType);
    merged.push(...all);
  } catch {
    /* fall through to per-programme merge */
  }

  const uids = Array.from(new Set(programmeUids.filter(Boolean)));
  if (uids.length > 0) {
    const batches = await Promise.all(
      uids.map((uid) => loyaltyRulesAdminApi.listRules(uid, ruleType).catch(() => [] as EarnRuleResponse[]))
    );
    for (const batch of batches) {
      merged.push(...batch);
    }
  }

  return dedupeRules(merged);
}
