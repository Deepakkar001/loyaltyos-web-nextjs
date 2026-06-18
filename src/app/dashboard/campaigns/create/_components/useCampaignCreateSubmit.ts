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
import { merchantCreateCampaign } from "@/lib/api/merchant";
import {
  buildCampaignUpsertPayload,
  validateCampaignCreateStep,
  getCampaignCreateStepIndex,
} from "@/lib/campaigns/campaign-form";
import type { CampaignUpsertRequest } from "@/types/campaigns";
import { buildEventSchemaJsonNode } from "@/lib/programme/event-schema-merge";

function withOptionalEventSchema(
  payload: CampaignUpsertRequest,
  eventSchemaDraft: Parameters<typeof buildEventSchemaJsonNode>[0]
): CampaignUpsertRequest {
  if (!campaignCreateHasEventSchemaContent(eventSchemaDraft)) {
    return payload;
  }
  return {
    ...payload,
    eventSchema: buildEventSchemaJsonNode(eventSchemaDraft),
  };
}

export function useCampaignCreateSubmit() {
  const router = useRouter();
  const { form, eventSchemaDraft, clearDraft, portal } = useCampaignForm();
  const [saving, setSaving] = useState(false);
  const isMerchant = portal === "merchant";

  const submit = async () => {
    const targetingIdx = getCampaignCreateStepIndex(portal, "targeting");
    const offerIdx = getCampaignCreateStepIndex(portal, "offer");
    const targetingErr = validateCampaignCreateStep(targetingIdx, form, {
      eventSchemaDraft,
      portal,
    });
    if (targetingErr) {
      toast.error(targetingErr);
      return;
    }
    const offerErr = validateCampaignCreateStep(offerIdx, form, { portal });
    if (offerErr) {
      toast.error(offerErr);
      return;
    }

    const built = buildCampaignUpsertPayload(form);
    if (!built.ok) {
      toast.error(built.error);
      return;
    }

    const schemaErr = validateCampaignCreateEventSchemaStep(eventSchemaDraft);
    if (schemaErr) {
      toast.error(schemaErr);
      return;
    }

    if (!isMerchant && form.customerScope === "TARGETED") {
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
      if (isMerchant) {
        const payload = withOptionalEventSchema(
          {
            ...built.payload,
            campaignType: "MERCHANT_FUNDED" as const,
          },
          eventSchemaDraft
        );
        await merchantCreateCampaign(payload);
        toast.success("Campaign submitted for tenant approval");
        clearDraft();
        router.push("/merchant/campaigns");
        return;
      }

      const draftUid = form.draftCampaignUid?.trim();
      const payload = withOptionalEventSchema(built.payload, eventSchemaDraft);
      const saved = draftUid
        ? await campaignsAdminApi.updateCampaign(draftUid, payload)
        : await campaignsAdminApi.createCampaign(payload);

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
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to save campaign";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return { submit, saving };
}
