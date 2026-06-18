"use client";

import { CampaignCreateEventSchemaSection } from "@/components/campaigns/CampaignCreateEventSchemaSection";
import { CampaignCreateStepPage } from "../_components/CampaignCreateStepPage";

export default function CreateCampaignEventsPage() {
  return (
    <CampaignCreateStepPage stepSlug="events" title="Events">
      <CampaignCreateEventSchemaSection />
    </CampaignCreateStepPage>
  );
}
