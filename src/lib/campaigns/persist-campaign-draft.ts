import { campaignsAdminApi } from "@/lib/api/client";
import { buildCampaignUpsertPayload, type CampaignFormState } from "@/lib/campaigns/campaign-form";
import type { CampaignResponse } from "@/types/campaigns";

export type PersistCampaignDraftResult =
  | { ok: true; campaign: CampaignResponse; formPatch: Partial<CampaignFormState> }
  | { ok: false; error: string };

/**
 * Creates or updates a DRAFT campaign so later wizard steps (audience upload) have a campaignUid.
 */
export async function persistCampaignDraft(
  form: CampaignFormState,
  draftCampaignUid?: string
): Promise<PersistCampaignDraftResult> {
  const built = buildCampaignUpsertPayload(form, {});
  if (!built.ok) {
    return { ok: false, error: built.error };
  }

  const uid = draftCampaignUid?.trim();
  if (uid) {
    const updated = await campaignsAdminApi.updateCampaign(uid, built.payload);
    return {
      ok: true,
      campaign: updated,
      formPatch: {
        draftCampaignUid: updated.campaignUid,
        customerScope: updated.customerScope ?? form.customerScope,
      },
    };
  }

  const created = await campaignsAdminApi.createCampaign(built.payload);
  return {
    ok: true,
    campaign: created,
    formPatch: {
      draftCampaignUid: created.campaignUid,
      customerScope: created.customerScope ?? form.customerScope,
    },
  };
}
