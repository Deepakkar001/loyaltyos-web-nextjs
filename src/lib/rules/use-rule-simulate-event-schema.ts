"use client";

import { useEffect, useState } from "react";

import { campaignsAdminApi, programmeApiV2, ApiError } from "@/lib/api/client";
import {
  eventSchemaDraftFromCampaign,
  eventSchemaDraftFromConfigRoot,
  type EventSchemaDraft,
} from "@/lib/programme/event-schema-merge";
import { listEventTypesFromDraft } from "@/lib/rules/rule-simulate-schema";

export type RuleSimulateEventSchemaState = {
  loading: boolean;
  error?: string;
  draft: EventSchemaDraft | null;
  programmeConfigRoot: unknown;
  suggestedEventTypes: string[];
};

/**
 * Programme rules: programme `config.eventSchema`.
 * Campaign rules: campaign `eventSchema` when present; else programme template (same merge as condition catalog).
 */
export function useRuleSimulateEventSchema(args: { programmeUid: string; campaignUid?: string }) {
  const programmeUid = args.programmeUid?.trim() || "default";
  const campaignUid = args.campaignUid?.trim() || "";

  const [state, setState] = useState<RuleSimulateEventSchemaState>({
    loading: true,
    draft: null,
    programmeConfigRoot: null,
    suggestedEventTypes: [],
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setState((s) => ({ ...s, loading: true, error: undefined }));
      try {
        if (campaignUid) {
          const [campaign, progBlob] = await Promise.all([
            campaignsAdminApi.getCampaign(campaignUid),
            programmeApiV2.getProgrammeConfig(programmeUid).catch(() => null),
          ]);
          if (cancelled) return;
          const programmeRoot = progBlob?.config ?? null;
          const draft = eventSchemaDraftFromCampaign({
            eventSchema: campaign.eventSchema,
            triggerEventType: campaign.triggerEventType,
            programmeConfigRoot: programmeRoot,
          });
          setState({
            loading: false,
            draft,
            programmeConfigRoot: programmeRoot,
            suggestedEventTypes: listEventTypesFromDraft(draft),
            error: undefined,
          });
          return;
        }

        const blob = await programmeApiV2.getProgrammeConfig(programmeUid);
        if (cancelled) return;
        const programmeRoot = blob?.config ?? null;
        const draft = eventSchemaDraftFromConfigRoot(programmeRoot);
        setState({
          loading: false,
          draft,
          programmeConfigRoot: programmeRoot,
          suggestedEventTypes: listEventTypesFromDraft(draft),
          error: undefined,
        });
      } catch (e) {
        if (cancelled) return;
        setState({
          loading: false,
          draft: null,
          programmeConfigRoot: null,
          suggestedEventTypes: [],
          error: e instanceof ApiError ? e.message : "Could not load event schema.",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [programmeUid, campaignUid]);

  return state;
}
