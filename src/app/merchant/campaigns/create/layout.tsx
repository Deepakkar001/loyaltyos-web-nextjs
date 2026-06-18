"use client";

import { CampaignFormProvider } from "@/components/campaigns/campaign-create-context";

export default function MerchantCreateCampaignLayout({ children }: { children: React.ReactNode }) {
  return (
    <CampaignFormProvider mode="create" portal="merchant">
      {children}
    </CampaignFormProvider>
  );
}
