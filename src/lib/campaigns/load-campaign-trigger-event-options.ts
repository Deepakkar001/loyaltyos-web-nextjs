import { campaignsAdminApi, programmeApiV2 } from "@/lib/api/client";
import {
  extractEventTypesFromProgrammeConfig,
  hasPopulatedEventSchema,
} from "@/lib/programme/event-schema-merge";

export type LoadCampaignTriggerEventOptionsArgs = {
  mode: "create" | "edit";
  programmeUid: string;
  campaignUid?: string;
  preserveSelected?: readonly string[];
};

/** Resolve selectable event types for campaign basic info (programme or campaign schema). */
export async function loadCampaignTriggerEventOptions(
  args: LoadCampaignTriggerEventOptionsArgs
): Promise<string[]> {
  const progUid = args.programmeUid.trim();
  const preserve = args.preserveSelected ?? [];
  if (!progUid) return [];

  if (args.mode === "edit" && args.campaignUid) {
    const schemaNode = await campaignsAdminApi.getCampaignEventSchema(args.campaignUid);
    if (hasPopulatedEventSchema(schemaNode)) {
      return extractEventTypesFromProgrammeConfig({ eventSchema: schemaNode }, preserve);
    }
    const progBlob = await programmeApiV2.getProgrammeConfig(progUid);
    return extractEventTypesFromProgrammeConfig(progBlob?.config, preserve);
  }

  const progBlob = await programmeApiV2.getProgrammeConfig(progUid);
  return extractEventTypesFromProgrammeConfig(progBlob?.config, preserve);
}
