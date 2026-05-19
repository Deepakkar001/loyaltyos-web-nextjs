"use client";

import { CampaignBasicInfoSection } from "@/components/campaigns/CampaignFormSections";
import { CampaignCreateStepPage } from "../_components/CampaignCreateStepPage";

export default function CreateCampaignBasicInfoPage() {
  return (
    <CampaignCreateStepPage stepIndex={0} title="Basic Info">
      <CampaignBasicInfoSection />
    </CampaignCreateStepPage>
  );
}
