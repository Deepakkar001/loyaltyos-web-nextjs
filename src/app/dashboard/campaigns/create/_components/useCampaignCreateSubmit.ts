"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { useCampaignForm } from "@/components/campaigns/campaign-create-context";
import {
  campaignCreateHasEventSchemaContent,
  validateCampaignCreateEventSchemaStep,
} from "@/lib/campaigns/campaign-create-event-schema";
import { campaignsAdminApi, ApiError } from "@/lib/api/client";
import { buildCampaignUpsertPayload } from "@/lib/campaigns/campaign-form";
import { buildEventSchemaJsonNode } from "@/lib/programme/event-schema-merge";

export function useCampaignCreateSubmit() {
  const router = useRouter();
  const { form, eventSchemaDraft, clearDraft } = useCampaignForm();
  const [saving, setSaving] = useState<"draft" | "activate" | null>(null);

  const submit = async (action: "draft" | "activate") => {
    const built = buildCampaignUpsertPayload(form, {});
    if (!built.ok) {
      toast.error(built.error);
      return;
    }

    const schemaErr = validateCampaignCreateEventSchemaStep(eventSchemaDraft);
    if (schemaErr) {
      toast.error(schemaErr);
      return;
    }

    setSaving(action);
    try {
      const created = await campaignsAdminApi.createCampaign(built.payload);

      if (campaignCreateHasEventSchemaContent(eventSchemaDraft)) {
        try {
          await campaignsAdminApi.upsertCampaignEventSchema(created.campaignUid, {
            eventSchema: buildEventSchemaJsonNode(eventSchemaDraft),
          });
        } catch (schemaSaveErr) {
          const msg =
            schemaSaveErr instanceof ApiError
              ? schemaSaveErr.message
              : schemaSaveErr instanceof Error
                ? schemaSaveErr.message
                : "Failed to save event schema";
          toast.error(
            `Campaign created but event schema was not saved: ${msg}. Update it under Event Schema.`
          );
          clearDraft();
          router.push(`/dashboard/campaigns/${encodeURIComponent(created.campaignUid)}`);
          return;
        }
      }

      if (action === "activate") {
        await campaignsAdminApi.activateCampaign(created.campaignUid);
        toast.success(
          campaignCreateHasEventSchemaContent(eventSchemaDraft)
            ? "Campaign created with event schema and activated"
            : "Campaign created and activated"
        );
      } else {
        toast.success(
          campaignCreateHasEventSchemaContent(eventSchemaDraft)
            ? "Campaign saved as draft with event schema"
            : "Campaign saved as draft"
        );
      }
      clearDraft();
      router.push(`/dashboard/campaigns/${encodeURIComponent(created.campaignUid)}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save campaign");
    } finally {
      setSaving(null);
    }
  };

  return { submit, saving };
}
