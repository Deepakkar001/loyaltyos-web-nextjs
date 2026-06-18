"use client";

import { CreateCampaignShell } from "./CreateCampaignShell";
import { CampaignCreateStepNav } from "./CampaignCreateStepNav";
import type { CampaignCreateStepSlug } from "@/lib/campaigns/campaign-form";

export function CampaignCreateStepPage({
  stepSlug,
  title,
  children,
}: {
  stepSlug: CampaignCreateStepSlug;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <CreateCampaignShell title={title}>
      <div className="space-y-6 pb-10">
        {children}
        <CampaignCreateStepNav stepSlug={stepSlug} />
      </div>
    </CreateCampaignShell>
  );
}
