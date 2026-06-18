/** Parse comma-separated trigger event types stored on campaigns. */
export function parseTriggerEventTypes(stored: string | undefined | null): string[] {
  if (!stored?.trim()) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of stored.split(/[,;]/)) {
    const token = part.trim().toUpperCase();
    if (!token || seen.has(token)) continue;
    seen.add(token);
    out.push(token);
  }
  return out;
}

/** Serialize event types for API / DB (comma-separated, uppercase, deduped). */
export function formatTriggerEventTypes(types: string[]): string {
  return parseTriggerEventTypes(types.join(",")).join(",");
}

/** One event type for publishing a campaign earn rule (rejects multi-value strings). */
export function resolveSingleTriggerForCampaignRule(
  campaignStored: string | undefined | null,
  candidate: string | undefined | null
): string {
  const allowed = parseTriggerEventTypes(campaignStored);
  const parts = parseTriggerEventTypes(candidate);
  if (parts.length === 0) {
    throw new Error("Select an event type on the Events step.");
  }
  if (parts.length > 1) {
    throw new Error(
      `Campaign rules must use one event type. Choose one of: ${allowed.join(", ") || "—"}`
    );
  }
  const single = parts[0];
  if (allowed.length === 0) {
    return single;
  }
  if (!allowed.includes(single)) {
    throw new Error(
      `Event type must be one of the campaign types: ${allowed.join(", ") || "—"}`
    );
  }
  return single;
}

/** Display label for one or many event types. */
export function formatTriggerEventTypesLabel(stored: string | undefined | null): string {
  const types = parseTriggerEventTypes(stored);
  if (types.length === 0) return "—";
  return types.join(", ");
}
