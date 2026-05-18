"use client";

import Link from "next/link";
import toast from "react-hot-toast";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { campaignsAdminApi } from "@/lib/api/client";
import type { CampaignResponse } from "@/types/campaigns";

type CampaignRowActionsProps = {
  campaign: CampaignResponse;
  onUpdated: () => void;
};

export function CampaignRowActions({ campaign, onUpdated }: CampaignRowActionsProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const uid = campaign.campaignUid;
  const href = (path: string) => `/dashboard/campaigns/${encodeURIComponent(uid)}${path}`;

  const run = async (action: "activate" | "pause" | "end") => {
    setBusy(action);
    try {
      if (action === "activate") await campaignsAdminApi.activateCampaign(uid);
      if (action === "pause") await campaignsAdminApi.pauseCampaign(uid);
      if (action === "end") await campaignsAdminApi.endCampaign(uid);
      toast.success(`Campaign ${action}d`);
      onUpdated();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : `Failed to ${action}`);
    } finally {
      setBusy(null);
    }
  };

  const canEdit = campaign.status === "DRAFT";
  const canActivate = campaign.status === "DRAFT" || campaign.status === "PAUSED";
  const canPause = campaign.status === "ACTIVE";
  const canEnd = campaign.status !== "ENDED" && campaign.status !== "EXHAUSTED";

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      <Link href={href("")}>
        <Button variant="ghost" size="sm" className="h-8 rounded-full">
          View
        </Button>
      </Link>
      {canEdit && (
        <Link href={href("/edit")}>
          <Button variant="ghost" size="sm" className="h-8 rounded-full">
            Edit
          </Button>
        </Link>
      )}
      {canActivate && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 rounded-full"
          disabled={busy !== null}
          onClick={() => run("activate")}
        >
          {busy === "activate" ? "…" : "Activate"}
        </Button>
      )}
      {canPause && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 rounded-full"
          disabled={busy !== null}
          onClick={() => run("pause")}
        >
          {busy === "pause" ? "…" : "Pause"}
        </Button>
      )}
      {canEnd && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 rounded-full text-destructive hover:text-destructive"
          disabled={busy !== null}
          onClick={() => run("end")}
        >
          {busy === "end" ? "…" : "End"}
        </Button>
      )}
    </div>
  );
}
