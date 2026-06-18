"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";

import { CampaignForm } from "@/components/campaigns/CampaignForm";
import { Card } from "@/components/ui/card";
import { getMerchantToken, merchantGetCampaign } from "@/lib/api/merchant";
import { PORTAL_LOGIN_PATH } from "@/lib/auth/paths";
import { canEditMerchantCampaign } from "@/lib/campaigns/merchant-campaign-editability";
import type { CampaignResponse } from "@/types/campaigns";

export default function MerchantEditCampaignPage() {
  const params = useParams<{ campaignUid: string }>();
  const router = useRouter();
  const campaignUid = decodeURIComponent(params.campaignUid);
  const [campaign, setCampaign] = useState<CampaignResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getMerchantToken()) {
      router.replace(PORTAL_LOGIN_PATH);
      return;
    }
    void merchantGetCampaign(campaignUid)
      .then(setCampaign)
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Failed to load campaign");
        router.replace("/merchant/campaigns");
      })
      .finally(() => setLoading(false));
  }, [campaignUid, router]);

  const detailHref = `/merchant/campaigns/${encodeURIComponent(campaignUid)}`;

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading campaign…</p>;
  }

  if (!campaign) {
    return (
      <Card className="p-8 border-border/70">
        <p className="text-sm text-muted-foreground">Campaign not found.</p>
      </Card>
    );
  }

  if (!canEditMerchantCampaign(campaign)) {
    return (
      <Card className="p-8 border-border/70">
        <p className="text-sm">This campaign cannot be edited in its current state.</p>
        <Link href={detailHref} className="text-sm underline mt-2 inline-block">
          Back to campaign
        </Link>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href={detailHref} className="text-sm text-muted-foreground hover:underline">
          ← Back to campaign
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-2">Edit campaign</h1>
      </div>
      <CampaignForm
        mode="edit"
        portal="merchant"
        campaignUid={campaignUid}
        initialCampaign={campaign}
        cancelHref={detailHref}
      />
    </div>
  );
}
