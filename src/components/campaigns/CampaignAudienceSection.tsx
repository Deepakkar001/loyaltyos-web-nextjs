"use client";

import { useEffect, useRef, useState } from "react";

import { CampaignTargetAudiencePanel } from "@/components/campaigns/CampaignTargetAudiencePanel";
import { useCampaignForm } from "@/components/campaigns/campaign-create-context";
import { Label } from "@/components/ui/label";
import { campaignsAdminApi } from "@/lib/api/client";
import type { CustomerScope } from "@/types/campaigns";

type CampaignAudienceSectionProps = {
  /** Campaign UID for uploads (create wizard draft or edit). */
  campaignUid: string | undefined;
};

export function CampaignAudienceSection({ campaignUid }: CampaignAudienceSectionProps) {
  const { form, patch } = useCampaignForm();
  const [customerCount, setCustomerCount] = useState(0);
  /** Avoid overwriting local radio selection with stale server scope (draft may still be ALL). */
  const scopeHydratedForUid = useRef<string | null>(null);

  useEffect(() => {
    if (!campaignUid) return;
    void (async () => {
      try {
        const c = await campaignsAdminApi.getCampaign(campaignUid);
        setCustomerCount(c.customerCount ?? 0);
        if (scopeHydratedForUid.current !== campaignUid) {
          scopeHydratedForUid.current = campaignUid;
          if (c.customerScope) {
            patch({ customerScope: c.customerScope });
          }
        }
      } catch {
        // panel handles empty state
      }
    })();
  }, [campaignUid, patch]);

  const setScope = (scope: CustomerScope) => {
    patch({ customerScope: scope });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Target audience</Label>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="customerScope"
              checked={form.customerScope === "ALL"}
              onChange={() => setScope("ALL")}
            />
            All customers
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="customerScope"
              checked={form.customerScope === "TARGETED"}
              onChange={() => setScope("TARGETED")}
            />
            Specific customers
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          All customers: no ID list required. Specific customers: upload a CSV with a{" "}
          <span className="font-mono">customer_id</span> column (same ID used in loyalty events).
        </p>
      </div>

      {form.customerScope === "TARGETED" ? (
        campaignUid ? (
          <CampaignTargetAudiencePanel
            campaignUid={campaignUid}
            customerCount={customerCount}
            onCustomerCountChange={setCustomerCount}
          />
        ) : (
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Save the campaign draft first before uploading customers.
          </p>
        )
      ) : (
        <p className="text-sm text-muted-foreground">
          This campaign will apply to all customers who meet event and schedule rules.
        </p>
      )}
    </div>
  );
}
