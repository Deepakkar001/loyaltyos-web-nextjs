"use client";

import { CampaignCreateEventSchemaSection } from "@/components/campaigns/CampaignCreateEventSchemaSection";
import { CampaignCreateStepPage } from "../_components/CampaignCreateStepPage";

export default function CreateCampaignEventsPage() {
  return (
    <CampaignCreateStepPage stepIndex={1} title="Events">
      <CampaignCreateEventSchemaSection />
    </CampaignCreateStepPage>
  );
}
