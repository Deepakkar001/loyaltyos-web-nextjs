"use client";

import { CampaignOfferSection } from "@/components/campaigns/CampaignOfferSection";
import { CampaignCreateStepPage } from "@/app/dashboard/campaigns/create/_components/CampaignCreateStepPage";

export default function MerchantCreateCampaignOfferPage() {
  return (
    <CampaignCreateStepPage stepSlug="offer" title="Reward">
      <CampaignOfferSection />
    </CampaignCreateStepPage>
  );
}
