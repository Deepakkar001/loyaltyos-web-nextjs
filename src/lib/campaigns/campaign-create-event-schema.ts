import { validateEventSchemaDraft } from "@/components/dashboard/event-schema/event-schema-editor-utils";
import type { EventSchemaDraft } from "@/lib/programme/event-schema-merge";

export function campaignCreateHasEventSchemaContent(draft: EventSchemaDraft): boolean {
  return draft.eventDefinitions.length > 0;
}

export function validateCampaignCreateEventSchemaStep(draft: EventSchemaDraft): string | null {
  if (!campaignCreateHasEventSchemaContent(draft)) return null;
  return validateEventSchemaDraft(draft);
}

export function summarizeCampaignCreateEventSchema(draft: EventSchemaDraft): string {
  if (!campaignCreateHasEventSchemaContent(draft)) {
    return "None — optional; define later in Event Schema or via campaign rules";
  }
  const types = draft.eventDefinitions.map((d) => d.eventType.trim()).filter(Boolean);
  const customCount = draft.customFields.filter((c) => c.name.trim()).length;
  let summary = types.join(", ");
  if (customCount > 0) {
    summary += ` (+ ${customCount} custom field${customCount === 1 ? "" : "s"})`;
  }
  return summary;
}
