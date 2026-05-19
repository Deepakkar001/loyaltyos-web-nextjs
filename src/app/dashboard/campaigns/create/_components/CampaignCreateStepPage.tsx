"use client";

import { CreateCampaignShell } from "./CreateCampaignShell";
import { CampaignCreateStepNav } from "./CampaignCreateStepNav";

export function CampaignCreateStepPage({
  stepIndex,
  title,
  children,
}: {
  stepIndex: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <CreateCampaignShell title={title}>
      <div className="space-y-6 pb-10">
        {children}
        <CampaignCreateStepNav stepIndex={stepIndex} />
      </div>
    </CreateCampaignShell>
  );
}
