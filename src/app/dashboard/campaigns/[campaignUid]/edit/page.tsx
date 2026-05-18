"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";

import { CampaignForm } from "@/components/campaigns/CampaignForm";
import { Card } from "@/components/ui/card";
import { campaignsAdminApi } from "@/lib/api/client";
import type { CampaignResponse } from "@/types/campaigns";

export default function EditCampaignPage() {
  const params = useParams<{ campaignUid: string }>();
  const campaignUid = decodeURIComponent(params.campaignUid);
  const [campaign, setCampaign] = useState<CampaignResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const c = await campaignsAdminApi.getCampaign(campaignUid);
        setCampaign(c);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Failed to load campaign");
      } finally {
        setLoading(false);
      }
    })();
  }, [campaignUid]);

  const detailHref = `/dashboard/campaigns/${encodeURIComponent(campaignUid)}`;

  if (loading) {
    return (
      <Card className="p-8 border-border/70 bg-[var(--surface-card)]">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </Card>
    );
  }

  if (!campaign) {
    return (
      <Card className="p-8 border-border/70 bg-[var(--surface-card)]">
        <p className="text-sm text-muted-foreground">Campaign not found.</p>
        <Link href="/dashboard/campaigns" className="text-sm underline mt-2 inline-block">
          Back to campaigns
        </Link>
      </Card>
    );
  }

  if (campaign.status !== "DRAFT") {
    return (
      <Card className="p-8 border-border/70 bg-[var(--surface-card)]">
        <p className="text-sm">Only DRAFT campaigns can be edited.</p>
        <Link href={detailHref} className="text-sm underline mt-2 inline-block">
          Back to details
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={detailHref} className="text-sm text-muted-foreground hover:underline">
          ← Back to campaign
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-2">Edit campaign</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Update all campaign fields. Changes are saved to the database when you click Save changes.
        </p>
      </div>
      <CampaignForm
        mode="edit"
        campaignUid={campaignUid}
        initialCampaign={campaign}
        cancelHref={detailHref}
      />
    </div>
  );
}
