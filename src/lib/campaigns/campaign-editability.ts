import type { CampaignStatus } from "@/types/campaigns";

/** Draft and paused campaigns can be edited; active and terminal statuses cannot. */
export function canEditCampaign(status: CampaignStatus): boolean {
  return status === "DRAFT" || status === "PAUSED";
}
