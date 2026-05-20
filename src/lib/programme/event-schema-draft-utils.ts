import type { EventSchemaDraft } from "@/lib/programme/event-schema-merge";

const NAME_RE = /^[a-zA-Z][a-zA-Z0-9_]*$/;
const EVENT_TYPE_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function cloneEventSchemaDraft(d: EventSchemaDraft): EventSchemaDraft {
  return JSON.parse(JSON.stringify(d)) as EventSchemaDraft;
}

export function validateEventSchemaDraft(d: EventSchemaDraft): string | null {
  for (const def of d.eventDefinitions) {
    if (!def.eventType.trim()) return "Each event definition needs an event type.";
    if (!EVENT_TYPE_RE.test(def.eventType.trim())) return `Invalid event type: ${def.eventType}`;
    if (!def.coreFields.length) return `Add at least one core field for ${def.eventType}.`;
    for (const f of def.coreFields) {
      if (!f.name.trim()) return "Core field names cannot be empty.";
      if (!NAME_RE.test(f.name.trim())) return `Invalid core field name: ${f.name}`;
    }
  }
  for (const c of d.customFields) {
    if (!c.name.trim()) return "Custom field names cannot be empty.";
    if (!NAME_RE.test(c.name.trim())) return `Invalid custom field name: ${c.name}`;
  }
  if (d.backwardCompatibilityDays < 0 || d.backwardCompatibilityDays > 365) {
    return "Backward compatibility days must be between 0 and 365.";
  }
  return null;
}
