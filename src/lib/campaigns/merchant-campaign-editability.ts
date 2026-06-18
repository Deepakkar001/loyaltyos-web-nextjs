import type { CampaignResponse, CampaignStatus } from "@/types/campaigns";

import { canEditCampaign } from "@/lib/campaigns/campaign-editability";

/** Merchant partners may edit draft, paused, or pending-approval campaigns. */
export function canEditMerchantCampaign(campaign: CampaignResponse): boolean {
  if (campaign.pendingMerchantApproval) return true;
  return canEditCampaign(campaign.status as CampaignStatus);
}
