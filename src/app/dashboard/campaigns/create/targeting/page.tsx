"use client";

import { CampaignMerchantTargetingSection } from "@/components/campaigns/CampaignMerchantTargetingSection";
import { CampaignCreateStepPage } from "../_components/CampaignCreateStepPage";

export default function CreateCampaignTargetingPage() {
  return (
    <CampaignCreateStepPage stepSlug="targeting" title="Who qualifies">
      <CampaignMerchantTargetingSection />
    </CampaignCreateStepPage>
  );
}
