"use client";

import { useEffect, useState } from "react";

import { campaignsAdminApi, programmeApiV2, ApiError } from "@/lib/api/client";
import { hasPopulatedEventSchema } from "@/lib/programme/event-schema-merge";
import {
  buildConditionFieldCatalog,
  buildConditionFieldCatalogFromEventSchema,
  fallbackConditionFieldCatalog,
  type ConditionFieldCatalog,
} from "@/lib/rules/condition-field-catalog";

export function useConditionFieldCatalog(args: {
  tenantId: string;
  programmeUid?: string;
  triggerEventType?: string;
  /** When set, fields come from the campaign event schema (falls back to programme per trigger). */
  campaignUid?: string;
}) {
  const programmeUid = args.programmeUid?.trim() || "default";
  const triggerEventType = args.triggerEventType?.trim() || "PURCHASE";
  const campaignUid = args.campaignUid?.trim() || "";

  const [catalog, setCatalog] = useState<ConditionFieldCatalog>(() =>
    fallbackConditionFieldCatalog({ programmeUid, triggerEventType })
  );

  useEffect(() => {
    if (!args.tenantId) return;
    let cancelled = false;

    (async () => {
      setCatalog((prev) => ({ ...prev, loading: true, error: undefined }));
      try {
        if (campaignUid) {
          const [schemaNode, progBlob] = await Promise.all([
            campaignsAdminApi.getCampaignEventSchema(campaignUid),
            programmeApiV2.getProgrammeConfig(programmeUid).catch(() => null),
          ]);
          if (cancelled) return;
          const programmeRoot = progBlob?.config;
          // Match Events step: use campaign schema when populated, otherwise programme schema.
          if (hasPopulatedEventSchema(schemaNode)) {
            setCatalog(
              buildConditionFieldCatalogFromEventSchema({
                programmeUid,
                triggerEventType,
                eventSchema: schemaNode,
                programmeConfigRoot: programmeRoot,
              })
            );
          } else if (programmeRoot) {
            setCatalog(
              buildConditionFieldCatalog({
                programmeUid,
                triggerEventType,
                configRoot: programmeRoot,
              })
            );
          } else {
            setCatalog({
              ...fallbackConditionFieldCatalog({ programmeUid, triggerEventType }),
              loading: false,
            });
          }
          return;
        }

        const blob = await programmeApiV2.getProgrammeConfig(programmeUid);
        if (cancelled) return;
        setCatalog(
          buildConditionFieldCatalog({
            programmeUid,
            triggerEventType,
            configRoot: blob?.config,
          })
        );
      } catch (e) {
        if (cancelled) return;
        setCatalog({
          ...fallbackConditionFieldCatalog({ programmeUid, triggerEventType }),
          error: e instanceof ApiError ? e.message : "Could not load event schema.",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [args.tenantId, programmeUid, triggerEventType, campaignUid]);

  return catalog;
}
