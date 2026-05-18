"use client";

import Link from "next/link";

import { CampaignForm } from "@/components/campaigns/CampaignForm";

export default function CreateCampaignPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/campaigns" className="text-sm text-muted-foreground hover:underline">
          ← Back to campaigns
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-2">Create Campaign</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure all six sections, then save as draft or activate immediately.
        </p>
      </div>
      <CampaignForm mode="create" cancelHref="/dashboard/campaigns" />
    </div>
  );
}
