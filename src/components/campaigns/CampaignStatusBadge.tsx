"use client";

import { cn } from "@/lib/utils";
import type { CampaignStatus } from "@/types/campaigns";

const STYLES: Record<CampaignStatus, string> = {
  DRAFT: "bg-slate-500/20 text-slate-600 dark:bg-slate-500/25 dark:text-slate-300",
  ACTIVE: "bg-emerald-500/20 text-emerald-800 dark:bg-emerald-500/25 dark:text-emerald-300",
  PAUSED: "bg-amber-400/25 text-amber-900 dark:bg-amber-500/25 dark:text-amber-200",
  EXHAUSTED: "bg-red-500/20 text-red-800 dark:bg-red-500/25 dark:text-red-300",
  EXPIRED: "bg-orange-500/20 text-orange-900 dark:bg-orange-500/25 dark:text-orange-200",
  ENDED: "bg-slate-700/15 text-slate-700 dark:bg-slate-600/30 dark:text-slate-400",
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
        STYLES[status]
      )}
    >
      {status}
    </span>
  );
}
