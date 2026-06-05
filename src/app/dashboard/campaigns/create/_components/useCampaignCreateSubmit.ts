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
  const [saving, setSaving] = useState(false);

  const submit = async () => {
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

    if (form.customerScope === "TARGETED") {
      const uid = form.draftCampaignUid;
      if (!uid) {
        toast.error("Save campaign and upload customer list before publishing.");
        return;
      }
      try {
        const c = await campaignsAdminApi.getCampaign(uid);
        if ((c.customerCount ?? 0) <= 0) {
          toast.error("Upload a customer CSV list for targeted campaigns.");
          return;
        }
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Could not verify customer list");
        return;
      }
    }

    setSaving(true);
    try {
      const draftUid = form.draftCampaignUid?.trim();
      const saved = draftUid
        ? await campaignsAdminApi.updateCampaign(draftUid, built.payload)
        : await campaignsAdminApi.createCampaign(built.payload);

      if (campaignCreateHasEventSchemaContent(eventSchemaDraft)) {
        try {
          await campaignsAdminApi.upsertCampaignEventSchema(saved.campaignUid, {
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
            `Campaign saved but event schema was not saved: ${msg}. Update it under Event Schema.`
          );
          clearDraft();
          router.push(
            `/dashboard/campaign-rules/create/campaign?campaignUid=${encodeURIComponent(saved.campaignUid)}&fromCampaignWizard=1`
          );
          return;
        }
      }

      toast.success(
        campaignCreateHasEventSchemaContent(eventSchemaDraft)
          ? "Campaign saved as draft with event schema. Next: create the earn rule."
          : "Campaign saved as draft. Next: create the earn rule."
      );
      clearDraft();
      router.push(
        `/dashboard/campaign-rules/create/campaign?campaignUid=${encodeURIComponent(saved.campaignUid)}&fromCampaignWizard=1`
      );
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save campaign");
    } finally {
      setSaving(false);
    }
  };

  return { submit, saving };
}
