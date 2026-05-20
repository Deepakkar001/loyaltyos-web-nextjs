import type { Dispatch, SetStateAction } from "react";

import type {
  EventSchemaCoreFieldDraft,
  EventSchemaCustomFieldDraft,
  EventSchemaDraft,
  EventSchemaFieldType,
} from "@/lib/programme/event-schema-merge";

export const FIELD_TYPE_OPTIONS: { value: EventSchemaFieldType; label: string }[] = [
  { value: "string", label: "string" },
  { value: "number", label: "number" },
  { value: "integer", label: "integer" },
  { value: "boolean", label: "boolean" },
  { value: "date-time", label: "date-time" },
  { value: "object", label: "object" },
];

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

export type EventSchemaDraftMutators = {
  updateEventType: (idx: number, eventType: string) => void;
  updateCoreField: (defIdx: number, fieldIdx: number, patch: Partial<EventSchemaCoreFieldDraft>) => void;
  addCoreField: (defIdx: number) => void;
  removeCoreField: (defIdx: number, fieldIdx: number) => void;
  addEventDefinition: () => void;
  removeEventDefinition: (idx: number) => void;
  updateCustomField: (idx: number, patch: Partial<EventSchemaCustomFieldDraft>) => void;
  addCustomField: () => void;
  removeCustomField: (idx: number) => void;
};

export function createEventSchemaMutators(
  setDraft: Dispatch<SetStateAction<EventSchemaDraft>>
): EventSchemaDraftMutators {
  return {
    updateEventType: (idx, eventType) => {
      setDraft((prev) => {
        const next = cloneEventSchemaDraft(prev);
        next.eventDefinitions[idx] = { ...next.eventDefinitions[idx], eventType };
        return next;
      });
    },
    updateCoreField: (defIdx, fieldIdx, patch) => {
      setDraft((prev) => {
        const next = cloneEventSchemaDraft(prev);
        const fields = [...next.eventDefinitions[defIdx].coreFields];
        fields[fieldIdx] = { ...fields[fieldIdx], ...patch };
        next.eventDefinitions[defIdx] = { ...next.eventDefinitions[defIdx], coreFields: fields };
        return next;
      });
    },
    addCoreField: (defIdx) => {
      setDraft((prev) => {
        const next = cloneEventSchemaDraft(prev);
        const fields = [...next.eventDefinitions[defIdx].coreFields];
        fields.push({ name: "", type: "string", required: false });
        next.eventDefinitions[defIdx] = { ...next.eventDefinitions[defIdx], coreFields: fields };
        return next;
      });
    },
    removeCoreField: (defIdx, fieldIdx) => {
      setDraft((prev) => {
        const next = cloneEventSchemaDraft(prev);
        const fields = next.eventDefinitions[defIdx].coreFields.filter((_, i) => i !== fieldIdx);
        next.eventDefinitions[defIdx] = { ...next.eventDefinitions[defIdx], coreFields: fields };
        return next;
      });
    },
    addEventDefinition: () => {
      setDraft((prev) => {
        const next = cloneEventSchemaDraft(prev);
        next.eventDefinitions.push({
          eventType: `EVENT_${next.eventDefinitions.length + 1}`,
          coreFields: [
            { name: "transactionId", type: "string", required: true },
            { name: "eventType", type: "string", required: true },
          ],
        });
        return next;
      });
    },
    removeEventDefinition: (idx) => {
      setDraft((prev) => {
        if (prev.eventDefinitions.length <= 1) return prev;
        const next = cloneEventSchemaDraft(prev);
        next.eventDefinitions.splice(idx, 1);
        return next;
      });
    },
    updateCustomField: (idx, patch) => {
      setDraft((prev) => {
        const next = cloneEventSchemaDraft(prev);
        next.customFields[idx] = { ...next.customFields[idx], ...patch };
        return next;
      });
    },
    addCustomField: () => {
      setDraft((prev) => {
        const next = cloneEventSchemaDraft(prev);
        next.customFields.push({ name: "", type: "string", required: false, dependsOn: "" });
        return next;
      });
    },
    removeCustomField: (idx) => {
      setDraft((prev) => {
        const next = cloneEventSchemaDraft(prev);
        next.customFields.splice(idx, 1);
        return next;
      });
    },
  };
}
