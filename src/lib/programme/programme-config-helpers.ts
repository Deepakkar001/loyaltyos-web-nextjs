import type { ProgrammeSummaryResponse } from "@/types/onboarding";

/** Merges API programmes with the synthetic `default` row; ensures non-empty dropdown labels. */
export function mergeProgrammeDropdownRows(list: ProgrammeSummaryResponse[] | null | undefined) {
  const seen = new Set<string>();
  const out: Array<{ programmeUid: string; name: string }> = [];
  const push = (row: { programmeUid: string; name: string }) => {
    if (seen.has(row.programmeUid)) return;
    seen.add(row.programmeUid);
    out.push(row);
  };
  push({ programmeUid: "default", name: "Default programme" });
  for (const p of list ?? []) {
    const label = (p.name ?? "").trim();
    push({
      programmeUid: p.programmeUid,
      name: label.length > 0 ? label : `Unnamed programme (${p.programmeUid.slice(0, 8)}…)`,
    });
  }
  return out;
}

function safeRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

const LEGACY_FALLBACK_EVENT_TYPES = ["PURCHASE", "REFUND", "REVERSAL", "LOGIN", "SIGNUP"] as const;

/**
 * Reads `eventSchema.eventDefinitions[].eventType` from programme config JSON.
 * Preserves unknown event type strings (e.g. from an existing rule) so the UI can still show them.
 * When no definitions exist (legacy config), returns common defaults so the wizard stays usable.
 */
export function extractEventTypesFromProgrammeConfig(
  config: unknown,
  preserveExact: readonly string[]
): string[] {
  const root = safeRecord(config);
  const es = root ? safeRecord(root.eventSchema) : null;
  const defs = es && Array.isArray(es.eventDefinitions) ? es.eventDefinitions : [];
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (t: string) => {
    const s = t.trim();
    if (!s || seen.has(s)) return;
    seen.add(s);
    out.push(s);
  };
  for (const d of defs) {
    const row = safeRecord(d);
    const et = row?.eventType;
    if (typeof et === "string") push(et);
  }
  for (const p of preserveExact) {
    if (typeof p === "string" && p.trim()) push(p);
  }
  if (out.length === 0) {
    for (const t of LEGACY_FALLBACK_EVENT_TYPES) push(t);
  }
  return out;
}
