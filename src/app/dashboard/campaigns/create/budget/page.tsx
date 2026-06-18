"use client";

import { CampaignBudgetSection } from "@/components/campaigns/CampaignFormSections";
import { CampaignCreateStepPage } from "../_components/CampaignCreateStepPage";

export default function CreateCampaignBudgetPage() {
  return (
    <CampaignCreateStepPage stepSlug="budget" title="Budget">
      <CampaignBudgetSection />
    </CampaignCreateStepPage>
  );
}
