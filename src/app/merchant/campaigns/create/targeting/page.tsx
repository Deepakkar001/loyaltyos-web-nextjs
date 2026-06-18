"use client";

import { CampaignMerchantTargetingSection } from "@/components/campaigns/CampaignMerchantTargetingSection";
import { CampaignCreateStepPage } from "@/app/dashboard/campaigns/create/_components/CampaignCreateStepPage";

export default function MerchantCreateCampaignTargetingPage() {
  return (
    <CampaignCreateStepPage stepSlug="targeting" title="Who qualifies">
      <CampaignMerchantTargetingSection />
    </CampaignCreateStepPage>
  );
}
