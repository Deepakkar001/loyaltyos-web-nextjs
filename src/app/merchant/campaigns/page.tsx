"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Megaphone } from "lucide-react";

import {
  MerchantEmptyState,
  MerchantPageHeader,
  MerchantPageLoader,
  MerchantPrimaryButton,
  MerchantStatusBadge,
} from "@/components/merchant/merchant-ui";
import { Progress } from "@/components/ui/progress";
import { getMerchantToken, merchantListCampaigns } from "@/lib/api/merchant";
import { PORTAL_LOGIN_PATH } from "@/lib/auth/paths";
import type { CampaignResponse } from "@/types/campaigns";

export default function MerchantCampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<CampaignResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCampaigns(await merchantListCampaigns());
    } catch {
      router.replace(PORTAL_LOGIN_PATH);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!getMerchantToken()) {
      router.replace(PORTAL_LOGIN_PATH);
      return;
    }
    void load();
  }, [load, router]);

  return (
    <div className="space-y-8">
      <MerchantPageHeader
        title="Campaigns"
        description="Create and manage merchant-funded campaigns. New campaigns require tenant approval before going live."
        action={
          <MerchantPrimaryButton href="/merchant/campaigns/create/basic-info">
            New campaign
          </MerchantPrimaryButton>
        }
      />

      {loading ? (
        <MerchantPageLoader label="Loading campaigns…" />
      ) : campaigns.length === 0 ? (
        <MerchantEmptyState
          icon={Megaphone}
          title="No campaigns yet"
          description="Start by creating a campaign with your budget, audience, and offer rules. Your programme administrator will review it before activation."
          actionHref="/merchant/campaigns/create/basic-info"
          actionLabel="Create campaign"
        />
      ) : (
        <div className="grid gap-4">
          {campaigns.map((c) => {
            const pct = c.budgetConsumedPct ?? 0;
            return (
              <Link
                key={c.campaignUid}
                href={`/merchant/campaigns/${encodeURIComponent(c.campaignUid)}`}
                className="group block rounded-2xl border border-border/50 bg-[var(--surface-card)] p-5 shadow-[var(--shadow-card)] transition-all hover:border-emerald-500/25 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                      {c.name}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                      {c.campaignUid}
                    </p>
                  </div>
                  <MerchantStatusBadge
                    status={c.status}
                    pending={c.pendingMerchantApproval}
                  />
                </div>

                <div className="mt-5 space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      Budget: {(c.budgetConsumed ?? 0).toLocaleString()} /{" "}
                      {(c.budgetTotal ?? 0).toLocaleString()}
                    </span>
                    <span className="font-medium text-foreground">
                      {Number(pct).toFixed(1)}% used
                    </span>
                  </div>
                  <Progress
                    value={Number(pct) || 0}
                    className="h-2 bg-muted/60 [&>div]:bg-emerald-500"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
