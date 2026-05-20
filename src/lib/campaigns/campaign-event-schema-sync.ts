import { campaignsAdminApi, programmeApiV2 } from "@/lib/api/client";
import { formatTriggerEventTypes, parseTriggerEventTypes } from "@/lib/campaigns/trigger-event-types";
import {
  buildEventSchemaJsonNode,
  eventSchemaDraftFromConfigRoot,
  eventSchemaDraftFromEventSchemaNode,
  type EventSchemaDefinitionDraft,
} from "@/lib/programme/event-schema-merge";

function resolveEventDefinition(
  eventType: string,
  sources: readonly EventSchemaDefinitionDraft[][]
): EventSchemaDefinitionDraft | null {
  const key = eventType.trim().toUpperCase();
  for (const source of sources) {
    const def = source.find((d) => d.eventType.trim().toUpperCase() === key);
    if (!def) continue;
    const coreFields = def.coreFields
      .map((f) => ({ ...f, name: f.name.trim() }))
      .filter((f) => f.name);
    if (coreFields.length === 0) continue;
    return { eventType: def.eventType.trim(), coreFields };
  }
  return null;
}

/** Build campaign `eventSchema` JSON from existing campaign schema, programme template, and triggers. */
export function buildCampaignEventSchemaFromSelectedTriggers(args: {
  programmeConfigRoot: unknown;
  triggerEventType: string;
  campaignEventSchema?: unknown;
}): Record<string, unknown> | null {
  const selected = parseTriggerEventTypes(args.triggerEventType);
  if (selected.length === 0) return null;

  const programmeDraft = eventSchemaDraftFromConfigRoot(args.programmeConfigRoot);
  const campaignDraft =
    args.campaignEventSchema != null
      ? eventSchemaDraftFromEventSchemaNode(args.campaignEventSchema)
      : null;

  const definitionSources: EventSchemaDefinitionDraft[][] = [];
  if (campaignDraft && campaignDraft.eventDefinitions.length > 0) {
    definitionSources.push(campaignDraft.eventDefinitions);
  }
  definitionSources.push(programmeDraft.eventDefinitions);

  const eventDefinitions: EventSchemaDefinitionDraft[] = [];
  for (const type of selected) {
    const def = resolveEventDefinition(type, definitionSources);
    if (!def) return null;
    eventDefinitions.push(def);
  }

  return buildEventSchemaJsonNode({
    version: campaignDraft?.version ?? programmeDraft.version,
    backwardCompatibilityDays:
      campaignDraft?.backwardCompatibilityDays ?? programmeDraft.backwardCompatibilityDays,
    eventDefinitions,
    customFields: campaignDraft?.customFields ?? [],
  });
}

/** Persist campaign event schema so triggers align with configured payload definitions. */
export async function syncCampaignEventSchemaForTriggers(
  campaignUid: string,
  programmeUid: string,
  triggerEventType: string
): Promise<void> {
  const [progBlob, campaignSchema] = await Promise.all([
    programmeApiV2.getProgrammeConfig(programmeUid).catch(() => null),
    campaignsAdminApi.getCampaignEventSchema(campaignUid).catch(() => null),
  ]);

  const schema = buildCampaignEventSchemaFromSelectedTriggers({
    programmeConfigRoot: progBlob?.config,
    campaignEventSchema: campaignSchema,
    triggerEventType,
  });
  if (!schema) return;

  await campaignsAdminApi.upsertCampaignEventSchema(campaignUid, { eventSchema: schema });
}

/** Merge a rule trigger into the campaign and sync event schema (used after campaign rule publish). */
export async function syncCampaignEventSchemaForRuleTrigger(
  campaignUid: string,
  programmeUid: string,
  ruleTriggerEventType: string
): Promise<void> {
  const campaign = await campaignsAdminApi.getCampaign(campaignUid);
  const merged = formatTriggerEventTypes([
    ...parseTriggerEventTypes(campaign.triggerEventType),
    ...parseTriggerEventTypes(ruleTriggerEventType),
  ]);
  if (!merged) return;

  await syncCampaignEventSchemaForTriggers(campaignUid, programmeUid, merged);
}
