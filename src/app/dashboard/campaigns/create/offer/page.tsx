"use client";

import { CampaignOfferSection } from "@/components/campaigns/CampaignOfferSection";
import { CampaignCreateStepPage } from "../_components/CampaignCreateStepPage";

export default function CreateCampaignOfferPage() {
  return (
    <CampaignCreateStepPage stepSlug="offer" title="Reward">
      <CampaignOfferSection />
    </CampaignCreateStepPage>
  );
}
