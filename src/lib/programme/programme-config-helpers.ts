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

export { extractEventTypesFromProgrammeConfig } from "./event-schema-merge";

export type TierOption = { tierUid: string; label: string };

/** Reads `tiers.tiers[].tierUid` from programme config JSON. */
export function extractTierOptionsFromProgrammeConfig(config: unknown): TierOption[] {
  const root = safeRecord(config);
  const tiersRoot = root ? safeRecord(root.tiers) : null;
  const list = tiersRoot && Array.isArray(tiersRoot.tiers) ? tiersRoot.tiers : [];
  const out: TierOption[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    const row = safeRecord(item);
    const tierUid = typeof row?.tierUid === "string" ? row.tierUid.trim() : "";
    if (!tierUid || seen.has(tierUid)) continue;
    seen.add(tierUid);
    const name = typeof row?.name === "string" && row.name.trim() ? row.name.trim() : tierUid;
    out.push({ tierUid, label: name });
  }
  return out;
}

const DEFAULT_CHANNEL_OPTIONS = ["WEB", "APP", "POS", "MOBILE", "API"] as const;

function collectEnumLikeOptions(field: Record<string, unknown>): string[] {
  const raw = field.options ?? field.enumValues ?? field.allowedValues;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Channel values from eventSchema `channel` / `channels` field options, else common defaults. */
export function extractChannelOptionsFromProgrammeConfig(config: unknown): string[] {
  const root = safeRecord(config);
  const es = root ? safeRecord(root.eventSchema) : null;
  const defs = es && Array.isArray(es.eventDefinitions) ? es.eventDefinitions : [];
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (t: string) => {
    const s = t.trim().toUpperCase();
    if (!s || seen.has(s)) return;
    seen.add(s);
    out.push(s);
  };

  for (const d of defs) {
    const row = safeRecord(d);
    const fieldLists = [
      ...(Array.isArray(row?.coreFields) ? row.coreFields : []),
      ...(Array.isArray(row?.customFields) ? row.customFields : []),
    ];
    for (const item of fieldLists) {
      const field = safeRecord(item);
      const name = typeof field?.fieldName === "string" ? field.fieldName.trim().toLowerCase() : "";
      if (name !== "channel" && name !== "channels") continue;
      for (const opt of collectEnumLikeOptions(field ?? {})) push(opt);
    }
  }

  if (out.length === 0) {
    for (const t of DEFAULT_CHANNEL_OPTIONS) push(t);
  }
  return out;
}
