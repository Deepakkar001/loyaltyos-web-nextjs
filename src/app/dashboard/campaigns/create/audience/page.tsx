"use client";

import { CampaignAudienceSection } from "@/components/campaigns/CampaignAudienceSection";
import { useCampaignForm } from "@/components/campaigns/campaign-create-context";
import { CampaignCreateStepPage } from "../_components/CampaignCreateStepPage";

export default function CreateCampaignAudiencePage() {
  const { form } = useCampaignForm();

  return (
    <CampaignCreateStepPage stepSlug="audience" title="Targeted Audience">
      <CampaignAudienceSection campaignUid={form.draftCampaignUid} />
    </CampaignCreateStepPage>
  );
}
